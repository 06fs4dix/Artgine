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
    CParserGLTF.prototype["Load"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","BUVj23B5VfVxVG2qBIVQVX2JVwBbtMBOtaVdttBY2v2AVeVftu2OVRBXtr2NByBBBc2VB62XVM29VXVkVqBHVStaty232jt1tUtPBVVyVlKtBGBYVSVPtpButIVmtUt1BGBPB820VG2rVKVp2FB3VJtq25t9232k29VnVAB7BKtC2iBjVXt8V3tDB8tMtPVa2ftXVzBh2YK22kB02N29BXtZtW202vVItZVUBu28BCViB4VS2HBStq29tHtE2NtpVCte27Ba2mtn2r2N2y2ttcVD23tVVQ2RBT2AVutptktZ2gB82WVX2nV3ttVgVE2L2Rt12F2dVLVZBaB8tw2GBhV22ItNBl2mBrVIt4tRBptl2CVK2f2EBjtOBxVp2PtZ2GVXVfV2V5VQB3BmBQBN2hBKVgBg2RVyB6VTtZtc23BxBft2tM21202ItytmBPtJVOVo2nBvBItPtNtqV3KBVIBStGtYtBBrVkBctoBXt924VM2EBLB0BzVmVJBptxKV2M2q2kVMt4BC2W2ftEtcVVBTtDBuBR2qtrV1BiVGVy2d2vtU2zBoBtBF2JBCVUtG2WtrB4BV2eVR2h2fBjB5tMVXtF2WBltM2DBUBGKJBx27BBKhKK2mB0tyt4VVtMB0tk2HVZVBBftk22Vu2StGtLtkVDV6BRVstytlVytOBBtD2g23VOVjBwVDVstm2hVEVy2PV52HBdt9tItBB22YVX2t2BBOVGBVBmVIB1VXVMt12tV5tH2j2CVlB5tbBWBXVOtUBEBCt9B8tMtfBctzBmt8t5Bz2b2uKV2ztPVrBhVu2EBRVN2K2lBlta2U2l2sButxVrtItAVNVhVGtP26VU2U2ItfKJVhBLVbtAtHBTVnVRtv2PBctzBitwBVtEBDBbVk2XBGBctMVg2LB62AB82lVtV4Vs2dBctp2P2JBmBCBbVUBAVuB3BCB5BitmBu22t7tF2wVX2dVlK2teVj2LBQBNVSVttOVIBxV5Vqtk2UB9B4VS2NVDKt2G2FtFBTBytFVtViBGtZtP2SB3tt2P2HVotOtfBW2RtQte2uBhttVKVl2WtsVdBlBx2ttLBh2XB9tR2AtdtUtKVytftpVzVo232lBKt0t4VJBIB2BEBcB42GVKVG2zt2VOtH2BtIBsVyVqBQVuVsV2VjtH20tR2gBN2X2T2sBEKtV0BNVg2UBKBEVxVgt7BEVrtfVlVr2JBPtDBG26BABJBsVDVi2BtgV3taVgVHBZtSV4VKBYBiV127tGB32bVWVmBd2xtHKV2OV8VwtuV72R2WV2Vh2J2N2x232fBxtXBetMBLBWtEV82bKTBVtoVb2AVXBOBMBV23BKVLV9VCKJt1VEBZ2wButKB7VftptpBktvtgtKtL2J2CVctH2hBbtQBD2JB2tY2BBpBAtOBz2G2hV32CBwVXt8BUKB2wB2VQt7VUtAt62lto2FtAB2tX2WVlBTVftQtMV2BqBsBdBkVMB4Ba2jtYtE2SBnB9VY2LVbBEtxBn2UtBt22TtttmVZ282TtA2EVlVI2u2iV4BiVytnVKVhVlBZVqKB2ABKtxBhtQKKKT2u2I2X2atutOVOBW24VEBTBq2a2GVyBT2OVkBJBqtXt9t42Gt5t1tgVNtn2aVHVXVD2k2fBXtf2ytLBgVrBj2B23tcB42Z2K2gBfBWByVv2ht8BM2J2ftPB8Vi2w2FVMt4BvVvVC24VoBh2AtX2jtN2PVL2fBk2sV3VjVj2YV8B12ltMBGBq2cBBt9Vtt02YV3t0ByV7BAtqV4Bb2nBI2yVg2SBsByKhtzt1VMV4ByBvtP2J2FVD2x2RVyBR2NVvt8t2tM2jB0KKV62ZBf2dtw2WV0tFtGVH2P2JBqBYtZt9BDBG2KBwtEVpVMVSV1tp2sBKtBtdtJtut32dVBVBB0Bb26BH26BTV6BoBXBw27VStFVJt1BUVf2822BGVi2kBkV7BvBuV3tPBRB6tN2dVL2kVRBkBc2H2Ttn2pVjBmKJ2vB1VotbByVwBHBqVVBBVT2IVf2M2kVS2TtZVgtcV7BVBM2rVWVS2G2sVG2EBoBwV6VvB62vViVvV6BjB82YBltrBS2mVF2028BYtytAtitUVNVNBLVEBkK2VWtNtCtPtbB9VN202Ntx2f2vtsBRtrBABFV1tHBEV0tD2Q2FVIVbBztDB12B2dVAtetItS2CBf24tWtXtA2qBT27tctTVyBQtjtQ2otEV8tiVGVntIVEBNBjtEBVB52JBrV4BoVH2z2iVPB5tYBWBgBwV2t02KtlV02n2Dt9B82Etwte27te2ntrtyBVtCtX2hVmVktJ2Kt5to2gVCt5tzVjtN26VVVMB5tFtYV1Vk2UBQBBV4VEBsVC2ZVMKtBntbBoBOBSV5BiVIV9V9KVBTBuBqV62FBi26BLBct0VNBn2mtPtXV1VbtdB02TB92f2iBWBTBmtn2FBiVxBYt6tcVfKhtfV7t4Bg2jtZtOBA2mBKtOthtt2IVwKK2l2mtwt5tM2o29BuVM2hBNVkBeBnVRVjBvVz2TtqtoVq2qB0BG2TthBmB8Bx21t3BzV62IBZtmVl272AtNtH2QVIB1VFB6VI2v2jBaBgtf2AVOBs2xVWV3BDVc2utWVnVJt2BrVStetyBv2JBbBEVPBZt2BYtP28BGBxVu2R2et5tUtn2gB4BCB3VMtYVptTV3BatWVDBJVC2m2SBT2G2RtS2mVftZtMVhtBBFBIVrBbBhVnVqBntZVltkB12Sto2ZB6t4BB2EtOtEVftR2WKV2VBrtwVYBV2aVptKtn2VVGtkVLKVVT2eB32tVJ2K23Bh292H2jtgVtB9KhthKVBettVdtxVHBN2MBwtX2DVFBMBkteVHBK20ty2a2o2o2t26tp24tLt12etDBkBl2utZtLtOV328Vs2e2fBQBeB9VsB9tNBgVptCt1BdtpB8tW2tVVBHth2pt42Z2FVl2TV9VsVXKJBtBwBN2U2Qt3Vy27VgBmVCtXtftjVhVGVjtht42zththttVXBh2ytUtcVf2F2HVYtk2U2J2rBXtRVu2MtY2N2vVWBuVTtEBU2wtSBcVtBWtqtCtXBI2dta2F28twtMVOVXKVVSthBLB3t0tVBlBstJt7tRBc2c2bV6VX2b2y2Q2kVHVN23t4BDV8VgVqBmBTVzVStIVztTVe2qVd2KV22cBnts2Yt62Kt8ttBbBktO2Otc26Bt2vVFVDB5VH2ttvBi2IBTBY2fB2tw2jBL2jteKBV7VDB0twVnBEtvBq2224tWtNV8BDtB22V0BKVu2zBKKTBEVPtFVr2c2HVtV2VGtN2QVRtxtlVCVetftct5tPBaVxBa2KtJVxtD2PtU2et72ctUt3BJ2hVr2btFBHVjV8tiB8tetyKtty2Hto2atFBLB2B9Vu2CBBB4tgtPVZBBtXV329VoKVV7VuVcBg2iBIVjVhV6tZ242QVqVb2eVfBcVD24BuVe2BVB23V4BcB12hBCtt202SBeBCKtVktctMti24Bot32E2SV2tbVWBv2Y2WtaKKtYBcBLtfB5B6BDt12iB6V6t82ZttVE2HtRBK2MV2BOtH2wVstGVttg2rtvBttx2eV7tU2RtCB2BnBr2L2K2eBYtvt4Bq24VMVgV9trBD2025tTBY2KBKtntYBYByVntotytVVhtkVS2gta27tVBRBsVstztvtH2y2UBUtbVEVL2MtEBRBUti2rV5BnVhta2MVgBi2a2gBN2wVxtgBjVj2MVfthBBtjtcBBtMtIVgB0tiVLtK2vVw2eKVtb2CVVBs2rVaB8Bi2DVoVJVLB3VoBrV02sBktW2pBZ2u2BBDBWtI2Z2PVjtB2qVrBYVw2CBUBl2E2LB1202P2rtwVYB3VXB9BzVR2u2GKhB4BBVeVwt22XtQtBVo2i2rVYVutW21VGBwtyBUKTKVBjVC2xBFtSVpB6BxVUVA2stx2IVk2aBYBKBEBXBDVutGVgtwBVB2tnBqtcBZVStTtx2bt5tttg2J2ut82jtEVz2gB0Bu2TtYBLBytRVvVXBEVgV8BMBDVNVDtLViBOBrt9V0tkVWVDV3tnVatFt4BwV2totUt8BctEt3V8BeVDV7292QtnVh2lVX2tt5BPBtBB2JV8BDVpKVB6BnBH2LVI28Bl2eKttO28BetgtUVlBi2A2kVXBbtAtdVito292BVaVhBw2V2kBXVNVk272IBD2RtQBF2hBw2fVrto2o2mVEKJtgBQVd2ztPBV2ytgBIVK2jB7tQBuBFBCt1tatYVn2eVqVftOtAtgBg2NVsBt2LBG2cVJVBVSBeVIVDtZ2MB9VOB42VBKV8B12htttKBQVrV3to2otdVQtkVvt82i2J2D2FVf2DBat1BEBPBY2mtyKtVNB2VuBpVy2bVn2DBZBvVt2HtOB6tLtItf23B9VgVNBy2I2HBHBR2ltEB92FVetqVBBYKhBT2RBtVKtUtO2S21tgBBVI21VDttBRtvV9232otfB72TVvVhVSVT2EBJ2QVmB7VdVOBntxtYBe21VlVTVG2sBd2p2QBzBr2FBMtJBBtuBWt7KhV7KJVYBa2Rto2oBJVqVs2J2h2eVfVIVTVj2aBuVl2i2UVitsV8tZ2E2n2pB72Stat4BYtdVA2HKKVCBNtGV92Ytt23tt25tmVrtN2sBwtatSBLt4tItoB52zK2VqVHtftMtqVm2TtFtyBkVBVctr2lBp2fBFKJVhtutltHtSVFtT25tR2U2qB1VUBs2yt7tHV4VgVxBotVBTtOVhtF2K2dtLVMtfVCBt2L2t2gV8BH2cVT2HVj232MBT2ttxVb2BBRBN2XtLtWV8tpBetI2v2mBW2lVcVItBVu2RBiVc2I2OVjVF2eB52ZBRBBBpVA2aVztkVGBZtrBI2mVt2bVz25VVtX2itzt8VYBXVu2ytntBVttPBbtj2Kt1VoV2V6BYVHBP2e2TtcBVBktOBrVX21BPtZt3VgtutHBw2w22VeBbt32MVQt5BzVZ2fV2Ve2UBzVxB2VLBjByBftMtctltPVSV42fBuV5VU26tX2BVfVNtABZ2JBitVBN2EVUVTVzKV2HtoBdt72PVRtHVZ282h2d2MBqVnVD2YVm2JKtBiBCVFt4Bo2ZBrBm27BU2u2e2fth2tBzB4BL2d28t3BfVIV7tyB7Br2LtDVV22BRViVCVZtytUK2Bz2uBlBbB0BYBFK22qB9tGV027tL2H25tA2V2c2CV5V0BEBbVrtA2GBbKTtttTVwBTVXtPBe2Yt9BCtgBYVIBd26212YBpVZVDV0BTtcVz23tOVzVRVktvBx2jKJtVVFtMV32J2W28ttB9VmVlBNB0tatFtyV7Vftf2TV422tYtftgBOBNVEK22TVEBAK2tuVNBUBwVR2xKJt3tp2FKVBCVPVmByt7B9tTVA2KtrB2VvVFtUBl2a2htrBLtStQ2ZV42WVqV62L2BtktVteBjB0VWVothBP21KhV2tNBcVBtRtdt3VCBoVqt1V4Vp28V8V6V12G272R27tqVoVs2LVHBXtRBT2MVzVK2Rt6VDVe2q2PtRBAtK2L2tVxBHVJ29Ktt8K2VKBh2XB2BKBqVyB4BHtbVzB02F29KtVyVZBEVPBl2MBztLtzBa2w2btI2aBYtAVytGBEVxB0B0BX25V62y2O2rBiVG262NVSVc2ZVDKtBdtpVxBvVptx2NtKtnVY2zth2KKttT2l2JtItJt6V7tDV0V2VTBXBVB2232d21KTKTtX2Ft4VABst0VmtVVoBStdVetDBDtUVsVb2QBqtctCBRtTBV2s2jBN2R2MVBVE2T2i26tIK22uVrVLBOt6twtdVV2t2ABaV328VetKVpVDtFBGBPtsB4tQ2TtXBwt1VAKBBqKhBNtNBHVEtmtHBTBa2IVZt9BABEtTV6tc2l2ftjBWVt2xKTtlKBtStPB3VFB8tP2z24BXBk2gBMt4VK2u2RtwVF2ZtEte212UBM2gV2tgBrBlVJBd2etvBStE2ntPtJVHt32VVd2qtaBa2q2mV8VBtoV52TB3VIt3tK2eVy2mVSBBVqBg2GtIB62RBUVZ2atxV82lKBVkBetRBCtDt1VBBNBrVFVs2ftkBfBU2JBzKBVptutRBTt32ZBJVQtjVPt2VDtDB6tstcV62cBNVHVD2uKKtkVdtCBmt4VEtUt9tp2ctxtvtUVHVyVe2OtF25VRBOVj2btlVy22t0tT2p2OVRVgtmBdByBR2bV6ButoBbVVV1BCKJtVt8BDKttF2NtnVa2OtsKKBWVd2V2SVatU25tOVuKh2aVqBX29VK2aBsVltQtqBx2a2f2VBpB8Vm27BE2TV32YBUVrVXtwBkKT2btp2aBCBXBNBNtXBG2aBPBKVf2z2vVJBCV52VtUVzVTVN2UVFtvBDVmB2V7BDBG20BvVutpVeBBVA23t2BMKVBxBqBoVQBxVZByt2VO2H2vVUVatltQVo262Q2CtkVTVitQKTBOt9tFtRBDVPBztFVP2Q2K2V2Ct7BJ2J212RtKVaBbBW2vVQVS2nB92kBc2gVWtyBbBRBl2tVZtP2ZBq2qV9B72OVBVv2wB6tpVYtgtXtUVKKVVFtFVNt6BMBvtrt8Vwtk2F26trBOKtBnVQ2ytsBWtp2QVsVd2fVSVrKVV3BqtwBbtF2r2j2GB3VRVetgV42YBOBLV9Vf2n2ntn2ABaVN2eVcVkVmtbBjt92H2U2Vtc2LtsVptfBMB32uB2tT2fVAVWt0tXV5By2CV4t7KVtvtgtS2FBABGtM2NVStOVwBwVd26BfBhBotUtIBqBEBDBgVVB2t0t72ktaVLBqBytwtytJtStiBgtKVt272yVDtqVBBRBiVkKhBwt8BnBxB22uBoBxt0thB5tqBgBSBNtfBVB2VnVztD2I2AB5t0tj2wt1tiVftuKTtJV22rVtBGBc2uVk2e2j2ntf2e26B4teBdVKV2Bp2qBRVZ2g2ItlBNVyVk",0));
    CParserGLTF.prototype["CreateMesh"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",3497));
    CParserGLTF.prototype["CreateMeshDataNode"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",7578));
    CParserGLTF.prototype["ParseCJSON"]=eval(__cwasmDecode__.Decode("artgine/util_imple/parser/CParserGLTF.js","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",23316));
}
