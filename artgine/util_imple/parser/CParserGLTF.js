import { CWASM as __cwasmDecode__ } from "../../basic/CWASM.js";
let WebIO = null;
let simplify = null;
let weld = null;
let Document = null;
let Texture = null;
let Node = null;
let Skin = null;
let Accessor = null;
let Root = null;
let Mesh = null;
let Animation = null;
let AnimationChannel = null;
let AnimationSampler = null;
let Primitive = null;
let MeshoptEncoder = null;
let MeshoptSimplifier = null;
let Material = null;
import { CAlert } from "../../basic/CAlert.js";
import { CJSON } from "../../basic/CJSON.js";
import { CUtil } from "../../basic/CUtil.js";
import { CMat } from "../../geometry/CMat.js";
import { CMath } from "../../geometry/CMath.js";
import { CVec3 } from "../../geometry/CVec3.js";
import { CVec4 } from "../../geometry/CVec4.js";
import { CMeshAniInfo, CMeshSkin } from "../../render/CMesh.js";
import { CMeshBuf, CMeshCreateInfo } from "../../render/CMeshCreateInfo.js";
import { CMeshDataNode, CKeyFrame } from "../../render/CMeshDataNode.js";
import { CVertexFormat } from "../../render/CShader.js";
import { CUtilRender } from "../../render/CUtilRender.js";
import { CFile } from "../../system/CFile.js";
import CParserGLTF from "../../util/parser/CParserGLTF.js";
export async function SimplifyGLTF(_doc, _ratio = 50, _error = 10) {
    const ratioFloat = Math.max(0, Math.min(1, _ratio / 100));
    const errorFloat = Math.max(0, Math.min(1, _error / 100));
    return await _doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: ratioFloat, error: errorFloat, lockBorder: true }));
}
class VertexStream {
    m_attributes = [];
    m_u8;
    m_u32;
    constructor(_ci, _vertexCount) {
        let byteStride = 0;
        for (const meshBuf of _ci.vertex) {
            byteStride += this.InitAttribute(meshBuf, _vertexCount);
        }
        this.m_u8 = new Uint8Array(byteStride);
        this.m_u32 = new Uint32Array(this.m_u8.buffer);
    }
    InitAttribute(_buf, _vertexCount) {
        const array = _buf.bufF.GetArray();
        const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        const byteStride = Math.floor(_buf.bufF.Size(1) / _vertexCount) * array.BYTES_PER_ELEMENT;
        const paddedByteStride = Math.ceil(byteStride / 4) * 4;
        this.m_attributes.push({
            u8,
            byteStride,
            paddedByteStride
        });
        return paddedByteStride;
    }
    Hash(_index) {
        let byteOffset = 0;
        for (const { u8, byteStride, paddedByteStride } of this.m_attributes) {
            for (let i = 0; i < paddedByteStride; i++) {
                if (i < byteStride) {
                    this.m_u8[byteOffset + i] = u8[_index * byteStride + i];
                }
                else {
                    this.m_u8[byteOffset + i] = 0;
                }
            }
            byteOffset += paddedByteStride;
        }
        return murmurHash2(0, this.m_u32);
    }
    Equal(_a2, _b) {
        for (const { u8, byteStride } of this.m_attributes) {
            for (let j = 0; j < byteStride; j++) {
                if (u8[_a2 * byteStride + j] !== u8[_b * byteStride + j]) {
                    return false;
                }
            }
        }
        return true;
    }
}
function murmurHash2(h, key) {
    const m = 1540483477;
    const r2 = 24;
    for (let i = 0, il = key.length; i < il; i++) {
        let k = key[i];
        k = Math.imul(k, m) >>> 0;
        k = (k ^ k >> r2) >>> 0;
        k = Math.imul(k, m) >>> 0;
        h = Math.imul(h, m) >>> 0;
        h = (h ^ k) >>> 0;
    }
    return h;
}
function HashLookup(_table, _tableSize, _stream, _key, _empty) {
    const hashMod = _tableSize - 1;
    const hashVal = _stream.Hash(_key);
    let bucket = hashVal & hashMod;
    for (let probe = 0; probe <= hashMod; probe++) {
        const item = _table[bucket];
        if (item == _empty || _stream.Equal(item, _key)) {
            return bucket;
        }
        bucket = bucket + probe + 1 & hashMod;
    }
    throw new Error("Hash table full");
}
function CompactPrimitive(_ci, _remap, _dstVertexCount, _vertexCount) {
    const srcIndicesArray = _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0].bufI;
    const srcIndicesCount = _ci.indexCount;
    const dstIndicesArray = new Array(srcIndicesCount).fill(0);
    const dstIndicesCount = srcIndicesCount;
    for (let i = 0; i < dstIndicesCount; i++) {
        dstIndicesArray[i] = _remap[srcIndicesArray ? srcIndicesArray[i] : i];
    }
    _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0].bufI = dstIndicesArray;
    _ci.indexCount = dstIndicesCount;
    for (const meshBuf of _ci.vertex) {
        let elementSize = Math.floor(meshBuf.bufF.Size(1) / _vertexCount);
        let dstBufF = new Float32Array(_dstVertexCount * elementSize);
        let dstDone = new Uint8Array(_dstVertexCount).fill(0);
        for (let i = 0; i < srcIndicesCount; i++) {
            const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
            const dstIndex = _remap[srcIndex];
            if (dstDone[dstIndex])
                continue;
            for (let j = 0; j < elementSize; j++) {
                dstBufF[dstIndex * elementSize + j] = meshBuf.bufF.GetArray()[srcIndex * elementSize + j];
            }
            dstDone[dstIndex] = 1;
        }
        meshBuf.bufF.Resize(_dstVertexCount * elementSize);
        meshBuf.bufF.SetArray(dstBufF);
    }
    _ci.vertexCount = _dstVertexCount;
}
var EMPTY_U32$1 = 2 ** 32 - 1;
export async function SimplifyCMesh(_name, _ci, _ratio = 50, _error = 20) {
    const srcVertexArray = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0].bufF.GetArray();
    const srcVertexCount = _ci.vertexCount;
    const srcIndicesArray = _ci.GetVFType(CVertexFormat.eIdentifier.Index)[0].bufI;
    const srcIndicesCount = _ci.indexCount;
    const stream = new VertexStream(_ci, srcVertexCount);
    const tableSize = Math.pow(2, Math.ceil(Math.log(srcVertexCount + srcVertexCount / 4) / Math.LN2));
    const table = new Uint32Array(tableSize).fill(EMPTY_U32$1);
    const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY_U32$1);
    let dstVertexCount = 0;
    for (let i = 0; i < srcIndicesCount; i++) {
        const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
        if (writeMap[srcIndex] != EMPTY_U32$1)
            continue;
        const hashIndex = HashLookup(table, tableSize, stream, srcIndex, EMPTY_U32$1);
        const dstIndex = table[hashIndex];
        if (dstIndex == EMPTY_U32$1) {
            table[hashIndex] = srcIndex;
            writeMap[srcIndex] = dstVertexCount++;
        }
        else {
            writeMap[srcIndex] = writeMap[dstIndex];
        }
    }
    CompactPrimitive(_ci, writeMap, dstVertexCount, srcVertexCount);
    await MeshoptEncoder.ready;
    await MeshoptSimplifier.ready;
    const ratioFloat = Math.max(0, Math.min(1, _ratio / 100));
    const errorFloat = Math.max(0, Math.min(1, _error / 100));
    const positionAttr = _ci.GetVFType(CVertexFormat.eIdentifier.Position)[0];
    const vertexCount = positionAttr.bufF.Size(1);
    const vertices = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
        vertices[i] = positionAttr.bufF.GetArray()[i];
    }
    let indexes;
    if (_ci.indexCount === 0) {
        indexes = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++)
            indexes[i] = i;
    }
    else {
        const count = _ci.indexCount - (_ci.indexCount % 3);
        indexes = new Uint32Array(count);
        for (let i = 0; i < count; i++)
            indexes[i] = srcIndicesArray[i];
    }
    const targetCount = Math.floor(ratioFloat * indexes.length / 3) * 3;
    const [newIndexes, _] = await MeshoptSimplifier.simplify(indexes, vertices, 3, targetCount, errorFloat, []);
    const used = new Uint8Array(vertexCount);
    for (let i = 0; i < newIndexes.length; i++) {
        used[newIndexes[i]] = 1;
    }
    const remapTable = new Int32Array(vertexCount).fill(-1);
    let newVertexCount = 0;
    for (let i = 0; i < vertexCount; i++) {
        if (used[i])
            remapTable[i] = newVertexCount++;
    }
    srcIndicesArray.length = 0;
    for (let i = 0; i < newIndexes.length; i++) {
        srcIndicesArray.push(remapTable[newIndexes[i]]);
    }
    _ci.indexCount = newIndexes.length;
    for (let v of _ci.vertex) {
        const bufF = v.bufF.GetArray();
        const stride = Math.floor(v.bufF.Size(1) / _ci.vertexCount);
        const newBuf = new CMeshBuf(v.vfType);
        for (let i = 0; i < vertexCount; i++) {
            const mappedIdx = remapTable[i];
            if (mappedIdx === -1)
                continue;
            for (let j = 0; j < stride; j++) {
                newBuf.bufF.Push(bufF[i * stride + j]);
            }
        }
        v.bufF = newBuf.bufF;
    }
    _ci.vertexCount = newVertexCount;
    return _ci;
}
function ReadGLBHeader(glbBuffer, offset, count) {
    const view = new DataView(glbBuffer);
    const result = [];
    for (let i = 0; i < count; i++) {
        const value = view.getUint32(offset + i * 4, true);
        result.push(value);
    }
    return result;
}
function ParseGlbVersion1(buffer, header, resources) {
    const contentLength = header[3];
    const contentFormat = header[4];
    if (contentFormat !== 0) {
        CAlert.E("GLB json dif!");
    }
    const headerLength = 20;
    const binaryStart = headerLength + contentLength;
    const contentString = CUtil.ArrayToString(buffer).slice(headerLength, binaryStart);
    const gltf = new CJSON(contentString);
    const binaryBuffer = buffer.slice(binaryStart);
    const bufferArr = gltf.GetDocument()["buffers"];
    for (let i = 0; i < bufferArr.length; i++) {
        if (bufferArr[i]["uri"] == null) {
            const fakeUri = `__glb_bin_${i}__`;
            bufferArr[i]["uri"] = fakeUri;
            resources[fakeUri] = new Uint8Array(binaryBuffer);
        }
    }
    return gltf;
}
function ParseGlbVersion2(buffer, header, resources) {
    const totalLength = header[2];
    let byteOffset = 12;
    let gltf;
    let binaryBuffer;
    while (byteOffset < totalLength) {
        const chunkHeader = ReadGLBHeader(buffer, byteOffset, 2);
        const chunkLength = chunkHeader[0];
        const chunkType = chunkHeader[1];
        byteOffset += 8;
        const chunkData = buffer.slice(byteOffset, byteOffset + chunkLength);
        byteOffset += chunkLength;
        const JSON_CHUNK_TYPE = 0x4e4f534a;
        const BIN_CHUNK_TYPE = 0x004e4942;
        if (chunkType === JSON_CHUNK_TYPE) {
            const jsonString = CUtil.ArrayToString(chunkData);
            gltf = new CJSON(jsonString);
        }
        else if (chunkType === BIN_CHUNK_TYPE) {
            binaryBuffer = chunkData;
        }
    }
    if (!gltf) {
        CAlert.E("GLB JSON chunk Find err");
        throw new Error("Invalid GLB: Missing JSON chunk");
    }
    const buffers = gltf.GetDocument()["buffers"];
    for (let i = 0; i < buffers.length; i++) {
        if (buffers[i]["uri"] == null && binaryBuffer) {
            const fakeUri = `__glb_bin_${i}__`;
            buffers[i]["uri"] = fakeUri;
            resources[fakeUri] = new Uint8Array(binaryBuffer);
        }
    }
    return gltf;
}
function ParseGLB(buffer, resources) {
    const header = ReadGLBHeader(buffer, 0, 5);
    const version = header[1];
    if (version !== 1 && version !== 2) {
        CAlert.E(`not support GLB version : ${version}`);
        return null;
    }
    if (version === 1) {
        return ParseGlbVersion1(buffer, header, resources);
    }
    return ParseGlbVersion2(buffer, header, resources);
}
function InchToMeter(meter) {
    const INCH2Meter = 39.37007874015748;
    if (meter instanceof CVec3) {
        meter.x *= INCH2Meter;
        meter.y *= INCH2Meter;
        meter.z *= INCH2Meter;
        return meter;
    }
    else if (meter instanceof CVec4) {
        meter.x *= INCH2Meter;
        meter.y *= INCH2Meter;
        meter.z *= INCH2Meter;
        return;
    }
    else if (meter instanceof CMat) {
        meter.mF32A[12] *= INCH2Meter;
        meter.mF32A[13] *= INCH2Meter;
        meter.mF32A[14] *= INCH2Meter;
        return meter;
    }
    return meter * INCH2Meter;
}
function GetVertexAttributeType(typeStr) {
    const mappings = [
        { prefix: "POSITION", type: CVertexFormat.eIdentifier.Position, hasIndex: false },
        { prefix: "NORMAL", type: CVertexFormat.eIdentifier.Normal, hasIndex: false },
        { prefix: "TANGENT", type: CVertexFormat.eIdentifier.Tangent, hasIndex: false },
        { prefix: "TEXCOORD_", type: CVertexFormat.eIdentifier.UV, hasIndex: true },
        { prefix: "COLOR_", type: CVertexFormat.eIdentifier.Color, hasIndex: true },
        { prefix: "JOINTS_", type: CVertexFormat.eIdentifier.WeightIndex, hasIndex: true },
        { prefix: "WEIGHTS_", type: CVertexFormat.eIdentifier.Weight, hasIndex: true },
    ];
    for (const { prefix, type, hasIndex } of mappings) {
        if (typeStr.startsWith(prefix)) {
            const index = hasIndex ? Number(typeStr.substring(prefix.length)) : 0;
            return { type, index };
        }
    }
    return { type: CVertexFormat.eIdentifier.Null, index: 0 };
}
function BuildAvgColorRgba(_mesh, _colorVertex) {
    let avgCol = new CVec4();
    for (let i = 0; i < _colorVertex.bufF.Size(3); i++) {
        avgCol.x += _colorVertex.bufF.GetArray()[i * 3 + 0];
        avgCol.y += _colorVertex.bufF.GetArray()[i * 3 + 1];
        avgCol.z += _colorVertex.bufF.GetArray()[i * 3 + 2];
        avgCol.w += _colorVertex.bufF.GetArray()[i * 3 + 3];
    }
    avgCol = CMath.V4MulFloat(avgCol, 1.0 / _colorVertex.bufF.Size(3));
    _mesh.texture.push("rgba(" + (avgCol.x * 255) + "," + (avgCol.y * 255) + "," + (avgCol.z * 255) + "," + avgCol.w + ").rgba");
    return _mesh.texture.length - 1;
}
export default function CParserGLTF_imple() {
    CParserGLTF.prototype["Load"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",0));
    CParserGLTF.prototype["CreateMesh"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",3552));
    CParserGLTF.prototype["CreateMeshDataNode"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",7974));
    CParserGLTF.prototype["ParseCJSON"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",25776));
}
