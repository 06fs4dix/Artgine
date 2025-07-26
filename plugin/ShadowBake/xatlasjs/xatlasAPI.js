import createXAtlasModule from "./xatlas.js";
let _onLoad = () => { };
export class XAtlasAPI {
    constructor(onLoad, locateFile, onAtlasProgress) {
        this.xatlas = null;
        this.loaded = false;
        _onLoad = onLoad || (() => { });
        this.atlasCreated = false;
        this.meshes = [];
        let params = {};
        if (onAtlasProgress)
            params = { ...params, onAtlasProgress };
        const ctor = (loc) => {
            params = { ...params };
            createXAtlasModule(params).then(m => { this.moduleLoaded(m); });
        };
        if (locateFile) {
            let pp = locateFile("xatlas.wasm", "");
            if (pp && pp.then)
                pp.then(ctor);
            else
                ctor(pp);
        }
        else
            ctor();
    }
    moduleLoaded(mod) {
        this.xatlas = mod;
        this.loaded = true;
        if (_onLoad)
            _onLoad();
    }
    createAtlas() {
        this.xatlas.createAtlas();
        this.meshes = [];
        this.atlasCreated = true;
    }
    addMesh(indexes, vertices, vertexSize, normals = null, coords = null, meshObj = undefined, useNormals = false, useCoords = false, scale = 1) {
        if (!this.loaded || !this.atlasCreated)
            throw "Create atlas first";
        let meshDesc = this.xatlas.createMesh(vertices.length / 3, indexes.length, normals != null && useNormals, coords != null && useCoords);
        this.xatlas.HEAPU32.set(indexes, meshDesc.indexOffset / 4);
        let vs = new Float32Array(vertexSize);
        for (let i = 0; i < vertexSize; i++) {
            vs[i] = vertices[i];
        }
        if (scale !== 1) {
            if (typeof scale === "number")
                scale = [scale, scale, scale];
            for (let i = 0, l = vs.length; i < l; i += 3) {
                vs[i] *= scale[0];
                vs[i + 1] *= scale[1];
                vs[i + 2] *= scale[2];
            }
        }
        this.xatlas.HEAPF32.set(vs, meshDesc.positionOffset / 4);
        if (normals != null && useNormals)
            this.xatlas.HEAPF32.set(normals, meshDesc.normalOffset / 4);
        if (coords != null && useCoords)
            this.xatlas.HEAPF32.set(coords, meshDesc.uvOffset / 4);
        let addMeshRes = this.xatlas.addMesh();
        if (addMeshRes !== 0) {
            console.log("Error adding mesh: ", addMeshRes);
            return null;
        }
        let ret = {
            meshId: meshDesc.meshId,
            meshObj: meshObj,
            vertices: vertices,
            normals: normals || null,
            indexes: indexes || null,
            coords: coords || null,
        };
        this.meshes.push(ret);
        return ret;
    }
    createMesh(vertexCount, indexCount, normals, coords) {
        return this.xatlas.createMesh(vertexCount, indexCount, normals, coords);
    }
    generateAtlas(chartOptions, packOptions, returnMeshes = true) {
        if (!this.loaded || !this.atlasCreated)
            throw "Create atlas first";
        if (this.meshes.length < 1)
            throw "Add meshes first";
        chartOptions = { ...this.defaultChartOptions(), ...chartOptions };
        packOptions = { ...this.defaultPackOptions(), ...packOptions };
        this.xatlas.generateAtlas(chartOptions, packOptions);
        if (!returnMeshes)
            return [];
        let returnVal = [];
        for (let { meshId, meshObj, vertices, normals, coords } of this.meshes) {
            let ret = this.getMeshData(meshId);
            let index = new Uint32Array(this.xatlas.HEAPU32.subarray(ret.indexOffset / 4, ret.indexOffset / 4 + ret.newIndexCount));
            let oldIndexes = new Uint32Array(this.xatlas.HEAPU32.subarray(ret.originalIndexOffset / 4, ret.originalIndexOffset / 4 + ret.newVertexCount));
            let xcoords = new Float32Array(this.xatlas.HEAPF32.subarray(ret.uvOffset / 4, ret.uvOffset / 4 + ret.newVertexCount * 2));
            this.xatlas.destroyMeshData(ret);
            let vertex = {};
            vertex.vertices = new Float32Array(ret.newVertexCount * 3);
            vertex.coords1 = xcoords;
            if (normals)
                vertex.normals = new Float32Array(ret.newVertexCount * 3);
            if (coords)
                vertex.coords = new Float32Array(ret.newVertexCount * 2);
            else
                vertex.coords = vertex.coords1;
            for (let i = 0, l = ret.newVertexCount; i < l; i++) {
                let oldIndex = oldIndexes[i];
                vertex.vertices[3 * i + 0] = vertices[3 * oldIndex + 0];
                vertex.vertices[3 * i + 1] = vertices[3 * oldIndex + 1];
                vertex.vertices[3 * i + 2] = vertices[3 * oldIndex + 2];
                if (vertex.normals && normals) {
                    vertex.normals[3 * i + 0] = normals[3 * oldIndex + 0];
                    vertex.normals[3 * i + 1] = normals[3 * oldIndex + 1];
                    vertex.normals[3 * i + 2] = normals[3 * oldIndex + 2];
                }
                if (vertex.coords && coords) {
                    vertex.coords[2 * i + 0] = coords[2 * oldIndex + 0];
                    vertex.coords[2 * i + 1] = coords[2 * oldIndex + 1];
                }
            }
            returnVal.push({ index: index, vertex: vertex, mesh: meshObj, vertexCount: ret.newVertexCount, oldIndexes: oldIndexes });
        }
        return returnVal;
    }
    defaultChartOptions() {
        return {
            fixWinding: false,
            maxBoundaryLength: 0,
            maxChartArea: 0,
            maxCost: 2,
            maxIterations: 1,
            normalDeviationWeight: 2,
            normalSeamWeight: 4,
            roundnessWeight: 0.009999999776482582,
            straightnessWeight: 6,
            textureSeamWeight: 0.5,
            useInputMeshUvs: false,
        };
    }
    defaultPackOptions() {
        return {
            bilinear: true,
            blockAlign: false,
            bruteForce: false,
            createImage: false,
            maxChartSize: 0,
            padding: 0,
            resolution: 0,
            rotateCharts: true,
            rotateChartsToAxis: true,
            texelsPerUnit: 0
        };
    }
    setProgressLogging(flag) {
        this.xatlas.setProgressLogging(flag);
    }
    getMeshData(meshId) {
        return this.xatlas.getMeshData(meshId);
    }
    destroyMeshData(data) {
        this.xatlas.destroyMeshData(data);
    }
    destroyAtlas() {
        this.atlasCreated = false;
        this.xatlas.destroyAtlas();
        this.meshes = [];
        this.xatlas.doLeakCheck();
    }
}
