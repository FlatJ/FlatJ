import { EventDispatcher } from '../core/EventDispatcher';

export function binding(target, property) {
    let event = new EventDispatcher();
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
    let dr = _getDescriptor(target, property);
    let eventName = `$$${target.name}_${property}$$`;
    if (!dr || dr.configurable) {
        Object.defineProperty(target, property, {
            get: function () {
                if (dr.get != null) {
                    return dr.get.call(this);
                } else {
                    return dr.value;
                }
            },
            set: function (value) {
                let oldValue = dr.value;
                if (dr && dr.set != null) {
                    dr.set.call(this, value);
                } else {
                    dr.value = value;
                }
                event.emit(<any>eventName, oldValue, value);
            },
            enumerable: dr.enumerable,
            configurable: false,
        });
    }

    return function (fn: any, key: string, descriptor: any) {
        let $onEnable = fn['onEnable'];
        let $onDisable = fn['onDisable'];
        fn['onEnable'] = function () {
            $onEnable && $onEnable.call(this);
            fn[key].call(this, target[property], target[property]);
            event.on(<any>eventName, fn[key], this);
        };

        fn['onDisable'] = function () {
            $onDisable && $onDisable.call(this);
            event.off(<any>eventName, fn[key], this);
        };
    };
}
