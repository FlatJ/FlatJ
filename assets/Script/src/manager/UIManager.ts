import { MessageMode } from '../enums/MessageMode';
import { poolManager } from './PoolManager';
import { resManager } from './ResManager';

export class UIManager {
    /**
     * 通过这样 UIManager.layers.popUpLayer可以访问到不同的层,一般不要修改它
     * @property layers
     */
    public layers: {} = {};
    private layersKeys: string[] = [
        "floorLayer", //底图层
        "viewLayer", //游戏层
        "menuLayer", //菜单层
        "popupLayer", //弹出面板层
        "popMenuLayer", //弹出菜单
        "messageLayer", //轻度信息提示层
        "guideLayer", //新手引导层
        "toolTipLayer", //ToolTip层
        "waitingLayer", //等待画面层
        "loadingLayer", //加载画面层
        "systemPopLayer", //系统提示信息层
        "debugLayer" //调试层
    ];
    /**
     * 提示背景prefab
     * @property {cc.Prefab} messageBgPrefab
     */
    messageBgPrefab = null;
    /**
     * 提示prefab
     * @property {cc.Prefab} messagePrefab
     */
    messagePrefab = null;
    /**
     * 提示信息多少秒后自己消失
     * @property {number} messageAutoCloseTime
     */
    messageAutoCloseTime = 2;
    /**
     * 多条提示信息时的显示模式
     * @property {MessageMode} messageMode (Float|Replace) 对应的是(新向把旧的顶上浮可以显示多条|冲掉旧的信息在旧的信息上显示新信息)
     */
    messageMode = MessageMode.FLOAT;
    /**
     * 多条信息显示的最大数量
     */
    messageMax = Number.MAX_VALUE;

    /**
     * 等待显示
     * @property {cc.Prefab} waitingPrefab
     */
    waitingPrefab = null;
    /**
     * 等待显示模态遮罩颜色
     * @property {cc.color|string} waitingMaskColor 默认透明
     */
    waitingMaskColor = new cc.Color(0, 0, 0, 0);

    /**
     * 警告面板prefab
     * @property {cc.Prefab} alertPrefab 
     */
    alertPrefab = null;
    /**
     * 警告面板模态遮罩颜色
     * @property {cc.color|string} alertMaskColor 默认黑色半透
     */
    alertMaskColor = new cc.Color(0, 0, 0, 255 * 0.5);

    /**
     * 警告面板默认标题
     * @property {string} alertTitle 默认""
     */
    alertTitle = "";
    /**
     * 警告面板默认确定文字
     * @property {string} alertOk 默认"OK"
     */
    alertOk = "OK";
    /**
     * 警告面板默认取消文字
     * @property {string} alertCancel 默认"Cancel"
     */
    alertCancel = "Cancel";
    /**
     * 弹出面板模态遮罩颜色
     * @property {cc.color|string} popupMaskColor 默认黑色半透
     */
    popupMaskColor = new cc.Color(0, 0, 0, 255 * 0.5);

    /**
     * 弹出菜单prefab
     * @property {cc.Prefab} popupMenuPrefab 
     */
    popupMenuPrefab = null;
    /**
     * 工具提示prefab
     * @property {cc.Prefab} toolTipPrefab 
     */
    toolTipPrefab = null;
    /**
     * 弹窗遮照prefab
     * @property {cc.Prefab} maskPrefab 
     */
    maskPrefab = null;
    /**
     * 加载界面显示事件
     * @property {Function} onLoadingShow 
     * @event
     */
    onLoadingShow = Function;
    /**
     * 加载界面隐藏事件
     * @property {Function} onLoadingHide 
     * @event
     */
    onLoadingHide = Function;
    /**
     * view面板改变时事件
     * @property {Function} onViewChanged 
     * @event
     */
    onViewChanged = Function;
    /**
     * 打开弹窗事件
     * @property {Function} onPopupChanged 
     * @event
     */
    onPopupChanged = Function;

    /**
     * 锁屏被点击事件
     * @property {Function} onLockScreenClick 
     * @event
     */
    onLockScreenClick = Function;

    /**
     * ui层顶节点
     */
    guiLayer: cc.Node;
    guiWidgetSize = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };

    // 私有变量
    private _loadingUI = null;
    private _waitingUI = null;
    private _waitingTagMap = new Map();
    private _waitingTimeoutMap = new Map();
    private _waitingDelayMap = new Map();
    private _popUpMenu = null;
    private _toolTipUI = null;
    private _navViews = [];
    private _lockScreen = null;
    private _isInit = false;
    private _popupOneByOnes = [];

    /**
     * 使用前必需要先初始化。
     * @param {Node} guiLayer 
     */
    init(guiLayer) {
        if (this._isInit)
            return;

        this.guiLayer = guiLayer;
        if (this.guiLayer == null) {
            this.guiLayer = new cc.Node("guiLayer");
            var curScene = cc.director.getScene();
            this.guiLayer.parent = curScene;
            this.guiLayer.zIndex = 1000;
        }

        var layersTemp = {};
        for (var i = 0; i < this.layersKeys.length; i++) {
            var layer = new cc.Node(this.layersKeys[i]);
            layer.parent = this.guiLayer;
            layersTemp[this.layersKeys[i]] = layer;
        }

        this.layers = layersTemp;
        this._isInit = true;
    }

    updateSize() {
        let instance = cc.Canvas.instance;
        if (instance && cc.isValid(instance.node)) {
            // 计算调整
            this.guiWidgetSize = {
                top: 45,
                bottom: 38,
                left: 0,
                right: 0
            };
            if (cc.sys.platform === cc.sys.WECHAT_GAME) {
                // 微信小游戏适配
                const wx = window['wx'];
                const info = wx ? wx.getSystemInfoSync() : null;
                const widget = this.guiWidgetSize;
                if (info && (info.system.startsWith("Windows") || info.system.startsWith("macOS"))) {
                    // windows 或 mac 电脑系统
                    widget.top = 0;
                    widget.bottom = 0;
                } else if (info && info.safeArea) {
                    // 手机系统
                    let windowHeight = info.windowHeight;
                    let gameSize = cc.view.getVisibleSize();
                    let gameHeight = gameSize.height;
                    let ratio = gameHeight / windowHeight;
                    let rect = wx.getMenuButtonBoundingClientRect();
                    //rect.width *= ratio;
                    rect.height *= ratio;
                    //rect.left *= ratio;
                    rect.top *= ratio;
                    //rect.bottom = gameSize.height - rect.bottom * ratio;
                    //rect.right = gameSize.width - rect.right * ratio;
                    widget.top = Math.max(80, rect.top + rect.height) >> 0;
                    widget.bottom = Math.max(0, info.screenHeight - info.safeArea.bottom) >> 0;
                } else {
                    // 其他未知情况
                    widget.top = 128;
                    widget.bottom = 38;
                }
            } else if (cc.sys.isBrowser && !cc.sys.isNative) {
                const widget = this.guiWidgetSize;
                // 浏览器非原生模式
                if (cc.sys.os == cc.sys.OS_IOS) {
                    // IOS系统
                    widget.top = 0;
                } else if (cc.sys.os == cc.sys.OS_ANDROID) {
                    // 安卓系统
                    widget.top = 45;
                    widget.bottom = 0;
                } else {
                    // 非手机系统
                    const view = cc.view;
                    const scale = view.getScaleX();
                    widget.top = 0;
                    widget.bottom = 0;
                    widget.left = widget.right = Math.max(0, (view.getCanvasSize().width - view.getDesignResolutionSize().width * scale) / 2 / scale) >> 0;
                }
            }
            // 应用调整
            var ws = cc.view.getCanvasSize();
            var n = instance.node;
            var w = n.width;
            var h = n.height;
            var gws = this.guiWidgetSize;
            if (gws && (!cc.sys.isMobile || cc.sys.platform === cc.sys.WECHAT_GAME || ws.height / ws.width > 2)) {
                // 高于设计分辨率时
                var comp = this.guiLayer.getComponent(cc.Widget);
                if (!comp) {
                    comp = this.guiLayer.addComponent(cc.Widget);
                    comp.isAlignTop = true;
                    comp.isAlignBottom = true;
                    comp.isAlignLeft = true;
                    comp.isAlignRight = true;
                    comp.alignMode = cc.Widget.AlignMode.ALWAYS;
                }
                // 边界值
                comp.top = gws.top;
                comp.bottom = gws.bottom;
                comp.left = gws.left;
                comp.right = gws.right;
                // 高宽
                h -= gws.top + gws.bottom;
                w -= gws.left + gws.right;
                // 子节点
                this.guiLayer.children.forEach(n => {
                    var c = n.getComponent(cc.Widget);
                    if (c) {
                        c.verticalCenter = (gws.top - gws.bottom) / 2;
                    }
                });
            }
            var layerSize = cc.size(w, h);
            for (var i in this.layers) {
                var layer = this.layers[i];
                layer.setContentSize(layerSize);
            }
        }
    }

    ///////  加载面板   ////////
    /**
     * 获取当前加载面板，没有则返回空
     * @method getCurrentLoading
     */
    getCurrentLoading(prefab?: cc.Node | cc.Prefab) {
        if (prefab && this._loadingUI == null) {
            if (prefab instanceof cc.Node) {
                this._loadingUI = prefab;
            } else {
                let key = prefab.name + "#" + prefab.data['_prefab'].fileId;
                this._loadingUI = poolManager.getCacheOrPool(key)
                if (this._loadingUI == null) {
                    this._loadingUI = resManager.instantiate(prefab);
                }
            }
        }
        return this._loadingUI;
    }
    //TODO
}