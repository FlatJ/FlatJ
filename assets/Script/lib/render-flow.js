if (CC_EDITOR) {}
else if(CC_JSB) {
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
        let $CCNode = cc.Node;
        let proto = $CCNode.prototype;
        
        cc.js.set(proto, 'globalZOrder', function (value) {
            this._proxy.setGlobalZOrder(value);
        }, true, true);

        cc.js.set(proto, 'isGroup', function (value) {
            this._proxy.setIsGroup(value);
        }, true, true);

        cc.js.set(proto, 'groupDirty',function (value) {
            this._proxy.setGroupDirty(value);
        }, true, true);

        cc.js.set(proto, 'isMask',function (value) {
            this._proxy.setIsMask(value);
        }, true, true);

    });
}  
else {
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
        //scale fix
        let func = cc.Node.prototype.setScale;
        cc.Node.prototype.setScale = function () {
            func.call(this, ...arguments);
            if (this.___is_render_child___) {
                setChildWorldTransformDirty(this);
            }
        }

        let setChildWorldTransformDirty = function (node) {
            for (let child of node.children) {
                child._renderFlag |= cc.RenderFlow.FLAG_WORLD_TRANSFORM;
                setChildWorldTransformDirty(child);
            }
        }

        //render
        let RenderFlow = cc.RenderFlow;
        let flows = RenderFlow.flows;
        let proto = RenderFlow.prototype;

        let _batcher = RenderFlow.getBachther();
        let _cullingMask = 0;

        const WORLD_TRANSFORM = RenderFlow.FLAG_WORLD_TRANSFORM;
        const OPACITY_COLOR = RenderFlow.FLAG_OPACITY_COLOR;

        function parseChildren(ret, node) {
            let a = node._children;
            let n = a.length;

            node.___skip_children___ = true;
            node.___z___ = ret.length;
            if (node.getComponent(cc.Label) || node.getComponent(cc.RichText)) {
                node.___z___ += 9999;
            }
            ret.push(node);

            if (node.getComponent(cc.Mask)) {
                delete node.___skip_children___;
                return;
            }

            for (let i = 0; i < n; i++) {
                a[i].___parent_opacity___ = node.___parent_opacity___ * (node._opacity / 255);
                parseChildren(ret, a[i]);
            }
        }

        function parseNode(node) {
            let a = [];

            let c = node._children;
            let n = c.length;
            let t = [];
            for (let i = 0; i < n; i++) {
                c[i].___parent_opacity___ = node.___parent_opacity___ * (node._opacity / 255);
                parseChildren(t, c[i]);
                a.push(...t);
                t.length = 0;
            }

            a.sort((n1, n2) => {
                return n1.___z___ - n2.___z___;
            });
            return a;
        }

        proto._children = function (node) {
            if (node.___skip_children___ === true) {
                return this._next._func(node);
            }

            let cullingMask = _cullingMask;
            let batcher = _batcher;

            let parentOpacity = batcher.parentOpacity;
            let opacity = (batcher.parentOpacity *= node._opacity / 255);

            let worldTransformFlag = batcher.worldMatDirty ? WORLD_TRANSFORM : 0;
            let worldOpacityFlag = batcher.parentOpacityDirty ? OPACITY_COLOR : 0;
            let worldDirtyFlag = worldTransformFlag | worldOpacityFlag;

            if (node.___batch_children_render___ === true) {
                node.___parent_opacity___ = batcher.parentOpacity;
                let children = parseNode(node);
                for (let i = 0, l = children.length; i < l; i++) {
                    let c = children[i];
                    c.___is_render_child___ = true;

                    delete c.___z___;

                    c._renderFlag |= worldDirtyFlag;
                    if (!c._activeInHierarchy || c._opacity === 0 || c._$N_visible === false) continue;

                    _cullingMask = c._cullingMask = c.groupIndex === 0 ? cullingMask : 1 << c.groupIndex;

                    let colorVal = c._color._val;
                    //fix opacity
                    c._color._fastSetA(c._opacity * c.___parent_opacity___);
                    flows[c._renderFlag]._func(c);
                    c._color._val = colorVal;

                    delete c.___skip_children___;
                }
            } else {
                let children = node._children;
                for (let i = 0, l = children.length; i < l; i++) {
                    let c = children[i];

                    delete c.___is_render_child___;

                    c._renderFlag |= worldDirtyFlag;
                    if (!c._activeInHierarchy || c._opacity === 0 || c._$N_visible === false) continue;

                    _cullingMask = c._cullingMask = c.groupIndex === 0 ? cullingMask : 1 << c.groupIndex;

                    let colorVal = c._color._val;
                    c._color._fastSetA(c._opacity * opacity);
                    flows[c._renderFlag]._func(c);
                    c._color._val = colorVal;
                }
            }

            batcher.parentOpacity = parentOpacity;
            this._next._func(node);
        };

        RenderFlow.visitRootNode = function (rootNode) {
            RenderFlow.validateRenderers();

            let preCullingMask = _cullingMask;
            _cullingMask = rootNode._cullingMask;

            if (rootNode._renderFlag & WORLD_TRANSFORM) {
                _batcher.worldMatDirty++;
                rootNode._calculWorldMatrix();
                rootNode._renderFlag &= ~WORLD_TRANSFORM;

                flows[rootNode._renderFlag]._func(rootNode);

                _batcher.worldMatDirty--;
            } else {
                flows[rootNode._renderFlag]._func(rootNode);
            }

            _cullingMask = preCullingMask;
        };
    });
}
