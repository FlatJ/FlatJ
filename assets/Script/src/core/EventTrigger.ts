import { poolManager } from '../manager/PoolManager';

export class EventTrigger {
    private _callbacks = null;
    private _isSortCallback = false;
    private __flatJ_inPool__ = false;
    /**
     * 注册的事件数量
     * @prop {number} count
     */
    public get count() { return this._callbacks.len; }

    /**
     * 注册监听事件
     * 回调函可以通过返回一个对象给派发者，
     * 如果返回对象格式为{isStoped:boolean,value:any},则isStoped会控制是否停止事件继续传递，value为返回给派发者的数据,如果不是这种格式，则整个对象返回给派发者
     * @method on
     * @param {Function} callback 事件触发时的回调，函数内可以return返回数据给emit派发者
     * @param {number} priority 优先级
     * @returns {any} 返回给派发者的对象
     */
    on(callback, thisArg = null, priority = 0, hasEventArg = true) {
        this._on(callback, false, thisArg, priority, hasEventArg);
    }

    /**
     * 同on,但
     * 只监听一次,
     * @method once
     * @param {Function} callback 事件触发时的回调，函数内可以return返回数据给emit派发者
     * @param {number} priority 优先级
     * @returns {any} 返回给派发者的对象
     */
    once(callback, thisArg = null, priority = 0, hasEventArg = true) {
        this._on(callback, true, thisArg, priority, hasEventArg);
    }

    /**
     * 取消监听
     */
    off(callback, thisArg) {
        var arr = this._callbacks;
        if (arr && arr.length > 0) {
            for (var i = 0, n = arr.length; i < n; i++) {
                if (arr[i].callback == callback && arr[i].thisArg == thisArg) {
                    this._remove(arr, i);
                    break;
                }
            }
            if (arr.length == 0) {
                this._isSortCallback = false;
            }
        }
    }

    /**
     * 取消所有监听
     */
    offAll() {
        this._isSortCallback = false;
        if (this._callbacks) {
            this._callbacks.length = 0;
        }
    }

    /**
     * 取消所有一次性监听
     */
    offOnce() {
        var arr = this._callbacks;
        if (arr && arr.length > 0) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].isOnce) {
                    this._remove(arr, i);
                    --i;
                }
            }
            if (arr.length == 0) {
                this._isSortCallback = false;
            }
        }
    }

    /**
     * 取消目标身上的所有监听
     */
    targetOff(thisArg) {
        var arr = this._callbacks;
        if (arr && arr.length > 0) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].thisArg == thisArg) {
                    this._remove(arr, i);
                    --i;
                }
            }
            if (arr.length == 0) {
                this._isSortCallback = false;
            }
        }
    }

    /**
     * 触发事件,
     * 最多支持5个参数，不使用...rest可变参的原因是，事件可能频繁调用，可变参数会组装成数组，有gc产生 
     * 回调函可以直接返回一个对象给eimit调用者，或者通过返回一个特定结构对象{isStoped:boolean,value:any}来停止事件传递或返回值给派发者
     * @returns 返回回调的返回值，如果有多个回调，则返回不为null的那个，多个不为空返回时，前面的可以被后面冲掉，小心
     */
    emit(p1 = null, p2 = null, p3 = null, p4 = null, p5 = null) {
        if (this.__flatJ_inPool__) return;
        var result = null;
        if (this._callbacks && this._callbacks.length > 0) {
            if (this._callbacks.length == 1) { //如果列表只有一个回调，快速实现，不用拷则对象
                var listener = this._callbacks[0];
                var arg0 = listener.hasEventArg ? p1 : p1.data;
                if (listener.isOnce) this._callbacks.length = 0;
                if (listener.thisArg) {
                    result = listener.callback.call(listener.thisArg, arg0, p2, p3, p4, p5);
                } else {
                    result = listener.callback(arg0, p2, p3, p4, p5);
                }
            } else {
                // 在调回的过程中，可能会有注册监听和取消监听的操作，所以要先拷贝再遍历回调。
                var doCallbacks = this._callbacks.concat();
                if (this._isSortCallback) {
                    this._callbacks.sort(this._sortCallBack);
                }
                for (var i = 0; i < this._callbacks.length; i++) {
                    var listener = this._callbacks[i];
                    if (listener.isOnce) {
                        this._remove(this._callbacks, i);
                        --i;
                    }
                }
                if (this._callbacks.length == 0) {
                    this._isSortCallback = false;
                }
                for (var i = 0, n = doCallbacks.length; i < n; i++) {
                    var listener = doCallbacks[i];
                    if (result && result.isStopped) break;
                    var arg0 = listener.hasEventArg ? p1 : p1.data;
                    var resultTemp = null;
                    if (listener.thisArg) {
                        resultTemp = listener.callback.call(listener.thisArg, arg0, p2, p3, p4, p5);
                    } else {
                        resultTemp = listener.callback(arg0, p2, p3, p4, p5);
                    }
                    if (resultTemp != null) {
                        result = resultTemp;
                    }
                }
            }
        }
        if (result && (result.hasOwnProperty("isStopped") || result.hasOwnProperty("value"))) {
            return result.value;
        }
        return result;
    }

    /**
     * @method has 
     * @param {function} callback 
     * @param {any} thisArg 
     */
    has(callback, thisArg = null) {
        if (callback == null)
            return false;
        return this._get(callback, thisArg) != null;
    }

    /**
     * 使用完毕放回对象池
     * @method release
     */
    release() {
        EventTrigger.put(this);
    }

    //// 私有 ///
    _on(callback, isOnce, thisArg, priority, hasEventArg = true) {
        if (callback == null || this.__flatJ_inPool__) {
            return;
        }
        if (!this._callbacks) {
            this._callbacks = [];
        }
        var listener = this._get(callback, thisArg);
        if (listener == null) {
            listener = Listener.get();
            this._callbacks.push(listener);
            listener.callback = callback;
            listener.thisArg = thisArg;
        }
        listener.priority = priority;
        this._isSortCallback = (priority != 0) || this._isSortCallback
        listener.isOnce = isOnce;
        listener.hasEventArg = hasEventArg;
    }

    // 监听列表中获取回调对象
    _get(callback, thisArg = null) {
        let callbacks = this._callbacks;
        if (callbacks && callbacks.length > 0) {
            for (var i = 0, n = callbacks.length; i < n; i++) {
                let lis = callbacks[i];
                if (lis.callback === callback && lis.thisArg === thisArg) {
                    return lis;
                }
            }
        }
        return null;
    }

    _remove(arr, i) {
        arr[i] = arr[arr.length - 1];
        --arr.length;
    };

    _sortCallBack(o1, o2) {
        return o1.priority > o2.priority ? -1 : 1;
    };

    static get() {
        return EventTriggerPool.get(EventTrigger);
    }

    static put(e) {
        e.offAll();
        EventTriggerPool.put(e);
    }
}

class EventTriggerPool {
    static POOL_MAX = 999;
    static POOL_CLEAR_TIME = 30;
    static index = Object.create(null);

    static get(c) {
        let k = '__flatJ_event_trigger_' + c.name;
        let v = poolManager.get(k);
        if (!v) {
            v = new c();
        }
        return v;
    }

    static put(v) {
        let k = '__flatJ_event_trigger_' + v.constructor.name;
        if (!this.index[k]) {
            this.index[k] = true;
            poolManager.setSize(k, this.POOL_MAX);
            poolManager.setClearTime(k, this.POOL_CLEAR_TIME);
        }
        poolManager.put(k, v);
    }
}

class Listener {
    private callback = null;
    private isOnce = false;
    private thisArg = null;
    private priority = 0;
    private hasEventArg = true;

    constructor() {
        this.unuse();
    }

    unuse() {
        this.callback = null;
        this.isOnce = false;
        this.thisArg = null;
        this.priority = 0;
        this.hasEventArg = true;
    }

    static get() {
        return EventTriggerPool.get(Listener);
    }

    static put(listener) {
        EventTriggerPool.put(listener);
    }
}