interface Handler {
    listener: Function;
    context: any;
    once: boolean;
}

export class EventDispatcher {
    private map: Map<string, Handler[]> = new Map();
    /**
     * Register an event handler
     * @param name
     * @param context
     * @param listener
     * @param once
     */
    public on(name: string, listener: Function, context?: any, once: boolean = false) {
        let handlers = this.map.get(name);
        if (handlers) {
            let has = this.has(name, listener, context);
            if (!has) {
                handlers.push({ listener, context, once });
                this.map.set(name, handlers);
            } else {
                console.warn('EventEmitter already on', name);
            }
        } else {
            handlers = [{ listener, context, once }];
            this.map.set(name, handlers);
        }
    }
    /**
     * Remove an event handler
     * @param target name/listener/context
     * @param listener
     * @param context
     */
    public off(target: string | Function | object, listener?: Function, context?: any) {
        switch (typeof target) {
            case 'string':
                let handlers = this.map.get(target);
                if (handlers) {
                    if (listener && context) {
                        this.removeHandler2(handlers, listener, context);
                    } else {
                        this.removeHandler1(handlers, listener);
                    }
                }
                break;
            case 'object':
            case 'function':
                this.map.forEach((handlers) => {
                    this.removeHandler1(handlers, target);
                });
                break;
            default:
                console.warn('Event emitter off type error:', target);
                break;
        }
    }

    public targetOff(context: any) {
        this.map.forEach((handlers) => {
            for (let i = handlers.length - 1; i >= 0; --i) {
                if (handlers[i]) {
                    if (handlers[i].context === context) {
                        handlers[i] = null;
                    }
                }
            }
        })
    }
    /**
     * Register an event handler just emit once
     */
    public once(name: string, listener: Function, context?: any) {
        this.on(name, listener, context, true);
    }
    /**
     * Emit all handlers for the given event name
     * @param name
     * @param args only support five args, ...args not use to avoid gc
     */
    public emit(name: string, p1 = null, p2 = null, p3 = null, p4 = null, p5 = null) {
        let handlers = this.map.get(name);
        if (handlers) {
            for (let i = 0; i < handlers.length; ++i) {
                let handler = handlers[i];
                if (handler === null || handler.once) {
                    handlers.splice(i, 1);
                    --i;
                }
                if (handler && handler.listener) {
                    handler.listener.call(handler.context, p1, p2, p3, p4, p5);
                }
            }
        }
    }
    /**
     * Check the handler had register
     * @param name
     * @param listener
     * @param context
     */
    public has(name: string, listener: Function, context: any) {
        if (this.map.has(name)) {
            this.map
                .get(name)
                .some((handler) => handler && handler.listener === listener && handler.context === context);
        }
        return false;
    }
    /**
     * Clear all handlers
     */
    public clear() {
        this.map.clear();
    }

    private removeHandler1(handlers: Handler[], target: any) {
        // null or undefined
        if (target === null || target === undefined) {
            handlers.length = 0;
            return;
        }
        for (let i = handlers.length - 1; i >= 0; --i) {
            if (handlers[i]) {
                if (handlers[i].context === target || handlers[i].listener === target) {
                    handlers[i] = null;
                }
            }
        }
    }

    private removeHandler2(handlers: Handler[], listener: any, context: any) {
        for (let i = handlers.length - 1; i >= 0; --i) {
            if (handlers[i]) {
                if (handlers[i].context === context && handlers[i].listener === listener) {
                    handlers[i] = null;
                }
            }
        }
    }
}