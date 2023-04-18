import { Timer } from '../tools/Timer';

export class Pool {
    static defaultClearTime = 60 * 2;

    /**
     * 对象池满了，或对象不活跃了被清除时回调 function(obj){}
     * @function onClear
     */
    public onClear: Function = null;
    /**
     * 对象被放入池子时回调 function(obj){}
     * @function onPut
     */
    public onPut: Function = null;
    /**
     * 对象被重新使用时回调,如果池中没对象，参数为空 function(obj){}
     * @function onGet
     */
    public onGet: Function = null;
    /**
     * 对象不存在时，创建对象的方法 
     * return object
     * @function createFun
     */
    public createFun: Function = null;

    /**
     * 对象池容量。 
     * @prop {number} size
     */
    private _size: number = 10;
    public get size() { return this._size; }
    public set size(value) {
        if (value < 0) value = 0;
        this._size = value;
        if (this._pool.length > value) {
            var arr = this._pool.splice(value);
            for (var i = 0, n = arr.length; i < n; i++) {
                this._destroyObj(this, arr[i])
            }
        }
    }

    /**
     * 对象池当前数量
     * @prop {number} count
     */
    public get count() { return this._pool.length; }

    /**
     * 对象多长时间后会被清理，默认为2分钟， 单位：秒
     * @prop {number} clearTime
     */
    private _clearTime;
    public get clearTime() {
        if (this._clearTime = null) {
            return Pool.defaultClearTime;
        }
        return this._clearTime;
    }
    public set clearTime(value) {
        value = value < 0 ? 0 : value;
        if (this._clearTime == value) return;
        this._clearTime = value;
        if (this._pool.length > 0) {
            if (value < 1) {
                // 不回收，清除定时回调
                Timer.clear(this, this.clearInactivity);
            } else {
                Timer.loop(value / 2 * 1000, this, this.clearInactivity);
            }
        }
    }

    private _pool = [];

    get() {
        var pool = this._pool;
        var cache = null;
        while (pool.length > 0) {
            var obj = pool.pop();
            if (cc.isValid(obj, true)) {
                cache = obj;
                break;
            }
        }
        if (this.onGet) {
            var result = this.onGet(cache);
            if (result != null && result == false) {
                cache = null;
            }
        }
        if (cache) {
            if (cache.reuse) cache.reuse.call(cache);
            if (cache.__flatJ_inPool__) delete cache.__flatJ_inPool__;
            if (cache.__flatJ_inPoolTime__) delete cache.__flatJ_inPoolTime__;
            if (pool.length == 0) {
                Timer.clear(this, this.clearInactivity);
            }
        } else {
            if (this.createFun) cache = this.createFun();
        }

        return cache;
    }

    isInPool(obj) {
        return obj.__flatJ_inPool__ == true;
    }

    /**
     * 向对象池返还一个不再需要的对象。
     * 并触发Pool.onPut=function(obj)回调,
     * 如果象里有方法unuse，则回调对象的unuse方法,
     * 如果对象池已满，则回调Pool.onClear(obj)和对象的destroy方法
     * @method put
     */
    put(obj) {
        if (!obj || obj.__flatJ_inPool__) return;
        if (!cc.isValid(obj, true)) return;
        var pool = this._pool;
        if (this.onPut) this.onPut(obj);
        if (obj.unuse) obj.unuse.call(obj);
        if (pool.length < this._size) {
            obj.__flatJ_inPool__ = true;
            obj.__flatJ_inPoolTime__ = Date.now();
            pool.push(obj);
            if (pool.length === 1) {
                let clearTime = this.clearTime;
                if (clearTime > 0) {
                    Timer.loop(clearTime / 2 * 1000, this, this.clearInactivity);
                }
            }
        } else {
            this._destroyObj(this, obj);
        }
    }

    /**
     * 取消定时清除
     */
    unClear() {
        this.clearTime = -1;
    };

    /**
     * 立即清理所有对象
     * @method Clear 
     */
    clearAll() {
        Timer.clear(this, this.clearInactivity);
        var pool = this._pool;
        var n = pool.length;
        if (n == 0) return;
        var arr = pool.splice(0, n);
        for (var i = 0; i < n; i++) {
            this._destroyObj(this, arr[i]);
        }
    };

    /**
     * 立即清理不活跃的对象
     * @method Clear 
     */
    clearInactivity() {
        var pool = this._pool;
        var now = Date.now();
        var expire = this.clearTime * 1000;
        for (var i = 0, n = pool.length; i < n; i++) {
            var obj = pool[i];
            if (now - obj.__flatJ_inPoolTime__ < expire) {
                break;
            }
        }
        if (i == 0) return;
        var arr = pool.splice(0, i);
        for (var i = 0, n = arr.length; i < n; i++) {
            this._destroyObj(this, arr[i]);
        }
        if (pool.length == 0) {
            Timer.clear(this, this.clearInactivity);
        }
    }

    //清理对象
    private _destroyObj(pool, obj) {
        pool.onClear && pool.onClear(obj);
        obj.destroy && obj.destroy.call(obj);
    }
}