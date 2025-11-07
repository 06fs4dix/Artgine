import { CJSON } from "../../basic/CJSON.js";
import { CString } from "../../basic/CString.js";
import { CUtil } from "../../basic/CUtil.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CMesh, CMeshAniInfo, CMeshAttacher, CMeshIK, CMeshSkin } from "../../render/CMesh.js";
import { CMeshCreateInfo } from "../../render/CMeshCreateInfo.js";
import { CKeyFrame, CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CFile } from "../../system/CFile.js";
import { CParser } from "./CParser.js";
export default class CParserSpine extends CParser {
    mJSON;
    mMesh;
    mPath;
    GetResult() {
        return this.mMesh;
    }
    async Load(pa_fileName) {
        if (pa_fileName.indexOf("/") == -1)
            this.mPath = "";
        else
            this.mPath = pa_fileName.substr(0, pa_fileName.lastIndexOf("/")) + "/";
        if (await this.Open(pa_fileName))
            return;
        this.mJSON = new CJSON(CUtil.ArrayToString(this.mBuffer.slice().buffer));
        let imgpath = this.mJSON.Get("skeleton").GetStr("images");
        this.mPath += CString.ReplaceAll(imgpath, "\\", "/");
        if (!this.mPath.endsWith("/")) {
            this.mPath += "/";
        }
        this.mMesh = new CMesh();
        this.mMesh.meshTree.mData = new CMeshDataNode();
        let boneList = new Array();
        let bones = this.mJSON.Get("bones");
        for (let bone of bones.GetDocument()) {
            let node = this.mMesh.meshTree.Find(bone.parent);
            if (node == null)
                node = this.mMesh.meshTree;
            node = node.PushChild(bone.name);
            node.mData = new CMeshDataNode();
            if (bone.x != null)
                node.mData.pos.x = bone.x;
            if (bone.y != null)
                node.mData.pos.y = bone.y;
            if (bone.scaleX != null)
                node.mData.sca.x = bone.scaleX;
            if (bone.scaleY != null)
                node.mData.sca.y = bone.scaleY;
            if (bone.rotation != null) {
                node.mData.rot = CMath.EulerToQut(new CVec3(0, 0, CMath.DegreeToRadian(bone.rotation)));
            }
            boneList.push(bone.name);
        }
        let slotMap = new Map();
        let zIndex = 0;
        let slots = this.mJSON.Get("slots");
        let slotAttachMap = new Map();
        let slotColorMap = new Map();
        for (let slot of slots.GetDocument()) {
            let node = this.mMesh.meshTree.PushChild(slot.name + "_slot");
            node.mData = new CMeshDataNode();
            node.mData.pos.z = zIndex;
            zIndex += 1;
            slotMap.set(slot.name + "_slot", slot.bone);
            slotAttachMap.set(slot.name + "_slot", slot.attachment);
            if (slot.color) {
                let color = new CVec4();
                color.x = parseInt(slot.color.slice(0, 2), 16) / 255;
                color.y = parseInt(slot.color.slice(2, 4), 16) / 255;
                color.z = parseInt(slot.color.slice(4, 6), 16) / 255;
                color.w = parseInt(slot.color.slice(6, 8), 16) / 255;
                slotColorMap.set(slot.name + "_slot", color);
            }
        }
        const MeshSkin = (_key) => {
            for (let i = 0; i < this.mMesh.skin.length; ++i) {
                if (this.mMesh.skin[i].key == _key)
                    return { meshskin: this.mMesh.skin[i], offset: i };
            }
            let m = new CMeshSkin();
            m.key = _key;
            this.mMesh.skin.push(m);
            return { meshskin: m, offset: this.mMesh.skin.length - 1 };
        };
        let skins = this.mJSON.Get("skins").GetDocument();
        let attachments = skins[0].attachments;
        for (let attKey in attachments) {
            let slotKey = attKey + "_slot";
            let att = attachments[attKey];
            let node = this.mMesh.meshTree.Find(slotKey);
            let nor = new CVec3(0, 0, 1);
            let attach = slotAttachMap.get(slotKey);
            node.mData.ci = new CMeshCreateInfo();
            let posb = node.mData.ci.Create(CVertexFormat.eIdentifier.Position);
            let uvb = node.mData.ci.Create(CVertexFormat.eIdentifier.UV);
            let norb = node.mData.ci.Create(CVertexFormat.eIdentifier.Normal);
            let web = node.mData.ci.Create(CVertexFormat.eIdentifier.Weight);
            let wib = node.mData.ci.Create(CVertexFormat.eIdentifier.WeightIndex);
            let first = true;
            for (let texKey in att) {
                let texData = att[texKey];
                let texOff = -1;
                for (let j = 0; j < this.mMesh.texture.length; ++j) {
                    if (this.mMesh.texture[j] == this.mPath + texKey + ".png") {
                        texOff = j;
                        break;
                    }
                }
                if (texOff == -1) {
                    texOff = this.mMesh.texture.length;
                    this.mMesh.texture.push(this.mPath + texKey + ".png");
                }
                if (attach == texKey) {
                    node.mData.textureOff.push(texOff);
                }
                else if (attach == null && first == true) {
                    first = false;
                }
                else {
                    continue;
                }
                let size = new CVec2(texData.width, texData.height);
                if (texData.type == null) {
                    let pos = new CVec3();
                    if (texData.x != null)
                        pos.x = texData.x;
                    if (texData.y != null)
                        pos.y = texData.y;
                    pos.z = node.mData.pos.z;
                    let sca = new CVec3(1, 1, 1);
                    if (texData.scaleX != null)
                        sca.x = texData.scaleX;
                    if (texData.scaleY != null)
                        sca.y = texData.scaleY;
                    let rot = new CVec3(0, 0, 0);
                    if (texData.rotation != null)
                        rot.z = CMath.DegreeToRadian(texData.rotation);
                    let rm = CMath.MatRotation(rot);
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rm), pos));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rm), pos));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rm), pos));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rm), pos));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rm), pos));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rm), pos));
                    uvb.bufF.Push(new CVec2(0, 0));
                    uvb.bufF.Push(new CVec2(1, 0));
                    uvb.bufF.Push(new CVec2(1, 1));
                    uvb.bufF.Push(new CVec2(0, 1));
                    uvb.bufF.Push(new CVec2(0, 0));
                    uvb.bufF.Push(new CVec2(1, 1));
                    let meshskin = MeshSkin(slotMap.get(slotKey));
                    this.mMesh.meshTree.Find(slotMap.get(slotKey)).mData.skinKey.push(meshskin.meshskin.key);
                    for (let i = 0; i < 6; ++i) {
                        web.bufF.Push(new CVec4(1, 0, 0, 0));
                        wib.bufF.Push(new CVec4(meshskin.offset, 0, 0, 0));
                    }
                }
                else if (texData.type == "mesh" || texData.type == "linkedmesh") {
                    for (let i = 0; i < texData.triangles.length; i += 3) {
                        let index = texData.triangles[i + 1];
                        texData.triangles[i + 1] = texData.triangles[i + 2];
                        texData.triangles[i + 2] = index;
                    }
                    if (texData.uvs.length == texData.vertices.length) {
                        let meshskin = MeshSkin(slotMap.get(slotKey));
                        this.mMesh.meshTree.Find(slotMap.get(slotKey)).mData.skinKey.push(meshskin.meshskin.key);
                        for (let i = 0; i < texData.triangles.length; ++i) {
                            let off = texData.triangles[i];
                            posb.bufF.Push(new CVec3(texData.vertices[off * 2 + 0], texData.vertices[off * 2 + 1], node.mData.pos.z));
                            uvb.bufF.Push(new CVec2(texData.uvs[off * 2 + 0], 1 - texData.uvs[off * 2 + 1]));
                            web.bufF.Push(new CVec4(1, 0, 0, 0));
                            wib.bufF.Push(new CVec4(meshskin.offset, 0, 0, 0));
                        }
                    }
                    else {
                        let vOffList = new Array();
                        for (let j = 0; j < texData.vertices.length; j++) {
                            vOffList.push(j);
                            j += texData.vertices[j] * 4;
                        }
                        for (let i = 0; i < texData.triangles.length; ++i) {
                            let off = texData.triangles[i];
                            let voff = vOffList[off];
                            uvb.bufF.Push(new CVec2(texData.uvs[off * 2 + 0], 1 - texData.uvs[off * 2 + 1]));
                            let wc = texData.vertices[voff];
                            voff += 1;
                            let we = new CVec4(0, 0, 0, 0);
                            let wi = new CVec4(0, 0, 0, 0);
                            let lpos = new CVec3();
                            let meshskinKey = "";
                            for (var j = 0; j < wc; ++j) {
                                let selectBone = boneList[texData.vertices[voff]];
                                meshskinKey += selectBone;
                                let meshskin = MeshSkin(meshskinKey);
                                let pos = new CVec3();
                                pos.x = texData.vertices[voff + 1];
                                pos.y = texData.vertices[voff + 2];
                                pos.z = node.mData.pos.z;
                                if (j == 0) {
                                    posb.bufF.Push(pos);
                                    lpos.Import(pos);
                                }
                                else {
                                    pos = CMath.V3SubV3(pos, lpos);
                                    meshskin.meshskin.mat.mF32A[12] = pos.x;
                                    meshskin.meshskin.mat.mF32A[13] = pos.y;
                                    meshskin.meshskin.mat.UnitCheck();
                                }
                                this.mMesh.meshTree.Find(selectBone).mData.skinKey.push(meshskin.meshskin.key);
                                switch (j) {
                                    case 0: {
                                        wi.x = meshskin.offset;
                                        we.x = texData.vertices[voff + 3];
                                        break;
                                    }
                                    case 1: {
                                        wi.y = meshskin.offset;
                                        we.y = texData.vertices[voff + 3];
                                        break;
                                    }
                                    case 2: {
                                        wi.z = meshskin.offset;
                                        we.z = texData.vertices[voff + 3];
                                        break;
                                    }
                                    case 3: {
                                        wi.w = meshskin.offset;
                                        we.w = texData.vertices[voff + 3];
                                        break;
                                    }
                                }
                                voff += 4;
                            }
                            web.bufF.Push(we);
                            wib.bufF.Push(wi);
                        }
                    }
                }
                else {
                    console.log(texData);
                    continue;
                }
                node.mData.ci.vertexCount = posb.bufF.Size(3);
                for (let i = 0; i < node.mData.ci.vertexCount; ++i) {
                    norb.bufF.Push(nor);
                }
            }
        }
        let endTime = 0;
        let animations = this.mJSON.Get("animations").GetDocument();
        for (let aniKey in animations) {
            let stTime = endTime;
            for (let slotKey in animations[aniKey].slots) {
                let node = this.mMesh.meshTree.Find(slotKey + "_slot");
                let slotAni = animations[aniKey].slots[slotKey];
                if (slotAni.attachment != null) {
                    for (var aData of slotAni.attachment) {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value.x = -1;
                        kf.value.y = -1;
                        kf.value.z = -1;
                        kf.value.w = -1;
                        if (aData.time != null)
                            kf.key += Math.trunc(aData.time * 3000);
                        if (aData.name != null)
                            kf.value.x = this.mMesh.texture.indexOf(this.mPath + aData.name + ".png");
                        node.mData.keyFrameTex.push(kf);
                        if (endTime < kf.key)
                            endTime = kf.key;
                    }
                }
                if (slotAni.color != null) {
                    for (var aData of slotAni.color) {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value.x = 1.0;
                        kf.value.y = 1.0;
                        kf.value.z = 1.0;
                        kf.value.w = 1.0;
                        if (aData.time != null)
                            kf.key += Math.trunc(aData.time * 3000);
                        if (aData.color != null) {
                            kf.value.x = parseInt(aData.color.slice(0, 2), 16) / 255;
                            kf.value.y = parseInt(aData.color.slice(2, 4), 16) / 255;
                            kf.value.z = parseInt(aData.color.slice(4, 6), 16) / 255;
                            kf.value.w = parseInt(aData.color.slice(6, 8), 16) / 255;
                        }
                        node.mData.keyFrameCA.push(kf);
                        if (endTime < kf.key)
                            endTime = kf.key;
                    }
                }
            }
            for (let boneKey in animations[aniKey].bones) {
                let node = this.mMesh.meshTree.Find(boneKey);
                let boneAni = animations[aniKey].bones[boneKey];
                if (boneAni.translate != null) {
                    for (var aData of boneAni.translate) {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value.x = node.mData.pos.x;
                        kf.value.y = node.mData.pos.y;
                        kf.value.z = node.mData.pos.z;
                        if (aData.time != null)
                            kf.key += Math.trunc(aData.time * 3000);
                        if (aData.x != null)
                            kf.value.x += aData.x;
                        if (aData.y != null)
                            kf.value.y += aData.y;
                        if (aData.z != null)
                            kf.value.z += aData.z;
                        node.mData.keyFramePos.push(kf);
                        if (endTime < kf.key)
                            endTime = kf.key;
                    }
                }
                if (boneAni.rotate != null) {
                    for (var aData of boneAni.rotate) {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value = node.mData.rot.Export();
                        if (aData.time != null)
                            kf.key += Math.trunc(aData.time * 3000);
                        if (aData.angle != null)
                            kf.value = CMath.QutMul(kf.value, CMath.EulerToQut(new CVec3(0, 0, CMath.DegreeToRadian(aData.angle))));
                        node.mData.keyFrameRot.push(kf);
                        if (endTime < kf.key)
                            endTime = kf.key;
                    }
                }
                if (boneAni.scale != null) {
                    for (var aData of boneAni.scale) {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value.x = node.mData.sca.x;
                        kf.value.y = node.mData.sca.y;
                        kf.value.z = node.mData.sca.z;
                        if (aData.time != null)
                            kf.key += Math.trunc(aData.time * 3000);
                        if (aData.x != null)
                            kf.value.x *= aData.x;
                        if (aData.y != null)
                            kf.value.y *= aData.y;
                        if (aData.z != null)
                            kf.value.z *= aData.z;
                        node.mData.keyFrameSca.push(kf);
                        if (endTime < kf.key)
                            endTime = kf.key;
                    }
                }
            }
            const aniInfo = new CMeshAniInfo();
            aniInfo.start = stTime;
            aniInfo.end = endTime;
            this.mMesh.aniMap.set(aniKey, aniInfo);
            endTime += 1000;
        }
        for (const [aniKey, aniInfo] of this.mMesh.aniMap) {
            const AddStartKF = (_kfList, _basic) => {
                let hasKFInMiddle = false;
                let off = _kfList.length;
                for (let i = 0; i < _kfList.length; ++i) {
                    if (_kfList[i].key == aniInfo.start)
                        return;
                    if (_kfList[i].key > aniInfo.start) {
                        off = i;
                        hasKFInMiddle = true;
                        break;
                    }
                    if (_kfList[i].key >= aniInfo.end) {
                        break;
                    }
                }
                if (hasKFInMiddle) {
                    const kf = _kfList[off].Export();
                    kf.key -= 1;
                    kf.value.x = _basic.x;
                    kf.value.y = _basic.y;
                    kf.value.z = _basic.z;
                    if (_basic instanceof CVec4) {
                        kf.value.w = _basic.w;
                    }
                    _kfList.splice(off, 0, kf);
                }
                const kf = new CKeyFrame();
                kf.key = aniInfo.start;
                kf.value.x = _basic.x;
                kf.value.y = _basic.y;
                kf.value.z = _basic.z;
                if (_basic instanceof CVec4) {
                    kf.value.w = _basic.w;
                }
                _kfList.splice(off, 0, kf);
            };
            const AddEndKF = (_kfList) => {
                if (_kfList.length != 0) {
                    let off = 0;
                    for (let i = _kfList.length - 1; i >= 0; --i) {
                        if (_kfList[i].key == aniInfo.end)
                            return;
                        if (_kfList[i].key < aniInfo.end) {
                            off = i;
                            break;
                        }
                        if (_kfList[i].key <= aniInfo.start) {
                            break;
                        }
                    }
                    const kf = _kfList[off].Export();
                    kf.key = aniInfo.end;
                    _kfList.splice(off + 1, 0, kf);
                }
            };
            const AddBaseKF = (_kfList, _basic) => {
                let off = _kfList.length;
                for (let i = 0; i < _kfList.length; ++i) {
                    if (_kfList[i].key > aniInfo.end) {
                        off = i;
                        break;
                    }
                }
                const kf100 = new CKeyFrame();
                kf100.key = aniInfo.end + 100;
                kf100.value.x = _basic.x;
                kf100.value.y = _basic.y;
                kf100.value.z = _basic.z;
                if (_basic instanceof CVec4) {
                    kf100.value.w = _basic.w;
                }
                const kf900 = new CKeyFrame();
                kf900.key = aniInfo.end + 900;
                kf900.value.x = _basic.x;
                kf900.value.y = _basic.y;
                kf900.value.z = _basic.z;
                if (_basic instanceof CVec4) {
                    kf900.value.w = _basic.w;
                }
                _kfList.splice(off, 0, kf100, kf900);
            };
            for (const boneKey of boneList) {
                const node = this.mMesh.meshTree.Find(boneKey);
                AddStartKF(node.mData.keyFramePos, node.mData.pos);
                AddEndKF(node.mData.keyFramePos);
                AddBaseKF(node.mData.keyFramePos, node.mData.pos);
                AddStartKF(node.mData.keyFrameRot, node.mData.rot);
                AddEndKF(node.mData.keyFrameRot);
                AddBaseKF(node.mData.keyFrameRot, node.mData.rot);
                AddStartKF(node.mData.keyFrameSca, node.mData.sca);
                AddEndKF(node.mData.keyFrameSca);
                AddBaseKF(node.mData.keyFrameSca, node.mData.sca);
            }
            for (const [slotKey, boneKey] of slotMap) {
                const node = this.mMesh.meshTree.Find(slotKey);
                const baseCol = slotColorMap.get(slotKey) ?? new CVec4(1, 1, 1, 1);
                AddStartKF(node.mData.keyFrameCA, baseCol);
                AddEndKF(node.mData.keyFrameCA);
                AddBaseKF(node.mData.keyFrameCA, baseCol);
                const attach = slotAttachMap.get(slotKey);
                const idx = this.mMesh.texture.indexOf(this.mPath + attach + ".png");
                const baseTex = new CVec4(idx, -1, -1, -1);
                AddStartKF(node.mData.keyFrameTex, baseTex);
                AddEndKF(node.mData.keyFrameTex);
                AddBaseKF(node.mData.keyFrameTex, baseTex);
            }
        }
        let constraintList = new Array();
        if (this.mJSON.Get("ik")) {
            let iks = this.mJSON.Get("ik").GetDocument();
            for (let ikObj of iks) {
                ikObj.type = "ik";
                constraintList.push(ikObj);
            }
        }
        if (this.mJSON.Get("transform")) {
            let transforms = this.mJSON.Get("transform").GetDocument();
            for (let transformObj of transforms) {
                transformObj.type = "transform";
                constraintList.push(transformObj);
            }
        }
        if (this.mJSON.Get("path")) {
            let transforms = this.mJSON.Get("path").GetDocument();
            for (let transformObj of transforms) {
                transformObj.type = "path";
                constraintList.push(transformObj);
            }
        }
        constraintList.sort((a, b) => {
            const aOrder = a.order ?? 0;
            const bOrder = b.order ?? 0;
            if (aOrder > bOrder)
                return 1;
            if (aOrder == bOrder)
                return 0;
            if (aOrder < bOrder)
                return -1;
        });
        for (let constraint of constraintList) {
            if (constraint.type == "ik") {
                if (constraint.target == null || constraint.bones.length == 0) {
                    continue;
                }
                let tip = constraint.bones[constraint.bones.length - 1];
                const tipBoneObj = bones.GetDocument().find(bone => bone.name == tip);
                const length = tipBoneObj.length ? tipBoneObj.length : 0;
                const info = new CMeshIK();
                info.target = constraint.target;
                info.bones = constraint.bones;
                if (constraint.mix != null)
                    info.mix = constraint.mix;
                if (length > 0) {
                    const tipBone = this.mMesh.meshTree.Find(tip);
                    const ikBoneKey = tip + "_ik";
                    info.bones.push(ikBoneKey);
                    const newTipBone = tipBone.PushChild(ikBoneKey);
                    newTipBone.mData = new CMeshDataNode();
                    newTipBone.mData.pos = new CVec3(length, 0, 0);
                    if (constraint.bendPositive != null) {
                        const poleBoneKey = tip + "_pole";
                        info.pole = poleBoneKey;
                        const poleBone = tipBone.PushChild(poleBoneKey);
                        poleBone.mData = new CMeshDataNode();
                        poleBone.mData.pos = new CVec3(0, constraint.bendPositive ? -100 : 100, 0);
                    }
                }
                this.mMesh.ik.set(constraint.name, info);
            }
            else if (constraint.type == "transform") {
                if (constraint.target == null || constraint.bones.length == 0) {
                    continue;
                }
                const info = new CMeshAttacher();
                info.target = constraint.target;
                info.bones = constraint.bones;
                if (constraint.rotation != null)
                    info.offsetRot = CMath.EulerToQut(new CVec3(0, 0, CMath.DegreeToRadian(constraint.rotation)));
                if (constraint.x != null)
                    info.offsetPos.x = constraint.x;
                if (constraint.y != null)
                    info.offsetPos.y = constraint.y;
                if (constraint.scaleX != null)
                    info.offsetSca.x = constraint.scaleX;
                if (constraint.scaleY != null)
                    info.offsetSca.y = constraint.scaleY;
                if (constraint.rotateMix != null)
                    info.mixRot = constraint.rotateMix;
                if (constraint.translateMix != null)
                    info.mixPos = constraint.translateMix;
                if (constraint.scaleMix != null)
                    info.mixSca = constraint.scaleMix;
                if (constraint.name == "front-foot-board-transform") {
                    info.mixPos = 1;
                }
                if (constraint.name == "rear-foot-board-transform") {
                    info.mixPos = 1;
                }
                this.mMesh.attacher.set(constraint.name, info);
            }
            else if (constraint.type == "path") {
            }
        }
        CUtilRender.MeshBoundUpdate(this.mMesh);
        let name = pa_fileName.substring(0, pa_fileName.length - 5);
        let atlBuf = await CFile.Load(name + ".atlas");
        if (atlBuf != null) {
            let texBuf = await CFile.Load(name + ".png");
            const regions = parseAtlas(CUtil.ArrayToString(atlBuf));
            const { pixels: src, width: srcW, height: srcH } = await decodePNGToRGBA(texBuf);
            for (const r of regions) {
                const srcRectW = r.rotate ? r.h : r.w;
                const srcRectH = r.rotate ? r.w : r.h;
                const sx = Math.max(0, Math.min(srcW, r.x));
                const sy = Math.max(0, Math.min(srcH, r.y));
                const clampW = Math.max(0, Math.min(srcRectW, srcW - sx));
                const clampH = Math.max(0, Math.min(srcRectH, srcH - sy));
                const dstW = r.w, dstH = r.h;
                const dst = new Uint8Array(dstW * dstH * 4);
                if (!r.rotate) {
                    blitRGBA(dst, dstW, src, srcW, sx, sy, clampW, clampH);
                }
                else {
                    blitRotateCWtoUpright(dst, dstW, dstH, src, srcW, sx, sy, clampW, clampH);
                }
                unpremultiplyInPlace(dst);
                alphaBleedRGB(dst, dstW, dstH, 3, 16);
                const dataURL = await rgbaToPngDataURL(dst, dstW, dstH);
                for (let i = 0; i < this.mMesh.texture.length; ++i) {
                    if (this.mMesh.texture[i].indexOf(r.name) != -1) {
                        this.mMesh.texture[i] = dataURL;
                        break;
                    }
                }
            }
        }
    }
}
function parseAtlas(atlas) {
    const lines = atlas.split(/\r?\n/).map(s => s.trimEnd());
    const regs = [];
    let i = 0;
    const isEmpty = (s) => !s || s.trim() === "";
    const nums = (v) => v.split(",").map(s => parseInt(s.trim(), 10));
    const kv = (s) => {
        const p = s.indexOf(":");
        return p < 0 ? null : [s.slice(0, p).trim().toLowerCase(), s.slice(p + 1).trim()];
    };
    const nextNonEmpty = (from) => {
        let j = from;
        while (j < lines.length && isEmpty(lines[j]))
            j++;
        return j;
    };
    const pageKeys = new Set(["size", "format", "filter", "repeat"]);
    while (i < lines.length) {
        i = nextNonEmpty(i);
        if (i >= lines.length)
            break;
        const line = lines[i];
        if (!line.includes(":")) {
            const j = nextNonEmpty(i + 1);
            const isPageHeader = (j < lines.length &&
                lines[j].includes(":") &&
                (() => { const kvp = kv(lines[j]); return !!kvp && pageKeys.has(kvp[0]); })());
            if (isPageHeader) {
                i = j + 1;
                while (i < lines.length && !isEmpty(lines[i]) && lines[i].includes(":"))
                    i++;
                continue;
            }
            const regionName = line;
            i++;
            let rotate = false;
            let x = 0, y = 0, w = 0, h = 0, origW = 0, origH = 0, offX = 0, offY = 0;
            let index = undefined;
            while (i < lines.length) {
                const s = lines[i];
                if (isEmpty(s)) {
                    i++;
                    break;
                }
                if (!s.includes(":"))
                    break;
                const pair = kv(s);
                if (!pair)
                    break;
                const [k, v] = pair;
                if (k === "rotate")
                    rotate = v.toLowerCase() === "true";
                else if (k === "xy")
                    [x, y] = nums(v);
                else if (k === "size")
                    [w, h] = nums(v);
                else if (k === "orig" || k === "original size")
                    [origW, origH] = nums(v);
                else if (k === "offset")
                    [offX, offY] = nums(v);
                else if (k === "index")
                    index = parseInt(v, 10);
                i++;
            }
            regs.push({ name: regionName, rotate, x, y, w, h, origW, origH, offX, offY, index });
            continue;
        }
        i++;
    }
    return regs;
}
function blitRGBA(dst, dstW, src, srcW, sx, sy, w, h) {
    const BPP = 4;
    for (let row = 0; row < h; row++) {
        const sOff = ((sy + row) * srcW + sx) * BPP;
        const dOff = (row * dstW) * BPP;
        dst.set(src.subarray(sOff, sOff + w * BPP), dOff);
    }
}
function blitRotateCWtoUpright(dst, dstW, dstH, src, srcW, sx, sy, wRot, hRot) {
    const BPP = 4;
    const maxX = sx + wRot - 1;
    const maxY = sy + hRot - 1;
    for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
            let sxPix = sx + y;
            let syPix = sy + (hRot - 1 - x);
            if (sxPix < sx)
                sxPix = sx;
            else if (sxPix > maxX)
                sxPix = maxX;
            if (syPix < sy)
                syPix = sy;
            else if (syPix > maxY)
                syPix = maxY;
            const sIdx = (syPix * srcW + sxPix) * BPP;
            const dIdx = (y * dstW + x) * BPP;
            dst[dIdx] = src[sIdx];
            dst[dIdx + 1] = src[sIdx + 1];
            dst[dIdx + 2] = src[sIdx + 2];
            dst[dIdx + 3] = src[sIdx + 3];
        }
    }
}
async function rgbaToPngDataURL(rgba, w, h) {
    const clamped = new Uint8ClampedArray(rgba);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "copy";
    ctx.fillStyle = '#FF0000';
    const imgData = new ImageData(clamped, w, h);
    ctx.putImageData(imgData, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const ab = await blob.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let bin = "";
    for (let i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return `base64:${b64}`;
}
async function decodePNGToRGBA(ab) {
    const blob = new Blob([ab], { type: "image/png" });
    const img = await createImageBitmap(blob, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
    });
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
    return { pixels: new Uint8Array(data.buffer.slice(0)), width, height };
}
function alphaBleedRGB(dst, w, h, iters = 2, aThresh = 1) {
    const BPP = 4;
    const tmp = new Uint8Array(dst.length);
    for (let t = 0; t < iters; t++) {
        tmp.set(dst);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * BPP;
                if (tmp[i + 3] > aThresh)
                    continue;
                let bestA = -1, r = 0, g = 0, b = 0;
                for (let dy = -1; dy <= 1; dy++)
                    for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h)
                            continue;
                        const j = (ny * w + nx) * BPP, na = tmp[j + 3];
                        if (na > bestA) {
                            bestA = na;
                            r = tmp[j];
                            g = tmp[j + 1];
                            b = tmp[j + 2];
                        }
                    }
                if (bestA >= 0) {
                    dst[i] = r;
                    dst[i + 1] = g;
                    dst[i + 2] = b;
                }
            }
        }
    }
}
function unpremultiplyInPlace(rgba) {
    for (let i = 0; i < rgba.length; i += 4) {
        const a = rgba[i + 3];
        if (a > 0) {
            rgba[i + 0] = Math.min(255, (rgba[i + 0] * 255 + (a >> 1)) / a | 0);
            rgba[i + 1] = Math.min(255, (rgba[i + 1] * 255 + (a >> 1)) / a | 0);
            rgba[i + 2] = Math.min(255, (rgba[i + 2] * 255 + (a >> 1)) / a | 0);
        }
    }
}
