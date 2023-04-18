class TUtils {
    private static _gid: number = 1;

    /**ID */
    static getGID(): number {
        return TUtils._gid++;
    }
}
/**
 * @private
 */
class CallLater {
    static I = new CallLater();
    /**@private */
    private _pool: LaterHandler[] = [];
    /**@private */
    private _map: { [key: string]: LaterHandler } = {};
    /**@private */
    private _laters: LaterHandler[] = [];

    /**
     * @internal
     * 
     */
    _update(): void {
        let laters = this._laters;
        let len = laters.length;
        if (len > 0) {
            for (let i = 0, n = len - 1; i <= n; i++) {
                let handler = laters[i];
                this._map[handler.key] = null;
                if (handler.method !== null) {
                    handler.run();
                    handler.clear();
                }
                this._pool.push(handler);
                i === n && (n = laters.length - 1);
            }
            laters.length = 0;
        }
    }

    /** @private */
    private _getHandler(caller: any, method: any): LaterHandler {
        var cid: number = caller ? caller.$_GID || (caller.$_GID = TUtils.getGID()) : 0;
        var mid: number = method.$_TID || (method.$_TID = TimerClass._mid++);
        return this._map[cid + '.' + mid];
    }

    /**
     * 
     * @param	caller (this)
     * @param	method 
     * @param	args 
     */
    callLater(caller: any, method: Function, args: any[] = null): void {
        if (this._getHandler(caller, method) == null) {
            let handler: LaterHandler;
            if (this._pool.length) handler = this._pool.pop();
            else handler = new LaterHandler();
            //
            handler.caller = caller;
            handler.method = method;
            handler.args = args;
            //handler
            var cid: number = caller ? caller.$_GID : 0;
            var mid: number = (method as any)['$_TID'];
            handler.key = cid + '.' + mid;
            this._map[handler.key] = handler;
            //
            this._laters.push(handler);
        }
    }

    /**
     *  callLater 
     * @param	caller (this)
     * @param	method 
     */
    runCallLater(caller: any, method: Function): void {
        var handler = this._getHandler(caller, method);
        if (handler && handler.method != null) {
            this._map[handler.key] = null;
            handler.run();
            handler.clear();
        }
    }
}

/** @private */
class LaterHandler {
    key: string;
    caller: any;
    method: Function;
    args: any[];

    clear(): void {
        this.caller = null;
        this.method = null;
        this.args = null;
    }

    run(): void {
        var caller = this.caller;
        if (caller && caller.destroyed) return this.clear();
        var method = this.method;
        var args = this.args;
        if (method == null) return;
        args ? method.apply(caller, args) : method.call(caller);
    }
}

/** @private */
class TimerHandler {
    key: string;
    repeat: boolean;
    delay: number;
    userFrame: boolean;
    exeTime: number;
    caller: any;
    method: Function;
    args: any[];
    jumpFrame: boolean;

    clear(): void {
        this.caller = null;
        this.method = null;
        this.args = null;
    }

    run(withClear: boolean): void {
        var caller: any = this.caller;
        if (caller && caller.destroyed) return this.clear();
        var method: Function = this.method;
        var args: any[] = this.args;
        withClear && this.clear();
        if (method == null) return;
        args ? method.apply(caller, args) : method.call(caller);
    }
}

/**
 * <code>Timer</code> ，， timer 
 */
class TimerClass {
    /**@private */
    static gSysTimer: TimerClass = null;

    /**@private */
    private static _pool: any[] = [];
    /**@private */
    static _mid: number = 1;

    /** */
    scale: number = 1;
    /** */
    currTimer: number = Date.now();
    /** */
    currFrame: number = 0;
    /**@internal ,*/
    _delta: number = 0;
    /**@internal */
    _lastTimer: number = Date.now();
    /**@private */
    private _map: { [key: string]: TimerHandler } = {};
    /**@private */
    private _handlers: any[] = [];
    /**@private */
    private _temp: any[] = [];
    /**@private */
    private _count: number = 0;

    /**
     *  <code>Timer</code> 
     */
    constructor(autoActive: boolean = true) {
        autoActive && TimerClass.gSysTimer && TimerClass.gSysTimer.frameLoop(1, this, this.update);
    }

    /**,*/
    get delta(): number {
        return this._delta;
    }

    /**
     * @internal
     * 
     */
    private update(): void {
        if (this.scale <= 0) {
            this._lastTimer = Date.now();
            this._delta = 0;
            return;
        }
        var frame: number = (this.currFrame = this.currFrame + this.scale);
        var now: number = Date.now();
        var awake: boolean = now - this._lastTimer > 30000;
        this._delta = (now - this._lastTimer) * this.scale;
        var timer: number = (this.currTimer = this.currTimer + this._delta);
        this._lastTimer = now;

        //handler
        var handlers: any[] = this._handlers;
        this._count = 0;
        for (var i: number = 0, n: number = handlers.length; i < n; i++) {
            var handler: TimerHandler = handlers[i];
            if (handler.method !== null) {
                var t: number = handler.userFrame ? frame : timer;
                if (t >= handler.exeTime) {
                    if (handler.repeat) {
                        if (!handler.jumpFrame || awake) {
                            handler.exeTime += handler.delay;
                            handler.run(false);
                            if (t > handler.exeTime) {
                                //，，，jumpFrame=true
                                handler.exeTime += Math.ceil((t - handler.exeTime) / handler.delay) * handler.delay;
                            }
                        } else {
                            while (t >= handler.exeTime) {
                                handler.exeTime += handler.delay;
                                handler.run(false);
                            }
                        }
                    } else {
                        handler.run(true);
                    }
                }
            } else {
                this._count++;
            }
        }

        CallLater.I._update();
        if (this._count > 30 || frame % 200 === 0) this._clearHandlers();
    }

    /** @private */
    private _clearHandlers(): void {
        var handlers: any[] = this._handlers;
        for (var i: number = 0, n: number = handlers.length; i < n; i++) {
            var handler: TimerHandler = handlers[i];
            if (handler.method !== null) this._temp.push(handler);
            else this._recoverHandler(handler);
        }
        this._handlers = this._temp;
        handlers.length = 0;
        this._temp = handlers;
    }

    /** @private */
    private _recoverHandler(handler: TimerHandler): void {
        if (this._map[handler.key] == handler) delete this._map[handler.key];
        handler.clear();
        TimerClass._pool.push(handler);
    }

    /** @internal */
    private _create(
        useFrame: boolean,
        repeat: boolean,
        delay: number,
        caller: any,
        method: Function,
        args: any[],
        coverBefore: boolean
    ): TimerHandler {
        //0，
        if (!delay) {
            method.apply(caller, args);
            return null;
        }

        //
        if (coverBefore) {
            var handler: TimerHandler = this._getHandler(caller, method);
            if (handler) {
                handler.repeat = repeat;
                handler.userFrame = useFrame;
                handler.delay = delay;
                handler.caller = caller;
                handler.method = method;
                handler.args = args;
                handler.exeTime = delay + (useFrame ? this.currFrame : this.currTimer + Date.now() - this._lastTimer);
                return handler;
            }
        }

        //timerHandler
        handler = TimerClass._pool.length > 0 ? TimerClass._pool.pop() : new TimerHandler();
        handler.repeat = repeat;
        handler.userFrame = useFrame;
        handler.delay = delay;
        handler.caller = caller;
        handler.method = method;
        handler.args = args;
        handler.exeTime = delay + (useFrame ? this.currFrame : this.currTimer + Date.now() - this._lastTimer);

        //handler
        this._indexHandler(handler);

        //
        this._handlers.push(handler);

        return handler;
    }

    /** @private */
    private _indexHandler(handler: TimerHandler): void {
        var caller: any = handler.caller;
        var method: any = handler.method;
        var cid: number = caller ? caller.$_GID || (caller.$_GID = TUtils.getGID()) : 0;
        var mid: number = method.$_TID || (method.$_TID = TimerClass._mid++);
        handler.key = cid + '_' + mid;
        this._map[handler.key] = handler;
    }

    /**
     * 
     * @param	delay	()
     * @param	caller	(this)
     * @param	method	
     * @param	args	
     * @param	coverBefore	， true 
     */
    once(delay: number, caller: any, method: Function, args: any[] = null, coverBefore: boolean = true): void {
        this._create(false, false, delay, caller, method, args, coverBefore);
    }

    /**
     * 
     * @param	delay	()
     * @param	caller	(this)
     * @param	method	
     * @param	args	
     * @param	coverBefore	， true 
     * @param	jumpFrame ，，，，，jumpFrame=true，
     */
    loop(
        delay: number,
        caller: any,
        method: Function,
        args: any[] = null,
        coverBefore: boolean = true,
        jumpFrame: boolean = false
    ): void {
        var handler: TimerHandler = this._create(false, true, delay, caller, method, args, coverBefore);
        if (handler) handler.jumpFrame = jumpFrame;
    }

    /**
     * ()
     * @param	delay	()
     * @param	caller	(this)
     * @param	method	
     * @param	args	
     * @param	coverBefore	， true 
     */
    frameOnce(delay: number, caller: any, method: Function, args: any[] = null, coverBefore: boolean = true): void {
        this._create(true, false, delay, caller, method, args, coverBefore);
    }

    /**
     * ()
     * @param	delay	()
     * @param	caller	(this)
     * @param	method	
     * @param	args	
     * @param	coverBefore	， true 
     */
    frameLoop(delay: number, caller: any, method: Function, args: any[] = null, coverBefore: boolean = true): void {
        this._create(true, true, delay, caller, method, args, coverBefore);
    }

    /** */
    toString(): string {
        return ' handlers:' + this._handlers.length + ' pool:' + TimerClass._pool.length;
    }

    /**
     * 
     * @param	caller (this)
     * @param	method 
     */
    clear(caller: any, method: Function): void {
        var handler: TimerHandler = this._getHandler(caller, method);
        if (handler) {
            handler.clear();
        }
    }

    /**
     * 
     * @param	caller (this)
     */
    clearAll(caller: any): void {
        if (!caller) return;
        for (var i: number = 0, n: number = this._handlers.length; i < n; i++) {
            var handler: TimerHandler = this._handlers[i];
            if (handler.caller === caller) {
                handler.clear();
            }
        }
    }

    /** @private */
    private _getHandler(caller: any, method: any): TimerHandler {
        var cid: number = caller ? caller.$_GID || (caller.$_GID = TUtils.getGID()) : 0;
        var mid: number = method.$_TID || (method.$_TID = TimerClass._mid++);
        var key: any = cid + '_' + mid;
        return this._map[key];
    }

    /**
     * 
     * @param	caller (this)
     * @param	method 
     * @param	args 
     */
    callLater(caller: any, method: Function, args: any[] = null): void {
        CallLater.I.callLater(caller, method, args);
    }

    /**
     *  callLater 
     * @param	caller (this)
     * @param	method 
     */
    runCallLater(caller: any, method: Function): void {
        CallLater.I.runCallLater(caller, method);
    }

    /**
     * ，
     * @param	caller (this)
     * @param	method 
     */
    runTimer(caller: any, method: Function): void {
        var handler: TimerHandler = this._getHandler(caller, method);
        if (handler && handler.method != null) {
            this._map[handler.key] = null;
            handler.run(true);
        }
    }

    /**
     * 
     */
    pause(): void {
        this.scale = 0;
    }

    /**
     * 
     */
    resume(): void {
        this.scale = 1;
    }
}

export const Timer = new TimerClass(false);
if (!CC_EDITOR) {
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
        cc.director.getScheduler().enableForTarget(Timer);
        cc.director.getScheduler().scheduleUpdate(Timer, cc.Scheduler.PRIORITY_SYSTEM, false);
    });
}
