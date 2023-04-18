import { HideMode } from '../const/HideMode';

const { ccclass, menu, property } = cc._decorator;

@ccclass
@menu('flatJ/component/ShowHideComponent')
export class ShowHideComponent extends cc.Component {
    @property({
        type: cc.Enum(HideMode),
        tooltip: CC_DEV && `NONE:什么也不做\nDISABLE:取消激活\nPOOL:回收进对象池\nDESTROY:销毁\nCACHE:缓存起来，但这里是单一对象的缓存,没有池子对面板等单一对象尤其适用.`
    })
    hideMode: HideMode = HideMode.CACHE;

    @property(cc.Boolean)
    isShowWhEnable: boolean = false;


} 