/** 资源缓存基础数据结构 */
interface CacheData {
    asset: cc.Asset,
    /** 资源是否需要释放 */
    release: boolean,
    /** 资源最后一次被加载的时间点（秒） */
    lastLoadTime: number,
}

/** 预制体资源缓存数据 */
interface PrefabCacheData extends CacheData {
    /** 此prefab关联的实例节点 */
    nodes?: cc.Node[],
}

/** asset bundle路径校验 */
const BUNDLE_CHECK = "ab:";

/**
 * 资源管理类
 * 
 * 资源加载:
 * 1. 如果加载resources内的资源，直接写明resources内的路径即可
 * 2. 如果加载路径以ab:开头，则会加载对应bundle内的资源。例：ab:bundleA/xxx/a表示bundle名为bundleA，资源路径为xxx/a
 * 
 * 引用计数管理：
 * 1. 尽量使用此类的接口加载所有资源、instantiate节点实例，否则需要自行管理引用计数
 * 2. Res.instantiate不要对动态生成的节点使用，尽量只instantiate prefab上预设好的节点，否则有可能会导致引用计数的管理出错
 * 3. 调用load接口时如需传入release参数，则同一资源在全局调用load时release参数尽量保持一致，否则可能不符合预期
 * 4. spine sprite组件已hack, 特殊处理动态赋值和销毁的计数处理
 * 5. prefab/spine/sprite/skeletonData之外的类似需增加对应计数管理 暂未处理
 */
export class ResManager {
    /** 节点与其关联的prefab路径 */
    private _nodePath: Map<cc.Node, string> = new Map();
    /** prefab资源与路径 */
    private _prefabPath: Map<cc.Prefab, string> = new Map();

    private _prefabCache: Map<string, PrefabCacheData> = new Map();
    private _spriteFrameCache: Map<string, CacheData> = new Map();
    private _spriteAtlasCache: Map<string, CacheData> = new Map();
    private _skeletonDataCache: Map<string, CacheData> = new Map();
    private _otherCache: Map<string, cc.Asset> = new Map();

    /** 资源释放的间隔时间（秒），资源超过此间隔未被load才可释放 */
    public releaseSec: number = 0;

    /**
     * 资源路径解析
     * @param url 
     */
    private parseUrl(url: string): { bundle?: string, loadUrl: string } {
        if (url.startsWith(BUNDLE_CHECK)) {
            let loadUrl = url.substring(BUNDLE_CHECK.length);
            let idx = loadUrl.indexOf("/");
            let bundle = loadUrl.substring(0, idx);
            loadUrl = loadUrl.substring(idx + 1);
            return { bundle: bundle, loadUrl: loadUrl };
        } else {
            return { loadUrl: url };
        }
    }

    /**
     * 通过节点或预制查找已缓存prefab路径
     * @param target 
     */
    private getCachePrefabUrl(target: cc.Node | cc.Prefab): string {
        let url = "";
        if (target instanceof cc.Node) {
            let cur = target;
            while (cur) {
                if (cur["_prefab"] && cur["_prefab"]["root"]) {
                    url = this._nodePath.get(cur["_prefab"]["root"]) || "";
                    if (url) {
                        break;
                    }
                }
                cur = cur.parent;
            }
        } else if (target instanceof cc.Prefab) {
            url = this._prefabPath.get(target) || "";
        }
        return url;
    }

    /**
     * 缓存资源
     * @param url 资源路径
     * @param asset 资源
     * @param release 资源是否需要释放
     */
    private cacheAsset(url: string, asset: cc.Asset, isAddRef: boolean = true, release: boolean = true): void {
        if (!asset || !isAddRef) {
            return;
        }

        let func = (map: Map<string, CacheData>) => {
            if (map.has(url)) {
                return;
            }
            asset.addRef();
            if (asset instanceof cc.Prefab) {
                this._prefabPath.set(asset, url);
            }
            let cacheData: CacheData = {
                asset: asset,
                release: release,
                lastLoadTime: Date.now() / 1000
            };
            map.set(url, cacheData);
        };

        if (asset instanceof cc.Prefab) {
            func(this._prefabCache);
        } else if (asset instanceof cc.SpriteFrame) {
            func(this._spriteFrameCache);
        } else if (asset instanceof cc.SpriteAtlas) {
            func(this._spriteAtlasCache);
        } else if (asset instanceof sp.SkeletonData) {
            func(this._skeletonDataCache);
        } else {
            if (this._otherCache.has(url)) {
                return;
            }
            asset.addRef();
            this._otherCache.set(url, asset);
        }
    }

    /**
     * 获取缓存资源。通常不应直接调用此接口，除非调用前能确保资源已加载并且能自行管理引用计数
     * @param url 资源路径
     * @param type 资源类型
     */
    public get<T extends cc.Asset>(url: string, type: typeof cc.Asset): T | null {
        let asset: unknown = null;
        let func = (map: Map<string, CacheData>) => {
            let data = map.get(url);
            if (data) {
                asset = data.asset;
                data.lastLoadTime = Date.now() / 1000;
            }
        };

        if (type === cc.Prefab) {
            func(this._prefabCache);
        } else if (type === cc.SpriteFrame) {
            func(this._spriteFrameCache);
        } else if (type === cc.SpriteAtlas) {
            func(this._spriteAtlasCache);
        } else if (type === sp.SkeletonData) {
            func(this._skeletonDataCache);
        } else {
            asset = this._otherCache.get(url);
        }

        return asset as T;
    }

    /**
     * 加载bundle
     * @param nameOrUrl bundle路径
     */
    public loadBundle(nameOrUrl: string): Promise<cc.AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            cc.assetManager.loadBundle(nameOrUrl, (error: Error, bundle: cc.AssetManager.Bundle) => {
                if (error) {
                    cc.error(`[Res.loadBundle] error: ${error}`);
                    resolve(null);
                } else {
                    resolve(bundle);
                }
            });
        });
    }

    /**
     * 加载单个资源
     * @param url 资源路径
     * @param type 资源类型
     * @param release 资源是否需要释放
     */
    public async load<T extends cc.Asset>(url: string, type: typeof cc.Asset, isAddRef: boolean = true, release: boolean = true): Promise<T | null> {
        let asset: T = this.get(url, type);
        if (asset) {
            return asset;
        }

        let parseData = this.parseUrl(url);
        if (parseData.bundle && !cc.assetManager.getBundle(parseData.bundle)) {
            await this.loadBundle(parseData.bundle);
        }

        asset = await new Promise((resolve, reject) => {
            let bundle: cc.AssetManager.Bundle = parseData.bundle ? cc.assetManager.getBundle(parseData.bundle) : cc.resources;
            if (!bundle) {
                cc.error(`[Res.load] cant find bundle: ${url}`);
                resolve(null);
                return;
            }

            bundle.load(parseData.loadUrl, type, (error: Error, resource: T) => {
                if (error) {
                    cc.error(`[Res.load] load error: ${error}`);
                    resolve(null);
                } else {
                    this.cacheAsset(url, resource, isAddRef, release);
                    resolve(resource);
                }
            });
        });
        return asset;
    }

    /**
    * 加载单个资源
    * @param url 资源路径
    * @param type 资源类型
    * @param release 资源是否需要释放
    */
    public async loadArray<T extends cc.Asset>(array: string[], type: typeof cc.Asset, isAddRef: boolean = true, release: boolean = true): Promise<T[]> {
        return new Promise((resolve, reject) => {
            let p: Promise<T>[] = [];
            for (let i = 0; i < array.length; i++) {
                p.push(this.load(array[i], type, isAddRef, release));
            }
            Promise.all(p).then(result => {
                result = result.filter(item => { return !!item; });
                resolve(result);
            });
        });
    }

    /**
     * 加载某个文件夹内的某类资源
     * @param url 资源路径
     * @param type 资源类型
     * @param release 资源是否需要释放
     */
    public async loadDir<T extends cc.Asset>(url: string, type: typeof cc.Asset, isAddRef: boolean = true, release: boolean = true): Promise<T[]> {
        let parseData = this.parseUrl(url);
        if (parseData.bundle && !cc.assetManager.getBundle(parseData.bundle)) {
            await this.loadBundle(parseData.bundle);
        }

        return new Promise((resolve, reject) => {
            let bundle: cc.AssetManager.Bundle = parseData.bundle ? cc.assetManager.getBundle(parseData.bundle) : cc.resources;
            if (!bundle) {
                cc.error(`[Res.loadDir] cant find bundle: ${url}`);
                resolve(null);
                return;
            }

            bundle.loadDir(parseData.loadUrl, type, (error: Error, resource: T[]) => {
                if (error) {
                    cc.error(`[Res.loadDir] load error: ${error}`);
                    resolve([]);
                } else {
                    let infos = bundle.getDirWithPath(url, type);
                    resource.forEach((asset, i) => { this.cacheAsset(infos[i].path, asset, isAddRef, release); });
                    resolve(resource);
                }
            });
        });
    }

    /**
     * 加载二进制spine动画 其附带的png/text/buffer不处理计数管理, 组装成skeletonData再进行计数管理
     * @param path 路径
     * @param fileName 资源名
     * @returns skeletonData
     */
    loadBinrySkeletonData(path: string, fileName: string,): Promise<sp.SkeletonData> {
        return new Promise((resolve, reject) => {
            this.load<cc.TextAsset>(path, cc.TextAsset, false)
                .then((atlas: cc.TextAsset) => {
                    let reg = new RegExp(`[${fileName}]*.png`, 'g');
                    let pngNames = atlas.text.match(reg);
                    let paths = [path];
                    for (let i = 1; i < pngNames.length; i++) {
                        paths.push(`${path}${i + 1}`);
                    }
                    this.loadArray<cc.Texture2D>(paths, cc.Texture2D, false).then((textures: cc.Texture2D[]) => {
                        this.load<cc.BufferAsset>(path, cc.BufferAsset, false).then((buffer: cc.BufferAsset) => {
                            let skeletonData = new sp.SkeletonData();
                            skeletonData['_nativeAsset'] = buffer['_nativeAsset'];
                            skeletonData['_nativeUrl'] = buffer.nativeUrl;
                            skeletonData.atlasText = atlas.text;
                            skeletonData.textures = textures;
                            skeletonData['textureNames'] = [atlas.name + '.png'];
                            for (let i = 1; i < textures.length; i++) {
                                skeletonData['textureNames'].push(`${atlas.name}${i + 1}.png`);
                            }
                            skeletonData['_uuid'] = textures[0]['_uuid'];
                            //skeletonData 计数处理
                            this.cacheAsset(path, skeletonData);
                            resolve(skeletonData);
                        });
                    });
                })
                .catch((error) => {
                    cc.error(`[Res.loadBinrySkeletonData] load error: ${error}`);
                    resolve(null);
                });
        });
    }

    /**
     * 获取节点实例，并建立新节点与prefab资源的联系
     * @param original 用于实例化节点的prefab或node
     * @param related 如果original不是动态加载的prefab，则需传入与original相关联的动态加载的prefab或node，以便资源释放的管理
     * @example 
     * // 1.original为动态加载的prefab，无需传related参数
     * Res.instantiate(original)
     * 
     * // 2.aPrefab为动态加载的prefab，aNode为aPrefab的实例节点（aNode = Res.instantiate(aPrefab)），original为被aPrefab静态引用的prefab，则调用时需要用如下方式才能保证引用关系正确
     * Res.instantiate(original, aPrefab)
     * Res.instantiate(original, aNode)
     * 
     * // 3.aPrefab为动态加载的prefab，aNode为aPrefab的实例节点（aNode = Res.instantiate(aPrefab)），original为aNode的某个子节点，则如下方式均可保证引用关系正确
     * Res.instantiate(original)
     * Res.instantiate(original, aPrefab)
     * Res.instantiate(original, aNode)
     */
    public instantiate(original: cc.Node | cc.Prefab, related?: cc.Node | cc.Prefab): cc.Node {
        if (!original) {
            cc.error("[Res.instantiate] original is null");
            return null;
        }

        let node = cc.instantiate(original) as cc.Node;
        let url = this.getCachePrefabUrl(related) || this.getCachePrefabUrl(original);
        console.log(url);
        if (url) {
            let cacheData: PrefabCacheData = this._prefabCache.get(url);
            // release为true才缓存关联节点
            if (cacheData && cacheData.release) {
                if (!Array.isArray(cacheData.nodes)) {
                    cacheData.nodes = [];
                }
                cacheData.nodes.push(node);
                this._nodePath.set(node, url);
            }
        }
        return node;
    }

    /**
     * 尝试释放所有缓存资源
     * - 只要遵守本文件的规则注释，此接口不会导致正在被使用的资源被引擎释放，可放心使用
     */
    public releaseAll(): void {
        let nowSec = Date.now() / 1000;
        // prefab
        this._prefabCache.forEach((cacheData, url) => {
            if (!cacheData.release || nowSec - cacheData.lastLoadTime < this.releaseSec) {
                return;
            }

            if (Array.isArray(cacheData.nodes)) {
                for (let i = cacheData.nodes.length - 1; i >= 0; i--) {
                    let node = cacheData.nodes[i];
                    if (node.isValid) {
                        continue;
                    }
                    this._nodePath.delete(node);
                    cacheData.nodes.splice(i, 1);
                }
                if (cacheData.nodes.length === 0) {
                    delete cacheData.nodes;
                }
            }

            if (!Array.isArray(cacheData.nodes)) {
                cacheData.asset.decRef();
                this._prefabPath.delete(cacheData.asset as cc.Prefab);
                this._prefabCache.delete(url);
            }
        });
        // spriteFrame、spriteAtlas、skeletonData
        let arr = [this._spriteFrameCache, this._spriteAtlasCache, this._skeletonDataCache];
        arr.forEach((map) => {
            map.forEach((cacheData, url) => {
                if (!cacheData.release || nowSec - cacheData.lastLoadTime < this.releaseSec) {
                    return;
                }
                cacheData.asset.decRef();
                map.delete(url);
            });
        });
        // other
    }
}

//hack spirte spine
if (CC_EDITOR) { } else {
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {

        let protoSpirte = cc.Sprite.prototype;
        let protoSpine = sp.Skeleton.prototype;
        let _getDescriptor = function (source, sourceProp) {
            let descriptor;
            while (source) {
                descriptor = Object.getOwnPropertyDescriptor(source, sourceProp);
                if (descriptor) {
                    break;
                } else {
                    source = source._proto_;
                }
            }
            if (descriptor == null) {
                descriptor = {
                    enumerable: true,
                    value: null,
                    configurable: true,
                };
            }
            return descriptor;
        };
        //spine
        let drSprite = _getDescriptor(protoSpirte, "spriteFrame");
        let $oldSpriteOnDestroy = protoSpirte['onDestroy'];
        cc.js.value(protoSpirte, "$$_asset$$", null, true);
        cc.js.value(protoSpirte, "$$_dynamic_flag$$", null, true);
        protoSpirte['onDestroy'] = function () {
            if (protoSpirte['$$_dynamic_flag$$'] && protoSpirte['$$_asset$$']) {
                protoSpirte['$$_asset$$'].decRef();
            }
            $oldSpriteOnDestroy && $oldSpriteOnDestroy.call(this);
        }

        Object.defineProperty(protoSpirte, "spriteFrame", {
            get: function () {
                if (drSprite.get != null) {
                    return drSprite.get.call(this);
                } else {
                    return drSprite.value;
                }
            },
            set: function (value) {
                protoSpirte['$$_dynamic_flag$$'] = true;
                value.addRef();
                protoSpirte['$$_asset$$']?.decRef();
                protoSpirte['$$_asset$$'] = value;
                if (drSprite.set != null) {
                    drSprite.set.call(this, value);
                }
            },
            enumerable: drSprite.enumerable,
            configurable: true,
        })
        //
        let drSpine = _getDescriptor(protoSpine, "skeletonData");
        let $oldSpineOnDestroy = protoSpine['onDestroy'];
        cc.js.value(protoSpine, "$$_asset$$", null, true);
        cc.js.value(protoSpine, "$$_dynamic_flag$$", null, true);
        protoSpine['onDestroy'] = function () {
            if (protoSpine['$$_dynamic_flag$$'] && protoSpine['$$_asset$$']) {
                protoSpine['$$_asset$$'].decRef();
            }
            $oldSpineOnDestroy && $oldSpineOnDestroy.call(this);
        }

        Object.defineProperty(protoSpine, "skeletonData", {
            get: function () {
                if (drSpine.get != null) {
                    return drSpine.get.call(this);
                } else {
                    return drSpine.value;
                }
            },
            set: function (value) {
                protoSpine['$$_dynamic_flag$$'] = true;
                value.addRef();
                protoSpine['$$_asset$$']?.decRef();
                protoSpine['$$_asset$$'] = value;
                if (drSpine.set != null) {
                    drSpine.set.call(this, value);
                }
            },
            enumerable: drSpine.enumerable,
            configurable: true,
        })
    });
}
