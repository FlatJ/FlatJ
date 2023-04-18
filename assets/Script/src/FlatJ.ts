import { BasePanel } from './ui/BasePanel';
import { BatchChildrenRender } from './core/res/BatchChildrenRender';
import { binding } from './core/utils/Binding';
import { EventDispatcher } from './core/event/EventDispatcher';
import { Queue } from './core/utils/Queue';
import { ResManager } from './core/res/ResManager';
import { Timer } from './core/utils/Timer';
import { Utils } from './core/utils/Utils';

export class FlatJ {
    //managers
    public static EventDispatcher = new EventDispatcher();
    public static ResManager = new ResManager();
    public static Timer = Timer;
    public static Utils = new Utils();
    //extends
    public static Queue = Queue;
    public static BasePanel = BasePanel;
    //decorators
    public static binding = binding;
    //component
    public static BatchChildrenRender = BatchChildrenRender;
}

// 将类导出为全局
window['FlatJ'] = FlatJ