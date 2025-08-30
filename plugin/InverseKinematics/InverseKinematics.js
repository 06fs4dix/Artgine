import { CClass } from "../../artgine/basic/CClass.js";
import { CComponent } from "../../artgine/canvas/component/CComponent.js";
import { CPaint3D } from "../../artgine/canvas/component/paint/CPaint3D.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CMath } from "../../artgine/geometry/CMath.js";
import { CUtilMath } from "../../artgine/geometry/CUtilMath.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";
class CIK extends CComponent {
    m_ptOff = 0;
    m_bone;
    m_target;
    m_paint;
    m_tipBone;
    constructor(_targetRef, _bone) {
        super();
        this.m_bone = _bone;
        this.m_target = _targetRef;
        this.mSysc = CComponent.eSysn.IK;
    }
    Update(_delay) {
        super.Update(_delay);
        this.SetPaint();
        this.SetBone();
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
            const findTree = this.m_paint.mTree.Find(this.m_bone);
            if (this.m_tipBone != findTree) {
                this.m_tipBone = findTree;
                this.OnBoneUpdated();
            }
        }
    }
    OnPaintUpdated() { }
    OnBoneUpdated() { }
    ApplyToBone(_bone, _pos = null, _rot = null, _excludeBones = []) {
        const boneMat = _bone.mData.pst;
        if (_rot != null) {
            const sca = CMath.MatDecomposeSca(boneMat);
            const rotMat = CMath.QutToMat(_rot);
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    boneMat.mF32A[i * 4 + j] = rotMat.mF32A[i * 4 + j];
                }
            }
            boneMat.mF32A[0] *= sca.x;
            boneMat.mF32A[5] *= sca.y;
            boneMat.mF32A[10] *= sca.z;
        }
        if (_pos != null) {
            boneMat.mF32A[12] = _pos.x;
            boneMat.mF32A[13] = _pos.y;
            boneMat.mF32A[14] = _pos.z;
        }
        const bones = [_bone];
        while (bones.length > 0) {
            const bone = bones.pop();
            let child = bone.mChild;
            while (child) {
                if (_excludeBones.includes(child) == false) {
                    child.mData.PRSReset();
                    child.mData.pst = CMath.MatMul(child.mData.pst, bone.mData.pst);
                    bones.push(child);
                }
                child = child.mColleague;
            }
        }
    }
    MatDecomposeRot(_mat) {
        const sca = CMath.MatDecomposeSca(_mat);
        const temp = new CMat();
        for (let i = 0; i < 3; i++) {
            temp.SetV3(i, _mat.GetV3(i));
        }
        temp.mF32A[0] /= sca.x;
        temp.mF32A[5] /= sca.y;
        temp.mF32A[10] /= sca.z;
        return CMath.MatToQut(temp);
    }
    GetIKPos() {
        const obj = this.m_target.Ref();
        return CMath.MatMul(obj.GetWMat(), CMath.MatInvert(this.m_paint.GetFMat())).xyz;
    }
    GetIKRot() {
        const obj = this.m_target.Ref();
        const lMat = CMath.MatMul(obj.GetWMat(), CMath.MatInvert(this.m_paint.GetFMat()));
        return this.MatDecomposeRot(lMat);
    }
    IsShould(_member, _type) {
        if (["m_paint", "m_tipBone"].includes(_member))
            return false;
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
            let child = _node.mChild;
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
export class CIKReach extends CIK {
    m_numOfBones = 1;
    m_iteration = 10;
    m_tolerance = 0.05;
    m_pole;
    m_targetStartPos = new CVec3();
    m_targetStartRot = new CVec4();
    m_boneStartDir = new CVec3();
    m_boneStartRot = new CVec4();
    m_boneTotalLen = 0;
    m_bones = [];
    m_bonePos = [];
    m_boneRot = [];
    m_boneLen = [];
    constructor(_target, _bone, _numOfBones = 1, _iteration = 10) {
        super(_target, _bone);
        this.m_numOfBones = _numOfBones;
        this.m_iteration = _iteration;
    }
    SetPole(_pole) {
        this.m_pole = _pole;
    }
    SetBone() {
        super.SetBone();
        if (this.m_tipBone && this.m_bones.length != this.m_numOfBones) {
            this.OnBoneUpdated();
        }
    }
    OnPaintUpdated() {
        if (!this.m_paint)
            return;
        this.m_targetStartPos.Import(this.GetIKPos());
        this.m_targetStartRot.Import(this.GetIKRot());
    }
    OnBoneUpdated() {
        if (!this.m_tipBone)
            return;
        this.m_boneTotalLen = 0;
        this.m_bones.length = 0;
        this.m_bonePos.length = 0;
        this.m_boneRot.length = 0;
        this.m_boneLen.length = 0;
        let prev = null;
        let cur = this.m_tipBone;
        for (let i = this.m_numOfBones - 1; i >= 0; i--) {
            this.m_bones[i] = cur;
            this.m_boneStartRot[i] = this.MatDecomposeRot(cur.mData.pst);
            if (i == this.m_numOfBones - 1) {
                this.m_boneStartDir[i] = CMath.V3SubV3(this.m_targetStartPos, cur.mData.pst.xyz);
            }
            else {
                this.m_boneStartDir[i] = CMath.V3SubV3(prev.mData.pst.xyz, cur.mData.pst.xyz);
                this.m_boneLen[i] = CMath.V3Len(this.m_boneStartDir[i]);
                this.m_boneTotalLen += this.m_boneLen[i];
            }
            prev = cur;
            cur = cur.mParent;
        }
    }
    Update(_delay) {
        super.Update(_delay);
        if (this.m_numOfBones != this.m_bones.length) {
            return;
        }
        for (let i = 0; i < this.m_numOfBones; i++) {
            this.m_bonePos[i] = this.m_bones[i].mData.pst.xyz;
        }
        this.SolveIK();
        for (let i = 0; i < this.m_numOfBones; i++) {
            this.ApplyToBone(this.m_bones[i], this.m_bonePos[i], this.m_boneRot[i]);
        }
    }
    SolveIK() {
        const curPtPos = this.GetIKPos();
        const curPtRot = this.GetIKRot();
        let distance = CMath.V3Distance(curPtPos, this.m_bonePos[0]);
        if (distance >= this.m_boneTotalLen) {
            let dir = CMath.V3SubV3(curPtPos, this.m_bonePos[0]);
            CMath.V3Nor(dir, dir);
            for (let i = 1; i < this.m_bonePos.length; i++) {
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i - 1], CMath.V3MulFloat(dir, this.m_boneLen[i - 1]));
            }
        }
        else {
            distance = CMath.V3Distance(this.m_bonePos[this.m_bonePos.length - 1], curPtPos);
            let count = 0;
            while (distance > this.m_tolerance) {
                count++;
                if (count > this.m_iteration) {
                    break;
                }
                const startPtPos = this.m_bonePos[0];
                this.Backward(curPtPos);
                this.Forward(startPtPos);
            }
        }
        this.PoleConstraint();
        for (let i = 0; i < this.m_numOfBones - 1; i++) {
            const curDir = CMath.V3SubV3(this.m_bonePos[i + 1], this.m_bonePos[i]);
            const rotQut = CMath.FromToRotation(this.m_boneStartDir[i], curDir);
            this.m_boneRot[i] = CMath.QutMul(this.m_boneStartRot[i], rotQut);
        }
        const lastIndex = this.m_bonePos.length - 1;
        this.m_boneRot[lastIndex] = CMath.QutMul(this.m_boneStartRot[lastIndex], curPtRot);
    }
    Backward(_curPtPos) {
        for (let i = this.m_numOfBones - 1; i >= 0; i--) {
            if (i == this.m_bonePos.length - 1) {
                this.m_bonePos[i] = _curPtPos;
            }
            else {
                let dir = CMath.V3SubV3(this.m_bonePos[i], this.m_bonePos[i + 1]);
                CMath.V3Nor(dir, dir);
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i + 1], CMath.V3MulFloat(dir, this.m_boneLen[i]));
            }
        }
    }
    Forward(_startPtPos) {
        for (let i = 0; i < this.m_bonePos.length; i++) {
            if (i == 0) {
                this.m_bonePos[i] = _startPtPos;
            }
            else {
                let dir = CMath.V3SubV3(this.m_bonePos[i], this.m_bonePos[i - 1]);
                CMath.V3Nor(dir, dir);
                this.m_bonePos[i] = CMath.V3AddV3(this.m_bonePos[i - 1], CMath.V3MulFloat(dir, this.m_boneLen[i - 1]));
            }
        }
    }
    PoleConstraint() {
        const pole = this.m_pole?.Ref();
        if (pole) {
            const lMat = CMath.MatMul(pole.GetWMat(), CMath.MatInvert(this.m_paint.GetFMat()));
            let pPos = this.MatDecomposeRot(lMat);
            for (let i = 1; i < this.m_bonePos.length - 1; i++) {
                let tipBone = this.m_bonePos[i + 1];
                let movBone = this.m_bonePos[i];
                let botBone = this.m_bonePos[i - 1];
                let planeNormal = CMath.V3Nor(CMath.V3SubV3(tipBone, botBone));
                let planeDistance = -CMath.V3Dot(planeNormal, botBone);
                let projPole = CUtilMath.ClosesetPointOnPlane(planeNormal, planeDistance, pPos);
                let projBone = CUtilMath.ClosesetPointOnPlane(planeNormal, planeDistance, movBone);
                let angle = CMath.V3SignedAngle(CMath.V3SubV3(projBone, botBone), CMath.V3SubV3(projPole, botBone), planeNormal);
                let newRot = CMath.QutAxisToRotation(planeNormal, angle);
                this.m_bonePos[i] = CMath.V3AddV3(CMath.V3MulMatCoordi(CMath.V3SubV3(movBone, botBone), CMath.QutToMat(newRot)), botBone);
            }
        }
    }
}
export class CIKLook extends CIK {
    m_startDir;
    m_startRot = new CVec4();
    OnBoneUpdated() {
        if (!this.m_tipBone)
            return;
        const boneMat = this.m_tipBone.mData.pst;
        this.m_startRot.Import(this.MatDecomposeRot(boneMat));
        if (this.m_startDir == null) {
            this.UpdateDefaultDir();
        }
    }
    UpdateDefaultDir() {
        if (!this.m_tipBone)
            return;
        const boneMat = this.m_tipBone.mData.pst;
        const bonePos = boneMat.xyz;
        const ptPos = this.GetIKPos();
        this.m_startDir = CMath.V3SubV3(ptPos, bonePos);
    }
    Update(_delay) {
        super.Update(_delay);
        if (!this.m_tipBone) {
            return;
        }
        const boneMat = this.m_tipBone.mData.pst;
        const bonePos = boneMat.xyz;
        const ptPos = this.GetIKPos();
        const curDir = CMath.V3SubV3(ptPos, bonePos);
        const rotQut = CMath.FromToRotation(this.m_startDir, curDir);
        const newBoneRot = CMath.QutMul(this.m_startRot, rotQut);
        this.ApplyToBone(this.m_tipBone, null, newBoneRot);
    }
    IsShould(_member, _type) {
        if (["m_startRot"].includes(_member))
            return false;
        return super.IsShould(_member, _type);
    }
    EditHTMLInit(_div, _pointer = null) {
        super.EditHTMLInit(_div, _pointer);
        var button = document.createElement("button");
        button.innerText = "UpdateDefaultDir";
        button.onclick = () => {
            this.UpdateDefaultDir();
        };
        _div.append(button);
    }
}
CClass.Push(CIKReach);
CClass.Push(CIKLook);
