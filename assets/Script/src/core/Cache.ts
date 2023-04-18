import { delayCall } from '../tools/DelayCall';
import { Pool } from './Pool';

export class Cache {
    private _cache = {};
    private _cacheClearFun = {};
    private _count = 0;
    /**
     * 获取一个缓存对象，如果不存在返回空,
     * 如果对象有定义reuse方法，则调用
     * @method get
     * @param {string} key 
     * @returns {object}
     */
    get(key) {
        if (key == null || key == "") return null;
        var obj = this._cache[key];
        if (obj) {
            delayCall.cancel(this._cacheClearFun[key], this);
            delete this._cache[key];
            delete this._cacheClearFun[key];
            this._count--;
            if (obj.reuse) obj.reuse.call(obj);
            if (obj && obj.__gdk_inPool__) {
                obj.__gdk_inPool__ = false;
            }
        }
        return obj;
    }

    has(key) {
        if (key == null || key == "") return false;
        return this._cache[key] != null;
    }

    /**
     * 缓存一个对象， 如果对象定义有unuse方法，则调用。
     * 不活跃时间到后自动清理，如果对象定义有destroy方法，则调用， 如果参数clearFun不为空，则调用.
     * 如果指定key的对象已缓被存， 则不会覆盖原有缓存，直接返回
     * @method put
     * @param {string} key 
     * @param {object} obj 
     * @param {*} clearTime 
     * @param {*} clearFun 
     */
    put(key, obj, clearTime = null, clearFun = null, thisArg = null) {
        if (key == null || key == "" || obj == null) return;
        if (clearTime instanceof Function) {
            clearTime = Pool.defaultClearTime;
            clearFun = arguments[2];
            thisArg = arguments[3];
        }

        if (this._cache[key] == null) {
            this._cache[key] = obj;
            obj.__gdk_inPool__ = true;
            if (obj.unuse) obj.unuse.call(obj);
            this._count++;
            if (isNaN(clearTime)) return;
            var clearCallBack = this._cacheClearFun[key] = function () {
                this._count--;
                delete this._cache[key];
                delete this._cacheClearFun[key];
                if (obj.destroy) obj.destroy.call(obj);
                if (clearFun) clearFun.call(thisArg, obj);
            };
            delayCall.addCall(clearCallBack, this, clearTime);
        }
    }

    /**
     * 清理指定key的对象, 
     * 如果对象定义有destroy方法，则调用， 如果对象被缓存时， put参数clearFun不为空，则调用.
     * @method clear
     * @param {string} key 
     */
    clear(key) {
        if (key == null || key == "") return null;
        var obj = this._cache[key];
        if (obj) {
            var clearCallBack = this._cacheClearFun[key];
            delayCall.cancel(clearCallBack, this);
            clearCallBack();
        }
    }

    /**
     * 清理所有缓存的对象,
     * 如果对象定义有destroy方法，则调用， 如果对象被缓存时， put参数clearFun不为空，则调用.
     * @method clearAll
     */
    clearAll() {
        var tempCache = this._cache;
        var tempCacheClearFun = this._cacheClearFun;
        this._cache = {};
        this._cacheClearFun = {};
        for (var key in tempCache) {
            var obj = tempCache[key];
            var clearCallBack = tempCacheClearFun[key];
            if (clearCallBack) {
                delayCall.cancel(clearCallBack, this);
                clearCallBack();
            }
        }
    }

    get count() {
        return this._count;
    }
}

export const cache = new Cache();