const { ccclass, menu, disallowMultiple, executeInEditMode } = cc._decorator;

@ccclass
@menu('flatJ/system/render/BatchChildrenRender')
@disallowMultiple()
// @executeInEditMode(false)
export class BatchChildrenRender extends cc.Component {
    private _layoutDirty = true;
    onEnable() {
        if (CC_JSB || CC_NATIVERENDERER) {
            if (!(this.node['_proxy'] && this.node['_proxy'].setGlobalZOrder)) {
                return;
            }
            //@ts-ignore
            this.node.isGroup = true;
            this._layoutDirty = true;

            cc.director.on(cc.Director.EVENT_AFTER_UPDATE, this.updateLayout, this);
            this.onEvents(this.node);
            this._addChildrenEventListeners(this.node);
            this.updateLayout();
        } else {
            this.node['___batch_children_render___'] = true;
            this.node.on(cc.Node.EventType.CHILD_ADDED, this._updateRenderFlag, this);
            this.node.on(cc.Node.EventType.CHILD_REMOVED, this._updateRenderFlag, this);
        }
    }

    onDisable() {
        if (CC_JSB || CC_NATIVERENDERER) {
            if (!(this.node['_proxy'] && this.node['_proxy'].setGlobalZOrder)) {
                return;
            }
            //@ts-ignore
            this.node.isGroup = false;

            cc.director.off(cc.Director.EVENT_AFTER_UPDATE, this.updateLayout, this);
            this.offEvents(this.node);
            this._removeChildrenEventListeners(this.node);
            this.setGlobalZOrder(this.node, 0, true);
        } else {
            delete this.node['___batch_children_render___'];
            this.node.targetOff(this);
            this.unscheduleAllCallbacks();
        }
    }

    //=======================web=============================//
    _updateRenderFlag() {
        this.scheduleOnce(this._updateRenderFlagLater, 0.1)
    }

    _updateRenderFlagLater() {
        if (!cc.isValid(this.node)) return;
        if (!this.node.activeInHierarchy) return;
        this.node['setLocalDirty'](cc.Node._LocalDirtyFlag.ALL_POSITION);
    }
    //=======================web=============================//

    //=======================native===========================//
    private onEvents(node: cc.Node) {
        node.on(cc.Node.EventType.CHILD_ADDED, this._childAdded, this);
        node.on(cc.Node.EventType.CHILD_REMOVED, this._childRemoved, this);
        node.on(cc.Node.EventType.CHILD_REORDER, this._doLayoutDirty, this);
    }

    private offEvents(node: cc.Node) {
        node.off(cc.Node.EventType.CHILD_ADDED, this._childAdded, this);
        node.off(cc.Node.EventType.CHILD_REMOVED, this._childRemoved, this);
        node.off(cc.Node.EventType.CHILD_REORDER, this._doLayoutDirty, this);
    }

    private _addChildrenEventListeners(node: cc.Node) {
        for (let i = 0; i < node.children.length; ++i) {
            let child = node.children[i];
            this.onEvents(child);
        }
    }

    private _removeChildrenEventListeners(node: cc.Node) {
        for (let i = 0; i < node.children.length; ++i) {
            let child = node.children[i];
            this.offEvents(child)
        }
    }

    private _childAdded(child) {
        this.onEvents(child)
        this._addChildrenEventListeners(child);
        this._doLayoutDirty();
    }

    private _childRemoved(child) {
        this.offEvents(child)
        this._removeChildrenEventListeners(child);
        this._doLayoutDirty();
    }

    private _doLayoutDirty() {
        this._layoutDirty = true;
    }

    private setGlobalZOrder(node: cc.Node, loopNum: number = 0, clean: boolean = false) {
        //@ts-ignore 
        node.isMask = !!node.getComponent(cc.Mask);
        if (!clean) {
            if (loopNum <= 10) {
                let loopAddNum = node.children.length.toString().length;
                loopNum += loopAddNum;
            } else {
                loopNum++;
            }
        }
        const childZOrder = Math.pow(10, loopNum);
        node.children.forEach((child, index) => {
            //@ts-ignore 
            child.globalZOrder = clean ? 0 : childZOrder + index;
            this.setGlobalZOrder(child, loopNum, clean);
        });
    }

    public updateLayout(force: boolean = false) {
        if (force || this._layoutDirty) {
            this._layoutDirty = false;
            //@ts-ignore
            this.node.groupDirty = true;
            this.setGlobalZOrder(this.node);
        }
    }
    //=======================native===========================//
}