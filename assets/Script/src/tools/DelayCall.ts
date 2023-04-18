export class DelayCall {
    private _callbacks = []; //回调对象列表
    private _isOrderChanged = false; //时序是否已改变
    private _time = 0;
    private _callbackCaches = []; //缓存回调对象

    // 获取列表中的回调对象
    private _getCallBack(callback, thisArg) {
        for (var i = 0, n = this._callbacks.length; i < n; i++) {
            var obj = this._callbacks[i];
            if (obj.callback == callback && obj.thisArg == thisArg) {
                return obj;
            }
        }
        return null;
    }

    //按时间排序
    private _sortCallBack(o1, o2) {
        if (o1.time < o2.time) return -1;
        return 1;
    }

    //从缓存里获取回调对象,不想每次都创建
    private _getCallbackCache(callback, thisArg, time, args) {
        var obj;
        var n = this._callbackCaches.length;
        if (n == 0) {
            obj = {
                callback: null,
                time: null,
                thisArg: null,
                args: null
            };
        } else {
            obj = this._callbackCaches[n - 1];
            --this._callbackCaches.length;
        }
        obj.callback = callback;
        obj.time = time;
        obj.thisArg = thisArg;
        obj.args = args;
        return obj;
    }

    //把执行完或取消了的回调对象放回缓存中
    private _putCallbackCache(obj) {
        obj.callback = null;
        obj.time = null;
        obj.thisArg = null;
        obj.args = null;
        this._callbackCaches.push(obj);
    }

    /**
     * 添加一个延时回调, 重复添加只会修改原来回调的时间和thisArg，不会再次添加
     * @method addCall
     * @param {function} callback 
     * @param {Object} thisArg 
     * @param {number} delay 单位： 秒， 若时间为0，下帧执行
     */
    addCall(callback, thisArg = null, delay = 0, args = null) {
        if (callback == null) return;
        var obj = this._getCallBack(callback, thisArg);
        if (delay < 0) delay = 0;
        var t = this._time + delay;
        if (obj == null) {
            obj = this._getCallbackCache(callback, thisArg, t, args);
            if (this._callbacks.length > 0) {
                var lastObj = this._callbacks[this._callbacks.length - 1];
                if (t < lastObj.time) {
                    this._isOrderChanged = true;
                }
            }
            this._callbacks.push(obj);
        } else {
            obj.thisArg = thisArg;
            obj.time = t;
            obj.args = args;
            this._isOrderChanged = true;
        }
    }

    /**
     * 取消一个延时回调
     * @method cancel
     * @param {function} callback 
     */
    cancel(callback, thisArg) {
        if (callback == null) return;
        for (var i = 0, n = this._callbacks.length; i < n; i++) {
            var obj = this._callbacks[i];
            if (obj.callback == callback && obj.thisArg == thisArg) {
                this._putCallbackCache(obj);
                this._callbacks.splice(i, 1);
                break;
            }
        }
    }

    /**
     * 是否已加入延时调用
     * @method has
     * @param {function} callback 
     */
    has(callback, thisArg) {
        if (callback == null) return false;
        return this._getCallBack(callback, thisArg) != null;
    }

    /**
     * 离下次执行，还剩多少时间， 单位：秒
     * @method getDelayTime
     * @param {function} callback 
     */
    getDelayTime(callback, thisArg) {
        if (callback == null) return 0;
        var obj = this._getCallBack(callback, thisArg);
        if (obj != null) {
            return Math.abs(this._time - obj.time);
        }
        return 0
    }

    private update(dt) {
        this._time = this._time + dt;
        var n = this._callbacks.length;
        if (n == 0) return;
        if (this._isOrderChanged && n > 1) {
            this._callbacks.sort(this._sortCallBack);
        }
        let currentTime = 0;
        while (true) {
            var obj = this._callbacks[0];
            if (obj && obj.time <= this._time && (currentTime == 0 || obj.time <= currentTime)) {
                currentTime = obj.time; //一帧内只处理同一时间超时，回调，挫开并发
                this._callbacks.shift();
                var callback = obj.callback;
                var thisArg = obj.thisArg;
                var args = obj.args;
                this._putCallbackCache(obj);
                callback.apply(thisArg, args);
                // if (thisArs) {
                //     callback.call(thisArs, );
                // } else {
                //     callback();
                // }
            } else {
                break;
            }
        }
    }
}

export const delayCall = new DelayCall();
if (!CC_EDITOR) {
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
        cc.director.getScheduler().enableForTarget(delayCall);
        cc.director.getScheduler().scheduleUpdate(delayCall, cc.Scheduler.PRIORITY_SYSTEM, false);
    });
}