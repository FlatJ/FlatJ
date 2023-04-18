import { BasePanel } from './ui/BasePanel';
import { BatchChildrenRender } from './components/BatchChildrenRender';
import { binding } from './tools/Binding';
import { delayCall } from './tools/DelayCall';
import { EventDispatcher } from './core/EventDispatcher';
import { FlatJEnum } from './enums/FlatJEnum';
import { MusicId } from './enums/MusicId';
import { Pool } from './core/Pool';
import { Queue } from './tools/Queue';
import { resManager } from './manager/ResManager';
import { Timer } from './tools/Timer';
import { Utils } from './tools/Utils';


export class FlatJ {
    //component
    public static BatchChildrenRender = BatchChildrenRender;
    //core
    public static EventDispatcher = new EventDispatcher();
    //enums
    public static Enum = FlatJEnum;
    public static MusicId = MusicId;
    //managers
    public static ResManager = resManager;
    //tool
    public static binding = binding;
    public static Timer = Timer;
    public static Utils = new Utils();
    public static Queue = Queue;
    public static DelayCall = delayCall;
    public static Pool = Pool;
    //ui
    public static BasePanel = BasePanel;
}

// 将类导出为全局
window['FlatJ'] = FlatJ