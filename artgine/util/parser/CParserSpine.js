import { CJSON } from "../../basic/CJSON.js";
import { CString } from "../../basic/CString.js";
import { CUtil } from "../../basic/CUtil.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec2 } from "../../geometry/CVec2.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CMesh, CMeshAniInfo, CMeshSkin } from "../../render/CMesh.js";
import { CMeshCreateInfo } from "../../render/CMeshCreateInfo.js";
import { CKeyFrame, CMeshDataNode } from "../../render/CMeshDataNode.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CParser } from "./CParser.js";
export default class CParserSpine extends CParser {
    m_json;
    m_mesh;
    m_path;
    GetResult() {
        return this.m_mesh;
    }
    async Load(pa_fileName) {
        if (pa_fileName.indexOf("/") == -1)
            this.m_path = "";
        else
            this.m_path = pa_fileName.substr(0, pa_fileName.lastIndexOf("/")) + "/";
        if (await this.Open(pa_fileName))
            return;
        this.m_json = new CJSON(CUtil.ArrayToString(this.mBuffer.slice().buffer));
        let imgpath = this.m_json.Get("skeleton").GetStr("images");
        this.m_path += CString.ReplaceAll(imgpath, "\\", "/");
        if (!this.m_path.endsWith("/")) {
            this.m_path += "/";
        }
        this.m_mesh = new CMesh();
        this.m_mesh.meshTree.mData = new CMeshDataNode();
        let boneList = new Array();
        let bones = this.m_json.Get("bones");
        for (let bone of bones.GetDocument()) {
            let node = this.m_mesh.meshTree.Find(bone.parent);
            if (node == null)
                node = this.m_mesh.meshTree;
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
        let slots = this.m_json.Get("slots");
        for (let slot of slots.GetDocument()) {
            let node = this.m_mesh.meshTree.PushChild(slot.name + "_slot");
            node.mData = new CMeshDataNode();
            node.mData.pos.z = zIndex;
            zIndex += 1;
            slotMap.set(slot.name + "_slot", slot.bone);
        }
        const MeshSkin = (_key) => {
            for (let i = 0; i < this.m_mesh.skin.length; ++i) {
                if (this.m_mesh.skin[i].key == _key)
                    return { meshskin: this.m_mesh.skin[i], offset: i };
            }
            let m = new CMeshSkin();
            m.key = _key;
            this.m_mesh.skin.push(m);
            return { meshskin: m, offset: this.m_mesh.skin.length - 1 };
        };
        let skins = this.m_json.Get("skins").GetDocument();
        let attachments = skins[0].attachments;
        for (let attKey in attachments) {
            let slotKey = attKey + "_slot";
            let att = attachments[attKey];
            let node = this.m_mesh.meshTree.Find(slotKey);
            for (let texKey in att) {
                let texData = att[texKey];
                this.m_mesh.texture.push(this.m_path + texKey + ".png");
                node.mData.textureOff.push(this.m_mesh.texture.length - 1);
                node.mData.ci = new CMeshCreateInfo();
                let nor = new CVec3(0, 0, 1);
                let posb = node.mData.ci.Create(CVertexFormat.eIdentifier.Position);
                let uvb = node.mData.ci.Create(CVertexFormat.eIdentifier.UV);
                let norb = node.mData.ci.Create(CVertexFormat.eIdentifier.Normal);
                let web = node.mData.ci.Create(CVertexFormat.eIdentifier.Weight);
                let wib = node.mData.ci.Create(CVertexFormat.eIdentifier.WeightIndex);
                let size = new CVec2(texData.width, texData.height);
                if (texData.type == null) {
                    let pos = new CVec3();
                    if (texData.x != null)
                        pos.x = texData.x;
                    if (texData.y != null)
                        pos.y = texData.y;
                    let sca = new CVec3(1, 1, 1);
                    if (texData.scaleX != null)
                        sca.x = texData.scaleX;
                    if (texData.scaleY != null)
                        sca.y = texData.scaleY;
                    let rot = new CVec3(0, 0, 0);
                    if (texData.rotation != null)
                        rot.z = CMath.DegreeToRadian(texData.rotation);
                    let rotMat = CMath.QutToMat(CMath.EulerToQut(new CVec3(0, 0, rot.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(-size.x * 0.5 * sca.x, -size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    posb.bufF.Push(CMath.V3AddV3(CMath.V3MulMatCoordi(new CVec3(size.x * 0.5 * sca.x, size.y * 0.5 * sca.y), rotMat), new CVec3(pos.x, pos.y, node.mData.pos.z)));
                    uvb.bufF.Push(new CVec2(0, 0));
                    uvb.bufF.Push(new CVec2(1, 0));
                    uvb.bufF.Push(new CVec2(1, 1));
                    uvb.bufF.Push(new CVec2(0, 1));
                    uvb.bufF.Push(new CVec2(0, 0));
                    uvb.bufF.Push(new CVec2(1, 1));
                    let meshskin = MeshSkin(slotMap.get(slotKey));
                    this.m_mesh.meshTree.Find(slotMap.get(slotKey)).mData.skinKey.push(meshskin.meshskin.key);
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
                        this.m_mesh.meshTree.Find(slotMap.get(slotKey)).mData.skinKey.push(meshskin.meshskin.key);
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
                                this.m_mesh.meshTree.Find(selectBone).mData.skinKey.push(meshskin.meshskin.key);
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
        let animations = this.m_json.Get("animations").GetDocument();
        for (let aniKey in animations) {
            let stTime = endTime;
            for (let boneKey in animations[aniKey].bones) {
                let node = this.m_mesh.meshTree.Find(boneKey);
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
            for (let boneKey in animations[aniKey].bones) {
                let node = this.m_mesh.meshTree.Find(boneKey);
                let ResetChk = (_kfList, _basic) => {
                    let off = _kfList.length;
                    for (let i = 0; i < _kfList.length; ++i) {
                        if (_kfList[i].key == stTime)
                            return;
                        if (_kfList[i].key > stTime) {
                            off = i;
                            break;
                        }
                    }
                    {
                        let kf = new CKeyFrame();
                        kf.key = stTime;
                        kf.value.x = _basic.x;
                        kf.value.y = _basic.y;
                        kf.value.z = _basic.z;
                        if (_basic instanceof CVec4) {
                            kf.value.w = _basic.w;
                        }
                        _kfList.splice(off, 0, kf);
                    }
                };
                let MatTimeChk = (_kfList, _basic) => {
                    if (_kfList.length != 0) {
                        if (endTime != _kfList[_kfList.length - 1].key) {
                            let kf = _kfList[_kfList.length - 1].Export();
                            kf.key = endTime;
                            _kfList.push(kf);
                        }
                        {
                            let kf = new CKeyFrame();
                            kf.key = endTime + 100;
                            kf.value.x = _basic.x;
                            kf.value.y = _basic.y;
                            kf.value.z = _basic.z;
                            if (_basic instanceof CVec4) {
                                kf.value.w = _basic.w;
                            }
                            _kfList.push(kf);
                        }
                        {
                            let kf = new CKeyFrame();
                            kf.key = endTime + 900;
                            kf.value.x = _basic.x;
                            kf.value.y = _basic.y;
                            kf.value.z = _basic.z;
                            if (_basic instanceof CVec4) {
                                kf.value.w = _basic.w;
                            }
                            _kfList.push(kf);
                        }
                    }
                };
                ResetChk(node.mData.keyFramePos, node.mData.pos);
                ResetChk(node.mData.keyFrameRot, node.mData.rot);
                ResetChk(node.mData.keyFrameSca, node.mData.sca);
                MatTimeChk(node.mData.keyFramePos, node.mData.pos);
                MatTimeChk(node.mData.keyFrameRot, node.mData.rot);
                MatTimeChk(node.mData.keyFrameSca, node.mData.sca);
            }
            let aniInfo = new CMeshAniInfo();
            aniInfo.start = stTime;
            aniInfo.end = endTime;
            this.m_mesh.aniMap.set(aniKey, aniInfo);
            endTime += 1000;
        }
    }
}
