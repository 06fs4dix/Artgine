import { CClass } from "../../artgine/basic/CClass.js";
import { CUpdate } from "../../artgine/basic/Basic.js";
import { CComponent } from "../../artgine/canvas/component/CComponent.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
export class CSocketAttacher extends CComponent {
    m_ptOff = 0;
    m_bone;
    m_updated = true;
    m_target;
    m_paint;
    m_nodemp;
    constructor(_targetRef, _boneName) {
        super();
        this.m_bone = _boneName;
        this.m_target = _targetRef;
        this.mSysc = CComponent.eSysn.Event;
    }
    Update(_delay) {
        super.Update(_delay);
        this.SetPaint();
        this.SetBone();
        if (this.m_nodemp != null) {
            this.UpdateNewLMat();
        }
    }
    SetPaint() {
        const owner = this.GetOwner();
        if (!owner)
            return;
        const ptArr = owner.FindComps(CPaint3D);
        if (ptArr.length > this.m_ptOff) {
            if (this.m_paint != ptArr[this.m_ptOff]) {
                this.m_paint = ptArr[this.m_ptOff];
                this.OnPaintUpdated();
            }
        }
    }
    SetBone() {
        if (this.m_paint?.mTree) {
            for (const mp of this.m_paint.mTreeNode.mArray) {
                if (mp.md.mKey == this.m_bone) {
                    if (this.m_nodemp != mp) {
                        this.m_nodemp = mp;
                        this.OnBoneUpdated();
                    }
                    break;
                }
            }
        }
    }
    OnPaintUpdated() {
        this.m_updated = true;
    }
    OnBoneUpdated() {
        this.m_updated = true;
    }
    UpdateNewLMat() {
        const target = this.m_target?.Ref();
        if (!target)
            return;
        if (!this.m_paint)
            return;
        if (!this.m_nodemp)
            return;
        if (this.m_paint.IsUpdateFMat() ||
            this.m_nodemp.mpi.mData.updateMat == CUpdate.eType.Already) {
            this.m_updated = true;
        }
        if (this.m_updated ||
            target.mUpdateMat == CUpdate.eType.Updated) {
            const sum = this.m_nodemp.sum;
            target.SetPMat(sum);
            target.mPMatMul = true;
            target.PRSReset(true);
            target.mPMatMul = false;
            this.m_updated = false;
        }
    }
    IsShould(_member, _type) {
        const hide = [
            "m_paint", "m_nodemp"
        ];
        if (hide.includes(_member)) {
            return false;
        }
        return super.IsShould(_member, _type);
    }
    EditForm(_pointer, _div, _input) {
        super.EditForm(_pointer, _div, _input);
        if (_pointer.member !== "m_bone")
            return;
        if (!this.m_paint?.mTree)
            return;
        const tree = this.m_paint.mTree;
        const createTreeView = (_node, _prefix = '', _isLast = true) => {
            if (!_node)
                return [];
            const id = _node.ObjHash() + _node.mKey;
            const isSelected = _node.mKey == this.m_bone;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = id;
            checkbox.checked = isSelected;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = ` ${_node.mKey || "Root"}`;
            label.classList.add('ms-1');
            const applyLabelStyle = () => {
                if (checkbox.checked) {
                    label.style.fontWeight = '700';
                    label.style.color = '#0d6efd';
                    label.style.backgroundColor = '#dbe5ff';
                    label.style.padding = '0 4px';
                    label.style.borderRadius = '4px';
                }
                else {
                    label.style.fontWeight = '';
                    label.style.color = '';
                    label.style.backgroundColor = '';
                    label.style.padding = '';
                    label.style.borderRadius = '';
                }
            };
            applyLabelStyle();
            checkbox.onchange = (e) => {
                this.m_bone = _node.mKey;
                this.m_nodemp = null;
                this.EditRefresh();
                applyLabelStyle();
            };
            const line = document.createElement('div');
            line.className = 'mb-1 d-flex align-items-center';
            line.style.fontFamily = "monospace";
            const prefixSpan = document.createElement('span');
            prefixSpan.textContent = _prefix + (_isLast ? '└ ' : '├ ');
            prefixSpan.style.display = 'inline-block';
            prefixSpan.style.whiteSpace = 'pre';
            prefixSpan.style.minWidth = `${_prefix.length * 1.1 + 2}ch`;
            prefixSpan.style.userSelect = 'none';
            line.append(prefixSpan, checkbox, label);
            const elements = [line];
            let child = _node.mChilde;
            const children = [];
            while (child) {
                children.push(child);
                child = child.mColleague;
            }
            children.forEach((c, i) => {
                elements.push(...createTreeView(c, _prefix + (_isLast ? '   ' : '│  '), i === children.length - 1));
            });
            return elements;
        };
        const containerWrapper = document.createElement("div");
        containerWrapper.className = "card mb-3";
        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header d-flex justify-content-between align-items-center";
        cardHeader.textContent = "메쉬트리 리스트";
        cardHeader.style.cursor = "pointer";
        cardHeader.dataset.bsToggle = "collapse";
        cardHeader.dataset.bsTarget = "#m_ikControlCollapse";
        cardHeader.setAttribute("aria-expanded", "false");
        cardHeader.setAttribute("aria-controls", "m_ikControlCollapse");
        const collapseDiv = document.createElement("div");
        collapseDiv.className = "collapse";
        collapseDiv.id = "m_ikControlCollapse";
        const container = document.createElement("div");
        container.className = "container border my-4";
        createTreeView(tree).forEach(el => container.appendChild(el));
        collapseDiv.appendChild(container);
        containerWrapper.append(cardHeader, collapseDiv);
        _div.innerHTML = "";
        _div.appendChild(containerWrapper);
    }
}
CClass.Push(CSocketAttacher);
