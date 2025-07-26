var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
                __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var require_fs = __commonJS({
    "(disabled):fs"() {
    }
});
var require_path = __commonJS({
    "(disabled):path"() {
    }
});
var require_iota = __commonJS({
    "node_modules/iota-array/iota.js"(exports, module) {
        "use strict";
        function iota(n2) {
            var result = new Array(n2);
            for (var i = 0; i < n2; ++i) {
                result[i] = i;
            }
            return result;
        }
        module.exports = iota;
    }
});
var require_is_buffer = __commonJS({
    "node_modules/is-buffer/index.js"(exports, module) {
        module.exports = function (obj) {
            return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
        };
        function isBuffer(obj) {
            return !!obj.constructor && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
        }
        function isSlowBuffer(obj) {
            return typeof obj.readFloatLE === "function" && typeof obj.slice === "function" && isBuffer(obj.slice(0, 0));
        }
    }
});
var require_ndarray = __commonJS({
    "node_modules/ndarray/ndarray.js"(exports, module) {
        var iota = require_iota();
        var isBuffer = require_is_buffer();
        var hasTypedArrays = typeof Float64Array !== "undefined";
        function compare1st(a2, b) {
            return a2[0] - b[0];
        }
        function order() {
            var stride = this.stride;
            var terms = new Array(stride.length);
            var i;
            for (i = 0; i < terms.length; ++i) {
                terms[i] = [Math.abs(stride[i]), i];
            }
            terms.sort(compare1st);
            var result = new Array(terms.length);
            for (i = 0; i < result.length; ++i) {
                result[i] = terms[i][1];
            }
            return result;
        }
        function compileConstructor(dtype, dimension) {
            var className = ["View", dimension, "d", dtype].join("");
            if (dimension < 0) {
                className = "View_Nil" + dtype;
            }
            var useGetters = dtype === "generic";
            if (dimension === -1) {
                var code = "function " + className + "(a){this.data=a;};var proto=" + className + ".prototype;proto.dtype='" + dtype + "';proto.index=function(){return -1};proto.size=0;proto.dimension=-1;proto.shape=proto.stride=proto.order=[];proto.lo=proto.hi=proto.transpose=proto.step=function(){return new " + className + "(this.data);};proto.get=proto.set=function(){};proto.pick=function(){return null};return function construct_" + className + "(a){return new " + className + "(a);}";
                var procedure = new Function(code);
                return procedure();
            }
            else if (dimension === 0) {
                var code = "function " + className + "(a,d) {this.data = a;this.offset = d};var proto=" + className + ".prototype;proto.dtype='" + dtype + "';proto.index=function(){return this.offset};proto.dimension=0;proto.size=1;proto.shape=proto.stride=proto.order=[];proto.lo=proto.hi=proto.transpose=proto.step=function " + className + "_copy() {return new " + className + "(this.data,this.offset)};proto.pick=function " + className + "_pick(){return TrivialArray(this.data);};proto.valueOf=proto.get=function " + className + "_get(){return " + (useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]") + "};proto.set=function " + className + "_set(v){return " + (useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v") + "};return function construct_" + className + "(a,b,c,d){return new " + className + "(a,d)}";
                var procedure = new Function("TrivialArray", code);
                return procedure(CACHED_CONSTRUCTORS[dtype][0]);
            }
            var code = ["'use strict'"];
            var indices = iota(dimension);
            var args = indices.map(function (i2) {
                return "i" + i2;
            });
            var index_str = "this.offset+" + indices.map(function (i2) {
                return "this.stride[" + i2 + "]*i" + i2;
            }).join("+");
            var shapeArg = indices.map(function (i2) {
                return "b" + i2;
            }).join(",");
            var strideArg = indices.map(function (i2) {
                return "c" + i2;
            }).join(",");
            code.push("function " + className + "(a," + shapeArg + "," + strideArg + ",d){this.data=a", "this.shape=[" + shapeArg + "]", "this.stride=[" + strideArg + "]", "this.offset=d|0}", "var proto=" + className + ".prototype", "proto.dtype='" + dtype + "'", "proto.dimension=" + dimension);
            code.push("Object.defineProperty(proto,'size',{get:function " + className + "_size(){return " + indices.map(function (i2) {
                return "this.shape[" + i2 + "]";
            }).join("*"), "}})");
            if (dimension === 1) {
                code.push("proto.order=[0]");
            }
            else {
                code.push("Object.defineProperty(proto,'order',{get:");
                if (dimension < 4) {
                    code.push("function " + className + "_order(){");
                    if (dimension === 2) {
                        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})");
                    }
                    else if (dimension === 3) {
                        code.push("var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);if(s0>s1){if(s1>s2){return [2,1,0];}else if(s0>s2){return [1,2,0];}else{return [1,0,2];}}else if(s0>s2){return [2,0,1];}else if(s2>s1){return [0,1,2];}else{return [0,2,1];}}})");
                    }
                }
                else {
                    code.push("ORDER})");
                }
            }
            code.push("proto.set=function " + className + "_set(" + args.join(",") + ",v){");
            if (useGetters) {
                code.push("return this.data.set(" + index_str + ",v)}");
            }
            else {
                code.push("return this.data[" + index_str + "]=v}");
            }
            code.push("proto.get=function " + className + "_get(" + args.join(",") + "){");
            if (useGetters) {
                code.push("return this.data.get(" + index_str + ")}");
            }
            else {
                code.push("return this.data[" + index_str + "]}");
            }
            code.push("proto.index=function " + className + "_index(", args.join(), "){return " + index_str + "}");
            code.push("proto.hi=function " + className + "_hi(" + args.join(",") + "){return new " + className + "(this.data," + indices.map(function (i2) {
                return ["(typeof i", i2, "!=='number'||i", i2, "<0)?this.shape[", i2, "]:i", i2, "|0"].join("");
            }).join(",") + "," + indices.map(function (i2) {
                return "this.stride[" + i2 + "]";
            }).join(",") + ",this.offset)}");
            var a_vars = indices.map(function (i2) {
                return "a" + i2 + "=this.shape[" + i2 + "]";
            });
            var c_vars = indices.map(function (i2) {
                return "c" + i2 + "=this.stride[" + i2 + "]";
            });
            code.push("proto.lo=function " + className + "_lo(" + args.join(",") + "){var b=this.offset,d=0," + a_vars.join(",") + "," + c_vars.join(","));
            for (var i = 0; i < dimension; ++i) {
                code.push("if(typeof i" + i + "==='number'&&i" + i + ">=0){d=i" + i + "|0;b+=c" + i + "*d;a" + i + "-=d}");
            }
            code.push("return new " + className + "(this.data," + indices.map(function (i2) {
                return "a" + i2;
            }).join(",") + "," + indices.map(function (i2) {
                return "c" + i2;
            }).join(",") + ",b)}");
            code.push("proto.step=function " + className + "_step(" + args.join(",") + "){var " + indices.map(function (i2) {
                return "a" + i2 + "=this.shape[" + i2 + "]";
            }).join(",") + "," + indices.map(function (i2) {
                return "b" + i2 + "=this.stride[" + i2 + "]";
            }).join(",") + ",c=this.offset,d=0,ceil=Math.ceil");
            for (var i = 0; i < dimension; ++i) {
                code.push("if(typeof i" + i + "==='number'){d=i" + i + "|0;if(d<0){c+=b" + i + "*(a" + i + "-1);a" + i + "=ceil(-a" + i + "/d)}else{a" + i + "=ceil(a" + i + "/d)}b" + i + "*=d}");
            }
            code.push("return new " + className + "(this.data," + indices.map(function (i2) {
                return "a" + i2;
            }).join(",") + "," + indices.map(function (i2) {
                return "b" + i2;
            }).join(",") + ",c)}");
            var tShape = new Array(dimension);
            var tStride = new Array(dimension);
            for (var i = 0; i < dimension; ++i) {
                tShape[i] = "a[i" + i + "]";
                tStride[i] = "b[i" + i + "]";
            }
            code.push("proto.transpose=function " + className + "_transpose(" + args + "){" + args.map(function (n2, idx) {
                return n2 + "=(" + n2 + "===undefined?" + idx + ":" + n2 + "|0)";
            }).join(";"), "var a=this.shape,b=this.stride;return new " + className + "(this.data," + tShape.join(",") + "," + tStride.join(",") + ",this.offset)}");
            code.push("proto.pick=function " + className + "_pick(" + args + "){var a=[],b=[],c=this.offset");
            for (var i = 0; i < dimension; ++i) {
                code.push("if(typeof i" + i + "==='number'&&i" + i + ">=0){c=(c+this.stride[" + i + "]*i" + i + ")|0}else{a.push(this.shape[" + i + "]);b.push(this.stride[" + i + "])}");
            }
            code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}");
            code.push("return function construct_" + className + "(data,shape,stride,offset){return new " + className + "(data," + indices.map(function (i2) {
                return "shape[" + i2 + "]";
            }).join(",") + "," + indices.map(function (i2) {
                return "stride[" + i2 + "]";
            }).join(",") + ",offset)}");
            var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"));
            return procedure(CACHED_CONSTRUCTORS[dtype], order);
        }
        function arrayDType(data) {
            if (isBuffer(data)) {
                return "buffer";
            }
            if (hasTypedArrays) {
                switch (Object.prototype.toString.call(data)) {
                    case "[object Float64Array]":
                        return "float64";
                    case "[object Float32Array]":
                        return "float32";
                    case "[object Int8Array]":
                        return "int8";
                    case "[object Int16Array]":
                        return "int16";
                    case "[object Int32Array]":
                        return "int32";
                    case "[object Uint8Array]":
                        return "uint8";
                    case "[object Uint16Array]":
                        return "uint16";
                    case "[object Uint32Array]":
                        return "uint32";
                    case "[object Uint8ClampedArray]":
                        return "uint8_clamped";
                    case "[object BigInt64Array]":
                        return "bigint64";
                    case "[object BigUint64Array]":
                        return "biguint64";
                }
            }
            if (Array.isArray(data)) {
                return "array";
            }
            return "generic";
        }
        var CACHED_CONSTRUCTORS = {
            "float32": [],
            "float64": [],
            "int8": [],
            "int16": [],
            "int32": [],
            "uint8": [],
            "uint16": [],
            "uint32": [],
            "array": [],
            "uint8_clamped": [],
            "bigint64": [],
            "biguint64": [],
            "buffer": [],
            "generic": []
        };
        function wrappedNDArrayCtor(data, shape, stride, offset) {
            if (data === void 0) {
                var ctor = CACHED_CONSTRUCTORS.array[0];
                return ctor([]);
            }
            else if (typeof data === "number") {
                data = [data];
            }
            if (shape === void 0) {
                shape = [data.length];
            }
            var d = shape.length;
            if (stride === void 0) {
                stride = new Array(d);
                for (var i = d - 1, sz = 1; i >= 0; --i) {
                    stride[i] = sz;
                    sz *= shape[i];
                }
            }
            if (offset === void 0) {
                offset = 0;
                for (var i = 0; i < d; ++i) {
                    if (stride[i] < 0) {
                        offset -= (shape[i] - 1) * stride[i];
                    }
                }
            }
            var dtype = arrayDType(data);
            var ctor_list = CACHED_CONSTRUCTORS[dtype];
            while (ctor_list.length <= d + 1) {
                ctor_list.push(compileConstructor(dtype, ctor_list.length - 1));
            }
            var ctor = ctor_list[d + 1];
            return ctor(data, shape, stride, offset);
        }
        module.exports = wrappedNDArrayCtor;
    }
});
var require_uniq = __commonJS({
    "node_modules/uniq/uniq.js"(exports, module) {
        "use strict";
        function unique_pred(list, compare) {
            var ptr = 1, len2 = list.length, a2 = list[0], b = list[0];
            for (var i = 1; i < len2; ++i) {
                b = a2;
                a2 = list[i];
                if (compare(a2, b)) {
                    if (i === ptr) {
                        ptr++;
                        continue;
                    }
                    list[ptr++] = a2;
                }
            }
            list.length = ptr;
            return list;
        }
        function unique_eq(list) {
            var ptr = 1, len2 = list.length, a2 = list[0], b = list[0];
            for (var i = 1; i < len2; ++i, b = a2) {
                b = a2;
                a2 = list[i];
                if (a2 !== b) {
                    if (i === ptr) {
                        ptr++;
                        continue;
                    }
                    list[ptr++] = a2;
                }
            }
            list.length = ptr;
            return list;
        }
        function unique(list, compare, sorted) {
            if (list.length === 0) {
                return list;
            }
            if (compare) {
                if (!sorted) {
                    list.sort(compare);
                }
                return unique_pred(list, compare);
            }
            if (!sorted) {
                list.sort();
            }
            return unique_eq(list);
        }
        module.exports = unique;
    }
});
var require_compile = __commonJS({
    "node_modules/cwise-compiler/lib/compile.js"(exports, module) {
        "use strict";
        var uniq = require_uniq();
        function innerFill(order, proc, body) {
            var dimension = order.length, nargs = proc.arrayArgs.length, has_index = proc.indexArgs.length > 0, code = [], vars = [], idx = 0, pidx = 0, i, j;
            for (i = 0; i < dimension; ++i) {
                vars.push(["i", i, "=0"].join(""));
            }
            for (j = 0; j < nargs; ++j) {
                for (i = 0; i < dimension; ++i) {
                    pidx = idx;
                    idx = order[i];
                    if (i === 0) {
                        vars.push(["d", j, "s", i, "=t", j, "p", idx].join(""));
                    }
                    else {
                        vars.push(["d", j, "s", i, "=(t", j, "p", idx, "-s", pidx, "*t", j, "p", pidx, ")"].join(""));
                    }
                }
            }
            if (vars.length > 0) {
                code.push("var " + vars.join(","));
            }
            for (i = dimension - 1; i >= 0; --i) {
                idx = order[i];
                code.push(["for(i", i, "=0;i", i, "<s", idx, ";++i", i, "){"].join(""));
            }
            code.push(body);
            for (i = 0; i < dimension; ++i) {
                pidx = idx;
                idx = order[i];
                for (j = 0; j < nargs; ++j) {
                    code.push(["p", j, "+=d", j, "s", i].join(""));
                }
                if (has_index) {
                    if (i > 0) {
                        code.push(["index[", pidx, "]-=s", pidx].join(""));
                    }
                    code.push(["++index[", idx, "]"].join(""));
                }
                code.push("}");
            }
            return code.join("\n");
        }
        function outerFill(matched, order, proc, body) {
            var dimension = order.length, nargs = proc.arrayArgs.length, blockSize = proc.blockSize, has_index = proc.indexArgs.length > 0, code = [];
            for (var i = 0; i < nargs; ++i) {
                code.push(["var offset", i, "=p", i].join(""));
            }
            for (var i = matched; i < dimension; ++i) {
                code.push(["for(var j" + i + "=SS[", order[i], "]|0;j", i, ">0;){"].join(""));
                code.push(["if(j", i, "<", blockSize, "){"].join(""));
                code.push(["s", order[i], "=j", i].join(""));
                code.push(["j", i, "=0"].join(""));
                code.push(["}else{s", order[i], "=", blockSize].join(""));
                code.push(["j", i, "-=", blockSize, "}"].join(""));
                if (has_index) {
                    code.push(["index[", order[i], "]=j", i].join(""));
                }
            }
            for (var i = 0; i < nargs; ++i) {
                var indexStr = ["offset" + i];
                for (var j = matched; j < dimension; ++j) {
                    indexStr.push(["j", j, "*t", i, "p", order[j]].join(""));
                }
                code.push(["p", i, "=(", indexStr.join("+"), ")"].join(""));
            }
            code.push(innerFill(order, proc, body));
            for (var i = matched; i < dimension; ++i) {
                code.push("}");
            }
            return code.join("\n");
        }
        function countMatches(orders) {
            var matched = 0, dimension = orders[0].length;
            while (matched < dimension) {
                for (var j = 1; j < orders.length; ++j) {
                    if (orders[j][matched] !== orders[0][matched]) {
                        return matched;
                    }
                }
                ++matched;
            }
            return matched;
        }
        function processBlock(block, proc, dtypes) {
            var code = block.body;
            var pre = [];
            var post = [];
            for (var i = 0; i < block.args.length; ++i) {
                var carg = block.args[i];
                if (carg.count <= 0) {
                    continue;
                }
                var re = new RegExp(carg.name, "g");
                var ptrStr = "";
                var arrNum = proc.arrayArgs.indexOf(i);
                switch (proc.argTypes[i]) {
                    case "offset":
                        var offArgIndex = proc.offsetArgIndex.indexOf(i);
                        var offArg = proc.offsetArgs[offArgIndex];
                        arrNum = offArg.array;
                        ptrStr = "+q" + offArgIndex;
                    case "array":
                        ptrStr = "p" + arrNum + ptrStr;
                        var localStr = "l" + i;
                        var arrStr = "a" + arrNum;
                        if (proc.arrayBlockIndices[arrNum] === 0) {
                            if (carg.count === 1) {
                                if (dtypes[arrNum] === "generic") {
                                    if (carg.lvalue) {
                                        pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join(""));
                                        code = code.replace(re, localStr);
                                        post.push([arrStr, ".set(", ptrStr, ",", localStr, ")"].join(""));
                                    }
                                    else {
                                        code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""));
                                    }
                                }
                                else {
                                    code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
                                }
                            }
                            else if (dtypes[arrNum] === "generic") {
                                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join(""));
                                code = code.replace(re, localStr);
                                if (carg.lvalue) {
                                    post.push([arrStr, ".set(", ptrStr, ",", localStr, ")"].join(""));
                                }
                            }
                            else {
                                pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join(""));
                                code = code.replace(re, localStr);
                                if (carg.lvalue) {
                                    post.push([arrStr, "[", ptrStr, "]=", localStr].join(""));
                                }
                            }
                        }
                        else {
                            var reStrArr = [carg.name], ptrStrArr = [ptrStr];
                            for (var j = 0; j < Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
                                reStrArr.push("\\s*\\[([^\\]]+)\\]");
                                ptrStrArr.push("$" + (j + 1) + "*t" + arrNum + "b" + j);
                            }
                            re = new RegExp(reStrArr.join(""), "g");
                            ptrStr = ptrStrArr.join("+");
                            if (dtypes[arrNum] === "generic") {
                                throw new Error("cwise: Generic arrays not supported in combination with blocks!");
                            }
                            else {
                                code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
                            }
                        }
                        break;
                    case "scalar":
                        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i));
                        break;
                    case "index":
                        code = code.replace(re, "index");
                        break;
                    case "shape":
                        code = code.replace(re, "shape");
                        break;
                }
            }
            return [pre.join("\n"), code, post.join("\n")].join("\n").trim();
        }
        function typeSummary(dtypes) {
            var summary = new Array(dtypes.length);
            var allEqual = true;
            for (var i = 0; i < dtypes.length; ++i) {
                var t2 = dtypes[i];
                var digits = t2.match(/\d+/);
                if (!digits) {
                    digits = "";
                }
                else {
                    digits = digits[0];
                }
                if (t2.charAt(0) === 0) {
                    summary[i] = "u" + t2.charAt(1) + digits;
                }
                else {
                    summary[i] = t2.charAt(0) + digits;
                }
                if (i > 0) {
                    allEqual = allEqual && summary[i] === summary[i - 1];
                }
            }
            if (allEqual) {
                return summary[0];
            }
            return summary.join("");
        }
        function generateCWiseOp(proc, typesig) {
            var dimension = typesig[1].length - Math.abs(proc.arrayBlockIndices[0]) | 0;
            var orders = new Array(proc.arrayArgs.length);
            var dtypes = new Array(proc.arrayArgs.length);
            for (var i = 0; i < proc.arrayArgs.length; ++i) {
                dtypes[i] = typesig[2 * i];
                orders[i] = typesig[2 * i + 1];
            }
            var blockBegin = [], blockEnd = [];
            var loopBegin = [], loopEnd = [];
            var loopOrders = [];
            for (var i = 0; i < proc.arrayArgs.length; ++i) {
                if (proc.arrayBlockIndices[i] < 0) {
                    loopBegin.push(0);
                    loopEnd.push(dimension);
                    blockBegin.push(dimension);
                    blockEnd.push(dimension + proc.arrayBlockIndices[i]);
                }
                else {
                    loopBegin.push(proc.arrayBlockIndices[i]);
                    loopEnd.push(proc.arrayBlockIndices[i] + dimension);
                    blockBegin.push(0);
                    blockEnd.push(proc.arrayBlockIndices[i]);
                }
                var newOrder = [];
                for (var j = 0; j < orders[i].length; j++) {
                    if (loopBegin[i] <= orders[i][j] && orders[i][j] < loopEnd[i]) {
                        newOrder.push(orders[i][j] - loopBegin[i]);
                    }
                }
                loopOrders.push(newOrder);
            }
            var arglist = ["SS"];
            var code = ["'use strict'"];
            var vars = [];
            for (var j = 0; j < dimension; ++j) {
                vars.push(["s", j, "=SS[", j, "]"].join(""));
            }
            for (var i = 0; i < proc.arrayArgs.length; ++i) {
                arglist.push("a" + i);
                arglist.push("t" + i);
                arglist.push("p" + i);
                for (var j = 0; j < dimension; ++j) {
                    vars.push(["t", i, "p", j, "=t", i, "[", loopBegin[i] + j, "]"].join(""));
                }
                for (var j = 0; j < Math.abs(proc.arrayBlockIndices[i]); ++j) {
                    vars.push(["t", i, "b", j, "=t", i, "[", blockBegin[i] + j, "]"].join(""));
                }
            }
            for (var i = 0; i < proc.scalarArgs.length; ++i) {
                arglist.push("Y" + i);
            }
            if (proc.shapeArgs.length > 0) {
                vars.push("shape=SS.slice(0)");
            }
            if (proc.indexArgs.length > 0) {
                var zeros = new Array(dimension);
                for (var i = 0; i < dimension; ++i) {
                    zeros[i] = "0";
                }
                vars.push(["index=[", zeros.join(","), "]"].join(""));
            }
            for (var i = 0; i < proc.offsetArgs.length; ++i) {
                var off_arg = proc.offsetArgs[i];
                var init_string = [];
                for (var j = 0; j < off_arg.offset.length; ++j) {
                    if (off_arg.offset[j] === 0) {
                        continue;
                    }
                    else if (off_arg.offset[j] === 1) {
                        init_string.push(["t", off_arg.array, "p", j].join(""));
                    }
                    else {
                        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""));
                    }
                }
                if (init_string.length === 0) {
                    vars.push("q" + i + "=0");
                }
                else {
                    vars.push(["q", i, "=", init_string.join("+")].join(""));
                }
            }
            var thisVars = uniq([].concat(proc.pre.thisVars).concat(proc.body.thisVars).concat(proc.post.thisVars));
            vars = vars.concat(thisVars);
            if (vars.length > 0) {
                code.push("var " + vars.join(","));
            }
            for (var i = 0; i < proc.arrayArgs.length; ++i) {
                code.push("p" + i + "|=0");
            }
            if (proc.pre.body.length > 3) {
                code.push(processBlock(proc.pre, proc, dtypes));
            }
            var body = processBlock(proc.body, proc, dtypes);
            var matched = countMatches(loopOrders);
            if (matched < dimension) {
                code.push(outerFill(matched, loopOrders[0], proc, body));
            }
            else {
                code.push(innerFill(loopOrders[0], proc, body));
            }
            if (proc.post.body.length > 3) {
                code.push(processBlock(proc.post, proc, dtypes));
            }
            if (proc.debug) {
                console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------");
            }
            var loopName = [proc.funcName || "unnamed", "_cwise_loop_", orders[0].join("s"), "m", matched, typeSummary(dtypes)].join("");
            var f = new Function(["function ", loopName, "(", arglist.join(","), "){", code.join("\n"), "} return ", loopName].join(""));
            return f();
        }
        module.exports = generateCWiseOp;
    }
});
var require_thunk = __commonJS({
    "node_modules/cwise-compiler/lib/thunk.js"(exports, module) {
        "use strict";
        var compile = require_compile();
        function createThunk(proc) {
            var code = ["'use strict'", "var CACHED={}"];
            var vars = [];
            var thunkName = proc.funcName + "_cwise_thunk";
            code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""));
            var typesig = [];
            var string_typesig = [];
            var proc_args = [[
                    "array",
                    proc.arrayArgs[0],
                    ".shape.slice(",
                    Math.max(0, proc.arrayBlockIndices[0]),
                    proc.arrayBlockIndices[0] < 0 ? "," + proc.arrayBlockIndices[0] + ")" : ")"
                ].join("")];
            var shapeLengthConditions = [], shapeConditions = [];
            for (var i = 0; i < proc.arrayArgs.length; ++i) {
                var j = proc.arrayArgs[i];
                vars.push([
                    "t",
                    j,
                    "=array",
                    j,
                    ".dtype,",
                    "r",
                    j,
                    "=array",
                    j,
                    ".order"
                ].join(""));
                typesig.push("t" + j);
                typesig.push("r" + j);
                string_typesig.push("t" + j);
                string_typesig.push("r" + j + ".join()");
                proc_args.push("array" + j + ".data");
                proc_args.push("array" + j + ".stride");
                proc_args.push("array" + j + ".offset|0");
                if (i > 0) {
                    shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0]) - Math.abs(proc.arrayBlockIndices[i])));
                    shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0, proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0, proc.arrayBlockIndices[i]) + "]");
                }
            }
            if (proc.arrayArgs.length > 1) {
                code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')");
                code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {");
                code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')");
                code.push("}");
            }
            for (var i = 0; i < proc.scalarArgs.length; ++i) {
                proc_args.push("scalar" + proc.scalarArgs[i]);
            }
            vars.push(["type=[", string_typesig.join(","), "].join()"].join(""));
            vars.push("proc=CACHED[type]");
            code.push("var " + vars.join(","));
            code.push([
                "if(!proc){",
                "CACHED[type]=proc=compile([",
                typesig.join(","),
                "])}",
                "return proc(",
                proc_args.join(","),
                ")}"
            ].join(""));
            if (proc.debug) {
                console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------");
            }
            var thunk = new Function("compile", code.join("\n"));
            return thunk(compile.bind(void 0, proc));
        }
        module.exports = createThunk;
    }
});
var require_compiler = __commonJS({
    "node_modules/cwise-compiler/compiler.js"(exports, module) {
        "use strict";
        var createThunk = require_thunk();
        function Procedure() {
            this.argTypes = [];
            this.shimArgs = [];
            this.arrayArgs = [];
            this.arrayBlockIndices = [];
            this.scalarArgs = [];
            this.offsetArgs = [];
            this.offsetArgIndex = [];
            this.indexArgs = [];
            this.shapeArgs = [];
            this.funcName = "";
            this.pre = null;
            this.body = null;
            this.post = null;
            this.debug = false;
        }
        function compileCwise(user_args) {
            var proc = new Procedure();
            proc.pre = user_args.pre;
            proc.body = user_args.body;
            proc.post = user_args.post;
            var proc_args = user_args.args.slice(0);
            proc.argTypes = proc_args;
            for (var i = 0; i < proc_args.length; ++i) {
                var arg_type = proc_args[i];
                if (arg_type === "array" || typeof arg_type === "object" && arg_type.blockIndices) {
                    proc.argTypes[i] = "array";
                    proc.arrayArgs.push(i);
                    proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0);
                    proc.shimArgs.push("array" + i);
                    if (i < proc.pre.args.length && proc.pre.args[i].count > 0) {
                        throw new Error("cwise: pre() block may not reference array args");
                    }
                    if (i < proc.post.args.length && proc.post.args[i].count > 0) {
                        throw new Error("cwise: post() block may not reference array args");
                    }
                }
                else if (arg_type === "scalar") {
                    proc.scalarArgs.push(i);
                    proc.shimArgs.push("scalar" + i);
                }
                else if (arg_type === "index") {
                    proc.indexArgs.push(i);
                    if (i < proc.pre.args.length && proc.pre.args[i].count > 0) {
                        throw new Error("cwise: pre() block may not reference array index");
                    }
                    if (i < proc.body.args.length && proc.body.args[i].lvalue) {
                        throw new Error("cwise: body() block may not write to array index");
                    }
                    if (i < proc.post.args.length && proc.post.args[i].count > 0) {
                        throw new Error("cwise: post() block may not reference array index");
                    }
                }
                else if (arg_type === "shape") {
                    proc.shapeArgs.push(i);
                    if (i < proc.pre.args.length && proc.pre.args[i].lvalue) {
                        throw new Error("cwise: pre() block may not write to array shape");
                    }
                    if (i < proc.body.args.length && proc.body.args[i].lvalue) {
                        throw new Error("cwise: body() block may not write to array shape");
                    }
                    if (i < proc.post.args.length && proc.post.args[i].lvalue) {
                        throw new Error("cwise: post() block may not write to array shape");
                    }
                }
                else if (typeof arg_type === "object" && arg_type.offset) {
                    proc.argTypes[i] = "offset";
                    proc.offsetArgs.push({ array: arg_type.array, offset: arg_type.offset });
                    proc.offsetArgIndex.push(i);
                }
                else {
                    throw new Error("cwise: Unknown argument type " + proc_args[i]);
                }
            }
            if (proc.arrayArgs.length <= 0) {
                throw new Error("cwise: No array arguments specified");
            }
            if (proc.pre.args.length > proc_args.length) {
                throw new Error("cwise: Too many arguments in pre() block");
            }
            if (proc.body.args.length > proc_args.length) {
                throw new Error("cwise: Too many arguments in body() block");
            }
            if (proc.post.args.length > proc_args.length) {
                throw new Error("cwise: Too many arguments in post() block");
            }
            proc.debug = !!user_args.printCode || !!user_args.debug;
            proc.funcName = user_args.funcName || "cwise";
            proc.blockSize = user_args.blockSize || 64;
            return createThunk(proc);
        }
        module.exports = compileCwise;
    }
});
var require_ndarray_ops = __commonJS({
    "node_modules/ndarray-ops/ndarray-ops.js"(exports) {
        "use strict";
        var compile = require_compiler();
        var EmptyProc = {
            body: "",
            args: [],
            thisVars: [],
            localVars: []
        };
        function fixup(x) {
            if (!x) {
                return EmptyProc;
            }
            for (var i = 0; i < x.args.length; ++i) {
                var a2 = x.args[i];
                if (i === 0) {
                    x.args[i] = { name: a2, lvalue: true, rvalue: !!x.rvalue, count: x.count || 1 };
                }
                else {
                    x.args[i] = { name: a2, lvalue: false, rvalue: true, count: 1 };
                }
            }
            if (!x.thisVars) {
                x.thisVars = [];
            }
            if (!x.localVars) {
                x.localVars = [];
            }
            return x;
        }
        function pcompile(user_args) {
            return compile({
                args: user_args.args,
                pre: fixup(user_args.pre),
                body: fixup(user_args.body),
                post: fixup(user_args.proc),
                funcName: user_args.funcName
            });
        }
        function makeOp(user_args) {
            var args = [];
            for (var i = 0; i < user_args.args.length; ++i) {
                args.push("a" + i);
            }
            var wrapper = new Function("P", [
                "return function ",
                user_args.funcName,
                "_ndarrayops(",
                args.join(","),
                ") {P(",
                args.join(","),
                ");return a0}"
            ].join(""));
            return wrapper(pcompile(user_args));
        }
        var assign_ops = {
            add: "+",
            sub: "-",
            mul: "*",
            div: "/",
            mod: "%",
            band: "&",
            bor: "|",
            bxor: "^",
            lshift: "<<",
            rshift: ">>",
            rrshift: ">>>"
        };
        (function () {
            for (var id in assign_ops) {
                var op = assign_ops[id];
                exports[id] = makeOp({
                    args: ["array", "array", "array"],
                    body: {
                        args: ["a", "b", "c"],
                        body: "a=b" + op + "c"
                    },
                    funcName: id
                });
                exports[id + "eq"] = makeOp({
                    args: ["array", "array"],
                    body: {
                        args: ["a", "b"],
                        body: "a" + op + "=b"
                    },
                    rvalue: true,
                    funcName: id + "eq"
                });
                exports[id + "s"] = makeOp({
                    args: ["array", "array", "scalar"],
                    body: {
                        args: ["a", "b", "s"],
                        body: "a=b" + op + "s"
                    },
                    funcName: id + "s"
                });
                exports[id + "seq"] = makeOp({
                    args: ["array", "scalar"],
                    body: {
                        args: ["a", "s"],
                        body: "a" + op + "=s"
                    },
                    rvalue: true,
                    funcName: id + "seq"
                });
            }
        })();
        var unary_ops = {
            not: "!",
            bnot: "~",
            neg: "-",
            recip: "1.0/"
        };
        (function () {
            for (var id in unary_ops) {
                var op = unary_ops[id];
                exports[id] = makeOp({
                    args: ["array", "array"],
                    body: {
                        args: ["a", "b"],
                        body: "a=" + op + "b"
                    },
                    funcName: id
                });
                exports[id + "eq"] = makeOp({
                    args: ["array"],
                    body: {
                        args: ["a"],
                        body: "a=" + op + "a"
                    },
                    rvalue: true,
                    count: 2,
                    funcName: id + "eq"
                });
            }
        })();
        var binary_ops = {
            and: "&&",
            or: "||",
            eq: "===",
            neq: "!==",
            lt: "<",
            gt: ">",
            leq: "<=",
            geq: ">="
        };
        (function () {
            for (var id in binary_ops) {
                var op = binary_ops[id];
                exports[id] = makeOp({
                    args: ["array", "array", "array"],
                    body: {
                        args: ["a", "b", "c"],
                        body: "a=b" + op + "c"
                    },
                    funcName: id
                });
                exports[id + "s"] = makeOp({
                    args: ["array", "array", "scalar"],
                    body: {
                        args: ["a", "b", "s"],
                        body: "a=b" + op + "s"
                    },
                    funcName: id + "s"
                });
                exports[id + "eq"] = makeOp({
                    args: ["array", "array"],
                    body: {
                        args: ["a", "b"],
                        body: "a=a" + op + "b"
                    },
                    rvalue: true,
                    count: 2,
                    funcName: id + "eq"
                });
                exports[id + "seq"] = makeOp({
                    args: ["array", "scalar"],
                    body: {
                        args: ["a", "s"],
                        body: "a=a" + op + "s"
                    },
                    rvalue: true,
                    count: 2,
                    funcName: id + "seq"
                });
            }
        })();
        var math_unary = [
            "abs",
            "acos",
            "asin",
            "atan",
            "ceil",
            "cos",
            "exp",
            "floor",
            "log",
            "round",
            "sin",
            "sqrt",
            "tan"
        ];
        (function () {
            for (var i = 0; i < math_unary.length; ++i) {
                var f = math_unary[i];
                exports[f] = makeOp({
                    args: ["array", "array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b"], body: "a=this_f(b)", thisVars: ["this_f"] },
                    funcName: f
                });
                exports[f + "eq"] = makeOp({
                    args: ["array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a"], body: "a=this_f(a)", thisVars: ["this_f"] },
                    rvalue: true,
                    count: 2,
                    funcName: f + "eq"
                });
            }
        })();
        var math_comm = [
            "max",
            "min",
            "atan2",
            "pow"
        ];
        (function () {
            for (var i = 0; i < math_comm.length; ++i) {
                var f = math_comm[i];
                exports[f] = makeOp({
                    args: ["array", "array", "array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b", "c"], body: "a=this_f(b,c)", thisVars: ["this_f"] },
                    funcName: f
                });
                exports[f + "s"] = makeOp({
                    args: ["array", "array", "scalar"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b", "c"], body: "a=this_f(b,c)", thisVars: ["this_f"] },
                    funcName: f + "s"
                });
                exports[f + "eq"] = makeOp({
                    args: ["array", "array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b"], body: "a=this_f(a,b)", thisVars: ["this_f"] },
                    rvalue: true,
                    count: 2,
                    funcName: f + "eq"
                });
                exports[f + "seq"] = makeOp({
                    args: ["array", "scalar"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b"], body: "a=this_f(a,b)", thisVars: ["this_f"] },
                    rvalue: true,
                    count: 2,
                    funcName: f + "seq"
                });
            }
        })();
        var math_noncomm = [
            "atan2",
            "pow"
        ];
        (function () {
            for (var i = 0; i < math_noncomm.length; ++i) {
                var f = math_noncomm[i];
                exports[f + "op"] = makeOp({
                    args: ["array", "array", "array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b", "c"], body: "a=this_f(c,b)", thisVars: ["this_f"] },
                    funcName: f + "op"
                });
                exports[f + "ops"] = makeOp({
                    args: ["array", "array", "scalar"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b", "c"], body: "a=this_f(c,b)", thisVars: ["this_f"] },
                    funcName: f + "ops"
                });
                exports[f + "opeq"] = makeOp({
                    args: ["array", "array"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b"], body: "a=this_f(b,a)", thisVars: ["this_f"] },
                    rvalue: true,
                    count: 2,
                    funcName: f + "opeq"
                });
                exports[f + "opseq"] = makeOp({
                    args: ["array", "scalar"],
                    pre: { args: [], body: "this_f=Math." + f, thisVars: ["this_f"] },
                    body: { args: ["a", "b"], body: "a=this_f(b,a)", thisVars: ["this_f"] },
                    rvalue: true,
                    count: 2,
                    funcName: f + "opseq"
                });
            }
        })();
        exports.any = compile({
            args: ["array"],
            pre: EmptyProc,
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "if(a){return true}", localVars: [], thisVars: [] },
            post: { args: [], localVars: [], thisVars: [], body: "return false" },
            funcName: "any"
        });
        exports.all = compile({
            args: ["array"],
            pre: EmptyProc,
            body: { args: [{ name: "x", lvalue: false, rvalue: true, count: 1 }], body: "if(!x){return false}", localVars: [], thisVars: [] },
            post: { args: [], localVars: [], thisVars: [], body: "return true" },
            funcName: "all"
        });
        exports.sum = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "this_s+=a", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
            funcName: "sum"
        });
        exports.prod = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=1" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 1 }], body: "this_s*=a", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
            funcName: "prod"
        });
        exports.norm2squared = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 2 }], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
            funcName: "norm2squared"
        });
        exports.norm2 = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 2 }], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return Math.sqrt(this_s)" },
            funcName: "norm2"
        });
        exports.norminf = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 4 }], body: "if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
            funcName: "norminf"
        });
        exports.norm1 = compile({
            args: ["array"],
            pre: { args: [], localVars: [], thisVars: ["this_s"], body: "this_s=0" },
            body: { args: [{ name: "a", lvalue: false, rvalue: true, count: 3 }], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"] },
            post: { args: [], localVars: [], thisVars: ["this_s"], body: "return this_s" },
            funcName: "norm1"
        });
        exports.sup = compile({
            args: ["array"],
            pre: {
                body: "this_h=-Infinity",
                args: [],
                thisVars: ["this_h"],
                localVars: []
            },
            body: {
                body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
                args: [{ "name": "_inline_1_arg0_", "lvalue": false, "rvalue": true, "count": 2 }],
                thisVars: ["this_h"],
                localVars: []
            },
            post: {
                body: "return this_h",
                args: [],
                thisVars: ["this_h"],
                localVars: []
            }
        });
        exports.inf = compile({
            args: ["array"],
            pre: {
                body: "this_h=Infinity",
                args: [],
                thisVars: ["this_h"],
                localVars: []
            },
            body: {
                body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
                args: [{ "name": "_inline_1_arg0_", "lvalue": false, "rvalue": true, "count": 2 }],
                thisVars: ["this_h"],
                localVars: []
            },
            post: {
                body: "return this_h",
                args: [],
                thisVars: ["this_h"],
                localVars: []
            }
        });
        exports.argmin = compile({
            args: ["index", "array", "shape"],
            pre: {
                body: "{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
                args: [
                    { name: "_inline_0_arg0_", lvalue: false, rvalue: false, count: 0 },
                    { name: "_inline_0_arg1_", lvalue: false, rvalue: false, count: 0 },
                    { name: "_inline_0_arg2_", lvalue: false, rvalue: true, count: 1 }
                ],
                thisVars: ["this_i", "this_v"],
                localVars: []
            },
            body: {
                body: "{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
                args: [
                    { name: "_inline_1_arg0_", lvalue: false, rvalue: true, count: 2 },
                    { name: "_inline_1_arg1_", lvalue: false, rvalue: true, count: 2 }
                ],
                thisVars: ["this_i", "this_v"],
                localVars: ["_inline_1_k"]
            },
            post: {
                body: "{return this_i}",
                args: [],
                thisVars: ["this_i"],
                localVars: []
            }
        });
        exports.argmax = compile({
            args: ["index", "array", "shape"],
            pre: {
                body: "{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
                args: [
                    { name: "_inline_0_arg0_", lvalue: false, rvalue: false, count: 0 },
                    { name: "_inline_0_arg1_", lvalue: false, rvalue: false, count: 0 },
                    { name: "_inline_0_arg2_", lvalue: false, rvalue: true, count: 1 }
                ],
                thisVars: ["this_i", "this_v"],
                localVars: []
            },
            body: {
                body: "{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
                args: [
                    { name: "_inline_1_arg0_", lvalue: false, rvalue: true, count: 2 },
                    { name: "_inline_1_arg1_", lvalue: false, rvalue: true, count: 2 }
                ],
                thisVars: ["this_i", "this_v"],
                localVars: ["_inline_1_k"]
            },
            post: {
                body: "{return this_i}",
                args: [],
                thisVars: ["this_i"],
                localVars: []
            }
        });
        exports.random = makeOp({
            args: ["array"],
            pre: { args: [], body: "this_f=Math.random", thisVars: ["this_f"] },
            body: { args: ["a"], body: "a=this_f()", thisVars: ["this_f"] },
            funcName: "random"
        });
        exports.assign = makeOp({
            args: ["array", "array"],
            body: { args: ["a", "b"], body: "a=b" },
            funcName: "assign"
        });
        exports.assigns = makeOp({
            args: ["array", "scalar"],
            body: { args: ["a", "b"], body: "a=b" },
            funcName: "assigns"
        });
        exports.equals = compile({
            args: ["array", "array"],
            pre: EmptyProc,
            body: {
                args: [
                    { name: "x", lvalue: false, rvalue: true, count: 1 },
                    { name: "y", lvalue: false, rvalue: true, count: 1 }
                ],
                body: "if(x!==y){return false}",
                localVars: [],
                thisVars: []
            },
            post: { args: [], localVars: [], thisVars: [], body: "return true" },
            funcName: "equals"
        });
    }
});
var EventDispatcher = class {
    constructor() {
        this._listeners = {};
    }
    addEventListener(type, listener) {
        const listeners = this._listeners;
        if (listeners[type] === void 0) {
            listeners[type] = [];
        }
        if (listeners[type].indexOf(listener) === -1) {
            listeners[type].push(listener);
        }
        return this;
    }
    removeEventListener(type, listener) {
        const listeners = this._listeners;
        const listenerArray = listeners[type];
        if (listenerArray !== void 0) {
            const index = listenerArray.indexOf(listener);
            if (index !== -1) {
                listenerArray.splice(index, 1);
            }
        }
        return this;
    }
    dispatchEvent(event) {
        const listeners = this._listeners;
        const listenerArray = listeners[event.type];
        if (listenerArray !== void 0) {
            const array = listenerArray.slice(0);
            for (let i = 0, l = array.length; i < l; i++) {
                array[i].call(this, event);
            }
        }
        return this;
    }
    dispose() {
        for (const key in this._listeners) {
            delete this._listeners[key];
        }
    }
};
var GraphEdge = class {
    constructor(_name, _parent, _child, _attributes = {}) {
        this._name = void 0;
        this._parent = void 0;
        this._child = void 0;
        this._attributes = void 0;
        this._disposed = false;
        this._name = _name;
        this._parent = _parent;
        this._child = _child;
        this._attributes = _attributes;
        if (!_parent.isOnGraph(_child)) {
            throw new Error("Cannot connect disconnected graphs.");
        }
    }
    getName() {
        return this._name;
    }
    getParent() {
        return this._parent;
    }
    getChild() {
        return this._child;
    }
    setChild(child) {
        this._child = child;
        return this;
    }
    getAttributes() {
        return this._attributes;
    }
    dispose() {
        if (this._disposed)
            return;
        this._parent._destroyRef(this);
        this._disposed = true;
    }
    isDisposed() {
        return this._disposed;
    }
};
var Graph = class extends EventDispatcher {
    constructor(...args) {
        super(...args);
        this._emptySet = new Set();
        this._edges = new Set();
        this._parentEdges = new Map();
        this._childEdges = new Map();
    }
    listEdges() {
        return Array.from(this._edges);
    }
    listParentEdges(node) {
        return Array.from(this._childEdges.get(node) || this._emptySet);
    }
    listParents(node) {
        const parentSet = new Set();
        for (const edge of this.listParentEdges(node)) {
            parentSet.add(edge.getParent());
        }
        return Array.from(parentSet);
    }
    listChildEdges(node) {
        return Array.from(this._parentEdges.get(node) || this._emptySet);
    }
    listChildren(node) {
        const childSet = new Set();
        for (const edge of this.listChildEdges(node)) {
            childSet.add(edge.getChild());
        }
        return Array.from(childSet);
    }
    disconnectParents(node, filter) {
        for (const edge of this.listParentEdges(node)) {
            if (!filter || filter(edge.getParent())) {
                edge.dispose();
            }
        }
        return this;
    }
    _createEdge(name, a2, b, attributes) {
        const edge = new GraphEdge(name, a2, b, attributes);
        this._edges.add(edge);
        const parent = edge.getParent();
        if (!this._parentEdges.has(parent))
            this._parentEdges.set(parent, new Set());
        this._parentEdges.get(parent).add(edge);
        const child = edge.getChild();
        if (!this._childEdges.has(child))
            this._childEdges.set(child, new Set());
        this._childEdges.get(child).add(edge);
        return edge;
    }
    _destroyEdge(edge) {
        this._edges.delete(edge);
        this._parentEdges.get(edge.getParent()).delete(edge);
        this._childEdges.get(edge.getChild()).delete(edge);
        return this;
    }
};
function _extends() {
    _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };
    return _extends.apply(this, arguments);
}
var RefList = class {
    constructor(refs) {
        this.list = [];
        if (refs) {
            for (const ref of refs) {
                this.list.push(ref);
            }
        }
    }
    add(ref) {
        this.list.push(ref);
    }
    remove(ref) {
        const index = this.list.indexOf(ref);
        if (index >= 0)
            this.list.splice(index, 1);
    }
    removeChild(child) {
        const refs = [];
        for (const ref of this.list) {
            if (ref.getChild() === child) {
                refs.push(ref);
            }
        }
        for (const ref of refs) {
            this.remove(ref);
        }
        return refs;
    }
    listRefsByChild(child) {
        const refs = [];
        for (const ref of this.list) {
            if (ref.getChild() === child) {
                refs.push(ref);
            }
        }
        return refs;
    }
    values() {
        return this.list;
    }
};
var RefSet = class {
    constructor(refs) {
        this.set = new Set();
        this.map = new Map();
        if (refs) {
            for (const ref of refs) {
                this.add(ref);
            }
        }
    }
    add(ref) {
        const child = ref.getChild();
        this.removeChild(child);
        this.set.add(ref);
        this.map.set(child, ref);
    }
    remove(ref) {
        this.set.delete(ref);
        this.map.delete(ref.getChild());
    }
    removeChild(child) {
        const ref = this.map.get(child) || null;
        if (ref)
            this.remove(ref);
        return ref;
    }
    getRefByChild(child) {
        return this.map.get(child) || null;
    }
    values() {
        return Array.from(this.set);
    }
};
var RefMap = class {
    constructor(map) {
        this.map = {};
        if (map) {
            Object.assign(this.map, map);
        }
    }
    set(key, child) {
        this.map[key] = child;
    }
    delete(key) {
        delete this.map[key];
    }
    get(key) {
        return this.map[key] || null;
    }
    keys() {
        return Object.keys(this.map);
    }
    values() {
        return Object.values(this.map);
    }
};
var $attributes = Symbol("attributes");
var $immutableKeys = Symbol("immutableKeys");
var GraphNode = class _GraphNode extends EventDispatcher {
    constructor(graph) {
        super();
        this._disposed = false;
        this.graph = void 0;
        this[$attributes] = void 0;
        this[$immutableKeys] = void 0;
        this.graph = graph;
        this[$immutableKeys] = new Set();
        this[$attributes] = this._createAttributes();
    }
    getDefaults() {
        return {};
    }
    _createAttributes() {
        const defaultAttributes = this.getDefaults();
        const attributes = {};
        for (const key in defaultAttributes) {
            const value = defaultAttributes[key];
            if (value instanceof _GraphNode) {
                const ref = this.graph._createEdge(key, this, value);
                this[$immutableKeys].add(key);
                attributes[key] = ref;
            }
            else {
                attributes[key] = value;
            }
        }
        return attributes;
    }
    isOnGraph(other) {
        return this.graph === other.graph;
    }
    isDisposed() {
        return this._disposed;
    }
    dispose() {
        if (this._disposed)
            return;
        this.graph.listChildEdges(this).forEach((edge) => edge.dispose());
        this.graph.disconnectParents(this);
        this._disposed = true;
        this.dispatchEvent({
            type: "dispose"
        });
    }
    detach() {
        this.graph.disconnectParents(this);
        return this;
    }
    swap(prevValue, nextValue) {
        for (const attribute in this[$attributes]) {
            const value = this[$attributes][attribute];
            if (value instanceof GraphEdge) {
                const ref = value;
                if (ref.getChild() === prevValue) {
                    this.setRef(attribute, nextValue, ref.getAttributes());
                }
            }
            else if (value instanceof RefList) {
                for (const ref of value.listRefsByChild(prevValue)) {
                    const refAttributes = ref.getAttributes();
                    this.removeRef(attribute, prevValue);
                    this.addRef(attribute, nextValue, refAttributes);
                }
            }
            else if (value instanceof RefSet) {
                const ref = value.getRefByChild(prevValue);
                if (ref) {
                    const refAttributes = ref.getAttributes();
                    this.removeRef(attribute, prevValue);
                    this.addRef(attribute, nextValue, refAttributes);
                }
            }
            else if (value instanceof RefMap) {
                for (const key of value.keys()) {
                    const ref = value.get(key);
                    if (ref.getChild() === prevValue) {
                        this.setRefMap(attribute, key, nextValue, ref.getAttributes());
                    }
                }
            }
        }
        return this;
    }
    get(attribute) {
        return this[$attributes][attribute];
    }
    set(attribute, value) {
        this[$attributes][attribute] = value;
        return this.dispatchEvent({
            type: "change",
            attribute
        });
    }
    getRef(attribute) {
        const ref = this[$attributes][attribute];
        return ref ? ref.getChild() : null;
    }
    setRef(attribute, value, attributes) {
        if (this[$immutableKeys].has(attribute)) {
            throw new Error(`Cannot overwrite immutable attribute, "${attribute}".`);
        }
        const prevRef = this[$attributes][attribute];
        if (prevRef)
            prevRef.dispose();
        if (!value)
            return this;
        const ref = this.graph._createEdge(attribute, this, value, attributes);
        this[$attributes][attribute] = ref;
        return this.dispatchEvent({
            type: "change",
            attribute
        });
    }
    listRefs(attribute) {
        const refs = this.assertRefList(attribute);
        return refs.values().map((ref) => ref.getChild());
    }
    addRef(attribute, value, attributes) {
        const ref = this.graph._createEdge(attribute, this, value, attributes);
        const refs = this.assertRefList(attribute);
        refs.add(ref);
        return this.dispatchEvent({
            type: "change",
            attribute
        });
    }
    removeRef(attribute, value) {
        const refs = this.assertRefList(attribute);
        if (refs instanceof RefList) {
            for (const ref of refs.listRefsByChild(value)) {
                ref.dispose();
            }
        }
        else {
            const ref = refs.getRefByChild(value);
            if (ref)
                ref.dispose();
        }
        return this;
    }
    assertRefList(attribute) {
        const refs = this[$attributes][attribute];
        if (refs instanceof RefList || refs instanceof RefSet) {
            return refs;
        }
        throw new Error(`Expected RefList or RefSet for attribute "${attribute}"`);
    }
    listRefMapKeys(attribute) {
        return this.assertRefMap(attribute).keys();
    }
    listRefMapValues(attribute) {
        return this.assertRefMap(attribute).values().map((ref) => ref.getChild());
    }
    getRefMap(attribute, key) {
        const refMap = this.assertRefMap(attribute);
        const ref = refMap.get(key);
        return ref ? ref.getChild() : null;
    }
    setRefMap(attribute, key, value, metadata) {
        const refMap = this.assertRefMap(attribute);
        const prevRef = refMap.get(key);
        if (prevRef)
            prevRef.dispose();
        if (!value)
            return this;
        metadata = Object.assign(metadata || {}, {
            key
        });
        const ref = this.graph._createEdge(attribute, this, value, _extends({}, metadata, {
            key
        }));
        refMap.set(key, ref);
        return this.dispatchEvent({
            type: "change",
            attribute,
            key
        });
    }
    assertRefMap(attribute) {
        const map = this[$attributes][attribute];
        if (map instanceof RefMap) {
            return map;
        }
        throw new Error(`Expected RefMap for attribute "${attribute}"`);
    }
    dispatchEvent(event) {
        super.dispatchEvent(_extends({}, event, {
            target: this
        }));
        this.graph.dispatchEvent(_extends({}, event, {
            target: this,
            type: `node:${event.type}`
        }));
        return this;
    }
    _destroyRef(ref) {
        const attribute = ref.getName();
        if (this[$attributes][attribute] === ref) {
            this[$attributes][attribute] = null;
            if (this[$immutableKeys].has(attribute))
                ref.getChild().dispose();
        }
        else if (this[$attributes][attribute] instanceof RefList) {
            this[$attributes][attribute].remove(ref);
        }
        else if (this[$attributes][attribute] instanceof RefSet) {
            this[$attributes][attribute].remove(ref);
        }
        else if (this[$attributes][attribute] instanceof RefMap) {
            const refMap = this[$attributes][attribute];
            for (const key of refMap.keys()) {
                if (refMap.get(key) === ref) {
                    refMap.delete(key);
                }
            }
        }
        else {
            return;
        }
        this.graph._destroyEdge(ref);
        this.dispatchEvent({
            type: "change",
            attribute
        });
    }
};
var VERSION = `v${"4.1.3"}`;
var GLB_BUFFER = "@glb.bin";
var PropertyType;
(function (PropertyType2) {
    PropertyType2["ACCESSOR"] = "Accessor";
    PropertyType2["ANIMATION"] = "Animation";
    PropertyType2["ANIMATION_CHANNEL"] = "AnimationChannel";
    PropertyType2["ANIMATION_SAMPLER"] = "AnimationSampler";
    PropertyType2["BUFFER"] = "Buffer";
    PropertyType2["CAMERA"] = "Camera";
    PropertyType2["MATERIAL"] = "Material";
    PropertyType2["MESH"] = "Mesh";
    PropertyType2["PRIMITIVE"] = "Primitive";
    PropertyType2["PRIMITIVE_TARGET"] = "PrimitiveTarget";
    PropertyType2["NODE"] = "Node";
    PropertyType2["ROOT"] = "Root";
    PropertyType2["SCENE"] = "Scene";
    PropertyType2["SKIN"] = "Skin";
    PropertyType2["TEXTURE"] = "Texture";
    PropertyType2["TEXTURE_INFO"] = "TextureInfo";
})(PropertyType || (PropertyType = {}));
var VertexLayout;
(function (VertexLayout2) {
    VertexLayout2["INTERLEAVED"] = "interleaved";
    VertexLayout2["SEPARATE"] = "separate";
})(VertexLayout || (VertexLayout = {}));
var BufferViewUsage$1;
(function (BufferViewUsage2) {
    BufferViewUsage2["ARRAY_BUFFER"] = "ARRAY_BUFFER";
    BufferViewUsage2["ELEMENT_ARRAY_BUFFER"] = "ELEMENT_ARRAY_BUFFER";
    BufferViewUsage2["INVERSE_BIND_MATRICES"] = "INVERSE_BIND_MATRICES";
    BufferViewUsage2["OTHER"] = "OTHER";
    BufferViewUsage2["SPARSE"] = "SPARSE";
})(BufferViewUsage$1 || (BufferViewUsage$1 = {}));
var TextureChannel;
(function (TextureChannel2) {
    TextureChannel2[TextureChannel2["R"] = 4096] = "R";
    TextureChannel2[TextureChannel2["G"] = 256] = "G";
    TextureChannel2[TextureChannel2["B"] = 16] = "B";
    TextureChannel2[TextureChannel2["A"] = 1] = "A";
})(TextureChannel || (TextureChannel = {}));
var Format;
(function (Format2) {
    Format2["GLTF"] = "GLTF";
    Format2["GLB"] = "GLB";
})(Format || (Format = {}));
var ComponentTypeToTypedArray = {
    "5120": Int8Array,
    "5121": Uint8Array,
    "5122": Int16Array,
    "5123": Uint16Array,
    "5125": Uint32Array,
    "5126": Float32Array
};
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
if (!Math.hypot)
    Math.hypot = function () {
        var y = 0, i = arguments.length;
        while (i--) {
            y += arguments[i] * arguments[i];
        }
        return Math.sqrt(y);
    };
function create() {
    var out = new ARRAY_TYPE(3);
    if (ARRAY_TYPE != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
    }
    return out;
}
function length(a2) {
    var x = a2[0];
    var y = a2[1];
    var z = a2[2];
    return Math.hypot(x, y, z);
}
function transformMat4(out, a2, m) {
    var x = a2[0], y = a2[1], z = a2[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
}
(function () {
    var vec = create();
    return function (a2, stride, offset, count, fn, arg) {
        var i, l;
        if (!stride) {
            stride = 3;
        }
        if (!offset) {
            offset = 0;
        }
        if (count) {
            l = Math.min(count * stride + offset, a2.length);
        }
        else {
            l = a2.length;
        }
        for (i = offset; i < l; i += stride) {
            vec[0] = a2[i];
            vec[1] = a2[i + 1];
            vec[2] = a2[i + 2];
            fn(vec, vec, arg);
            a2[i] = vec[0];
            a2[i + 1] = vec[1];
            a2[i + 2] = vec[2];
        }
        return a2;
    };
})();
function getBounds(node) {
    const resultBounds = createBounds();
    const parents = node.propertyType === PropertyType.NODE ? [node] : node.listChildren();
    for (const parent of parents) {
        parent.traverse((node2) => {
            const mesh = node2.getMesh();
            if (!mesh)
                return;
            const meshBounds = getMeshBounds(mesh, node2.getWorldMatrix());
            if (meshBounds.min.every(isFinite) && meshBounds.max.every(isFinite)) {
                expandBounds(meshBounds.min, resultBounds);
                expandBounds(meshBounds.max, resultBounds);
            }
        });
    }
    return resultBounds;
}
function getMeshBounds(mesh, worldMatrix) {
    const meshBounds = createBounds();
    for (const prim of mesh.listPrimitives()) {
        const position = prim.getAttribute("POSITION");
        const indices = prim.getIndices();
        if (!position)
            continue;
        let localPos = [0, 0, 0];
        let worldPos = [0, 0, 0];
        for (let i = 0, il = indices ? indices.getCount() : position.getCount(); i < il; i++) {
            const index = indices ? indices.getScalar(i) : i;
            localPos = position.getElement(index, localPos);
            worldPos = transformMat4(worldPos, localPos, worldMatrix);
            expandBounds(worldPos, meshBounds);
        }
    }
    return meshBounds;
}
function expandBounds(point, target) {
    for (let i = 0; i < 3; i++) {
        target.min[i] = Math.min(point[i], target.min[i]);
        target.max[i] = Math.max(point[i], target.max[i]);
    }
}
function createBounds() {
    return {
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity]
    };
}
var BufferUtils = class {
    static createBufferFromDataURI(dataURI) {
        if (typeof Buffer === "undefined") {
            const byteString = atob(dataURI.split(",")[1]);
            const ia = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return ia;
        }
        else {
            const data = dataURI.split(",")[1];
            const isBase64 = dataURI.indexOf("base64") >= 0;
            return Buffer.from(data, isBase64 ? "base64" : "utf8");
        }
    }
    static encodeText(text) {
        return new TextEncoder().encode(text);
    }
    static decodeText(array) {
        return new TextDecoder().decode(array);
    }
    static concat(arrays) {
        let totalByteLength = 0;
        for (const array of arrays) {
            totalByteLength += array.byteLength;
        }
        const result = new Uint8Array(totalByteLength);
        let byteOffset = 0;
        for (const array of arrays) {
            result.set(array, byteOffset);
            byteOffset += array.byteLength;
        }
        return result;
    }
    static pad(srcArray, paddingByte = 0) {
        const paddedLength = this.padNumber(srcArray.byteLength);
        if (paddedLength === srcArray.byteLength)
            return srcArray;
        const dstArray = new Uint8Array(paddedLength);
        dstArray.set(srcArray);
        if (paddingByte !== 0) {
            for (let i = srcArray.byteLength; i < paddedLength; i++) {
                dstArray[i] = paddingByte;
            }
        }
        return dstArray;
    }
    static padNumber(v) {
        return Math.ceil(v / 4) * 4;
    }
    static equals(a2, b) {
        if (a2 === b)
            return true;
        if (a2.byteLength !== b.byteLength)
            return false;
        let i = a2.byteLength;
        while (i--) {
            if (a2[i] !== b[i])
                return false;
        }
        return true;
    }
    static toView(a2, byteOffset = 0, byteLength = Infinity) {
        return new Uint8Array(a2.buffer, a2.byteOffset + byteOffset, Math.min(a2.byteLength, byteLength));
    }
    static assertView(view) {
        if (view && !ArrayBuffer.isView(view)) {
            throw new Error(`Method requires Uint8Array parameter; received "${typeof view}".`);
        }
        return view;
    }
};
var ColorUtils = class {
    static hexToFactor(hex, target) {
        hex = Math.floor(hex);
        const _target = target;
        _target[0] = (hex >> 16 & 255) / 255;
        _target[1] = (hex >> 8 & 255) / 255;
        _target[2] = (hex & 255) / 255;
        return this.convertSRGBToLinear(target, target);
    }
    static factorToHex(factor) {
        const target = [...factor];
        const [r2, g, b] = this.convertLinearToSRGB(factor, target);
        return r2 * 255 << 16 ^ g * 255 << 8 ^ b * 255 << 0;
    }
    static convertSRGBToLinear(source, target) {
        const _source = source;
        const _target = target;
        for (let i = 0; i < 3; i++) {
            _target[i] = _source[i] < 0.04045 ? _source[i] * 0.0773993808 : Math.pow(_source[i] * 0.9478672986 + 0.0521327014, 2.4);
        }
        return target;
    }
    static convertLinearToSRGB(source, target) {
        const _source = source;
        const _target = target;
        for (let i = 0; i < 3; i++) {
            _target[i] = _source[i] < 31308e-7 ? _source[i] * 12.92 : 1.055 * Math.pow(_source[i], 0.41666) - 0.055;
        }
        return target;
    }
};
var JPEGImageUtils = class {
    match(array) {
        return array.length >= 3 && array[0] === 255 && array[1] === 216 && array[2] === 255;
    }
    getSize(array) {
        let view = new DataView(array.buffer, array.byteOffset + 4);
        let i, next;
        while (view.byteLength) {
            i = view.getUint16(0, false);
            validateJPEGBuffer(view, i);
            next = view.getUint8(i + 1);
            if (next === 192 || next === 193 || next === 194) {
                return [view.getUint16(i + 7, false), view.getUint16(i + 5, false)];
            }
            view = new DataView(array.buffer, view.byteOffset + i + 2);
        }
        throw new TypeError("Invalid JPG, no size found");
    }
    getChannels(_buffer) {
        return 3;
    }
};
var PNGImageUtils = class _PNGImageUtils {
    match(array) {
        return array.length >= 8 && array[0] === 137 && array[1] === 80 && array[2] === 78 && array[3] === 71 && array[4] === 13 && array[5] === 10 && array[6] === 26 && array[7] === 10;
    }
    getSize(array) {
        const view = new DataView(array.buffer, array.byteOffset);
        const magic = BufferUtils.decodeText(array.slice(12, 16));
        if (magic === _PNGImageUtils.PNG_FRIED_CHUNK_NAME) {
            return [view.getUint32(32, false), view.getUint32(36, false)];
        }
        return [view.getUint32(16, false), view.getUint32(20, false)];
    }
    getChannels(_buffer) {
        return 4;
    }
};
PNGImageUtils.PNG_FRIED_CHUNK_NAME = "CgBI";
var ImageUtils = class {
    static registerFormat(mimeType, impl) {
        this.impls[mimeType] = impl;
    }
    static getMimeType(buffer) {
        for (const mimeType in this.impls) {
            if (this.impls[mimeType].match(buffer)) {
                return mimeType;
            }
        }
        return null;
    }
    static getSize(buffer, mimeType) {
        if (!this.impls[mimeType])
            return null;
        return this.impls[mimeType].getSize(buffer);
    }
    static getChannels(buffer, mimeType) {
        if (!this.impls[mimeType])
            return null;
        return this.impls[mimeType].getChannels(buffer);
    }
    static getVRAMByteLength(buffer, mimeType) {
        if (!this.impls[mimeType])
            return null;
        if (this.impls[mimeType].getVRAMByteLength) {
            return this.impls[mimeType].getVRAMByteLength(buffer);
        }
        let uncompressedBytes = 0;
        const channels = 4;
        const resolution = this.getSize(buffer, mimeType);
        if (!resolution)
            return null;
        while (resolution[0] > 1 || resolution[1] > 1) {
            uncompressedBytes += resolution[0] * resolution[1] * channels;
            resolution[0] = Math.max(Math.floor(resolution[0] / 2), 1);
            resolution[1] = Math.max(Math.floor(resolution[1] / 2), 1);
        }
        uncompressedBytes += 1 * 1 * channels;
        return uncompressedBytes;
    }
    static mimeTypeToExtension(mimeType) {
        if (mimeType === "image/jpeg")
            return "jpg";
        return mimeType.split("/").pop();
    }
    static extensionToMimeType(extension) {
        if (extension === "jpg")
            return "image/jpeg";
        if (!extension)
            return "";
        return `image/${extension}`;
    }
};
ImageUtils.impls = {
    "image/jpeg": new JPEGImageUtils(),
    "image/png": new PNGImageUtils()
};
function validateJPEGBuffer(view, i) {
    if (i > view.byteLength) {
        throw new TypeError("Corrupt JPG, exceeded buffer limits");
    }
    if (view.getUint8(i) !== 255) {
        throw new TypeError("Invalid JPG, marker table corrupted");
    }
    return view;
}
var FileUtils = class {
    static basename(uri) {
        const fileName = uri.split(/[\\/]/).pop();
        return fileName.substring(0, fileName.lastIndexOf("."));
    }
    static extension(uri) {
        if (uri.startsWith("data:image/")) {
            const mimeType = uri.match(/data:(image\/\w+)/)[1];
            return ImageUtils.mimeTypeToExtension(mimeType);
        }
        else if (uri.startsWith("data:model/gltf+json")) {
            return "gltf";
        }
        else if (uri.startsWith("data:model/gltf-binary")) {
            return "glb";
        }
        else if (uri.startsWith("data:application/")) {
            return "bin";
        }
        return uri.split(/[\\/]/).pop().split(/[.]/).pop();
    }
};
function isObject(o2) {
    return Object.prototype.toString.call(o2) === "[object Object]";
}
function isPlainObject(o2) {
    if (isObject(o2) === false)
        return false;
    const ctor = o2.constructor;
    if (ctor === void 0)
        return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
        return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
        return false;
    }
    return true;
}
var _Logger;
var Verbosity;
(function (Verbosity2) {
    Verbosity2[Verbosity2["SILENT"] = 4] = "SILENT";
    Verbosity2[Verbosity2["ERROR"] = 3] = "ERROR";
    Verbosity2[Verbosity2["WARN"] = 2] = "WARN";
    Verbosity2[Verbosity2["INFO"] = 1] = "INFO";
    Verbosity2[Verbosity2["DEBUG"] = 0] = "DEBUG";
})(Verbosity || (Verbosity = {}));
var Logger = class _Logger2 {
    constructor(verbosity) {
        this.verbosity = void 0;
        this.verbosity = verbosity;
    }
    debug(text) {
        if (this.verbosity <= _Logger2.Verbosity.DEBUG) {
            console.debug(text);
        }
    }
    info(text) {
        if (this.verbosity <= _Logger2.Verbosity.INFO) {
            console.info(text);
        }
    }
    warn(text) {
        if (this.verbosity <= _Logger2.Verbosity.WARN) {
            console.warn(text);
        }
    }
    error(text) {
        if (this.verbosity <= _Logger2.Verbosity.ERROR) {
            console.error(text);
        }
    }
};
_Logger = Logger;
Logger.Verbosity = Verbosity;
Logger.DEFAULT_INSTANCE = new _Logger(_Logger.Verbosity.INFO);
function determinant(a2) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    var a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    var a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    var a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
function multiply(out, a2, b) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    var a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    var a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    var a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
}
function getScaling(out, mat) {
    var m11 = mat[0];
    var m12 = mat[1];
    var m13 = mat[2];
    var m21 = mat[4];
    var m22 = mat[5];
    var m23 = mat[6];
    var m31 = mat[8];
    var m32 = mat[9];
    var m33 = mat[10];
    out[0] = Math.hypot(m11, m12, m13);
    out[1] = Math.hypot(m21, m22, m23);
    out[2] = Math.hypot(m31, m32, m33);
    return out;
}
function getRotation(out, mat) {
    var scaling = new ARRAY_TYPE(3);
    getScaling(scaling, mat);
    var is1 = 1 / scaling[0];
    var is2 = 1 / scaling[1];
    var is3 = 1 / scaling[2];
    var sm11 = mat[0] * is1;
    var sm12 = mat[1] * is2;
    var sm13 = mat[2] * is3;
    var sm21 = mat[4] * is1;
    var sm22 = mat[5] * is2;
    var sm23 = mat[6] * is3;
    var sm31 = mat[8] * is1;
    var sm32 = mat[9] * is2;
    var sm33 = mat[10] * is3;
    var trace = sm11 + sm22 + sm33;
    var S = 0;
    if (trace > 0) {
        S = Math.sqrt(trace + 1) * 2;
        out[3] = 0.25 * S;
        out[0] = (sm23 - sm32) / S;
        out[1] = (sm31 - sm13) / S;
        out[2] = (sm12 - sm21) / S;
    }
    else if (sm11 > sm22 && sm11 > sm33) {
        S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
        out[3] = (sm23 - sm32) / S;
        out[0] = 0.25 * S;
        out[1] = (sm12 + sm21) / S;
        out[2] = (sm31 + sm13) / S;
    }
    else if (sm22 > sm33) {
        S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
        out[3] = (sm31 - sm13) / S;
        out[0] = (sm12 + sm21) / S;
        out[1] = 0.25 * S;
        out[2] = (sm23 + sm32) / S;
    }
    else {
        S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
        out[3] = (sm12 - sm21) / S;
        out[0] = (sm31 + sm13) / S;
        out[1] = (sm23 + sm32) / S;
        out[2] = 0.25 * S;
    }
    return out;
}
var MathUtils = class _MathUtils {
    static identity(v) {
        return v;
    }
    static eq(a2, b, tolerance = 1e-5) {
        if (a2.length !== b.length)
            return false;
        for (let i = 0; i < a2.length; i++) {
            if (Math.abs(a2[i] - b[i]) > tolerance)
                return false;
        }
        return true;
    }
    static clamp(value, min2, max2) {
        if (value < min2)
            return min2;
        if (value > max2)
            return max2;
        return value;
    }
    static decodeNormalizedInt(i, componentType) {
        switch (componentType) {
            case 5126:
                return i;
            case 5123:
                return i / 65535;
            case 5121:
                return i / 255;
            case 5122:
                return Math.max(i / 32767, -1);
            case 5120:
                return Math.max(i / 127, -1);
            default:
                throw new Error("Invalid component type.");
        }
    }
    static encodeNormalizedInt(f, componentType) {
        switch (componentType) {
            case 5126:
                return f;
            case 5123:
                return Math.round(_MathUtils.clamp(f, 0, 1) * 65535);
            case 5121:
                return Math.round(_MathUtils.clamp(f, 0, 1) * 255);
            case 5122:
                return Math.round(_MathUtils.clamp(f, -1, 1) * 32767);
            case 5120:
                return Math.round(_MathUtils.clamp(f, -1, 1) * 127);
            default:
                throw new Error("Invalid component type.");
        }
    }
    static decompose(srcMat, dstTranslation, dstRotation, dstScale) {
        let sx = length([srcMat[0], srcMat[1], srcMat[2]]);
        const sy = length([srcMat[4], srcMat[5], srcMat[6]]);
        const sz = length([srcMat[8], srcMat[9], srcMat[10]]);
        const det = determinant(srcMat);
        if (det < 0)
            sx = -sx;
        dstTranslation[0] = srcMat[12];
        dstTranslation[1] = srcMat[13];
        dstTranslation[2] = srcMat[14];
        const _m1 = srcMat.slice();
        const invSX = 1 / sx;
        const invSY = 1 / sy;
        const invSZ = 1 / sz;
        _m1[0] *= invSX;
        _m1[1] *= invSX;
        _m1[2] *= invSX;
        _m1[4] *= invSY;
        _m1[5] *= invSY;
        _m1[6] *= invSY;
        _m1[8] *= invSZ;
        _m1[9] *= invSZ;
        _m1[10] *= invSZ;
        getRotation(dstRotation, _m1);
        dstScale[0] = sx;
        dstScale[1] = sy;
        dstScale[2] = sz;
    }
    static compose(srcTranslation, srcRotation, srcScale, dstMat) {
        const te = dstMat;
        const x = srcRotation[0], y = srcRotation[1], z = srcRotation[2], w = srcRotation[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        const sx = srcScale[0], sy = srcScale[1], sz = srcScale[2];
        te[0] = (1 - (yy + zz)) * sx;
        te[1] = (xy + wz) * sx;
        te[2] = (xz - wy) * sx;
        te[3] = 0;
        te[4] = (xy - wz) * sy;
        te[5] = (1 - (xx + zz)) * sy;
        te[6] = (yz + wx) * sy;
        te[7] = 0;
        te[8] = (xz + wy) * sz;
        te[9] = (yz - wx) * sz;
        te[10] = (1 - (xx + yy)) * sz;
        te[11] = 0;
        te[12] = srcTranslation[0];
        te[13] = srcTranslation[1];
        te[14] = srcTranslation[2];
        te[15] = 1;
        return te;
    }
};
function equalsRef(refA, refB) {
    if (!!refA !== !!refB)
        return false;
    const a2 = refA.getChild();
    const b = refB.getChild();
    return a2 === b || a2.equals(b);
}
function equalsRefSet(refSetA, refSetB) {
    if (!!refSetA !== !!refSetB)
        return false;
    const refValuesA = refSetA.values();
    const refValuesB = refSetB.values();
    if (refValuesA.length !== refValuesB.length)
        return false;
    for (let i = 0; i < refValuesA.length; i++) {
        const a2 = refValuesA[i];
        const b = refValuesB[i];
        if (a2.getChild() === b.getChild())
            continue;
        if (!a2.getChild().equals(b.getChild()))
            return false;
    }
    return true;
}
function equalsRefMap(refMapA, refMapB) {
    if (!!refMapA !== !!refMapB)
        return false;
    const keysA = refMapA.keys();
    const keysB = refMapB.keys();
    if (keysA.length !== keysB.length)
        return false;
    for (const key of keysA) {
        const refA = refMapA.get(key);
        const refB = refMapB.get(key);
        if (!!refA !== !!refB)
            return false;
        const a2 = refA.getChild();
        const b = refB.getChild();
        if (a2 === b)
            continue;
        if (!a2.equals(b))
            return false;
    }
    return true;
}
function equalsArray(a2, b) {
    if (a2 === b)
        return true;
    if (!!a2 !== !!b || !a2 || !b)
        return false;
    if (a2.length !== b.length)
        return false;
    for (let i = 0; i < a2.length; i++) {
        if (a2[i] !== b[i])
            return false;
    }
    return true;
}
function equalsObject(_a, _b) {
    if (_a === _b)
        return true;
    if (!!_a !== !!_b)
        return false;
    if (!isPlainObject(_a) || !isPlainObject(_b)) {
        return _a === _b;
    }
    const a2 = _a;
    const b = _b;
    let numKeysA = 0;
    let numKeysB = 0;
    let key;
    for (key in a2)
        numKeysA++;
    for (key in b)
        numKeysB++;
    if (numKeysA !== numKeysB)
        return false;
    for (key in a2) {
        const valueA = a2[key];
        const valueB = b[key];
        if (isArray(valueA) && isArray(valueB)) {
            if (!equalsArray(valueA, valueB))
                return false;
        }
        else if (isPlainObject(valueA) && isPlainObject(valueB)) {
            if (!equalsObject(valueA, valueB))
                return false;
        }
        else {
            if (valueA !== valueB)
                return false;
        }
    }
    return true;
}
function isArray(value) {
    return Array.isArray(value) || ArrayBuffer.isView(value);
}
var ALPHABET = "23456789abdegjkmnpqrvwxyzABDEGJKMNPQRVWXYZ";
var UNIQUE_RETRIES = 999;
var ID_LENGTH = 6;
var previousIDs = new Set();
var generateOne = function generateOne2() {
    let rtn = "";
    for (let i = 0; i < ID_LENGTH; i++) {
        rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return rtn;
};
var uuid = function uuid2() {
    for (let retries = 0; retries < UNIQUE_RETRIES; retries++) {
        const id = generateOne();
        if (!previousIDs.has(id)) {
            previousIDs.add(id);
            return id;
        }
    }
    return "";
};
var NULL_DOMAIN = "https://null.example";
var HTTPUtils = class {
    static dirname(path) {
        const index = path.lastIndexOf("/");
        if (index === -1)
            return "./";
        return path.substring(0, index + 1);
    }
    static basename(uri) {
        return FileUtils.basename(new URL(uri, NULL_DOMAIN).pathname);
    }
    static extension(uri) {
        return FileUtils.extension(new URL(uri, NULL_DOMAIN).pathname);
    }
    static resolve(base, path) {
        if (!this.isRelativePath(path))
            return path;
        const stack = base.split("/");
        const parts = path.split("/");
        stack.pop();
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === ".")
                continue;
            if (parts[i] === "..") {
                stack.pop();
            }
            else {
                stack.push(parts[i]);
            }
        }
        return stack.join("/");
    }
    static isAbsoluteURL(path) {
        return this.PROTOCOL_REGEXP.test(path);
    }
    static isRelativePath(path) {
        return !/^(?:[a-zA-Z]+:)?\//.test(path);
    }
};
HTTPUtils.DEFAULT_INIT = {};
HTTPUtils.PROTOCOL_REGEXP = /^[a-zA-Z]+:\/\//;
var COPY_IDENTITY = (t2) => t2;
var EMPTY_SET = new Set();
var Property = class extends GraphNode {
    constructor(graph, name = "") {
        super(graph);
        this[$attributes]["name"] = name;
        this.init();
        this.dispatchEvent({
            type: "create"
        });
    }
    getGraph() {
        return this.graph;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            name: "",
            extras: {}
        });
    }
    set(attribute, value) {
        if (Array.isArray(value))
            value = value.slice();
        return super.set(attribute, value);
    }
    getName() {
        return this.get("name");
    }
    setName(name) {
        return this.set("name", name);
    }
    getExtras() {
        return this.get("extras");
    }
    setExtras(extras) {
        return this.set("extras", extras);
    }
    clone() {
        const PropertyClass = this.constructor;
        return new PropertyClass(this.graph).copy(this, COPY_IDENTITY);
    }
    copy(other, resolve = COPY_IDENTITY) {
        for (const key in this[$attributes]) {
            const value = this[$attributes][key];
            if (value instanceof GraphEdge) {
                if (!this[$immutableKeys].has(key)) {
                    value.dispose();
                }
            }
            else if (value instanceof RefList || value instanceof RefSet) {
                for (const ref of value.values()) {
                    ref.dispose();
                }
            }
            else if (value instanceof RefMap) {
                for (const ref of value.values()) {
                    ref.dispose();
                }
            }
        }
        for (const key in other[$attributes]) {
            const thisValue = this[$attributes][key];
            const otherValue = other[$attributes][key];
            if (otherValue instanceof GraphEdge) {
                if (this[$immutableKeys].has(key)) {
                    const ref = thisValue;
                    ref.getChild().copy(resolve(otherValue.getChild()), resolve);
                }
                else {
                    this.setRef(key, resolve(otherValue.getChild()), otherValue.getAttributes());
                }
            }
            else if (otherValue instanceof RefSet || otherValue instanceof RefList) {
                for (const ref of otherValue.values()) {
                    this.addRef(key, resolve(ref.getChild()), ref.getAttributes());
                }
            }
            else if (otherValue instanceof RefMap) {
                for (const subkey of otherValue.keys()) {
                    const ref = otherValue.get(subkey);
                    this.setRefMap(key, subkey, resolve(ref.getChild()), ref.getAttributes());
                }
            }
            else if (isPlainObject(otherValue)) {
                this[$attributes][key] = JSON.parse(JSON.stringify(otherValue));
            }
            else if (Array.isArray(otherValue) || otherValue instanceof ArrayBuffer || ArrayBuffer.isView(otherValue)) {
                this[$attributes][key] = otherValue.slice();
            }
            else {
                this[$attributes][key] = otherValue;
            }
        }
        return this;
    }
    equals(other, skip = EMPTY_SET) {
        if (this === other)
            return true;
        if (this.propertyType !== other.propertyType)
            return false;
        for (const key in this[$attributes]) {
            if (skip.has(key))
                continue;
            const a2 = this[$attributes][key];
            const b = other[$attributes][key];
            if (a2 instanceof GraphEdge || b instanceof GraphEdge) {
                if (!equalsRef(a2, b)) {
                    return false;
                }
            }
            else if (a2 instanceof RefSet || b instanceof RefSet || a2 instanceof RefList || b instanceof RefList) {
                if (!equalsRefSet(a2, b)) {
                    return false;
                }
            }
            else if (a2 instanceof RefMap || b instanceof RefMap) {
                if (!equalsRefMap(a2, b)) {
                    return false;
                }
            }
            else if (isPlainObject(a2) || isPlainObject(b)) {
                if (!equalsObject(a2, b))
                    return false;
            }
            else if (isArray(a2) || isArray(b)) {
                if (!equalsArray(a2, b))
                    return false;
            }
            else {
                if (a2 !== b)
                    return false;
            }
        }
        return true;
    }
    detach() {
        this.graph.disconnectParents(this, (n2) => n2.propertyType !== "Root");
        return this;
    }
    listParents() {
        return this.graph.listParents(this);
    }
};
var ExtensibleProperty = class extends Property {
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            extensions: new RefMap()
        });
    }
    getExtension(name) {
        return this.getRefMap("extensions", name);
    }
    setExtension(name, extensionProperty) {
        if (extensionProperty)
            extensionProperty._validateParent(this);
        return this.setRefMap("extensions", name, extensionProperty);
    }
    listExtensions() {
        return this.listRefMapValues("extensions");
    }
};
var Accessor = class _Accessor extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ACCESSOR;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            array: null,
            type: _Accessor.Type.SCALAR,
            componentType: _Accessor.ComponentType.FLOAT,
            normalized: false,
            sparse: false,
            buffer: null
        });
    }
    static getElementSize(type) {
        switch (type) {
            case _Accessor.Type.SCALAR:
                return 1;
            case _Accessor.Type.VEC2:
                return 2;
            case _Accessor.Type.VEC3:
                return 3;
            case _Accessor.Type.VEC4:
                return 4;
            case _Accessor.Type.MAT2:
                return 4;
            case _Accessor.Type.MAT3:
                return 9;
            case _Accessor.Type.MAT4:
                return 16;
            default:
                throw new Error("Unexpected type: " + type);
        }
    }
    static getComponentSize(componentType) {
        switch (componentType) {
            case _Accessor.ComponentType.BYTE:
                return 1;
            case _Accessor.ComponentType.UNSIGNED_BYTE:
                return 1;
            case _Accessor.ComponentType.SHORT:
                return 2;
            case _Accessor.ComponentType.UNSIGNED_SHORT:
                return 2;
            case _Accessor.ComponentType.UNSIGNED_INT:
                return 4;
            case _Accessor.ComponentType.FLOAT:
                return 4;
            default:
                throw new Error("Unexpected component type: " + componentType);
        }
    }
    getMinNormalized(target) {
        const normalized = this.getNormalized();
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        this.getMin(target);
        if (normalized) {
            for (let j = 0; j < elementSize; j++) {
                target[j] = MathUtils.decodeNormalizedInt(target[j], componentType);
            }
        }
        return target;
    }
    getMin(target) {
        const array = this.getArray();
        const count = this.getCount();
        const elementSize = this.getElementSize();
        for (let j = 0; j < elementSize; j++)
            target[j] = Infinity;
        for (let i = 0; i < count * elementSize; i += elementSize) {
            for (let j = 0; j < elementSize; j++) {
                const value = array[i + j];
                if (Number.isFinite(value)) {
                    target[j] = Math.min(target[j], value);
                }
            }
        }
        return target;
    }
    getMaxNormalized(target) {
        const normalized = this.getNormalized();
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        this.getMax(target);
        if (normalized) {
            for (let j = 0; j < elementSize; j++) {
                target[j] = MathUtils.decodeNormalizedInt(target[j], componentType);
            }
        }
        return target;
    }
    getMax(target) {
        const array = this.get("array");
        const count = this.getCount();
        const elementSize = this.getElementSize();
        for (let j = 0; j < elementSize; j++)
            target[j] = -Infinity;
        for (let i = 0; i < count * elementSize; i += elementSize) {
            for (let j = 0; j < elementSize; j++) {
                const value = array[i + j];
                if (Number.isFinite(value)) {
                    target[j] = Math.max(target[j], value);
                }
            }
        }
        return target;
    }
    getCount() {
        const array = this.get("array");
        return array ? array.length / this.getElementSize() : 0;
    }
    getType() {
        return this.get("type");
    }
    setType(type) {
        return this.set("type", type);
    }
    getElementSize() {
        return _Accessor.getElementSize(this.get("type"));
    }
    getComponentSize() {
        return this.get("array").BYTES_PER_ELEMENT;
    }
    getComponentType() {
        return this.get("componentType");
    }
    getNormalized() {
        return this.get("normalized");
    }
    setNormalized(normalized) {
        return this.set("normalized", normalized);
    }
    getScalar(index) {
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        const array = this.getArray();
        if (this.getNormalized()) {
            return MathUtils.decodeNormalizedInt(array[index * elementSize], componentType);
        }
        return array[index * elementSize];
    }
    setScalar(index, x) {
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        const array = this.getArray();
        if (this.getNormalized()) {
            array[index * elementSize] = MathUtils.encodeNormalizedInt(x, componentType);
        }
        else {
            array[index * elementSize] = x;
        }
        return this;
    }
    getElement(index, target) {
        const normalized = this.getNormalized();
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        const array = this.getArray();
        for (let i = 0; i < elementSize; i++) {
            if (normalized) {
                target[i] = MathUtils.decodeNormalizedInt(array[index * elementSize + i], componentType);
            }
            else {
                target[i] = array[index * elementSize + i];
            }
        }
        return target;
    }
    setElement(index, value) {
        const normalized = this.getNormalized();
        const elementSize = this.getElementSize();
        const componentType = this.getComponentType();
        const array = this.getArray();
        for (let i = 0; i < elementSize; i++) {
            if (normalized) {
                array[index * elementSize + i] = MathUtils.encodeNormalizedInt(value[i], componentType);
            }
            else {
                array[index * elementSize + i] = value[i];
            }
        }
        return this;
    }
    getSparse() {
        return this.get("sparse");
    }
    setSparse(sparse2) {
        return this.set("sparse", sparse2);
    }
    getBuffer() {
        return this.getRef("buffer");
    }
    setBuffer(buffer) {
        return this.setRef("buffer", buffer);
    }
    getArray() {
        return this.get("array");
    }
    setArray(array) {
        this.set("componentType", array ? arrayToComponentType(array) : _Accessor.ComponentType.FLOAT);
        this.set("array", array);
        return this;
    }
    getByteLength() {
        const array = this.get("array");
        return array ? array.byteLength : 0;
    }
};
Accessor.Type = {
    SCALAR: "SCALAR",
    VEC2: "VEC2",
    VEC3: "VEC3",
    VEC4: "VEC4",
    MAT2: "MAT2",
    MAT3: "MAT3",
    MAT4: "MAT4"
};
Accessor.ComponentType = {
    BYTE: 5120,
    UNSIGNED_BYTE: 5121,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    FLOAT: 5126
};
function arrayToComponentType(array) {
    switch (array.constructor) {
        case Float32Array:
            return Accessor.ComponentType.FLOAT;
        case Uint32Array:
            return Accessor.ComponentType.UNSIGNED_INT;
        case Uint16Array:
            return Accessor.ComponentType.UNSIGNED_SHORT;
        case Uint8Array:
            return Accessor.ComponentType.UNSIGNED_BYTE;
        case Int16Array:
            return Accessor.ComponentType.SHORT;
        case Int8Array:
            return Accessor.ComponentType.BYTE;
        default:
            throw new Error("Unknown accessor componentType.");
    }
}
var Animation = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ANIMATION;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            channels: new RefSet(),
            samplers: new RefSet()
        });
    }
    addChannel(channel) {
        return this.addRef("channels", channel);
    }
    removeChannel(channel) {
        return this.removeRef("channels", channel);
    }
    listChannels() {
        return this.listRefs("channels");
    }
    addSampler(sampler) {
        return this.addRef("samplers", sampler);
    }
    removeSampler(sampler) {
        return this.removeRef("samplers", sampler);
    }
    listSamplers() {
        return this.listRefs("samplers");
    }
};
var AnimationChannel = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ANIMATION_CHANNEL;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            targetPath: null,
            targetNode: null,
            sampler: null
        });
    }
    getTargetPath() {
        return this.get("targetPath");
    }
    setTargetPath(targetPath) {
        return this.set("targetPath", targetPath);
    }
    getTargetNode() {
        return this.getRef("targetNode");
    }
    setTargetNode(targetNode) {
        return this.setRef("targetNode", targetNode);
    }
    getSampler() {
        return this.getRef("sampler");
    }
    setSampler(sampler) {
        return this.setRef("sampler", sampler);
    }
};
AnimationChannel.TargetPath = {
    TRANSLATION: "translation",
    ROTATION: "rotation",
    SCALE: "scale",
    WEIGHTS: "weights"
};
var AnimationSampler = class _AnimationSampler extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ANIMATION_SAMPLER;
    }
    getDefaultAttributes() {
        return Object.assign(super.getDefaults(), {
            interpolation: _AnimationSampler.Interpolation.LINEAR,
            input: null,
            output: null
        });
    }
    getInterpolation() {
        return this.get("interpolation");
    }
    setInterpolation(interpolation) {
        return this.set("interpolation", interpolation);
    }
    getInput() {
        return this.getRef("input");
    }
    setInput(input) {
        return this.setRef("input", input, {
            usage: BufferViewUsage$1.OTHER
        });
    }
    getOutput() {
        return this.getRef("output");
    }
    setOutput(output) {
        return this.setRef("output", output, {
            usage: BufferViewUsage$1.OTHER
        });
    }
};
AnimationSampler.Interpolation = {
    LINEAR: "LINEAR",
    STEP: "STEP",
    CUBICSPLINE: "CUBICSPLINE"
};
var Buffer$1 = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.BUFFER;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            uri: ""
        });
    }
    getURI() {
        return this.get("uri");
    }
    setURI(uri) {
        return this.set("uri", uri);
    }
};
var Camera = class _Camera extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.CAMERA;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            type: _Camera.Type.PERSPECTIVE,
            znear: 0.1,
            zfar: 100,
            aspectRatio: null,
            yfov: Math.PI * 2 * 50 / 360,
            xmag: 1,
            ymag: 1
        });
    }
    getType() {
        return this.get("type");
    }
    setType(type) {
        return this.set("type", type);
    }
    getZNear() {
        return this.get("znear");
    }
    setZNear(znear) {
        return this.set("znear", znear);
    }
    getZFar() {
        return this.get("zfar");
    }
    setZFar(zfar) {
        return this.set("zfar", zfar);
    }
    getAspectRatio() {
        return this.get("aspectRatio");
    }
    setAspectRatio(aspectRatio) {
        return this.set("aspectRatio", aspectRatio);
    }
    getYFov() {
        return this.get("yfov");
    }
    setYFov(yfov) {
        return this.set("yfov", yfov);
    }
    getXMag() {
        return this.get("xmag");
    }
    setXMag(xmag) {
        return this.set("xmag", xmag);
    }
    getYMag() {
        return this.get("ymag");
    }
    setYMag(ymag) {
        return this.set("ymag", ymag);
    }
};
Camera.Type = {
    PERSPECTIVE: "perspective",
    ORTHOGRAPHIC: "orthographic"
};
var ExtensionProperty = class extends Property {
    _validateParent(parent) {
        if (!this.parentTypes.includes(parent.propertyType)) {
            throw new Error(`Parent "${parent.propertyType}" invalid for child "${this.propertyType}".`);
        }
    }
};
ExtensionProperty.EXTENSION_NAME = void 0;
var TextureInfo = class _TextureInfo extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.TEXTURE_INFO;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            texCoord: 0,
            magFilter: null,
            minFilter: null,
            wrapS: _TextureInfo.WrapMode.REPEAT,
            wrapT: _TextureInfo.WrapMode.REPEAT
        });
    }
    getTexCoord() {
        return this.get("texCoord");
    }
    setTexCoord(texCoord) {
        return this.set("texCoord", texCoord);
    }
    getMagFilter() {
        return this.get("magFilter");
    }
    setMagFilter(magFilter) {
        return this.set("magFilter", magFilter);
    }
    getMinFilter() {
        return this.get("minFilter");
    }
    setMinFilter(minFilter) {
        return this.set("minFilter", minFilter);
    }
    getWrapS() {
        return this.get("wrapS");
    }
    setWrapS(wrapS) {
        return this.set("wrapS", wrapS);
    }
    getWrapT() {
        return this.get("wrapT");
    }
    setWrapT(wrapT) {
        return this.set("wrapT", wrapT);
    }
};
TextureInfo.WrapMode = {
    CLAMP_TO_EDGE: 33071,
    MIRRORED_REPEAT: 33648,
    REPEAT: 10497
};
TextureInfo.MagFilter = {
    NEAREST: 9728,
    LINEAR: 9729
};
TextureInfo.MinFilter = {
    NEAREST: 9728,
    LINEAR: 9729,
    NEAREST_MIPMAP_NEAREST: 9984,
    LINEAR_MIPMAP_NEAREST: 9985,
    NEAREST_MIPMAP_LINEAR: 9986,
    LINEAR_MIPMAP_LINEAR: 9987
};
var { R, G, B, A } = TextureChannel;
var Material = class _Material extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.MATERIAL;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            alphaMode: _Material.AlphaMode.OPAQUE,
            alphaCutoff: 0.5,
            doubleSided: false,
            baseColorFactor: [1, 1, 1, 1],
            baseColorTexture: null,
            baseColorTextureInfo: new TextureInfo(this.graph, "baseColorTextureInfo"),
            emissiveFactor: [0, 0, 0],
            emissiveTexture: null,
            emissiveTextureInfo: new TextureInfo(this.graph, "emissiveTextureInfo"),
            normalScale: 1,
            normalTexture: null,
            normalTextureInfo: new TextureInfo(this.graph, "normalTextureInfo"),
            occlusionStrength: 1,
            occlusionTexture: null,
            occlusionTextureInfo: new TextureInfo(this.graph, "occlusionTextureInfo"),
            roughnessFactor: 1,
            metallicFactor: 1,
            metallicRoughnessTexture: null,
            metallicRoughnessTextureInfo: new TextureInfo(this.graph, "metallicRoughnessTextureInfo")
        });
    }
    getDoubleSided() {
        return this.get("doubleSided");
    }
    setDoubleSided(doubleSided) {
        return this.set("doubleSided", doubleSided);
    }
    getAlpha() {
        return this.get("baseColorFactor")[3];
    }
    setAlpha(alpha) {
        const baseColorFactor = this.get("baseColorFactor").slice();
        baseColorFactor[3] = alpha;
        return this.set("baseColorFactor", baseColorFactor);
    }
    getAlphaMode() {
        return this.get("alphaMode");
    }
    setAlphaMode(alphaMode) {
        return this.set("alphaMode", alphaMode);
    }
    getAlphaCutoff() {
        return this.get("alphaCutoff");
    }
    setAlphaCutoff(alphaCutoff) {
        return this.set("alphaCutoff", alphaCutoff);
    }
    getBaseColorFactor() {
        return this.get("baseColorFactor");
    }
    setBaseColorFactor(baseColorFactor) {
        return this.set("baseColorFactor", baseColorFactor);
    }
    getBaseColorTexture() {
        return this.getRef("baseColorTexture");
    }
    getBaseColorTextureInfo() {
        return this.getRef("baseColorTexture") ? this.getRef("baseColorTextureInfo") : null;
    }
    setBaseColorTexture(texture) {
        return this.setRef("baseColorTexture", texture, {
            channels: R | G | B | A,
            isColor: true
        });
    }
    getEmissiveFactor() {
        return this.get("emissiveFactor");
    }
    setEmissiveFactor(emissiveFactor) {
        return this.set("emissiveFactor", emissiveFactor);
    }
    getEmissiveTexture() {
        return this.getRef("emissiveTexture");
    }
    getEmissiveTextureInfo() {
        return this.getRef("emissiveTexture") ? this.getRef("emissiveTextureInfo") : null;
    }
    setEmissiveTexture(texture) {
        return this.setRef("emissiveTexture", texture, {
            channels: R | G | B,
            isColor: true
        });
    }
    getNormalScale() {
        return this.get("normalScale");
    }
    setNormalScale(scale2) {
        return this.set("normalScale", scale2);
    }
    getNormalTexture() {
        return this.getRef("normalTexture");
    }
    getNormalTextureInfo() {
        return this.getRef("normalTexture") ? this.getRef("normalTextureInfo") : null;
    }
    setNormalTexture(texture) {
        return this.setRef("normalTexture", texture, {
            channels: R | G | B
        });
    }
    getOcclusionStrength() {
        return this.get("occlusionStrength");
    }
    setOcclusionStrength(strength) {
        return this.set("occlusionStrength", strength);
    }
    getOcclusionTexture() {
        return this.getRef("occlusionTexture");
    }
    getOcclusionTextureInfo() {
        return this.getRef("occlusionTexture") ? this.getRef("occlusionTextureInfo") : null;
    }
    setOcclusionTexture(texture) {
        return this.setRef("occlusionTexture", texture, {
            channels: R
        });
    }
    getRoughnessFactor() {
        return this.get("roughnessFactor");
    }
    setRoughnessFactor(factor) {
        return this.set("roughnessFactor", factor);
    }
    getMetallicFactor() {
        return this.get("metallicFactor");
    }
    setMetallicFactor(factor) {
        return this.set("metallicFactor", factor);
    }
    getMetallicRoughnessTexture() {
        return this.getRef("metallicRoughnessTexture");
    }
    getMetallicRoughnessTextureInfo() {
        return this.getRef("metallicRoughnessTexture") ? this.getRef("metallicRoughnessTextureInfo") : null;
    }
    setMetallicRoughnessTexture(texture) {
        return this.setRef("metallicRoughnessTexture", texture, {
            channels: G | B
        });
    }
};
Material.AlphaMode = {
    OPAQUE: "OPAQUE",
    MASK: "MASK",
    BLEND: "BLEND"
};
var Mesh = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.MESH;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            weights: [],
            primitives: new RefSet()
        });
    }
    addPrimitive(primitive) {
        return this.addRef("primitives", primitive);
    }
    removePrimitive(primitive) {
        return this.removeRef("primitives", primitive);
    }
    listPrimitives() {
        return this.listRefs("primitives");
    }
    getWeights() {
        return this.get("weights");
    }
    setWeights(weights) {
        return this.set("weights", weights);
    }
};
var Node = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.NODE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            translation: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
            weights: [],
            camera: null,
            mesh: null,
            skin: null,
            children: new RefSet()
        });
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY)
            throw new Error("Node cannot be copied.");
        return super.copy(other, resolve);
    }
    getTranslation() {
        return this.get("translation");
    }
    getRotation() {
        return this.get("rotation");
    }
    getScale() {
        return this.get("scale");
    }
    setTranslation(translation) {
        return this.set("translation", translation);
    }
    setRotation(rotation) {
        return this.set("rotation", rotation);
    }
    setScale(scale2) {
        return this.set("scale", scale2);
    }
    getMatrix() {
        return MathUtils.compose(this.get("translation"), this.get("rotation"), this.get("scale"), []);
    }
    setMatrix(matrix) {
        const translation = this.get("translation").slice();
        const rotation = this.get("rotation").slice();
        const scale2 = this.get("scale").slice();
        MathUtils.decompose(matrix, translation, rotation, scale2);
        return this.set("translation", translation).set("rotation", rotation).set("scale", scale2);
    }
    getWorldTranslation() {
        const t2 = [0, 0, 0];
        MathUtils.decompose(this.getWorldMatrix(), t2, [0, 0, 0, 1], [1, 1, 1]);
        return t2;
    }
    getWorldRotation() {
        const r2 = [0, 0, 0, 1];
        MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], r2, [1, 1, 1]);
        return r2;
    }
    getWorldScale() {
        const s2 = [1, 1, 1];
        MathUtils.decompose(this.getWorldMatrix(), [0, 0, 0], [0, 0, 0, 1], s2);
        return s2;
    }
    getWorldMatrix() {
        const ancestors = [];
        for (let node = this; node != null; node = node.getParentNode()) {
            ancestors.push(node);
        }
        let ancestor;
        const worldMatrix = ancestors.pop().getMatrix();
        while (ancestor = ancestors.pop()) {
            multiply(worldMatrix, worldMatrix, ancestor.getMatrix());
        }
        return worldMatrix;
    }
    addChild(child) {
        const parentNode = child.getParentNode();
        if (parentNode)
            parentNode.removeChild(child);
        for (const parent of child.listParents()) {
            if (parent.propertyType === PropertyType.SCENE) {
                parent.removeChild(child);
            }
        }
        return this.addRef("children", child);
    }
    removeChild(child) {
        return this.removeRef("children", child);
    }
    listChildren() {
        return this.listRefs("children");
    }
    getParentNode() {
        for (const parent of this.listParents()) {
            if (parent.propertyType === PropertyType.NODE) {
                return parent;
            }
        }
        return null;
    }
    getMesh() {
        return this.getRef("mesh");
    }
    setMesh(mesh) {
        return this.setRef("mesh", mesh);
    }
    getCamera() {
        return this.getRef("camera");
    }
    setCamera(camera) {
        return this.setRef("camera", camera);
    }
    getSkin() {
        return this.getRef("skin");
    }
    setSkin(skin) {
        return this.setRef("skin", skin);
    }
    getWeights() {
        return this.get("weights");
    }
    setWeights(weights) {
        return this.set("weights", weights);
    }
    traverse(fn) {
        fn(this);
        for (const child of this.listChildren())
            child.traverse(fn);
        return this;
    }
};
var Primitive = class _Primitive extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.PRIMITIVE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            mode: _Primitive.Mode.TRIANGLES,
            material: null,
            indices: null,
            attributes: new RefMap(),
            targets: new RefSet()
        });
    }
    getIndices() {
        return this.getRef("indices");
    }
    setIndices(indices) {
        return this.setRef("indices", indices, {
            usage: BufferViewUsage$1.ELEMENT_ARRAY_BUFFER
        });
    }
    getAttribute(semantic) {
        return this.getRefMap("attributes", semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap("attributes", semantic, accessor, {
            usage: BufferViewUsage$1.ARRAY_BUFFER
        });
    }
    listAttributes() {
        return this.listRefMapValues("attributes");
    }
    listSemantics() {
        return this.listRefMapKeys("attributes");
    }
    getMaterial() {
        return this.getRef("material");
    }
    setMaterial(material) {
        return this.setRef("material", material);
    }
    getMode() {
        return this.get("mode");
    }
    setMode(mode) {
        return this.set("mode", mode);
    }
    listTargets() {
        return this.listRefs("targets");
    }
    addTarget(target) {
        return this.addRef("targets", target);
    }
    removeTarget(target) {
        return this.removeRef("targets", target);
    }
};
Primitive.Mode = {
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6
};
var PrimitiveTarget = class extends Property {
    init() {
        this.propertyType = PropertyType.PRIMITIVE_TARGET;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            attributes: new RefMap()
        });
    }
    getAttribute(semantic) {
        return this.getRefMap("attributes", semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap("attributes", semantic, accessor, {
            usage: BufferViewUsage$1.ARRAY_BUFFER
        });
    }
    listAttributes() {
        return this.listRefMapValues("attributes");
    }
    listSemantics() {
        return this.listRefMapKeys("attributes");
    }
};
function _extends2() {
    return _extends2 = Object.assign ? Object.assign.bind() : function (n2) {
        for (var e2 = 1; e2 < arguments.length; e2++) {
            var t2 = arguments[e2];
            for (var r2 in t2)
                ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
        }
        return n2;
    }, _extends2.apply(null, arguments);
}
var Scene = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.SCENE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            children: new RefSet()
        });
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY)
            throw new Error("Scene cannot be copied.");
        return super.copy(other, resolve);
    }
    addChild(node) {
        const parentNode = node.getParentNode();
        if (parentNode)
            parentNode.removeChild(node);
        return this.addRef("children", node);
    }
    removeChild(node) {
        return this.removeRef("children", node);
    }
    listChildren() {
        return this.listRefs("children");
    }
    traverse(fn) {
        for (const node of this.listChildren())
            node.traverse(fn);
        return this;
    }
};
var Skin = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.SKIN;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            skeleton: null,
            inverseBindMatrices: null,
            joints: new RefSet()
        });
    }
    getSkeleton() {
        return this.getRef("skeleton");
    }
    setSkeleton(skeleton) {
        return this.setRef("skeleton", skeleton);
    }
    getInverseBindMatrices() {
        return this.getRef("inverseBindMatrices");
    }
    setInverseBindMatrices(inverseBindMatrices) {
        return this.setRef("inverseBindMatrices", inverseBindMatrices, {
            usage: BufferViewUsage$1.INVERSE_BIND_MATRICES
        });
    }
    addJoint(joint) {
        return this.addRef("joints", joint);
    }
    removeJoint(joint) {
        return this.removeRef("joints", joint);
    }
    listJoints() {
        return this.listRefs("joints");
    }
};
var Texture = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.TEXTURE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            image: null,
            mimeType: "",
            uri: ""
        });
    }
    getMimeType() {
        return this.get("mimeType") || ImageUtils.extensionToMimeType(FileUtils.extension(this.get("uri")));
    }
    setMimeType(mimeType) {
        return this.set("mimeType", mimeType);
    }
    getURI() {
        return this.get("uri");
    }
    setURI(uri) {
        this.set("uri", uri);
        const mimeType = ImageUtils.extensionToMimeType(FileUtils.extension(uri));
        if (mimeType)
            this.set("mimeType", mimeType);
        return this;
    }
    getImage() {
        return this.get("image");
    }
    setImage(image) {
        return this.set("image", BufferUtils.assertView(image));
    }
    getSize() {
        const image = this.get("image");
        if (!image)
            return null;
        return ImageUtils.getSize(image, this.getMimeType());
    }
};
var Root = class extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ROOT;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            asset: {
                generator: `glTF-Transform ${VERSION}`,
                version: "2.0"
            },
            defaultScene: null,
            accessors: new RefSet(),
            animations: new RefSet(),
            buffers: new RefSet(),
            cameras: new RefSet(),
            materials: new RefSet(),
            meshes: new RefSet(),
            nodes: new RefSet(),
            scenes: new RefSet(),
            skins: new RefSet(),
            textures: new RefSet()
        });
    }
    constructor(graph) {
        super(graph);
        this._extensions = new Set();
        graph.addEventListener("node:create", (event) => {
            this._addChildOfRoot(event.target);
        });
    }
    clone() {
        throw new Error("Root cannot be cloned.");
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY)
            throw new Error("Root cannot be copied.");
        this.set("asset", _extends2({}, other.get("asset")));
        this.setName(other.getName());
        this.setExtras(_extends2({}, other.getExtras()));
        this.setDefaultScene(other.getDefaultScene() ? resolve(other.getDefaultScene()) : null);
        for (const extensionName of other.listRefMapKeys("extensions")) {
            const otherExtension = other.getExtension(extensionName);
            this.setExtension(extensionName, resolve(otherExtension));
        }
        return this;
    }
    _addChildOfRoot(child) {
        if (child instanceof Scene) {
            this.addRef("scenes", child);
        }
        else if (child instanceof Node) {
            this.addRef("nodes", child);
        }
        else if (child instanceof Camera) {
            this.addRef("cameras", child);
        }
        else if (child instanceof Skin) {
            this.addRef("skins", child);
        }
        else if (child instanceof Mesh) {
            this.addRef("meshes", child);
        }
        else if (child instanceof Material) {
            this.addRef("materials", child);
        }
        else if (child instanceof Texture) {
            this.addRef("textures", child);
        }
        else if (child instanceof Animation) {
            this.addRef("animations", child);
        }
        else if (child instanceof Accessor) {
            this.addRef("accessors", child);
        }
        else if (child instanceof Buffer$1) {
            this.addRef("buffers", child);
        }
        return this;
    }
    getAsset() {
        return this.get("asset");
    }
    listExtensionsUsed() {
        return Array.from(this._extensions);
    }
    listExtensionsRequired() {
        return this.listExtensionsUsed().filter((extension) => extension.isRequired());
    }
    _enableExtension(extension) {
        this._extensions.add(extension);
        return this;
    }
    _disableExtension(extension) {
        this._extensions.delete(extension);
        return this;
    }
    listScenes() {
        return this.listRefs("scenes");
    }
    setDefaultScene(defaultScene) {
        return this.setRef("defaultScene", defaultScene);
    }
    getDefaultScene() {
        return this.getRef("defaultScene");
    }
    listNodes() {
        return this.listRefs("nodes");
    }
    listCameras() {
        return this.listRefs("cameras");
    }
    listSkins() {
        return this.listRefs("skins");
    }
    listMeshes() {
        return this.listRefs("meshes");
    }
    listMaterials() {
        return this.listRefs("materials");
    }
    listTextures() {
        return this.listRefs("textures");
    }
    listAnimations() {
        return this.listRefs("animations");
    }
    listAccessors() {
        return this.listRefs("accessors");
    }
    listBuffers() {
        return this.listRefs("buffers");
    }
};
var Document = class _Document {
    static fromGraph(graph) {
        return _Document._GRAPH_DOCUMENTS.get(graph) || null;
    }
    constructor() {
        this._graph = new Graph();
        this._root = new Root(this._graph);
        this._logger = Logger.DEFAULT_INSTANCE;
        _Document._GRAPH_DOCUMENTS.set(this._graph, this);
    }
    getRoot() {
        return this._root;
    }
    getGraph() {
        return this._graph;
    }
    getLogger() {
        return this._logger;
    }
    setLogger(logger) {
        this._logger = logger;
        return this;
    }
    clone() {
        throw new Error(`Use 'cloneDocument(source)' from '@gltf-transform/functions'.`);
    }
    merge(_other) {
        throw new Error(`Use 'mergeDocuments(target, source)' from '@gltf-transform/functions'.`);
    }
    async transform(...transforms) {
        const stack = transforms.map((fn) => fn.name);
        for (const transform of transforms) {
            await transform(this, {
                stack
            });
        }
        return this;
    }
    createExtension(ctor) {
        const extensionName = ctor.EXTENSION_NAME;
        const prevExtension = this.getRoot().listExtensionsUsed().find((ext) => ext.extensionName === extensionName);
        return prevExtension || new ctor(this);
    }
    createScene(name = "") {
        return new Scene(this._graph, name);
    }
    createNode(name = "") {
        return new Node(this._graph, name);
    }
    createCamera(name = "") {
        return new Camera(this._graph, name);
    }
    createSkin(name = "") {
        return new Skin(this._graph, name);
    }
    createMesh(name = "") {
        return new Mesh(this._graph, name);
    }
    createPrimitive() {
        return new Primitive(this._graph);
    }
    createPrimitiveTarget(name = "") {
        return new PrimitiveTarget(this._graph, name);
    }
    createMaterial(name = "") {
        return new Material(this._graph, name);
    }
    createTexture(name = "") {
        return new Texture(this._graph, name);
    }
    createAnimation(name = "") {
        return new Animation(this._graph, name);
    }
    createAnimationChannel(name = "") {
        return new AnimationChannel(this._graph, name);
    }
    createAnimationSampler(name = "") {
        return new AnimationSampler(this._graph, name);
    }
    createAccessor(name = "", buffer = null) {
        if (!buffer) {
            buffer = this.getRoot().listBuffers()[0];
        }
        return new Accessor(this._graph, name).setBuffer(buffer);
    }
    createBuffer(name = "") {
        return new Buffer$1(this._graph, name);
    }
};
Document._GRAPH_DOCUMENTS = new WeakMap();
var Extension = class {
    constructor(document) {
        this.extensionName = "";
        this.prereadTypes = [];
        this.prewriteTypes = [];
        this.readDependencies = [];
        this.writeDependencies = [];
        this.document = void 0;
        this.required = false;
        this.properties = new Set();
        this._listener = void 0;
        this.document = document;
        document.getRoot()._enableExtension(this);
        this._listener = (_event) => {
            const event = _event;
            const target = event.target;
            if (target instanceof ExtensionProperty && target.extensionName === this.extensionName) {
                if (event.type === "node:create")
                    this._addExtensionProperty(target);
                if (event.type === "node:dispose")
                    this._removeExtensionProperty(target);
            }
        };
        const graph = document.getGraph();
        graph.addEventListener("node:create", this._listener);
        graph.addEventListener("node:dispose", this._listener);
    }
    dispose() {
        this.document.getRoot()._disableExtension(this);
        const graph = this.document.getGraph();
        graph.removeEventListener("node:create", this._listener);
        graph.removeEventListener("node:dispose", this._listener);
        for (const property of this.properties) {
            property.dispose();
        }
    }
    static register() {
    }
    isRequired() {
        return this.required;
    }
    setRequired(required) {
        this.required = required;
        return this;
    }
    listProperties() {
        return Array.from(this.properties);
    }
    _addExtensionProperty(property) {
        this.properties.add(property);
        return this;
    }
    _removeExtensionProperty(property) {
        this.properties.delete(property);
        return this;
    }
    install(key, dependency) {
        return this;
    }
    preread(_readerContext, _propertyType) {
        return this;
    }
    prewrite(_writerContext, _propertyType) {
        return this;
    }
};
Extension.EXTENSION_NAME = void 0;
var ReaderContext = class {
    constructor(jsonDoc) {
        this.jsonDoc = void 0;
        this.buffers = [];
        this.bufferViews = [];
        this.bufferViewBuffers = [];
        this.accessors = [];
        this.textures = [];
        this.textureInfos = new Map();
        this.materials = [];
        this.meshes = [];
        this.cameras = [];
        this.nodes = [];
        this.skins = [];
        this.animations = [];
        this.scenes = [];
        this.jsonDoc = jsonDoc;
    }
    setTextureInfo(textureInfo, textureInfoDef) {
        this.textureInfos.set(textureInfo, textureInfoDef);
        if (textureInfoDef.texCoord !== void 0) {
            textureInfo.setTexCoord(textureInfoDef.texCoord);
        }
        if (textureInfoDef.extras !== void 0) {
            textureInfo.setExtras(textureInfoDef.extras);
        }
        const textureDef = this.jsonDoc.json.textures[textureInfoDef.index];
        if (textureDef.sampler === void 0)
            return;
        const samplerDef = this.jsonDoc.json.samplers[textureDef.sampler];
        if (samplerDef.magFilter !== void 0) {
            textureInfo.setMagFilter(samplerDef.magFilter);
        }
        if (samplerDef.minFilter !== void 0) {
            textureInfo.setMinFilter(samplerDef.minFilter);
        }
        if (samplerDef.wrapS !== void 0) {
            textureInfo.setWrapS(samplerDef.wrapS);
        }
        if (samplerDef.wrapT !== void 0) {
            textureInfo.setWrapT(samplerDef.wrapT);
        }
    }
};
var DEFAULT_OPTIONS = {
    logger: Logger.DEFAULT_INSTANCE,
    extensions: [],
    dependencies: {}
};
var SUPPORTED_PREREAD_TYPES = new Set([PropertyType.BUFFER, PropertyType.TEXTURE, PropertyType.MATERIAL, PropertyType.MESH, PropertyType.PRIMITIVE, PropertyType.NODE, PropertyType.SCENE]);
var GLTFReader = class {
    static read(jsonDoc, _options = DEFAULT_OPTIONS) {
        const options = _extends2({}, DEFAULT_OPTIONS, _options);
        const { json } = jsonDoc;
        const document = new Document().setLogger(options.logger);
        this.validate(jsonDoc, options);
        const context = new ReaderContext(jsonDoc);
        const assetDef = json.asset;
        const asset = document.getRoot().getAsset();
        if (assetDef.copyright)
            asset.copyright = assetDef.copyright;
        if (assetDef.extras)
            asset.extras = assetDef.extras;
        if (json.extras !== void 0) {
            document.getRoot().setExtras(_extends2({}, json.extras));
        }
        const extensionsUsed = json.extensionsUsed || [];
        const extensionsRequired = json.extensionsRequired || [];
        options.extensions.sort((a2, b) => a2.EXTENSION_NAME > b.EXTENSION_NAME ? 1 : -1);
        for (const Extension2 of options.extensions) {
            if (extensionsUsed.includes(Extension2.EXTENSION_NAME)) {
                const extension = document.createExtension(Extension2).setRequired(extensionsRequired.includes(Extension2.EXTENSION_NAME));
                const unsupportedHooks = extension.prereadTypes.filter((type) => !SUPPORTED_PREREAD_TYPES.has(type));
                if (unsupportedHooks.length) {
                    options.logger.warn(`Preread hooks for some types (${unsupportedHooks.join()}), requested by extension ${extension.extensionName}, are unsupported. Please file an issue or a PR.`);
                }
                for (const key of extension.readDependencies) {
                    extension.install(key, options.dependencies[key]);
                }
            }
        }
        const bufferDefs = json.buffers || [];
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.BUFFER)).forEach((extension) => extension.preread(context, PropertyType.BUFFER));
        context.buffers = bufferDefs.map((bufferDef) => {
            const buffer = document.createBuffer(bufferDef.name);
            if (bufferDef.extras)
                buffer.setExtras(bufferDef.extras);
            if (bufferDef.uri && bufferDef.uri.indexOf("__") !== 0) {
                buffer.setURI(bufferDef.uri);
            }
            return buffer;
        });
        const bufferViewDefs = json.bufferViews || [];
        context.bufferViewBuffers = bufferViewDefs.map((bufferViewDef, index) => {
            if (!context.bufferViews[index]) {
                const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
                const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
                const byteOffset = bufferViewDef.byteOffset || 0;
                context.bufferViews[index] = BufferUtils.toView(resource, byteOffset, bufferViewDef.byteLength);
            }
            return context.buffers[bufferViewDef.buffer];
        });
        const accessorDefs = json.accessors || [];
        context.accessors = accessorDefs.map((accessorDef) => {
            const buffer = context.bufferViewBuffers[accessorDef.bufferView];
            const accessor = document.createAccessor(accessorDef.name, buffer).setType(accessorDef.type);
            if (accessorDef.extras)
                accessor.setExtras(accessorDef.extras);
            if (accessorDef.normalized !== void 0) {
                accessor.setNormalized(accessorDef.normalized);
            }
            if (accessorDef.bufferView === void 0)
                return accessor;
            accessor.setArray(getAccessorArray(accessorDef, context));
            return accessor;
        });
        const imageDefs = json.images || [];
        const textureDefs = json.textures || [];
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.TEXTURE)).forEach((extension) => extension.preread(context, PropertyType.TEXTURE));
        context.textures = imageDefs.map((imageDef) => {
            const texture = document.createTexture(imageDef.name);
            if (imageDef.extras)
                texture.setExtras(imageDef.extras);
            if (imageDef.bufferView !== void 0) {
                const bufferViewDef = json.bufferViews[imageDef.bufferView];
                const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
                const bufferData = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
                const byteOffset = bufferViewDef.byteOffset || 0;
                const byteLength = bufferViewDef.byteLength;
                const imageData = bufferData.slice(byteOffset, byteOffset + byteLength);
                texture.setImage(imageData);
            }
            else if (imageDef.uri !== void 0) {
                texture.setImage(jsonDoc.resources[imageDef.uri]);
                if (imageDef.uri.indexOf("__") !== 0) {
                    texture.setURI(imageDef.uri);
                }
            }
            if (imageDef.mimeType !== void 0) {
                texture.setMimeType(imageDef.mimeType);
            }
            else if (imageDef.uri) {
                const extension = FileUtils.extension(imageDef.uri);
                texture.setMimeType(ImageUtils.extensionToMimeType(extension));
            }
            return texture;
        });
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.MATERIAL)).forEach((extension) => extension.preread(context, PropertyType.MATERIAL));
        const materialDefs = json.materials || [];
        context.materials = materialDefs.map((materialDef) => {
            const material = document.createMaterial(materialDef.name);
            if (materialDef.extras)
                material.setExtras(materialDef.extras);
            if (materialDef.alphaMode !== void 0) {
                material.setAlphaMode(materialDef.alphaMode);
            }
            if (materialDef.alphaCutoff !== void 0) {
                material.setAlphaCutoff(materialDef.alphaCutoff);
            }
            if (materialDef.doubleSided !== void 0) {
                material.setDoubleSided(materialDef.doubleSided);
            }
            const pbrDef = materialDef.pbrMetallicRoughness || {};
            if (pbrDef.baseColorFactor !== void 0) {
                material.setBaseColorFactor(pbrDef.baseColorFactor);
            }
            if (materialDef.emissiveFactor !== void 0) {
                material.setEmissiveFactor(materialDef.emissiveFactor);
            }
            if (pbrDef.metallicFactor !== void 0) {
                material.setMetallicFactor(pbrDef.metallicFactor);
            }
            if (pbrDef.roughnessFactor !== void 0) {
                material.setRoughnessFactor(pbrDef.roughnessFactor);
            }
            if (pbrDef.baseColorTexture !== void 0) {
                const textureInfoDef = pbrDef.baseColorTexture;
                const texture = context.textures[textureDefs[textureInfoDef.index].source];
                material.setBaseColorTexture(texture);
                context.setTextureInfo(material.getBaseColorTextureInfo(), textureInfoDef);
            }
            if (materialDef.emissiveTexture !== void 0) {
                const textureInfoDef = materialDef.emissiveTexture;
                const texture = context.textures[textureDefs[textureInfoDef.index].source];
                material.setEmissiveTexture(texture);
                context.setTextureInfo(material.getEmissiveTextureInfo(), textureInfoDef);
            }
            if (materialDef.normalTexture !== void 0) {
                const textureInfoDef = materialDef.normalTexture;
                const texture = context.textures[textureDefs[textureInfoDef.index].source];
                material.setNormalTexture(texture);
                context.setTextureInfo(material.getNormalTextureInfo(), textureInfoDef);
                if (materialDef.normalTexture.scale !== void 0) {
                    material.setNormalScale(materialDef.normalTexture.scale);
                }
            }
            if (materialDef.occlusionTexture !== void 0) {
                const textureInfoDef = materialDef.occlusionTexture;
                const texture = context.textures[textureDefs[textureInfoDef.index].source];
                material.setOcclusionTexture(texture);
                context.setTextureInfo(material.getOcclusionTextureInfo(), textureInfoDef);
                if (materialDef.occlusionTexture.strength !== void 0) {
                    material.setOcclusionStrength(materialDef.occlusionTexture.strength);
                }
            }
            if (pbrDef.metallicRoughnessTexture !== void 0) {
                const textureInfoDef = pbrDef.metallicRoughnessTexture;
                const texture = context.textures[textureDefs[textureInfoDef.index].source];
                material.setMetallicRoughnessTexture(texture);
                context.setTextureInfo(material.getMetallicRoughnessTextureInfo(), textureInfoDef);
            }
            return material;
        });
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.MESH)).forEach((extension) => extension.preread(context, PropertyType.MESH));
        const meshDefs = json.meshes || [];
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.PRIMITIVE)).forEach((extension) => extension.preread(context, PropertyType.PRIMITIVE));
        context.meshes = meshDefs.map((meshDef) => {
            const mesh = document.createMesh(meshDef.name);
            if (meshDef.extras)
                mesh.setExtras(meshDef.extras);
            if (meshDef.weights !== void 0) {
                mesh.setWeights(meshDef.weights);
            }
            const primitiveDefs = meshDef.primitives || [];
            primitiveDefs.forEach((primitiveDef) => {
                const primitive = document.createPrimitive();
                if (primitiveDef.extras)
                    primitive.setExtras(primitiveDef.extras);
                if (primitiveDef.material !== void 0) {
                    primitive.setMaterial(context.materials[primitiveDef.material]);
                }
                if (primitiveDef.mode !== void 0) {
                    primitive.setMode(primitiveDef.mode);
                }
                for (const [semantic, index] of Object.entries(primitiveDef.attributes || {})) {
                    primitive.setAttribute(semantic, context.accessors[index]);
                }
                if (primitiveDef.indices !== void 0) {
                    primitive.setIndices(context.accessors[primitiveDef.indices]);
                }
                const targetNames = meshDef.extras && meshDef.extras.targetNames || [];
                const targetDefs = primitiveDef.targets || [];
                targetDefs.forEach((targetDef, targetIndex) => {
                    const targetName = targetNames[targetIndex] || targetIndex.toString();
                    const target = document.createPrimitiveTarget(targetName);
                    for (const [semantic, accessorIndex] of Object.entries(targetDef)) {
                        target.setAttribute(semantic, context.accessors[accessorIndex]);
                    }
                    primitive.addTarget(target);
                });
                mesh.addPrimitive(primitive);
            });
            return mesh;
        });
        const cameraDefs = json.cameras || [];
        context.cameras = cameraDefs.map((cameraDef) => {
            const camera = document.createCamera(cameraDef.name).setType(cameraDef.type);
            if (cameraDef.extras)
                camera.setExtras(cameraDef.extras);
            if (cameraDef.type === Camera.Type.PERSPECTIVE) {
                const perspectiveDef = cameraDef.perspective;
                camera.setYFov(perspectiveDef.yfov);
                camera.setZNear(perspectiveDef.znear);
                if (perspectiveDef.zfar !== void 0) {
                    camera.setZFar(perspectiveDef.zfar);
                }
                if (perspectiveDef.aspectRatio !== void 0) {
                    camera.setAspectRatio(perspectiveDef.aspectRatio);
                }
            }
            else {
                const orthoDef = cameraDef.orthographic;
                camera.setZNear(orthoDef.znear).setZFar(orthoDef.zfar).setXMag(orthoDef.xmag).setYMag(orthoDef.ymag);
            }
            return camera;
        });
        const nodeDefs = json.nodes || [];
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.NODE)).forEach((extension) => extension.preread(context, PropertyType.NODE));
        context.nodes = nodeDefs.map((nodeDef) => {
            const node = document.createNode(nodeDef.name);
            if (nodeDef.extras)
                node.setExtras(nodeDef.extras);
            if (nodeDef.translation !== void 0) {
                node.setTranslation(nodeDef.translation);
            }
            if (nodeDef.rotation !== void 0) {
                node.setRotation(nodeDef.rotation);
            }
            if (nodeDef.scale !== void 0) {
                node.setScale(nodeDef.scale);
            }
            if (nodeDef.matrix !== void 0) {
                const translation = [0, 0, 0];
                const rotation = [0, 0, 0, 1];
                const scale2 = [1, 1, 1];
                MathUtils.decompose(nodeDef.matrix, translation, rotation, scale2);
                node.setTranslation(translation);
                node.setRotation(rotation);
                node.setScale(scale2);
            }
            if (nodeDef.weights !== void 0) {
                node.setWeights(nodeDef.weights);
            }
            return node;
        });
        const skinDefs = json.skins || [];
        context.skins = skinDefs.map((skinDef) => {
            const skin = document.createSkin(skinDef.name);
            if (skinDef.extras)
                skin.setExtras(skinDef.extras);
            if (skinDef.inverseBindMatrices !== void 0) {
                skin.setInverseBindMatrices(context.accessors[skinDef.inverseBindMatrices]);
            }
            if (skinDef.skeleton !== void 0) {
                skin.setSkeleton(context.nodes[skinDef.skeleton]);
            }
            for (const nodeIndex of skinDef.joints) {
                skin.addJoint(context.nodes[nodeIndex]);
            }
            return skin;
        });
        nodeDefs.map((nodeDef, nodeIndex) => {
            const node = context.nodes[nodeIndex];
            const children = nodeDef.children || [];
            children.forEach((childIndex) => node.addChild(context.nodes[childIndex]));
            if (nodeDef.mesh !== void 0)
                node.setMesh(context.meshes[nodeDef.mesh]);
            if (nodeDef.camera !== void 0)
                node.setCamera(context.cameras[nodeDef.camera]);
            if (nodeDef.skin !== void 0)
                node.setSkin(context.skins[nodeDef.skin]);
        });
        const animationDefs = json.animations || [];
        context.animations = animationDefs.map((animationDef) => {
            const animation = document.createAnimation(animationDef.name);
            if (animationDef.extras)
                animation.setExtras(animationDef.extras);
            const samplerDefs = animationDef.samplers || [];
            const samplers = samplerDefs.map((samplerDef) => {
                const sampler = document.createAnimationSampler().setInput(context.accessors[samplerDef.input]).setOutput(context.accessors[samplerDef.output]).setInterpolation(samplerDef.interpolation || AnimationSampler.Interpolation.LINEAR);
                if (samplerDef.extras)
                    sampler.setExtras(samplerDef.extras);
                animation.addSampler(sampler);
                return sampler;
            });
            const channels = animationDef.channels || [];
            channels.forEach((channelDef) => {
                const channel = document.createAnimationChannel().setSampler(samplers[channelDef.sampler]).setTargetPath(channelDef.target.path);
                if (channelDef.target.node !== void 0)
                    channel.setTargetNode(context.nodes[channelDef.target.node]);
                if (channelDef.extras)
                    channel.setExtras(channelDef.extras);
                animation.addChannel(channel);
            });
            return animation;
        });
        const sceneDefs = json.scenes || [];
        document.getRoot().listExtensionsUsed().filter((extension) => extension.prereadTypes.includes(PropertyType.SCENE)).forEach((extension) => extension.preread(context, PropertyType.SCENE));
        context.scenes = sceneDefs.map((sceneDef) => {
            const scene = document.createScene(sceneDef.name);
            if (sceneDef.extras)
                scene.setExtras(sceneDef.extras);
            const children = sceneDef.nodes || [];
            children.map((nodeIndex) => context.nodes[nodeIndex]).forEach((node) => scene.addChild(node));
            return scene;
        });
        if (json.scene !== void 0) {
            document.getRoot().setDefaultScene(context.scenes[json.scene]);
        }
        document.getRoot().listExtensionsUsed().forEach((extension) => extension.read(context));
        accessorDefs.forEach((accessorDef, index) => {
            const accessor = context.accessors[index];
            const hasSparseValues = !!accessorDef.sparse;
            const isZeroFilled = !accessorDef.bufferView && !accessor.getArray();
            if (hasSparseValues || isZeroFilled) {
                accessor.setSparse(true).setArray(getSparseArray(accessorDef, context));
            }
        });
        return document;
    }
    static validate(jsonDoc, options) {
        const json = jsonDoc.json;
        if (json.asset.version !== "2.0") {
            throw new Error(`Unsupported glTF version, "${json.asset.version}".`);
        }
        if (json.extensionsRequired) {
            for (const extensionName of json.extensionsRequired) {
                if (!options.extensions.find((extension) => extension.EXTENSION_NAME === extensionName)) {
                    throw new Error(`Missing required extension, "${extensionName}".`);
                }
            }
        }
        if (json.extensionsUsed) {
            for (const extensionName of json.extensionsUsed) {
                if (!options.extensions.find((extension) => extension.EXTENSION_NAME === extensionName)) {
                    options.logger.warn(`Missing optional extension, "${extensionName}".`);
                }
            }
        }
    }
};
function getInterleavedArray(accessorDef, context) {
    const jsonDoc = context.jsonDoc;
    const bufferView = context.bufferViews[accessorDef.bufferView];
    const bufferViewDef = jsonDoc.json.bufferViews[accessorDef.bufferView];
    const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
    const elementSize = Accessor.getElementSize(accessorDef.type);
    const componentSize = TypedArray.BYTES_PER_ELEMENT;
    const accessorByteOffset = accessorDef.byteOffset || 0;
    const array = new TypedArray(accessorDef.count * elementSize);
    const view = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
    const byteStride = bufferViewDef.byteStride;
    for (let i = 0; i < accessorDef.count; i++) {
        for (let j = 0; j < elementSize; j++) {
            const byteOffset = accessorByteOffset + i * byteStride + j * componentSize;
            let value;
            switch (accessorDef.componentType) {
                case Accessor.ComponentType.FLOAT:
                    value = view.getFloat32(byteOffset, true);
                    break;
                case Accessor.ComponentType.UNSIGNED_INT:
                    value = view.getUint32(byteOffset, true);
                    break;
                case Accessor.ComponentType.UNSIGNED_SHORT:
                    value = view.getUint16(byteOffset, true);
                    break;
                case Accessor.ComponentType.UNSIGNED_BYTE:
                    value = view.getUint8(byteOffset);
                    break;
                case Accessor.ComponentType.SHORT:
                    value = view.getInt16(byteOffset, true);
                    break;
                case Accessor.ComponentType.BYTE:
                    value = view.getInt8(byteOffset);
                    break;
                default:
                    throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
            }
            array[i * elementSize + j] = value;
        }
    }
    return array;
}
function getAccessorArray(accessorDef, context) {
    const jsonDoc = context.jsonDoc;
    const bufferView = context.bufferViews[accessorDef.bufferView];
    const bufferViewDef = jsonDoc.json.bufferViews[accessorDef.bufferView];
    const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
    const elementSize = Accessor.getElementSize(accessorDef.type);
    const componentSize = TypedArray.BYTES_PER_ELEMENT;
    const elementStride = elementSize * componentSize;
    if (bufferViewDef.byteStride !== void 0 && bufferViewDef.byteStride !== elementStride) {
        return getInterleavedArray(accessorDef, context);
    }
    const byteOffset = bufferView.byteOffset + (accessorDef.byteOffset || 0);
    const byteLength = accessorDef.count * elementSize * componentSize;
    return new TypedArray(bufferView.buffer.slice(byteOffset, byteOffset + byteLength));
}
function getSparseArray(accessorDef, context) {
    const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
    const elementSize = Accessor.getElementSize(accessorDef.type);
    let array;
    if (accessorDef.bufferView !== void 0) {
        array = getAccessorArray(accessorDef, context);
    }
    else {
        array = new TypedArray(accessorDef.count * elementSize);
    }
    const sparseDef = accessorDef.sparse;
    if (!sparseDef)
        return array;
    const count = sparseDef.count;
    const indicesDef = _extends2({}, accessorDef, sparseDef.indices, {
        count,
        type: "SCALAR"
    });
    const valuesDef = _extends2({}, accessorDef, sparseDef.values, {
        count
    });
    const indices = getAccessorArray(indicesDef, context);
    const values = getAccessorArray(valuesDef, context);
    for (let i = 0; i < indicesDef.count; i++) {
        for (let j = 0; j < elementSize; j++) {
            array[indices[i] * elementSize + j] = values[i * elementSize + j];
        }
    }
    return array;
}
var BufferViewTarget;
(function (BufferViewTarget2) {
    BufferViewTarget2[BufferViewTarget2["ARRAY_BUFFER"] = 34962] = "ARRAY_BUFFER";
    BufferViewTarget2[BufferViewTarget2["ELEMENT_ARRAY_BUFFER"] = 34963] = "ELEMENT_ARRAY_BUFFER";
})(BufferViewTarget || (BufferViewTarget = {}));
var WriterContext = class {
    constructor(_doc, jsonDoc, options) {
        this._doc = void 0;
        this.jsonDoc = void 0;
        this.options = void 0;
        this.accessorIndexMap = new Map();
        this.animationIndexMap = new Map();
        this.bufferIndexMap = new Map();
        this.cameraIndexMap = new Map();
        this.skinIndexMap = new Map();
        this.materialIndexMap = new Map();
        this.meshIndexMap = new Map();
        this.nodeIndexMap = new Map();
        this.imageIndexMap = new Map();
        this.textureDefIndexMap = new Map();
        this.textureInfoDefMap = new Map();
        this.samplerDefIndexMap = new Map();
        this.sceneIndexMap = new Map();
        this.imageBufferViews = [];
        this.otherBufferViews = new Map();
        this.otherBufferViewsIndexMap = new Map();
        this.extensionData = {};
        this.bufferURIGenerator = void 0;
        this.imageURIGenerator = void 0;
        this.logger = void 0;
        this._accessorUsageMap = new Map();
        this.accessorUsageGroupedByParent = new Set(["ARRAY_BUFFER"]);
        this.accessorParents = new Map();
        this._doc = _doc;
        this.jsonDoc = jsonDoc;
        this.options = options;
        const root = _doc.getRoot();
        const numBuffers = root.listBuffers().length;
        const numImages = root.listTextures().length;
        this.bufferURIGenerator = new UniqueURIGenerator(numBuffers > 1, () => options.basename || "buffer");
        this.imageURIGenerator = new UniqueURIGenerator(numImages > 1, (texture) => getSlot(_doc, texture) || options.basename || "texture");
        this.logger = _doc.getLogger();
    }
    createTextureInfoDef(texture, textureInfo) {
        const samplerDef = {
            magFilter: textureInfo.getMagFilter() || void 0,
            minFilter: textureInfo.getMinFilter() || void 0,
            wrapS: textureInfo.getWrapS(),
            wrapT: textureInfo.getWrapT()
        };
        const samplerKey = JSON.stringify(samplerDef);
        if (!this.samplerDefIndexMap.has(samplerKey)) {
            this.samplerDefIndexMap.set(samplerKey, this.jsonDoc.json.samplers.length);
            this.jsonDoc.json.samplers.push(samplerDef);
        }
        const textureDef = {
            source: this.imageIndexMap.get(texture),
            sampler: this.samplerDefIndexMap.get(samplerKey)
        };
        const textureKey = JSON.stringify(textureDef);
        if (!this.textureDefIndexMap.has(textureKey)) {
            this.textureDefIndexMap.set(textureKey, this.jsonDoc.json.textures.length);
            this.jsonDoc.json.textures.push(textureDef);
        }
        const textureInfoDef = {
            index: this.textureDefIndexMap.get(textureKey)
        };
        if (textureInfo.getTexCoord() !== 0) {
            textureInfoDef.texCoord = textureInfo.getTexCoord();
        }
        if (Object.keys(textureInfo.getExtras()).length > 0) {
            textureInfoDef.extras = textureInfo.getExtras();
        }
        this.textureInfoDefMap.set(textureInfo, textureInfoDef);
        return textureInfoDef;
    }
    createPropertyDef(property) {
        const def = {};
        if (property.getName()) {
            def.name = property.getName();
        }
        if (Object.keys(property.getExtras()).length > 0) {
            def.extras = property.getExtras();
        }
        return def;
    }
    createAccessorDef(accessor) {
        const accessorDef = this.createPropertyDef(accessor);
        accessorDef.type = accessor.getType();
        accessorDef.componentType = accessor.getComponentType();
        accessorDef.count = accessor.getCount();
        const needsBounds = this._doc.getGraph().listParentEdges(accessor).some((edge) => edge.getName() === "attributes" && edge.getAttributes().key === "POSITION" || edge.getName() === "input");
        if (needsBounds) {
            accessorDef.max = accessor.getMax([]).map(Math.fround);
            accessorDef.min = accessor.getMin([]).map(Math.fround);
        }
        if (accessor.getNormalized()) {
            accessorDef.normalized = accessor.getNormalized();
        }
        return accessorDef;
    }
    createImageData(imageDef, data, texture) {
        if (this.options.format === Format.GLB) {
            this.imageBufferViews.push(data);
            imageDef.bufferView = this.jsonDoc.json.bufferViews.length;
            this.jsonDoc.json.bufferViews.push({
                buffer: 0,
                byteOffset: -1,
                byteLength: data.byteLength
            });
        }
        else {
            const extension = ImageUtils.mimeTypeToExtension(texture.getMimeType());
            imageDef.uri = this.imageURIGenerator.createURI(texture, extension);
            this.assignResourceURI(imageDef.uri, data, false);
        }
    }
    assignResourceURI(uri, data, throwOnConflict) {
        const resources = this.jsonDoc.resources;
        if (!(uri in resources)) {
            resources[uri] = data;
            return;
        }
        if (data === resources[uri]) {
            this.logger.warn(`Duplicate resource URI, "${uri}".`);
            return;
        }
        const conflictMessage = `Resource URI "${uri}" already assigned to different data.`;
        if (!throwOnConflict) {
            this.logger.warn(conflictMessage);
            return;
        }
        throw new Error(conflictMessage);
    }
    getAccessorUsage(accessor) {
        const cachedUsage = this._accessorUsageMap.get(accessor);
        if (cachedUsage)
            return cachedUsage;
        if (accessor.getSparse())
            return BufferViewUsage$1.SPARSE;
        for (const edge of this._doc.getGraph().listParentEdges(accessor)) {
            const { usage } = edge.getAttributes();
            if (usage)
                return usage;
            if (edge.getParent().propertyType !== PropertyType.ROOT) {
                this.logger.warn(`Missing attribute ".usage" on edge, "${edge.getName()}".`);
            }
        }
        return BufferViewUsage$1.OTHER;
    }
    addAccessorToUsageGroup(accessor, usage) {
        const prevUsage = this._accessorUsageMap.get(accessor);
        if (prevUsage && prevUsage !== usage) {
            throw new Error(`Accessor with usage "${prevUsage}" cannot be reused as "${usage}".`);
        }
        this._accessorUsageMap.set(accessor, usage);
        return this;
    }
};
WriterContext.BufferViewTarget = BufferViewTarget;
WriterContext.BufferViewUsage = BufferViewUsage$1;
WriterContext.USAGE_TO_TARGET = {
    [BufferViewUsage$1.ARRAY_BUFFER]: BufferViewTarget.ARRAY_BUFFER,
    [BufferViewUsage$1.ELEMENT_ARRAY_BUFFER]: BufferViewTarget.ELEMENT_ARRAY_BUFFER
};
var UniqueURIGenerator = class {
    constructor(multiple, basename) {
        this.multiple = void 0;
        this.basename = void 0;
        this.counter = {};
        this.multiple = multiple;
        this.basename = basename;
    }
    createURI(object, extension) {
        if (object.getURI()) {
            return object.getURI();
        }
        else if (!this.multiple) {
            return `${this.basename(object)}.${extension}`;
        }
        else {
            const basename = this.basename(object);
            this.counter[basename] = this.counter[basename] || 1;
            return `${basename}_${this.counter[basename]++}.${extension}`;
        }
    }
};
function getSlot(document, texture) {
    const edge = document.getGraph().listParentEdges(texture).find((edge2) => edge2.getParent() !== document.getRoot());
    return edge ? edge.getName().replace(/texture$/i, "") : "";
}
var { BufferViewUsage } = WriterContext;
var { UNSIGNED_INT, UNSIGNED_SHORT, UNSIGNED_BYTE } = Accessor.ComponentType;
var SUPPORTED_PREWRITE_TYPES = new Set([PropertyType.ACCESSOR, PropertyType.BUFFER, PropertyType.MATERIAL, PropertyType.MESH]);
var GLTFWriter = class {
    static write(doc, options) {
        const graph = doc.getGraph();
        const root = doc.getRoot();
        const json = {
            asset: _extends2({
                generator: `glTF-Transform ${VERSION}`
            }, root.getAsset()),
            extras: _extends2({}, root.getExtras())
        };
        const jsonDoc = {
            json,
            resources: {}
        };
        const context = new WriterContext(doc, jsonDoc, options);
        const logger = options.logger || Logger.DEFAULT_INSTANCE;
        const extensionsRegistered = new Set(options.extensions.map((ext) => ext.EXTENSION_NAME));
        const extensionsUsed = doc.getRoot().listExtensionsUsed().filter((ext) => extensionsRegistered.has(ext.extensionName)).sort((a2, b) => a2.extensionName > b.extensionName ? 1 : -1);
        const extensionsRequired = doc.getRoot().listExtensionsRequired().filter((ext) => extensionsRegistered.has(ext.extensionName)).sort((a2, b) => a2.extensionName > b.extensionName ? 1 : -1);
        if (extensionsUsed.length < doc.getRoot().listExtensionsUsed().length) {
            logger.warn("Some extensions were not registered for I/O, and will not be written.");
        }
        for (const extension of extensionsUsed) {
            const unsupportedHooks = extension.prewriteTypes.filter((type) => !SUPPORTED_PREWRITE_TYPES.has(type));
            if (unsupportedHooks.length) {
                logger.warn(`Prewrite hooks for some types (${unsupportedHooks.join()}), requested by extension ${extension.extensionName}, are unsupported. Please file an issue or a PR.`);
            }
            for (const key of extension.writeDependencies) {
                extension.install(key, options.dependencies[key]);
            }
        }
        function concatAccessors(accessors, bufferIndex, bufferByteOffset, bufferViewTarget) {
            const buffers = [];
            let byteLength = 0;
            for (const accessor of accessors) {
                const accessorDef = context.createAccessorDef(accessor);
                accessorDef.bufferView = json.bufferViews.length;
                const accessorArray = accessor.getArray();
                const data = BufferUtils.pad(BufferUtils.toView(accessorArray));
                accessorDef.byteOffset = byteLength;
                byteLength += data.byteLength;
                buffers.push(data);
                context.accessorIndexMap.set(accessor, json.accessors.length);
                json.accessors.push(accessorDef);
            }
            const bufferViewData = BufferUtils.concat(buffers);
            const bufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset,
                byteLength: bufferViewData.byteLength
            };
            if (bufferViewTarget)
                bufferViewDef.target = bufferViewTarget;
            json.bufferViews.push(bufferViewDef);
            return {
                buffers,
                byteLength
            };
        }
        function interleaveAccessors(accessors, bufferIndex, bufferByteOffset) {
            const vertexCount = accessors[0].getCount();
            let byteStride = 0;
            for (const accessor of accessors) {
                const accessorDef = context.createAccessorDef(accessor);
                accessorDef.bufferView = json.bufferViews.length;
                accessorDef.byteOffset = byteStride;
                const elementSize = accessor.getElementSize();
                const componentSize = accessor.getComponentSize();
                byteStride += BufferUtils.padNumber(elementSize * componentSize);
                context.accessorIndexMap.set(accessor, json.accessors.length);
                json.accessors.push(accessorDef);
            }
            const byteLength = vertexCount * byteStride;
            const buffer = new ArrayBuffer(byteLength);
            const view = new DataView(buffer);
            for (let i = 0; i < vertexCount; i++) {
                let vertexByteOffset = 0;
                for (const accessor of accessors) {
                    const elementSize = accessor.getElementSize();
                    const componentSize = accessor.getComponentSize();
                    const componentType = accessor.getComponentType();
                    const array = accessor.getArray();
                    for (let j = 0; j < elementSize; j++) {
                        const viewByteOffset = i * byteStride + vertexByteOffset + j * componentSize;
                        const value = array[i * elementSize + j];
                        switch (componentType) {
                            case Accessor.ComponentType.FLOAT:
                                view.setFloat32(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.BYTE:
                                view.setInt8(viewByteOffset, value);
                                break;
                            case Accessor.ComponentType.SHORT:
                                view.setInt16(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.UNSIGNED_BYTE:
                                view.setUint8(viewByteOffset, value);
                                break;
                            case Accessor.ComponentType.UNSIGNED_SHORT:
                                view.setUint16(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.UNSIGNED_INT:
                                view.setUint32(viewByteOffset, value, true);
                                break;
                            default:
                                throw new Error("Unexpected component type: " + componentType);
                        }
                    }
                    vertexByteOffset += BufferUtils.padNumber(elementSize * componentSize);
                }
            }
            const bufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset,
                byteLength,
                byteStride,
                target: WriterContext.BufferViewTarget.ARRAY_BUFFER
            };
            json.bufferViews.push(bufferViewDef);
            return {
                byteLength,
                buffers: [new Uint8Array(buffer)]
            };
        }
        function concatSparseAccessors(accessors, bufferIndex, bufferByteOffset) {
            const buffers = [];
            let byteLength = 0;
            const sparseData = new Map();
            let maxIndex = -Infinity;
            let needSparseWarning = false;
            for (const accessor of accessors) {
                const accessorDef = context.createAccessorDef(accessor);
                json.accessors.push(accessorDef);
                context.accessorIndexMap.set(accessor, json.accessors.length - 1);
                const indices = [];
                const values = [];
                const el = [];
                const base = new Array(accessor.getElementSize()).fill(0);
                for (let i = 0, il = accessor.getCount(); i < il; i++) {
                    accessor.getElement(i, el);
                    if (MathUtils.eq(el, base, 0))
                        continue;
                    maxIndex = Math.max(i, maxIndex);
                    indices.push(i);
                    for (let j = 0; j < el.length; j++)
                        values.push(el[j]);
                }
                const count = indices.length;
                const data = {
                    accessorDef,
                    count
                };
                sparseData.set(accessor, data);
                if (count === 0)
                    continue;
                if (count > accessor.getCount() / 2) {
                    needSparseWarning = true;
                }
                const ValueArray = ComponentTypeToTypedArray[accessor.getComponentType()];
                data.indices = indices;
                data.values = new ValueArray(values);
            }
            if (!Number.isFinite(maxIndex)) {
                return {
                    buffers,
                    byteLength
                };
            }
            if (needSparseWarning) {
                logger.warn(`Some sparse accessors have >50% non-zero elements, which may increase file size.`);
            }
            const IndexArray = maxIndex < 255 ? Uint8Array : maxIndex < 65535 ? Uint16Array : Uint32Array;
            const IndexComponentType = maxIndex < 255 ? UNSIGNED_BYTE : maxIndex < 65535 ? UNSIGNED_SHORT : UNSIGNED_INT;
            const indicesBufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset + byteLength,
                byteLength: 0
            };
            for (const accessor of accessors) {
                const data = sparseData.get(accessor);
                if (data.count === 0)
                    continue;
                data.indicesByteOffset = indicesBufferViewDef.byteLength;
                const buffer = BufferUtils.pad(BufferUtils.toView(new IndexArray(data.indices)));
                buffers.push(buffer);
                byteLength += buffer.byteLength;
                indicesBufferViewDef.byteLength += buffer.byteLength;
            }
            json.bufferViews.push(indicesBufferViewDef);
            const indicesBufferViewIndex = json.bufferViews.length - 1;
            const valuesBufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset + byteLength,
                byteLength: 0
            };
            for (const accessor of accessors) {
                const data = sparseData.get(accessor);
                if (data.count === 0)
                    continue;
                data.valuesByteOffset = valuesBufferViewDef.byteLength;
                const buffer = BufferUtils.pad(BufferUtils.toView(data.values));
                buffers.push(buffer);
                byteLength += buffer.byteLength;
                valuesBufferViewDef.byteLength += buffer.byteLength;
            }
            json.bufferViews.push(valuesBufferViewDef);
            const valuesBufferViewIndex = json.bufferViews.length - 1;
            for (const accessor of accessors) {
                const data = sparseData.get(accessor);
                if (data.count === 0)
                    continue;
                data.accessorDef.sparse = {
                    count: data.count,
                    indices: {
                        bufferView: indicesBufferViewIndex,
                        byteOffset: data.indicesByteOffset,
                        componentType: IndexComponentType
                    },
                    values: {
                        bufferView: valuesBufferViewIndex,
                        byteOffset: data.valuesByteOffset
                    }
                };
            }
            return {
                buffers,
                byteLength
            };
        }
        json.accessors = [];
        json.bufferViews = [];
        json.samplers = [];
        json.textures = [];
        json.images = root.listTextures().map((texture, textureIndex) => {
            const imageDef = context.createPropertyDef(texture);
            if (texture.getMimeType()) {
                imageDef.mimeType = texture.getMimeType();
            }
            const image = texture.getImage();
            if (image) {
                context.createImageData(imageDef, image, texture);
            }
            context.imageIndexMap.set(texture, textureIndex);
            return imageDef;
        });
        extensionsUsed.filter((extension) => extension.prewriteTypes.includes(PropertyType.ACCESSOR)).forEach((extension) => extension.prewrite(context, PropertyType.ACCESSOR));
        root.listAccessors().forEach((accessor) => {
            const groupByParent = context.accessorUsageGroupedByParent;
            const accessorParents = context.accessorParents;
            if (context.accessorIndexMap.has(accessor))
                return;
            const usage = context.getAccessorUsage(accessor);
            context.addAccessorToUsageGroup(accessor, usage);
            if (groupByParent.has(usage)) {
                const parent = graph.listParents(accessor).find((parent2) => parent2.propertyType !== PropertyType.ROOT);
                accessorParents.set(accessor, parent);
            }
        });
        extensionsUsed.filter((extension) => extension.prewriteTypes.includes(PropertyType.BUFFER)).forEach((extension) => extension.prewrite(context, PropertyType.BUFFER));
        const needsBuffer = root.listAccessors().length > 0 || context.otherBufferViews.size > 0 || root.listTextures().length > 0 && options.format === Format.GLB;
        if (needsBuffer && root.listBuffers().length === 0) {
            throw new Error("Buffer required for Document resources, but none was found.");
        }
        json.buffers = [];
        root.listBuffers().forEach((buffer, index) => {
            const bufferDef = context.createPropertyDef(buffer);
            const groupByParent = context.accessorUsageGroupedByParent;
            const accessors = buffer.listParents().filter((property) => property instanceof Accessor);
            const uniqueParents = new Set(accessors.map((accessor) => context.accessorParents.get(accessor)));
            const parentToIndex = new Map(Array.from(uniqueParents).map((parent, index2) => [parent, index2]));
            const accessorGroups = {};
            for (const accessor of accessors) {
                var _key;
                if (context.accessorIndexMap.has(accessor))
                    continue;
                const usage = context.getAccessorUsage(accessor);
                let key = usage;
                if (groupByParent.has(usage)) {
                    const parent = context.accessorParents.get(accessor);
                    key += `:${parentToIndex.get(parent)}`;
                }
                accessorGroups[_key = key] || (accessorGroups[_key] = {
                    usage,
                    accessors: []
                });
                accessorGroups[key].accessors.push(accessor);
            }
            const buffers = [];
            const bufferIndex = json.buffers.length;
            let bufferByteLength = 0;
            for (const { usage, accessors: groupAccessors } of Object.values(accessorGroups)) {
                if (usage === BufferViewUsage.ARRAY_BUFFER && options.vertexLayout === VertexLayout.INTERLEAVED) {
                    const result = interleaveAccessors(groupAccessors, bufferIndex, bufferByteLength);
                    bufferByteLength += result.byteLength;
                    for (const _buffer of result.buffers) {
                        buffers.push(_buffer);
                    }
                }
                else if (usage === BufferViewUsage.ARRAY_BUFFER) {
                    for (const accessor of groupAccessors) {
                        const result = interleaveAccessors([accessor], bufferIndex, bufferByteLength);
                        bufferByteLength += result.byteLength;
                        for (const _buffer2 of result.buffers) {
                            buffers.push(_buffer2);
                        }
                    }
                }
                else if (usage === BufferViewUsage.SPARSE) {
                    const result = concatSparseAccessors(groupAccessors, bufferIndex, bufferByteLength);
                    bufferByteLength += result.byteLength;
                    for (const _buffer3 of result.buffers) {
                        buffers.push(_buffer3);
                    }
                }
                else if (usage === BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
                    const target = WriterContext.BufferViewTarget.ELEMENT_ARRAY_BUFFER;
                    const result = concatAccessors(groupAccessors, bufferIndex, bufferByteLength, target);
                    bufferByteLength += result.byteLength;
                    for (const _buffer4 of result.buffers) {
                        buffers.push(_buffer4);
                    }
                }
                else {
                    const result = concatAccessors(groupAccessors, bufferIndex, bufferByteLength);
                    bufferByteLength += result.byteLength;
                    for (const _buffer5 of result.buffers) {
                        buffers.push(_buffer5);
                    }
                }
            }
            if (context.imageBufferViews.length && index === 0) {
                for (let i = 0; i < context.imageBufferViews.length; i++) {
                    json.bufferViews[json.images[i].bufferView].byteOffset = bufferByteLength;
                    bufferByteLength += context.imageBufferViews[i].byteLength;
                    buffers.push(context.imageBufferViews[i]);
                    if (bufferByteLength % 8) {
                        const imagePadding = 8 - bufferByteLength % 8;
                        bufferByteLength += imagePadding;
                        buffers.push(new Uint8Array(imagePadding));
                    }
                }
            }
            if (context.otherBufferViews.has(buffer)) {
                for (const data of context.otherBufferViews.get(buffer)) {
                    json.bufferViews.push({
                        buffer: bufferIndex,
                        byteOffset: bufferByteLength,
                        byteLength: data.byteLength
                    });
                    context.otherBufferViewsIndexMap.set(data, json.bufferViews.length - 1);
                    bufferByteLength += data.byteLength;
                    buffers.push(data);
                }
            }
            if (bufferByteLength) {
                let uri;
                if (options.format === Format.GLB) {
                    uri = GLB_BUFFER;
                }
                else {
                    uri = context.bufferURIGenerator.createURI(buffer, "bin");
                    bufferDef.uri = uri;
                }
                bufferDef.byteLength = bufferByteLength;
                context.assignResourceURI(uri, BufferUtils.concat(buffers), true);
            }
            json.buffers.push(bufferDef);
            context.bufferIndexMap.set(buffer, index);
        });
        if (root.listAccessors().find((a2) => !a2.getBuffer())) {
            logger.warn("Skipped writing one or more Accessors: no Buffer assigned.");
        }
        extensionsUsed.filter((extension) => extension.prewriteTypes.includes(PropertyType.MATERIAL)).forEach((extension) => extension.prewrite(context, PropertyType.MATERIAL));
        json.materials = root.listMaterials().map((material, index) => {
            const materialDef = context.createPropertyDef(material);
            if (material.getAlphaMode() !== Material.AlphaMode.OPAQUE) {
                materialDef.alphaMode = material.getAlphaMode();
            }
            if (material.getAlphaMode() === Material.AlphaMode.MASK) {
                materialDef.alphaCutoff = material.getAlphaCutoff();
            }
            if (material.getDoubleSided())
                materialDef.doubleSided = true;
            materialDef.pbrMetallicRoughness = {};
            if (!MathUtils.eq(material.getBaseColorFactor(), [1, 1, 1, 1])) {
                materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor();
            }
            if (!MathUtils.eq(material.getEmissiveFactor(), [0, 0, 0])) {
                materialDef.emissiveFactor = material.getEmissiveFactor();
            }
            if (material.getRoughnessFactor() !== 1) {
                materialDef.pbrMetallicRoughness.roughnessFactor = material.getRoughnessFactor();
            }
            if (material.getMetallicFactor() !== 1) {
                materialDef.pbrMetallicRoughness.metallicFactor = material.getMetallicFactor();
            }
            if (material.getBaseColorTexture()) {
                const texture = material.getBaseColorTexture();
                const textureInfo = material.getBaseColorTextureInfo();
                materialDef.pbrMetallicRoughness.baseColorTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            if (material.getEmissiveTexture()) {
                const texture = material.getEmissiveTexture();
                const textureInfo = material.getEmissiveTextureInfo();
                materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            if (material.getNormalTexture()) {
                const texture = material.getNormalTexture();
                const textureInfo = material.getNormalTextureInfo();
                const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
                if (material.getNormalScale() !== 1) {
                    textureInfoDef.scale = material.getNormalScale();
                }
                materialDef.normalTexture = textureInfoDef;
            }
            if (material.getOcclusionTexture()) {
                const texture = material.getOcclusionTexture();
                const textureInfo = material.getOcclusionTextureInfo();
                const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
                if (material.getOcclusionStrength() !== 1) {
                    textureInfoDef.strength = material.getOcclusionStrength();
                }
                materialDef.occlusionTexture = textureInfoDef;
            }
            if (material.getMetallicRoughnessTexture()) {
                const texture = material.getMetallicRoughnessTexture();
                const textureInfo = material.getMetallicRoughnessTextureInfo();
                materialDef.pbrMetallicRoughness.metallicRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            context.materialIndexMap.set(material, index);
            return materialDef;
        });
        extensionsUsed.filter((extension) => extension.prewriteTypes.includes(PropertyType.MESH)).forEach((extension) => extension.prewrite(context, PropertyType.MESH));
        json.meshes = root.listMeshes().map((mesh, index) => {
            const meshDef = context.createPropertyDef(mesh);
            let targetNames = null;
            meshDef.primitives = mesh.listPrimitives().map((primitive) => {
                const primitiveDef = {
                    attributes: {}
                };
                primitiveDef.mode = primitive.getMode();
                const material = primitive.getMaterial();
                if (material) {
                    primitiveDef.material = context.materialIndexMap.get(material);
                }
                if (Object.keys(primitive.getExtras()).length) {
                    primitiveDef.extras = primitive.getExtras();
                }
                const indices = primitive.getIndices();
                if (indices) {
                    primitiveDef.indices = context.accessorIndexMap.get(indices);
                }
                for (const semantic of primitive.listSemantics()) {
                    primitiveDef.attributes[semantic] = context.accessorIndexMap.get(primitive.getAttribute(semantic));
                }
                for (const target of primitive.listTargets()) {
                    const targetDef = {};
                    for (const semantic of target.listSemantics()) {
                        targetDef[semantic] = context.accessorIndexMap.get(target.getAttribute(semantic));
                    }
                    primitiveDef.targets = primitiveDef.targets || [];
                    primitiveDef.targets.push(targetDef);
                }
                if (primitive.listTargets().length && !targetNames) {
                    targetNames = primitive.listTargets().map((target) => target.getName());
                }
                return primitiveDef;
            });
            if (mesh.getWeights().length) {
                meshDef.weights = mesh.getWeights();
            }
            if (targetNames) {
                meshDef.extras = meshDef.extras || {};
                meshDef.extras["targetNames"] = targetNames;
            }
            context.meshIndexMap.set(mesh, index);
            return meshDef;
        });
        json.cameras = root.listCameras().map((camera, index) => {
            const cameraDef = context.createPropertyDef(camera);
            cameraDef.type = camera.getType();
            if (cameraDef.type === Camera.Type.PERSPECTIVE) {
                cameraDef.perspective = {
                    znear: camera.getZNear(),
                    zfar: camera.getZFar(),
                    yfov: camera.getYFov()
                };
                const aspectRatio = camera.getAspectRatio();
                if (aspectRatio !== null) {
                    cameraDef.perspective.aspectRatio = aspectRatio;
                }
            }
            else {
                cameraDef.orthographic = {
                    znear: camera.getZNear(),
                    zfar: camera.getZFar(),
                    xmag: camera.getXMag(),
                    ymag: camera.getYMag()
                };
            }
            context.cameraIndexMap.set(camera, index);
            return cameraDef;
        });
        json.nodes = root.listNodes().map((node, index) => {
            const nodeDef = context.createPropertyDef(node);
            if (!MathUtils.eq(node.getTranslation(), [0, 0, 0])) {
                nodeDef.translation = node.getTranslation();
            }
            if (!MathUtils.eq(node.getRotation(), [0, 0, 0, 1])) {
                nodeDef.rotation = node.getRotation();
            }
            if (!MathUtils.eq(node.getScale(), [1, 1, 1])) {
                nodeDef.scale = node.getScale();
            }
            if (node.getWeights().length) {
                nodeDef.weights = node.getWeights();
            }
            context.nodeIndexMap.set(node, index);
            return nodeDef;
        });
        json.skins = root.listSkins().map((skin, index) => {
            const skinDef = context.createPropertyDef(skin);
            const inverseBindMatrices = skin.getInverseBindMatrices();
            if (inverseBindMatrices) {
                skinDef.inverseBindMatrices = context.accessorIndexMap.get(inverseBindMatrices);
            }
            const skeleton = skin.getSkeleton();
            if (skeleton) {
                skinDef.skeleton = context.nodeIndexMap.get(skeleton);
            }
            skinDef.joints = skin.listJoints().map((joint) => context.nodeIndexMap.get(joint));
            context.skinIndexMap.set(skin, index);
            return skinDef;
        });
        root.listNodes().forEach((node, index) => {
            const nodeDef = json.nodes[index];
            const mesh = node.getMesh();
            if (mesh) {
                nodeDef.mesh = context.meshIndexMap.get(mesh);
            }
            const camera = node.getCamera();
            if (camera) {
                nodeDef.camera = context.cameraIndexMap.get(camera);
            }
            const skin = node.getSkin();
            if (skin) {
                nodeDef.skin = context.skinIndexMap.get(skin);
            }
            if (node.listChildren().length > 0) {
                nodeDef.children = node.listChildren().map((node2) => context.nodeIndexMap.get(node2));
            }
        });
        json.animations = root.listAnimations().map((animation, index) => {
            const animationDef = context.createPropertyDef(animation);
            const samplerIndexMap = new Map();
            animationDef.samplers = animation.listSamplers().map((sampler, samplerIndex) => {
                const samplerDef = context.createPropertyDef(sampler);
                samplerDef.input = context.accessorIndexMap.get(sampler.getInput());
                samplerDef.output = context.accessorIndexMap.get(sampler.getOutput());
                samplerDef.interpolation = sampler.getInterpolation();
                samplerIndexMap.set(sampler, samplerIndex);
                return samplerDef;
            });
            animationDef.channels = animation.listChannels().map((channel) => {
                const channelDef = context.createPropertyDef(channel);
                channelDef.sampler = samplerIndexMap.get(channel.getSampler());
                channelDef.target = {
                    node: context.nodeIndexMap.get(channel.getTargetNode()),
                    path: channel.getTargetPath()
                };
                return channelDef;
            });
            context.animationIndexMap.set(animation, index);
            return animationDef;
        });
        json.scenes = root.listScenes().map((scene, index) => {
            const sceneDef = context.createPropertyDef(scene);
            sceneDef.nodes = scene.listChildren().map((node) => context.nodeIndexMap.get(node));
            context.sceneIndexMap.set(scene, index);
            return sceneDef;
        });
        const defaultScene = root.getDefaultScene();
        if (defaultScene) {
            json.scene = root.listScenes().indexOf(defaultScene);
        }
        json.extensionsUsed = extensionsUsed.map((ext) => ext.extensionName);
        json.extensionsRequired = extensionsRequired.map((ext) => ext.extensionName);
        extensionsUsed.forEach((extension) => extension.write(context));
        clean(json);
        return jsonDoc;
    }
};
function clean(object) {
    const unused = [];
    for (const key in object) {
        const value = object[key];
        if (Array.isArray(value) && value.length === 0) {
            unused.push(key);
        }
        else if (value === null || value === "") {
            unused.push(key);
        }
        else if (value && typeof value === "object" && Object.keys(value).length === 0) {
            unused.push(key);
        }
    }
    for (const key of unused) {
        delete object[key];
    }
}
var ChunkType;
(function (ChunkType2) {
    ChunkType2[ChunkType2["JSON"] = 1313821514] = "JSON";
    ChunkType2[ChunkType2["BIN"] = 5130562] = "BIN";
})(ChunkType || (ChunkType = {}));
var PlatformIO = class {
    constructor() {
        this._logger = Logger.DEFAULT_INSTANCE;
        this._extensions = new Set();
        this._dependencies = {};
        this._vertexLayout = VertexLayout.INTERLEAVED;
        this.lastReadBytes = 0;
        this.lastWriteBytes = 0;
    }
    setLogger(logger) {
        this._logger = logger;
        return this;
    }
    registerExtensions(extensions) {
        for (const extension of extensions) {
            this._extensions.add(extension);
            extension.register();
        }
        return this;
    }
    registerDependencies(dependencies) {
        Object.assign(this._dependencies, dependencies);
        return this;
    }
    setVertexLayout(layout) {
        this._vertexLayout = layout;
        return this;
    }
    async read(uri) {
        return await this.readJSON(await this.readAsJSON(uri));
    }
    async readAsJSON(uri) {
        const view = await this.readURI(uri, "view");
        this.lastReadBytes = view.byteLength;
        const jsonDoc = isGLB(view) ? this._binaryToJSON(view) : {
            json: JSON.parse(BufferUtils.decodeText(view)),
            resources: {}
        };
        await this._readResourcesExternal(jsonDoc, this.dirname(uri));
        this._readResourcesInternal(jsonDoc);
        return jsonDoc;
    }
    async readJSON(jsonDoc) {
        jsonDoc = this._copyJSON(jsonDoc);
        this._readResourcesInternal(jsonDoc);
        return GLTFReader.read(jsonDoc, {
            extensions: Array.from(this._extensions),
            dependencies: this._dependencies,
            logger: this._logger
        });
    }
    async binaryToJSON(glb) {
        const jsonDoc = this._binaryToJSON(BufferUtils.assertView(glb));
        this._readResourcesInternal(jsonDoc);
        const json = jsonDoc.json;
        if (json.buffers && json.buffers.some((bufferDef) => isExternalBuffer(jsonDoc, bufferDef))) {
            throw new Error("Cannot resolve external buffers with binaryToJSON().");
        }
        else if (json.images && json.images.some((imageDef) => isExternalImage(jsonDoc, imageDef))) {
            throw new Error("Cannot resolve external images with binaryToJSON().");
        }
        return jsonDoc;
    }
    async readBinary(glb) {
        return this.readJSON(await this.binaryToJSON(BufferUtils.assertView(glb)));
    }
    async writeJSON(doc, _options = {}) {
        if (_options.format === Format.GLB && doc.getRoot().listBuffers().length > 1) {
            throw new Error("GLB must have 0\u20131 buffers.");
        }
        return GLTFWriter.write(doc, {
            format: _options.format || Format.GLTF,
            basename: _options.basename || "",
            logger: this._logger,
            vertexLayout: this._vertexLayout,
            dependencies: _extends2({}, this._dependencies),
            extensions: Array.from(this._extensions)
        });
    }
    async writeBinary(doc) {
        const { json, resources } = await this.writeJSON(doc, {
            format: Format.GLB
        });
        const header = new Uint32Array([1179937895, 2, 12]);
        const jsonText = JSON.stringify(json);
        const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 32);
        const jsonChunkHeader = BufferUtils.toView(new Uint32Array([jsonChunkData.byteLength, 1313821514]));
        const jsonChunk = BufferUtils.concat([jsonChunkHeader, jsonChunkData]);
        header[header.length - 1] += jsonChunk.byteLength;
        const binBuffer = Object.values(resources)[0];
        if (!binBuffer || !binBuffer.byteLength) {
            return BufferUtils.concat([BufferUtils.toView(header), jsonChunk]);
        }
        const binChunkData = BufferUtils.pad(binBuffer, 0);
        const binChunkHeader = BufferUtils.toView(new Uint32Array([binChunkData.byteLength, 5130562]));
        const binChunk = BufferUtils.concat([binChunkHeader, binChunkData]);
        header[header.length - 1] += binChunk.byteLength;
        return BufferUtils.concat([BufferUtils.toView(header), jsonChunk, binChunk]);
    }
    async _readResourcesExternal(jsonDoc, base) {
        var _this = this;
        const images = jsonDoc.json.images || [];
        const buffers = jsonDoc.json.buffers || [];
        const pendingResources = [...images, ...buffers].map(async function (resource) {
            const uri = resource.uri;
            if (!uri || uri.match(/data:/))
                return Promise.resolve();
            jsonDoc.resources[uri] = await _this.readURI(_this.resolve(base, uri), "view");
            _this.lastReadBytes += jsonDoc.resources[uri].byteLength;
        });
        await Promise.all(pendingResources);
    }
    _readResourcesInternal(jsonDoc) {
        function resolveResource(resource) {
            if (!resource.uri)
                return;
            if (resource.uri in jsonDoc.resources) {
                BufferUtils.assertView(jsonDoc.resources[resource.uri]);
                return;
            }
            if (resource.uri.match(/data:/)) {
                const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
                jsonDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
                resource.uri = resourceUUID;
            }
        }
        const images = jsonDoc.json.images || [];
        images.forEach((image) => {
            if (image.bufferView === void 0 && image.uri === void 0) {
                throw new Error("Missing resource URI or buffer view.");
            }
            resolveResource(image);
        });
        const buffers = jsonDoc.json.buffers || [];
        buffers.forEach(resolveResource);
    }
    _copyJSON(jsonDoc) {
        const { images, buffers } = jsonDoc.json;
        jsonDoc = {
            json: _extends2({}, jsonDoc.json),
            resources: _extends2({}, jsonDoc.resources)
        };
        if (images) {
            jsonDoc.json.images = images.map((image) => _extends2({}, image));
        }
        if (buffers) {
            jsonDoc.json.buffers = buffers.map((buffer) => _extends2({}, buffer));
        }
        return jsonDoc;
    }
    _binaryToJSON(glb) {
        if (!isGLB(glb)) {
            throw new Error("Invalid glTF 2.0 binary.");
        }
        const jsonChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + 12, 2);
        if (jsonChunkHeader[1] !== ChunkType.JSON) {
            throw new Error("Missing required GLB JSON chunk.");
        }
        const jsonByteOffset = 20;
        const jsonByteLength = jsonChunkHeader[0];
        const jsonText = BufferUtils.decodeText(BufferUtils.toView(glb, jsonByteOffset, jsonByteLength));
        const json = JSON.parse(jsonText);
        const binByteOffset = jsonByteOffset + jsonByteLength;
        if (glb.byteLength <= binByteOffset) {
            return {
                json,
                resources: {}
            };
        }
        const binChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + binByteOffset, 2);
        if (binChunkHeader[1] !== ChunkType.BIN) {
            return {
                json,
                resources: {}
            };
        }
        const binByteLength = binChunkHeader[0];
        const binBuffer = BufferUtils.toView(glb, binByteOffset + 8, binByteLength);
        return {
            json,
            resources: {
                [GLB_BUFFER]: binBuffer
            }
        };
    }
};
function isExternalBuffer(jsonDocument, bufferDef) {
    return bufferDef.uri !== void 0 && !(bufferDef.uri in jsonDocument.resources);
}
function isExternalImage(jsonDocument, imageDef) {
    return imageDef.uri !== void 0 && !(imageDef.uri in jsonDocument.resources) && imageDef.bufferView === void 0;
}
function isGLB(view) {
    if (view.byteLength < 3 * Uint32Array.BYTES_PER_ELEMENT)
        return false;
    const header = new Uint32Array(view.buffer, view.byteOffset, 3);
    return header[0] === 1179937895 && header[1] === 2;
}
var NodeIO = class extends PlatformIO {
    constructor(_fetch = null, _fetchConfig = HTTPUtils.DEFAULT_INIT) {
        super();
        this._fetch = void 0;
        this._fetchConfig = void 0;
        this._init = void 0;
        this._fetchEnabled = false;
        this._fetch = _fetch;
        this._fetchConfig = _fetchConfig;
        this._init = this.init();
    }
    async init() {
        if (this._init)
            return this._init;
        return Promise.all([Promise.resolve().then(() => __toESM(require_fs(), 1)), Promise.resolve().then(() => __toESM(require_path(), 1))]).then(([fs, path]) => {
            this._fs = fs.promises;
            this._path = path;
        });
    }
    setAllowNetwork(allow) {
        if (allow && !this._fetch) {
            throw new Error("NodeIO requires a Fetch API implementation for HTTP requests.");
        }
        this._fetchEnabled = allow;
        return this;
    }
    async readURI(uri, type) {
        await this.init();
        if (HTTPUtils.isAbsoluteURL(uri)) {
            if (!this._fetchEnabled || !this._fetch) {
                throw new Error("Network request blocked. Allow HTTP requests explicitly, if needed.");
            }
            const response = await this._fetch(uri, this._fetchConfig);
            switch (type) {
                case "view":
                    return new Uint8Array(await response.arrayBuffer());
                case "text":
                    return response.text();
            }
        }
        else {
            switch (type) {
                case "view":
                    return this._fs.readFile(uri);
                case "text":
                    return this._fs.readFile(uri, "utf8");
            }
        }
    }
    resolve(base, path) {
        if (HTTPUtils.isAbsoluteURL(base) || HTTPUtils.isAbsoluteURL(path)) {
            return HTTPUtils.resolve(base, path);
        }
        return this._path.resolve(base, decodeURIComponent(path));
    }
    dirname(uri) {
        if (HTTPUtils.isAbsoluteURL(uri)) {
            return HTTPUtils.dirname(uri);
        }
        return this._path.dirname(uri);
    }
    async write(uri, doc) {
        await this.init();
        const isGLB2 = !!uri.match(/\.glb$/);
        await (isGLB2 ? this._writeGLB(uri, doc) : this._writeGLTF(uri, doc));
    }
    async _writeGLTF(uri, doc) {
        var _this = this;
        this.lastWriteBytes = 0;
        const { json, resources } = await this.writeJSON(doc, {
            format: Format.GLTF,
            basename: FileUtils.basename(uri)
        });
        const { _fs: fs, _path: path } = this;
        const dir = path.dirname(uri);
        const jsonContent = JSON.stringify(json, null, 2);
        await fs.writeFile(uri, jsonContent);
        this.lastWriteBytes += jsonContent.length;
        for (const batch of listBatches(Object.keys(resources), 10)) {
            await Promise.all(batch.map(async function (resourceURI) {
                if (HTTPUtils.isAbsoluteURL(resourceURI)) {
                    if (HTTPUtils.extension(resourceURI) === "bin") {
                        throw new Error(`Cannot write buffer to path "${resourceURI}".`);
                    }
                    return;
                }
                const resourcePath = path.join(dir, decodeURIComponent(resourceURI));
                await fs.mkdir(path.dirname(resourcePath), {
                    recursive: true
                });
                await fs.writeFile(resourcePath, resources[resourceURI]);
                _this.lastWriteBytes += resources[resourceURI].byteLength;
            }));
        }
    }
    async _writeGLB(uri, doc) {
        const buffer = await this.writeBinary(doc);
        await this._fs.writeFile(uri, buffer);
        this.lastWriteBytes = buffer.byteLength;
    }
};
function listBatches(array, batchSize) {
    const batches = [];
    for (let i = 0, il = array.length; i < il; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && i + j < il; j++) {
            batch.push(array[i + j]);
        }
        batches.push(batch);
    }
    return batches;
}
var DenoIO = class extends PlatformIO {
    constructor(path) {
        super();
        this._path = void 0;
        this._path = path;
    }
    async readURI(uri, type) {
        switch (type) {
            case "view":
                return Deno.readFile(uri);
            case "text":
                return Deno.readTextFile(uri);
        }
    }
    resolve(base, path) {
        return this._path.resolve(base, decodeURIComponent(path));
    }
    dirname(uri) {
        return this._path.dirname(uri);
    }
};
var WebIO = class extends PlatformIO {
    constructor(fetchConfig = HTTPUtils.DEFAULT_INIT) {
        super();
        this._fetchConfig = void 0;
        this._fetchConfig = fetchConfig;
    }
    async readURI(uri, type) {
        const response = await fetch(uri, this._fetchConfig);
        switch (type) {
            case "view":
                return new Uint8Array(await response.arrayBuffer());
            case "text":
                return response.text();
        }
    }
    resolve(base, path) {
        return HTTPUtils.resolve(base, path);
    }
    dirname(uri) {
        return HTTPUtils.dirname(uri);
    }
};
var import_ndarray = __toESM(require_ndarray(), 1);
var import_ndarray_ops = __toESM(require_ndarray_ops(), 1);
function getPixelsInternal(buffer, mimeType) {
    if (!(buffer instanceof Uint8Array)) {
        throw new Error("[ndarray-pixels] Input must be Uint8Array or Buffer.");
    }
    const blob = new Blob([buffer], {
        type: mimeType
    });
    const path = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            URL.revokeObjectURL(path);
            const canvas = new OffscreenCanvas(img.width, img.height);
            const context = canvas.getContext("2d");
            context.drawImage(img, 0, 0);
            const pixels = context.getImageData(0, 0, img.width, img.height);
            resolve((0, import_ndarray.default)(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4 * img.width, 1], 0));
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(path);
            reject(err);
        };
        img.src = path;
    });
}
function putPixelData(array, data, frame = -1) {
    if (array.shape.length === 4) {
        return putPixelData(array.pick(frame), data, 0);
    }
    else if (array.shape.length === 3) {
        if (array.shape[2] === 3) {
            import_ndarray_ops.default.assign((0, import_ndarray.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), array);
            import_ndarray_ops.default.assigns((0, import_ndarray.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
        }
        else if (array.shape[2] === 4) {
            import_ndarray_ops.default.assign((0, import_ndarray.default)(data, [array.shape[0], array.shape[1], 4], [4, array.shape[0] * 4, 1]), array);
        }
        else if (array.shape[2] === 1) {
            import_ndarray_ops.default.assign((0, import_ndarray.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), (0, import_ndarray.default)(array.data, [array.shape[0], array.shape[1], 3], [array.stride[0], array.stride[1], 0], array.offset));
            import_ndarray_ops.default.assigns((0, import_ndarray.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
        }
        else {
            throw new Error("[ndarray-pixels] Incompatible array shape.");
        }
    }
    else if (array.shape.length === 2) {
        import_ndarray_ops.default.assign((0, import_ndarray.default)(data, [array.shape[0], array.shape[1], 3], [4, 4 * array.shape[0], 1]), (0, import_ndarray.default)(array.data, [array.shape[0], array.shape[1], 3], [array.stride[0], array.stride[1], 0], array.offset));
        import_ndarray_ops.default.assigns((0, import_ndarray.default)(data, [array.shape[0] * array.shape[1]], [4], 3), 255);
    }
    else {
        throw new Error("[ndarray-pixels] Incompatible array shape.");
    }
    return data;
}
async function savePixelsInternal(pixels, options) {
    const canvas = new OffscreenCanvas(pixels.shape[0], pixels.shape[1]);
    const context = canvas.getContext("2d");
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    putPixelData(pixels, imageData.data);
    context.putImageData(imageData, 0, 0);
    return streamCanvas(canvas, options);
}
async function streamCanvas(canvas, options) {
    const blob = await canvas.convertToBlob(options);
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
}
async function getPixels(data, mimeType) {
    return getPixelsInternal(data, mimeType);
}
async function savePixels(pixels, typeOrOptions) {
    let options;
    if (typeof typeOrOptions === "string") {
        options = {
            type: typeOrOptions,
            quality: void 0
        };
    }
    else {
        options = {
            type: typeOrOptions.type,
            quality: typeOrOptions.quality
        };
    }
    return savePixelsInternal(pixels, options);
}
var KHR_SUPERCOMPRESSION_NONE = 0;
var KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT = 0;
var KHR_DF_VENDORID_KHRONOS = 0;
var KHR_DF_VERSION = 2;
var KHR_DF_MODEL_UNSPECIFIED = 0;
var KHR_DF_MODEL_ETC1S = 163;
var KHR_DF_MODEL_UASTC = 166;
var KHR_DF_FLAG_ALPHA_STRAIGHT = 0;
var KHR_DF_TRANSFER_SRGB = 2;
var KHR_DF_PRIMARIES_BT709 = 1;
var KHR_DF_SAMPLE_DATATYPE_SIGNED = 64;
var VK_FORMAT_UNDEFINED = 0;
function createDefaultContainer() {
    return {
        vkFormat: VK_FORMAT_UNDEFINED,
        typeSize: 1,
        pixelWidth: 0,
        pixelHeight: 0,
        pixelDepth: 0,
        layerCount: 0,
        faceCount: 1,
        supercompressionScheme: KHR_SUPERCOMPRESSION_NONE,
        levels: [],
        dataFormatDescriptor: [{
                vendorId: KHR_DF_VENDORID_KHRONOS,
                descriptorType: KHR_DF_KHR_DESCRIPTORTYPE_BASICFORMAT,
                versionNumber: KHR_DF_VERSION,
                colorModel: KHR_DF_MODEL_UNSPECIFIED,
                colorPrimaries: KHR_DF_PRIMARIES_BT709,
                transferFunction: KHR_DF_TRANSFER_SRGB,
                flags: KHR_DF_FLAG_ALPHA_STRAIGHT,
                texelBlockDimension: [0, 0, 0, 0],
                bytesPlane: [0, 0, 0, 0, 0, 0, 0, 0],
                samples: []
            }],
        keyValue: {},
        globalData: null
    };
}
var BufferReader = class {
    constructor(data, byteOffset, byteLength, littleEndian) {
        this._dataView = void 0;
        this._littleEndian = void 0;
        this._offset = void 0;
        this._dataView = new DataView(data.buffer, data.byteOffset + byteOffset, byteLength);
        this._littleEndian = littleEndian;
        this._offset = 0;
    }
    _nextUint8() {
        const value = this._dataView.getUint8(this._offset);
        this._offset += 1;
        return value;
    }
    _nextUint16() {
        const value = this._dataView.getUint16(this._offset, this._littleEndian);
        this._offset += 2;
        return value;
    }
    _nextUint32() {
        const value = this._dataView.getUint32(this._offset, this._littleEndian);
        this._offset += 4;
        return value;
    }
    _nextUint64() {
        const left = this._dataView.getUint32(this._offset, this._littleEndian);
        const right = this._dataView.getUint32(this._offset + 4, this._littleEndian);
        const value = left + 2 ** 32 * right;
        this._offset += 8;
        return value;
    }
    _nextInt32() {
        const value = this._dataView.getInt32(this._offset, this._littleEndian);
        this._offset += 4;
        return value;
    }
    _nextUint8Array(len2) {
        const value = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this._offset, len2);
        this._offset += len2;
        return value;
    }
    _skip(bytes) {
        this._offset += bytes;
        return this;
    }
    _scan(maxByteLength, term = 0) {
        const byteOffset = this._offset;
        let byteLength = 0;
        while (this._dataView.getUint8(this._offset) !== term && byteLength < maxByteLength) {
            byteLength++;
            this._offset++;
        }
        if (byteLength < maxByteLength)
            this._offset++;
        return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + byteOffset, byteLength);
    }
};
var NUL = new Uint8Array([0]);
var KTX2_ID = [
    171,
    75,
    84,
    88,
    32,
    50,
    48,
    187,
    13,
    10,
    26,
    10
];
function decodeText(buffer) {
    return new TextDecoder().decode(buffer);
}
function read(data) {
    const id = new Uint8Array(data.buffer, data.byteOffset, KTX2_ID.length);
    if (id[0] !== KTX2_ID[0] ||
        id[1] !== KTX2_ID[1] ||
        id[2] !== KTX2_ID[2] ||
        id[3] !== KTX2_ID[3] ||
        id[4] !== KTX2_ID[4] ||
        id[5] !== KTX2_ID[5] ||
        id[6] !== KTX2_ID[6] ||
        id[7] !== KTX2_ID[7] ||
        id[8] !== KTX2_ID[8] ||
        id[9] !== KTX2_ID[9] ||
        id[10] !== KTX2_ID[10] ||
        id[11] !== KTX2_ID[11]) {
        throw new Error("Missing KTX 2.0 identifier.");
    }
    const container = createDefaultContainer();
    const headerByteLength = 17 * Uint32Array.BYTES_PER_ELEMENT;
    const headerReader = new BufferReader(data, KTX2_ID.length, headerByteLength, true);
    container.vkFormat = headerReader._nextUint32();
    container.typeSize = headerReader._nextUint32();
    container.pixelWidth = headerReader._nextUint32();
    container.pixelHeight = headerReader._nextUint32();
    container.pixelDepth = headerReader._nextUint32();
    container.layerCount = headerReader._nextUint32();
    container.faceCount = headerReader._nextUint32();
    const levelCount = headerReader._nextUint32();
    container.supercompressionScheme = headerReader._nextUint32();
    const dfdByteOffset = headerReader._nextUint32();
    const dfdByteLength = headerReader._nextUint32();
    const kvdByteOffset = headerReader._nextUint32();
    const kvdByteLength = headerReader._nextUint32();
    const sgdByteOffset = headerReader._nextUint64();
    const sgdByteLength = headerReader._nextUint64();
    const levelByteLength = levelCount * 3 * 8;
    const levelReader = new BufferReader(data, KTX2_ID.length + headerByteLength, levelByteLength, true);
    for (let i = 0; i < levelCount; i++) {
        container.levels.push({
            levelData: new Uint8Array(data.buffer, data.byteOffset + levelReader._nextUint64(), levelReader._nextUint64()),
            uncompressedByteLength: levelReader._nextUint64()
        });
    }
    const dfdReader = new BufferReader(data, dfdByteOffset, dfdByteLength, true);
    dfdReader._skip(4);
    const vendorId = dfdReader._nextUint16();
    const descriptorType = dfdReader._nextUint16();
    const versionNumber = dfdReader._nextUint16();
    const descriptorBlockSize = dfdReader._nextUint16();
    const colorModel = dfdReader._nextUint8();
    const colorPrimaries = dfdReader._nextUint8();
    const transferFunction = dfdReader._nextUint8();
    const flags = dfdReader._nextUint8();
    const texelBlockDimension = [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()];
    const bytesPlane = [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()];
    const samples = [];
    const dfd = {
        vendorId,
        descriptorType,
        versionNumber,
        colorModel,
        colorPrimaries,
        transferFunction,
        flags,
        texelBlockDimension,
        bytesPlane,
        samples
    };
    const sampleStart = 6;
    const sampleWords = 4;
    const numSamples = (descriptorBlockSize / 4 - sampleStart) / sampleWords;
    for (let i = 0; i < numSamples; i++) {
        const sample = {
            bitOffset: dfdReader._nextUint16(),
            bitLength: dfdReader._nextUint8(),
            channelType: dfdReader._nextUint8(),
            samplePosition: [dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8(), dfdReader._nextUint8()],
            sampleLower: Number.NEGATIVE_INFINITY,
            sampleUpper: Number.POSITIVE_INFINITY
        };
        if (sample.channelType & KHR_DF_SAMPLE_DATATYPE_SIGNED) {
            sample.sampleLower = dfdReader._nextInt32();
            sample.sampleUpper = dfdReader._nextInt32();
        }
        else {
            sample.sampleLower = dfdReader._nextUint32();
            sample.sampleUpper = dfdReader._nextUint32();
        }
        dfd.samples[i] = sample;
    }
    container.dataFormatDescriptor.length = 0;
    container.dataFormatDescriptor.push(dfd);
    const kvdReader = new BufferReader(data, kvdByteOffset, kvdByteLength, true);
    while (kvdReader._offset < kvdByteLength) {
        const keyValueByteLength = kvdReader._nextUint32();
        const keyData = kvdReader._scan(keyValueByteLength);
        const key = decodeText(keyData);
        container.keyValue[key] = kvdReader._nextUint8Array(keyValueByteLength - keyData.byteLength - 1);
        if (key.match(/^ktx/i)) {
            const text = decodeText(container.keyValue[key]);
            container.keyValue[key] = text.substring(0, text.lastIndexOf("\0"));
        }
        const kvPadding = keyValueByteLength % 4 ? 4 - keyValueByteLength % 4 : 0;
        kvdReader._skip(kvPadding);
    }
    if (sgdByteLength <= 0)
        return container;
    const sgdReader = new BufferReader(data, sgdByteOffset, sgdByteLength, true);
    const endpointCount = sgdReader._nextUint16();
    const selectorCount = sgdReader._nextUint16();
    const endpointsByteLength = sgdReader._nextUint32();
    const selectorsByteLength = sgdReader._nextUint32();
    const tablesByteLength = sgdReader._nextUint32();
    const extendedByteLength = sgdReader._nextUint32();
    const imageDescs = [];
    for (let i = 0; i < levelCount; i++) {
        imageDescs.push({
            imageFlags: sgdReader._nextUint32(),
            rgbSliceByteOffset: sgdReader._nextUint32(),
            rgbSliceByteLength: sgdReader._nextUint32(),
            alphaSliceByteOffset: sgdReader._nextUint32(),
            alphaSliceByteLength: sgdReader._nextUint32()
        });
    }
    const endpointsByteOffset = sgdByteOffset + sgdReader._offset;
    const selectorsByteOffset = endpointsByteOffset + endpointsByteLength;
    const tablesByteOffset = selectorsByteOffset + selectorsByteLength;
    const extendedByteOffset = tablesByteOffset + tablesByteLength;
    const endpointsData = new Uint8Array(data.buffer, data.byteOffset + endpointsByteOffset, endpointsByteLength);
    const selectorsData = new Uint8Array(data.buffer, data.byteOffset + selectorsByteOffset, selectorsByteLength);
    const tablesData = new Uint8Array(data.buffer, data.byteOffset + tablesByteOffset, tablesByteLength);
    const extendedData = new Uint8Array(data.buffer, data.byteOffset + extendedByteOffset, extendedByteLength);
    container.globalData = {
        endpointCount,
        selectorCount,
        imageDescs,
        endpointsData,
        selectorsData,
        tablesData,
        extendedData
    };
    return container;
}
var EXT_MESH_GPU_INSTANCING = "EXT_mesh_gpu_instancing";
var EXT_MESHOPT_COMPRESSION = "EXT_meshopt_compression";
var EXT_TEXTURE_WEBP = "EXT_texture_webp";
var EXT_TEXTURE_AVIF = "EXT_texture_avif";
var KHR_DRACO_MESH_COMPRESSION = "KHR_draco_mesh_compression";
var KHR_LIGHTS_PUNCTUAL = "KHR_lights_punctual";
var KHR_MATERIALS_ANISOTROPY = "KHR_materials_anisotropy";
var KHR_MATERIALS_CLEARCOAT = "KHR_materials_clearcoat";
var KHR_MATERIALS_DIFFUSE_TRANSMISSION = "KHR_materials_diffuse_transmission";
var KHR_MATERIALS_DISPERSION = "KHR_materials_dispersion";
var KHR_MATERIALS_EMISSIVE_STRENGTH = "KHR_materials_emissive_strength";
var KHR_MATERIALS_IOR = "KHR_materials_ior";
var KHR_MATERIALS_IRIDESCENCE = "KHR_materials_iridescence";
var KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = "KHR_materials_pbrSpecularGlossiness";
var KHR_MATERIALS_SHEEN = "KHR_materials_sheen";
var KHR_MATERIALS_SPECULAR = "KHR_materials_specular";
var KHR_MATERIALS_TRANSMISSION = "KHR_materials_transmission";
var KHR_MATERIALS_UNLIT = "KHR_materials_unlit";
var KHR_MATERIALS_VOLUME = "KHR_materials_volume";
var KHR_MATERIALS_VARIANTS = "KHR_materials_variants";
var KHR_MESH_QUANTIZATION = "KHR_mesh_quantization";
var KHR_TEXTURE_BASISU = "KHR_texture_basisu";
var KHR_TEXTURE_TRANSFORM = "KHR_texture_transform";
var KHR_XMP_JSON_LD = "KHR_xmp_json_ld";
var INSTANCE_ATTRIBUTE = "INSTANCE_ATTRIBUTE";
var InstancedMesh = class extends ExtensionProperty {
    init() {
        this.extensionName = EXT_MESH_GPU_INSTANCING;
        this.propertyType = "InstancedMesh";
        this.parentTypes = [PropertyType.NODE];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            attributes: new RefMap()
        });
    }
    getAttribute(semantic) {
        return this.getRefMap("attributes", semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap("attributes", semantic, accessor, {
            usage: INSTANCE_ATTRIBUTE
        });
    }
    listAttributes() {
        return this.listRefMapValues("attributes");
    }
    listSemantics() {
        return this.listRefMapKeys("attributes");
    }
};
InstancedMesh.EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;
var NAME$o = EXT_MESH_GPU_INSTANCING;
var EXTMeshGPUInstancing = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$o;
        this.provideTypes = [PropertyType.NODE];
        this.prewriteTypes = [PropertyType.ACCESSOR];
    }
    createInstancedMesh() {
        return new InstancedMesh(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const nodeDefs = jsonDoc.json.nodes || [];
        nodeDefs.forEach((nodeDef, nodeIndex) => {
            if (!nodeDef.extensions || !nodeDef.extensions[NAME$o])
                return;
            const instancedMeshDef = nodeDef.extensions[NAME$o];
            const instancedMesh = this.createInstancedMesh();
            for (const semantic in instancedMeshDef.attributes) {
                instancedMesh.setAttribute(semantic, context.accessors[instancedMeshDef.attributes[semantic]]);
            }
            context.nodes[nodeIndex].setExtension(NAME$o, instancedMesh);
        });
        return this;
    }
    prewrite(context) {
        context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
        for (const prop of this.properties) {
            for (const attribute of prop.listAttributes()) {
                context.addAccessorToUsageGroup(attribute, INSTANCE_ATTRIBUTE);
            }
        }
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listNodes().forEach((node) => {
            const instancedMesh = node.getExtension(NAME$o);
            if (instancedMesh) {
                const nodeIndex = context.nodeIndexMap.get(node);
                const nodeDef = jsonDoc.json.nodes[nodeIndex];
                const instancedMeshDef = {
                    attributes: {}
                };
                instancedMesh.listSemantics().forEach((semantic) => {
                    const attribute = instancedMesh.getAttribute(semantic);
                    instancedMeshDef.attributes[semantic] = context.accessorIndexMap.get(attribute);
                });
                nodeDef.extensions = nodeDef.extensions || {};
                nodeDef.extensions[NAME$o] = instancedMeshDef;
            }
        });
        return this;
    }
};
EXTMeshGPUInstancing.EXTENSION_NAME = NAME$o;
function _extends3() {
    return _extends3 = Object.assign ? Object.assign.bind() : function (n2) {
        for (var e2 = 1; e2 < arguments.length; e2++) {
            var t2 = arguments[e2];
            for (var r2 in t2)
                ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
        }
        return n2;
    }, _extends3.apply(null, arguments);
}
var EncoderMethod$1;
(function (EncoderMethod2) {
    EncoderMethod2["QUANTIZE"] = "quantize";
    EncoderMethod2["FILTER"] = "filter";
})(EncoderMethod$1 || (EncoderMethod$1 = {}));
var MeshoptMode;
(function (MeshoptMode2) {
    MeshoptMode2["ATTRIBUTES"] = "ATTRIBUTES";
    MeshoptMode2["TRIANGLES"] = "TRIANGLES";
    MeshoptMode2["INDICES"] = "INDICES";
})(MeshoptMode || (MeshoptMode = {}));
var MeshoptFilter;
(function (MeshoptFilter2) {
    MeshoptFilter2["NONE"] = "NONE";
    MeshoptFilter2["OCTAHEDRAL"] = "OCTAHEDRAL";
    MeshoptFilter2["QUATERNION"] = "QUATERNION";
    MeshoptFilter2["EXPONENTIAL"] = "EXPONENTIAL";
})(MeshoptFilter || (MeshoptFilter = {}));
var { BYTE, SHORT, FLOAT } = Accessor.ComponentType;
var { encodeNormalizedInt, decodeNormalizedInt } = MathUtils;
function prepareAccessor(accessor, encoder, mode, filterOptions) {
    const { filter, bits } = filterOptions;
    const result = {
        array: accessor.getArray(),
        byteStride: accessor.getElementSize() * accessor.getComponentSize(),
        componentType: accessor.getComponentType(),
        normalized: accessor.getNormalized()
    };
    if (mode !== MeshoptMode.ATTRIBUTES)
        return result;
    if (filter !== MeshoptFilter.NONE) {
        let array = accessor.getNormalized() ? decodeNormalizedIntArray(accessor) : new Float32Array(result.array);
        switch (filter) {
            case MeshoptFilter.EXPONENTIAL:
                result.byteStride = accessor.getElementSize() * 4;
                result.componentType = FLOAT;
                result.normalized = false;
                result.array = encoder.encodeFilterExp(array, accessor.getCount(), result.byteStride, bits);
                break;
            case MeshoptFilter.OCTAHEDRAL:
                result.byteStride = bits > 8 ? 8 : 4;
                result.componentType = bits > 8 ? SHORT : BYTE;
                result.normalized = true;
                array = accessor.getElementSize() === 3 ? padNormals(array) : array;
                result.array = encoder.encodeFilterOct(array, accessor.getCount(), result.byteStride, bits);
                break;
            case MeshoptFilter.QUATERNION:
                result.byteStride = 8;
                result.componentType = SHORT;
                result.normalized = true;
                result.array = encoder.encodeFilterQuat(array, accessor.getCount(), result.byteStride, bits);
                break;
            default:
                throw new Error("Invalid filter.");
        }
        result.min = accessor.getMin([]);
        result.max = accessor.getMax([]);
        if (accessor.getNormalized()) {
            result.min = result.min.map((v) => decodeNormalizedInt(v, accessor.getComponentType()));
            result.max = result.max.map((v) => decodeNormalizedInt(v, accessor.getComponentType()));
        }
        if (result.normalized) {
            result.min = result.min.map((v) => encodeNormalizedInt(v, result.componentType));
            result.max = result.max.map((v) => encodeNormalizedInt(v, result.componentType));
        }
    }
    else if (result.byteStride % 4) {
        result.array = padArrayElements(result.array, accessor.getElementSize());
        result.byteStride = result.array.byteLength / accessor.getCount();
    }
    return result;
}
function decodeNormalizedIntArray(attribute) {
    const componentType = attribute.getComponentType();
    const srcArray = attribute.getArray();
    const dstArray = new Float32Array(srcArray.length);
    for (let i = 0; i < srcArray.length; i++) {
        dstArray[i] = decodeNormalizedInt(srcArray[i], componentType);
    }
    return dstArray;
}
function padArrayElements(srcArray, elementSize) {
    const byteStride = BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
    const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
    const elementCount = srcArray.length / elementSize;
    const dstArray = new srcArray.constructor(elementCount * elementStride);
    for (let i = 0; i * elementSize < srcArray.length; i++) {
        for (let j = 0; j < elementSize; j++) {
            dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
        }
    }
    return dstArray;
}
function padNormals(srcArray) {
    const dstArray = new Float32Array(srcArray.length * 4 / 3);
    for (let i = 0, il = srcArray.length / 3; i < il; i++) {
        dstArray[i * 4] = srcArray[i * 3];
        dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
        dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
    }
    return dstArray;
}
function getMeshoptMode(accessor, usage) {
    if (usage === WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
        const isTriangles = accessor.listParents().some((parent) => {
            return parent instanceof Primitive && parent.getMode() === Primitive.Mode.TRIANGLES;
        });
        return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
    }
    return MeshoptMode.ATTRIBUTES;
}
function getMeshoptFilter(accessor, doc) {
    const refs = doc.getGraph().listParentEdges(accessor).filter((edge) => !(edge.getParent() instanceof Root));
    for (const ref of refs) {
        const refName = ref.getName();
        const refKey = ref.getAttributes().key || "";
        const isDelta = ref.getParent().propertyType === PropertyType.PRIMITIVE_TARGET;
        if (refName === "indices")
            return {
                filter: MeshoptFilter.NONE
            };
        if (refName === "attributes") {
            if (refKey === "POSITION")
                return {
                    filter: MeshoptFilter.NONE
                };
            if (refKey === "TEXCOORD_0")
                return {
                    filter: MeshoptFilter.NONE
                };
            if (refKey.startsWith("JOINTS_"))
                return {
                    filter: MeshoptFilter.NONE
                };
            if (refKey.startsWith("WEIGHTS_"))
                return {
                    filter: MeshoptFilter.NONE
                };
            if (refKey === "NORMAL" || refKey === "TANGENT") {
                return isDelta ? {
                    filter: MeshoptFilter.NONE
                } : {
                    filter: MeshoptFilter.OCTAHEDRAL,
                    bits: 8
                };
            }
        }
        if (refName === "output") {
            const targetPath = getTargetPath(accessor);
            if (targetPath === "rotation")
                return {
                    filter: MeshoptFilter.QUATERNION,
                    bits: 16
                };
            if (targetPath === "translation")
                return {
                    filter: MeshoptFilter.EXPONENTIAL,
                    bits: 12
                };
            if (targetPath === "scale")
                return {
                    filter: MeshoptFilter.EXPONENTIAL,
                    bits: 12
                };
            return {
                filter: MeshoptFilter.NONE
            };
        }
        if (refName === "input")
            return {
                filter: MeshoptFilter.NONE
            };
        if (refName === "inverseBindMatrices")
            return {
                filter: MeshoptFilter.NONE
            };
    }
    return {
        filter: MeshoptFilter.NONE
    };
}
function getTargetPath(accessor) {
    for (const sampler of accessor.listParents()) {
        if (!(sampler instanceof AnimationSampler))
            continue;
        for (const channel of sampler.listParents()) {
            if (!(channel instanceof AnimationChannel))
                continue;
            return channel.getTargetPath();
        }
    }
    return null;
}
function isFallbackBuffer(bufferDef) {
    if (!bufferDef.extensions || !bufferDef.extensions[EXT_MESHOPT_COMPRESSION])
        return false;
    const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION];
    return !!fallbackDef.fallback;
}
var NAME$n = EXT_MESHOPT_COMPRESSION;
var DEFAULT_ENCODER_OPTIONS$1 = {
    method: EncoderMethod$1.QUANTIZE
};
var EXTMeshoptCompression = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$n;
        this.prereadTypes = [PropertyType.BUFFER, PropertyType.PRIMITIVE];
        this.prewriteTypes = [PropertyType.BUFFER, PropertyType.ACCESSOR];
        this.readDependencies = ["meshopt.decoder"];
        this.writeDependencies = ["meshopt.encoder"];
        this._decoder = null;
        this._decoderFallbackBufferMap = new Map();
        this._encoder = null;
        this._encoderOptions = DEFAULT_ENCODER_OPTIONS$1;
        this._encoderFallbackBuffer = null;
        this._encoderBufferViews = {};
        this._encoderBufferViewData = {};
        this._encoderBufferViewAccessors = {};
    }
    install(key, dependency) {
        if (key === "meshopt.decoder") {
            this._decoder = dependency;
        }
        if (key === "meshopt.encoder") {
            this._encoder = dependency;
        }
        return this;
    }
    setEncoderOptions(options) {
        this._encoderOptions = _extends3({}, DEFAULT_ENCODER_OPTIONS$1, options);
        return this;
    }
    preread(context, propertyType) {
        if (!this._decoder) {
            if (!this.isRequired())
                return this;
            throw new Error(`[${NAME$n}] Please install extension dependency, "meshopt.decoder".`);
        }
        if (!this._decoder.supported) {
            if (!this.isRequired())
                return this;
            throw new Error(`[${NAME$n}]: Missing WASM support.`);
        }
        if (propertyType === PropertyType.BUFFER) {
            this._prereadBuffers(context);
        }
        else if (propertyType === PropertyType.PRIMITIVE) {
            this._prereadPrimitives(context);
        }
        return this;
    }
    _prereadBuffers(context) {
        const jsonDoc = context.jsonDoc;
        const viewDefs = jsonDoc.json.bufferViews || [];
        viewDefs.forEach((viewDef, index) => {
            if (!viewDef.extensions || !viewDef.extensions[NAME$n])
                return;
            const meshoptDef = viewDef.extensions[NAME$n];
            const byteOffset = meshoptDef.byteOffset || 0;
            const byteLength = meshoptDef.byteLength || 0;
            const count = meshoptDef.count;
            const stride = meshoptDef.byteStride;
            const result = new Uint8Array(count * stride);
            const bufferDef = jsonDoc.json.buffers[meshoptDef.buffer];
            const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
            const source = BufferUtils.toView(resource, byteOffset, byteLength);
            this._decoder.decodeGltfBuffer(result, count, stride, source, meshoptDef.mode, meshoptDef.filter);
            context.bufferViews[index] = result;
        });
    }
    _prereadPrimitives(context) {
        const jsonDoc = context.jsonDoc;
        const viewDefs = jsonDoc.json.bufferViews || [];
        viewDefs.forEach((viewDef) => {
            if (!viewDef.extensions || !viewDef.extensions[NAME$n])
                return;
            const meshoptDef = viewDef.extensions[NAME$n];
            const buffer = context.buffers[meshoptDef.buffer];
            const fallbackBuffer = context.buffers[viewDef.buffer];
            const fallbackBufferDef = jsonDoc.json.buffers[viewDef.buffer];
            if (isFallbackBuffer(fallbackBufferDef)) {
                this._decoderFallbackBufferMap.set(fallbackBuffer, buffer);
            }
        });
    }
    read(_context) {
        if (!this.isRequired())
            return this;
        for (const [fallbackBuffer, buffer] of this._decoderFallbackBufferMap) {
            for (const parent of fallbackBuffer.listParents()) {
                if (parent instanceof Accessor) {
                    parent.swap(fallbackBuffer, buffer);
                }
            }
            fallbackBuffer.dispose();
        }
        return this;
    }
    prewrite(context, propertyType) {
        if (propertyType === PropertyType.ACCESSOR) {
            this._prewriteAccessors(context);
        }
        else if (propertyType === PropertyType.BUFFER) {
            this._prewriteBuffers(context);
        }
        return this;
    }
    _prewriteAccessors(context) {
        const json = context.jsonDoc.json;
        const encoder = this._encoder;
        const options = this._encoderOptions;
        const graph = this.document.getGraph();
        const fallbackBuffer = this.document.createBuffer();
        const fallbackBufferIndex = this.document.getRoot().listBuffers().indexOf(fallbackBuffer);
        let nextID = 1;
        const parentToID = new Map();
        const getParentID = (property) => {
            for (const parent of graph.listParents(property)) {
                if (parent.propertyType === PropertyType.ROOT)
                    continue;
                let id = parentToID.get(property);
                if (id === void 0)
                    parentToID.set(property, id = nextID++);
                return id;
            }
            return -1;
        };
        this._encoderFallbackBuffer = fallbackBuffer;
        this._encoderBufferViews = {};
        this._encoderBufferViewData = {};
        this._encoderBufferViewAccessors = {};
        for (const accessor of this.document.getRoot().listAccessors()) {
            if (getTargetPath(accessor) === "weights")
                continue;
            if (accessor.getSparse())
                continue;
            const usage = context.getAccessorUsage(accessor);
            const parentID = context.accessorUsageGroupedByParent.has(usage) ? getParentID(accessor) : null;
            const mode = getMeshoptMode(accessor, usage);
            const filter = options.method === EncoderMethod$1.FILTER ? getMeshoptFilter(accessor, this.document) : {
                filter: MeshoptFilter.NONE
            };
            const preparedAccessor = prepareAccessor(accessor, encoder, mode, filter);
            const { array, byteStride } = preparedAccessor;
            const buffer = accessor.getBuffer();
            if (!buffer)
                throw new Error(`${NAME$n}: Missing buffer for accessor.`);
            const bufferIndex = this.document.getRoot().listBuffers().indexOf(buffer);
            const key = [usage, parentID, mode, filter.filter, byteStride, bufferIndex].join(":");
            let bufferView = this._encoderBufferViews[key];
            let bufferViewData = this._encoderBufferViewData[key];
            let bufferViewAccessors = this._encoderBufferViewAccessors[key];
            if (!bufferView || !bufferViewData) {
                bufferViewAccessors = this._encoderBufferViewAccessors[key] = [];
                bufferViewData = this._encoderBufferViewData[key] = [];
                bufferView = this._encoderBufferViews[key] = {
                    buffer: fallbackBufferIndex,
                    target: WriterContext.USAGE_TO_TARGET[usage],
                    byteOffset: 0,
                    byteLength: 0,
                    byteStride: usage === WriterContext.BufferViewUsage.ARRAY_BUFFER ? byteStride : void 0,
                    extensions: {
                        [NAME$n]: {
                            buffer: bufferIndex,
                            byteOffset: 0,
                            byteLength: 0,
                            mode,
                            filter: filter.filter !== MeshoptFilter.NONE ? filter.filter : void 0,
                            byteStride,
                            count: 0
                        }
                    }
                };
            }
            const accessorDef = context.createAccessorDef(accessor);
            accessorDef.componentType = preparedAccessor.componentType;
            accessorDef.normalized = preparedAccessor.normalized;
            accessorDef.byteOffset = bufferView.byteLength;
            if (accessorDef.min && preparedAccessor.min)
                accessorDef.min = preparedAccessor.min;
            if (accessorDef.max && preparedAccessor.max)
                accessorDef.max = preparedAccessor.max;
            context.accessorIndexMap.set(accessor, json.accessors.length);
            json.accessors.push(accessorDef);
            bufferViewAccessors.push(accessorDef);
            bufferViewData.push(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
            bufferView.byteLength += array.byteLength;
            bufferView.extensions.EXT_meshopt_compression.count += accessor.getCount();
        }
    }
    _prewriteBuffers(context) {
        const encoder = this._encoder;
        for (const key in this._encoderBufferViews) {
            const bufferView = this._encoderBufferViews[key];
            const bufferViewData = this._encoderBufferViewData[key];
            const buffer = this.document.getRoot().listBuffers()[bufferView.extensions[NAME$n].buffer];
            const otherBufferViews = context.otherBufferViews.get(buffer) || [];
            const { count, byteStride, mode } = bufferView.extensions[NAME$n];
            const srcArray = BufferUtils.concat(bufferViewData);
            const dstArray = encoder.encodeGltfBuffer(srcArray, count, byteStride, mode);
            const compressedData = BufferUtils.pad(dstArray);
            bufferView.extensions[NAME$n].byteLength = dstArray.byteLength;
            bufferViewData.length = 0;
            bufferViewData.push(compressedData);
            otherBufferViews.push(compressedData);
            context.otherBufferViews.set(buffer, otherBufferViews);
        }
    }
    write(context) {
        let fallbackBufferByteOffset = 0;
        for (const key in this._encoderBufferViews) {
            const bufferView = this._encoderBufferViews[key];
            const bufferViewData = this._encoderBufferViewData[key][0];
            const bufferViewIndex = context.otherBufferViewsIndexMap.get(bufferViewData);
            const bufferViewAccessors = this._encoderBufferViewAccessors[key];
            for (const accessorDef of bufferViewAccessors) {
                accessorDef.bufferView = bufferViewIndex;
            }
            const finalBufferViewDef = context.jsonDoc.json.bufferViews[bufferViewIndex];
            const compressedByteOffset = finalBufferViewDef.byteOffset || 0;
            Object.assign(finalBufferViewDef, bufferView);
            finalBufferViewDef.byteOffset = fallbackBufferByteOffset;
            const bufferViewExtensionDef = finalBufferViewDef.extensions[NAME$n];
            bufferViewExtensionDef.byteOffset = compressedByteOffset;
            fallbackBufferByteOffset += BufferUtils.padNumber(bufferView.byteLength);
        }
        const fallbackBuffer = this._encoderFallbackBuffer;
        const fallbackBufferIndex = context.bufferIndexMap.get(fallbackBuffer);
        const fallbackBufferDef = context.jsonDoc.json.buffers[fallbackBufferIndex];
        fallbackBufferDef.byteLength = fallbackBufferByteOffset;
        fallbackBufferDef.extensions = {
            [NAME$n]: {
                fallback: true
            }
        };
        fallbackBuffer.dispose();
        return this;
    }
};
EXTMeshoptCompression.EXTENSION_NAME = NAME$n;
EXTMeshoptCompression.EncoderMethod = EncoderMethod$1;
var NAME$m = EXT_TEXTURE_AVIF;
var AVIFImageUtils = class {
    match(array) {
        return array.length >= 12 && BufferUtils.decodeText(array.slice(4, 12)) === "ftypavif";
    }
    getSize(array) {
        if (!this.match(array))
            return null;
        const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
        let box = unbox(view, 0);
        if (!box)
            return null;
        let offset = box.end;
        while (box = unbox(view, offset)) {
            if (box.type === "meta") {
                offset = box.start + 4;
            }
            else if (box.type === "iprp" || box.type === "ipco") {
                offset = box.start;
            }
            else if (box.type === "ispe") {
                return [view.getUint32(box.start + 4), view.getUint32(box.start + 8)];
            }
            else if (box.type === "mdat") {
                break;
            }
            else {
                offset = box.end;
            }
        }
        return null;
    }
    getChannels(_buffer) {
        return 4;
    }
};
var EXTTextureAVIF = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$m;
        this.prereadTypes = [PropertyType.TEXTURE];
    }
    static register() {
        ImageUtils.registerFormat("image/avif", new AVIFImageUtils());
    }
    preread(context) {
        const textureDefs = context.jsonDoc.json.textures || [];
        textureDefs.forEach((textureDef) => {
            if (textureDef.extensions && textureDef.extensions[NAME$m]) {
                textureDef.source = textureDef.extensions[NAME$m].source;
            }
        });
        return this;
    }
    read(context) {
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listTextures().forEach((texture) => {
            if (texture.getMimeType() === "image/avif") {
                const imageIndex = context.imageIndexMap.get(texture);
                const textureDefs = jsonDoc.json.textures || [];
                textureDefs.forEach((textureDef) => {
                    if (textureDef.source === imageIndex) {
                        textureDef.extensions = textureDef.extensions || {};
                        textureDef.extensions[NAME$m] = {
                            source: textureDef.source
                        };
                        delete textureDef.source;
                    }
                });
            }
        });
        return this;
    }
};
EXTTextureAVIF.EXTENSION_NAME = NAME$m;
function unbox(data, offset) {
    if (data.byteLength < 4 + offset)
        return null;
    const size = data.getUint32(offset);
    if (data.byteLength < size + offset || size < 8)
        return null;
    return {
        type: BufferUtils.decodeText(new Uint8Array(data.buffer, data.byteOffset + offset + 4, 4)),
        start: offset + 8,
        end: offset + size
    };
}
var NAME$l = EXT_TEXTURE_WEBP;
var WEBPImageUtils = class {
    match(array) {
        return array.length >= 12 && array[8] === 87 && array[9] === 69 && array[10] === 66 && array[11] === 80;
    }
    getSize(array) {
        const RIFF = BufferUtils.decodeText(array.slice(0, 4));
        const WEBP = BufferUtils.decodeText(array.slice(8, 12));
        if (RIFF !== "RIFF" || WEBP !== "WEBP")
            return null;
        const view = new DataView(array.buffer, array.byteOffset);
        let offset = 12;
        while (offset < view.byteLength) {
            const chunkId = BufferUtils.decodeText(new Uint8Array([view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)]));
            const chunkByteLength = view.getUint32(offset + 4, true);
            if (chunkId === "VP8 ") {
                const width = view.getInt16(offset + 14, true) & 16383;
                const height = view.getInt16(offset + 16, true) & 16383;
                return [width, height];
            }
            else if (chunkId === "VP8L") {
                const b0 = view.getUint8(offset + 9);
                const b1 = view.getUint8(offset + 10);
                const b2 = view.getUint8(offset + 11);
                const b3 = view.getUint8(offset + 12);
                const width = 1 + ((b1 & 63) << 8 | b0);
                const height = 1 + ((b3 & 15) << 10 | b2 << 2 | (b1 & 192) >> 6);
                return [width, height];
            }
            offset += 8 + chunkByteLength + chunkByteLength % 2;
        }
        return null;
    }
    getChannels(_buffer) {
        return 4;
    }
};
var EXTTextureWebP = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$l;
        this.prereadTypes = [PropertyType.TEXTURE];
    }
    static register() {
        ImageUtils.registerFormat("image/webp", new WEBPImageUtils());
    }
    preread(context) {
        const textureDefs = context.jsonDoc.json.textures || [];
        textureDefs.forEach((textureDef) => {
            if (textureDef.extensions && textureDef.extensions[NAME$l]) {
                textureDef.source = textureDef.extensions[NAME$l].source;
            }
        });
        return this;
    }
    read(context) {
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listTextures().forEach((texture) => {
            if (texture.getMimeType() === "image/webp") {
                const imageIndex = context.imageIndexMap.get(texture);
                const textureDefs = jsonDoc.json.textures || [];
                textureDefs.forEach((textureDef) => {
                    if (textureDef.source === imageIndex) {
                        textureDef.extensions = textureDef.extensions || {};
                        textureDef.extensions[NAME$l] = {
                            source: textureDef.source
                        };
                        delete textureDef.source;
                    }
                });
            }
        });
        return this;
    }
};
EXTTextureWebP.EXTENSION_NAME = NAME$l;
var NAME$k = KHR_DRACO_MESH_COMPRESSION;
var decoderModule;
var COMPONENT_ARRAY;
var DATA_TYPE;
function decodeGeometry(decoder, data) {
    const buffer = new decoderModule.DecoderBuffer();
    try {
        buffer.Init(data, data.length);
        const geometryType = decoder.GetEncodedGeometryType(buffer);
        if (geometryType !== decoderModule.TRIANGULAR_MESH) {
            throw new Error(`[${NAME$k}] Unknown geometry type.`);
        }
        const dracoMesh = new decoderModule.Mesh();
        const status = decoder.DecodeBufferToMesh(buffer, dracoMesh);
        if (!status.ok() || dracoMesh.ptr === 0) {
            throw new Error(`[${NAME$k}] Decoding failure.`);
        }
        return dracoMesh;
    }
    finally {
        decoderModule.destroy(buffer);
    }
}
function decodeIndex(decoder, mesh) {
    const numFaces = mesh.num_faces();
    const numIndices = numFaces * 3;
    let ptr;
    let indices;
    if (mesh.num_points() <= 65534) {
        const byteLength = numIndices * Uint16Array.BYTES_PER_ELEMENT;
        ptr = decoderModule._malloc(byteLength);
        decoder.GetTrianglesUInt16Array(mesh, byteLength, ptr);
        indices = new Uint16Array(decoderModule.HEAPU16.buffer, ptr, numIndices).slice();
    }
    else {
        const byteLength = numIndices * Uint32Array.BYTES_PER_ELEMENT;
        ptr = decoderModule._malloc(byteLength);
        decoder.GetTrianglesUInt32Array(mesh, byteLength, ptr);
        indices = new Uint32Array(decoderModule.HEAPU32.buffer, ptr, numIndices).slice();
    }
    decoderModule._free(ptr);
    return indices;
}
function decodeAttribute(decoder, mesh, attribute, accessorDef) {
    const dataType = DATA_TYPE[accessorDef.componentType];
    const ArrayCtor = COMPONENT_ARRAY[accessorDef.componentType];
    const numComponents = attribute.num_components();
    const numPoints = mesh.num_points();
    const numValues = numPoints * numComponents;
    const byteLength = numValues * ArrayCtor.BYTES_PER_ELEMENT;
    const ptr = decoderModule._malloc(byteLength);
    decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
    const array = new ArrayCtor(decoderModule.HEAPF32.buffer, ptr, numValues).slice();
    decoderModule._free(ptr);
    return array;
}
function initDecoderModule(_decoderModule) {
    decoderModule = _decoderModule;
    COMPONENT_ARRAY = {
        [Accessor.ComponentType.FLOAT]: Float32Array,
        [Accessor.ComponentType.UNSIGNED_INT]: Uint32Array,
        [Accessor.ComponentType.UNSIGNED_SHORT]: Uint16Array,
        [Accessor.ComponentType.UNSIGNED_BYTE]: Uint8Array,
        [Accessor.ComponentType.SHORT]: Int16Array,
        [Accessor.ComponentType.BYTE]: Int8Array
    };
    DATA_TYPE = {
        [Accessor.ComponentType.FLOAT]: decoderModule.DT_FLOAT32,
        [Accessor.ComponentType.UNSIGNED_INT]: decoderModule.DT_UINT32,
        [Accessor.ComponentType.UNSIGNED_SHORT]: decoderModule.DT_UINT16,
        [Accessor.ComponentType.UNSIGNED_BYTE]: decoderModule.DT_UINT8,
        [Accessor.ComponentType.SHORT]: decoderModule.DT_INT16,
        [Accessor.ComponentType.BYTE]: decoderModule.DT_INT8
    };
}
var encoderModule;
var EncoderMethod;
(function (EncoderMethod2) {
    EncoderMethod2[EncoderMethod2["EDGEBREAKER"] = 1] = "EDGEBREAKER";
    EncoderMethod2[EncoderMethod2["SEQUENTIAL"] = 0] = "SEQUENTIAL";
})(EncoderMethod || (EncoderMethod = {}));
var AttributeEnum;
(function (AttributeEnum2) {
    AttributeEnum2["POSITION"] = "POSITION";
    AttributeEnum2["NORMAL"] = "NORMAL";
    AttributeEnum2["COLOR"] = "COLOR";
    AttributeEnum2["TEX_COORD"] = "TEX_COORD";
    AttributeEnum2["GENERIC"] = "GENERIC";
})(AttributeEnum || (AttributeEnum = {}));
var DEFAULT_QUANTIZATION_BITS = {
    [AttributeEnum.POSITION]: 14,
    [AttributeEnum.NORMAL]: 10,
    [AttributeEnum.COLOR]: 8,
    [AttributeEnum.TEX_COORD]: 12,
    [AttributeEnum.GENERIC]: 12
};
var DEFAULT_ENCODER_OPTIONS = {
    decodeSpeed: 5,
    encodeSpeed: 5,
    method: EncoderMethod.EDGEBREAKER,
    quantizationBits: DEFAULT_QUANTIZATION_BITS,
    quantizationVolume: "mesh"
};
function initEncoderModule(_encoderModule) {
    encoderModule = _encoderModule;
}
function encodeGeometry(prim, _options = DEFAULT_ENCODER_OPTIONS) {
    const options = _extends3({}, DEFAULT_ENCODER_OPTIONS, _options);
    options.quantizationBits = _extends3({}, DEFAULT_QUANTIZATION_BITS, _options.quantizationBits);
    const builder = new encoderModule.MeshBuilder();
    const mesh = new encoderModule.Mesh();
    const encoder = new encoderModule.ExpertEncoder(mesh);
    const attributeIDs = {};
    const dracoBuffer = new encoderModule.DracoInt8Array();
    const hasMorphTargets = prim.listTargets().length > 0;
    let hasSparseAttributes = false;
    for (const semantic of prim.listSemantics()) {
        const attribute = prim.getAttribute(semantic);
        if (attribute.getSparse()) {
            hasSparseAttributes = true;
            continue;
        }
        const attributeEnum = getAttributeEnum(semantic);
        const attributeID = addAttribute(builder, attribute.getComponentType(), mesh, encoderModule[attributeEnum], attribute.getCount(), attribute.getElementSize(), attribute.getArray());
        if (attributeID === -1)
            throw new Error(`Error compressing "${semantic}" attribute.`);
        attributeIDs[semantic] = attributeID;
        if (options.quantizationVolume === "mesh" || semantic !== "POSITION") {
            encoder.SetAttributeQuantization(attributeID, options.quantizationBits[attributeEnum]);
        }
        else if (typeof options.quantizationVolume === "object") {
            const { quantizationVolume } = options;
            const range = Math.max(quantizationVolume.max[0] - quantizationVolume.min[0], quantizationVolume.max[1] - quantizationVolume.min[1], quantizationVolume.max[2] - quantizationVolume.min[2]);
            encoder.SetAttributeExplicitQuantization(attributeID, options.quantizationBits[attributeEnum], attribute.getElementSize(), quantizationVolume.min, range);
        }
        else {
            throw new Error("Invalid quantization volume state.");
        }
    }
    const indices = prim.getIndices();
    if (!indices)
        throw new EncodingError("Primitive must have indices.");
    builder.AddFacesToMesh(mesh, indices.getCount() / 3, indices.getArray());
    encoder.SetSpeedOptions(options.encodeSpeed, options.decodeSpeed);
    encoder.SetTrackEncodedProperties(true);
    if (options.method === EncoderMethod.SEQUENTIAL || hasMorphTargets || hasSparseAttributes) {
        encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
    }
    else {
        encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
    }
    const byteLength = encoder.EncodeToDracoBuffer(!(hasMorphTargets || hasSparseAttributes), dracoBuffer);
    if (byteLength <= 0)
        throw new EncodingError("Error applying Draco compression.");
    const data = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; ++i) {
        data[i] = dracoBuffer.GetValue(i);
    }
    const numVertices = encoder.GetNumberOfEncodedPoints();
    const numIndices = encoder.GetNumberOfEncodedFaces() * 3;
    encoderModule.destroy(dracoBuffer);
    encoderModule.destroy(mesh);
    encoderModule.destroy(builder);
    encoderModule.destroy(encoder);
    return {
        numVertices,
        numIndices,
        data,
        attributeIDs
    };
}
function getAttributeEnum(semantic) {
    if (semantic === "POSITION") {
        return AttributeEnum.POSITION;
    }
    else if (semantic === "NORMAL") {
        return AttributeEnum.NORMAL;
    }
    else if (semantic.startsWith("COLOR_")) {
        return AttributeEnum.COLOR;
    }
    else if (semantic.startsWith("TEXCOORD_")) {
        return AttributeEnum.TEX_COORD;
    }
    return AttributeEnum.GENERIC;
}
function addAttribute(builder, componentType, mesh, attribute, count, itemSize, array) {
    switch (componentType) {
        case Accessor.ComponentType.UNSIGNED_BYTE:
            return builder.AddUInt8Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.BYTE:
            return builder.AddInt8Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.UNSIGNED_SHORT:
            return builder.AddUInt16Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.SHORT:
            return builder.AddInt16Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.UNSIGNED_INT:
            return builder.AddUInt32Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.FLOAT:
            return builder.AddFloatAttribute(mesh, attribute, count, itemSize, array);
        default:
            throw new Error(`Unexpected component type, "${componentType}".`);
    }
}
var EncodingError = class extends Error {
};
var NAME$j = KHR_DRACO_MESH_COMPRESSION;
var KHRDracoMeshCompression = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$j;
        this.prereadTypes = [PropertyType.PRIMITIVE];
        this.prewriteTypes = [PropertyType.ACCESSOR];
        this.readDependencies = ["draco3d.decoder"];
        this.writeDependencies = ["draco3d.encoder"];
        this._decoderModule = null;
        this._encoderModule = null;
        this._encoderOptions = {};
    }
    install(key, dependency) {
        if (key === "draco3d.decoder") {
            this._decoderModule = dependency;
            initDecoderModule(this._decoderModule);
        }
        if (key === "draco3d.encoder") {
            this._encoderModule = dependency;
            initEncoderModule(this._encoderModule);
        }
        return this;
    }
    setEncoderOptions(options) {
        this._encoderOptions = options;
        return this;
    }
    preread(context) {
        if (!this._decoderModule) {
            throw new Error(`[${NAME$j}] Please install extension dependency, "draco3d.decoder".`);
        }
        const logger = this.document.getLogger();
        const jsonDoc = context.jsonDoc;
        const dracoMeshes = new Map();
        try {
            const meshDefs = jsonDoc.json.meshes || [];
            for (const meshDef of meshDefs) {
                for (const primDef of meshDef.primitives) {
                    if (!primDef.extensions || !primDef.extensions[NAME$j])
                        continue;
                    const dracoDef = primDef.extensions[NAME$j];
                    let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];
                    if (!dracoMesh || !decoder) {
                        const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
                        const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
                        const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
                        const byteOffset = bufferViewDef.byteOffset || 0;
                        const byteLength = bufferViewDef.byteLength;
                        const compressedData = BufferUtils.toView(resource, byteOffset, byteLength);
                        decoder = new this._decoderModule.Decoder();
                        dracoMesh = decodeGeometry(decoder, compressedData);
                        dracoMeshes.set(dracoDef.bufferView, [decoder, dracoMesh]);
                        logger.debug(`[${NAME$j}] Decompressed ${compressedData.byteLength} bytes.`);
                    }
                    for (const semantic in dracoDef.attributes) {
                        const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
                        const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
                        const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
                        context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
                    }
                    if (primDef.indices !== void 0) {
                        context.accessors[primDef.indices].setArray(decodeIndex(decoder, dracoMesh));
                    }
                }
            }
        }
        finally {
            for (const [decoder, dracoMesh] of Array.from(dracoMeshes.values())) {
                this._decoderModule.destroy(decoder);
                this._decoderModule.destroy(dracoMesh);
            }
        }
        return this;
    }
    read(_context) {
        return this;
    }
    prewrite(context, _propertyType) {
        if (!this._encoderModule) {
            throw new Error(`[${NAME$j}] Please install extension dependency, "draco3d.encoder".`);
        }
        const logger = this.document.getLogger();
        logger.debug(`[${NAME$j}] Compression options: ${JSON.stringify(this._encoderOptions)}`);
        const primitiveHashMap = listDracoPrimitives(this.document);
        const primitiveEncodingMap = new Map();
        let quantizationVolume = "mesh";
        if (this._encoderOptions.quantizationVolume === "scene") {
            if (this.document.getRoot().listScenes().length !== 1) {
                logger.warn(`[${NAME$j}]: quantizationVolume=scene requires exactly 1 scene.`);
            }
            else {
                quantizationVolume = getBounds(this.document.getRoot().listScenes().pop());
            }
        }
        for (const prim of Array.from(primitiveHashMap.keys())) {
            const primHash = primitiveHashMap.get(prim);
            if (!primHash)
                throw new Error("Unexpected primitive.");
            if (primitiveEncodingMap.has(primHash)) {
                primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash));
                continue;
            }
            const indices = prim.getIndices();
            const accessorDefs = context.jsonDoc.json.accessors;
            let encodedPrim;
            try {
                encodedPrim = encodeGeometry(prim, _extends3({}, this._encoderOptions, {
                    quantizationVolume
                }));
            }
            catch (e2) {
                if (e2 instanceof EncodingError) {
                    logger.warn(`[${NAME$j}]: ${e2.message} Skipping primitive compression.`);
                    continue;
                }
                throw e2;
            }
            primitiveEncodingMap.set(primHash, encodedPrim);
            const indicesDef = context.createAccessorDef(indices);
            indicesDef.count = encodedPrim.numIndices;
            context.accessorIndexMap.set(indices, accessorDefs.length);
            accessorDefs.push(indicesDef);
            if (encodedPrim.numVertices > 65534 && Accessor.getComponentSize(indicesDef.componentType) <= 2) {
                indicesDef.componentType = Accessor.ComponentType.UNSIGNED_INT;
            }
            else if (encodedPrim.numVertices > 254 && Accessor.getComponentSize(indicesDef.componentType) <= 1) {
                indicesDef.componentType = Accessor.ComponentType.UNSIGNED_SHORT;
            }
            for (const semantic of prim.listSemantics()) {
                const attribute = prim.getAttribute(semantic);
                if (encodedPrim.attributeIDs[semantic] === void 0)
                    continue;
                const attributeDef = context.createAccessorDef(attribute);
                attributeDef.count = encodedPrim.numVertices;
                context.accessorIndexMap.set(attribute, accessorDefs.length);
                accessorDefs.push(attributeDef);
            }
            const buffer = prim.getAttribute("POSITION").getBuffer() || this.document.getRoot().listBuffers()[0];
            if (!context.otherBufferViews.has(buffer))
                context.otherBufferViews.set(buffer, []);
            context.otherBufferViews.get(buffer).push(encodedPrim.data);
        }
        logger.debug(`[${NAME$j}] Compressed ${primitiveHashMap.size} primitives.`);
        context.extensionData[NAME$j] = {
            primitiveHashMap,
            primitiveEncodingMap
        };
        return this;
    }
    write(context) {
        const dracoContext = context.extensionData[NAME$j];
        for (const mesh of this.document.getRoot().listMeshes()) {
            const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
            for (let i = 0; i < mesh.listPrimitives().length; i++) {
                const prim = mesh.listPrimitives()[i];
                const primDef = meshDef.primitives[i];
                const primHash = dracoContext.primitiveHashMap.get(prim);
                if (!primHash)
                    continue;
                const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash);
                if (!encodedPrim)
                    continue;
                primDef.extensions = primDef.extensions || {};
                primDef.extensions[NAME$j] = {
                    bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
                    attributes: encodedPrim.attributeIDs
                };
            }
        }
        if (!dracoContext.primitiveHashMap.size) {
            const json = context.jsonDoc.json;
            json.extensionsUsed = (json.extensionsUsed || []).filter((name) => name !== NAME$j);
            json.extensionsRequired = (json.extensionsRequired || []).filter((name) => name !== NAME$j);
        }
        return this;
    }
};
KHRDracoMeshCompression.EXTENSION_NAME = NAME$j;
KHRDracoMeshCompression.EncoderMethod = EncoderMethod;
function listDracoPrimitives(doc) {
    const logger = doc.getLogger();
    const included = new Set();
    const excluded = new Set();
    let nonIndexed = 0;
    let nonTriangles = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            if (!prim.getIndices()) {
                excluded.add(prim);
                nonIndexed++;
            }
            else if (prim.getMode() !== Primitive.Mode.TRIANGLES) {
                excluded.add(prim);
                nonTriangles++;
            }
            else {
                included.add(prim);
            }
        }
    }
    if (nonIndexed > 0) {
        logger.warn(`[${NAME$j}] Skipping Draco compression of ${nonIndexed} non-indexed primitives.`);
    }
    if (nonTriangles > 0) {
        logger.warn(`[${NAME$j}] Skipping Draco compression of ${nonTriangles} non-TRIANGLES primitives.`);
    }
    const accessors = doc.getRoot().listAccessors();
    const accessorIndices = new Map();
    for (let i = 0; i < accessors.length; i++)
        accessorIndices.set(accessors[i], i);
    const includedAccessors = new Map();
    const includedHashKeys = new Set();
    const primToHashKey = new Map();
    for (const prim of Array.from(included)) {
        let hashKey = createHashKey(prim, accessorIndices);
        if (includedHashKeys.has(hashKey)) {
            primToHashKey.set(prim, hashKey);
            continue;
        }
        if (includedAccessors.has(prim.getIndices())) {
            const indices = prim.getIndices();
            const dstIndices = indices.clone();
            accessorIndices.set(dstIndices, doc.getRoot().listAccessors().length - 1);
            prim.swap(indices, dstIndices);
        }
        for (const attribute of prim.listAttributes()) {
            if (includedAccessors.has(attribute)) {
                const dstAttribute = attribute.clone();
                accessorIndices.set(dstAttribute, doc.getRoot().listAccessors().length - 1);
                prim.swap(attribute, dstAttribute);
            }
        }
        hashKey = createHashKey(prim, accessorIndices);
        includedHashKeys.add(hashKey);
        primToHashKey.set(prim, hashKey);
        includedAccessors.set(prim.getIndices(), hashKey);
        for (const attribute of prim.listAttributes()) {
            includedAccessors.set(attribute, hashKey);
        }
    }
    for (const accessor of Array.from(includedAccessors.keys())) {
        const parentTypes = new Set(accessor.listParents().map((prop) => prop.propertyType));
        if (parentTypes.size !== 2 || !parentTypes.has(PropertyType.PRIMITIVE) || !parentTypes.has(PropertyType.ROOT)) {
            throw new Error(`[${NAME$j}] Compressed accessors must only be used as indices or vertex attributes.`);
        }
    }
    for (const prim of Array.from(included)) {
        const hashKey = primToHashKey.get(prim);
        const indices = prim.getIndices();
        if (includedAccessors.get(indices) !== hashKey || prim.listAttributes().some((attr) => includedAccessors.get(attr) !== hashKey)) {
            throw new Error(`[${NAME$j}] Draco primitives must share all, or no, accessors.`);
        }
    }
    for (const prim of Array.from(excluded)) {
        const indices = prim.getIndices();
        if (includedAccessors.has(indices) || prim.listAttributes().some((attr) => includedAccessors.has(attr))) {
            throw new Error(`[${NAME$j}] Accessor cannot be shared by compressed and uncompressed primitives.`);
        }
    }
    return primToHashKey;
}
function createHashKey(prim, indexMap) {
    const hashElements = [];
    const indices = prim.getIndices();
    hashElements.push(indexMap.get(indices));
    for (const attribute of prim.listAttributes()) {
        hashElements.push(indexMap.get(attribute));
    }
    return hashElements.sort().join("|");
}
var Light = class _Light extends ExtensionProperty {
    init() {
        this.extensionName = KHR_LIGHTS_PUNCTUAL;
        this.propertyType = "Light";
        this.parentTypes = [PropertyType.NODE];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            color: [1, 1, 1],
            intensity: 1,
            type: _Light.Type.POINT,
            range: null,
            innerConeAngle: 0,
            outerConeAngle: Math.PI / 4
        });
    }
    getColor() {
        return this.get("color");
    }
    setColor(color) {
        return this.set("color", color);
    }
    getIntensity() {
        return this.get("intensity");
    }
    setIntensity(intensity) {
        return this.set("intensity", intensity);
    }
    getType() {
        return this.get("type");
    }
    setType(type) {
        return this.set("type", type);
    }
    getRange() {
        return this.get("range");
    }
    setRange(range) {
        return this.set("range", range);
    }
    getInnerConeAngle() {
        return this.get("innerConeAngle");
    }
    setInnerConeAngle(angle) {
        return this.set("innerConeAngle", angle);
    }
    getOuterConeAngle() {
        return this.get("outerConeAngle");
    }
    setOuterConeAngle(angle) {
        return this.set("outerConeAngle", angle);
    }
};
Light.EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;
Light.Type = {
    POINT: "point",
    SPOT: "spot",
    DIRECTIONAL: "directional"
};
var NAME$i = KHR_LIGHTS_PUNCTUAL;
var KHRLightsPunctual = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$i;
    }
    createLight(name = "") {
        return new Light(this.document.getGraph(), name);
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$i])
            return this;
        const rootDef = jsonDoc.json.extensions[NAME$i];
        const lightDefs = rootDef.lights || [];
        const lights = lightDefs.map((lightDef) => {
            var _lightDef$spot, _lightDef$spot2;
            const light = this.createLight().setName(lightDef.name || "").setType(lightDef.type);
            if (lightDef.color !== void 0)
                light.setColor(lightDef.color);
            if (lightDef.intensity !== void 0)
                light.setIntensity(lightDef.intensity);
            if (lightDef.range !== void 0)
                light.setRange(lightDef.range);
            if (((_lightDef$spot = lightDef.spot) == null ? void 0 : _lightDef$spot.innerConeAngle) !== void 0) {
                light.setInnerConeAngle(lightDef.spot.innerConeAngle);
            }
            if (((_lightDef$spot2 = lightDef.spot) == null ? void 0 : _lightDef$spot2.outerConeAngle) !== void 0) {
                light.setOuterConeAngle(lightDef.spot.outerConeAngle);
            }
            return light;
        });
        jsonDoc.json.nodes.forEach((nodeDef, nodeIndex) => {
            if (!nodeDef.extensions || !nodeDef.extensions[NAME$i])
                return;
            const lightNodeDef = nodeDef.extensions[NAME$i];
            context.nodes[nodeIndex].setExtension(NAME$i, lights[lightNodeDef.light]);
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        if (this.properties.size === 0)
            return this;
        const lightDefs = [];
        const lightIndexMap = new Map();
        for (const property of this.properties) {
            const light = property;
            const lightDef = {
                type: light.getType()
            };
            if (!MathUtils.eq(light.getColor(), [1, 1, 1]))
                lightDef.color = light.getColor();
            if (light.getIntensity() !== 1)
                lightDef.intensity = light.getIntensity();
            if (light.getRange() != null)
                lightDef.range = light.getRange();
            if (light.getName())
                lightDef.name = light.getName();
            if (light.getType() === Light.Type.SPOT) {
                lightDef.spot = {
                    innerConeAngle: light.getInnerConeAngle(),
                    outerConeAngle: light.getOuterConeAngle()
                };
            }
            lightDefs.push(lightDef);
            lightIndexMap.set(light, lightDefs.length - 1);
        }
        this.document.getRoot().listNodes().forEach((node) => {
            const light = node.getExtension(NAME$i);
            if (light) {
                const nodeIndex = context.nodeIndexMap.get(node);
                const nodeDef = jsonDoc.json.nodes[nodeIndex];
                nodeDef.extensions = nodeDef.extensions || {};
                nodeDef.extensions[NAME$i] = {
                    light: lightIndexMap.get(light)
                };
            }
        });
        jsonDoc.json.extensions = jsonDoc.json.extensions || {};
        jsonDoc.json.extensions[NAME$i] = {
            lights: lightDefs
        };
        return this;
    }
};
KHRLightsPunctual.EXTENSION_NAME = NAME$i;
var { R: R$7, G: G$7, B: B$5 } = TextureChannel;
var Anisotropy = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_ANISOTROPY;
        this.propertyType = "Anisotropy";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            anisotropyStrength: 0,
            anisotropyRotation: 0,
            anisotropyTexture: null,
            anisotropyTextureInfo: new TextureInfo(this.graph, "anisotropyTextureInfo")
        });
    }
    getAnisotropyStrength() {
        return this.get("anisotropyStrength");
    }
    setAnisotropyStrength(strength) {
        return this.set("anisotropyStrength", strength);
    }
    getAnisotropyRotation() {
        return this.get("anisotropyRotation");
    }
    setAnisotropyRotation(rotation) {
        return this.set("anisotropyRotation", rotation);
    }
    getAnisotropyTexture() {
        return this.getRef("anisotropyTexture");
    }
    getAnisotropyTextureInfo() {
        return this.getRef("anisotropyTexture") ? this.getRef("anisotropyTextureInfo") : null;
    }
    setAnisotropyTexture(texture) {
        return this.setRef("anisotropyTexture", texture, {
            channels: R$7 | G$7 | B$5
        });
    }
};
Anisotropy.EXTENSION_NAME = KHR_MATERIALS_ANISOTROPY;
var NAME$h = KHR_MATERIALS_ANISOTROPY;
var KHRMaterialsAnisotropy = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$h;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createAnisotropy() {
        return new Anisotropy(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$h]) {
                const anisotropy = this.createAnisotropy();
                context.materials[materialIndex].setExtension(NAME$h, anisotropy);
                const anisotropyDef = materialDef.extensions[NAME$h];
                if (anisotropyDef.anisotropyStrength !== void 0) {
                    anisotropy.setAnisotropyStrength(anisotropyDef.anisotropyStrength);
                }
                if (anisotropyDef.anisotropyRotation !== void 0) {
                    anisotropy.setAnisotropyRotation(anisotropyDef.anisotropyRotation);
                }
                if (anisotropyDef.anisotropyTexture !== void 0) {
                    const textureInfoDef = anisotropyDef.anisotropyTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    anisotropy.setAnisotropyTexture(texture);
                    context.setTextureInfo(anisotropy.getAnisotropyTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const anisotropy = material.getExtension(NAME$h);
            if (anisotropy) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const anisotropyDef = materialDef.extensions[NAME$h] = {};
                if (anisotropy.getAnisotropyStrength() > 0) {
                    anisotropyDef.anisotropyStrength = anisotropy.getAnisotropyStrength();
                }
                if (anisotropy.getAnisotropyRotation() !== 0) {
                    anisotropyDef.anisotropyRotation = anisotropy.getAnisotropyRotation();
                }
                if (anisotropy.getAnisotropyTexture()) {
                    const texture = anisotropy.getAnisotropyTexture();
                    const textureInfo = anisotropy.getAnisotropyTextureInfo();
                    anisotropyDef.anisotropyTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsAnisotropy.EXTENSION_NAME = NAME$h;
var { R: R$6, G: G$6, B: B$4 } = TextureChannel;
var Clearcoat = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_CLEARCOAT;
        this.propertyType = "Clearcoat";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            clearcoatFactor: 0,
            clearcoatTexture: null,
            clearcoatTextureInfo: new TextureInfo(this.graph, "clearcoatTextureInfo"),
            clearcoatRoughnessFactor: 0,
            clearcoatRoughnessTexture: null,
            clearcoatRoughnessTextureInfo: new TextureInfo(this.graph, "clearcoatRoughnessTextureInfo"),
            clearcoatNormalScale: 1,
            clearcoatNormalTexture: null,
            clearcoatNormalTextureInfo: new TextureInfo(this.graph, "clearcoatNormalTextureInfo")
        });
    }
    getClearcoatFactor() {
        return this.get("clearcoatFactor");
    }
    setClearcoatFactor(factor) {
        return this.set("clearcoatFactor", factor);
    }
    getClearcoatTexture() {
        return this.getRef("clearcoatTexture");
    }
    getClearcoatTextureInfo() {
        return this.getRef("clearcoatTexture") ? this.getRef("clearcoatTextureInfo") : null;
    }
    setClearcoatTexture(texture) {
        return this.setRef("clearcoatTexture", texture, {
            channels: R$6
        });
    }
    getClearcoatRoughnessFactor() {
        return this.get("clearcoatRoughnessFactor");
    }
    setClearcoatRoughnessFactor(factor) {
        return this.set("clearcoatRoughnessFactor", factor);
    }
    getClearcoatRoughnessTexture() {
        return this.getRef("clearcoatRoughnessTexture");
    }
    getClearcoatRoughnessTextureInfo() {
        return this.getRef("clearcoatRoughnessTexture") ? this.getRef("clearcoatRoughnessTextureInfo") : null;
    }
    setClearcoatRoughnessTexture(texture) {
        return this.setRef("clearcoatRoughnessTexture", texture, {
            channels: G$6
        });
    }
    getClearcoatNormalScale() {
        return this.get("clearcoatNormalScale");
    }
    setClearcoatNormalScale(scale2) {
        return this.set("clearcoatNormalScale", scale2);
    }
    getClearcoatNormalTexture() {
        return this.getRef("clearcoatNormalTexture");
    }
    getClearcoatNormalTextureInfo() {
        return this.getRef("clearcoatNormalTexture") ? this.getRef("clearcoatNormalTextureInfo") : null;
    }
    setClearcoatNormalTexture(texture) {
        return this.setRef("clearcoatNormalTexture", texture, {
            channels: R$6 | G$6 | B$4
        });
    }
};
Clearcoat.EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;
var NAME$g = KHR_MATERIALS_CLEARCOAT;
var KHRMaterialsClearcoat = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$g;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createClearcoat() {
        return new Clearcoat(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$g]) {
                const clearcoat = this.createClearcoat();
                context.materials[materialIndex].setExtension(NAME$g, clearcoat);
                const clearcoatDef = materialDef.extensions[NAME$g];
                if (clearcoatDef.clearcoatFactor !== void 0) {
                    clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
                }
                if (clearcoatDef.clearcoatRoughnessFactor !== void 0) {
                    clearcoat.setClearcoatRoughnessFactor(clearcoatDef.clearcoatRoughnessFactor);
                }
                if (clearcoatDef.clearcoatTexture !== void 0) {
                    const textureInfoDef = clearcoatDef.clearcoatTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
                }
                if (clearcoatDef.clearcoatRoughnessTexture !== void 0) {
                    const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatRoughnessTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatRoughnessTextureInfo(), textureInfoDef);
                }
                if (clearcoatDef.clearcoatNormalTexture !== void 0) {
                    const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatNormalTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatNormalTextureInfo(), textureInfoDef);
                    if (textureInfoDef.scale !== void 0) {
                        clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
                    }
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const clearcoat = material.getExtension(NAME$g);
            if (clearcoat) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const clearcoatDef = materialDef.extensions[NAME$g] = {
                    clearcoatFactor: clearcoat.getClearcoatFactor(),
                    clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor()
                };
                if (clearcoat.getClearcoatTexture()) {
                    const texture = clearcoat.getClearcoatTexture();
                    const textureInfo = clearcoat.getClearcoatTextureInfo();
                    clearcoatDef.clearcoatTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (clearcoat.getClearcoatRoughnessTexture()) {
                    const texture = clearcoat.getClearcoatRoughnessTexture();
                    const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
                    clearcoatDef.clearcoatRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (clearcoat.getClearcoatNormalTexture()) {
                    const texture = clearcoat.getClearcoatNormalTexture();
                    const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
                    clearcoatDef.clearcoatNormalTexture = context.createTextureInfoDef(texture, textureInfo);
                    if (clearcoat.getClearcoatNormalScale() !== 1) {
                        clearcoatDef.clearcoatNormalTexture.scale = clearcoat.getClearcoatNormalScale();
                    }
                }
            }
        });
        return this;
    }
};
KHRMaterialsClearcoat.EXTENSION_NAME = NAME$g;
var { R: R$5, G: G$5, B: B$3, A: A$3 } = TextureChannel;
var DiffuseTransmission = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
        this.propertyType = "DiffuseTransmission";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            diffuseTransmissionFactor: 0,
            diffuseTransmissionTexture: null,
            diffuseTransmissionTextureInfo: new TextureInfo(this.graph, "diffuseTransmissionTextureInfo"),
            diffuseTransmissionColorFactor: [1, 1, 1],
            diffuseTransmissionColorTexture: null,
            diffuseTransmissionColorTextureInfo: new TextureInfo(this.graph, "diffuseTransmissionColorTextureInfo")
        });
    }
    getDiffuseTransmissionFactor() {
        return this.get("diffuseTransmissionFactor");
    }
    setDiffuseTransmissionFactor(factor) {
        return this.set("diffuseTransmissionFactor", factor);
    }
    getDiffuseTransmissionTexture() {
        return this.getRef("diffuseTransmissionTexture");
    }
    getDiffuseTransmissionTextureInfo() {
        return this.getRef("diffuseTransmissionTexture") ? this.getRef("diffuseTransmissionTextureInfo") : null;
    }
    setDiffuseTransmissionTexture(texture) {
        return this.setRef("diffuseTransmissionTexture", texture, {
            channels: A$3
        });
    }
    getDiffuseTransmissionColorFactor() {
        return this.get("diffuseTransmissionColorFactor");
    }
    setDiffuseTransmissionColorFactor(factor) {
        return this.set("diffuseTransmissionColorFactor", factor);
    }
    getDiffuseTransmissionColorTexture() {
        return this.getRef("diffuseTransmissionColorTexture");
    }
    getDiffuseTransmissionColorTextureInfo() {
        return this.getRef("diffuseTransmissionColorTexture") ? this.getRef("diffuseTransmissionColorTextureInfo") : null;
    }
    setDiffuseTransmissionColorTexture(texture) {
        return this.setRef("diffuseTransmissionColorTexture", texture, {
            channels: R$5 | G$5 | B$3
        });
    }
};
DiffuseTransmission.EXTENSION_NAME = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
var NAME$f = KHR_MATERIALS_DIFFUSE_TRANSMISSION;
var KHRMaterialsDiffuseTransmission = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$f;
    }
    createDiffuseTransmission() {
        return new DiffuseTransmission(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$f]) {
                const transmission = this.createDiffuseTransmission();
                context.materials[materialIndex].setExtension(NAME$f, transmission);
                const transmissionDef = materialDef.extensions[NAME$f];
                if (transmissionDef.diffuseTransmissionFactor !== void 0) {
                    transmission.setDiffuseTransmissionFactor(transmissionDef.diffuseTransmissionFactor);
                }
                if (transmissionDef.diffuseTransmissionColorFactor !== void 0) {
                    transmission.setDiffuseTransmissionColorFactor(transmissionDef.diffuseTransmissionColorFactor);
                }
                if (transmissionDef.diffuseTransmissionTexture !== void 0) {
                    const textureInfoDef = transmissionDef.diffuseTransmissionTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    transmission.setDiffuseTransmissionTexture(texture);
                    context.setTextureInfo(transmission.getDiffuseTransmissionTextureInfo(), textureInfoDef);
                }
                if (transmissionDef.diffuseTransmissionColorTexture !== void 0) {
                    const textureInfoDef = transmissionDef.diffuseTransmissionColorTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    transmission.setDiffuseTransmissionColorTexture(texture);
                    context.setTextureInfo(transmission.getDiffuseTransmissionColorTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        for (const material of this.document.getRoot().listMaterials()) {
            const transmission = material.getExtension(NAME$f);
            if (!transmission)
                continue;
            const materialIndex = context.materialIndexMap.get(material);
            const materialDef = jsonDoc.json.materials[materialIndex];
            materialDef.extensions = materialDef.extensions || {};
            const transmissionDef = materialDef.extensions[NAME$f] = {
                diffuseTransmissionFactor: transmission.getDiffuseTransmissionFactor(),
                diffuseTransmissionColorFactor: transmission.getDiffuseTransmissionColorFactor()
            };
            if (transmission.getDiffuseTransmissionTexture()) {
                const texture = transmission.getDiffuseTransmissionTexture();
                const textureInfo = transmission.getDiffuseTransmissionTextureInfo();
                transmissionDef.diffuseTransmissionTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            if (transmission.getDiffuseTransmissionColorTexture()) {
                const texture = transmission.getDiffuseTransmissionColorTexture();
                const textureInfo = transmission.getDiffuseTransmissionColorTextureInfo();
                transmissionDef.diffuseTransmissionColorTexture = context.createTextureInfoDef(texture, textureInfo);
            }
        }
        return this;
    }
};
KHRMaterialsDiffuseTransmission.EXTENSION_NAME = NAME$f;
var Dispersion = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_DISPERSION;
        this.propertyType = "Dispersion";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            dispersion: 0
        });
    }
    getDispersion() {
        return this.get("dispersion");
    }
    setDispersion(dispersion) {
        return this.set("dispersion", dispersion);
    }
};
Dispersion.EXTENSION_NAME = KHR_MATERIALS_DISPERSION;
var NAME$e = KHR_MATERIALS_DISPERSION;
var KHRMaterialsDispersion = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$e;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createDispersion() {
        return new Dispersion(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$e]) {
                const dispersion = this.createDispersion();
                context.materials[materialIndex].setExtension(NAME$e, dispersion);
                const dispersionDef = materialDef.extensions[NAME$e];
                if (dispersionDef.dispersion !== void 0) {
                    dispersion.setDispersion(dispersionDef.dispersion);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const dispersion = material.getExtension(NAME$e);
            if (dispersion) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME$e] = {
                    dispersion: dispersion.getDispersion()
                };
            }
        });
        return this;
    }
};
KHRMaterialsDispersion.EXTENSION_NAME = NAME$e;
var EmissiveStrength = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
        this.propertyType = "EmissiveStrength";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            emissiveStrength: 1
        });
    }
    getEmissiveStrength() {
        return this.get("emissiveStrength");
    }
    setEmissiveStrength(strength) {
        return this.set("emissiveStrength", strength);
    }
};
EmissiveStrength.EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;
var NAME$d = KHR_MATERIALS_EMISSIVE_STRENGTH;
var KHRMaterialsEmissiveStrength = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$d;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createEmissiveStrength() {
        return new EmissiveStrength(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$d]) {
                const emissiveStrength = this.createEmissiveStrength();
                context.materials[materialIndex].setExtension(NAME$d, emissiveStrength);
                const emissiveStrengthDef = materialDef.extensions[NAME$d];
                if (emissiveStrengthDef.emissiveStrength !== void 0) {
                    emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const emissiveStrength = material.getExtension(NAME$d);
            if (emissiveStrength) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME$d] = {
                    emissiveStrength: emissiveStrength.getEmissiveStrength()
                };
            }
        });
        return this;
    }
};
KHRMaterialsEmissiveStrength.EXTENSION_NAME = NAME$d;
var IOR = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_IOR;
        this.propertyType = "IOR";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            ior: 1.5
        });
    }
    getIOR() {
        return this.get("ior");
    }
    setIOR(ior) {
        return this.set("ior", ior);
    }
};
IOR.EXTENSION_NAME = KHR_MATERIALS_IOR;
var NAME$c = KHR_MATERIALS_IOR;
var KHRMaterialsIOR = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$c;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createIOR() {
        return new IOR(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$c]) {
                const ior = this.createIOR();
                context.materials[materialIndex].setExtension(NAME$c, ior);
                const iorDef = materialDef.extensions[NAME$c];
                if (iorDef.ior !== void 0) {
                    ior.setIOR(iorDef.ior);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const ior = material.getExtension(NAME$c);
            if (ior) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME$c] = {
                    ior: ior.getIOR()
                };
            }
        });
        return this;
    }
};
KHRMaterialsIOR.EXTENSION_NAME = NAME$c;
var { R: R$4, G: G$4 } = TextureChannel;
var Iridescence = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_IRIDESCENCE;
        this.propertyType = "Iridescence";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            iridescenceFactor: 0,
            iridescenceTexture: null,
            iridescenceTextureInfo: new TextureInfo(this.graph, "iridescenceTextureInfo"),
            iridescenceIOR: 1.3,
            iridescenceThicknessMinimum: 100,
            iridescenceThicknessMaximum: 400,
            iridescenceThicknessTexture: null,
            iridescenceThicknessTextureInfo: new TextureInfo(this.graph, "iridescenceThicknessTextureInfo")
        });
    }
    getIridescenceFactor() {
        return this.get("iridescenceFactor");
    }
    setIridescenceFactor(factor) {
        return this.set("iridescenceFactor", factor);
    }
    getIridescenceTexture() {
        return this.getRef("iridescenceTexture");
    }
    getIridescenceTextureInfo() {
        return this.getRef("iridescenceTexture") ? this.getRef("iridescenceTextureInfo") : null;
    }
    setIridescenceTexture(texture) {
        return this.setRef("iridescenceTexture", texture, {
            channels: R$4
        });
    }
    getIridescenceIOR() {
        return this.get("iridescenceIOR");
    }
    setIridescenceIOR(ior) {
        return this.set("iridescenceIOR", ior);
    }
    getIridescenceThicknessMinimum() {
        return this.get("iridescenceThicknessMinimum");
    }
    setIridescenceThicknessMinimum(thickness) {
        return this.set("iridescenceThicknessMinimum", thickness);
    }
    getIridescenceThicknessMaximum() {
        return this.get("iridescenceThicknessMaximum");
    }
    setIridescenceThicknessMaximum(thickness) {
        return this.set("iridescenceThicknessMaximum", thickness);
    }
    getIridescenceThicknessTexture() {
        return this.getRef("iridescenceThicknessTexture");
    }
    getIridescenceThicknessTextureInfo() {
        return this.getRef("iridescenceThicknessTexture") ? this.getRef("iridescenceThicknessTextureInfo") : null;
    }
    setIridescenceThicknessTexture(texture) {
        return this.setRef("iridescenceThicknessTexture", texture, {
            channels: G$4
        });
    }
};
Iridescence.EXTENSION_NAME = KHR_MATERIALS_IRIDESCENCE;
var NAME$b = KHR_MATERIALS_IRIDESCENCE;
var KHRMaterialsIridescence = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$b;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createIridescence() {
        return new Iridescence(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$b]) {
                const iridescence = this.createIridescence();
                context.materials[materialIndex].setExtension(NAME$b, iridescence);
                const iridescenceDef = materialDef.extensions[NAME$b];
                if (iridescenceDef.iridescenceFactor !== void 0) {
                    iridescence.setIridescenceFactor(iridescenceDef.iridescenceFactor);
                }
                if (iridescenceDef.iridescenceIor !== void 0) {
                    iridescence.setIridescenceIOR(iridescenceDef.iridescenceIor);
                }
                if (iridescenceDef.iridescenceThicknessMinimum !== void 0) {
                    iridescence.setIridescenceThicknessMinimum(iridescenceDef.iridescenceThicknessMinimum);
                }
                if (iridescenceDef.iridescenceThicknessMaximum !== void 0) {
                    iridescence.setIridescenceThicknessMaximum(iridescenceDef.iridescenceThicknessMaximum);
                }
                if (iridescenceDef.iridescenceTexture !== void 0) {
                    const textureInfoDef = iridescenceDef.iridescenceTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    iridescence.setIridescenceTexture(texture);
                    context.setTextureInfo(iridescence.getIridescenceTextureInfo(), textureInfoDef);
                }
                if (iridescenceDef.iridescenceThicknessTexture !== void 0) {
                    const textureInfoDef = iridescenceDef.iridescenceThicknessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    iridescence.setIridescenceThicknessTexture(texture);
                    context.setTextureInfo(iridescence.getIridescenceThicknessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const iridescence = material.getExtension(NAME$b);
            if (iridescence) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const iridescenceDef = materialDef.extensions[NAME$b] = {};
                if (iridescence.getIridescenceFactor() > 0) {
                    iridescenceDef.iridescenceFactor = iridescence.getIridescenceFactor();
                }
                if (iridescence.getIridescenceIOR() !== 1.3) {
                    iridescenceDef.iridescenceIor = iridescence.getIridescenceIOR();
                }
                if (iridescence.getIridescenceThicknessMinimum() !== 100) {
                    iridescenceDef.iridescenceThicknessMinimum = iridescence.getIridescenceThicknessMinimum();
                }
                if (iridescence.getIridescenceThicknessMaximum() !== 400) {
                    iridescenceDef.iridescenceThicknessMaximum = iridescence.getIridescenceThicknessMaximum();
                }
                if (iridescence.getIridescenceTexture()) {
                    const texture = iridescence.getIridescenceTexture();
                    const textureInfo = iridescence.getIridescenceTextureInfo();
                    iridescenceDef.iridescenceTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (iridescence.getIridescenceThicknessTexture()) {
                    const texture = iridescence.getIridescenceThicknessTexture();
                    const textureInfo = iridescence.getIridescenceThicknessTextureInfo();
                    iridescenceDef.iridescenceThicknessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsIridescence.EXTENSION_NAME = NAME$b;
var { R: R$3, G: G$3, B: B$2, A: A$2 } = TextureChannel;
var PBRSpecularGlossiness = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
        this.propertyType = "PBRSpecularGlossiness";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            diffuseFactor: [1, 1, 1, 1],
            diffuseTexture: null,
            diffuseTextureInfo: new TextureInfo(this.graph, "diffuseTextureInfo"),
            specularFactor: [1, 1, 1],
            glossinessFactor: 1,
            specularGlossinessTexture: null,
            specularGlossinessTextureInfo: new TextureInfo(this.graph, "specularGlossinessTextureInfo")
        });
    }
    getDiffuseFactor() {
        return this.get("diffuseFactor");
    }
    setDiffuseFactor(factor) {
        return this.set("diffuseFactor", factor);
    }
    getDiffuseTexture() {
        return this.getRef("diffuseTexture");
    }
    getDiffuseTextureInfo() {
        return this.getRef("diffuseTexture") ? this.getRef("diffuseTextureInfo") : null;
    }
    setDiffuseTexture(texture) {
        return this.setRef("diffuseTexture", texture, {
            channels: R$3 | G$3 | B$2 | A$2,
            isColor: true
        });
    }
    getSpecularFactor() {
        return this.get("specularFactor");
    }
    setSpecularFactor(factor) {
        return this.set("specularFactor", factor);
    }
    getGlossinessFactor() {
        return this.get("glossinessFactor");
    }
    setGlossinessFactor(factor) {
        return this.set("glossinessFactor", factor);
    }
    getSpecularGlossinessTexture() {
        return this.getRef("specularGlossinessTexture");
    }
    getSpecularGlossinessTextureInfo() {
        return this.getRef("specularGlossinessTexture") ? this.getRef("specularGlossinessTextureInfo") : null;
    }
    setSpecularGlossinessTexture(texture) {
        return this.setRef("specularGlossinessTexture", texture, {
            channels: R$3 | G$3 | B$2 | A$2
        });
    }
};
PBRSpecularGlossiness.EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
var NAME$a = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
var KHRMaterialsPBRSpecularGlossiness = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$a;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createPBRSpecularGlossiness() {
        return new PBRSpecularGlossiness(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$a]) {
                const specGloss = this.createPBRSpecularGlossiness();
                context.materials[materialIndex].setExtension(NAME$a, specGloss);
                const specGlossDef = materialDef.extensions[NAME$a];
                if (specGlossDef.diffuseFactor !== void 0) {
                    specGloss.setDiffuseFactor(specGlossDef.diffuseFactor);
                }
                if (specGlossDef.specularFactor !== void 0) {
                    specGloss.setSpecularFactor(specGlossDef.specularFactor);
                }
                if (specGlossDef.glossinessFactor !== void 0) {
                    specGloss.setGlossinessFactor(specGlossDef.glossinessFactor);
                }
                if (specGlossDef.diffuseTexture !== void 0) {
                    const textureInfoDef = specGlossDef.diffuseTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specGloss.setDiffuseTexture(texture);
                    context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
                }
                if (specGlossDef.specularGlossinessTexture !== void 0) {
                    const textureInfoDef = specGlossDef.specularGlossinessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specGloss.setSpecularGlossinessTexture(texture);
                    context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const specGloss = material.getExtension(NAME$a);
            if (specGloss) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const specGlossDef = materialDef.extensions[NAME$a] = {
                    diffuseFactor: specGloss.getDiffuseFactor(),
                    specularFactor: specGloss.getSpecularFactor(),
                    glossinessFactor: specGloss.getGlossinessFactor()
                };
                if (specGloss.getDiffuseTexture()) {
                    const texture = specGloss.getDiffuseTexture();
                    const textureInfo = specGloss.getDiffuseTextureInfo();
                    specGlossDef.diffuseTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (specGloss.getSpecularGlossinessTexture()) {
                    const texture = specGloss.getSpecularGlossinessTexture();
                    const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
                    specGlossDef.specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsPBRSpecularGlossiness.EXTENSION_NAME = NAME$a;
var { R: R$2, G: G$2, B: B$1, A: A$1 } = TextureChannel;
var Sheen = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_SHEEN;
        this.propertyType = "Sheen";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            sheenColorFactor: [0, 0, 0],
            sheenColorTexture: null,
            sheenColorTextureInfo: new TextureInfo(this.graph, "sheenColorTextureInfo"),
            sheenRoughnessFactor: 0,
            sheenRoughnessTexture: null,
            sheenRoughnessTextureInfo: new TextureInfo(this.graph, "sheenRoughnessTextureInfo")
        });
    }
    getSheenColorFactor() {
        return this.get("sheenColorFactor");
    }
    setSheenColorFactor(factor) {
        return this.set("sheenColorFactor", factor);
    }
    getSheenColorTexture() {
        return this.getRef("sheenColorTexture");
    }
    getSheenColorTextureInfo() {
        return this.getRef("sheenColorTexture") ? this.getRef("sheenColorTextureInfo") : null;
    }
    setSheenColorTexture(texture) {
        return this.setRef("sheenColorTexture", texture, {
            channels: R$2 | G$2 | B$1,
            isColor: true
        });
    }
    getSheenRoughnessFactor() {
        return this.get("sheenRoughnessFactor");
    }
    setSheenRoughnessFactor(factor) {
        return this.set("sheenRoughnessFactor", factor);
    }
    getSheenRoughnessTexture() {
        return this.getRef("sheenRoughnessTexture");
    }
    getSheenRoughnessTextureInfo() {
        return this.getRef("sheenRoughnessTexture") ? this.getRef("sheenRoughnessTextureInfo") : null;
    }
    setSheenRoughnessTexture(texture) {
        return this.setRef("sheenRoughnessTexture", texture, {
            channels: A$1
        });
    }
};
Sheen.EXTENSION_NAME = KHR_MATERIALS_SHEEN;
var NAME$9 = KHR_MATERIALS_SHEEN;
var KHRMaterialsSheen = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$9;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createSheen() {
        return new Sheen(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$9]) {
                const sheen = this.createSheen();
                context.materials[materialIndex].setExtension(NAME$9, sheen);
                const sheenDef = materialDef.extensions[NAME$9];
                if (sheenDef.sheenColorFactor !== void 0) {
                    sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
                }
                if (sheenDef.sheenRoughnessFactor !== void 0) {
                    sheen.setSheenRoughnessFactor(sheenDef.sheenRoughnessFactor);
                }
                if (sheenDef.sheenColorTexture !== void 0) {
                    const textureInfoDef = sheenDef.sheenColorTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    sheen.setSheenColorTexture(texture);
                    context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
                }
                if (sheenDef.sheenRoughnessTexture !== void 0) {
                    const textureInfoDef = sheenDef.sheenRoughnessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    sheen.setSheenRoughnessTexture(texture);
                    context.setTextureInfo(sheen.getSheenRoughnessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const sheen = material.getExtension(NAME$9);
            if (sheen) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const sheenDef = materialDef.extensions[NAME$9] = {
                    sheenColorFactor: sheen.getSheenColorFactor(),
                    sheenRoughnessFactor: sheen.getSheenRoughnessFactor()
                };
                if (sheen.getSheenColorTexture()) {
                    const texture = sheen.getSheenColorTexture();
                    const textureInfo = sheen.getSheenColorTextureInfo();
                    sheenDef.sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (sheen.getSheenRoughnessTexture()) {
                    const texture = sheen.getSheenRoughnessTexture();
                    const textureInfo = sheen.getSheenRoughnessTextureInfo();
                    sheenDef.sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsSheen.EXTENSION_NAME = NAME$9;
var { R: R$1, G: G$1, B: B2, A: A2 } = TextureChannel;
var Specular = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_SPECULAR;
        this.propertyType = "Specular";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            specularFactor: 1,
            specularTexture: null,
            specularTextureInfo: new TextureInfo(this.graph, "specularTextureInfo"),
            specularColorFactor: [1, 1, 1],
            specularColorTexture: null,
            specularColorTextureInfo: new TextureInfo(this.graph, "specularColorTextureInfo")
        });
    }
    getSpecularFactor() {
        return this.get("specularFactor");
    }
    setSpecularFactor(factor) {
        return this.set("specularFactor", factor);
    }
    getSpecularColorFactor() {
        return this.get("specularColorFactor");
    }
    setSpecularColorFactor(factor) {
        return this.set("specularColorFactor", factor);
    }
    getSpecularTexture() {
        return this.getRef("specularTexture");
    }
    getSpecularTextureInfo() {
        return this.getRef("specularTexture") ? this.getRef("specularTextureInfo") : null;
    }
    setSpecularTexture(texture) {
        return this.setRef("specularTexture", texture, {
            channels: A2
        });
    }
    getSpecularColorTexture() {
        return this.getRef("specularColorTexture");
    }
    getSpecularColorTextureInfo() {
        return this.getRef("specularColorTexture") ? this.getRef("specularColorTextureInfo") : null;
    }
    setSpecularColorTexture(texture) {
        return this.setRef("specularColorTexture", texture, {
            channels: R$1 | G$1 | B2,
            isColor: true
        });
    }
};
Specular.EXTENSION_NAME = KHR_MATERIALS_SPECULAR;
var NAME$8 = KHR_MATERIALS_SPECULAR;
var KHRMaterialsSpecular = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$8;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createSpecular() {
        return new Specular(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$8]) {
                const specular = this.createSpecular();
                context.materials[materialIndex].setExtension(NAME$8, specular);
                const specularDef = materialDef.extensions[NAME$8];
                if (specularDef.specularFactor !== void 0) {
                    specular.setSpecularFactor(specularDef.specularFactor);
                }
                if (specularDef.specularColorFactor !== void 0) {
                    specular.setSpecularColorFactor(specularDef.specularColorFactor);
                }
                if (specularDef.specularTexture !== void 0) {
                    const textureInfoDef = specularDef.specularTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specular.setSpecularTexture(texture);
                    context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
                }
                if (specularDef.specularColorTexture !== void 0) {
                    const textureInfoDef = specularDef.specularColorTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specular.setSpecularColorTexture(texture);
                    context.setTextureInfo(specular.getSpecularColorTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const specular = material.getExtension(NAME$8);
            if (specular) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const specularDef = materialDef.extensions[NAME$8] = {};
                if (specular.getSpecularFactor() !== 1) {
                    specularDef.specularFactor = specular.getSpecularFactor();
                }
                if (!MathUtils.eq(specular.getSpecularColorFactor(), [1, 1, 1])) {
                    specularDef.specularColorFactor = specular.getSpecularColorFactor();
                }
                if (specular.getSpecularTexture()) {
                    const texture = specular.getSpecularTexture();
                    const textureInfo = specular.getSpecularTextureInfo();
                    specularDef.specularTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (specular.getSpecularColorTexture()) {
                    const texture = specular.getSpecularColorTexture();
                    const textureInfo = specular.getSpecularColorTextureInfo();
                    specularDef.specularColorTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsSpecular.EXTENSION_NAME = NAME$8;
var { R: R2 } = TextureChannel;
var Transmission = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_TRANSMISSION;
        this.propertyType = "Transmission";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            transmissionFactor: 0,
            transmissionTexture: null,
            transmissionTextureInfo: new TextureInfo(this.graph, "transmissionTextureInfo")
        });
    }
    getTransmissionFactor() {
        return this.get("transmissionFactor");
    }
    setTransmissionFactor(factor) {
        return this.set("transmissionFactor", factor);
    }
    getTransmissionTexture() {
        return this.getRef("transmissionTexture");
    }
    getTransmissionTextureInfo() {
        return this.getRef("transmissionTexture") ? this.getRef("transmissionTextureInfo") : null;
    }
    setTransmissionTexture(texture) {
        return this.setRef("transmissionTexture", texture, {
            channels: R2
        });
    }
};
Transmission.EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;
var NAME$7 = KHR_MATERIALS_TRANSMISSION;
var KHRMaterialsTransmission = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$7;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createTransmission() {
        return new Transmission(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$7]) {
                const transmission = this.createTransmission();
                context.materials[materialIndex].setExtension(NAME$7, transmission);
                const transmissionDef = materialDef.extensions[NAME$7];
                if (transmissionDef.transmissionFactor !== void 0) {
                    transmission.setTransmissionFactor(transmissionDef.transmissionFactor);
                }
                if (transmissionDef.transmissionTexture !== void 0) {
                    const textureInfoDef = transmissionDef.transmissionTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    transmission.setTransmissionTexture(texture);
                    context.setTextureInfo(transmission.getTransmissionTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const transmission = material.getExtension(NAME$7);
            if (transmission) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const transmissionDef = materialDef.extensions[NAME$7] = {
                    transmissionFactor: transmission.getTransmissionFactor()
                };
                if (transmission.getTransmissionTexture()) {
                    const texture = transmission.getTransmissionTexture();
                    const textureInfo = transmission.getTransmissionTextureInfo();
                    transmissionDef.transmissionTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsTransmission.EXTENSION_NAME = NAME$7;
var Unlit = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_UNLIT;
        this.propertyType = "Unlit";
        this.parentTypes = [PropertyType.MATERIAL];
    }
};
Unlit.EXTENSION_NAME = KHR_MATERIALS_UNLIT;
var NAME$6 = KHR_MATERIALS_UNLIT;
var KHRMaterialsUnlit = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$6;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createUnlit() {
        return new Unlit(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const materialDefs = context.jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$6]) {
                context.materials[materialIndex].setExtension(NAME$6, this.createUnlit());
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            if (material.getExtension(NAME$6)) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME$6] = {};
            }
        });
        return this;
    }
};
KHRMaterialsUnlit.EXTENSION_NAME = NAME$6;
var Mapping = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = "Mapping";
        this.parentTypes = ["MappingList"];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            material: null,
            variants: new RefSet()
        });
    }
    getMaterial() {
        return this.getRef("material");
    }
    setMaterial(material) {
        return this.setRef("material", material);
    }
    addVariant(variant) {
        return this.addRef("variants", variant);
    }
    removeVariant(variant) {
        return this.removeRef("variants", variant);
    }
    listVariants() {
        return this.listRefs("variants");
    }
};
Mapping.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
var MappingList = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = "MappingList";
        this.parentTypes = [PropertyType.PRIMITIVE];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            mappings: new RefSet()
        });
    }
    addMapping(mapping) {
        return this.addRef("mappings", mapping);
    }
    removeMapping(mapping) {
        return this.removeRef("mappings", mapping);
    }
    listMappings() {
        return this.listRefs("mappings");
    }
};
MappingList.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
var Variant = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = "Variant";
        this.parentTypes = ["MappingList"];
    }
};
Variant.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
var NAME$5 = KHR_MATERIALS_VARIANTS;
var KHRMaterialsVariants = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$5;
    }
    createMappingList() {
        return new MappingList(this.document.getGraph());
    }
    createVariant(name = "") {
        return new Variant(this.document.getGraph(), name);
    }
    createMapping() {
        return new Mapping(this.document.getGraph());
    }
    listVariants() {
        return Array.from(this.properties).filter((prop) => prop instanceof Variant);
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$5])
            return this;
        const variantsRootDef = jsonDoc.json.extensions[NAME$5];
        const variantDefs = variantsRootDef.variants || [];
        const variants = variantDefs.map((variantDef) => this.createVariant().setName(variantDef.name || ""));
        const meshDefs = jsonDoc.json.meshes || [];
        meshDefs.forEach((meshDef, meshIndex) => {
            const mesh = context.meshes[meshIndex];
            const primDefs = meshDef.primitives || [];
            primDefs.forEach((primDef, primIndex) => {
                if (!primDef.extensions || !primDef.extensions[NAME$5]) {
                    return;
                }
                const mappingList = this.createMappingList();
                const variantPrimDef = primDef.extensions[NAME$5];
                for (const mappingDef of variantPrimDef.mappings) {
                    const mapping = this.createMapping();
                    if (mappingDef.material !== void 0) {
                        mapping.setMaterial(context.materials[mappingDef.material]);
                    }
                    for (const variantIndex of mappingDef.variants || []) {
                        mapping.addVariant(variants[variantIndex]);
                    }
                    mappingList.addMapping(mapping);
                }
                mesh.listPrimitives()[primIndex].setExtension(NAME$5, mappingList);
            });
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        const variants = this.listVariants();
        if (!variants.length)
            return this;
        const variantDefs = [];
        const variantIndexMap = new Map();
        for (const variant of variants) {
            variantIndexMap.set(variant, variantDefs.length);
            variantDefs.push(context.createPropertyDef(variant));
        }
        for (const mesh of this.document.getRoot().listMeshes()) {
            const meshIndex = context.meshIndexMap.get(mesh);
            mesh.listPrimitives().forEach((prim, primIndex) => {
                const mappingList = prim.getExtension(NAME$5);
                if (!mappingList)
                    return;
                const primDef = context.jsonDoc.json.meshes[meshIndex].primitives[primIndex];
                const mappingDefs = mappingList.listMappings().map((mapping) => {
                    const mappingDef = context.createPropertyDef(mapping);
                    const material = mapping.getMaterial();
                    if (material) {
                        mappingDef.material = context.materialIndexMap.get(material);
                    }
                    mappingDef.variants = mapping.listVariants().map((variant) => variantIndexMap.get(variant));
                    return mappingDef;
                });
                primDef.extensions = primDef.extensions || {};
                primDef.extensions[NAME$5] = {
                    mappings: mappingDefs
                };
            });
        }
        jsonDoc.json.extensions = jsonDoc.json.extensions || {};
        jsonDoc.json.extensions[NAME$5] = {
            variants: variantDefs
        };
        return this;
    }
};
KHRMaterialsVariants.EXTENSION_NAME = NAME$5;
var { G: G2 } = TextureChannel;
var Volume = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_MATERIALS_VOLUME;
        this.propertyType = "Volume";
        this.parentTypes = [PropertyType.MATERIAL];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            thicknessFactor: 0,
            thicknessTexture: null,
            thicknessTextureInfo: new TextureInfo(this.graph, "thicknessTexture"),
            attenuationDistance: Infinity,
            attenuationColor: [1, 1, 1]
        });
    }
    getThicknessFactor() {
        return this.get("thicknessFactor");
    }
    setThicknessFactor(factor) {
        return this.set("thicknessFactor", factor);
    }
    getThicknessTexture() {
        return this.getRef("thicknessTexture");
    }
    getThicknessTextureInfo() {
        return this.getRef("thicknessTexture") ? this.getRef("thicknessTextureInfo") : null;
    }
    setThicknessTexture(texture) {
        return this.setRef("thicknessTexture", texture, {
            channels: G2
        });
    }
    getAttenuationDistance() {
        return this.get("attenuationDistance");
    }
    setAttenuationDistance(distance) {
        return this.set("attenuationDistance", distance);
    }
    getAttenuationColor() {
        return this.get("attenuationColor");
    }
    setAttenuationColor(color) {
        return this.set("attenuationColor", color);
    }
};
Volume.EXTENSION_NAME = KHR_MATERIALS_VOLUME;
var NAME$4 = KHR_MATERIALS_VOLUME;
var KHRMaterialsVolume = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$4;
        this.prereadTypes = [PropertyType.MESH];
        this.prewriteTypes = [PropertyType.MESH];
    }
    createVolume() {
        return new Volume(this.document.getGraph());
    }
    read(_context) {
        return this;
    }
    write(_context) {
        return this;
    }
    preread(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex) => {
            if (materialDef.extensions && materialDef.extensions[NAME$4]) {
                const volume = this.createVolume();
                context.materials[materialIndex].setExtension(NAME$4, volume);
                const volumeDef = materialDef.extensions[NAME$4];
                if (volumeDef.thicknessFactor !== void 0) {
                    volume.setThicknessFactor(volumeDef.thicknessFactor);
                }
                if (volumeDef.attenuationDistance !== void 0) {
                    volume.setAttenuationDistance(volumeDef.attenuationDistance);
                }
                if (volumeDef.attenuationColor !== void 0) {
                    volume.setAttenuationColor(volumeDef.attenuationColor);
                }
                if (volumeDef.thicknessTexture !== void 0) {
                    const textureInfoDef = volumeDef.thicknessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    volume.setThicknessTexture(texture);
                    context.setTextureInfo(volume.getThicknessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    prewrite(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material) => {
            const volume = material.getExtension(NAME$4);
            if (volume) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const volumeDef = materialDef.extensions[NAME$4] = {};
                if (volume.getThicknessFactor() > 0) {
                    volumeDef.thicknessFactor = volume.getThicknessFactor();
                }
                if (Number.isFinite(volume.getAttenuationDistance())) {
                    volumeDef.attenuationDistance = volume.getAttenuationDistance();
                }
                if (!MathUtils.eq(volume.getAttenuationColor(), [1, 1, 1])) {
                    volumeDef.attenuationColor = volume.getAttenuationColor();
                }
                if (volume.getThicknessTexture()) {
                    const texture = volume.getThicknessTexture();
                    const textureInfo = volume.getThicknessTextureInfo();
                    volumeDef.thicknessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
};
KHRMaterialsVolume.EXTENSION_NAME = NAME$4;
var NAME$3 = KHR_MESH_QUANTIZATION;
var KHRMeshQuantization = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$3;
    }
    read(_) {
        return this;
    }
    write(_) {
        return this;
    }
};
KHRMeshQuantization.EXTENSION_NAME = NAME$3;
var NAME$2 = KHR_TEXTURE_BASISU;
var KTX2ImageUtils = class {
    match(array) {
        return array[0] === 171 && array[1] === 75 && array[2] === 84 && array[3] === 88 && array[4] === 32 && array[5] === 50 && array[6] === 48 && array[7] === 187 && array[8] === 13 && array[9] === 10 && array[10] === 26 && array[11] === 10;
    }
    getSize(array) {
        const container = read(array);
        return [container.pixelWidth, container.pixelHeight];
    }
    getChannels(array) {
        const container = read(array);
        const dfd = container.dataFormatDescriptor[0];
        if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
            return dfd.samples.length === 2 && (dfd.samples[1].channelType & 15) === 15 ? 4 : 3;
        }
        else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
            return (dfd.samples[0].channelType & 15) === 3 ? 4 : 3;
        }
        throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
    }
    getVRAMByteLength(array) {
        const container = read(array);
        const hasAlpha = this.getChannels(array) > 3;
        let uncompressedBytes = 0;
        for (let i = 0; i < container.levels.length; i++) {
            const level = container.levels[i];
            if (level.uncompressedByteLength) {
                uncompressedBytes += level.uncompressedByteLength;
            }
            else {
                const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
                const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
                const blockSize = hasAlpha ? 16 : 8;
                uncompressedBytes += levelWidth / 4 * (levelHeight / 4) * blockSize;
            }
        }
        return uncompressedBytes;
    }
};
var KHRTextureBasisu = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$2;
        this.prereadTypes = [PropertyType.TEXTURE];
    }
    static register() {
        ImageUtils.registerFormat("image/ktx2", new KTX2ImageUtils());
    }
    preread(context) {
        context.jsonDoc.json.textures.forEach((textureDef) => {
            if (textureDef.extensions && textureDef.extensions[NAME$2]) {
                const basisuDef = textureDef.extensions[NAME$2];
                textureDef.source = basisuDef.source;
            }
        });
        return this;
    }
    read(context) {
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listTextures().forEach((texture) => {
            if (texture.getMimeType() === "image/ktx2") {
                const imageIndex = context.imageIndexMap.get(texture);
                jsonDoc.json.textures.forEach((textureDef) => {
                    if (textureDef.source === imageIndex) {
                        textureDef.extensions = textureDef.extensions || {};
                        textureDef.extensions[NAME$2] = {
                            source: textureDef.source
                        };
                        delete textureDef.source;
                    }
                });
            }
        });
        return this;
    }
};
KHRTextureBasisu.EXTENSION_NAME = NAME$2;
var Transform = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_TEXTURE_TRANSFORM;
        this.propertyType = "Transform";
        this.parentTypes = [PropertyType.TEXTURE_INFO];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            offset: [0, 0],
            rotation: 0,
            scale: [1, 1],
            texCoord: null
        });
    }
    getOffset() {
        return this.get("offset");
    }
    setOffset(offset) {
        return this.set("offset", offset);
    }
    getRotation() {
        return this.get("rotation");
    }
    setRotation(rotation) {
        return this.set("rotation", rotation);
    }
    getScale() {
        return this.get("scale");
    }
    setScale(scale2) {
        return this.set("scale", scale2);
    }
    getTexCoord() {
        return this.get("texCoord");
    }
    setTexCoord(texCoord) {
        return this.set("texCoord", texCoord);
    }
};
Transform.EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;
var NAME$1 = KHR_TEXTURE_TRANSFORM;
var KHRTextureTransform = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME$1;
    }
    createTransform() {
        return new Transform(this.document.getGraph());
    }
    read(context) {
        for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())) {
            if (!textureInfoDef.extensions || !textureInfoDef.extensions[NAME$1])
                continue;
            const transform = this.createTransform();
            const transformDef = textureInfoDef.extensions[NAME$1];
            if (transformDef.offset !== void 0)
                transform.setOffset(transformDef.offset);
            if (transformDef.rotation !== void 0)
                transform.setRotation(transformDef.rotation);
            if (transformDef.scale !== void 0)
                transform.setScale(transformDef.scale);
            if (transformDef.texCoord !== void 0)
                transform.setTexCoord(transformDef.texCoord);
            textureInfo.setExtension(NAME$1, transform);
        }
        return this;
    }
    write(context) {
        const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
        for (const [textureInfo, textureInfoDef] of textureInfoEntries) {
            const transform = textureInfo.getExtension(NAME$1);
            if (!transform)
                continue;
            textureInfoDef.extensions = textureInfoDef.extensions || {};
            const transformDef = {};
            const eq2 = MathUtils.eq;
            if (!eq2(transform.getOffset(), [0, 0]))
                transformDef.offset = transform.getOffset();
            if (transform.getRotation() !== 0)
                transformDef.rotation = transform.getRotation();
            if (!eq2(transform.getScale(), [1, 1]))
                transformDef.scale = transform.getScale();
            if (transform.getTexCoord() != null)
                transformDef.texCoord = transform.getTexCoord();
            textureInfoDef.extensions[NAME$1] = transformDef;
        }
        return this;
    }
};
KHRTextureTransform.EXTENSION_NAME = NAME$1;
var PARENT_TYPES = [PropertyType.ROOT, PropertyType.SCENE, PropertyType.NODE, PropertyType.MESH, PropertyType.MATERIAL, PropertyType.TEXTURE, PropertyType.ANIMATION];
var Packet = class extends ExtensionProperty {
    init() {
        this.extensionName = KHR_XMP_JSON_LD;
        this.propertyType = "Packet";
        this.parentTypes = PARENT_TYPES;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            context: {},
            properties: {}
        });
    }
    getContext() {
        return this.get("context");
    }
    setContext(context) {
        return this.set("context", _extends3({}, context));
    }
    listProperties() {
        return Object.keys(this.get("properties"));
    }
    getProperty(name) {
        const properties = this.get("properties");
        return name in properties ? properties[name] : null;
    }
    setProperty(name, value) {
        this._assertContext(name);
        const properties = _extends3({}, this.get("properties"));
        if (value) {
            properties[name] = value;
        }
        else {
            delete properties[name];
        }
        return this.set("properties", properties);
    }
    toJSONLD() {
        const context = copyJSON(this.get("context"));
        const properties = copyJSON(this.get("properties"));
        return _extends3({
            "@context": context
        }, properties);
    }
    fromJSONLD(jsonld) {
        jsonld = copyJSON(jsonld);
        const context = jsonld["@context"];
        if (context)
            this.set("context", context);
        delete jsonld["@context"];
        return this.set("properties", jsonld);
    }
    _assertContext(name) {
        const prefix = name.split(":")[0];
        if (!(prefix in this.get("context"))) {
            throw new Error(`${KHR_XMP_JSON_LD}: Missing context for term, "${name}".`);
        }
    }
};
Packet.EXTENSION_NAME = KHR_XMP_JSON_LD;
function copyJSON(object) {
    return JSON.parse(JSON.stringify(object));
}
var NAME = KHR_XMP_JSON_LD;
var KHRXMP = class extends Extension {
    constructor(...args) {
        super(...args);
        this.extensionName = NAME;
    }
    createPacket() {
        return new Packet(this.document.getGraph());
    }
    listPackets() {
        return Array.from(this.properties);
    }
    read(context) {
        var _context$jsonDoc$json;
        const extensionDef = (_context$jsonDoc$json = context.jsonDoc.json.extensions) == null ? void 0 : _context$jsonDoc$json[NAME];
        if (!extensionDef || !extensionDef.packets)
            return this;
        const json = context.jsonDoc.json;
        const root = this.document.getRoot();
        const packets = extensionDef.packets.map((packetDef) => this.createPacket().fromJSONLD(packetDef));
        const defLists = [[json.asset], json.scenes, json.nodes, json.meshes, json.materials, json.images, json.animations];
        const propertyLists = [[root], root.listScenes(), root.listNodes(), root.listMeshes(), root.listMaterials(), root.listTextures(), root.listAnimations()];
        for (let i = 0; i < defLists.length; i++) {
            const defs = defLists[i] || [];
            for (let j = 0; j < defs.length; j++) {
                const def = defs[j];
                if (def.extensions && def.extensions[NAME]) {
                    const xmpDef = def.extensions[NAME];
                    propertyLists[i][j].setExtension(NAME, packets[xmpDef.packet]);
                }
            }
        }
        return this;
    }
    write(context) {
        const { json } = context.jsonDoc;
        const packetDefs = [];
        for (const packet of this.properties) {
            packetDefs.push(packet.toJSONLD());
            for (const parent of packet.listParents()) {
                let parentDef;
                switch (parent.propertyType) {
                    case PropertyType.ROOT:
                        parentDef = json.asset;
                        break;
                    case PropertyType.SCENE:
                        parentDef = json.scenes[context.sceneIndexMap.get(parent)];
                        break;
                    case PropertyType.NODE:
                        parentDef = json.nodes[context.nodeIndexMap.get(parent)];
                        break;
                    case PropertyType.MESH:
                        parentDef = json.meshes[context.meshIndexMap.get(parent)];
                        break;
                    case PropertyType.MATERIAL:
                        parentDef = json.materials[context.materialIndexMap.get(parent)];
                        break;
                    case PropertyType.TEXTURE:
                        parentDef = json.images[context.imageIndexMap.get(parent)];
                        break;
                    case PropertyType.ANIMATION:
                        parentDef = json.animations[context.animationIndexMap.get(parent)];
                        break;
                    default:
                        parentDef = null;
                        this.document.getLogger().warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
                        break;
                }
                if (!parentDef)
                    continue;
                parentDef.extensions = parentDef.extensions || {};
                parentDef.extensions[NAME] = {
                    packet: packetDefs.length - 1
                };
            }
        }
        if (packetDefs.length > 0) {
            json.extensions = json.extensions || {};
            json.extensions[NAME] = {
                packets: packetDefs
            };
        }
        return this;
    }
};
KHRXMP.EXTENSION_NAME = NAME;
var KHRONOS_EXTENSIONS = [KHRDracoMeshCompression, KHRLightsPunctual, KHRMaterialsAnisotropy, KHRMaterialsClearcoat, KHRMaterialsDiffuseTransmission, KHRMaterialsDispersion, KHRMaterialsEmissiveStrength, KHRMaterialsIOR, KHRMaterialsIridescence, KHRMaterialsPBRSpecularGlossiness, KHRMaterialsSpecular, KHRMaterialsSheen, KHRMaterialsTransmission, KHRMaterialsUnlit, KHRMaterialsVariants, KHRMaterialsVolume, KHRMeshQuantization, KHRTextureBasisu, KHRTextureTransform, KHRXMP];
var ALL_EXTENSIONS = [EXTMeshGPUInstancing, EXTMeshoptCompression, EXTTextureAVIF, EXTTextureWebP, ...KHRONOS_EXTENSIONS];
var import_ndarray3 = __toESM(require_ndarray(), 1);
var import_ndarray2 = __toESM(require_ndarray(), 1);
var e = (t2, e2) => {
    if (t2 <= -e2 || t2 >= e2)
        return 0;
    if (t2 > -11920929e-14 && t2 < 11920929e-14)
        return 1;
    const n2 = t2 * Math.PI;
    return Math.sin(n2) / n2 * Math.sin(n2 / e2) / (n2 / e2);
};
var n = (t2, n2, r2, a2, o2, s2, c2, h) => {
    const l = 2 ** h - 1, i = (t3) => Math.round(t3 * l), p = o2 ? 2 : 3, u = 1 / r2, f = Math.min(1, r2), d = p / f, _ = new c2((Math.floor(2 * (d + 1)) + 2) * n2);
    let y = 0;
    for (let r3 = 0; r3 < n2; r3++) {
        const o3 = (r3 + 0.5) * u + a2, h2 = Math.max(0, Math.floor(o3 - d)), l2 = Math.min(t2 - 1, Math.ceil(o3 + d)), A3 = l2 - h2 + 1, E = new s2(A3), M = new c2(A3);
        let g = 0, L = 0;
        for (let t3 = h2; t3 <= l2; t3++) {
            const n3 = e((t3 + 0.5 - o3) * f, p);
            g += n3, E[L] = n3, L++;
        }
        let N = 0;
        for (let t3 = 0; t3 < E.length; t3++) {
            const e2 = E[t3] / g;
            N += e2, M[t3] = i(e2);
        }
        M[n2 >> 1] += i(1 - N);
        let S = 0;
        for (; S < M.length && 0 === M[S];)
            S++;
        let w = M.length - 1;
        for (; w > 0 && 0 === M[w];)
            w--;
        const m = w - S + 1;
        _[y++] = h2 + S, _[y++] = m, _.set(M.subarray(S, w + 1), y), y += m;
    }
    return _;
};
var r = (t2, e2, n2, r2) => {
    const [a2, o2] = t2.shape, [s2] = e2.shape, c2 = 2 ** (8 * e2.data.BYTES_PER_ELEMENT) - 1, h = (t3) => t3 < 0 ? 0 : t3 > c2 ? c2 : t3, l = 2 ** (r2 - 1), i = 2 * l;
    for (let r3 = 0; r3 < o2; r3++) {
        const a3 = r3;
        let o3 = 0;
        for (let c3 = 0; c3 < s2; c3++) {
            let s3 = n2[o3++], p = 0, u = 0, f = 0, d = 0;
            for (let e3 = n2[o3++]; e3 > 0; e3--) {
                const e4 = n2[o3++];
                p += e4 * t2.get(s3, r3, 0), u += e4 * t2.get(s3, r3, 1), f += e4 * t2.get(s3, r3, 2), d += e4 * t2.get(s3, r3, 3), s3++;
            }
            e2.set(c3, a3, 0, h((p + l) / i)), e2.set(c3, a3, 1, h((u + l) / i)), e2.set(c3, a3, 2, h((f + l) / i)), e2.set(c3, a3, 3, h((d + l) / i));
        }
    }
};
var a;
function o(e2, o2, s2) {
    if (3 !== e2.shape.length || 3 !== o2.shape.length)
        throw new TypeError("Input and output must have exactly 3 dimensions (width, height and colorspace)");
    const [c2, h] = e2.shape, [l, i] = o2.shape, p = l / c2, u = i / h;
    let f, d;
    switch (o2.dtype) {
        case "uint8_clamped":
        case "uint8":
            f = Float32Array, d = Int16Array;
            break;
        case "uint16":
        case "uint32":
            f = Float64Array, d = Int32Array;
            break;
        default:
            throw TypeError(`Unsupported data type ${o2.dtype}`);
    }
    const _ = 7 * d.BYTES_PER_ELEMENT, y = n(c2, l, p, 0, s2 === a.LANCZOS_2, f, d, _), A3 = n(h, i, u, 0, s2 === a.LANCZOS_2, f, d, _), E = (0, import_ndarray2.default)(new (0, o2.data.constructor)(l * h * 4), [h, l, 4]), M = E.transpose(1, 0), g = o2.transpose(1, 0);
    r(e2, M, y, _), r(E, g, A3, _);
}
function s(t2, e2) {
    o(t2, e2, a.LANCZOS_3);
}
function c(t2, e2) {
    o(t2, e2, a.LANCZOS_2);
}
!function (t2) {
    t2[t2.LANCZOS_3 = 3] = "LANCZOS_3", t2[t2.LANCZOS_2 = 2] = "LANCZOS_2";
}(a || (a = {}));
function _extends4() {
    return _extends4 = Object.assign ? Object.assign.bind() : function (n2) {
        for (var e2 = 1; e2 < arguments.length; e2++) {
            var t2 = arguments[e2];
            for (var r2 in t2)
                ({}).hasOwnProperty.call(t2, r2) && (n2[r2] = t2[r2]);
        }
        return n2;
    }, _extends4.apply(null, arguments);
}
var { POINTS: POINTS$1, LINES: LINES$2, LINE_STRIP: LINE_STRIP$3, LINE_LOOP: LINE_LOOP$3, TRIANGLES: TRIANGLES$2, TRIANGLE_STRIP: TRIANGLE_STRIP$3, TRIANGLE_FAN: TRIANGLE_FAN$3 } = Primitive.Mode;
function createTransform(name, fn) {
    Object.defineProperty(fn, "name", {
        value: name
    });
    return fn;
}
function isTransformPending(context, initial, pending) {
    if (!context)
        return false;
    const initialIndex = context.stack.lastIndexOf(initial);
    const pendingIndex = context.stack.lastIndexOf(pending);
    return initialIndex < pendingIndex;
}
function assignDefaults(defaults, options) {
    const result = _extends4({}, defaults);
    for (const key in options) {
        if (options[key] !== void 0) {
            result[key] = options[key];
        }
    }
    return result;
}
async function rewriteTexture(source, target, fn) {
    if (!source)
        return null;
    const srcImage = source.getImage();
    if (!srcImage)
        return null;
    const pixels = await getPixels(srcImage, source.getMimeType());
    for (let i = 0; i < pixels.shape[0]; ++i) {
        for (let j = 0; j < pixels.shape[1]; ++j) {
            fn(pixels, i, j);
        }
    }
    const dstImage = await savePixels(pixels, "image/png");
    return target.setImage(dstImage).setMimeType("image/png");
}
function getGLPrimitiveCount(prim) {
    const indices = prim.getIndices();
    const position = prim.getAttribute("POSITION");
    switch (prim.getMode()) {
        case Primitive.Mode.POINTS:
            return indices ? indices.getCount() : position.getCount();
        case Primitive.Mode.LINES:
            return indices ? indices.getCount() / 2 : position.getCount() / 2;
        case Primitive.Mode.LINE_LOOP:
            return indices ? indices.getCount() : position.getCount();
        case Primitive.Mode.LINE_STRIP:
            return indices ? indices.getCount() - 1 : position.getCount() - 1;
        case Primitive.Mode.TRIANGLES:
            return indices ? indices.getCount() / 3 : position.getCount() / 3;
        case Primitive.Mode.TRIANGLE_STRIP:
        case Primitive.Mode.TRIANGLE_FAN:
            return indices ? indices.getCount() - 2 : position.getCount() - 2;
        default:
            throw new Error("Unexpected mode: " + prim.getMode());
    }
}
var SetMap = class {
    constructor() {
        this._map = new Map();
    }
    get size() {
        return this._map.size;
    }
    has(k) {
        return this._map.has(k);
    }
    add(k, v) {
        let entry = this._map.get(k);
        if (!entry) {
            entry = new Set();
            this._map.set(k, entry);
        }
        entry.add(v);
        return this;
    }
    get(k) {
        return this._map.get(k) || new Set();
    }
    keys() {
        return this._map.keys();
    }
};
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1e3;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
var _longFormatter = new Intl.NumberFormat(void 0, {
    maximumFractionDigits: 0
});
function formatLong(x) {
    return _longFormatter.format(x);
}
function formatDelta(a2, b, decimals = 2) {
    const prefix = a2 > b ? "\u2013" : "+";
    const suffix = "%";
    return prefix + (Math.abs(a2 - b) / a2 * 100).toFixed(decimals) + suffix;
}
function formatDeltaOp(a2, b) {
    return `${formatLong(a2)} \u2192 ${formatLong(b)} (${formatDelta(a2, b)})`;
}
function deepListAttributes(prim) {
    const accessors = [];
    for (const attribute of prim.listAttributes()) {
        accessors.push(attribute);
    }
    for (const target of prim.listTargets()) {
        for (const attribute of target.listAttributes()) {
            accessors.push(attribute);
        }
    }
    return Array.from(new Set(accessors));
}
function deepSwapAttribute(prim, src, dst) {
    prim.swap(src, dst);
    for (const target of prim.listTargets()) {
        target.swap(src, dst);
    }
}
function shallowEqualsArray(a2, b) {
    if (a2 == null && b == null)
        return true;
    if (a2 == null || b == null)
        return false;
    if (a2.length !== b.length)
        return false;
    for (let i = 0; i < a2.length; i++) {
        if (a2[i] !== b[i])
            return false;
    }
    return true;
}
function shallowCloneAccessor(document, accessor) {
    return document.createAccessor(accessor.getName()).setArray(accessor.getArray()).setType(accessor.getType()).setBuffer(accessor.getBuffer()).setNormalized(accessor.getNormalized()).setSparse(accessor.getSparse());
}
function createIndices(count, maxIndex = count) {
    const array = createIndicesEmpty(count, maxIndex);
    for (let i = 0; i < array.length; i++)
        array[i] = i;
    return array;
}
function createIndicesEmpty(count, maxIndex = count) {
    return maxIndex <= 65534 ? new Uint16Array(count) : new Uint32Array(count);
}
function isUsed(prop) {
    return prop.listParents().some((parent) => parent.propertyType !== PropertyType.ROOT);
}
function isEmptyObject(object) {
    for (const key in object)
        return false;
    return true;
}
function createPrimGroupKey(prim) {
    const document = Document.fromGraph(prim.getGraph());
    const material = prim.getMaterial();
    const materialIndex = document.getRoot().listMaterials().indexOf(material);
    const mode = BASIC_MODE_MAPPING[prim.getMode()];
    const indices = !!prim.getIndices();
    const attributes = prim.listSemantics().sort().map((semantic) => {
        const attribute = prim.getAttribute(semantic);
        const elementSize = attribute.getElementSize();
        const componentType = attribute.getComponentType();
        return `${semantic}:${elementSize}:${componentType}`;
    }).join("+");
    const targets = prim.listTargets().map((target) => {
        return target.listSemantics().sort().map((semantic) => {
            const attribute = prim.getAttribute(semantic);
            const elementSize = attribute.getElementSize();
            const componentType = attribute.getComponentType();
            return `${semantic}:${elementSize}:${componentType}`;
        }).join("+");
    }).join("~");
    return `${materialIndex}|${mode}|${indices}|${attributes}|${targets}`;
}
function fitWithin(size, limit) {
    const [maxWidth, maxHeight] = limit;
    const [srcWidth, srcHeight] = size;
    if (srcWidth <= maxWidth && srcHeight <= maxHeight)
        return size;
    let dstWidth = srcWidth;
    let dstHeight = srcHeight;
    if (dstWidth > maxWidth) {
        dstHeight = Math.floor(dstHeight * (maxWidth / dstWidth));
        dstWidth = maxWidth;
    }
    if (dstHeight > maxHeight) {
        dstWidth = Math.floor(dstWidth * (maxHeight / dstHeight));
        dstHeight = maxHeight;
    }
    return [dstWidth, dstHeight];
}
function fitPowerOfTwo(size, method) {
    if (isPowerOfTwo(size[0]) && isPowerOfTwo(size[1])) {
        return size;
    }
    switch (method) {
        case "nearest-pot":
            return size.map(nearestPowerOfTwo);
        case "ceil-pot":
            return size.map(ceilPowerOfTwo$1);
        case "floor-pot":
            return size.map(floorPowerOfTwo);
    }
}
function isPowerOfTwo(value) {
    if (value <= 2)
        return true;
    return (value & value - 1) === 0 && value !== 0;
}
function nearestPowerOfTwo(value) {
    if (value <= 4)
        return 4;
    const lo = floorPowerOfTwo(value);
    const hi = ceilPowerOfTwo$1(value);
    if (hi - value > value - lo)
        return lo;
    return hi;
}
function floorPowerOfTwo(value) {
    return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}
function ceilPowerOfTwo$1(value) {
    return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
var BASIC_MODE_MAPPING = {
    [POINTS$1]: POINTS$1,
    [LINES$2]: LINES$2,
    [LINE_STRIP$3]: LINES$2,
    [LINE_LOOP$3]: LINES$2,
    [TRIANGLES$2]: TRIANGLES$2,
    [TRIANGLE_STRIP$3]: TRIANGLES$2,
    [TRIANGLE_FAN$3]: TRIANGLES$2
};
var NAME$p = "center";
var CENTER_DEFAULTS = {
    pivot: "center"
};
function center(_options = CENTER_DEFAULTS) {
    const options = assignDefaults(CENTER_DEFAULTS, _options);
    return createTransform(NAME$p, (doc) => {
        const logger = doc.getLogger();
        const root = doc.getRoot();
        const isAnimated = root.listAnimations().length > 0 || root.listSkins().length > 0;
        doc.getRoot().listScenes().forEach((scene, index) => {
            logger.debug(`${NAME$p}: Scene ${index + 1} / ${root.listScenes().length}.`);
            let pivot;
            if (typeof options.pivot === "string") {
                const bbox = getBounds(scene);
                pivot = [(bbox.max[0] - bbox.min[0]) / 2 + bbox.min[0], (bbox.max[1] - bbox.min[1]) / 2 + bbox.min[1], (bbox.max[2] - bbox.min[2]) / 2 + bbox.min[2]];
                if (options.pivot === "above")
                    pivot[1] = bbox.max[1];
                if (options.pivot === "below")
                    pivot[1] = bbox.min[1];
            }
            else {
                pivot = options.pivot;
            }
            logger.debug(`${NAME$p}: Pivot "${pivot.join(", ")}".`);
            const offset = [-1 * pivot[0], -1 * pivot[1], -1 * pivot[2]];
            if (isAnimated) {
                logger.debug(`${NAME$p}: Model contains animation or skin. Adding a wrapper node.`);
                const offsetNode = doc.createNode("Pivot").setTranslation(offset);
                scene.listChildren().forEach((child) => offsetNode.addChild(child));
                scene.addChild(offsetNode);
            }
            else {
                logger.debug(`${NAME$p}: Skipping wrapper, offsetting all root nodes.`);
                scene.listChildren().forEach((child) => {
                    const t2 = child.getTranslation();
                    child.setTranslation([t2[0] + offset[0], t2[1] + offset[1], t2[2] + offset[2]]);
                });
            }
        });
        logger.debug(`${NAME$p}: Complete.`);
    });
}
function listNodeScenes(node) {
    const visited = new Set();
    let child = node;
    let parent;
    while (parent = child.getParentNode()) {
        if (visited.has(parent)) {
            throw new Error("Circular dependency in scene graph.");
        }
        visited.add(parent);
        child = parent;
    }
    return child.listParents().filter((parent2) => parent2 instanceof Scene);
}
function clearNodeParent(node) {
    const scenes = listNodeScenes(node);
    const parent = node.getParentNode();
    if (!parent)
        return node;
    node.setMatrix(node.getWorldMatrix());
    parent.removeChild(node);
    for (const scene of scenes)
        scene.addChild(node);
    return node;
}
var ARRAY_TYPE2 = typeof Float32Array !== "undefined" ? Float32Array : Array;
if (!Math.hypot)
    Math.hypot = function () {
        var y = 0, i = arguments.length;
        while (i--) {
            y += arguments[i] * arguments[i];
        }
        return Math.sqrt(y);
    };
function invert$1(out, a2) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    var a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    var a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    var a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
        return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
}
function determinant2(a2) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    var a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    var a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    var a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
function multiply$2(out, a2, b) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2], a03 = a2[3];
    var a10 = a2[4], a11 = a2[5], a12 = a2[6], a13 = a2[7];
    var a20 = a2[8], a21 = a2[9], a22 = a2[10], a23 = a2[11];
    var a30 = a2[12], a31 = a2[13], a32 = a2[14], a33 = a2[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
}
function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}
function fromRotationTranslationScale(out, q, v, s2) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s2[0];
    var sy = s2[1];
    var sz = s2[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
}
function create$2() {
    var out = new ARRAY_TYPE2(9);
    if (ARRAY_TYPE2 != Float32Array) {
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[5] = 0;
        out[6] = 0;
        out[7] = 0;
    }
    out[0] = 1;
    out[4] = 1;
    out[8] = 1;
    return out;
}
function fromMat4(out, a2) {
    out[0] = a2[0];
    out[1] = a2[1];
    out[2] = a2[2];
    out[3] = a2[4];
    out[4] = a2[5];
    out[5] = a2[6];
    out[6] = a2[8];
    out[7] = a2[9];
    out[8] = a2[10];
    return out;
}
function transpose(out, a2) {
    if (out === a2) {
        var a01 = a2[1], a02 = a2[2], a12 = a2[5];
        out[1] = a2[3];
        out[2] = a2[6];
        out[3] = a01;
        out[5] = a2[7];
        out[6] = a02;
        out[7] = a12;
    }
    else {
        out[0] = a2[0];
        out[1] = a2[3];
        out[2] = a2[6];
        out[3] = a2[1];
        out[4] = a2[4];
        out[5] = a2[7];
        out[6] = a2[2];
        out[7] = a2[5];
        out[8] = a2[8];
    }
    return out;
}
function invert(out, a2) {
    var a00 = a2[0], a01 = a2[1], a02 = a2[2];
    var a10 = a2[3], a11 = a2[4], a12 = a2[5];
    var a20 = a2[6], a21 = a2[7], a22 = a2[8];
    var b01 = a22 * a11 - a12 * a21;
    var b11 = -a22 * a10 + a12 * a20;
    var b21 = a21 * a10 - a11 * a20;
    var det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
        return null;
    }
    det = 1 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
}
function create$1() {
    var out = new ARRAY_TYPE2(3);
    if (ARRAY_TYPE2 != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
    }
    return out;
}
function multiply$1(out, a2, b) {
    out[0] = a2[0] * b[0];
    out[1] = a2[1] * b[1];
    out[2] = a2[2] * b[2];
    return out;
}
function min(out, a2, b) {
    out[0] = Math.min(a2[0], b[0]);
    out[1] = Math.min(a2[1], b[1]);
    out[2] = Math.min(a2[2], b[2]);
    return out;
}
function max(out, a2, b) {
    out[0] = Math.max(a2[0], b[0]);
    out[1] = Math.max(a2[1], b[1]);
    out[2] = Math.max(a2[2], b[2]);
    return out;
}
function scale$1(out, a2, b) {
    out[0] = a2[0] * b;
    out[1] = a2[1] * b;
    out[2] = a2[2] * b;
    return out;
}
function normalize(out, a2) {
    var x = a2[0];
    var y = a2[1];
    var z = a2[2];
    var len2 = x * x + y * y + z * z;
    if (len2 > 0) {
        len2 = 1 / Math.sqrt(len2);
    }
    out[0] = a2[0] * len2;
    out[1] = a2[1] * len2;
    out[2] = a2[2] * len2;
    return out;
}
function transformMat42(out, a2, m) {
    var x = a2[0], y = a2[1], z = a2[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
}
function transformMat3(out, a2, m) {
    var x = a2[0], y = a2[1], z = a2[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
}
var mul$1 = multiply$1;
(function () {
    var vec = create$1();
    return function (a2, stride, offset, count, fn, arg) {
        var i, l;
        if (!stride) {
            stride = 3;
        }
        if (!offset) {
            offset = 0;
        }
        if (count) {
            l = Math.min(count * stride + offset, a2.length);
        }
        else {
            l = a2.length;
        }
        for (i = offset; i < l; i += stride) {
            vec[0] = a2[i];
            vec[1] = a2[i + 1];
            vec[2] = a2[i + 2];
            fn(vec, vec, arg);
            a2[i] = vec[0];
            a2[i + 1] = vec[1];
            a2[i + 2] = vec[2];
        }
        return a2;
    };
})();
var NAME$o2 = "dedup";
var DEDUP_DEFAULTS = {
    keepUniqueNames: false,
    propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE, PropertyType.MATERIAL, PropertyType.SKIN]
};
function dedup(_options = DEDUP_DEFAULTS) {
    const options = assignDefaults(DEDUP_DEFAULTS, _options);
    const propertyTypes = new Set(options.propertyTypes);
    for (const propertyType of options.propertyTypes) {
        if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
            throw new Error(`${NAME$o2}: Unsupported deduplication on type "${propertyType}".`);
        }
    }
    return createTransform(NAME$o2, (document) => {
        const logger = document.getLogger();
        if (propertyTypes.has(PropertyType.ACCESSOR))
            dedupAccessors(document);
        if (propertyTypes.has(PropertyType.TEXTURE))
            dedupImages(document, options);
        if (propertyTypes.has(PropertyType.MATERIAL))
            dedupMaterials(document, options);
        if (propertyTypes.has(PropertyType.MESH))
            dedupMeshes(document, options);
        if (propertyTypes.has(PropertyType.SKIN))
            dedupSkins(document, options);
        logger.debug(`${NAME$o2}: Complete.`);
    });
}
function dedupAccessors(document) {
    const logger = document.getLogger();
    const indicesMap = new Map();
    const attributeMap = new Map();
    const inputMap = new Map();
    const outputMap = new Map();
    const meshes = document.getRoot().listMeshes();
    meshes.forEach((mesh) => {
        mesh.listPrimitives().forEach((primitive) => {
            primitive.listAttributes().forEach((accessor) => hashAccessor(accessor, attributeMap));
            hashAccessor(primitive.getIndices(), indicesMap);
        });
    });
    for (const animation of document.getRoot().listAnimations()) {
        for (const sampler of animation.listSamplers()) {
            hashAccessor(sampler.getInput(), inputMap);
            hashAccessor(sampler.getOutput(), outputMap);
        }
    }
    function hashAccessor(accessor, group) {
        if (!accessor)
            return;
        const hash = [accessor.getCount(), accessor.getType(), accessor.getComponentType(), accessor.getNormalized(), accessor.getSparse()].join(":");
        let hashSet = group.get(hash);
        if (!hashSet)
            group.set(hash, hashSet = new Set());
        hashSet.add(accessor);
    }
    function detectDuplicates(accessors, duplicates2) {
        for (let i = 0; i < accessors.length; i++) {
            const a2 = accessors[i];
            const aData = BufferUtils.toView(a2.getArray());
            if (duplicates2.has(a2))
                continue;
            for (let j = i + 1; j < accessors.length; j++) {
                const b = accessors[j];
                if (duplicates2.has(b))
                    continue;
                if (BufferUtils.equals(aData, BufferUtils.toView(b.getArray()))) {
                    duplicates2.set(b, a2);
                }
            }
        }
    }
    let total = 0;
    const duplicates = new Map();
    for (const group of [attributeMap, indicesMap, inputMap, outputMap]) {
        for (const hashGroup of group.values()) {
            total += hashGroup.size;
            detectDuplicates(Array.from(hashGroup), duplicates);
        }
    }
    logger.debug(`${NAME$o2}: Merged ${duplicates.size} of ${total} accessors.`);
    meshes.forEach((mesh) => {
        mesh.listPrimitives().forEach((primitive) => {
            primitive.listAttributes().forEach((accessor) => {
                if (duplicates.has(accessor)) {
                    primitive.swap(accessor, duplicates.get(accessor));
                }
            });
            const indices = primitive.getIndices();
            if (indices && duplicates.has(indices)) {
                primitive.swap(indices, duplicates.get(indices));
            }
        });
    });
    for (const animation of document.getRoot().listAnimations()) {
        for (const sampler of animation.listSamplers()) {
            const input = sampler.getInput();
            const output = sampler.getOutput();
            if (input && duplicates.has(input)) {
                sampler.swap(input, duplicates.get(input));
            }
            if (output && duplicates.has(output)) {
                sampler.swap(output, duplicates.get(output));
            }
        }
    }
    Array.from(duplicates.keys()).forEach((accessor) => accessor.dispose());
}
function dedupMeshes(document, options) {
    const logger = document.getLogger();
    const root = document.getRoot();
    const refs = new Map();
    root.listAccessors().forEach((accessor, index) => refs.set(accessor, index));
    root.listMaterials().forEach((material, index) => refs.set(material, index));
    const numMeshes = root.listMeshes().length;
    const uniqueMeshes = new Map();
    for (const src of root.listMeshes()) {
        const srcKeyItems = [];
        for (const prim of src.listPrimitives()) {
            srcKeyItems.push(createPrimitiveKey(prim, refs));
        }
        let meshKey = "";
        if (options.keepUniqueNames)
            meshKey += src.getName() + ";";
        meshKey += srcKeyItems.join(";");
        if (uniqueMeshes.has(meshKey)) {
            const targetMesh = uniqueMeshes.get(meshKey);
            src.listParents().forEach((parent) => {
                if (parent.propertyType !== PropertyType.ROOT) {
                    parent.swap(src, targetMesh);
                }
            });
            src.dispose();
        }
        else {
            uniqueMeshes.set(meshKey, src);
        }
    }
    logger.debug(`${NAME$o2}: Merged ${numMeshes - uniqueMeshes.size} of ${numMeshes} meshes.`);
}
function dedupImages(document, options) {
    const logger = document.getLogger();
    const root = document.getRoot();
    const textures = root.listTextures();
    const duplicates = new Map();
    for (let i = 0; i < textures.length; i++) {
        const a2 = textures[i];
        const aData = a2.getImage();
        if (duplicates.has(a2))
            continue;
        for (let j = i + 1; j < textures.length; j++) {
            const b = textures[j];
            const bData = b.getImage();
            if (duplicates.has(b))
                continue;
            if (a2.getMimeType() !== b.getMimeType())
                continue;
            if (options.keepUniqueNames && a2.getName() !== b.getName())
                continue;
            const aSize = a2.getSize();
            const bSize = b.getSize();
            if (!aSize || !bSize)
                continue;
            if (aSize[0] !== bSize[0])
                continue;
            if (aSize[1] !== bSize[1])
                continue;
            if (!aData || !bData)
                continue;
            if (BufferUtils.equals(aData, bData)) {
                duplicates.set(b, a2);
            }
        }
    }
    logger.debug(`${NAME$o2}: Merged ${duplicates.size} of ${root.listTextures().length} textures.`);
    Array.from(duplicates.entries()).forEach(([src, dst]) => {
        src.listParents().forEach((property) => {
            if (!(property instanceof Root))
                property.swap(src, dst);
        });
        src.dispose();
    });
}
function dedupMaterials(document, options) {
    const logger = document.getLogger();
    const root = document.getRoot();
    const materials = root.listMaterials();
    const duplicates = new Map();
    const modifierCache = new Map();
    const skip = new Set();
    if (!options.keepUniqueNames) {
        skip.add("name");
    }
    for (let i = 0; i < materials.length; i++) {
        const a2 = materials[i];
        if (duplicates.has(a2))
            continue;
        if (hasModifier(a2, modifierCache))
            continue;
        for (let j = i + 1; j < materials.length; j++) {
            const b = materials[j];
            if (duplicates.has(b))
                continue;
            if (hasModifier(b, modifierCache))
                continue;
            if (a2.equals(b, skip)) {
                duplicates.set(b, a2);
            }
        }
    }
    logger.debug(`${NAME$o2}: Merged ${duplicates.size} of ${materials.length} materials.`);
    Array.from(duplicates.entries()).forEach(([src, dst]) => {
        src.listParents().forEach((property) => {
            if (!(property instanceof Root))
                property.swap(src, dst);
        });
        src.dispose();
    });
}
function dedupSkins(document, options) {
    const logger = document.getLogger();
    const root = document.getRoot();
    const skins = root.listSkins();
    const duplicates = new Map();
    const skip = new Set(["joints"]);
    if (!options.keepUniqueNames) {
        skip.add("name");
    }
    for (let i = 0; i < skins.length; i++) {
        const a2 = skins[i];
        if (duplicates.has(a2))
            continue;
        for (let j = i + 1; j < skins.length; j++) {
            const b = skins[j];
            if (duplicates.has(b))
                continue;
            if (a2.equals(b, skip) && shallowEqualsArray(a2.listJoints(), b.listJoints())) {
                duplicates.set(b, a2);
            }
        }
    }
    logger.debug(`${NAME$o2}: Merged ${duplicates.size} of ${skins.length} skins.`);
    Array.from(duplicates.entries()).forEach(([src, dst]) => {
        src.listParents().forEach((property) => {
            if (!(property instanceof Root))
                property.swap(src, dst);
        });
        src.dispose();
    });
}
function createPrimitiveKey(prim, refs) {
    const primKeyItems = [];
    for (const semantic of prim.listSemantics()) {
        const attribute = prim.getAttribute(semantic);
        primKeyItems.push(semantic + ":" + refs.get(attribute));
    }
    if (prim instanceof Primitive) {
        const indices = prim.getIndices();
        if (indices) {
            primKeyItems.push("indices:" + refs.get(indices));
        }
        const material = prim.getMaterial();
        if (material) {
            primKeyItems.push("material:" + refs.get(material));
        }
        primKeyItems.push("mode:" + prim.getMode());
        for (const target of prim.listTargets()) {
            primKeyItems.push("target:" + createPrimitiveKey(target, refs));
        }
    }
    return primKeyItems.join(",");
}
function hasModifier(prop, cache) {
    if (cache.has(prop))
        return cache.get(prop);
    const graph = prop.getGraph();
    const visitedNodes = new Set();
    const edgeQueue = graph.listParentEdges(prop);
    while (edgeQueue.length > 0) {
        const edge = edgeQueue.pop();
        if (edge.getAttributes().modifyChild === true) {
            cache.set(prop, true);
            return true;
        }
        const child = edge.getChild();
        if (visitedNodes.has(child))
            continue;
        for (const childEdge of graph.listChildEdges(child)) {
            edgeQueue.push(childEdge);
        }
    }
    cache.set(prop, false);
    return false;
}
function create2() {
    var out = new ARRAY_TYPE2(4);
    if (ARRAY_TYPE2 != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
    }
    return out;
}
function add(out, a2, b) {
    out[0] = a2[0] + b[0];
    out[1] = a2[1] + b[1];
    out[2] = a2[2] + b[2];
    out[3] = a2[3] + b[3];
    return out;
}
function subtract(out, a2, b) {
    out[0] = a2[0] - b[0];
    out[1] = a2[1] - b[1];
    out[2] = a2[2] - b[2];
    out[3] = a2[3] - b[3];
    return out;
}
function multiply2(out, a2, b) {
    out[0] = a2[0] * b[0];
    out[1] = a2[1] * b[1];
    out[2] = a2[2] * b[2];
    out[3] = a2[3] * b[3];
    return out;
}
function scale(out, a2, b) {
    out[0] = a2[0] * b;
    out[1] = a2[1] * b;
    out[2] = a2[2] * b;
    out[3] = a2[3] * b;
    return out;
}
function length2(a2) {
    var x = a2[0];
    var y = a2[1];
    var z = a2[2];
    var w = a2[3];
    return Math.hypot(x, y, z, w);
}
var sub = subtract;
var mul = multiply2;
var len = length2;
(function () {
    var vec = create2();
    return function (a2, stride, offset, count, fn, arg) {
        var i, l;
        if (!stride) {
            stride = 4;
        }
        if (!offset) {
            offset = 0;
        }
        if (count) {
            l = Math.min(count * stride + offset, a2.length);
        }
        else {
            l = a2.length;
        }
        for (i = offset; i < l; i += stride) {
            vec[0] = a2[i];
            vec[1] = a2[i + 1];
            vec[2] = a2[i + 2];
            vec[3] = a2[i + 3];
            fn(vec, vec, arg);
            a2[i] = vec[0];
            a2[i + 1] = vec[1];
            a2[i + 2] = vec[2];
            a2[i + 3] = vec[3];
        }
        return a2;
    };
})();
var SRGB_PATTERN = /color|emissive|diffuse/i;
function getTextureColorSpace(texture) {
    const graph = texture.getGraph();
    const edges = graph.listParentEdges(texture);
    const isSRGB = edges.some((edge) => {
        return edge.getAttributes().isColor || SRGB_PATTERN.test(edge.getName());
    });
    return isSRGB ? "srgb" : null;
}
function listTextureInfo(texture) {
    const graph = texture.getGraph();
    const results = new Set();
    for (const textureEdge of graph.listParentEdges(texture)) {
        const parent = textureEdge.getParent();
        const name = textureEdge.getName() + "Info";
        for (const edge of graph.listChildEdges(parent)) {
            const child = edge.getChild();
            if (child instanceof TextureInfo && edge.getName() === name) {
                results.add(child);
            }
        }
    }
    return Array.from(results);
}
function listTextureInfoByMaterial(material) {
    const graph = material.getGraph();
    const visited = new Set();
    const results = new Set();
    function traverse(prop) {
        const textureInfoNames = new Set();
        for (const edge of graph.listChildEdges(prop)) {
            if (edge.getChild() instanceof Texture) {
                textureInfoNames.add(edge.getName() + "Info");
            }
        }
        for (const edge of graph.listChildEdges(prop)) {
            const child = edge.getChild();
            if (visited.has(child))
                continue;
            visited.add(child);
            if (child instanceof TextureInfo && textureInfoNames.has(edge.getName())) {
                results.add(child);
            }
            else if (child instanceof ExtensionProperty) {
                traverse(child);
            }
        }
    }
    traverse(material);
    return Array.from(results);
}
function listTextureSlots(texture) {
    const document = Document.fromGraph(texture.getGraph());
    const root = document.getRoot();
    const slots = texture.getGraph().listParentEdges(texture).filter((edge) => edge.getParent() !== root).map((edge) => edge.getName());
    return Array.from(new Set(slots));
}
var NAME$n2 = "prune";
var EPS = 3 / 255;
var PRUNE_DEFAULTS = {
    propertyTypes: [PropertyType.NODE, PropertyType.SKIN, PropertyType.MESH, PropertyType.CAMERA, PropertyType.PRIMITIVE, PropertyType.PRIMITIVE_TARGET, PropertyType.ANIMATION, PropertyType.MATERIAL, PropertyType.TEXTURE, PropertyType.ACCESSOR, PropertyType.BUFFER],
    keepLeaves: false,
    keepAttributes: false,
    keepIndices: false,
    keepSolidTextures: false,
    keepExtras: false
};
function prune(_options = PRUNE_DEFAULTS) {
    const options = assignDefaults(PRUNE_DEFAULTS, _options);
    const propertyTypes = new Set(options.propertyTypes);
    const keepExtras = options.keepExtras;
    return createTransform(NAME$n2, async (document) => {
        const logger = document.getLogger();
        const root = document.getRoot();
        const graph = document.getGraph();
        const counter = new DisposeCounter();
        const onDispose = (event) => counter.dispose(event.target);
        graph.addEventListener("node:dispose", onDispose);
        if (propertyTypes.has(PropertyType.MESH)) {
            for (const mesh of root.listMeshes()) {
                if (mesh.listPrimitives().length > 0)
                    continue;
                mesh.dispose();
            }
        }
        if (propertyTypes.has(PropertyType.NODE)) {
            if (!options.keepLeaves) {
                for (const scene of root.listScenes()) {
                    nodeTreeShake(graph, scene, keepExtras);
                }
            }
            for (const node of root.listNodes()) {
                treeShake(node, keepExtras);
            }
        }
        if (propertyTypes.has(PropertyType.SKIN)) {
            for (const skin of root.listSkins()) {
                treeShake(skin, keepExtras);
            }
        }
        if (propertyTypes.has(PropertyType.MESH)) {
            for (const mesh of root.listMeshes()) {
                treeShake(mesh, keepExtras);
            }
        }
        if (propertyTypes.has(PropertyType.CAMERA)) {
            for (const camera of root.listCameras()) {
                treeShake(camera, keepExtras);
            }
        }
        if (propertyTypes.has(PropertyType.PRIMITIVE)) {
            indirectTreeShake(graph, PropertyType.PRIMITIVE, keepExtras);
        }
        if (propertyTypes.has(PropertyType.PRIMITIVE_TARGET)) {
            indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET, keepExtras);
        }
        if (!options.keepAttributes && propertyTypes.has(PropertyType.ACCESSOR)) {
            const materialPrims = new Map();
            for (const mesh of root.listMeshes()) {
                for (const prim of mesh.listPrimitives()) {
                    const material = prim.getMaterial();
                    if (!material)
                        continue;
                    const required = listRequiredSemantics(document, prim, material);
                    const unused = listUnusedSemantics(prim, required);
                    pruneAttributes(prim, unused);
                    prim.listTargets().forEach((target) => pruneAttributes(target, unused));
                    materialPrims.has(material) ? materialPrims.get(material).add(prim) : materialPrims.set(material, new Set([prim]));
                }
            }
            for (const [material, prims] of materialPrims) {
                shiftTexCoords(material, Array.from(prims));
            }
        }
        if (!options.keepIndices && propertyTypes.has(PropertyType.ACCESSOR)) {
            for (const mesh of root.listMeshes()) {
                for (const prim of mesh.listPrimitives()) {
                    pruneIndices(prim);
                }
            }
        }
        if (propertyTypes.has(PropertyType.ANIMATION)) {
            for (const anim of root.listAnimations()) {
                for (const channel of anim.listChannels()) {
                    if (!channel.getTargetNode()) {
                        channel.dispose();
                    }
                }
                if (!anim.listChannels().length) {
                    const samplers = anim.listSamplers();
                    treeShake(anim, keepExtras);
                    samplers.forEach((sampler) => treeShake(sampler, keepExtras));
                }
                else {
                    anim.listSamplers().forEach((sampler) => treeShake(sampler, keepExtras));
                }
            }
        }
        if (propertyTypes.has(PropertyType.MATERIAL)) {
            root.listMaterials().forEach((material) => treeShake(material, keepExtras));
        }
        if (propertyTypes.has(PropertyType.TEXTURE)) {
            root.listTextures().forEach((texture) => treeShake(texture, keepExtras));
            if (!options.keepSolidTextures) {
                await pruneSolidTextures(document);
            }
        }
        if (propertyTypes.has(PropertyType.ACCESSOR)) {
            root.listAccessors().forEach((accessor) => treeShake(accessor, keepExtras));
        }
        if (propertyTypes.has(PropertyType.BUFFER)) {
            root.listBuffers().forEach((buffer) => treeShake(buffer, keepExtras));
        }
        graph.removeEventListener("node:dispose", onDispose);
        if (!counter.empty()) {
            const str = counter.entries().map(([type, count]) => `${type} (${count})`).join(", ");
            logger.info(`${NAME$n2}: Removed types... ${str}`);
        }
        else {
            logger.debug(`${NAME$n2}: No unused properties found.`);
        }
        logger.debug(`${NAME$n2}: Complete.`);
    });
}
var DisposeCounter = class {
    constructor() {
        this.disposed = {};
    }
    empty() {
        for (const key in this.disposed)
            return false;
        return true;
    }
    entries() {
        return Object.entries(this.disposed);
    }
    dispose(prop) {
        this.disposed[prop.propertyType] = this.disposed[prop.propertyType] || 0;
        this.disposed[prop.propertyType]++;
    }
};
function treeShake(prop, keepExtras) {
    const parents = prop.listParents().filter((p) => !(p instanceof Root || p instanceof AnimationChannel));
    const needsExtras = keepExtras && !isEmptyObject(prop.getExtras());
    if (!parents.length && !needsExtras) {
        prop.dispose();
    }
}
function indirectTreeShake(graph, propertyType, keepExtras) {
    for (const edge of graph.listEdges()) {
        const parent = edge.getParent();
        if (parent.propertyType === propertyType) {
            treeShake(parent, keepExtras);
        }
    }
}
function nodeTreeShake(graph, prop, keepExtras) {
    prop.listChildren().forEach((child) => nodeTreeShake(graph, child, keepExtras));
    if (prop instanceof Scene)
        return;
    const isUsed2 = graph.listParentEdges(prop).some((e2) => {
        const ptype = e2.getParent().propertyType;
        return ptype !== PropertyType.ROOT && ptype !== PropertyType.SCENE && ptype !== PropertyType.NODE;
    });
    const isEmpty = graph.listChildren(prop).length === 0;
    const needsExtras = keepExtras && !isEmptyObject(prop.getExtras());
    if (isEmpty && !isUsed2 && !needsExtras) {
        prop.dispose();
    }
}
function pruneAttributes(prim, unused) {
    for (const semantic of unused) {
        prim.setAttribute(semantic, null);
    }
}
function pruneIndices(prim) {
    const indices = prim.getIndices();
    const indicesArray = indices && indices.getArray();
    const attribute = prim.listAttributes()[0];
    if (!indicesArray || !attribute) {
        return;
    }
    if (indices.getCount() !== attribute.getCount()) {
        return;
    }
    for (let i = 0, il = indicesArray.length; i < il; i++) {
        if (i !== indicesArray[i]) {
            return;
        }
    }
    prim.setIndices(null);
}
function listUnusedSemantics(prim, required) {
    const unused = [];
    for (const semantic of prim.listSemantics()) {
        if (semantic === "NORMAL" && !required.has(semantic)) {
            unused.push(semantic);
        }
        else if (semantic === "TANGENT" && !required.has(semantic)) {
            unused.push(semantic);
        }
        else if (semantic.startsWith("TEXCOORD_") && !required.has(semantic)) {
            unused.push(semantic);
        }
        else if (semantic.startsWith("COLOR_") && semantic !== "COLOR_0") {
            unused.push(semantic);
        }
    }
    return unused;
}
function listRequiredSemantics(document, prim, material, semantics = new Set()) {
    const graph = document.getGraph();
    const edges = graph.listChildEdges(material);
    const textureNames = new Set();
    for (const edge of edges) {
        if (edge.getChild() instanceof Texture) {
            textureNames.add(edge.getName());
        }
    }
    for (const edge of edges) {
        const name = edge.getName();
        const child = edge.getChild();
        if (child instanceof TextureInfo) {
            if (textureNames.has(name.replace(/Info$/, ""))) {
                semantics.add(`TEXCOORD_${child.getTexCoord()}`);
            }
        }
        if (child instanceof Texture && name.match(/normalTexture/i)) {
            semantics.add("TANGENT");
        }
        if (child instanceof ExtensionProperty) {
            listRequiredSemantics(document, prim, child, semantics);
        }
    }
    const isLit = material instanceof Material && !material.getExtension("KHR_materials_unlit");
    const isPoints = prim.getMode() === Primitive.Mode.POINTS;
    if (isLit && !isPoints) {
        semantics.add("NORMAL");
    }
    return semantics;
}
function shiftTexCoords(material, prims) {
    const textureInfoList = listTextureInfoByMaterial(material);
    const texCoordSet = new Set(textureInfoList.map((info) => info.getTexCoord()));
    const texCoordList = Array.from(texCoordSet).sort();
    const texCoordMap = new Map(texCoordList.map((texCoord, index) => [texCoord, index]));
    const semanticMap = new Map(texCoordList.map((texCoord, index) => [`TEXCOORD_${texCoord}`, `TEXCOORD_${index}`]));
    for (const textureInfo of textureInfoList) {
        const texCoord = textureInfo.getTexCoord();
        textureInfo.setTexCoord(texCoordMap.get(texCoord));
    }
    for (const prim of prims) {
        const semantics = prim.listSemantics().filter((semantic) => semantic.startsWith("TEXCOORD_")).sort();
        updatePrim(prim, semantics);
        prim.listTargets().forEach((target) => updatePrim(target, semantics));
    }
    function updatePrim(prim, srcSemantics) {
        for (const srcSemantic of srcSemantics) {
            const uv = prim.getAttribute(srcSemantic);
            if (!uv)
                continue;
            const dstSemantic = semanticMap.get(srcSemantic);
            if (dstSemantic === srcSemantic)
                continue;
            prim.setAttribute(dstSemantic, uv);
            prim.setAttribute(srcSemantic, null);
        }
    }
}
async function pruneSolidTextures(document) {
    const root = document.getRoot();
    const graph = document.getGraph();
    const logger = document.getLogger();
    const textures = root.listTextures();
    const pending = textures.map(async (texture) => {
        var _texture$getSize;
        const factor = await getTextureFactor(texture);
        if (!factor)
            return;
        if (getTextureColorSpace(texture) === "srgb") {
            ColorUtils.convertSRGBToLinear(factor, factor);
        }
        const name = texture.getName() || texture.getURI();
        const size = (_texture$getSize = texture.getSize()) == null ? void 0 : _texture$getSize.join("x");
        const slots = listTextureSlots(texture);
        for (const edge of graph.listParentEdges(texture)) {
            const parent = edge.getParent();
            if (parent !== root && applyMaterialFactor(parent, factor, edge.getName(), logger)) {
                edge.dispose();
            }
        }
        if (texture.listParents().length === 1) {
            texture.dispose();
            logger.debug(`${NAME$n2}: Removed solid-color texture "${name}" (${size}px ${slots.join(", ")})`);
        }
    });
    await Promise.all(pending);
}
function applyMaterialFactor(material, factor, slot, logger) {
    if (material instanceof Material) {
        switch (slot) {
            case "baseColorTexture":
                material.setBaseColorFactor(mul(factor, factor, material.getBaseColorFactor()));
                return true;
            case "emissiveTexture":
                material.setEmissiveFactor(mul$1([0, 0, 0], factor.slice(0, 3), material.getEmissiveFactor()));
                return true;
            case "occlusionTexture":
                return Math.abs(factor[0] - 1) <= EPS;
            case "metallicRoughnessTexture":
                material.setRoughnessFactor(factor[1] * material.getRoughnessFactor());
                material.setMetallicFactor(factor[2] * material.getMetallicFactor());
                return true;
            case "normalTexture":
                return len(sub(create2(), factor, [0.5, 0.5, 1, 1])) <= EPS;
        }
    }
    logger.warn(`${NAME$n2}: Detected single-color ${slot} texture. Pruning ${slot} not yet supported.`);
    return false;
}
async function getTextureFactor(texture) {
    const pixels = await maybeGetPixels(texture);
    if (!pixels)
        return null;
    const min2 = [Infinity, Infinity, Infinity, Infinity];
    const max2 = [-Infinity, -Infinity, -Infinity, -Infinity];
    const target = [0, 0, 0, 0];
    const [width, height] = pixels.shape;
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            for (let k = 0; k < 4; k++) {
                min2[k] = Math.min(min2[k], pixels.get(i, j, k));
                max2[k] = Math.max(max2[k], pixels.get(i, j, k));
            }
        }
        if (len(sub(target, max2, min2)) / 255 > EPS) {
            return null;
        }
    }
    return scale(target, add(target, max2, min2), 0.5 / 255);
}
async function maybeGetPixels(texture) {
    try {
        return await getPixels(texture.getImage(), texture.getMimeType());
    }
    catch (_unused) {
        return null;
    }
}
var EMPTY_U32$1 = 2 ** 32 - 1;
var VertexStream = class {
    constructor(prim) {
        this.attributes = [];
        this.u8 = void 0;
        this.u32 = void 0;
        let byteStride = 0;
        for (const attribute of deepListAttributes(prim)) {
            byteStride += this._initAttribute(attribute);
        }
        this.u8 = new Uint8Array(byteStride);
        this.u32 = new Uint32Array(this.u8.buffer);
    }
    _initAttribute(attribute) {
        const array = attribute.getArray();
        const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        const byteStride = attribute.getElementSize() * attribute.getComponentSize();
        const paddedByteStride = BufferUtils.padNumber(byteStride);
        this.attributes.push({
            u8,
            byteStride,
            paddedByteStride
        });
        return paddedByteStride;
    }
    hash(index) {
        let byteOffset = 0;
        for (const { u8, byteStride, paddedByteStride } of this.attributes) {
            for (let i = 0; i < paddedByteStride; i++) {
                if (i < byteStride) {
                    this.u8[byteOffset + i] = u8[index * byteStride + i];
                }
                else {
                    this.u8[byteOffset + i] = 0;
                }
            }
            byteOffset += paddedByteStride;
        }
        return murmurHash2(0, this.u32);
    }
    equal(a2, b) {
        for (const { u8, byteStride } of this.attributes) {
            for (let j = 0; j < byteStride; j++) {
                if (u8[a2 * byteStride + j] !== u8[b * byteStride + j]) {
                    return false;
                }
            }
        }
        return true;
    }
};
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
function hashLookup(table, buckets, stream, key, empty = EMPTY_U32$1) {
    const hashmod = buckets - 1;
    const hashval = stream.hash(key);
    let bucket = hashval & hashmod;
    for (let probe = 0; probe <= hashmod; probe++) {
        const item = table[bucket];
        if (item === empty || stream.equal(item, key)) {
            return bucket;
        }
        bucket = bucket + probe + 1 & hashmod;
    }
    throw new Error("Hash table full.");
}
var VertexCountMethod;
(function (VertexCountMethod2) {
    VertexCountMethod2["RENDER"] = "render";
    VertexCountMethod2["RENDER_CACHED"] = "render-cached";
    VertexCountMethod2["UPLOAD"] = "upload";
    VertexCountMethod2["UPLOAD_NAIVE"] = "upload-naive";
    VertexCountMethod2["DISTINCT"] = "distinct";
    VertexCountMethod2["DISTINCT_POSITION"] = "distinct-position";
    VertexCountMethod2["UNUSED"] = "unused";
})(VertexCountMethod || (VertexCountMethod = {}));
function getSceneVertexCount(scene, method) {
    return _getSubtreeVertexCount(scene, method);
}
function getNodeVertexCount(node, method) {
    return _getSubtreeVertexCount(node, method);
}
function _getSubtreeVertexCount(node, method) {
    const instancedMeshes = [];
    const nonInstancedMeshes = [];
    const meshes = [];
    node.traverse((node2) => {
        const mesh = node2.getMesh();
        const batch = node2.getExtension("EXT_mesh_gpu_instancing");
        if (batch && mesh) {
            meshes.push(mesh);
            instancedMeshes.push([batch.listAttributes()[0].getCount(), mesh]);
        }
        else if (mesh) {
            meshes.push(mesh);
            nonInstancedMeshes.push(mesh);
        }
    });
    const prims = meshes.flatMap((mesh) => mesh.listPrimitives());
    const positions = prims.map((prim) => prim.getAttribute("POSITION"));
    const uniquePositions = Array.from(new Set(positions));
    const uniqueMeshes = Array.from(new Set(meshes));
    const uniquePrims = Array.from(new Set(uniqueMeshes.flatMap((mesh) => mesh.listPrimitives())));
    switch (method) {
        case VertexCountMethod.RENDER:
        case VertexCountMethod.RENDER_CACHED:
            return _sum(nonInstancedMeshes.map((mesh) => getMeshVertexCount(mesh, method))) + _sum(instancedMeshes.map(([batch, mesh]) => batch * getMeshVertexCount(mesh, method)));
        case VertexCountMethod.UPLOAD_NAIVE:
            return _sum(uniqueMeshes.map((mesh) => getMeshVertexCount(mesh, method)));
        case VertexCountMethod.UPLOAD:
            return _sum(uniquePositions.map((attribute) => attribute.getCount()));
        case VertexCountMethod.DISTINCT:
        case VertexCountMethod.DISTINCT_POSITION:
            return _assertNotImplemented(method);
        case VertexCountMethod.UNUSED:
            return _sumUnused(uniquePrims);
        default:
            return _assertUnreachable(method);
    }
}
function getMeshVertexCount(mesh, method) {
    const prims = mesh.listPrimitives();
    const uniquePrims = Array.from(new Set(prims));
    const uniquePositions = Array.from(new Set(uniquePrims.map((prim) => prim.getAttribute("POSITION"))));
    switch (method) {
        case VertexCountMethod.RENDER:
        case VertexCountMethod.RENDER_CACHED:
        case VertexCountMethod.UPLOAD_NAIVE:
            return _sum(prims.map((prim) => getPrimitiveVertexCount(prim, method)));
        case VertexCountMethod.UPLOAD:
            return _sum(uniquePositions.map((attribute) => attribute.getCount()));
        case VertexCountMethod.DISTINCT:
        case VertexCountMethod.DISTINCT_POSITION:
            return _assertNotImplemented(method);
        case VertexCountMethod.UNUSED:
            return _sumUnused(uniquePrims);
        default:
            return _assertUnreachable(method);
    }
}
function getPrimitiveVertexCount(prim, method) {
    const position = prim.getAttribute("POSITION");
    const indices = prim.getIndices();
    switch (method) {
        case VertexCountMethod.RENDER:
            return indices ? indices.getCount() : position.getCount();
        case VertexCountMethod.RENDER_CACHED:
            return indices ? new Set(indices.getArray()).size : position.getCount();
        case VertexCountMethod.UPLOAD_NAIVE:
        case VertexCountMethod.UPLOAD:
            return position.getCount();
        case VertexCountMethod.DISTINCT:
        case VertexCountMethod.DISTINCT_POSITION:
            return _assertNotImplemented(method);
        case VertexCountMethod.UNUSED:
            return indices ? position.getCount() - new Set(indices.getArray()).size : 0;
        default:
            return _assertUnreachable(method);
    }
}
function _sum(values) {
    let total = 0;
    for (let i = 0; i < values.length; i++) {
        total += values[i];
    }
    return total;
}
function _sumUnused(prims) {
    const attributeIndexMap = new Map();
    for (const prim of prims) {
        const position = prim.getAttribute("POSITION");
        const indices = prim.getIndices();
        const indicesSet = attributeIndexMap.get(position) || new Set();
        indicesSet.add(indices);
        attributeIndexMap.set(position, indicesSet);
    }
    let unused = 0;
    for (const [position, indicesSet] of attributeIndexMap) {
        if (indicesSet.has(null))
            continue;
        const usedIndices = new Uint8Array(position.getCount());
        for (const indices of indicesSet) {
            const indicesArray = indices.getArray();
            for (let i = 0, il = indicesArray.length; i < il; i++) {
                usedIndices[indicesArray[i]] = 1;
            }
        }
        for (let i = 0, il = position.getCount(); i < il; i++) {
            if (usedIndices[i] === 0)
                unused++;
        }
    }
    return unused;
}
function _assertNotImplemented(x) {
    throw new Error(`Not implemented: ${x}`);
}
function _assertUnreachable(x) {
    throw new Error(`Unexpected value: ${x}`);
}
function compactPrimitive(prim, remap2, dstVertexCount) {
    const document = Document.fromGraph(prim.getGraph());
    if (!remap2 || !dstVertexCount) {
        [remap2, dstVertexCount] = createCompactPlan(prim);
    }
    const srcIndices = prim.getIndices();
    const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
    const srcIndicesCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
    const dstIndices = document.createAccessor();
    const dstIndicesCount = srcIndicesCount;
    const dstIndicesArray = createIndicesEmpty(dstIndicesCount, dstVertexCount);
    for (let i = 0; i < dstIndicesCount; i++) {
        dstIndicesArray[i] = remap2[srcIndicesArray ? srcIndicesArray[i] : i];
    }
    prim.setIndices(dstIndices.setArray(dstIndicesArray));
    const srcAttributesPrev = deepListAttributes(prim);
    for (const srcAttribute of prim.listAttributes()) {
        const dstAttribute = shallowCloneAccessor(document, srcAttribute);
        compactAttribute(srcAttribute, srcIndices, remap2, dstAttribute, dstVertexCount);
        prim.swap(srcAttribute, dstAttribute);
    }
    for (const target of prim.listTargets()) {
        for (const srcAttribute of target.listAttributes()) {
            const dstAttribute = shallowCloneAccessor(document, srcAttribute);
            compactAttribute(srcAttribute, srcIndices, remap2, dstAttribute, dstVertexCount);
            target.swap(srcAttribute, dstAttribute);
        }
    }
    if (srcIndices && srcIndices.listParents().length === 1) {
        srcIndices.dispose();
    }
    for (const srcAttribute of srcAttributesPrev) {
        if (srcAttribute.listParents().length === 1) {
            srcAttribute.dispose();
        }
    }
    return prim;
}
function compactAttribute(srcAttribute, srcIndices, remap2, dstAttribute, dstVertexCount) {
    const elementSize = srcAttribute.getElementSize();
    const srcArray = srcAttribute.getArray();
    const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
    const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcAttribute.getCount();
    const dstArray = new srcArray.constructor(dstVertexCount * elementSize);
    const dstDone = new Uint8Array(dstVertexCount);
    for (let i = 0; i < srcIndicesCount; i++) {
        const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
        const dstIndex = remap2[srcIndex];
        if (dstDone[dstIndex])
            continue;
        for (let j = 0; j < elementSize; j++) {
            dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
        }
        dstDone[dstIndex] = 1;
    }
    return dstAttribute.setArray(dstArray);
}
function createCompactPlan(prim) {
    const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
    const indices = prim.getIndices();
    const indicesArray = indices ? indices.getArray() : null;
    if (!indices || !indicesArray) {
        return [createIndices(srcVertexCount, 1e6), srcVertexCount];
    }
    const remap2 = new Uint32Array(srcVertexCount).fill(EMPTY_U32$1);
    let dstVertexCount = 0;
    for (let i = 0; i < indicesArray.length; i++) {
        const srcIndex = indicesArray[i];
        if (remap2[srcIndex] === EMPTY_U32$1) {
            remap2[srcIndex] = dstVertexCount++;
        }
    }
    return [remap2, dstVertexCount];
}
var NAME$m2 = "weld";
var WELD_DEFAULTS = {
    overwrite: true,
    cleanup: true
};
function weld(_options = WELD_DEFAULTS) {
    const options = assignDefaults(WELD_DEFAULTS, _options);
    return createTransform(NAME$m2, async (doc) => {
        const logger = doc.getLogger();
        for (const mesh of doc.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                weldPrimitive(prim, options);
                if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
                    prim.dispose();
                }
            }
            if (mesh.listPrimitives().length === 0)
                mesh.dispose();
        }
        if (options.cleanup) {
            await doc.transform(prune({
                propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
                keepAttributes: true,
                keepIndices: true,
                keepLeaves: false
            }), dedup({
                propertyTypes: [PropertyType.ACCESSOR]
            }));
        }
        logger.debug(`${NAME$m2}: Complete.`);
    });
}
function weldPrimitive(prim, _options = WELD_DEFAULTS) {
    const graph = prim.getGraph();
    const document = Document.fromGraph(graph);
    const logger = document.getLogger();
    const options = _extends4({}, WELD_DEFAULTS, _options);
    if (prim.getIndices() && !options.overwrite)
        return;
    if (prim.getMode() === Primitive.Mode.POINTS)
        return;
    const srcVertexCount = prim.getAttribute("POSITION").getCount();
    const srcIndices = prim.getIndices();
    const srcIndicesArray = srcIndices == null ? void 0 : srcIndices.getArray();
    const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;
    const stream = new VertexStream(prim);
    const tableSize = ceilPowerOfTwo$1(srcVertexCount + srcVertexCount / 4);
    const table = new Uint32Array(tableSize).fill(EMPTY_U32$1);
    const writeMap = new Uint32Array(srcVertexCount).fill(EMPTY_U32$1);
    let dstVertexCount = 0;
    for (let i = 0; i < srcIndicesCount; i++) {
        const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
        if (writeMap[srcIndex] !== EMPTY_U32$1)
            continue;
        const hashIndex = hashLookup(table, tableSize, stream, srcIndex, EMPTY_U32$1);
        const dstIndex = table[hashIndex];
        if (dstIndex === EMPTY_U32$1) {
            table[hashIndex] = srcIndex;
            writeMap[srcIndex] = dstVertexCount++;
        }
        else {
            writeMap[srcIndex] = writeMap[dstIndex];
        }
    }
    logger.debug(`${NAME$m2}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
    compactPrimitive(prim, writeMap, dstVertexCount);
}
var { FLOAT: FLOAT2 } = Accessor.ComponentType;
function transformPrimitive(prim, matrix) {
    const position = prim.getAttribute("POSITION");
    if (position) {
        applyMatrix(matrix, position);
    }
    const normal = prim.getAttribute("NORMAL");
    if (normal) {
        applyNormalMatrix(matrix, normal);
    }
    const tangent = prim.getAttribute("TANGENT");
    if (tangent) {
        applyTangentMatrix(matrix, tangent);
    }
    for (const target of prim.listTargets()) {
        const _position = target.getAttribute("POSITION");
        if (_position) {
            applyMatrix(matrix, _position);
        }
        const _normal = target.getAttribute("NORMAL");
        if (_normal) {
            applyNormalMatrix(matrix, _normal);
        }
        const _tangent = target.getAttribute("TANGENT");
        if (_tangent) {
            applyTangentMatrix(matrix, _tangent);
        }
    }
    if (determinant2(matrix) < 0) {
        reversePrimitiveWindingOrder(prim);
    }
}
function applyMatrix(matrix, attribute) {
    const componentType = attribute.getComponentType();
    const normalized = attribute.getNormalized();
    const srcArray = attribute.getArray();
    const dstArray = componentType === FLOAT2 ? srcArray : new Float32Array(srcArray.length);
    const vector = create$1();
    for (let i = 0, il = attribute.getCount(); i < il; i++) {
        if (normalized) {
            vector[0] = MathUtils.decodeNormalizedInt(srcArray[i * 3], componentType);
            vector[1] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 1], componentType);
            vector[2] = MathUtils.decodeNormalizedInt(srcArray[i * 3 + 2], componentType);
        }
        else {
            vector[0] = srcArray[i * 3];
            vector[1] = srcArray[i * 3 + 1];
            vector[2] = srcArray[i * 3 + 2];
        }
        transformMat42(vector, vector, matrix);
        dstArray[i * 3] = vector[0];
        dstArray[i * 3 + 1] = vector[1];
        dstArray[i * 3 + 2] = vector[2];
    }
    attribute.setArray(dstArray).setNormalized(false);
}
function applyNormalMatrix(matrix, attribute) {
    const array = attribute.getArray();
    const normalized = attribute.getNormalized();
    const componentType = attribute.getComponentType();
    const normalMatrix = create$2();
    fromMat4(normalMatrix, matrix);
    invert(normalMatrix, normalMatrix);
    transpose(normalMatrix, normalMatrix);
    const vector = create$1();
    for (let i = 0, il = attribute.getCount(); i < il; i++) {
        if (normalized) {
            vector[0] = MathUtils.decodeNormalizedInt(array[i * 3], componentType);
            vector[1] = MathUtils.decodeNormalizedInt(array[i * 3 + 1], componentType);
            vector[2] = MathUtils.decodeNormalizedInt(array[i * 3 + 2], componentType);
        }
        else {
            vector[0] = array[i * 3];
            vector[1] = array[i * 3 + 1];
            vector[2] = array[i * 3 + 2];
        }
        transformMat3(vector, vector, normalMatrix);
        normalize(vector, vector);
        if (normalized) {
            array[i * 3] = MathUtils.decodeNormalizedInt(vector[0], componentType);
            array[i * 3 + 1] = MathUtils.decodeNormalizedInt(vector[1], componentType);
            array[i * 3 + 2] = MathUtils.decodeNormalizedInt(vector[2], componentType);
        }
        else {
            array[i * 3] = vector[0];
            array[i * 3 + 1] = vector[1];
            array[i * 3 + 2] = vector[2];
        }
    }
}
function applyTangentMatrix(matrix, attribute) {
    const array = attribute.getArray();
    const normalized = attribute.getNormalized();
    const componentType = attribute.getComponentType();
    const v3 = create$1();
    for (let i = 0, il = attribute.getCount(); i < il; i++) {
        if (normalized) {
            v3[0] = MathUtils.decodeNormalizedInt(array[i * 4], componentType);
            v3[1] = MathUtils.decodeNormalizedInt(array[i * 4 + 1], componentType);
            v3[2] = MathUtils.decodeNormalizedInt(array[i * 4 + 2], componentType);
        }
        else {
            v3[0] = array[i * 4];
            v3[1] = array[i * 4 + 1];
            v3[2] = array[i * 4 + 2];
        }
        v3[0] = matrix[0] * v3[0] + matrix[4] * v3[1] + matrix[8] * v3[2];
        v3[1] = matrix[1] * v3[0] + matrix[5] * v3[1] + matrix[9] * v3[2];
        v3[2] = matrix[2] * v3[0] + matrix[6] * v3[1] + matrix[10] * v3[2];
        normalize(v3, v3);
        if (normalized) {
            array[i * 4] = MathUtils.decodeNormalizedInt(v3[0], componentType);
            array[i * 4 + 1] = MathUtils.decodeNormalizedInt(v3[1], componentType);
            array[i * 4 + 2] = MathUtils.decodeNormalizedInt(v3[2], componentType);
        }
        else {
            array[i * 4] = v3[0];
            array[i * 4 + 1] = v3[1];
            array[i * 4 + 2] = v3[2];
        }
    }
}
function reversePrimitiveWindingOrder(prim) {
    if (prim.getMode() !== Primitive.Mode.TRIANGLES)
        return;
    if (!prim.getIndices())
        weldPrimitive(prim);
    const indices = prim.getIndices();
    for (let i = 0, il = indices.getCount(); i < il; i += 3) {
        const a2 = indices.getScalar(i);
        const c2 = indices.getScalar(i + 2);
        indices.setScalar(i, c2);
        indices.setScalar(i + 2, a2);
    }
}
function transformMesh(mesh, matrix) {
    for (const srcPrim of mesh.listPrimitives()) {
        const dstPrim = shallowClonePrimitive(srcPrim, mesh);
        if (srcPrim !== dstPrim) {
            mesh.removePrimitive(srcPrim).addPrimitive(dstPrim);
        }
    }
    for (const prim of mesh.listPrimitives()) {
        compactPrimitive(prim);
        transformPrimitive(prim, matrix);
    }
}
function shallowClonePrimitive(prim, parentMesh) {
    const isSharedPrimitive = prim.listParents().some((parent) => parent instanceof Mesh && parent !== parentMesh);
    if (isSharedPrimitive) {
        prim = prim.clone();
    }
    for (const target of prim.listTargets()) {
        const isSharedTarget = target.listParents().some((parent) => parent instanceof Primitive && parent !== prim);
        if (isSharedTarget) {
            prim.removeTarget(target).addTarget(target.clone());
        }
    }
    return prim;
}
var IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function clearNodeTransform(node) {
    const mesh = node.getMesh();
    const localMatrix = node.getMatrix();
    if (mesh && !MathUtils.eq(localMatrix, IDENTITY)) {
        transformMesh(mesh, localMatrix);
    }
    for (const child of node.listChildren()) {
        const matrix = child.getMatrix();
        multiply$2(matrix, matrix, localMatrix);
        child.setMatrix(matrix);
    }
    return node.setMatrix(IDENTITY);
}
var { LINES: LINES$1, LINE_STRIP: LINE_STRIP$2, LINE_LOOP: LINE_LOOP$2, TRIANGLES: TRIANGLES$1, TRIANGLE_STRIP: TRIANGLE_STRIP$2, TRIANGLE_FAN: TRIANGLE_FAN$2 } = Primitive.Mode;
function convertPrimitiveToLines(prim) {
    const graph = prim.getGraph();
    const document = Document.fromGraph(graph);
    if (!prim.getIndices()) {
        weldPrimitive(prim);
    }
    const srcIndices = prim.getIndices();
    const srcIndicesArray = srcIndices.getArray();
    const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
    const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
    const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 2);
    const srcMode = prim.getMode();
    if (srcMode === LINE_STRIP$2) {
        for (let i = 0; i < dstGLPrimitiveCount; i++) {
            dstIndicesArray[i * 2] = srcIndicesArray[i];
            dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
        }
    }
    else if (srcMode === LINE_LOOP$2) {
        for (let i = 0; i < dstGLPrimitiveCount; i++) {
            if (i < dstGLPrimitiveCount - 1) {
                dstIndicesArray[i * 2] = srcIndicesArray[i];
                dstIndicesArray[i * 2 + 1] = srcIndicesArray[i + 1];
            }
            else {
                dstIndicesArray[i * 2] = srcIndicesArray[i];
                dstIndicesArray[i * 2 + 1] = srcIndicesArray[0];
            }
        }
    }
    else {
        throw new Error("Only LINE_STRIP and LINE_LOOP may be converted to LINES.");
    }
    prim.setMode(LINES$1);
    const root = document.getRoot();
    if (srcIndices.listParents().some((parent) => parent !== root && parent !== prim)) {
        prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
    }
    else {
        srcIndices.setArray(dstIndicesArray);
    }
}
function convertPrimitiveToTriangles(prim) {
    const graph = prim.getGraph();
    const document = Document.fromGraph(graph);
    if (!prim.getIndices()) {
        weldPrimitive(prim);
    }
    const srcIndices = prim.getIndices();
    const srcIndicesArray = srcIndices.getArray();
    const dstGLPrimitiveCount = getGLPrimitiveCount(prim);
    const IndicesArray = ComponentTypeToTypedArray[srcIndices.getComponentType()];
    const dstIndicesArray = new IndicesArray(dstGLPrimitiveCount * 3);
    const srcMode = prim.getMode();
    if (srcMode === TRIANGLE_STRIP$2) {
        for (let i = 0, il = srcIndicesArray.length; i < il - 2; i++) {
            if (i % 2) {
                dstIndicesArray[i * 3] = srcIndicesArray[i + 1];
                dstIndicesArray[i * 3 + 1] = srcIndicesArray[i];
                dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
            }
            else {
                dstIndicesArray[i * 3] = srcIndicesArray[i];
                dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
                dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
            }
        }
    }
    else if (srcMode === TRIANGLE_FAN$2) {
        for (let i = 0; i < dstGLPrimitiveCount; i++) {
            dstIndicesArray[i * 3] = srcIndicesArray[0];
            dstIndicesArray[i * 3 + 1] = srcIndicesArray[i + 1];
            dstIndicesArray[i * 3 + 2] = srcIndicesArray[i + 2];
        }
    }
    else {
        throw new Error("Only TRIANGLE_STRIP and TRIANGLE_FAN may be converted to TRIANGLES.");
    }
    prim.setMode(TRIANGLES$1);
    const root = document.getRoot();
    if (srcIndices.listParents().some((parent) => parent !== root && parent !== prim)) {
        prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
    }
    else {
        srcIndices.setArray(dstIndicesArray);
    }
}
var NAME$l2 = "dequantize";
var DEQUANTIZE_DEFAULTS = {
    pattern: /^((?!JOINTS_).)*$/
};
function dequantize(_options = DEQUANTIZE_DEFAULTS) {
    const options = assignDefaults(DEQUANTIZE_DEFAULTS, _options);
    return createTransform(NAME$l2, (doc) => {
        const logger = doc.getLogger();
        for (const mesh of doc.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                dequantizePrimitive(prim, options);
            }
        }
        doc.createExtension(KHRMeshQuantization).dispose();
        logger.debug(`${NAME$l2}: Complete.`);
    });
}
function dequantizePrimitive(prim, _options = DEQUANTIZE_DEFAULTS) {
    const options = assignDefaults(DEQUANTIZE_DEFAULTS, _options);
    for (const semantic of prim.listSemantics()) {
        if (options.pattern.test(semantic)) {
            dequantizeAttribute(prim.getAttribute(semantic));
        }
    }
    for (const target of prim.listTargets()) {
        for (const semantic of target.listSemantics()) {
            if (options.pattern.test(semantic)) {
                dequantizeAttribute(target.getAttribute(semantic));
            }
        }
    }
}
function dequantizeAttribute(attribute) {
    const srcArray = attribute.getArray();
    if (!srcArray)
        return;
    const dstArray = dequantizeAttributeArray(srcArray, attribute.getComponentType(), attribute.getNormalized());
    attribute.setArray(dstArray).setNormalized(false);
}
function dequantizeAttributeArray(srcArray, componentType, normalized) {
    const dstArray = new Float32Array(srcArray.length);
    for (let i = 0, il = srcArray.length; i < il; i++) {
        if (normalized) {
            dstArray[i] = MathUtils.decodeNormalizedInt(srcArray[i], componentType);
        }
        else {
            dstArray[i] = srcArray[i];
        }
    }
    return dstArray;
}
var { TEXTURE_INFO, ROOT: ROOT$1 } = PropertyType;
var NO_TRANSFER_TYPES = new Set([TEXTURE_INFO, ROOT$1]);
function cloneDocument(source) {
    const target = new Document().setLogger(source.getLogger());
    const resolve = createDefaultPropertyResolver(target, source);
    mergeDocuments(target, source, resolve);
    target.getRoot().copy(source.getRoot(), resolve);
    return target;
}
function mergeDocuments(target, source, resolve) {
    resolve || (resolve = createDefaultPropertyResolver(target, source));
    for (const sourceExtension of source.getRoot().listExtensionsUsed()) {
        const targetExtension = target.createExtension(sourceExtension.constructor);
        if (sourceExtension.isRequired())
            targetExtension.setRequired(true);
    }
    return _copyToDocument(target, source, listNonRootProperties(source), resolve);
}
function moveToDocument(target, source, sourceProperties, resolve) {
    const targetProperties = copyToDocument(target, source, sourceProperties, resolve);
    for (const property of sourceProperties) {
        property.dispose();
    }
    return targetProperties;
}
function copyToDocument(target, source, sourceProperties, resolve) {
    const sourcePropertyDependencies = new Set();
    for (const property of sourceProperties) {
        if (NO_TRANSFER_TYPES.has(property.propertyType)) {
            throw new Error(`Type "${property.propertyType}" cannot be transferred.`);
        }
        listPropertyDependencies(property, sourcePropertyDependencies);
    }
    return _copyToDocument(target, source, Array.from(sourcePropertyDependencies), resolve);
}
function _copyToDocument(target, source, sourceProperties, resolve) {
    resolve || (resolve = createDefaultPropertyResolver(target, source));
    const propertyMap = new Map();
    for (const sourceProp of sourceProperties) {
        if (!propertyMap.has(sourceProp) && sourceProp.propertyType !== TEXTURE_INFO) {
            propertyMap.set(sourceProp, resolve(sourceProp));
        }
    }
    for (const [sourceProp, targetProp] of propertyMap.entries()) {
        targetProp.copy(sourceProp, resolve);
    }
    return propertyMap;
}
function createDefaultPropertyResolver(target, source) {
    const propertyMap = new Map([[source.getRoot(), target.getRoot()]]);
    return (sourceProp) => {
        if (sourceProp.propertyType === TEXTURE_INFO)
            return sourceProp;
        let targetProp = propertyMap.get(sourceProp);
        if (!targetProp) {
            const PropertyClass = sourceProp.constructor;
            targetProp = new PropertyClass(target.getGraph());
            propertyMap.set(sourceProp, targetProp);
        }
        return targetProp;
    };
}
function listPropertyDependencies(parent, visited) {
    const graph = parent.getGraph();
    const queue = [parent];
    let next = void 0;
    while (next = queue.pop()) {
        visited.add(next);
        for (const child of graph.listChildren(next)) {
            if (!visited.has(child)) {
                queue.push(child);
            }
        }
    }
    return visited;
}
function listNonRootProperties(document) {
    const visited = new Set();
    for (const edge of document.getGraph().listEdges()) {
        visited.add(edge.getChild());
    }
    return Array.from(visited);
}
var NAME$k2 = "draco";
var DRACO_DEFAULTS = {
    method: "edgebreaker",
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeColor: 8,
    quantizeTexcoord: 12,
    quantizeGeneric: 12,
    quantizationVolume: "mesh"
};
function draco(_options = DRACO_DEFAULTS) {
    const options = assignDefaults(DRACO_DEFAULTS, _options);
    return createTransform(NAME$k2, async (document) => {
        await document.transform(weld());
        document.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
            method: options.method === "edgebreaker" ? KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER : KHRDracoMeshCompression.EncoderMethod.SEQUENTIAL,
            encodeSpeed: options.encodeSpeed,
            decodeSpeed: options.decodeSpeed,
            quantizationBits: {
                POSITION: options.quantizePosition,
                NORMAL: options.quantizeNormal,
                COLOR: options.quantizeColor,
                TEX_COORD: options.quantizeTexcoord,
                GENERIC: options.quantizeGeneric
            },
            quantizationVolume: options.quantizationVolume
        });
    });
}
var NAME$j2 = "flatten";
var FLATTEN_DEFAULTS = {
    cleanup: true
};
function flatten(_options = FLATTEN_DEFAULTS) {
    const options = assignDefaults(FLATTEN_DEFAULTS, _options);
    return createTransform(NAME$j2, async (document) => {
        const root = document.getRoot();
        const logger = document.getLogger();
        const joints = new Set();
        for (const skin of root.listSkins()) {
            for (const joint of skin.listJoints()) {
                joints.add(joint);
            }
        }
        const animated = new Set();
        for (const animation of root.listAnimations()) {
            for (const channel of animation.listChannels()) {
                const node = channel.getTargetNode();
                if (node && channel.getTargetPath() !== "weights") {
                    animated.add(node);
                }
            }
        }
        const hasJointParent = new Set();
        const hasAnimatedParent = new Set();
        for (const scene of root.listScenes()) {
            scene.traverse((node) => {
                const parent = node.getParentNode();
                if (!parent)
                    return;
                if (joints.has(parent) || hasJointParent.has(parent)) {
                    hasJointParent.add(node);
                }
                if (animated.has(parent) || hasAnimatedParent.has(parent)) {
                    hasAnimatedParent.add(node);
                }
            });
        }
        for (const scene of root.listScenes()) {
            scene.traverse((node) => {
                if (animated.has(node))
                    return;
                if (hasJointParent.has(node))
                    return;
                if (hasAnimatedParent.has(node))
                    return;
                clearNodeParent(node);
            });
        }
        if (animated.size) {
            logger.debug(`${NAME$j2}: Flattening node hierarchies with TRS animation not yet supported.`);
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [PropertyType.NODE],
                keepLeaves: false
            }));
        }
        logger.debug(`${NAME$j2}: Complete.`);
    });
}
function inspect(doc) {
    return {
        scenes: listScenes(doc),
        meshes: listMeshes(doc),
        materials: listMaterials(doc),
        textures: listTextures(doc),
        animations: listAnimations(doc)
    };
}
function listScenes(doc) {
    const scenes = doc.getRoot().listScenes().map((scene) => {
        const root = scene.listChildren()[0];
        const sceneBounds = getBounds(scene);
        return {
            name: scene.getName(),
            rootName: root ? root.getName() : "",
            bboxMin: toPrecision(sceneBounds.min),
            bboxMax: toPrecision(sceneBounds.max),
            renderVertexCount: getSceneVertexCount(scene, VertexCountMethod.RENDER),
            uploadVertexCount: getSceneVertexCount(scene, VertexCountMethod.UPLOAD),
            uploadNaiveVertexCount: getSceneVertexCount(scene, VertexCountMethod.UPLOAD_NAIVE)
        };
    });
    return {
        properties: scenes
    };
}
function listMeshes(doc) {
    const meshes = doc.getRoot().listMeshes().map((mesh) => {
        const instances = mesh.listParents().filter((parent) => parent.propertyType !== PropertyType.ROOT).length;
        let glPrimitives = 0;
        const semantics = new Set();
        const meshIndices = new Set();
        const meshAccessors = new Set();
        mesh.listPrimitives().forEach((prim) => {
            for (const semantic of prim.listSemantics()) {
                const attr = prim.getAttribute(semantic);
                semantics.add(semantic + ":" + accessorToTypeLabel(attr));
                meshAccessors.add(attr);
            }
            for (const targ of prim.listTargets()) {
                targ.listAttributes().forEach((attr) => meshAccessors.add(attr));
            }
            const indices = prim.getIndices();
            if (indices) {
                meshIndices.add(accessorToTypeLabel(indices));
                meshAccessors.add(indices);
            }
            glPrimitives += getGLPrimitiveCount(prim);
        });
        let size = 0;
        Array.from(meshAccessors).forEach((a2) => size += a2.getArray().byteLength);
        const modes = mesh.listPrimitives().map((prim) => MeshPrimitiveModeLabels[prim.getMode()]);
        return {
            name: mesh.getName(),
            mode: Array.from(new Set(modes)),
            meshPrimitives: mesh.listPrimitives().length,
            glPrimitives,
            vertices: getMeshVertexCount(mesh, VertexCountMethod.UPLOAD),
            indices: Array.from(meshIndices).sort(),
            attributes: Array.from(semantics).sort(),
            instances,
            size
        };
    });
    return {
        properties: meshes
    };
}
function listMaterials(doc) {
    const materials = doc.getRoot().listMaterials().map((material) => {
        const instances = material.listParents().filter((parent) => parent.propertyType !== PropertyType.ROOT).length;
        const extensions = new Set(material.listExtensions());
        const slots = doc.getGraph().listEdges().filter((ref) => {
            const child = ref.getChild();
            const parent = ref.getParent();
            if (child instanceof Texture && parent === material) {
                return true;
            }
            if (child instanceof Texture && parent instanceof ExtensionProperty && extensions.has(parent)) {
                return true;
            }
            return false;
        }).map((ref) => ref.getName());
        return {
            name: material.getName(),
            instances,
            textures: slots,
            alphaMode: material.getAlphaMode(),
            doubleSided: material.getDoubleSided()
        };
    });
    return {
        properties: materials
    };
}
function listTextures(doc) {
    const textures = doc.getRoot().listTextures().map((texture) => {
        const instances = texture.listParents().filter((parent) => parent.propertyType !== PropertyType.ROOT).length;
        const slots = doc.getGraph().listParentEdges(texture).filter((edge) => edge.getParent().propertyType !== PropertyType.ROOT).map((edge) => edge.getName());
        const resolution = ImageUtils.getSize(texture.getImage(), texture.getMimeType());
        let compression = "";
        if (texture.getMimeType() === "image/ktx2") {
            const container = read(texture.getImage());
            const dfd = container.dataFormatDescriptor[0];
            if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
                compression = "ETC1S";
            }
            else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
                compression = "UASTC";
            }
        }
        return {
            name: texture.getName(),
            uri: texture.getURI(),
            slots: Array.from(new Set(slots)),
            instances,
            mimeType: texture.getMimeType(),
            compression,
            resolution: resolution ? resolution.join("x") : "",
            size: texture.getImage().byteLength,
            gpuSize: ImageUtils.getVRAMByteLength(texture.getImage(), texture.getMimeType())
        };
    });
    return {
        properties: textures
    };
}
function listAnimations(doc) {
    const animations = doc.getRoot().listAnimations().map((anim) => {
        let minTime = Infinity;
        let maxTime = -Infinity;
        anim.listSamplers().forEach((sampler) => {
            const input = sampler.getInput();
            if (!input)
                return;
            minTime = Math.min(minTime, input.getMin([])[0]);
            maxTime = Math.max(maxTime, input.getMax([])[0]);
        });
        let size = 0;
        let keyframes = 0;
        const accessors = new Set();
        anim.listSamplers().forEach((sampler) => {
            const input = sampler.getInput();
            const output = sampler.getOutput();
            if (!input)
                return;
            keyframes += input.getCount();
            accessors.add(input);
            if (!output)
                return;
            accessors.add(output);
        });
        Array.from(accessors).forEach((accessor) => {
            size += accessor.getArray().byteLength;
        });
        return {
            name: anim.getName(),
            channels: anim.listChannels().length,
            samplers: anim.listSamplers().length,
            duration: Math.round((maxTime - minTime) * 1e3) / 1e3,
            keyframes,
            size
        };
    });
    return {
        properties: animations
    };
}
var MeshPrimitiveModeLabels = ["POINTS", "LINES", "LINE_LOOP", "LINE_STRIP", "TRIANGLES", "TRIANGLE_STRIP", "TRIANGLE_FAN"];
var NumericTypeLabels = {
    Float32Array: "f32",
    Uint32Array: "u32",
    Uint16Array: "u16",
    Uint8Array: "u8",
    Int32Array: "i32",
    Int16Array: "i16",
    Int8Array: "i8"
};
function toPrecision(v) {
    for (let i = 0; i < v.length; i++) {
        if (v[i].toFixed)
            v[i] = Number(v[i].toFixed(5));
    }
    return v;
}
function accessorToTypeLabel(accessor) {
    const array = accessor.getArray();
    const base = NumericTypeLabels[array.constructor.name] || "?";
    const suffix = accessor.getNormalized() ? "_norm" : "";
    return base + suffix;
}
var NAME$i2 = "instance";
var INSTANCE_DEFAULTS = {
    min: 5
};
function instance(_options = INSTANCE_DEFAULTS) {
    const options = assignDefaults(INSTANCE_DEFAULTS, _options);
    return createTransform(NAME$i2, (doc) => {
        const logger = doc.getLogger();
        const root = doc.getRoot();
        if (root.listAnimations().length) {
            logger.warn(`${NAME$i2}: Instancing is not currently supported for animated models.`);
            logger.debug(`${NAME$i2}: Complete.`);
            return;
        }
        const batchExtension = doc.createExtension(EXTMeshGPUInstancing);
        let numBatches = 0;
        let numInstances = 0;
        for (const scene of root.listScenes()) {
            const meshInstances = new Map();
            scene.traverse((node) => {
                const mesh = node.getMesh();
                if (!mesh)
                    return;
                if (node.getExtension("EXT_mesh_gpu_instancing"))
                    return;
                meshInstances.set(mesh, (meshInstances.get(mesh) || new Set()).add(node));
            });
            const modifiedNodes = [];
            for (const mesh of Array.from(meshInstances.keys())) {
                const nodes = Array.from(meshInstances.get(mesh));
                if (nodes.length < options.min)
                    continue;
                if (nodes.some((node) => node.getSkin()))
                    continue;
                if (mesh.listPrimitives().some(hasVolume) && nodes.some(hasScale))
                    continue;
                const batch = createBatch(doc, batchExtension, mesh, nodes.length);
                const batchTranslation = batch.getAttribute("TRANSLATION");
                const batchRotation = batch.getAttribute("ROTATION");
                const batchScale = batch.getAttribute("SCALE");
                const batchNode = doc.createNode().setMesh(mesh).setExtension("EXT_mesh_gpu_instancing", batch);
                scene.addChild(batchNode);
                let needsTranslation = false;
                let needsRotation = false;
                let needsScale = false;
                for (let i = 0; i < nodes.length; i++) {
                    let t2, r2, s2;
                    const node = nodes[i];
                    batchTranslation.setElement(i, t2 = node.getWorldTranslation());
                    batchRotation.setElement(i, r2 = node.getWorldRotation());
                    batchScale.setElement(i, s2 = node.getWorldScale());
                    if (!MathUtils.eq(t2, [0, 0, 0]))
                        needsTranslation = true;
                    if (!MathUtils.eq(r2, [0, 0, 0, 1]))
                        needsRotation = true;
                    if (!MathUtils.eq(s2, [1, 1, 1]))
                        needsScale = true;
                }
                if (!needsTranslation)
                    batchTranslation.dispose();
                if (!needsRotation)
                    batchRotation.dispose();
                if (!needsScale)
                    batchScale.dispose();
                if (!needsTranslation && !needsRotation && !needsScale) {
                    batchNode.dispose();
                    batch.dispose();
                    continue;
                }
                for (const node of nodes) {
                    node.setMesh(null);
                    modifiedNodes.push(node);
                }
                numBatches++;
                numInstances += nodes.length;
            }
            pruneUnusedNodes(modifiedNodes, logger);
        }
        if (numBatches > 0) {
            logger.info(`${NAME$i2}: Created ${numBatches} batches, with ${numInstances} total instances.`);
        }
        else {
            logger.info(`${NAME$i2}: No meshes with >=${options.min} parent nodes were found.`);
        }
        if (batchExtension.listProperties().length === 0) {
            batchExtension.dispose();
        }
        logger.debug(`${NAME$i2}: Complete.`);
    });
}
function pruneUnusedNodes(nodes, logger) {
    let node;
    let unusedNodes = 0;
    while (node = nodes.pop()) {
        if (node.listChildren().length || node.getCamera() || node.getMesh() || node.getSkin() || node.listExtensions().length) {
            continue;
        }
        const nodeParent = node.getParentNode();
        if (nodeParent)
            nodes.push(nodeParent);
        node.dispose();
        unusedNodes++;
    }
    logger.debug(`${NAME$i2}: Removed ${unusedNodes} unused nodes.`);
}
function hasVolume(prim) {
    const material = prim.getMaterial();
    return !!(material && material.getExtension("KHR_materials_volume"));
}
function hasScale(node) {
    const scale2 = node.getWorldScale();
    return !MathUtils.eq(scale2, [1, 1, 1]);
}
function createBatch(doc, batchExtension, mesh, count) {
    const buffer = mesh.listPrimitives()[0].getAttribute("POSITION").getBuffer();
    const batchTranslation = doc.createAccessor().setType("VEC3").setArray(new Float32Array(3 * count)).setBuffer(buffer);
    const batchRotation = doc.createAccessor().setType("VEC4").setArray(new Float32Array(4 * count)).setBuffer(buffer);
    const batchScale = doc.createAccessor().setType("VEC3").setArray(new Float32Array(3 * count)).setBuffer(buffer);
    return batchExtension.createInstancedMesh().setAttribute("TRANSLATION", batchTranslation).setAttribute("ROTATION", batchRotation).setAttribute("SCALE", batchScale);
}
var JOIN_PRIMITIVE_DEFAULTS = {
    skipValidation: false
};
var EMPTY_U32 = 2 ** 32 - 1;
var { LINE_STRIP: LINE_STRIP$1, LINE_LOOP: LINE_LOOP$1, TRIANGLE_STRIP: TRIANGLE_STRIP$1, TRIANGLE_FAN: TRIANGLE_FAN$1 } = Primitive.Mode;
function joinPrimitives(prims, _options = {}) {
    const options = assignDefaults(JOIN_PRIMITIVE_DEFAULTS, _options);
    const templatePrim = prims[0];
    const document = Document.fromGraph(templatePrim.getGraph());
    if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
        throw new Error("Requires >=2 Primitives, sharing the same Material and Mode, with compatible vertex attributes and indices.");
    }
    for (const prim of prims) {
        switch (prim.getMode()) {
            case LINE_STRIP$1:
            case LINE_LOOP$1:
                convertPrimitiveToLines(prim);
                break;
            case TRIANGLE_STRIP$1:
            case TRIANGLE_FAN$1:
                convertPrimitiveToTriangles(prim);
                break;
        }
    }
    const primRemaps = [];
    const primVertexCounts = new Uint32Array(prims.length);
    let dstVertexCount = 0;
    let dstIndicesCount = 0;
    for (let primIndex = 0; primIndex < prims.length; primIndex++) {
        const srcPrim = prims[primIndex];
        const srcIndices = srcPrim.getIndices();
        const srcVertexCount = srcPrim.getAttribute("POSITION").getCount();
        const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
        const srcIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount;
        const remap2 = new Uint32Array(srcVertexCount).fill(EMPTY_U32);
        for (let i = 0; i < srcIndicesCount; i++) {
            const index = srcIndicesArray ? srcIndicesArray[i] : i;
            if (remap2[index] === EMPTY_U32) {
                remap2[index] = dstVertexCount++;
                primVertexCounts[primIndex]++;
            }
        }
        primRemaps.push(remap2);
        dstIndicesCount += srcIndicesCount;
    }
    const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
    for (const semantic of templatePrim.listSemantics()) {
        const tplAttribute = templatePrim.getAttribute(semantic);
        const AttributeArray = ComponentTypeToTypedArray[tplAttribute.getComponentType()];
        const dstAttribute = shallowCloneAccessor(document, tplAttribute).setArray(new AttributeArray(dstVertexCount * tplAttribute.getElementSize()));
        dstPrim.setAttribute(semantic, dstAttribute);
    }
    const tplIndices = templatePrim.getIndices();
    const dstIndices = tplIndices ? shallowCloneAccessor(document, tplIndices).setArray(createIndicesEmpty(dstIndicesCount, dstVertexCount)) : null;
    dstPrim.setIndices(dstIndices);
    let dstIndicesOffset = 0;
    for (let primIndex = 0; primIndex < primRemaps.length; primIndex++) {
        const srcPrim = prims[primIndex];
        const srcIndices = srcPrim.getIndices();
        const srcIndicesCount = srcIndices ? srcIndices.getCount() : -1;
        const remap2 = primRemaps[primIndex];
        if (srcIndices && dstIndices) {
            remapIndices(srcIndices, remap2, dstIndices, dstIndicesOffset);
            dstIndicesOffset += srcIndicesCount;
        }
        for (const semantic of dstPrim.listSemantics()) {
            const srcAttribute = srcPrim.getAttribute(semantic);
            const dstAttribute = dstPrim.getAttribute(semantic);
            remapAttribute(srcAttribute, srcIndices, remap2, dstAttribute);
        }
    }
    return dstPrim;
}
function remapAttribute(srcAttribute, srcIndices, remap2, dstAttribute) {
    const elementSize = srcAttribute.getElementSize();
    const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
    const srcVertexCount = srcAttribute.getCount();
    const srcArray = srcAttribute.getArray();
    const dstArray = dstAttribute.getArray();
    const done = new Uint8Array(srcAttribute.getCount());
    for (let i = 0, il = srcIndices ? srcIndices.getCount() : srcVertexCount; i < il; i++) {
        const srcIndex = srcIndicesArray ? srcIndicesArray[i] : i;
        const dstIndex = remap2[srcIndex];
        if (done[dstIndex])
            continue;
        for (let j = 0; j < elementSize; j++) {
            dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
        }
        done[dstIndex] = 1;
    }
}
function remapIndices(srcIndices, remap2, dstIndices, dstOffset) {
    const srcCount = srcIndices.getCount();
    const srcArray = srcIndices.getArray();
    const dstArray = dstIndices.getArray();
    for (let i = 0; i < srcCount; i++) {
        const srcIndex = srcArray[i];
        const dstIndex = remap2[srcIndex];
        dstArray[dstOffset + i] = dstIndex;
    }
}
var NAME$h2 = "join";
var { ROOT, NODE, MESH, PRIMITIVE, ACCESSOR } = PropertyType;
var _matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var JOIN_DEFAULTS = {
    keepMeshes: false,
    keepNamed: false,
    cleanup: true
};
function join(_options = JOIN_DEFAULTS) {
    const options = assignDefaults(JOIN_DEFAULTS, _options);
    return createTransform(NAME$h2, async (document) => {
        const root = document.getRoot();
        const logger = document.getLogger();
        for (const scene of root.listScenes()) {
            _joinLevel(document, scene, options);
            scene.traverse((node) => _joinLevel(document, node, options));
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [NODE, MESH, PRIMITIVE, ACCESSOR],
                keepAttributes: true,
                keepIndices: true,
                keepLeaves: false
            }));
        }
        logger.debug(`${NAME$h2}: Complete.`);
    });
}
function _joinLevel(document, parent, options) {
    const logger = document.getLogger();
    const groups = {};
    const children = parent.listChildren();
    for (let nodeIndex = 0; nodeIndex < children.length; nodeIndex++) {
        const node = children[nodeIndex];
        const isAnimated = node.listParents().some((p) => p instanceof AnimationChannel);
        if (isAnimated)
            continue;
        const mesh = node.getMesh();
        if (!mesh)
            continue;
        if (node.getExtension("EXT_mesh_gpu_instancing"))
            continue;
        if (node.getSkin())
            continue;
        for (const prim of mesh.listPrimitives()) {
            if (prim.listTargets().length > 0)
                continue;
            const material = prim.getMaterial();
            if (material && material.getExtension("KHR_materials_volume"))
                continue;
            compactPrimitive(prim);
            dequantizeTransformableAttributes(prim);
            let key = createPrimGroupKey(prim);
            const isNamed = mesh.getName() || node.getName();
            if (options.keepMeshes || options.keepNamed && isNamed) {
                key += `|${nodeIndex}`;
            }
            if (!(key in groups)) {
                groups[key] = {
                    prims: [],
                    primMeshes: [],
                    primNodes: [],
                    dstNode: node,
                    dstMesh: void 0
                };
            }
            const group = groups[key];
            group.prims.push(prim);
            group.primNodes.push(node);
        }
    }
    const joinGroups = Object.values(groups).filter(({ prims }) => prims.length > 1);
    const srcNodes = new Set(joinGroups.flatMap((group) => group.primNodes));
    for (const node of srcNodes) {
        const mesh = node.getMesh();
        const isSharedMesh = mesh.listParents().some((parent2) => {
            return parent2.propertyType !== ROOT && node !== parent2;
        });
        if (isSharedMesh) {
            node.setMesh(mesh.clone());
        }
    }
    for (const group of joinGroups) {
        const { dstNode, primNodes } = group;
        group.dstMesh = dstNode.getMesh();
        group.primMeshes = primNodes.map((node) => node.getMesh());
    }
    for (const group of joinGroups) {
        const { prims, primNodes, primMeshes, dstNode, dstMesh } = group;
        const dstMatrix = dstNode.getMatrix();
        for (let i = 0; i < prims.length; i++) {
            const primNode = primNodes[i];
            const primMesh = primMeshes[i];
            let prim = prims[i];
            primMesh.removePrimitive(prim);
            if (isUsed(prim)) {
                prim = prims[i] = _deepClonePrimitive(prims[i]);
            }
            if (primNode !== dstNode) {
                multiply$2(_matrix, invert$1(_matrix, dstMatrix), primNode.getMatrix());
                transformPrimitive(prim, _matrix);
            }
        }
        const dstPrim = joinPrimitives(prims);
        const dstVertexCount = dstPrim.listAttributes()[0].getCount();
        dstMesh.addPrimitive(dstPrim);
        logger.debug(`${NAME$h2}: Joined Primitives (${prims.length}) containing ${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`);
    }
}
function _deepClonePrimitive(src) {
    const dst = src.clone();
    for (const semantic of dst.listSemantics()) {
        dst.setAttribute(semantic, dst.getAttribute(semantic).clone());
    }
    const indices = dst.getIndices();
    if (indices)
        dst.setIndices(indices.clone());
    return dst;
}
function dequantizeTransformableAttributes(prim) {
    for (const semantic of ["POSITION", "NORMAL", "TANGENT"]) {
        const attribute = prim.getAttribute(semantic);
        if (attribute)
            dequantizeAttribute(attribute);
    }
}
function listTextureChannels(texture) {
    const mask = getTextureChannelMask(texture);
    const channels = [];
    if (mask & TextureChannel.R)
        channels.push(TextureChannel.R);
    if (mask & TextureChannel.G)
        channels.push(TextureChannel.G);
    if (mask & TextureChannel.B)
        channels.push(TextureChannel.B);
    if (mask & TextureChannel.A)
        channels.push(TextureChannel.A);
    return channels;
}
function getTextureChannelMask(texture) {
    const document = Document.fromGraph(texture.getGraph());
    let mask = 0;
    for (const edge of document.getGraph().listParentEdges(texture)) {
        const parent = edge.getParent();
        let { channels } = edge.getAttributes();
        if (channels && edge.getName() === "baseColorTexture" && parent instanceof Material && parent.getAlphaMode() === Material.AlphaMode.OPAQUE) {
            channels &= ~TextureChannel.A;
        }
        if (channels) {
            mask |= channels;
            continue;
        }
        if (parent.propertyType !== PropertyType.ROOT) {
            document.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
        }
    }
    return mask;
}
var NAME$g2 = "reorder";
var REORDER_DEFAULTS = {
    target: "size",
    cleanup: true
};
function reorder(_options) {
    const options = assignDefaults(REORDER_DEFAULTS, _options);
    const encoder = options.encoder;
    if (!encoder) {
        throw new Error(`${NAME$g2}: encoder dependency required \u2014 install "meshoptimizer".`);
    }
    return createTransform(NAME$g2, async (document) => {
        const logger = document.getLogger();
        await encoder.ready;
        const plan = createLayoutPlan(document);
        for (const srcIndices of plan.indicesToAttributes.keys()) {
            let indicesArray = srcIndices.getArray();
            if (!(indicesArray instanceof Uint32Array)) {
                indicesArray = new Uint32Array(indicesArray);
            }
            else {
                indicesArray = indicesArray.slice();
            }
            const [remap2, unique] = encoder.reorderMesh(indicesArray, plan.indicesToMode.get(srcIndices) === Primitive.Mode.TRIANGLES, options.target === "size");
            const dstIndices = shallowCloneAccessor(document, srcIndices);
            dstIndices.setArray(unique <= 65534 ? new Uint16Array(indicesArray) : indicesArray);
            for (const srcAttribute of plan.indicesToAttributes.get(srcIndices)) {
                const dstAttribute = shallowCloneAccessor(document, srcAttribute);
                compactAttribute(srcAttribute, srcIndices, remap2, dstAttribute, unique);
                for (const prim of plan.indicesToPrimitives.get(srcIndices)) {
                    if (prim.getIndices() === srcIndices) {
                        prim.swap(srcIndices, dstIndices);
                    }
                    prim.swap(srcAttribute, dstAttribute);
                    for (const target of prim.listTargets()) {
                        target.swap(srcAttribute, dstAttribute);
                    }
                }
            }
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [PropertyType.ACCESSOR],
                keepAttributes: true,
                keepIndices: true
            }));
        }
        if (!plan.indicesToAttributes.size) {
            logger.warn(`${NAME$g2}: No qualifying primitives found; may need to weld first.`);
        }
        else {
            logger.debug(`${NAME$g2}: Complete.`);
        }
    });
}
function createLayoutPlan(document) {
    const indicesToMode = new Map();
    const indicesToPrimitives = new SetMap();
    const indicesToAttributes = new SetMap();
    const attributesToPrimitives = new SetMap();
    for (const mesh of document.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const indices = prim.getIndices();
            if (!indices)
                continue;
            indicesToMode.set(indices, prim.getMode());
            indicesToPrimitives.add(indices, prim);
            for (const attribute of deepListAttributes(prim)) {
                indicesToAttributes.add(indices, attribute);
                attributesToPrimitives.add(attribute, prim);
            }
        }
    }
    return {
        indicesToPrimitives,
        indicesToAttributes,
        indicesToMode,
        attributesToPrimitives
    };
}
function sortPrimitiveWeights(prim, limit = Infinity) {
    if (Number.isFinite(limit) && limit % 4 || limit <= 0) {
        throw new Error(`Limit must be positive multiple of four.`);
    }
    const vertexCount = prim.getAttribute("POSITION").getCount();
    const setCount = prim.listSemantics().filter((name) => name.startsWith("WEIGHTS_")).length;
    const indices = new Uint16Array(setCount * 4);
    const srcWeights = new Float32Array(setCount * 4);
    const dstWeights = new Float32Array(setCount * 4);
    const srcJoints = new Uint32Array(setCount * 4);
    const dstJoints = new Uint32Array(setCount * 4);
    for (let i = 0; i < vertexCount; i++) {
        getVertexArray(prim, i, "WEIGHTS", srcWeights);
        getVertexArray(prim, i, "JOINTS", srcJoints);
        for (let j = 0; j < setCount * 4; j++)
            indices[j] = j;
        indices.sort((a2, b) => srcWeights[a2] > srcWeights[b] ? -1 : 1);
        for (let j = 0; j < indices.length; j++) {
            dstWeights[j] = srcWeights[indices[j]];
            dstJoints[j] = srcJoints[indices[j]];
        }
        setVertexArray(prim, i, "WEIGHTS", dstWeights);
        setVertexArray(prim, i, "JOINTS", dstJoints);
    }
    for (let i = setCount; i * 4 > limit; i--) {
        const weights = prim.getAttribute(`WEIGHTS_${i - 1}`);
        const joints = prim.getAttribute(`JOINTS_${i - 1}`);
        prim.setAttribute(`WEIGHTS_${i - 1}`, null);
        prim.setAttribute(`JOINTS_${i - 1}`, null);
        if (weights.listParents().length === 1)
            weights.dispose();
        if (joints.listParents().length === 1)
            joints.dispose();
    }
    normalizePrimitiveWeights(prim);
}
function normalizePrimitiveWeights(prim) {
    if (!isNormalizeSafe(prim))
        return;
    const vertexCount = prim.getAttribute("POSITION").getCount();
    const setCount = prim.listSemantics().filter((name) => name.startsWith("WEIGHTS_")).length;
    const templateAttribute = prim.getAttribute("WEIGHTS_0");
    const templateArray = templateAttribute.getArray();
    const componentType = templateAttribute.getComponentType();
    const normalized = templateAttribute.getNormalized();
    const normalizedComponentType = normalized ? componentType : void 0;
    const delta = normalized ? MathUtils.decodeNormalizedInt(1, componentType) : Number.EPSILON;
    const joints = new Uint32Array(setCount * 4).fill(0);
    const weights = templateArray.slice(0, setCount * 4).fill(0);
    for (let i = 0; i < vertexCount; i++) {
        getVertexArray(prim, i, "JOINTS", joints);
        getVertexArray(prim, i, "WEIGHTS", weights, normalizedComponentType);
        let weightsSum = sum(weights, normalizedComponentType);
        if (weightsSum !== 0 && weightsSum !== 1) {
            if (Math.abs(1 - weightsSum) > delta) {
                for (let j = 0; j < weights.length; j++) {
                    if (normalized) {
                        const floatValue = MathUtils.decodeNormalizedInt(weights[j], componentType);
                        weights[j] = MathUtils.encodeNormalizedInt(floatValue / weightsSum, componentType);
                    }
                    else {
                        weights[j] /= weightsSum;
                    }
                }
            }
            weightsSum = sum(weights, normalizedComponentType);
            if (normalized && weightsSum !== 1) {
                for (let j = weights.length - 1; j >= 0; j--) {
                    if (weights[j] > 0) {
                        const _delta = 1 - weightsSum;
                        weights[j] += Math.sign(_delta) * MathUtils.encodeNormalizedInt(Math.abs(_delta), componentType);
                        break;
                    }
                }
            }
        }
        for (let j = weights.length - 1; j >= 0; j--) {
            if (weights[j] === 0) {
                joints[j] = 0;
            }
        }
        setVertexArray(prim, i, "JOINTS", joints);
        setVertexArray(prim, i, "WEIGHTS", weights, normalizedComponentType);
    }
}
function getVertexArray(prim, vertexIndex, prefix, target, normalizedComponentType) {
    let weights;
    const el = [0, 0, 0, 0];
    for (let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++) {
        weights.getElement(vertexIndex, el);
        for (let j = 0; j < 4; j++) {
            if (normalizedComponentType) {
                target[i * 4 + j] = MathUtils.encodeNormalizedInt(el[j], normalizedComponentType);
            }
            else {
                target[i * 4 + j] = el[j];
            }
        }
    }
    return target;
}
function setVertexArray(prim, vertexIndex, prefix, values, normalizedComponentType) {
    let weights;
    const el = [0, 0, 0, 0];
    for (let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++) {
        for (let j = 0; j < 4; j++) {
            if (normalizedComponentType) {
                el[j] = MathUtils.decodeNormalizedInt(values[i * 4 + j], normalizedComponentType);
            }
            else {
                el[j] = values[i * 4 + j];
            }
        }
        weights.setElement(vertexIndex, el);
    }
}
function sum(values, normalizedComponentType) {
    let sum2 = 0;
    for (let i = 0; i < values.length; i++) {
        if (normalizedComponentType) {
            sum2 += MathUtils.decodeNormalizedInt(values[i], normalizedComponentType);
        }
        else {
            sum2 += values[i];
        }
    }
    return sum2;
}
function isNormalizeSafe(prim) {
    const attributes = prim.listSemantics().filter((name) => name.startsWith("WEIGHTS_")).map((name) => prim.getAttribute(name));
    const normList = attributes.map((a2) => a2.getNormalized());
    const typeList = attributes.map((a2) => a2.getComponentType());
    return new Set(normList).size === 1 && new Set(typeList).size === 1;
}
var NAME$f2 = "quantize";
var SIGNED_INT = [Int8Array, Int16Array, Int32Array];
var { TRANSLATION, ROTATION, SCALE, WEIGHTS } = AnimationChannel.TargetPath;
var TRS_CHANNELS = [TRANSLATION, ROTATION, SCALE];
var QUANTIZE_DEFAULTS = {
    pattern: /.*/,
    quantizationVolume: "mesh",
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizeColor: 8,
    quantizeWeight: 8,
    quantizeGeneric: 12,
    normalizeWeights: true,
    cleanup: true
};
function quantize(_options = QUANTIZE_DEFAULTS) {
    const options = assignDefaults(QUANTIZE_DEFAULTS, _extends4({
        patternTargets: _options.pattern || QUANTIZE_DEFAULTS.pattern
    }, _options));
    return createTransform(NAME$f2, async (document) => {
        const logger = document.getLogger();
        const root = document.getRoot();
        let nodeTransform = void 0;
        if (options.quantizationVolume === "scene") {
            nodeTransform = getNodeTransform(expandBounds2(root.listMeshes().map(getPositionQuantizationVolume)));
        }
        for (const mesh of document.getRoot().listMeshes()) {
            if (options.quantizationVolume === "mesh") {
                nodeTransform = getNodeTransform(getPositionQuantizationVolume(mesh));
            }
            if (nodeTransform && options.pattern.test("POSITION")) {
                transformMeshParents(document, mesh, nodeTransform);
                transformMeshMaterials(mesh, 1 / nodeTransform.scale);
            }
            for (const prim of mesh.listPrimitives()) {
                const renderCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
                const uploadCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
                if (renderCount < uploadCount / 2) {
                    compactPrimitive(prim);
                }
                quantizePrimitive(document, prim, nodeTransform, options);
                for (const target of prim.listTargets()) {
                    quantizePrimitive(document, target, nodeTransform, options);
                }
            }
        }
        const needsExtension = root.listMeshes().flatMap((mesh) => mesh.listPrimitives()).some(isQuantizedPrimitive);
        if (needsExtension) {
            document.createExtension(KHRMeshQuantization).setRequired(true);
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [PropertyType.ACCESSOR, PropertyType.SKIN, PropertyType.MATERIAL],
                keepAttributes: true,
                keepIndices: true,
                keepLeaves: true,
                keepSolidTextures: true
            }), dedup({
                propertyTypes: [PropertyType.ACCESSOR, PropertyType.MATERIAL, PropertyType.SKIN],
                keepUniqueNames: true
            }));
        }
        logger.debug(`${NAME$f2}: Complete.`);
    });
}
function quantizePrimitive(document, prim, nodeTransform, options) {
    const isTarget = prim instanceof PrimitiveTarget;
    const logger = document.getLogger();
    for (const semantic of prim.listSemantics()) {
        if (!isTarget && !options.pattern.test(semantic))
            continue;
        if (isTarget && !options.patternTargets.test(semantic))
            continue;
        const srcAttribute = prim.getAttribute(semantic);
        const { bits, ctor } = getQuantizationSettings(semantic, srcAttribute, logger, options);
        if (!ctor)
            continue;
        if (bits < 8 || bits > 16)
            throw new Error(`${NAME$f2}: Requires bits = 8\u201316.`);
        if (srcAttribute.getComponentSize() <= bits / 8)
            continue;
        const dstAttribute = srcAttribute.clone();
        if (semantic === "POSITION") {
            const scale2 = nodeTransform.scale;
            const transform = [];
            prim instanceof Primitive ? invert$1(transform, fromTransform(nodeTransform)) : fromScaling(transform, [1 / scale2, 1 / scale2, 1 / scale2]);
            for (let i = 0, el = [0, 0, 0], il = dstAttribute.getCount(); i < il; i++) {
                dstAttribute.getElement(i, el);
                dstAttribute.setElement(i, transformMat42(el, el, transform));
            }
        }
        quantizeAttribute(dstAttribute, ctor, bits);
        prim.setAttribute(semantic, dstAttribute);
    }
    if (options.normalizeWeights && prim.getAttribute("WEIGHTS_0")) {
        sortPrimitiveWeights(prim, Infinity);
    }
    if (prim instanceof Primitive && prim.getIndices() && prim.listAttributes().length && prim.listAttributes()[0].getCount() < 65535) {
        const indices = prim.getIndices();
        indices.setArray(new Uint16Array(indices.getArray()));
    }
}
function getNodeTransform(volume) {
    const { min: min2, max: max2 } = volume;
    const scale2 = Math.max((max2[0] - min2[0]) / 2, (max2[1] - min2[1]) / 2, (max2[2] - min2[2]) / 2);
    const offset = [min2[0] + (max2[0] - min2[0]) / 2, min2[1] + (max2[1] - min2[1]) / 2, min2[2] + (max2[2] - min2[2]) / 2];
    return {
        offset,
        scale: scale2
    };
}
function transformMeshParents(document, mesh, nodeTransform) {
    const transformMatrix = fromTransform(nodeTransform);
    for (const parent of mesh.listParents()) {
        if (!(parent instanceof Node))
            continue;
        const animChannels = parent.listParents().filter((p) => p instanceof AnimationChannel);
        const isAnimated = animChannels.some((channel) => TRS_CHANNELS.includes(channel.getTargetPath()));
        const isParentNode = parent.listChildren().length > 0;
        const skin = parent.getSkin();
        if (skin) {
            parent.setSkin(transformSkin(skin, nodeTransform));
            continue;
        }
        const batch = parent.getExtension("EXT_mesh_gpu_instancing");
        if (batch) {
            parent.setExtension("EXT_mesh_gpu_instancing", transformBatch(document, batch, nodeTransform));
            continue;
        }
        let targetNode;
        if (isParentNode || isAnimated) {
            targetNode = document.createNode("").setMesh(mesh);
            parent.addChild(targetNode).setMesh(null);
            animChannels.filter((channel) => channel.getTargetPath() === WEIGHTS).forEach((channel) => channel.setTargetNode(targetNode));
        }
        else {
            targetNode = parent;
        }
        const nodeMatrix = targetNode.getMatrix();
        multiply$2(nodeMatrix, nodeMatrix, transformMatrix);
        targetNode.setMatrix(nodeMatrix);
    }
}
function transformSkin(skin, nodeTransform) {
    skin = skin.clone();
    const transformMatrix = fromTransform(nodeTransform);
    const inverseBindMatrices = skin.getInverseBindMatrices().clone();
    const ibm = [];
    for (let i = 0, count = inverseBindMatrices.getCount(); i < count; i++) {
        inverseBindMatrices.getElement(i, ibm);
        multiply$2(ibm, ibm, transformMatrix);
        inverseBindMatrices.setElement(i, ibm);
    }
    return skin.setInverseBindMatrices(inverseBindMatrices);
}
function transformBatch(document, batch, nodeTransform) {
    var _batch$getAttribute, _batch$getAttribute2, _batch$getAttribute3;
    if (!batch.getAttribute("TRANSLATION") && !batch.getAttribute("ROTATION") && !batch.getAttribute("SCALE")) {
        return batch;
    }
    batch = batch.clone();
    let instanceTranslation = (_batch$getAttribute = batch.getAttribute("TRANSLATION")) == null ? void 0 : _batch$getAttribute.clone();
    const instanceRotation = (_batch$getAttribute2 = batch.getAttribute("ROTATION")) == null ? void 0 : _batch$getAttribute2.clone();
    let instanceScale = (_batch$getAttribute3 = batch.getAttribute("SCALE")) == null ? void 0 : _batch$getAttribute3.clone();
    const tpl = instanceTranslation || instanceRotation || instanceScale;
    const T_IDENTITY = [0, 0, 0];
    const R_IDENTITY = [0, 0, 0, 1];
    const S_IDENTITY = [1, 1, 1];
    if (!instanceTranslation && nodeTransform.offset) {
        instanceTranslation = document.createAccessor().setType("VEC3").setArray(makeArray(tpl.getCount(), T_IDENTITY));
    }
    if (!instanceScale && nodeTransform.scale) {
        instanceScale = document.createAccessor().setType("VEC3").setArray(makeArray(tpl.getCount(), S_IDENTITY));
    }
    const t2 = [0, 0, 0];
    const r2 = [0, 0, 0, 1];
    const s2 = [1, 1, 1];
    const instanceMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const transformMatrix = fromTransform(nodeTransform);
    for (let i = 0, count = tpl.getCount(); i < count; i++) {
        MathUtils.compose(instanceTranslation ? instanceTranslation.getElement(i, t2) : T_IDENTITY, instanceRotation ? instanceRotation.getElement(i, r2) : R_IDENTITY, instanceScale ? instanceScale.getElement(i, s2) : S_IDENTITY, instanceMatrix);
        multiply$2(instanceMatrix, instanceMatrix, transformMatrix);
        MathUtils.decompose(instanceMatrix, t2, r2, s2);
        if (instanceTranslation)
            instanceTranslation.setElement(i, t2);
        if (instanceRotation)
            instanceRotation.setElement(i, r2);
        if (instanceScale)
            instanceScale.setElement(i, s2);
    }
    if (instanceTranslation)
        batch.setAttribute("TRANSLATION", instanceTranslation);
    if (instanceRotation)
        batch.setAttribute("ROTATION", instanceRotation);
    if (instanceScale)
        batch.setAttribute("SCALE", instanceScale);
    return batch;
}
function transformMeshMaterials(mesh, scale2) {
    for (const prim of mesh.listPrimitives()) {
        let material = prim.getMaterial();
        if (!material)
            continue;
        let volume = material.getExtension("KHR_materials_volume");
        if (!volume || volume.getThicknessFactor() <= 0)
            continue;
        volume = volume.clone().setThicknessFactor(volume.getThicknessFactor() * scale2);
        material = material.clone().setExtension("KHR_materials_volume", volume);
        prim.setMaterial(material);
    }
}
function quantizeAttribute(attribute, ctor, bits) {
    const dstArray = new ctor(attribute.getArray().length);
    const signBits = SIGNED_INT.includes(ctor) ? 1 : 0;
    const quantBits = bits - signBits;
    const storageBits = ctor.BYTES_PER_ELEMENT * 8 - signBits;
    const scale2 = Math.pow(2, quantBits) - 1;
    const lo = storageBits - quantBits;
    const hi = 2 * quantBits - storageBits;
    const range = [signBits > 0 ? -1 : 0, 1];
    for (let i = 0, di = 0, el = []; i < attribute.getCount(); i++) {
        attribute.getElement(i, el);
        for (let j = 0; j < el.length; j++) {
            let value = clamp(el[j], range);
            value = Math.round(Math.abs(value) * scale2);
            value = value << lo | value >> hi;
            dstArray[di++] = value * Math.sign(el[j]);
        }
    }
    attribute.setArray(dstArray).setNormalized(true).setSparse(false);
}
function getQuantizationSettings(semantic, attribute, logger, options) {
    const min2 = attribute.getMinNormalized([]);
    const max2 = attribute.getMaxNormalized([]);
    let bits;
    let ctor;
    if (semantic === "POSITION") {
        bits = options.quantizePosition;
        ctor = bits <= 8 ? Int8Array : Int16Array;
    }
    else if (semantic === "NORMAL" || semantic === "TANGENT") {
        bits = options.quantizeNormal;
        ctor = bits <= 8 ? Int8Array : Int16Array;
    }
    else if (semantic.startsWith("COLOR_")) {
        bits = options.quantizeColor;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    }
    else if (semantic.startsWith("TEXCOORD_")) {
        if (min2.some((v) => v < 0) || max2.some((v) => v > 1)) {
            logger.warn(`${NAME$f2}: Skipping ${semantic}; out of [0,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeTexcoord;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    }
    else if (semantic.startsWith("JOINTS_")) {
        bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
        if (attribute.getComponentSize() > bits / 8) {
            attribute.setArray(new ctor(attribute.getArray()));
        }
        return {
            bits: -1
        };
    }
    else if (semantic.startsWith("WEIGHTS_")) {
        if (min2.some((v) => v < 0) || max2.some((v) => v > 1)) {
            logger.warn(`${NAME$f2}: Skipping ${semantic}; out of [0,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeWeight;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    }
    else if (semantic.startsWith("_")) {
        if (min2.some((v) => v < -1) || max2.some((v) => v > 1)) {
            logger.warn(`${NAME$f2}: Skipping ${semantic}; out of [-1,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeGeneric;
        ctor = min2.some((v) => v < 0) ? ctor = bits <= 8 ? Int8Array : Int16Array : ctor = bits <= 8 ? Uint8Array : Uint16Array;
    }
    else {
        throw new Error(`${NAME$f2}: Unexpected semantic, "${semantic}".`);
    }
    return {
        bits,
        ctor
    };
}
function getPositionQuantizationVolume(mesh) {
    const positions = [];
    const relativePositions = [];
    for (const prim of mesh.listPrimitives()) {
        const attribute = prim.getAttribute("POSITION");
        if (attribute)
            positions.push(attribute);
        for (const target of prim.listTargets()) {
            const _attribute = target.getAttribute("POSITION");
            if (_attribute)
                relativePositions.push(_attribute);
        }
    }
    if (positions.length === 0) {
        throw new Error(`${NAME$f2}: Missing "POSITION" attribute.`);
    }
    const bbox = flatBounds(positions, 3);
    if (relativePositions.length > 0) {
        const { min: relMin, max: relMax } = flatBounds(relativePositions, 3);
        min(bbox.min, bbox.min, min(relMin, scale$1(relMin, relMin, 2), [0, 0, 0]));
        max(bbox.max, bbox.max, max(relMax, scale$1(relMax, relMax, 2), [0, 0, 0]));
    }
    return bbox;
}
function isQuantizedAttribute(semantic, attribute) {
    const componentSize = attribute.getComponentSize();
    if (semantic === "POSITION")
        return componentSize < 4;
    if (semantic === "NORMAL")
        return componentSize < 4;
    if (semantic === "TANGENT")
        return componentSize < 4;
    if (semantic.startsWith("TEXCOORD_")) {
        const componentType = attribute.getComponentType();
        const normalized = attribute.getNormalized();
        return componentSize < 4 && !(normalized && componentType === Accessor.ComponentType.UNSIGNED_BYTE) && !(normalized && componentType === Accessor.ComponentType.UNSIGNED_SHORT);
    }
    return false;
}
function isQuantizedPrimitive(prim) {
    for (const semantic of prim.listSemantics()) {
        const attribute = prim.getAttribute("POSITION");
        if (isQuantizedAttribute(semantic, attribute)) {
            return true;
        }
    }
    if (prim.propertyType === PropertyType.PRIMITIVE) {
        return prim.listTargets().some(isQuantizedPrimitive);
    }
    return false;
}
function flatBounds(accessors, elementSize) {
    const min2 = new Array(elementSize).fill(Infinity);
    const max2 = new Array(elementSize).fill(-Infinity);
    const tmpMin = [];
    const tmpMax = [];
    for (const accessor of accessors) {
        accessor.getMinNormalized(tmpMin);
        accessor.getMaxNormalized(tmpMax);
        for (let i = 0; i < elementSize; i++) {
            min2[i] = Math.min(min2[i], tmpMin[i]);
            max2[i] = Math.max(max2[i], tmpMax[i]);
        }
    }
    return {
        min: min2,
        max: max2
    };
}
function expandBounds2(bboxes) {
    const result = bboxes[0];
    for (const bbox of bboxes) {
        min(result.min, result.min, bbox.min);
        max(result.max, result.max, bbox.max);
    }
    return result;
}
function fromTransform(transform) {
    return fromRotationTranslationScale([], [0, 0, 0, 1], transform.offset, [transform.scale, transform.scale, transform.scale]);
}
function clamp(value, range) {
    return Math.min(Math.max(value, range[0]), range[1]);
}
function makeArray(elementCount, initialElement) {
    const elementSize = initialElement.length;
    const array = new Float32Array(elementCount * elementSize);
    for (let i = 0; i < elementCount; i++) {
        array.set(initialElement, i * elementSize);
    }
    return array;
}
var MESHOPT_DEFAULTS = _extends4({
    level: "high"
}, QUANTIZE_DEFAULTS);
var NAME$e2 = "meshopt";
function meshopt(_options) {
    const options = assignDefaults(MESHOPT_DEFAULTS, _options);
    const encoder = options.encoder;
    if (!encoder) {
        throw new Error(`${NAME$e2}: encoder dependency required \u2014 install "meshoptimizer".`);
    }
    return createTransform(NAME$e2, async (document) => {
        let pattern;
        let patternTargets;
        let quantizeNormal = options.quantizeNormal;
        if (document.getRoot().listAccessors().length === 0) {
            return;
        }
        if (options.level === "medium") {
            pattern = /.*/;
            patternTargets = /.*/;
        }
        else {
            pattern = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR)(_\d+)?$/;
            patternTargets = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|COLOR|NORMAL|TANGENT)(_\d+)?$/;
            quantizeNormal = Math.min(quantizeNormal, 8);
        }
        await document.transform(reorder({
            encoder,
            target: "size"
        }), quantize(_extends4({}, options, {
            pattern,
            patternTargets,
            quantizeNormal
        })));
        document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
            method: options.level === "medium" ? EXTMeshoptCompression.EncoderMethod.QUANTIZE : EXTMeshoptCompression.EncoderMethod.FILTER
        });
    });
}
var NAME$d2 = "metalRough";
var METALROUGH_DEFAULTS = {};
function metalRough(_options = METALROUGH_DEFAULTS) {
    return createTransform(NAME$d2, async (doc) => {
        const logger = doc.getLogger();
        const extensionsUsed = doc.getRoot().listExtensionsUsed().map((ext) => ext.extensionName);
        if (!extensionsUsed.includes("KHR_materials_pbrSpecularGlossiness")) {
            logger.warn(`${NAME$d2}: KHR_materials_pbrSpecularGlossiness not found on document.`);
            return;
        }
        const iorExtension = doc.createExtension(KHRMaterialsIOR);
        const specExtension = doc.createExtension(KHRMaterialsSpecular);
        const specGlossExtension = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
        const inputTextures = new Set();
        for (const material of doc.getRoot().listMaterials()) {
            const specGloss = material.getExtension("KHR_materials_pbrSpecularGlossiness");
            if (!specGloss)
                continue;
            const specular = specExtension.createSpecular().setSpecularFactor(1).setSpecularColorFactor(specGloss.getSpecularFactor());
            inputTextures.add(specGloss.getSpecularGlossinessTexture());
            inputTextures.add(material.getBaseColorTexture());
            inputTextures.add(material.getMetallicRoughnessTexture());
            material.setBaseColorFactor(specGloss.getDiffuseFactor()).setMetallicFactor(0).setRoughnessFactor(1).setExtension("KHR_materials_ior", iorExtension.createIOR().setIOR(1e3)).setExtension("KHR_materials_specular", specular);
            const diffuseTexture = specGloss.getDiffuseTexture();
            if (diffuseTexture) {
                material.setBaseColorTexture(diffuseTexture);
                material.getBaseColorTextureInfo().copy(specGloss.getDiffuseTextureInfo());
            }
            const sgTexture = specGloss.getSpecularGlossinessTexture();
            if (sgTexture) {
                const sgTextureInfo = specGloss.getSpecularGlossinessTextureInfo();
                const specularTexture = doc.createTexture();
                await rewriteTexture(sgTexture, specularTexture, (pixels, i, j) => {
                    pixels.set(i, j, 3, 255);
                });
                specular.setSpecularTexture(specularTexture);
                specular.setSpecularColorTexture(specularTexture);
                specular.getSpecularTextureInfo().copy(sgTextureInfo);
                specular.getSpecularColorTextureInfo().copy(sgTextureInfo);
                const glossinessFactor = specGloss.getGlossinessFactor();
                const metalRoughTexture = doc.createTexture();
                await rewriteTexture(sgTexture, metalRoughTexture, (pixels, i, j) => {
                    const roughness = 255 - Math.round(pixels.get(i, j, 3) * glossinessFactor);
                    pixels.set(i, j, 0, 0);
                    pixels.set(i, j, 1, roughness);
                    pixels.set(i, j, 2, 0);
                    pixels.set(i, j, 3, 255);
                });
                material.setMetallicRoughnessTexture(metalRoughTexture);
                material.getMetallicRoughnessTextureInfo().copy(sgTextureInfo);
            }
            else {
                specular.setSpecularColorFactor(specGloss.getSpecularFactor());
                material.setRoughnessFactor(1 - specGloss.getGlossinessFactor());
            }
            material.setExtension("KHR_materials_pbrSpecularGlossiness", null);
        }
        specGlossExtension.dispose();
        for (const tex of inputTextures) {
            if (tex && tex.listParents().length === 1)
                tex.dispose();
        }
        logger.debug(`${NAME$d2}: Complete.`);
    });
}
var NAME$c2 = "unweld";
var UNWELD_DEFAULTS = {};
function unweld(_options = UNWELD_DEFAULTS) {
    return createTransform(NAME$c2, (doc) => {
        const logger = doc.getLogger();
        const visited = new Map();
        for (const mesh of doc.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                unweldPrimitive(prim, visited);
            }
        }
        logger.debug(`${NAME$c2}: Complete.`);
    });
}
function unweldPrimitive(prim, visited = new Map()) {
    const indices = prim.getIndices();
    if (!indices)
        return;
    const graph = prim.getGraph();
    const document = Document.fromGraph(graph);
    const logger = document.getLogger();
    const srcVertexCount = prim.getAttribute("POSITION").getCount();
    for (const srcAttribute of prim.listAttributes()) {
        prim.swap(srcAttribute, unweldAttribute(document, srcAttribute, indices, visited));
        if (srcAttribute.listParents().length === 1)
            srcAttribute.dispose();
    }
    for (const target of prim.listTargets()) {
        for (const srcAttribute of target.listAttributes()) {
            target.swap(srcAttribute, unweldAttribute(document, srcAttribute, indices, visited));
            if (srcAttribute.listParents().length === 1)
                srcAttribute.dispose();
        }
    }
    const dstVertexCount = prim.getAttribute("POSITION").getCount();
    logger.debug(`${NAME$c2}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
    prim.setIndices(null);
    if (indices.listParents().length === 1)
        indices.dispose();
}
function unweldAttribute(document, srcAttribute, indices, visited) {
    if (visited.has(srcAttribute) && visited.get(srcAttribute).has(indices)) {
        return visited.get(srcAttribute).get(indices);
    }
    const srcArray = srcAttribute.getArray();
    const TypedArray = srcArray.constructor;
    const dstArray = new TypedArray(indices.getCount() * srcAttribute.getElementSize());
    const indicesArray = indices.getArray();
    const elementSize = srcAttribute.getElementSize();
    for (let i = 0, il = indices.getCount(); i < il; i++) {
        for (let j = 0; j < elementSize; j++) {
            dstArray[i * elementSize + j] = srcArray[indicesArray[i] * elementSize + j];
        }
    }
    if (!visited.has(srcAttribute))
        visited.set(srcAttribute, new Map());
    const dstAttribute = shallowCloneAccessor(document, srcAttribute).setArray(dstArray);
    visited.get(srcAttribute).set(indices, dstAttribute);
    return dstAttribute;
}
var NAME$b2 = "normals";
var NORMALS_DEFAULTS = {
    overwrite: false
};
function normals(_options = NORMALS_DEFAULTS) {
    const options = assignDefaults(NORMALS_DEFAULTS, _options);
    return createTransform(NAME$b2, async (document) => {
        const logger = document.getLogger();
        let modified = 0;
        await document.transform(unweld());
        for (const mesh of document.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                const position = prim.getAttribute("POSITION");
                let normal = prim.getAttribute("NORMAL");
                if (options.overwrite && normal) {
                    normal.dispose();
                }
                else if (normal) {
                    logger.debug(`${NAME$b2}: Skipping primitive: NORMAL found.`);
                    continue;
                }
                normal = document.createAccessor().setArray(new Float32Array(position.getCount() * 3)).setType("VEC3");
                const a2 = [0, 0, 0];
                const b = [0, 0, 0];
                const c2 = [0, 0, 0];
                for (let i = 0; i < position.getCount(); i += 3) {
                    position.getElement(i + 0, a2);
                    position.getElement(i + 1, b);
                    position.getElement(i + 2, c2);
                    const faceNormal = computeNormal(a2, b, c2);
                    normal.setElement(i + 0, faceNormal);
                    normal.setElement(i + 1, faceNormal);
                    normal.setElement(i + 2, faceNormal);
                }
                prim.setAttribute("NORMAL", normal);
                modified++;
            }
        }
        if (!modified) {
            logger.warn(`${NAME$b2}: No qualifying primitives found. See debug output.`);
        }
        else {
            logger.debug(`${NAME$b2}: Complete.`);
        }
    });
}
function computeNormal(a2, b, c2) {
    const A3 = [b[0] - a2[0], b[1] - a2[1], b[2] - a2[2]];
    const B3 = [c2[0] - a2[0], c2[1] - a2[1], c2[2] - a2[2]];
    const n2 = [
        A3[1] * B3[2] - A3[2] * B3[1],
        A3[2] * B3[0] - A3[0] * B3[2],
        A3[0] * B3[1] - A3[1] * B3[0]
    ];
    return normalize([0, 0, 0], n2);
}
var NAME$a2 = "palette";
var PALETTE_DEFAULTS = {
    blockSize: 4,
    min: 5,
    keepAttributes: false,
    cleanup: true
};
function palette(_options = PALETTE_DEFAULTS) {
    const options = assignDefaults(PALETTE_DEFAULTS, _options);
    const blockSize = Math.max(options.blockSize, 1);
    const min2 = Math.max(options.min, 1);
    return createTransform(NAME$a2, async (document) => {
        const logger = document.getLogger();
        const root = document.getRoot();
        if (!options.keepAttributes) {
            await document.transform(prune({
                propertyTypes: [PropertyType.ACCESSOR],
                keepAttributes: false,
                keepIndices: true,
                keepLeaves: true
            }));
        }
        const prims = new Set();
        const materials = new Set();
        for (const mesh of root.listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                const material = prim.getMaterial();
                if (!material || !!prim.getAttribute("TEXCOORD_0"))
                    continue;
                prims.add(prim);
                materials.add(material);
            }
        }
        const materialKeys = new Set();
        const materialKeyMap = new Map();
        const materialProps = {
            baseColor: new Set(),
            emissive: new Set(),
            metallicRoughness: new Set()
        };
        for (const material of materials) {
            const baseColor = encodeRGBA(material.getBaseColorFactor().slice());
            const emissive = encodeRGBA([...material.getEmissiveFactor(), 1]);
            const roughness = encodeFloat(material.getRoughnessFactor());
            const metallic = encodeFloat(material.getMetallicFactor());
            const key = `baseColor:${baseColor},emissive:${emissive},metallicRoughness:${metallic}${roughness}`;
            materialProps.baseColor.add(baseColor);
            materialProps.emissive.add(emissive);
            materialProps.metallicRoughness.add(metallic + "+" + roughness);
            materialKeys.add(key);
            materialKeyMap.set(material, key);
        }
        const keyCount = materialKeys.size;
        if (keyCount < min2) {
            logger.debug(`${NAME$a2}: Found <${min2} unique material properties. Exiting.`);
            return;
        }
        const w = ceilPowerOfTwo(keyCount * blockSize);
        const h = ceilPowerOfTwo(blockSize);
        const padWidth = w - keyCount * blockSize;
        const paletteTexturePixels = {
            baseColor: null,
            emissive: null,
            metallicRoughness: null
        };
        const skipProps = new Set(["name", "extras"]);
        const skip = (...props) => props.forEach((prop) => skipProps.add(prop));
        let baseColorTexture = null;
        let emissiveTexture = null;
        let metallicRoughnessTexture = null;
        if (materialProps.baseColor.size >= min2) {
            const name = "PaletteBaseColor";
            baseColorTexture = document.createTexture(name).setURI(`${name}.png`);
            paletteTexturePixels.baseColor = (0, import_ndarray3.default)(new Uint8Array(w * h * 4), [w, h, 4]);
            skip("baseColorFactor", "baseColorTexture", "baseColorTextureInfo");
        }
        if (materialProps.emissive.size >= min2) {
            const name = "PaletteEmissive";
            emissiveTexture = document.createTexture(name).setURI(`${name}.png`);
            paletteTexturePixels.emissive = (0, import_ndarray3.default)(new Uint8Array(w * h * 4), [w, h, 4]);
            skip("emissiveFactor", "emissiveTexture", "emissiveTextureInfo");
        }
        if (materialProps.metallicRoughness.size >= min2) {
            const name = "PaletteMetallicRoughness";
            metallicRoughnessTexture = document.createTexture(name).setURI(`${name}.png`);
            paletteTexturePixels.metallicRoughness = (0, import_ndarray3.default)(new Uint8Array(w * h * 4), [w, h, 4]);
            skip("metallicFactor", "roughnessFactor", "metallicRoughnessTexture", "metallicRoughnessTextureInfo");
        }
        if (!(baseColorTexture || emissiveTexture || metallicRoughnessTexture)) {
            logger.debug(`${NAME$a2}: No material property has >=${min2} unique values. Exiting.`);
            return;
        }
        const visitedKeys = new Set();
        const materialIndices = new Map();
        const paletteMaterials = [];
        let nextIndex = 0;
        for (const material of materials) {
            const key = materialKeyMap.get(material);
            if (visitedKeys.has(key))
                continue;
            const index = nextIndex++;
            if (paletteTexturePixels.baseColor) {
                const pixels = paletteTexturePixels.baseColor;
                const baseColor = [...material.getBaseColorFactor()];
                ColorUtils.convertLinearToSRGB(baseColor, baseColor);
                writeBlock(pixels, index, baseColor, blockSize);
            }
            if (paletteTexturePixels.emissive) {
                const pixels = paletteTexturePixels.emissive;
                const emissive = [...material.getEmissiveFactor(), 1];
                ColorUtils.convertLinearToSRGB(emissive, emissive);
                writeBlock(pixels, index, emissive, blockSize);
            }
            if (paletteTexturePixels.metallicRoughness) {
                const pixels = paletteTexturePixels.metallicRoughness;
                const metallic = material.getMetallicFactor();
                const roughness = material.getRoughnessFactor();
                writeBlock(pixels, index, [0, roughness, metallic, 1], blockSize);
            }
            visitedKeys.add(key);
            materialIndices.set(key, index);
        }
        const mimeType = "image/png";
        if (baseColorTexture) {
            const image = await savePixels(paletteTexturePixels.baseColor, mimeType);
            baseColorTexture.setImage(image).setMimeType(mimeType);
        }
        if (emissiveTexture) {
            const image = await savePixels(paletteTexturePixels.emissive, mimeType);
            emissiveTexture.setImage(image).setMimeType(mimeType);
        }
        if (metallicRoughnessTexture) {
            const image = await savePixels(paletteTexturePixels.metallicRoughness, mimeType);
            metallicRoughnessTexture.setImage(image).setMimeType(mimeType);
        }
        let nextPaletteMaterialIndex = 1;
        for (const prim of prims) {
            const srcMaterial = prim.getMaterial();
            const key = materialKeyMap.get(srcMaterial);
            const blockIndex = materialIndices.get(key);
            const baseUV = (blockIndex + 0.5) / keyCount;
            const padUV = baseUV * (w - padWidth) / w;
            const position = prim.getAttribute("POSITION");
            const buffer = position.getBuffer();
            const array = new Float32Array(position.getCount() * 2).fill(padUV);
            const uv = document.createAccessor().setType("VEC2").setArray(array).setBuffer(buffer);
            let dstMaterial;
            for (const material of paletteMaterials) {
                if (material.equals(srcMaterial, skipProps)) {
                    dstMaterial = material;
                }
            }
            if (!dstMaterial) {
                const suffix = (nextPaletteMaterialIndex++).toString().padStart(3, "0");
                dstMaterial = srcMaterial.clone().setName(`PaletteMaterial${suffix}`);
                if (baseColorTexture) {
                    dstMaterial.setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(baseColorTexture).getBaseColorTextureInfo().setMinFilter(TextureInfo.MinFilter.NEAREST).setMagFilter(TextureInfo.MagFilter.NEAREST);
                }
                if (emissiveTexture) {
                    dstMaterial.setEmissiveFactor([1, 1, 1]).setEmissiveTexture(emissiveTexture).getEmissiveTextureInfo().setMinFilter(TextureInfo.MinFilter.NEAREST).setMagFilter(TextureInfo.MagFilter.NEAREST);
                }
                if (metallicRoughnessTexture) {
                    dstMaterial.setMetallicFactor(1).setRoughnessFactor(1).setMetallicRoughnessTexture(metallicRoughnessTexture).getMetallicRoughnessTextureInfo().setMinFilter(TextureInfo.MinFilter.NEAREST).setMagFilter(TextureInfo.MagFilter.NEAREST);
                }
                paletteMaterials.push(dstMaterial);
            }
            prim.setMaterial(dstMaterial).setAttribute("TEXCOORD_0", uv);
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [PropertyType.MATERIAL]
            }));
        }
        logger.debug(`${NAME$a2}: Complete.`);
    });
}
function encodeFloat(value) {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}
function encodeRGBA(value) {
    ColorUtils.convertLinearToSRGB(value, value);
    return value.map(encodeFloat).join("");
}
function ceilPowerOfTwo(value) {
    return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
function writeBlock(pixels, index, value, blockSize) {
    for (let i = 0; i < blockSize; i++) {
        for (let j = 0; j < blockSize; j++) {
            pixels.set(index * blockSize + i, j, 0, value[0] * 255);
            pixels.set(index * blockSize + i, j, 1, value[1] * 255);
            pixels.set(index * blockSize + i, j, 2, value[2] * 255);
            pixels.set(index * blockSize + i, j, 3, value[3] * 255);
        }
    }
}
var NAME$92 = "partition";
var PARTITION_DEFAULTS = {
    animations: true,
    meshes: true
};
function partition(_options = PARTITION_DEFAULTS) {
    const options = assignDefaults(PARTITION_DEFAULTS, _options);
    return createTransform(NAME$92, async (doc) => {
        const logger = doc.getLogger();
        if (options.meshes !== false)
            partitionMeshes(doc, logger, options);
        if (options.animations !== false)
            partitionAnimations(doc, logger, options);
        if (!options.meshes && !options.animations) {
            logger.warn(`${NAME$92}: Select animations or meshes to create a partition.`);
        }
        await doc.transform(prune({
            propertyTypes: [PropertyType.BUFFER]
        }));
        logger.debug(`${NAME$92}: Complete.`);
    });
}
function partitionMeshes(doc, logger, options) {
    const existingURIs = new Set(doc.getRoot().listBuffers().map((b) => b.getURI()));
    doc.getRoot().listMeshes().forEach((mesh, meshIndex) => {
        if (Array.isArray(options.meshes) && !options.meshes.includes(mesh.getName())) {
            logger.debug(`${NAME$92}: Skipping mesh #${meshIndex} with name "${mesh.getName()}".`);
            return;
        }
        logger.debug(`${NAME$92}: Creating buffer for mesh "${mesh.getName()}".`);
        const buffer = doc.createBuffer(mesh.getName()).setURI(createBufferURI(mesh.getName() || "mesh", existingURIs));
        mesh.listPrimitives().forEach((primitive) => {
            const indices = primitive.getIndices();
            if (indices)
                indices.setBuffer(buffer);
            primitive.listAttributes().forEach((attribute) => attribute.setBuffer(buffer));
            primitive.listTargets().forEach((primTarget) => {
                primTarget.listAttributes().forEach((attribute) => attribute.setBuffer(buffer));
            });
        });
    });
}
function partitionAnimations(doc, logger, options) {
    const existingURIs = new Set(doc.getRoot().listBuffers().map((b) => b.getURI()));
    doc.getRoot().listAnimations().forEach((anim, animIndex) => {
        if (Array.isArray(options.animations) && !options.animations.includes(anim.getName())) {
            logger.debug(`${NAME$92}: Skipping animation #${animIndex} with name "${anim.getName()}".`);
            return;
        }
        logger.debug(`${NAME$92}: Creating buffer for animation "${anim.getName()}".`);
        const buffer = doc.createBuffer(anim.getName()).setURI(createBufferURI(anim.getName() || "animation", existingURIs));
        anim.listSamplers().forEach((sampler) => {
            const input = sampler.getInput();
            const output = sampler.getOutput();
            if (input)
                input.setBuffer(buffer);
            if (output)
                output.setBuffer(buffer);
        });
    });
}
var SANITIZE_BASENAME_RE = /[^\w0–9-]+/g;
function createBufferURI(basename, existing) {
    basename = basename.replace(SANITIZE_BASENAME_RE, "");
    let uri = `${basename}.bin`;
    let i = 1;
    while (existing.has(uri))
        uri = `${basename}_${i++}.bin`;
    existing.add(uri);
    return uri;
}
var InterpolationInternal;
(function (InterpolationInternal2) {
    InterpolationInternal2[InterpolationInternal2["STEP"] = 0] = "STEP";
    InterpolationInternal2[InterpolationInternal2["LERP"] = 1] = "LERP";
    InterpolationInternal2[InterpolationInternal2["SLERP"] = 2] = "SLERP";
})(InterpolationInternal || (InterpolationInternal = {}));
var EPSILON = 1e-6;
function resampleDebug(input, output, interpolation, tolerance = 1e-4) {
    const elementSize = output.length / input.length;
    const tmp = new Array(elementSize).fill(0);
    const value = new Array(elementSize).fill(0);
    const valueNext = new Array(elementSize).fill(0);
    const valuePrev = new Array(elementSize).fill(0);
    const lastIndex = input.length - 1;
    let writeIndex = 1;
    for (let i = 1; i < lastIndex; ++i) {
        const timePrev = input[writeIndex - 1];
        const time = input[i];
        const timeNext = input[i + 1];
        const t2 = (time - timePrev) / (timeNext - timePrev);
        let keep = false;
        if (time !== timeNext && (i !== 1 || time !== input[0])) {
            getElement(output, writeIndex - 1, valuePrev);
            getElement(output, i, value);
            getElement(output, i + 1, valueNext);
            if (interpolation === "slerp") {
                const sample = slerp(tmp, valuePrev, valueNext, t2);
                const angle = getAngle(valuePrev, value) + getAngle(value, valueNext);
                keep = !eq(value, sample, tolerance) || angle + Number.EPSILON >= Math.PI;
            }
            else if (interpolation === "lerp") {
                const sample = vlerp(tmp, valuePrev, valueNext, t2);
                keep = !eq(value, sample, tolerance);
            }
            else if (interpolation === "step") {
                keep = !eq(value, valuePrev) || !eq(value, valueNext);
            }
        }
        if (keep) {
            if (i !== writeIndex) {
                input[writeIndex] = input[i];
                setElement(output, writeIndex, getElement(output, i, tmp));
            }
            writeIndex++;
        }
    }
    if (lastIndex > 0) {
        input[writeIndex] = input[lastIndex];
        setElement(output, writeIndex, getElement(output, lastIndex, tmp));
        writeIndex++;
    }
    return writeIndex;
}
function getElement(array, index, target) {
    for (let i = 0, elementSize = target.length; i < elementSize; i++) {
        target[i] = array[index * elementSize + i];
    }
    return target;
}
function setElement(array, index, value) {
    for (let i = 0, elementSize = value.length; i < elementSize; i++) {
        array[index * elementSize + i] = value[i];
    }
}
function eq(a2, b, tolerance = 0) {
    if (a2.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a2.length; i++) {
        if (Math.abs(a2[i] - b[i]) > tolerance) {
            return false;
        }
    }
    return true;
}
function lerp(v0, v1, t2) {
    return v0 * (1 - t2) + v1 * t2;
}
function vlerp(out, a2, b, t2) {
    for (let i = 0; i < a2.length; i++)
        out[i] = lerp(a2[i], b[i], t2);
    return out;
}
function slerp(out, a2, b, t2) {
    let ax = a2[0], ay = a2[1], az = a2[2], aw = a2[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let omega, cosom, sinom, scale0, scale1;
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    if (1 - cosom > EPSILON) {
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1 - t2) * omega) / sinom;
        scale1 = Math.sin(t2 * omega) / sinom;
    }
    else {
        scale0 = 1 - t2;
        scale1 = t2;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
}
function getAngle(a2, b) {
    const dotproduct = dot(a2, b);
    return Math.acos(2 * dotproduct * dotproduct - 1);
}
function dot(a2, b) {
    return a2[0] * b[0] + a2[1] * b[1] + a2[2] * b[2] + a2[3] * b[3];
}
var NAME$82 = "resample";
var EMPTY_ARRAY = new Float32Array(0);
var RESAMPLE_DEFAULTS = {
    ready: Promise.resolve(),
    resample: resampleDebug,
    tolerance: 1e-4,
    cleanup: true
};
function resample(_options = RESAMPLE_DEFAULTS) {
    const options = assignDefaults(RESAMPLE_DEFAULTS, _options);
    return createTransform(NAME$82, async (document) => {
        const accessorsVisited = new Set();
        const srcAccessorCount = document.getRoot().listAccessors().length;
        const logger = document.getLogger();
        const ready = options.ready;
        const resample2 = options.resample;
        await ready;
        for (const animation of document.getRoot().listAnimations()) {
            const samplerTargetPaths = new Map();
            for (const channel of animation.listChannels()) {
                samplerTargetPaths.set(channel.getSampler(), channel.getTargetPath());
            }
            for (const sampler of animation.listSamplers()) {
                const samplerInterpolation = sampler.getInterpolation();
                if (samplerInterpolation === "STEP" || samplerInterpolation === "LINEAR") {
                    const input = sampler.getInput();
                    const output = sampler.getOutput();
                    accessorsVisited.add(input);
                    accessorsVisited.add(output);
                    const tmpTimes = toFloat32Array(input.getArray(), input.getComponentType(), input.getNormalized());
                    const tmpValues = toFloat32Array(output.getArray(), output.getComponentType(), output.getNormalized());
                    const elementSize = tmpValues.length / tmpTimes.length;
                    const srcCount = tmpTimes.length;
                    let dstCount;
                    if (samplerInterpolation === "STEP") {
                        dstCount = resample2(tmpTimes, tmpValues, "step", options.tolerance);
                    }
                    else if (samplerTargetPaths.get(sampler) === "rotation") {
                        dstCount = resample2(tmpTimes, tmpValues, "slerp", options.tolerance);
                    }
                    else {
                        dstCount = resample2(tmpTimes, tmpValues, "lerp", options.tolerance);
                    }
                    if (dstCount < srcCount) {
                        const srcTimes = input.getArray();
                        const srcValues = output.getArray();
                        const dstTimes = fromFloat32Array(new Float32Array(tmpTimes.buffer, tmpTimes.byteOffset, dstCount), input.getComponentType(), input.getNormalized());
                        const dstValues = fromFloat32Array(new Float32Array(tmpValues.buffer, tmpValues.byteOffset, dstCount * elementSize), output.getComponentType(), output.getNormalized());
                        input.setArray(EMPTY_ARRAY);
                        output.setArray(EMPTY_ARRAY);
                        sampler.setInput(input.clone().setArray(dstTimes));
                        sampler.setOutput(output.clone().setArray(dstValues));
                        input.setArray(srcTimes);
                        output.setArray(srcValues);
                    }
                }
            }
        }
        for (const accessor of Array.from(accessorsVisited.values())) {
            const used = accessor.listParents().some((p) => !(p instanceof Root));
            if (!used)
                accessor.dispose();
        }
        const dstAccessorCount = document.getRoot().listAccessors().length;
        if (dstAccessorCount > srcAccessorCount && options.cleanup) {
            await document.transform(dedup({
                propertyTypes: [PropertyType.ACCESSOR]
            }));
        }
        logger.debug(`${NAME$82}: Complete.`);
    });
}
function toFloat32Array(srcArray, componentType, normalized) {
    if (srcArray instanceof Float32Array)
        return srcArray.slice();
    const dstArray = new Float32Array(srcArray);
    if (!normalized)
        return dstArray;
    for (let i = 0; i < dstArray.length; i++) {
        dstArray[i] = MathUtils.decodeNormalizedInt(dstArray[i], componentType);
    }
    return dstArray;
}
function fromFloat32Array(srcArray, componentType, normalized) {
    if (componentType === Accessor.ComponentType.FLOAT)
        return srcArray.slice();
    const TypedArray = ComponentTypeToTypedArray[componentType];
    const dstArray = new TypedArray(srcArray.length);
    for (let i = 0; i < dstArray.length; i++) {
        dstArray[i] = normalized ? MathUtils.encodeNormalizedInt(srcArray[i], componentType) : srcArray[i];
    }
    return dstArray;
}
var NAME$72 = "sequence";
var SEQUENCE_DEFAULTS = {
    name: "",
    fps: 10,
    pattern: /.*/,
    sort: true
};
function sequence(_options = SEQUENCE_DEFAULTS) {
    const options = assignDefaults(SEQUENCE_DEFAULTS, _options);
    return createTransform(NAME$72, (doc) => {
        const logger = doc.getLogger();
        const root = doc.getRoot();
        const fps = options.fps;
        const sequenceNodes = root.listNodes().filter((node) => node.getName().match(options.pattern));
        if (options.sort) {
            sequenceNodes.sort((a2, b) => a2.getName() > b.getName() ? 1 : -1);
        }
        const anim = doc.createAnimation(options.name);
        const animBuffer = root.listBuffers()[0];
        sequenceNodes.forEach((node, i) => {
            let inputArray;
            let outputArray;
            if (i === 0) {
                inputArray = [i / fps, (i + 1) / fps];
                outputArray = [1, 1, 1, 0, 0, 0];
            }
            else if (i === sequenceNodes.length - 1) {
                inputArray = [(i - 1) / fps, i / fps];
                outputArray = [0, 0, 0, 1, 1, 1];
            }
            else {
                inputArray = [(i - 1) / fps, i / fps, (i + 1) / fps];
                outputArray = [0, 0, 0, 1, 1, 1, 0, 0, 0];
            }
            const input = doc.createAccessor().setArray(new Float32Array(inputArray)).setBuffer(animBuffer);
            const output = doc.createAccessor().setArray(new Float32Array(outputArray)).setBuffer(animBuffer).setType(Accessor.Type.VEC3);
            const sampler = doc.createAnimationSampler().setInterpolation(AnimationSampler.Interpolation.STEP).setInput(input).setOutput(output);
            const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath(AnimationChannel.TargetPath.SCALE).setSampler(sampler);
            anim.addSampler(sampler).addChannel(channel);
        });
        logger.debug(`${NAME$72}: Complete.`);
    });
}
var NAME$62 = "simplify";
var { POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN } = Primitive.Mode;
var SIMPLIFY_DEFAULTS = {
    ratio: 0,
    error: 1e-4,
    lockBorder: false,
    cleanup: true
};
function simplify(_options) {
    const options = assignDefaults(SIMPLIFY_DEFAULTS, _options);
    const simplifier = options.simplifier;
    if (!simplifier) {
        throw new Error(`${NAME$62}: simplifier dependency required \u2014 install "meshoptimizer".`);
    }
    return createTransform(NAME$62, async (document) => {
        const logger = document.getLogger();
        await simplifier.ready;
        await document.transform(weld({
            overwrite: false,
            cleanup: options.cleanup
        }));
        let numUnsupported = 0;
        for (const mesh of document.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                const mode = prim.getMode();
                if (mode === TRIANGLES || mode === TRIANGLE_STRIP || mode === TRIANGLE_FAN) {
                    simplifyPrimitive(prim, options);
                    if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
                        prim.dispose();
                    }
                }
                else if (prim.getMode() === POINTS && !!simplifier.simplifyPoints) {
                    simplifyPrimitive(prim, options);
                    if (getPrimitiveVertexCount(prim, VertexCountMethod.RENDER) === 0) {
                        prim.dispose();
                    }
                }
                else {
                    numUnsupported++;
                }
            }
            if (mesh.listPrimitives().length === 0)
                mesh.dispose();
        }
        if (numUnsupported > 0) {
            logger.warn(`${NAME$62}: Skipping simplification of ${numUnsupported} primitives: Unsupported draw mode.`);
        }
        if (options.cleanup) {
            await document.transform(prune({
                propertyTypes: [PropertyType.ACCESSOR, PropertyType.NODE],
                keepAttributes: true,
                keepIndices: true,
                keepLeaves: false
            }), dedup({
                propertyTypes: [PropertyType.ACCESSOR]
            }));
        }
        logger.debug(`${NAME$62}: Complete.`);
    });
}
function simplifyPrimitive(prim, _options) {
    const options = _extends4({}, SIMPLIFY_DEFAULTS, _options);
    const simplifier = options.simplifier;
    const graph = prim.getGraph();
    const document = Document.fromGraph(graph);
    const logger = document.getLogger();
    switch (prim.getMode()) {
        case POINTS:
            return _simplifyPoints(document, prim, options);
        case LINES:
        case LINE_STRIP:
        case LINE_LOOP:
            logger.warn(`${NAME$62}: Skipping primitive simplification: Unsupported draw mode.`);
            return prim;
        case TRIANGLE_STRIP:
        case TRIANGLE_FAN:
            convertPrimitiveToTriangles(prim);
            break;
    }
    const srcVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
    const srcIndexCount = getPrimitiveVertexCount(prim, VertexCountMethod.RENDER);
    if (srcIndexCount < srcVertexCount / 2) {
        compactPrimitive(prim);
    }
    const position = prim.getAttribute("POSITION");
    const srcIndices = prim.getIndices();
    let positionArray = position.getArray();
    let indicesArray = srcIndices.getArray();
    if (!(positionArray instanceof Float32Array)) {
        positionArray = dequantizeAttributeArray(positionArray, position.getComponentType(), position.getNormalized());
    }
    if (!(indicesArray instanceof Uint32Array)) {
        indicesArray = new Uint32Array(indicesArray);
    }
    const targetCount = Math.floor(options.ratio * srcIndexCount / 3) * 3;
    const flags = options.lockBorder ? ["LockBorder"] : [];
    const [dstIndicesArray, error] = simplifier.simplify(indicesArray, positionArray, 3, targetCount, options.error, flags);
    prim.setIndices(shallowCloneAccessor(document, srcIndices).setArray(dstIndicesArray));
    if (srcIndices.listParents().length === 1)
        srcIndices.dispose();
    compactPrimitive(prim);
    const dstVertexCount = getPrimitiveVertexCount(prim, VertexCountMethod.UPLOAD);
    if (dstVertexCount <= 65534) {
        prim.getIndices().setArray(new Uint16Array(prim.getIndices().getArray()));
    }
    logger.debug(`${NAME$62}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices, error: ${error.toFixed(4)}.`);
    return prim;
}
function _simplifyPoints(document, prim, options) {
    const simplifier = options.simplifier;
    const logger = document.getLogger();
    const indices = prim.getIndices();
    if (indices)
        unweldPrimitive(prim);
    const position = prim.getAttribute("POSITION");
    const color = prim.getAttribute("COLOR_0");
    const srcVertexCount = position.getCount();
    let positionArray = position.getArray();
    let colorArray = color ? color.getArray() : void 0;
    const colorStride = color ? color.getComponentSize() : void 0;
    if (!(positionArray instanceof Float32Array)) {
        positionArray = dequantizeAttributeArray(positionArray, position.getComponentType(), position.getNormalized());
    }
    if (colorArray && !(colorArray instanceof Float32Array)) {
        colorArray = dequantizeAttributeArray(colorArray, position.getComponentType(), position.getNormalized());
    }
    simplifier.useExperimentalFeatures = true;
    const targetCount = Math.floor(options.ratio * srcVertexCount);
    const dstIndicesArray = simplifier.simplifyPoints(positionArray, 3, targetCount, colorArray, colorStride);
    simplifier.useExperimentalFeatures = false;
    const [remap2, unique] = simplifier.compactMesh(dstIndicesArray);
    logger.debug(`${NAME$62}: ${formatDeltaOp(position.getCount(), unique)} vertices.`);
    for (const srcAttribute of deepListAttributes(prim)) {
        const dstAttribute = shallowCloneAccessor(document, srcAttribute);
        compactAttribute(srcAttribute, null, remap2, dstAttribute, unique);
        deepSwapAttribute(prim, srcAttribute, dstAttribute);
        if (srcAttribute.listParents().length === 1)
            srcAttribute.dispose();
    }
    return prim;
}
var NAME$52 = "sparse";
var SPARSE_DEFAULTS = {
    ratio: 1 / 3
};
function sparse(_options = SPARSE_DEFAULTS) {
    const options = assignDefaults(SPARSE_DEFAULTS, _options);
    const ratio = options.ratio;
    if (ratio < 0 || ratio > 1) {
        throw new Error(`${NAME$52}: Ratio must be between 0 and 1.`);
    }
    return createTransform(NAME$52, (document) => {
        const root = document.getRoot();
        const logger = document.getLogger();
        let modifiedCount = 0;
        for (const accessor of root.listAccessors()) {
            const count = accessor.getCount();
            const base = Array(accessor.getElementSize()).fill(0);
            const el = Array(accessor.getElementSize()).fill(0);
            let nonZeroCount = 0;
            for (let i = 0; i < count; i++) {
                accessor.getElement(i, el);
                if (!MathUtils.eq(el, base, 0))
                    nonZeroCount++;
                if (nonZeroCount / count >= ratio)
                    break;
            }
            const sparse2 = nonZeroCount / count < ratio;
            if (sparse2 !== accessor.getSparse()) {
                accessor.setSparse(sparse2);
                modifiedCount++;
            }
        }
        logger.debug(`${NAME$52}: Updated ${modifiedCount} accessors.`);
        logger.debug(`${NAME$52}: Complete.`);
    });
}
var NAME$42 = "textureCompress";
var TEXTURE_COMPRESS_SUPPORTED_FORMATS = ["jpeg", "png", "webp", "avif"];
var SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
var TextureResizeFilter;
(function (TextureResizeFilter2) {
    TextureResizeFilter2["LANCZOS3"] = "lanczos3";
    TextureResizeFilter2["LANCZOS2"] = "lanczos2";
})(TextureResizeFilter || (TextureResizeFilter = {}));
var TEXTURE_COMPRESS_DEFAULTS = {
    resizeFilter: TextureResizeFilter.LANCZOS3,
    pattern: void 0,
    formats: void 0,
    slots: void 0,
    quality: void 0,
    effort: void 0,
    lossless: false,
    nearLossless: false,
    limitInputPixels: true
};
function textureCompress(_options) {
    const options = assignDefaults(TEXTURE_COMPRESS_DEFAULTS, _options);
    const targetFormat = options.targetFormat;
    const patternRe = options.pattern;
    const formatsRe = options.formats;
    const slotsRe = options.slots;
    return createTransform(NAME$42, async (document) => {
        const logger = document.getLogger();
        const textures = document.getRoot().listTextures();
        await Promise.all(textures.map(async (texture, textureIndex) => {
            const slots = listTextureSlots(texture);
            const channels = getTextureChannelMask(texture);
            const textureLabel = texture.getURI() || texture.getName() || `${textureIndex + 1}/${document.getRoot().listTextures().length}`;
            const prefix = `${NAME$42}(${textureLabel})`;
            if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
                logger.debug(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
                return;
            }
            else if (patternRe && !patternRe.test(texture.getName()) && !patternRe.test(texture.getURI())) {
                logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
                return;
            }
            else if (formatsRe && !formatsRe.test(texture.getMimeType())) {
                logger.debug(`${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`);
                return;
            }
            else if (slotsRe && slots.length && !slots.some((slot) => slotsRe.test(slot))) {
                logger.debug(`${prefix}: Skipping, [${slots.join(", ")}] excluded by "slots" parameter.`);
                return;
            }
            else if (options.targetFormat === "jpeg" && channels & TextureChannel.A) {
                logger.warn(`${prefix}: Skipping, [${slots.join(", ")}] requires alpha channel.`);
                return;
            }
            const srcFormat = getFormat(texture);
            const dstFormat = targetFormat || srcFormat;
            logger.debug(`${prefix}: Format = ${srcFormat} \u2192 ${dstFormat}`);
            logger.debug(`${prefix}: Slots = [${slots.join(", ")}]`);
            const srcImage = texture.getImage();
            const srcByteLength = srcImage.byteLength;
            await compressTexture(texture, options);
            const dstImage = texture.getImage();
            const dstByteLength = dstImage.byteLength;
            const flag = srcImage === dstImage ? " (SKIPPED" : "";
            logger.debug(`${prefix}: Size = ${formatBytes(srcByteLength)} \u2192 ${formatBytes(dstByteLength)}${flag}`);
        }));
        const webpExtension = document.createExtension(EXTTextureWebP);
        if (textures.some((texture) => texture.getMimeType() === "image/webp")) {
            webpExtension.setRequired(true);
        }
        else {
            webpExtension.dispose();
        }
        const avifExtension = document.createExtension(EXTTextureAVIF);
        if (textures.some((texture) => texture.getMimeType() === "image/avif")) {
            avifExtension.setRequired(true);
        }
        else {
            avifExtension.dispose();
        }
        logger.debug(`${NAME$42}: Complete.`);
    });
}
async function compressTexture(texture, _options) {
    const options = _extends4({}, TEXTURE_COMPRESS_DEFAULTS, _options);
    const encoder = options.encoder;
    const srcURI = texture.getURI();
    const srcFormat = getFormat(texture);
    const dstFormat = options.targetFormat || srcFormat;
    const srcMimeType = texture.getMimeType();
    const dstMimeType = `image/${dstFormat}`;
    const srcImage = texture.getImage();
    const dstImage = encoder ? await _encodeWithSharp(srcImage, srcMimeType, dstMimeType, options) : await _encodeWithNdarrayPixels(srcImage, srcMimeType, dstMimeType, options);
    const srcByteLength = srcImage.byteLength;
    const dstByteLength = dstImage.byteLength;
    if (srcMimeType === dstMimeType && dstByteLength >= srcByteLength && !options.resize) {
        return;
    }
    else if (srcMimeType === dstMimeType) {
        texture.setImage(dstImage);
    }
    else {
        const srcExtension = srcURI ? FileUtils.extension(srcURI) : ImageUtils.mimeTypeToExtension(srcMimeType);
        const dstExtension = ImageUtils.mimeTypeToExtension(dstMimeType);
        const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
        texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI);
    }
}
async function _encodeWithSharp(srcImage, _srcMimeType, dstMimeType, options) {
    const encoder = options.encoder;
    let encoderOptions = {};
    const dstFormat = getFormatFromMimeType(dstMimeType);
    switch (dstFormat) {
        case "jpeg":
            encoderOptions = {
                quality: options.quality
            };
            break;
        case "png":
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 10)
            };
            break;
        case "webp":
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 6),
                lossless: options.lossless,
                nearLossless: options.nearLossless
            };
            break;
        case "avif":
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 9),
                lossless: options.lossless
            };
            break;
    }
    const limitInputPixels = options.limitInputPixels;
    const instance2 = encoder(srcImage, {
        limitInputPixels
    }).toFormat(dstFormat, encoderOptions);
    if (options.resize) {
        const srcSize = ImageUtils.getSize(srcImage, _srcMimeType);
        const dstSize = Array.isArray(options.resize) ? fitWithin(srcSize, options.resize) : fitPowerOfTwo(srcSize, options.resize);
        instance2.resize(dstSize[0], dstSize[1], {
            fit: "fill",
            kernel: options.resizeFilter
        });
    }
    return BufferUtils.toView(await instance2.toBuffer());
}
async function _encodeWithNdarrayPixels(srcImage, srcMimeType, dstMimeType, options) {
    const srcPixels = await getPixels(srcImage, srcMimeType);
    if (options.resize) {
        const [w, h] = srcPixels.shape;
        const dstSize = Array.isArray(options.resize) ? fitWithin([w, h], options.resize) : fitPowerOfTwo([w, h], options.resize);
        const dstPixels = (0, import_ndarray3.default)(new Uint8Array(dstSize[0] * dstSize[1] * 4), [...dstSize, 4]);
        options.resizeFilter === TextureResizeFilter.LANCZOS3 ? s(srcPixels, dstPixels) : c(srcPixels, dstPixels);
        return savePixels(dstPixels, dstMimeType);
    }
    return savePixels(srcPixels, dstMimeType);
}
function getFormat(texture) {
    return getFormatFromMimeType(texture.getMimeType());
}
function getFormatFromMimeType(mimeType) {
    const format = mimeType.split("/").pop();
    if (!format || !TEXTURE_COMPRESS_SUPPORTED_FORMATS.includes(format)) {
        throw new Error(`Unknown MIME type "${mimeType}".`);
    }
    return format;
}
function remap(value, srcMax, dstMax) {
    if (value == null)
        return void 0;
    return Math.round(value / srcMax * dstMax);
}
var NAME$32 = "tangents";
var TANGENTS_DEFAULTS = {
    overwrite: false
};
function tangents(_options = TANGENTS_DEFAULTS) {
    const options = assignDefaults(TANGENTS_DEFAULTS, _options);
    if (!options.generateTangents) {
        throw new Error(`${NAME$32}: generateTangents callback required \u2014 install "mikktspace".`);
    }
    return createTransform(NAME$32, (doc) => {
        const logger = doc.getLogger();
        const attributeIDs = new Map();
        const tangentCache = new Map();
        let modified = 0;
        for (const mesh of doc.getRoot().listMeshes()) {
            const meshName = mesh.getName();
            const meshPrimitives = mesh.listPrimitives();
            for (let i = 0; i < meshPrimitives.length; i++) {
                const prim = meshPrimitives[i];
                if (!filterPrimitive(prim, logger, meshName, i, options.overwrite))
                    continue;
                const texcoordSemantic = getNormalTexcoord(prim);
                const position = prim.getAttribute("POSITION").getArray();
                const normal = prim.getAttribute("NORMAL").getArray();
                const texcoord = prim.getAttribute(texcoordSemantic).getArray();
                const positionID = attributeIDs.get(position) || uuid();
                attributeIDs.set(position, positionID);
                const normalID = attributeIDs.get(normal) || uuid();
                attributeIDs.set(normal, normalID);
                const texcoordID = attributeIDs.get(texcoord) || uuid();
                attributeIDs.set(texcoord, texcoordID);
                const prevTangent = prim.getAttribute("TANGENT");
                if (prevTangent && prevTangent.listParents().length === 2)
                    prevTangent.dispose();
                const attributeHash = `${positionID}|${normalID}|${texcoordID}`;
                let tangent = tangentCache.get(attributeHash);
                if (tangent) {
                    logger.debug(`${NAME$32}: Found cache for primitive ${i} of mesh "${meshName}".`);
                    prim.setAttribute("TANGENT", tangent);
                    modified++;
                    continue;
                }
                logger.debug(`${NAME$32}: Generating for primitive ${i} of mesh "${meshName}".`);
                const tangentBuffer = prim.getAttribute("POSITION").getBuffer();
                const tangentArray = options.generateTangents(position instanceof Float32Array ? position : new Float32Array(position), normal instanceof Float32Array ? normal : new Float32Array(normal), texcoord instanceof Float32Array ? texcoord : new Float32Array(texcoord));
                for (let _i = 3; _i < tangentArray.length; _i += 4)
                    tangentArray[_i] *= -1;
                tangent = doc.createAccessor().setBuffer(tangentBuffer).setArray(tangentArray).setType("VEC4");
                prim.setAttribute("TANGENT", tangent);
                tangentCache.set(attributeHash, tangent);
                modified++;
            }
        }
        if (!modified) {
            logger.warn(`${NAME$32}: No qualifying primitives found. See debug output.`);
        }
        else {
            logger.debug(`${NAME$32}: Complete.`);
        }
    });
}
function getNormalTexcoord(prim) {
    const material = prim.getMaterial();
    if (!material)
        return "TEXCOORD_0";
    const normalTextureInfo = material.getNormalTextureInfo();
    if (!normalTextureInfo)
        return "TEXCOORD_0";
    const texcoord = normalTextureInfo.getTexCoord();
    const semantic = `TEXCOORD_${texcoord}`;
    if (prim.getAttribute(semantic))
        return semantic;
    return "TEXCOORD_0";
}
function filterPrimitive(prim, logger, meshName, i, overwrite) {
    if (prim.getMode() !== Primitive.Mode.TRIANGLES || !prim.getAttribute("POSITION") || !prim.getAttribute("NORMAL") || !prim.getAttribute("TEXCOORD_0")) {
        logger.debug(`${NAME$32}: Skipping primitive ${i} of mesh "${meshName}": primitives must have attributes=[POSITION, NORMAL, TEXCOORD_0] and mode=TRIANGLES.`);
        return false;
    }
    if (prim.getAttribute("TANGENT") && !overwrite) {
        logger.debug(`${NAME$32}: Skipping primitive ${i} of mesh "${meshName}": TANGENT found.`);
        return false;
    }
    if (prim.getIndices()) {
        logger.warn(`${NAME$32}: Skipping primitive ${i} of mesh "${meshName}": primitives must be unwelded.`);
        return false;
    }
    return true;
}
var NAME$22 = "uninstance";
var UNINSTANCE_DEFAULTS = {};
function uninstance(_options = UNINSTANCE_DEFAULTS) {
    return createTransform(NAME$22, async (document) => {
        const logger = document.getLogger();
        const root = document.getRoot();
        const instanceAttributes = new Set();
        for (const srcNode of document.getRoot().listNodes()) {
            const batch = srcNode.getExtension("EXT_mesh_gpu_instancing");
            if (!batch)
                continue;
            for (const instanceNode of createInstanceNodes(srcNode)) {
                srcNode.addChild(instanceNode);
            }
            for (const instanceAttribute of batch.listAttributes()) {
                instanceAttributes.add(instanceAttribute);
            }
            srcNode.setMesh(null);
            batch.dispose();
        }
        for (const attribute of instanceAttributes) {
            if (attribute.listParents().every((parent) => parent === root)) {
                attribute.dispose();
            }
        }
        document.createExtension(EXTMeshGPUInstancing).dispose();
        logger.debug(`${NAME$22}: Complete.`);
    });
}
function createInstanceNodes(batchNode) {
    const batch = batchNode.getExtension("EXT_mesh_gpu_instancing");
    if (!batch)
        return [];
    const semantics = batch.listSemantics();
    if (semantics.length === 0)
        return [];
    const document = Document.fromGraph(batchNode.getGraph());
    const instanceCount = batch.listAttributes()[0].getCount();
    const instanceCountDigits = String(instanceCount).length;
    const mesh = batchNode.getMesh();
    const batchName = batchNode.getName();
    const instanceNodes = [];
    for (let i = 0; i < instanceCount; i++) {
        const instanceNode = document.createNode().setMesh(mesh);
        if (batchName) {
            const paddedIndex = String(i).padStart(instanceCountDigits, "0");
            instanceNode.setName(`${batchName}_${paddedIndex}`);
        }
        for (const semantic of semantics) {
            const attribute = batch.getAttribute(semantic);
            switch (semantic) {
                case "TRANSLATION":
                    instanceNode.setTranslation(attribute.getElement(i, [0, 0, 0]));
                    break;
                case "ROTATION":
                    instanceNode.setRotation(attribute.getElement(i, [0, 0, 0, 1]));
                    break;
                case "SCALE":
                    instanceNode.setScale(attribute.getElement(i, [1, 1, 1]));
                    break;
                default:
                    _setInstanceExtras(instanceNode, semantic, attribute, i);
            }
        }
        instanceNodes.push(instanceNode);
    }
    return instanceNodes;
}
function _setInstanceExtras(node, semantic, attribute, index) {
    const value = attribute.getType() === "SCALAR" ? attribute.getScalar(index) : attribute.getElement(index, []);
    node.setExtras(_extends4({}, node.getExtras(), {
        [semantic]: value
    }));
}
function unlit() {
    return (doc) => {
        const unlitExtension = doc.createExtension(KHRMaterialsUnlit);
        const unlit2 = unlitExtension.createUnlit();
        doc.getRoot().listMaterials().forEach((material) => {
            material.setExtension("KHR_materials_unlit", unlit2);
        });
    };
}
var NAME$12 = "unpartition";
var UNPARTITION_DEFAULTS = {};
function unpartition(_options = UNPARTITION_DEFAULTS) {
    return createTransform(NAME$12, async (document) => {
        const logger = document.getLogger();
        const buffer = document.getRoot().listBuffers()[0];
        document.getRoot().listAccessors().forEach((a2) => a2.setBuffer(buffer));
        document.getRoot().listBuffers().forEach((b, index) => index > 0 ? b.dispose() : null);
        logger.debug(`${NAME$12}: Complete.`);
    });
}
var NAME2 = "vertexColorSpace";
function vertexColorSpace(options) {
    return createTransform(NAME2, (doc) => {
        const logger = doc.getLogger();
        const inputColorSpace = (options.inputColorSpace || "").toLowerCase();
        if (inputColorSpace === "srgb-linear") {
            logger.info(`${NAME2}: Vertex colors already linear. Skipping conversion.`);
            return;
        }
        if (inputColorSpace !== "srgb") {
            logger.error(`${NAME2}: Unknown input color space "${inputColorSpace}" \u2013 should be "srgb" or "srgb-linear". Skipping conversion.`);
            return;
        }
        const converted = new Set();
        function sRGBToLinear(c2) {
            return c2 < 0.04045 ? c2 * 0.0773993808 : Math.pow(c2 * 0.9478672986 + 0.0521327014, 2.4);
        }
        function updatePrimitive(primitive) {
            const color = [0, 0, 0];
            let attribute;
            for (let i = 0; attribute = primitive.getAttribute(`COLOR_${i}`); i++) {
                if (converted.has(attribute))
                    continue;
                for (let j = 0; j < attribute.getCount(); j++) {
                    attribute.getElement(j, color);
                    color[0] = sRGBToLinear(color[0]);
                    color[1] = sRGBToLinear(color[1]);
                    color[2] = sRGBToLinear(color[2]);
                    attribute.setElement(j, color);
                }
                converted.add(attribute);
            }
        }
        doc.getRoot().listMeshes().forEach((mesh) => mesh.listPrimitives().forEach(updatePrimitive));
        logger.debug(`${NAME2}: Complete.`);
    });
}
var MeshoptEncoder = function () {
    var wasm = "b9H79Tebbbe9nk9Geueu9Geub9Gbb9Gouuuuuueu9Gvuuuuueu9Gduueu9Gluuuueu9Gvuuuuub9Gouuuuuub9Gluuuub9GiuuueuiYKdilveoveovrrwrrDDoDbqqbelve9Weiiviebeoweuec;G:Qdkr:nlAo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8F9TW79O9V9Wt9FW9U9J9V9KW9wWVtW949c919M9MWV9mW4W2be8A9TW79O9V9Wt9FW9U9J9V9KW9wWVtW949c919M9MWVbd8F9TW79O9V9Wt9FW9U9J9V9KW9wWVtW949c919M9MWV9c9V919U9KbiE9TW79O9V9Wt9FW9U9J9V9KW9wWVtW949wWV79P9V9UblY9TW79O9V9Wt9FW9U9J9V9KW69U9KW949c919M9MWVbv8E9TW79O9V9Wt9FW9U9J9V9KW69U9KW949c919M9MWV9c9V919U9Kbo8A9TW79O9V9Wt9FW9U9J9V9KW69U9KW949wWV79P9V9UbrE9TW79O9V9Wt9FW9U9J9V9KW69U9KW949tWG91W9U9JWbwa9TW79O9V9Wt9FW9U9J9V9KW69U9KW949tWG91W9U9JW9c9V919U9KbDL9TW79O9V9Wt9FW9U9J9V9KWS9P2tWV9p9JtbqK9TW79O9V9Wt9FW9U9J9V9KWS9P2tWV9r919HtbkL9TW79O9V9Wt9FW9U9J9V9KWS9P2tWVT949WbxE9TW79O9V9Wt9F9V9Wt9P9T9P96W9wWVtW94J9H9J9OWbsa9TW79O9V9Wt9F9V9Wt9P9T9P96W9wWVtW94J9H9J9OW9ttV9P9Wbza9TW79O9V9Wt9F9V9Wt9P9T9P96W9wWVtW94SWt9J9O9sW9T9H9WbHK9TW79O9V9Wt9F79W9Ht9P9H29t9VVt9sW9T9H9WbOl79IV9RbADwebcekdLQq:X9MKdbk:xhdgud9:8Jjjjjbc;qw9Rgo8Kjjjjbdndnaembcbhrxekabcbyd;C:kjjbgwc:GeV86bbaoc;adfcbcjdz:vjjjb8AdnaiTmbaoc;adfadalzNjjjb8Akaoc;abfalfcbcbcjdal9RalcFe0Ez:vjjjb8Aaoc;abfaoc;adfalzNjjjb8AaocUf9cb83ibaoc8Wf9cb83ibaocyf9cb83ibaocaf9cb83ibaocKf9cb83ibaoczf9cb83ibao9cb83iwao9cb83ibcj;abal9Uc;WFbGcjdalca0EhDdnaicd6mbavcd9imbawTmbadcefhqaDci2gkal2hxaoc;alfclfhmaoc;qlfceVhPaoc;qofclVhsaoc;qofcKfhzaoc;qofczfhHcbhOincdhAcbhrdnavci6mbaz9cb83ibaH9cb83ibao9cb83i;yoao9cb83i;qoadaOfgrybbhCcbhXincbhQcbhLdninaralfhKarybbgYaC7aLVhLaQcP0meaKhraYhCaQcefgQaXfai6mbkkcbhCaoc;qofhQincwh8AcwhEdnaLaC93grcFeGg3cs0mbclhEa3ci0mba3cb9hcethEkdnarcw4cFeGg3cs0mbclh8Aa3ci0mba3cb9hceth8Aka8AaEfh3aQydbh5cwh8AcwhEdnarcz4cFeGg8Ecs0mbclhEa8Eci0mba8Ecb9hcethEka3a5fh3dnarcFFFFb0mbclh8AarcFFF8F0mbarcFFFr0ceth8AkaQa3aEfa8AfBdbaQclfhQaCcefgCcw9hmbkaKhraYhCaXczfgXai6mbkcbhrcehQashLinaQaraLydbaoc;qofarcdtfydb6EhraLclfhLaQcefgQcw9hmbkcihAkcbh3aoc;qlfcbcjdz:vjjjb8Aaoc;alfcwfcbBdbao9cb83i;alarclth8FadhaaDhhaqh5inaoc;qlfadcba3cufgrara30Eal2falzNjjjb8Aaiahaiah6EhgdnaDaia39Ra3aDfai6EgYcsfc9WGgraY9nmbaoc;qofaYfcbaraY9Rz:vjjjb8Akada3al2fh8Jcbh8Kina8Ka8FVcl4hXaoc;alfa8Kcdtfh8LaOh8Mcbh8Nina8NaOfhQdndndndndndna8KPldebidkaPa8Mc98GgLfhra5aLfh8Aaoc;qlfaQc98GgLfRbbhCcwhQinarRbbaQtaCVhCarcefhraQcwfgQca9hmbkaYTmla8Ncith8Ea8JaLfhEcbhKinaERbbhLcwhra8AhQinaQRbbartaLVhLaQcefhQarcwfgrca9hmbkaoc;qofaKfaLaC7aX93a8E486bba8Aalfh8AaEalfhEaLhCaKcefgKaY9hmbxlkkaYTmia8Mc9:Ghra8NcitcwGhEaoc;qlfaQceVfRbbcwtaoc;qlfaQc9:GfRbbVhLaoc;qofhQaghCinaQa5arfRbbcwtaaarfRbbVg8AaL9RgLcetaLcztcz91cs47cFFiGaE486bbaralfhraQcefhQa8AhLa3aCcufgC9hmbxikkaYTmda8JaQfhraoc;qlfaQfRbbhLaoc;qofhQaghCinaQarRbbg8AaL9RgLcetaLcKtcK91cr4786bbaQcefhQaralfhra8AhLa3aCcufgC9hmbxdkkaYTmeka8LydbhEcbhKaoc;qofhrincdhLcbhQinaLaraQfRbbcb9hfhLaQcefgQcz9hmbkclhCcbhQinaCaraQfRbbcd0fhCaQcefgQcz9hmbkcwh8AcbhQina8AaraQfRbbcP0fh8AaQcefgQcz9hmbkaLaCaLaC6EgQa8AaQa8A6EgQczaQcz6EaEfhEarczfhraKczfgKaY6mbka8LaEBdbka8Mcefh8Ma8Ncefg8Ncl9hmbka8Kcefg8KaA9hmbkaaaxfhaahakfhha5axfh5a3akfg3ai6mbkcbhrcehQamhLinaQaraLydbaoc;alfarcdtfydb6EhraLclfhLaQcefgChQaAaC9hmbkaoaOcd4fa8FcdVararcdSE86bbaOclfgOal6mbkkabaefh8Kabcefhralcd4gecbawEhqadcefhHaoc;abfceVhzcbhxdndninaiax9nmeaoc;qofcbcjdz:vjjjb8Aa8Kar9Raq6mdadaxal2gQfhkcbh8JaHaQfhsarcbaqz:vjjjbghaqfh5aDaiax9RaxaDfai6EgPcsfgrcl4cifcd4hAarc9WGg8LThmindndndndndndndndndndnawTmbaoa8Jcd4fRbbgLciGPlbedlbkaPTmdaka8Jfhraoc;abfa8JfRbbhLaoc;qofhQaPhCinaQarRbbg8AaL9RgLcetaLcKtcK91cr4786bbaQcefhQaralfhra8AhLaCcufgCmbxikkaPTmia8JcitcwGhEaoc;abfa8JceVfRbbcwtaoc;abfa8Jc9:GgrfRbbVhLakarfhraoc;qofhQaPhCinaQar8Vbbg8AaL9RgLcetaLcztcz91cs47cFFiGaE486bbaQcefhQaralfhra8AhLaCcufgCmbxdkkaza8Jc98GgEfhrasaEfh8Aaoc;abfaEfRbbhCcwhQinarRbbaQtaCVhCarcefhraQcwfgQca9hmbkaPTmbaLcl4hYa8JcitcKGh3akaEfhEcbhKinaERbbhLcwhra8AhQinaQRbbartaLVhLaQcefhQarcwfgrca9hmbkaoc;qofaKfaLaC7aY93a3486bba8Aalfh8AaEalfhEaLhCaKcefgKaP9hmbkkawmbcbhrxlka8LTmbcbhrdninaoc;qofarfgQcwf8PibaQ8Pib:e9qTmearczfgra8L9pmdxbkkdnavmbcehrxikcbhEaAhKaAhYinaoc;qofaEfgrcwf8Pibhyar8Pibh8PcdhLcbhQinaLaraQfRbbcb9hfhLaQcefgQcz9hmbkclhCcbhQinaCaraQfRbbcd0fhCaQcefgQcz9hmbkcwh8AcbhQina8AaraQfRbbcP0fh8AaQcefgQcz9hmbkaLaCaLaC6Egra8Aara8A6Egrczarcz6EaYfhYarcucbaya8P:e9cb9sEgQaraQ6EaKfhKaEczfgEa8L9pmdxbkkaha8Jcd4fgrarRbbcda8JcetcoGtV86bbxikdnaKaP6mbaYaP6mbaha8Jcd4fgrarRbbcia8JcetcoGtV86bba8Ka59RaP6mra5aoc;qofaPzNjjjbaPfh5xikaKaY9phrkaha8Jcd4fgQaQRbbara8JcetcoGtV86bbka8Ka59RaA6mla5cbaAz:vjjjbgOaAfhYdndna8Lmbamhrxekdna8KaY9RcK9pmbamhrxekarcdtc:q1jjbfcj1jjbawEg5ydxggcetc;:FFFeGh8Fcuh3cuagtcu7cFeGhacbh8Maoc;qofhLinaoc;qofa8MfhXczhEdndndnagPDbeeeeeeedekcucbaXcwf8PibaX8Pib:e9cb9sEhExekcbhra8FhEinaEaaaLarfRbb9nfhEarcefgrcz9hmbkkcih8Ecbh8AinczhQdndndna5a8AcdtfydbgKPDbeeeeeeedekcucbaXcwf8PibaX8Pib:e9cb9sEhQxekaKcetc;:FFFeGhQcuaKtcu7cFeGhCcbhrinaQaCaLarfRbb9nfhQarcefgrcz9hmbkkdndnaQaE6mbaKa39hmeaQaE9hmea5a8EcdtfydbcwSmeka8Ah8EaQhEka8Acefg8Aci9hmbkaOa8Mco4fgrarRbba8Ea8Mci4coGtV86bbdndndna5a8Ecdtfydbg3PDdbbbbbbbebkdncwa39Tg8ETmbcua3tcu7hQdndna3ceSmbcbh8NaLhXinaXhra8Eh8AcbhCinarRbbgEaQcFeGgKaEaK6EaCa3tVhCarcefhra8Acufg8AmbkaYaC86bbaXa8EfhXaYcefhYa8Na8Efg8Ncz6mbxdkkcbh8NaLhXinaXhra8Eh8AcbhCinarRbbgEaQcFeGgKaEaK6EaCcetVhCarcefhra8Acufg8AmbkaYaC:T9cFe:d9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:9ca188bbaXa8EfhXaYcefhYa8Na8Efg8Ncz6mbkkcbhrinaYaLarfRbbgC86bbaYaCaQcFeG9pfhYarcefgrcz9hmbxikkdna3ceSmbinaYcb86bbaYcefhYxbkkinaYcb86bbaYcefhYxbkkaYaX8Pbb83bbaYcwfaXcwf8Pbb83bbaYczfhYka8Mczfg8Ma8L9pgrmeaLczfhLa8KaY9RcK9pmbkkarTmlaYh5aYTmlka8Jcefg8Jal9hmbkaoc;abfakaPcufal2falzNjjjb8AaPaxfhxa5hra5mbkcbhrxdkdna8Kar9RaqalfgQcKcaawEgLaQaL0EgC9pmbcbhrxdkdnaQaL9pmbarcbaCaQ9RgQz:vjjjbaQfhrkaraoc;adfalzNjjjbalfhrdnawTmbaraoaezNjjjbaefhrkarab9Rhrxekcbhrkaoc;qwf8KjjjjbarkCbabaeadaialcdz:bjjjbk9reduaecd4gdaefgicaaica0Eabcj;abae9Uc;WFbGcjdaeca0Egifcufai9Uae2aiadfaicl4cifcd4f2fcefkmbcbabBd;C:kjjbk:Ese5u8Jjjjjbc;ae9Rgl8Kjjjjbcbhvdnaici9UgocHfae0mbabcbyd;m:kjjbgrc;GeV86bbalc;abfcFecjez:vjjjb8AalcUfgw9cu83ibalc8WfgD9cu83ibalcyfgq9cu83ibalcafgk9cu83ibalcKfgx9cu83ibalczfgm9cu83ibal9cu83iwal9cu83ibabaefc9WfhPabcefgsaofhednaiTmbcmcsarcb9kgzEhHcbhOcbhAcbhCcbhXcbhQindnaeaP9nmbcbhvxikaQcufhvadaCcdtfgLydbhKaLcwfydbhYaLclfydbh8AcbhEdndndninalc;abfavcsGcitfgoydlh3dndndnaoydbgoaK9hmba3a8ASmekdnaoa8A9hmba3aY9hmbaEcefhExekaoaY9hmea3aK9hmeaEcdfhEkaEc870mdaXcufhvaLaEciGcx2goc;i1jjbfydbcdtfydbh3aLaoc;e1jjbfydbcdtfydbh8AaLaoc;a1jjbfydbcdtfydbhKcbhodnindnalavcsGcdtfydba39hmbaohYxdkcuhYavcufhvaocefgocz9hmbkkaOa3aOSgvaYce9iaYaH9oVgoGfhOdndndncbcsavEaYaoEgvcs9hmbarce9imba3a3aAa3cefaASgvEgAcefSmecmcsavEhvkasavaEcdtc;WeGV86bbavcs9hmea3aA9Rgvcetavc8F917hvinaeavcFb0crtavcFbGV86bbaecefheavcje6hoavcr4hvaoTmbka3hAxvkcPhvasaEcdtcPV86bba3hAkavTmiavaH9omicdhocehEaQhYxlkavcufhvaEclfgEc;ab9hmbkkdnaLceaYaOSceta8AaOSEcx2gvc;a1jjbfydbcdtfydbgKTaLavc;e1jjbfydbcdtfydbg8AceSGaLavc;i1jjbfydbcdtfydbg3cdSGaOcb9hGazGg5ce9hmbaw9cu83ibaD9cu83ibaq9cu83ibak9cu83ibax9cu83ibam9cu83ibal9cu83iwal9cu83ibcbhOkcbhEaXcufgvhodnindnalaocsGcdtfydba8A9hmbaEhYxdkcuhYaocufhoaEcefgEcz9hmbkkcbhodnindnalavcsGcdtfydba39hmbaohExdkcuhEavcufhvaocefgocz9hmbkkaOaKaOSg8EfhLdndnaYcm0mbaYcefhYxekcbcsa8AaLSgvEhYaLavfhLkdndnaEcm0mbaEcefhExekcbcsa3aLSgvEhEaLavfhLkc9:cua8EEh8FcbhvaEaYcltVgacFeGhodndndninavc:W1jjbfRbbaoSmeavcefgvcz9hmbxdkka5aKaO9havcm0VVmbasavc;WeV86bbxekasa8F86bbaeaa86bbaecefhekdna8EmbaKaA9Rgvcetavc8F917hvinaeavcFb0gocrtavcFbGV86bbavcr4hvaecefheaombkaKhAkdnaYcs9hmba8AaA9Rgvcetavc8F917hvinaeavcFb0gocrtavcFbGV86bbavcr4hvaecefheaombka8AhAkdnaEcs9hmba3aA9Rgvcetavc8F917hvinaeavcFb0gocrtavcFbGV86bbavcr4hvaecefheaombka3hAkalaXcdtfaKBdbaXcefcsGhvdndnaYPzbeeeeeeeeeeeeeebekalavcdtfa8ABdbaXcdfcsGhvkdndnaEPzbeeeeeeeeeeeeeebekalavcdtfa3BdbavcefcsGhvkcihoalc;abfaQcitfgEaKBdlaEa8ABdbaQcefcsGhYcdhEavhXaLhOxekcdhoalaXcdtfa3BdbcehEaXcefcsGhXaQhYkalc;abfaYcitfgva8ABdlava3Bdbalc;abfaQaEfcsGcitfgva3BdlavaKBdbascefhsaQaofcsGhQaCcifgCai6mbkkdnaeaP9nmbcbhvxekcbhvinaeavfavc:W1jjbfRbb86bbavcefgvcz9hmbkaeab9Ravfhvkalc;aef8KjjjjbavkZeeucbhddninadcefgdc8F0meceadtae6mbkkadcrfcFeGcr9Uci2cdfabci9U2cHfkmbcbabBd;m:kjjbk:Adewu8Jjjjjbcz9Rhlcbhvdnaicvfae0mbcbhvabcbRb;m:kjjbc;qeV86bbal9cb83iwabcefhoabaefc98fhrdnaiTmbcbhwcbhDindnaoar6mbcbskadaDcdtfydbgqalcwfawaqav9Rgvavc8F91gv7av9Rc507gwcdtfgkydb9Rgvc8E91c9:Gavcdt7awVhvinaoavcFb0gecrtavcFbGV86bbavcr4hvaocefhoaembkakaqBdbaqhvaDcefgDai9hmbkkdnaoar9nmbcbskaocbBbbaoab9RclfhvkavkBeeucbhddninadcefgdc8F0meceadtae6mbkkadcwfcFeGcr9Uab2cvfk:bvli99dui99ludnaeTmbcuadcetcuftcu7:Zhvdndncuaicuftcu7:ZgoJbbbZMgr:lJbbb9p9DTmbar:Ohwxekcjjjj94hwkcbhicbhDinalclfIdbgrJbbbbJbbjZalIdbgq:lar:lMalcwfIdbgk:lMgr:varJbbbb9BEgrNhxaqarNhrdndnakJbbbb9GTmbaxhqxekJbbjZar:l:tgqaq:maxJbbbb9GEhqJbbjZax:l:tgxax:marJbbbb9GEhrkdndnalcxfIdbgxJbbj:;axJbbj:;9GEgkJbbjZakJbbjZ9FEavNJbbbZJbbb:;axJbbbb9GEMgx:lJbbb9p9DTmbax:Ohmxekcjjjj94hmkdndnaqJbbj:;aqJbbj:;9GEgxJbbjZaxJbbjZ9FEaoNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:OhPxekcjjjj94hPkdndnarJbbj:;arJbbj:;9GEgqJbbjZaqJbbjZ9FEaoNJbbbZJbbb:;arJbbbb9GEMgr:lJbbb9p9DTmbar:Ohsxekcjjjj94hskdndnadcl9hmbabaifgzas86bbazcifam86bbazcdfaw86bbazcefaP86bbxekabaDfgzas87ebazcofam87ebazclfaw87ebazcdfaP87ebkalczfhlaiclfhiaDcwfhDaecufgembkkk;hlld99eud99eudnaeTmbdndncuaicuftcu7:ZgvJbbbZMgo:lJbbb9p9DTmbao:Ohixekcjjjj94hikaic;8FiGhrinabcofcicdalclfIdb:lalIdb:l9EgialcwfIdb:lalaicdtfIdb:l9EEgialcxfIdb:lalaicdtfIdb:l9EEgiarV87ebdndnJbbj:;JbbjZalaicdtfIdbJbbbb9DEgoalaicd7cdtfIdbJ;Zl:1ZNNgwJbbj:;awJbbj:;9GEgDJbbjZaDJbbjZ9FEavNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohqxekcjjjj94hqkabcdfaq87ebdndnalaicefciGcdtfIdbJ;Zl:1ZNaoNgwJbbj:;awJbbj:;9GEgDJbbjZaDJbbjZ9FEavNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohqxekcjjjj94hqkabaq87ebdndnaoalaicufciGcdtfIdbJ;Zl:1ZNNgoJbbj:;aoJbbj:;9GEgwJbbjZawJbbjZ9FEavNJbbbZJbbb:;aoJbbbb9GEMgo:lJbbb9p9DTmbao:Ohixekcjjjj94hikabclfai87ebabcwfhbalczfhlaecufgembkkk;3viDue99eu8Jjjjjbcjd9Rgo8Kjjjjbadcd4hrdndndndnavcd9hmbadcl6meaohwarhDinawc:CuBdbawclfhwaDcufgDmbkaeTmiadcl6mdarcdthqalhkcbhxinaohwakhDarhminawawydbgPcbaDIdbgs:8cL4cFeGc:cufasJbbbb9BEgzaPaz9kEBdbaDclfhDawclfhwamcufgmmbkakaqfhkaxcefgxaeSmixbkkaeTmdxekaeTmekarcdthkavce9hhqadcl6hdcbhxindndndnaqmbadmdc:CuhDalhwarhminaDcbawIdbgs:8cL4cFeGc:cufasJbbbb9BEgPaDaP9kEhDawclfhwamcufgmmbxdkkc:CuhDdndnavPleddbdkadmdaohwalhmarhPinawcbamIdbgs:8cL4cFeGgzc;:bazc;:b0Ec:cufasJbbbb9BEBdbamclfhmawclfhwaPcufgPmbxdkkadmecbhwarhminaoawfcbalawfIdbgs:8cL4cFeGgPc8AaPc8A0Ec:cufasJbbbb9BEBdbawclfhwamcufgmmbkkadmbcbhwarhPinaDhmdnavceSmbaoawfydbhmkdndnalawfIdbgscjjj;8iamai9RcefgmcLt9R::NJbbbZJbbb:;asJbbbb9GEMgs:lJbbb9p9DTmbas:Ohzxekcjjjj94hzkabawfazcFFFrGamcKtVBdbawclfhwaPcufgPmbkkabakfhbalakfhlaxcefgxae9hmbkkaocjdf8Kjjjjbk;YqdXui998Jjjjjbc:qd9Rgv8Kjjjjbavc:Sefcbc;Kbz:vjjjb8AcbhodnadTmbcbhoaiTmbdndnabaeSmbaehrxekavcuadcdtgwadcFFFFi0Ecbyd;u:kjjbHjjjjbbgrBd:SeavceBd:mdaraeawzNjjjb8Akavc:GefcwfcbBdbav9cb83i:Geavc:Gefaradaiavc:Sefz:ojjjbavyd:GehDadci9Ugqcbyd;u:kjjbHjjjjbbheavc:Sefavyd:mdgkcdtfaeBdbavakcefgwBd:mdaecbaqz:vjjjbhxavc:SefawcdtfcuaicdtaicFFFFi0Ecbyd;u:kjjbHjjjjbbgmBdbavakcdfgPBd:mdalc;ebfhsaDheamhwinawalIdbasaeydbgzcwazcw6EcdtfIdbMUdbaeclfheawclfhwaicufgimbkavc:SefaPcdtfcuaqcdtadcFFFF970Ecbyd;u:kjjbHjjjjbbgPBdbdnadci6mbarheaPhwaqhiinawamaeydbcdtfIdbamaeclfydbcdtfIdbMamaecwfydbcdtfIdbMUdbaecxfheawclfhwaicufgimbkkakcifhoalc;ebfhHavc;qbfhOavheavyd:KehAavyd:OehCcbhzcbhwcbhXcehQinaehLcihkarawci2gKcdtfgeydbhsaeclfydbhdabaXcx2fgicwfaecwfydbgYBdbaiclfadBdbaiasBdbaxawfce86bbaOaYBdwaOadBdlaOasBdbaPawcdtfcbBdbdnazTmbcihkaLhiinaOakcdtfaiydbgeBdbakaeaY9haeas9haead9hGGfhkaiclfhiazcufgzmbkkaXcefhXcbhzinaCaAarazaKfcdtfydbcdtgifydbcdtfgYheaDaifgdydbgshidnasTmbdninaeydbawSmeaeclfheaicufgiTmdxbkkaeaYascdtfc98fydbBdbadadydbcufBdbkazcefgzci9hmbkdndnakTmbcuhwJbbbbh8Acbhdavyd:KehYavyd:OehKindndnaDaOadcdtfydbcdtgzfydbgembadcefhdxekadcs0hiamazfgsIdbhEasalcbadcefgdaiEcdtfIdbaHaecwaecw6EcdtfIdbMg3Udba3aE:th3aecdthiaKaYazfydbcdtfheinaPaeydbgzcdtfgsa3asIdbMgEUdbaEa8Aa8AaE9DgsEh8AazawasEhwaeclfheaic98fgimbkkadak9hmbkawcu9hmekaQaq9pmdindnaxaQfRbbmbaQhwxdkaqaQcefgQ9hmbxikkakczakcz6EhzaOheaLhOawcu9hmbkkaocdtavc:Seffc98fhedninaoTmeaeydbcbyd;q:kjjbH:bjjjbbaec98fheaocufhoxbkkavc:qdf8Kjjjjbk;IlevucuaicdtgvaicFFFFi0Egocbyd;u:kjjbHjjjjbbhralalyd9GgwcdtfarBdbalawcefBd9GabarBdbaocbyd;u:kjjbHjjjjbbhralalyd9GgocdtfarBdbalaocefBd9GabarBdlcuadcdtadcFFFFi0Ecbyd;u:kjjbHjjjjbbhralalyd9GgocdtfarBdbalaocefBd9GabarBdwabydbcbavz:vjjjb8Aadci9UhDdnadTmbabydbhoaehladhrinaoalydbcdtfgvavydbcefBdbalclfhlarcufgrmbkkdnaiTmbabydbhlabydlhrcbhvaihoinaravBdbarclfhralydbavfhvalclfhlaocufgombkkdnadci6mbabydlhrabydwhvcbhlinaecwfydbhoaeclfydbhdaraeydbcdtfgwawydbgwcefBdbavawcdtfalBdbaradcdtfgdadydbgdcefBdbavadcdtfalBdbaraocdtfgoaoydbgocefBdbavaocdtfalBdbaecxfheaDalcefgl9hmbkkdnaiTmbabydlheabydbhlinaeaeydbalydb9RBdbalclfhlaeclfheaicufgimbkkkQbabaeadaic;K1jjbz:njjjbkQbabaeadaic;m:jjjbz:njjjbk9DeeuabcFeaicdtz:vjjjbhlcbhbdnadTmbindnalaeydbcdtfgiydbcu9hmbaiabBdbabcefhbkaeclfheadcufgdmbkkabk;:kivuo99lu8Jjjjjbcj;Hb9Rgl8Kjjjjbcbhvalc:m;Gbfcbc;Kbz:vjjjb8AalcuadcdtadcFFFFi0Egocbyd;u:kjjbHjjjjbbgrBd:m9GalceBd;S9Galcwfcbyd:8:kjjbBdbalcb8Pd:0:kjjb83ibalc;W;Gbfcwfcbyd;i:kjjbBdbalcb8Pd;a:kjjb83i;W9Gaicd4hwdndnadmbJFFuFhDJFFuuhqJFFuuhkJFFuFhxJFFuuhmJFFuFhPxekawcdthsaehzincbhiinalaifgHazaifIdbgDaHIdbgxaxaD9EEUdbalc;W;GbfaifgHaDaHIdbgxaxaD9DEUdbaiclfgicx9hmbkazasfhzavcefgvad9hmbkalIdwhqalId;49GhDalIdlhkalId;09GhxalIdbhmalId;W9GhPkdndnadTmbJbbbbJbbjZJbbbbaPam:tgPaPJbbbb9DEgPaxak:tgxaxaP9DEgxaDaq:tgDaDax9DEgD:vaDJbbbb9BEhDawcdthsarhHadhzindndnaDaeIdbam:tNJb;au9eNJbbbZMgx:lJbbb9p9DTmbax:Ohixekcjjjj94hikaicztaicwtcj;GiGVaicsGVc:p;G:dKGcH2c;d;H:WKGcv2c;j:KM;jbGhvdndnaDaeclfIdbak:tNJb;au9eNJbbbZMgx:lJbbb9p9DTmbax:Ohixekcjjjj94hikaicztaicwtcj;GiGVaicsGVc:p;G:dKGcH2c;d;H:WKGcq2cM;j:KMeGavVhvdndnaDaecwfIdbaq:tNJb;au9eNJbbbZMgx:lJbbb9p9DTmbax:Ohixekcjjjj94hikaHavaicztaicwtcj;GiGVaicsGVc:p;G:dKGcH2c;d;H:WKGcC2c:KM;j:KdGVBdbaeasfheaHclfhHazcufgzmbkalcbcj;Gbz:vjjjbhiarhHadheinaiaHydbgzcFrGcx2fgvavydbcefBdbaiazcq4cFrGcx2fgvavydlcefBdlaiazcC4cFrGcx2fgzazydwcefBdwaHclfhHaecufgembxdkkalcbcj;Gbz:vjjjb8AkcbhHcbhzcbhecbhvinalaHfgiydbhsaiazBdbaicwfgwydbhOawavBdbaiclfgiydbhwaiaeBdbasazfhzaOavfhvawaefheaHcxfgHcj;Gb9hmbkcbhHalaocbyd;u:kjjbHjjjjbbgiBd:q9GdnadTmbabhzinazaHBdbazclfhzadaHcefgH9hmbkabhHadhzinalaraHydbgecdtfydbcFrGcx2fgvavydbgvcefBdbaiavcdtfaeBdbaHclfhHazcufgzmbkaihHadhzinalaraHydbgecdtfydbcq4cFrGcx2fgvavydlgvcefBdlabavcdtfaeBdbaHclfhHazcufgzmbkabhHadhzinalaraHydbgecdtfydbcC4cFrGcx2fgvavydwgvcefBdwaiavcdtfaeBdbaHclfhHazcufgzmbkcbhHinabaiydbcdtfaHBdbaiclfhiadaHcefgH9hmbkkclhidninaic98Smealc:m;Gbfaifydbcbyd;q:kjjbH:bjjjbbaic98fhixbkkalcj;Hbf8Kjjjjbk9teiucbcbyd;y:kjjbgeabcifc98GfgbBd;y:kjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;teeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk:3eedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdxaialBdwaialBdlaialBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabk9teiucbcbyd;y:kjjbgeabcrfc94GfgbBd;y:kjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik9:eiuZbhedndncbyd;y:kjjbgdaecztgi9nmbcuheadai9RcFFifcz4nbcuSmekadhekcbabae9Rcifc98Gcbyd;y:kjjbfgdBd;y:kjjbdnadZbcztge9nmbadae9RcFFifcz4nb8Akkk;Qddbcjwk;mdbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbbbbbbbbbbbbb4:h9w9N94:P:gW:j9O:ye9Pbbbbbbebbbdbbbebbbdbbbbbbbdbbbbbbbebbbbbbb:l29hZ;69:9kZ;N;76Z;rg97Z;z;o9xZ8J;B85Z;:;u9yZ;b;k9HZ:2;Z9DZ9e:l9mZ59A8KZ:r;T3Z:A:zYZ79OHZ;j4::8::Y:D9V8:bbbb9s:49:Z8R:hBZ9M9M;M8:L;z;o8:;8:PG89q;x:J878R:hQ8::M:B;e87bbbbbbjZbbjZbbjZ:E;V;N8::Y:DsZ9i;H;68:xd;R8:;h0838:;W:NoZbbbb:WV9O8:uf888:9i;H;68:9c9G;L89;n;m9m89;D8Ko8:bbbbf:8tZ9m836ZS:2AZL;zPZZ818EZ9e:lxZ;U98F8:819E;68:FFuuFFuuFFuuFFuFFFuFFFuFbc;mqkzebbbebbbdbbb9G:vbb";
    var wasmpack = new Uint8Array([
        32,
        0,
        65,
        2,
        1,
        106,
        34,
        33,
        3,
        128,
        11,
        4,
        13,
        64,
        6,
        253,
        10,
        7,
        15,
        116,
        127,
        5,
        8,
        12,
        40,
        16,
        19,
        54,
        20,
        9,
        27,
        255,
        113,
        17,
        42,
        67,
        24,
        23,
        146,
        148,
        18,
        14,
        22,
        45,
        70,
        69,
        56,
        114,
        101,
        21,
        25,
        63,
        75,
        136,
        108,
        28,
        118,
        29,
        73,
        115
    ]);
    if (typeof WebAssembly !== "object") {
        return {
            supported: false
        };
    }
    var instance2;
    var ready = WebAssembly.instantiate(unpack(wasm), {}).then(function (result) {
        instance2 = result.instance;
        instance2.exports.__wasm_call_ctors();
        instance2.exports.meshopt_encodeVertexVersion(0);
        instance2.exports.meshopt_encodeIndexVersion(1);
    });
    function unpack(data) {
        var result = new Uint8Array(data.length);
        for (var i = 0; i < data.length; ++i) {
            var ch = data.charCodeAt(i);
            result[i] = ch > 96 ? ch - 97 : ch > 64 ? ch - 39 : ch + 4;
        }
        var write = 0;
        for (var i = 0; i < data.length; ++i) {
            result[write++] = result[i] < 60 ? wasmpack[result[i]] : (result[i] - 60) * 64 + result[++i];
        }
        return result.buffer.slice(0, write);
    }
    function assert(cond) {
        if (!cond) {
            throw new Error("Assertion failed");
        }
    }
    function bytes(view) {
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    function reorder2(fun, indices, vertices, optf) {
        var sbrk = instance2.exports.sbrk;
        var ip = sbrk(indices.length * 4);
        var rp = sbrk(vertices * 4);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        var indices8 = bytes(indices);
        heap.set(indices8, ip);
        if (optf) {
            optf(ip, ip, indices.length, vertices);
        }
        var unique = fun(rp, ip, indices.length, vertices);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var remap2 = new Uint32Array(vertices);
        new Uint8Array(remap2.buffer).set(heap.subarray(rp, rp + vertices * 4));
        indices8.set(heap.subarray(ip, ip + indices.length * 4));
        sbrk(ip - sbrk(0));
        for (var i = 0; i < indices.length; ++i)
            indices[i] = remap2[indices[i]];
        return [remap2, unique];
    }
    function spatialsort(fun, positions, count, stride) {
        var sbrk = instance2.exports.sbrk;
        var ip = sbrk(count * 4);
        var sp = sbrk(count * stride);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(positions), sp);
        fun(ip, sp, count, stride);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var remap2 = new Uint32Array(count);
        new Uint8Array(remap2.buffer).set(heap.subarray(ip, ip + count * 4));
        sbrk(ip - sbrk(0));
        return remap2;
    }
    function encode(fun, bound, source, count, size) {
        var sbrk = instance2.exports.sbrk;
        var tp = sbrk(bound);
        var sp = sbrk(count * size);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(source), sp);
        var res = fun(tp, bound, sp, count, size);
        var target = new Uint8Array(res);
        target.set(heap.subarray(tp, tp + res));
        sbrk(tp - sbrk(0));
        return target;
    }
    function maxindex(source) {
        var result = 0;
        for (var i = 0; i < source.length; ++i) {
            var index = source[i];
            result = result < index ? index : result;
        }
        return result;
    }
    function index32(source, size) {
        assert(size == 2 || size == 4);
        if (size == 4) {
            return new Uint32Array(source.buffer, source.byteOffset, source.byteLength / 4);
        }
        else {
            var view = new Uint16Array(source.buffer, source.byteOffset, source.byteLength / 2);
            return new Uint32Array(view);
        }
    }
    function filter(fun, source, count, stride, bits, insize, mode) {
        var sbrk = instance2.exports.sbrk;
        var tp = sbrk(count * stride);
        var sp = sbrk(count * insize);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(source), sp);
        fun(tp, count, stride, bits, sp, mode);
        var target = new Uint8Array(count * stride);
        target.set(heap.subarray(tp, tp + count * stride));
        sbrk(tp - sbrk(0));
        return target;
    }
    return {
        ready,
        supported: true,
        reorderMesh: function (indices, triangles, optsize) {
            var optf = triangles ? optsize ? instance2.exports.meshopt_optimizeVertexCacheStrip : instance2.exports.meshopt_optimizeVertexCache : void 0;
            return reorder2(instance2.exports.meshopt_optimizeVertexFetchRemap, indices, maxindex(indices) + 1, optf);
        },
        reorderPoints: function (positions, positions_stride) {
            assert(positions instanceof Float32Array);
            assert(positions.length % positions_stride == 0);
            assert(positions_stride >= 3);
            return spatialsort(instance2.exports.meshopt_spatialSortRemap, positions, positions.length / positions_stride, positions_stride * 4);
        },
        encodeVertexBuffer: function (source, count, size) {
            assert(size > 0 && size <= 256);
            assert(size % 4 == 0);
            var bound = instance2.exports.meshopt_encodeVertexBufferBound(count, size);
            return encode(instance2.exports.meshopt_encodeVertexBuffer, bound, source, count, size);
        },
        encodeIndexBuffer: function (source, count, size) {
            assert(size == 2 || size == 4);
            assert(count % 3 == 0);
            var indices = index32(source, size);
            var bound = instance2.exports.meshopt_encodeIndexBufferBound(count, maxindex(indices) + 1);
            return encode(instance2.exports.meshopt_encodeIndexBuffer, bound, indices, count, 4);
        },
        encodeIndexSequence: function (source, count, size) {
            assert(size == 2 || size == 4);
            var indices = index32(source, size);
            var bound = instance2.exports.meshopt_encodeIndexSequenceBound(count, maxindex(indices) + 1);
            return encode(instance2.exports.meshopt_encodeIndexSequence, bound, indices, count, 4);
        },
        encodeGltfBuffer: function (source, count, size, mode) {
            var table = {
                ATTRIBUTES: this.encodeVertexBuffer,
                TRIANGLES: this.encodeIndexBuffer,
                INDICES: this.encodeIndexSequence
            };
            assert(table[mode]);
            return table[mode](source, count, size);
        },
        encodeFilterOct: function (source, count, stride, bits) {
            assert(stride == 4 || stride == 8);
            assert(bits >= 1 && bits <= 16);
            return filter(instance2.exports.meshopt_encodeFilterOct, source, count, stride, bits, 16);
        },
        encodeFilterQuat: function (source, count, stride, bits) {
            assert(stride == 8);
            assert(bits >= 4 && bits <= 16);
            return filter(instance2.exports.meshopt_encodeFilterQuat, source, count, stride, bits, 16);
        },
        encodeFilterExp: function (source, count, stride, bits, mode) {
            assert(stride > 0 && stride % 4 == 0);
            assert(bits >= 1 && bits <= 24);
            var table = {
                Separate: 0,
                SharedVector: 1,
                SharedComponent: 2,
                Clamped: 3
            };
            return filter(instance2.exports.meshopt_encodeFilterExp, source, count, stride, bits, stride, mode ? table[mode] : 1);
        }
    };
}();
var MeshoptDecoder = function () {
    var wasm_base = "b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuikqbeeedddillviebeoweuec:W:Odkr;leDo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949Wbol79IV9Rbrq:986qdbk;jYi5ud9:du8Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxcj;abad9Uc;WFbGcjdadca0EhmaialfgPar9Rgoadfhsavaoadz1jjjbgzceVhHcbhOdndninaeaO9nmeaPax9RaD6mdamaeaO9RaOamfgoae6EgAcsfglc9WGhCabaOad2fhXaAcethQaxaDfhiaOaeaoaeao6E9RhLalcl4cifcd4hKazcj;cbfaAfhYcbh8AazcjdfhEaHh3incbhodnawTmbaxa8Acd4fRbbhokaocFeGh5cbh8Eazcj;cbfhqinaih8Fdndndndna5a8Ecet4ciGgoc9:fPdebdkaPa8F9RaA6mrazcj;cbfa8EaA2fa8FaAz1jjjb8Aa8FaAfhixdkazcj;cbfa8EaA2fcbaAz:jjjjb8Aa8FhixekaPa8F9RaK6mva8FaKfhidnaCTmbaPai9RcK6mbaocdtc:q1jjbfcj1jjbawEhaczhrcbhlinargoc9Wfghaqfhrdndndndndndnaaa8Fahco4fRbbalcoG4ciGcdtfydbPDbedvivvvlvkar9cb83bbarcwf9cb83bbxlkarcbaiRbdai8Xbb9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbaqaofgrcGfag9c8F1:NghcKtc8F91aicdfa8J9c8N1:Nfg8KRbbG86bbarcVfcba8KahcjeGcr4fghRbbag9cjjjjjl:dg8J9qE86bbarc7fcbaha8J9c8L1:NfghRbbag9cjjjjjd:dg8J9qE86bbarctfcbaha8J9c8K1:NfghRbbag9cjjjjje:dg8J9qE86bbarc91fcbaha8J9c8J1:NfghRbbag9cjjjj;ab:dg8J9qE86bbarc4fcbaha8J9cg1:NfghRbbag9cjjjja:dg8J9qE86bbarc93fcbaha8J9ch1:NfghRbbag9cjjjjz:dgg9qE86bbarc94fcbahag9ca1:NfghRbbai8Xbe9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbarc95fag9c8F1:NgicKtc8F91aha8J9c8N1:NfghRbbG86bbarc96fcbahaicjeGcr4fgiRbbag9cjjjjjl:dg8J9qE86bbarc97fcbaia8J9c8L1:NfgiRbbag9cjjjjjd:dg8J9qE86bbarc98fcbaia8J9c8K1:NfgiRbbag9cjjjjje:dg8J9qE86bbarc99fcbaia8J9c8J1:NfgiRbbag9cjjjj;ab:dg8J9qE86bbarc9:fcbaia8J9cg1:NfgiRbbag9cjjjja:dg8J9qE86bbarcufcbaia8J9ch1:NfgiRbbag9cjjjjz:dgg9qE86bbaiag9ca1:NfhixikaraiRblaiRbbghco4g8Ka8KciSg8KE86bbaqaofgrcGfaiclfa8Kfg8KRbbahcl4ciGg8La8LciSg8LE86bbarcVfa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc7fa8Ka8Lfg8KRbbahciGghahciSghE86bbarctfa8Kahfg8KRbbaiRbeghco4g8La8LciSg8LE86bbarc91fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc4fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc93fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc94fa8Kahfg8KRbbaiRbdghco4g8La8LciSg8LE86bbarc95fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc96fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc97fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc98fa8KahfghRbbaiRbigico4g8Ka8KciSg8KE86bbarc99faha8KfghRbbaicl4ciGg8Ka8KciSg8KE86bbarc9:faha8KfghRbbaicd4ciGg8Ka8KciSg8KE86bbarcufaha8KfgrRbbaiciGgiaiciSgiE86bbaraifhixdkaraiRbwaiRbbghcl4g8Ka8KcsSg8KE86bbaqaofgrcGfaicwfa8Kfg8KRbbahcsGghahcsSghE86bbarcVfa8KahfghRbbaiRbeg8Kcl4g8La8LcsSg8LE86bbarc7faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarctfaha8KfghRbbaiRbdg8Kcl4g8La8LcsSg8LE86bbarc91faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc4faha8KfghRbbaiRbig8Kcl4g8La8LcsSg8LE86bbarc93faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc94faha8KfghRbbaiRblg8Kcl4g8La8LcsSg8LE86bbarc95faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc96faha8KfghRbbaiRbvg8Kcl4g8La8LcsSg8LE86bbarc97faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc98faha8KfghRbbaiRbog8Kcl4g8La8LcsSg8LE86bbarc99faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc9:faha8KfghRbbaiRbrgicl4g8Ka8KcsSg8KE86bbarcufaha8KfgrRbbaicsGgiaicsSgiE86bbaraifhixekarai8Pbb83bbarcwfaicwf8Pbb83bbaiczfhikdnaoaC9pmbalcdfhlaoczfhraPai9RcL0mekkaoaC6moaimexokaCmva8FTmvkaqaAfhqa8Ecefg8Ecl9hmbkdndndndnawTmbasa8Acd4fRbbgociGPlbedrbkaATmdaza8Afh8Fazcj;cbfhhcbh8EaEhaina8FRbbhraahocbhlinaoahalfRbbgqce4cbaqceG9R7arfgr86bbaoadfhoaAalcefgl9hmbkaacefhaa8Fcefh8FahaAfhha8Ecefg8Ecl9hmbxikkaATmeaza8Afhaazcj;cbfhhcbhoceh8EaYh8FinaEaofhlaa8Vbbhrcbhoinala8FaofRbbcwtahaofRbbgqVc;:FiGce4cbaqceG9R7arfgr87bbaladfhlaLaocefgofmbka8FaQfh8FcdhoaacdfhaahaQfhha8EceGhlcbh8EalmbxdkkaATmbcbaocl49Rh8Eaza8AfRbbhqcwhoa3hlinalRbbaotaqVhqalcefhlaocwfgoca9hmbkcbhhaEh8FaYhainazcj;cbfahfRbbhrcwhoaahlinalRbbaotarVhralaAfhlaocwfgoca9hmbkara8E93aq7hqcbhoa8Fhlinalaqao486bbalcefhlaocwfgoca9hmbka8Fadfh8FaacefhaahcefghaA9hmbkkaEclfhEa3clfh3a8Aclfg8Aad6mbkaXazcjdfaAad2z1jjjb8AazazcjdfaAcufad2fadz1jjjb8AaAaOfhOaihxaimbkc9:hoxdkcbc99aPax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaok;cseHu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnaeci9UgrcHfal0mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgwce0mbavc;abfcFecjez:jjjjb8AavcUf9cu83ibavc8Wf9cu83ibavcyf9cu83ibavcaf9cu83ibavcKf9cu83ibavczf9cu83ibav9cu83iwav9cu83ibaialfc9WfhDaicefgqarfhidnaeTmbcmcsawceSEhkcbhxcbhmcbhPcbhwcbhlindnaiaD9nmbc9:hoxikdndnaqRbbgoc;Ve0mbavc;abfalaocu7gscl4fcsGcitfgzydlhrazydbhzdnaocsGgHak9pmbavawasfcsGcdtfydbaxaHEhoaHThsdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkaxasfhxcdhHavawcdtfaoBdbawasfhwcehsalhOxdkdndnaHcsSmbaHc987aHamffcefhoxekaicefhoai8SbbgHcFeGhsdndnaHcu9mmbaohixekaicvfhiascFbGhscrhHdninao8SbbgOcFbGaHtasVhsaOcu9kmeaocefhoaHcrfgHc8J9hmbxdkkaocefhikasce4cbasceG9R7amfhokdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkcdhHavawcdtfaoBdbcehsawcefhwalhOaohmxekdnaocpe0mbaxcefgHavawaDaocsGfRbbgocl49RcsGcdtfydbaocz6gzEhravawao9RcsGcdtfydbaHazfgAaocsGgHEhoaHThCdndnadcd9hmbabaPcetfgHax87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHaxBdbaHcwfaoBdbaHclfarBdbkcdhsavawcdtfaxBdbavawcefgwcsGcdtfarBdbcihHavc;abfalcitfgOaxBdlaOarBdbavawazfgwcsGcdtfaoBdbalcefcsGhOawaCfhwaxhzaAaCfhxxekaxcbaiRbbgOEgzaoc;:eSgHfhraOcsGhCaOcl4hAdndnaOcs0mbarcefhoxekarhoavawaA9RcsGcdtfydbhrkdndnaCmbaocefhxxekaohxavawaO9RcsGcdtfydbhokdndnaHTmbaicefhHxekaicdfhHai8SbegscFeGhzdnascu9kmbaicofhXazcFbGhzcrhidninaH8SbbgscFbGaitazVhzascu9kmeaHcefhHaicrfgic8J9hmbkaXhHxekaHcefhHkazce4cbazceG9R7amfgmhzkdndnaAcsSmbaHhsxekaHcefhsaH8SbbgicFeGhrdnaicu9kmbaHcvfhXarcFbGhrcrhidninas8SbbgHcFbGaitarVhraHcu9kmeascefhsaicrfgic8J9hmbkaXhsxekascefhskarce4cbarceG9R7amfgmhrkdndnaCcsSmbashixekascefhias8SbbgocFeGhHdnaocu9kmbascvfhXaHcFbGhHcrhodninai8SbbgscFbGaotaHVhHascu9kmeaicefhiaocrfgoc8J9hmbkaXhixekaicefhikaHce4cbaHceG9R7amfgmhokdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkcdhsavawcdtfazBdbavawcefgwcsGcdtfarBdbcihHavc;abfalcitfgXazBdlaXarBdbavawaOcz6aAcsSVfgwcsGcdtfaoBdbawaCTaCcsSVfhwalcefcsGhOkaqcefhqavc;abfaOcitfgOarBdlaOaoBdbavc;abfalasfcsGcitfgraoBdlarazBdbawcsGhwalaHfcsGhlaPcifgPae6mbkkcbc99aiaDSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnaecvfal9nmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk;oiliui99iue99dnaeTmbcbhiabhlindndnJ;Zl81Zalcof8UebgvciV:Y:vgoal8Ueb:YNgrJb;:FSNJbbbZJbbb:;arJbbbb9GEMgw:lJbbb9p9DTmbaw:OhDxekcjjjj94hDkalclf8Uebhqalcdf8UebhkabaiavcefciGfcetfaD87ebdndnaoak:YNgwJb;:FSNJbbbZJbbb:;awJbbbb9GEMgx:lJbbb9p9DTmbax:OhDxekcjjjj94hDkabaiavciGfgkcd7cetfaD87ebdndnaoaq:YNgoJb;:FSNJbbbZJbbb:;aoJbbbb9GEMgx:lJbbb9p9DTmbax:OhDxekcjjjj94hDkabaiavcufciGfcetfaD87ebdndnJbbjZararN:tawawN:taoaoN:tgrJbbbbarJbbbb9GE:rJb;:FSNJbbbZMgr:lJbbb9p9DTmbar:Ohvxekcjjjj94hvkabakcetfav87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2gdTmbinababydbgecwtcw91:Yaece91cjjj98Gcjjj;8if::NUdbabclfhbadcufgdmbkkk9teiucbcbyd:K1jjbgeabcifc98GfgbBd:K1jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;teeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk:3eedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdxaialBdwaialBdlaialBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkk81dbcjwk8Kbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbc:Kwkl8WNbb";
    var wasm_simd = "b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuikqbbebeedddilve9Weeeviebeoweuec:q:6dkr;leDo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949Wbwl79IV9RbDq;X9Mqlbzik9:evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaec:q:yjjbfai86bbaecitc:q1jjbfab8Piw83ibaecefgecjd9hmbkk:183lYud97dur978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxavaialfgmar9Rgoad;8qbbcj;abad9Uc;WFbGcjdadca0EhPdndndnadTmbaoadfhscbhzinaeaz9nmdamax9RaD6miabazad2fhHaxaDfhOaPaeaz9RazaPfae6EgAcsfgocl4cifcd4hCavcj;cbfaoc9WGgXcetfhQavcj;cbfaXci2fhLavcj;cbfaXfhKcbhYaoc;ab6h8AincbhodnawTmbaxaYcd4fRbbhokaocFeGhEcbh3avcj;cbfh5indndndndnaEa3cet4ciGgoc9:fPdebdkamaO9RaX6mwavcj;cbfa3aX2faOaX;8qbbaOaAfhOxdkavcj;cbfa3aX2fcbaX;8kbxekamaO9RaC6moaoclVcbawEhraOaCfhocbhidna8Ambamao9Rc;Gb6mbcbhlina5alfhidndndndndndnaOalco4fRbbgqciGarfPDbedibledibkaipxbbbbbbbbbbbbbbbbpklbxlkaiaopbblaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLg8Ecdp:mea8EpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9og8Fpxiiiiiiiiiiiiiiiip8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaoclffahc:q:yjjbfRbbfhoxikaiaopbbwaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9og8Fpxssssssssssssssssp8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaocwffahc:q:yjjbfRbbfhoxdkaiaopbbbpklbaoczfhoxekaiaopbbdaoRbbgacitc:q1jjbfpbibaac:q:yjjbfRbbgapsaoRbeghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPpklbaaaocdffahc:q:yjjbfRbbfhokdndndndndndnaqcd4ciGarfPDbedibledibkaiczfpxbbbbbbbbbbbbbbbbpklbxlkaiczfaopbblaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLg8Ecdp:mea8EpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9og8Fpxiiiiiiiiiiiiiiiip8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaoclffahc:q:yjjbfRbbfhoxikaiczfaopbbwaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9og8Fpxssssssssssssssssp8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaocwffahc:q:yjjbfRbbfhoxdkaiczfaopbbbpklbaoczfhoxekaiczfaopbbdaoRbbgacitc:q1jjbfpbibaac:q:yjjbfRbbgapsaoRbeghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPpklbaaaocdffahc:q:yjjbfRbbfhokdndndndndndnaqcl4ciGarfPDbedibledibkaicafpxbbbbbbbbbbbbbbbbpklbxlkaicafaopbblaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLg8Ecdp:mea8EpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9og8Fpxiiiiiiiiiiiiiiiip8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaoclffahc:q:yjjbfRbbfhoxikaicafaopbbwaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9og8Fpxssssssssssssssssp8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaaaocwffahc:q:yjjbfRbbfhoxdkaicafaopbbbpklbaoczfhoxekaicafaopbbdaoRbbgacitc:q1jjbfpbibaac:q:yjjbfRbbgapsaoRbeghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPpklbaaaocdffahc:q:yjjbfRbbfhokdndndndndndnaqco4arfPDbedibledibkaic8Wfpxbbbbbbbbbbbbbbbbpklbxlkaic8Wfaopbblaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLg8Ecdp:mea8EpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9og8Fpxiiiiiiiiiiiiiiiip8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngicitc:q1jjbfpbibaic:q:yjjbfRbbgipsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaiaoclffaqc:q:yjjbfRbbfhoxikaic8Wfaopbbwaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9og8Fpxssssssssssssssssp8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngicitc:q1jjbfpbibaic:q:yjjbfRbbgipsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spklbaiaocwffaqc:q:yjjbfRbbfhoxdkaic8Wfaopbbbpklbaoczfhoxekaic8WfaopbbdaoRbbgicitc:q1jjbfpbibaic:q:yjjbfRbbgipsaoRbegqcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPpklbaiaocdffaqc:q:yjjbfRbbfhokalc;abfhialcjefaX0meaihlamao9Rc;Fb0mbkkdnaiaX9pmbaici4hlinamao9RcK6mwa5aifhqdndndndndndnaOaico4fRbbalcoG4ciGarfPDbedibledibkaqpxbbbbbbbbbbbbbbbbpkbbxlkaqaopbblaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLg8Ecdp:mea8EpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9og8Fpxiiiiiiiiiiiiiiiip8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spkbbaaaoclffahc:q:yjjbfRbbfhoxikaqaopbbwaopbbbg8Eclp:mea8EpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9og8Fpxssssssssssssssssp8Jg8Ep5b9cjF;8;4;W;G;ab9:9cU1:Ngacitc:q1jjbfpbibaac:q:yjjbfRbbgapsa8Ep5e9cjF;8;4;W;G;ab9:9cU1:Nghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPa8Fa8Ep9spkbbaaaocwffahc:q:yjjbfRbbfhoxdkaqaopbbbpkbbaoczfhoxekaqaopbbdaoRbbgacitc:q1jjbfpbibaac:q:yjjbfRbbgapsaoRbeghcitc:q1jjbfpbibp9UpmbedilvorzHOACXQLpPpkbbaaaocdffahc:q:yjjbfRbbfhokalcdfhlaiczfgiaX6mbkkaohOaoTmoka5aXfh5a3cefg3cl9hmbkdndndndnawTmbasaYcd4fRbbglciGPlbedwbkaXTmdavcjdfaYfhlavaYfpbdbhgcbhoinalavcj;cbfaofpblbg8JaKaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaQaofpblbg8MaLaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Ecep9Ta8Epxeeeeeeeeeeeeeeeeg8Fp9op9Hp9rg8Eagp9Uggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp9Uggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp9Uggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp9Uggp9Abbbaladfglaga8LaypmwDKYqk8AExm35Ps8E8Fg8Ecep9Ta8Ea8Fp9op9Hp9rg8Ep9Uggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp9Uggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp9Uggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp9Uggp9Abbbaladfglaga8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Ecep9Ta8Ea8Fp9op9Hp9rg8Ep9Uggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp9Uggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp9Uggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp9Uggp9Abbbaladfglaga8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Ecep9Ta8Ea8Fp9op9Hp9rg8Ep9Ug8Fp9Abbbaladfgla8Fa8Ea8Epmlvorlvorlvorlvorp9Ug8Fp9Abbbaladfgla8Fa8Ea8EpmwDqkwDqkwDqkwDqkp9Ug8Fp9Abbbaladfgla8Fa8Ea8EpmxmPsxmPsxmPsxmPsp9Uggp9AbbbaladfhlaoczfgoaX6mbxikkaXTmeavcjdfaYfhlavaYfpbdbhgcbhoinalavcj;cbfaofpblbg8JaKaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaQaofpblbg8MaLaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Ecep:nea8Epxebebebebebebebebg8Fp9op:bep9rg8Eagp:oeggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp:oeggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp:oeggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp:oeggp9Abbbaladfglaga8LaypmwDKYqk8AExm35Ps8E8Fg8Ecep:nea8Ea8Fp9op:bep9rg8Ep:oeggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp:oeggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp:oeggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp:oeggp9Abbbaladfglaga8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Ecep:nea8Ea8Fp9op:bep9rg8Ep:oeggp9Abbbaladfglaga8Ea8Epmlvorlvorlvorlvorp:oeggp9Abbbaladfglaga8Ea8EpmwDqkwDqkwDqkwDqkp:oeggp9Abbbaladfglaga8Ea8EpmxmPsxmPsxmPsxmPsp:oeggp9Abbbaladfglaga8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Ecep:nea8Ea8Fp9op:bep9rg8Ep:oeg8Fp9Abbbaladfgla8Fa8Ea8Epmlvorlvorlvorlvorp:oeg8Fp9Abbbaladfgla8Fa8Ea8EpmwDqkwDqkwDqkwDqkp:oeg8Fp9Abbbaladfgla8Fa8Ea8EpmxmPsxmPsxmPsxmPsp:oeggp9AbbbaladfhlaoczfgoaX6mbxdkkaXTmbcbhocbalcl4gl9Rc8FGhiavcjdfaYfhravaYfpbdbh8Finaravcj;cbfaofpblbggaKaofpblbg8JpmbzeHdOiAlCvXoQrLg8KaQaofpblbg8LaLaofpblbg8MpmbzeHdOiAlCvXoQrLg8NpmbezHdiOAlvCXorQLg8Eaip:Rea8Ealp:Sep9qg8Ea8Fp9rg8Fp9Abbbaradfgra8Fa8Ea8Epmlvorlvorlvorlvorp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmwDqkwDqkwDqkwDqkp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmxmPsxmPsxmPsxmPsp9rg8Fp9Abbbaradfgra8Fa8Ka8NpmwDKYqk8AExm35Ps8E8Fg8Eaip:Rea8Ealp:Sep9qg8Ep9rg8Fp9Abbbaradfgra8Fa8Ea8Epmlvorlvorlvorlvorp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmwDqkwDqkwDqkwDqkp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmxmPsxmPsxmPsxmPsp9rg8Fp9Abbbaradfgra8Faga8JpmwKDYq8AkEx3m5P8Es8Fgga8La8MpmwKDYq8AkEx3m5P8Es8Fg8JpmbezHdiOAlvCXorQLg8Eaip:Rea8Ealp:Sep9qg8Ep9rg8Fp9Abbbaradfgra8Fa8Ea8Epmlvorlvorlvorlvorp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmwDqkwDqkwDqkwDqkp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmxmPsxmPsxmPsxmPsp9rg8Fp9Abbbaradfgra8Faga8JpmwDKYqk8AExm35Ps8E8Fg8Eaip:Rea8Ealp:Sep9qg8Ep9rg8Fp9Abbbaradfgra8Fa8Ea8Epmlvorlvorlvorlvorp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmwDqkwDqkwDqkwDqkp9rg8Fp9Abbbaradfgra8Fa8Ea8EpmxmPsxmPsxmPsxmPsp9rg8Fp9AbbbaradfhraoczfgoaX6mbkkaYclfgYad6mbkaHavcjdfaAad2;8qbbavavcjdfaAcufad2fad;8qbbaAazfhzc9:hoaOhxaOmbxlkkaeTmbaDalfhrcbhocuhlinaralaD9RglfaD6mdaPaeao9RaoaPfae6Eaofgoae6mbkaial9Rhxkcbc99amax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaokwbz:bjjjbk::seHu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnaeci9UgrcHfal0mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgwce0mbavc;abfcFecje;8kbavcUf9cu83ibavc8Wf9cu83ibavcyf9cu83ibavcaf9cu83ibavcKf9cu83ibavczf9cu83ibav9cu83iwav9cu83ibaialfc9WfhDaicefgqarfhidnaeTmbcmcsawceSEhkcbhxcbhmcbhPcbhwcbhlindnaiaD9nmbc9:hoxikdndnaqRbbgoc;Ve0mbavc;abfalaocu7gscl4fcsGcitfgzydlhrazydbhzdnaocsGgHak9pmbavawasfcsGcdtfydbaxaHEhoaHThsdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkaxasfhxcdhHavawcdtfaoBdbawasfhwcehsalhOxdkdndnaHcsSmbaHc987aHamffcefhoxekaicefhoai8SbbgHcFeGhsdndnaHcu9mmbaohixekaicvfhiascFbGhscrhHdninao8SbbgOcFbGaHtasVhsaOcu9kmeaocefhoaHcrfgHc8J9hmbxdkkaocefhikasce4cbasceG9R7amfhokdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkcdhHavawcdtfaoBdbcehsawcefhwalhOaohmxekdnaocpe0mbaxcefgHavawaDaocsGfRbbgocl49RcsGcdtfydbaocz6gzEhravawao9RcsGcdtfydbaHazfgAaocsGgHEhoaHThCdndnadcd9hmbabaPcetfgHax87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHaxBdbaHcwfaoBdbaHclfarBdbkcdhsavawcdtfaxBdbavawcefgwcsGcdtfarBdbcihHavc;abfalcitfgOaxBdlaOarBdbavawazfgwcsGcdtfaoBdbalcefcsGhOawaCfhwaxhzaAaCfhxxekaxcbaiRbbgOEgzaoc;:eSgHfhraOcsGhCaOcl4hAdndnaOcs0mbarcefhoxekarhoavawaA9RcsGcdtfydbhrkdndnaCmbaocefhxxekaohxavawaO9RcsGcdtfydbhokdndnaHTmbaicefhHxekaicdfhHai8SbegscFeGhzdnascu9kmbaicofhXazcFbGhzcrhidninaH8SbbgscFbGaitazVhzascu9kmeaHcefhHaicrfgic8J9hmbkaXhHxekaHcefhHkazce4cbazceG9R7amfgmhzkdndnaAcsSmbaHhsxekaHcefhsaH8SbbgicFeGhrdnaicu9kmbaHcvfhXarcFbGhrcrhidninas8SbbgHcFbGaitarVhraHcu9kmeascefhsaicrfgic8J9hmbkaXhsxekascefhskarce4cbarceG9R7amfgmhrkdndnaCcsSmbashixekascefhias8SbbgocFeGhHdnaocu9kmbascvfhXaHcFbGhHcrhodninai8SbbgscFbGaotaHVhHascu9kmeaicefhiaocrfgoc8J9hmbkaXhixekaicefhikaHce4cbaHceG9R7amfgmhokdndnadcd9hmbabaPcetfgHaz87ebaHclfao87ebaHcdfar87ebxekabaPcdtfgHazBdbaHcwfaoBdbaHclfarBdbkcdhsavawcdtfazBdbavawcefgwcsGcdtfarBdbcihHavc;abfalcitfgXazBdlaXarBdbavawaOcz6aAcsSVfgwcsGcdtfaoBdbawaCTaCcsSVfhwalcefcsGhOkaqcefhqavc;abfaOcitfgOarBdlaOaoBdbavc;abfalasfcsGcitfgraoBdlarazBdbawcsGhwalaHfcsGhlaPcifgPae6mbkkcbc99aiaDSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnaecvfal9nmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:SPliuo97eue978Jjjjjbca9Rhiaec98Ghldndnadcl9hmbdnalTmbcbhvabhdinadadpbbbgocKp:RecKp:Sep;6egraocwp:RecKp:Sep;6earp;Geaoczp:RecKp:Sep;6egwp;Gep;Kep;LegDpxbbbbbbbbbbbbbbbbp:2egqarpxbbbjbbbjbbbjbbbjgkp9op9rp;Kegrpxbb;:9cbb;:9cbb;:9cbb;:9cararp;MeaDaDp;Meawaqawakp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFbbbFbbbFbbbFbbbp9oaopxbbbFbbbFbbbFbbbFp9op9qarawp;Meaqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaDawp;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbadczfhdavclfgval6mbkkalaeSmeaipxbbbbbbbbbbbbbbbbgqpklbaiabalcdtfgdaeciGglcdtgv;8qbbdnalTmbaiaipblbgocKp:RecKp:Sep;6egraocwp:RecKp:Sep;6earp;Geaoczp:RecKp:Sep;6egwp;Gep;Kep;LegDaqp:2egqarpxbbbjbbbjbbbjbbbjgkp9op9rp;Kegrpxbb;:9cbb;:9cbb;:9cbb;:9cararp;MeaDaDp;Meawaqawakp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFbbbFbbbFbbbFbbbp9oaopxbbbFbbbFbbbFbbbFp9op9qarawp;Meaqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaDawp;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpklbkadaiav;8qbbskdnalTmbcbhvabhdinadczfgxaxpbbbgopxbbbbbbFFbbbbbbFFgkp9oadpbbbgDaopmbediwDqkzHOAKY8AEgwczp:Reczp:Sep;6egraDaopmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;7eawczp:Sep;6egwp;Gearp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egqarpxbbbjbbbjbbbjbbbjgmp9op9rp;Kegrpxb;:FSb;:FSb;:FSb;:FSararp;Meaoaop;Meawaqawamp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFFbbFFbbFFbbFFbbp9oaoawp;Meaqp;Keczp:Rep9qgoarawp;Meaqp;KepxFFbbFFbbFFbbFFbbp9ogrpmwDKYqk8AExm35Ps8E8Fp9qpkbbadaDakp9oaoarpmbezHdiOAlvCXorQLp9qpkbbadcafhdavclfgval6mbkkalaeSmbaiczfpxbbbbbbbbbbbbbbbbgopklbaiaopklbaiabalcitfgdaeciGglcitgv;8qbbdnalTmbaiaipblzgopxbbbbbbFFbbbbbbFFgkp9oaipblbgDaopmbediwDqkzHOAKY8AEgwczp:Reczp:Sep;6egraDaopmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;7eawczp:Sep;6egwp;Gearp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egqarpxbbbjbbbjbbbjbbbjgmp9op9rp;Kegrpxb;:FSb;:FSb;:FSb;:FSararp;Meaoaop;Meawaqawamp9op9rp;Kegrarp;Mep;Kep;Kep;Jep;Negwp;Mepxbbn0bbn0bbn0bbn0gqp;KepxFFbbFFbbFFbbFFbbp9oaoawp;Meaqp;Keczp:Rep9qgoarawp;Meaqp;KepxFFbbFFbbFFbbFFbbp9ogrpmwDKYqk8AExm35Ps8E8Fp9qpklzaiaDakp9oaoarpmbezHdiOAlvCXorQLp9qpklbkadaiav;8qbbkk:oDllue97euv978Jjjjjbc8W9Rhidnaec98GglTmbcbhvabhoinaiaopbbbgraoczfgwpbbbgDpmlvorxmPsCXQL358E8Fgqczp:Segkclp:RepklbaopxbbjZbbjZbbjZbbjZpx;Zl81Z;Zl81Z;Zl81Z;Zl81Zakpxibbbibbbibbbibbbp9qp;6ep;NegkaraDpmbediwDqkzHOAKY8AEgrczp:Reczp:Sep;6ep;MegDaDp;Meakarczp:Sep;6ep;Megxaxp;Meakaqczp:Reczp:Sep;6ep;Megqaqp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jepxb;:FSb;:FSb;:FSb;:FSgkp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbgmp9oaxakp;Mearp;Keczp:Rep9qgxaDakp;Mearp;Keamp9oaqakp;Mearp;Keczp:Rep9qgkpmbezHdiOAlvCXorQLgrp5baipblbpEb:T:j83ibaocwfarp5eaipblbpEe:T:j83ibawaxakpmwDKYqk8AExm35Ps8E8Fgkp5baipblbpEd:T:j83ibaocKfakp5eaipblbpEi:T:j83ibaocafhoavclfgval6mbkkdnalaeSmbaiczfpxbbbbbbbbbbbbbbbbgkpklbaiakpklbaiabalcitfgoaeciGgvcitgw;8qbbdnavTmbaiaipblbgraipblzgDpmlvorxmPsCXQL358E8Fgqczp:Segkclp:RepklaaipxbbjZbbjZbbjZbbjZpx;Zl81Z;Zl81Z;Zl81Z;Zl81Zakpxibbbibbbibbbibbbp9qp;6ep;NegkaraDpmbediwDqkzHOAKY8AEgrczp:Reczp:Sep;6ep;MegDaDp;Meakarczp:Sep;6ep;Megxaxp;Meakaqczp:Reczp:Sep;6ep;Megqaqp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jepxb;:FSb;:FSb;:FSb;:FSgkp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbgmp9oaxakp;Mearp;Keczp:Rep9qgxaDakp;Mearp;Keamp9oaqakp;Mearp;Keczp:Rep9qgkpmbezHdiOAlvCXorQLgrp5baipblapEb:T:j83ibaiarp5eaipblapEe:T:j83iwaiaxakpmwDKYqk8AExm35Ps8E8Fgkp5baipblapEd:T:j83izaiakp5eaipblapEi:T:j83iKkaoaiaw;8qbbkk;uddiue978Jjjjjbc;ab9Rhidnadcd4ae2glc98GgvTmbcbheabhdinadadpbbbgocwp:Recwp:Sep;6eaocep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepkbbadczfhdaeclfgeav6mbkkdnavalSmbaic8WfpxbbbbbbbbbbbbbbbbgopklbaicafaopklbaiczfaopklbaiaopklbaiabavcdtfgdalciGgecdtgv;8qbbdnaeTmbaiaipblbgocwp:Recwp:Sep;6eaocep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepklbkadaiav;8qbbkk9teiucbcbydj1jjbgeabcifc98GfgbBdj1jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkkebcjwklz:Dbb";
    var detector = new Uint8Array([
        0,
        97,
        115,
        109,
        1,
        0,
        0,
        0,
        1,
        4,
        1,
        96,
        0,
        0,
        3,
        3,
        2,
        0,
        0,
        5,
        3,
        1,
        0,
        1,
        12,
        1,
        0,
        10,
        22,
        2,
        12,
        0,
        65,
        0,
        65,
        0,
        65,
        0,
        252,
        10,
        0,
        0,
        11,
        7,
        0,
        65,
        0,
        253,
        15,
        26,
        11
    ]);
    var wasmpack = new Uint8Array([
        32,
        0,
        65,
        2,
        1,
        106,
        34,
        33,
        3,
        128,
        11,
        4,
        13,
        64,
        6,
        253,
        10,
        7,
        15,
        116,
        127,
        5,
        8,
        12,
        40,
        16,
        19,
        54,
        20,
        9,
        27,
        255,
        113,
        17,
        42,
        67,
        24,
        23,
        146,
        148,
        18,
        14,
        22,
        45,
        70,
        69,
        56,
        114,
        101,
        21,
        25,
        63,
        75,
        136,
        108,
        28,
        118,
        29,
        73,
        115
    ]);
    if (typeof WebAssembly !== "object") {
        return {
            supported: false
        };
    }
    var wasm = WebAssembly.validate(detector) ? unpack(wasm_simd) : unpack(wasm_base);
    var instance2;
    var ready = WebAssembly.instantiate(wasm, {}).then(function (result) {
        instance2 = result.instance;
        instance2.exports.__wasm_call_ctors();
    });
    function unpack(data) {
        var result = new Uint8Array(data.length);
        for (var i = 0; i < data.length; ++i) {
            var ch = data.charCodeAt(i);
            result[i] = ch > 96 ? ch - 97 : ch > 64 ? ch - 39 : ch + 4;
        }
        var write = 0;
        for (var i = 0; i < data.length; ++i) {
            result[write++] = result[i] < 60 ? wasmpack[result[i]] : (result[i] - 60) * 64 + result[++i];
        }
        return result.buffer.slice(0, write);
    }
    function decode(instance3, fun, target, count, size, source, filter) {
        var sbrk = instance3.exports.sbrk;
        var count4 = count + 3 & ~3;
        var tp = sbrk(count4 * size);
        var sp = sbrk(source.length);
        var heap = new Uint8Array(instance3.exports.memory.buffer);
        heap.set(source, sp);
        var res = fun(tp, count, size, sp, source.length);
        if (res == 0 && filter) {
            filter(tp, count4, size);
        }
        target.set(heap.subarray(tp, tp + count * size));
        sbrk(tp - sbrk(0));
        if (res != 0) {
            throw new Error("Malformed buffer data: " + res);
        }
    }
    var filters = {
        NONE: "",
        OCTAHEDRAL: "meshopt_decodeFilterOct",
        QUATERNION: "meshopt_decodeFilterQuat",
        EXPONENTIAL: "meshopt_decodeFilterExp"
    };
    var decoders = {
        ATTRIBUTES: "meshopt_decodeVertexBuffer",
        TRIANGLES: "meshopt_decodeIndexBuffer",
        INDICES: "meshopt_decodeIndexSequence"
    };
    var workers = [];
    var requestId = 0;
    function createWorker(url) {
        var worker = {
            object: new Worker(url),
            pending: 0,
            requests: {}
        };
        worker.object.onmessage = function (event) {
            var data = event.data;
            worker.pending -= data.count;
            worker.requests[data.id][data.action](data.value);
            delete worker.requests[data.id];
        };
        return worker;
    }
    function initWorkers(count) {
        var source = "self.ready = WebAssembly.instantiate(new Uint8Array([" + new Uint8Array(wasm) + "]), {}).then(function(result) { result.instance.exports.__wasm_call_ctors(); return result.instance; });self.onmessage = " + workerProcess.name + ";" + decode.toString() + workerProcess.toString();
        var blob = new Blob([source], { type: "text/javascript" });
        var url = URL.createObjectURL(blob);
        for (var i = workers.length; i < count; ++i) {
            workers[i] = createWorker(url);
        }
        for (var i = count; i < workers.length; ++i) {
            workers[i].object.postMessage({});
        }
        workers.length = count;
        URL.revokeObjectURL(url);
    }
    function decodeWorker(count, size, source, mode, filter) {
        var worker = workers[0];
        for (var i = 1; i < workers.length; ++i) {
            if (workers[i].pending < worker.pending) {
                worker = workers[i];
            }
        }
        return new Promise(function (resolve, reject) {
            var data = new Uint8Array(source);
            var id = ++requestId;
            worker.pending += count;
            worker.requests[id] = { resolve, reject };
            worker.object.postMessage({ id, count, size, source: data, mode, filter }, [data.buffer]);
        });
    }
    function workerProcess(event) {
        var data = event.data;
        if (!data.id) {
            return self.close();
        }
        self.ready.then(function (instance3) {
            try {
                var target = new Uint8Array(data.count * data.size);
                decode(instance3, instance3.exports[data.mode], target, data.count, data.size, data.source, instance3.exports[data.filter]);
                self.postMessage({ id: data.id, count: data.count, action: "resolve", value: target }, [target.buffer]);
            }
            catch (error) {
                self.postMessage({ id: data.id, count: data.count, action: "reject", value: error });
            }
        });
    }
    return {
        ready,
        supported: true,
        useWorkers: function (count) {
            initWorkers(count);
        },
        decodeVertexBuffer: function (target, count, size, source, filter) {
            decode(instance2, instance2.exports.meshopt_decodeVertexBuffer, target, count, size, source, instance2.exports[filters[filter]]);
        },
        decodeIndexBuffer: function (target, count, size, source) {
            decode(instance2, instance2.exports.meshopt_decodeIndexBuffer, target, count, size, source);
        },
        decodeIndexSequence: function (target, count, size, source) {
            decode(instance2, instance2.exports.meshopt_decodeIndexSequence, target, count, size, source);
        },
        decodeGltfBuffer: function (target, count, size, source, mode, filter) {
            decode(instance2, instance2.exports[decoders[mode]], target, count, size, source, instance2.exports[filters[filter]]);
        },
        decodeGltfBufferAsync: function (count, size, source, mode, filter) {
            if (workers.length > 0) {
                return decodeWorker(count, size, source, decoders[mode], filters[filter]);
            }
            return ready.then(function () {
                var target = new Uint8Array(count * size);
                decode(instance2, instance2.exports[decoders[mode]], target, count, size, source, instance2.exports[filters[filter]]);
                return target;
            });
        }
    };
}();
var MeshoptSimplifier = function () {
    var wasm = "b9H79Tebbbe9Hk9Geueu9Geub9Gbb9Gsuuuuuuuuuuuu99uueu9Gvuuuuub9Gvuuuuue999Gquuuuuuu99uueu9Gwuuuuuu99ueu9Giuuue999Gluuuueu9GiuuueuizsdilvoirwDbqqbeqlve9Weiiviebeoweuec:G:Pdkr:Tewo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bbz9TW79O9V9Wt9F79P9T9W29P9M95bl8E9TW79O9V9Wt9F79P9T9W29P9M959x9Pt9OcttV9P9I91tW7bvQ9TW79O9V9Wt9F79P9T9W29P9M959q9V9P9Ut7boX9TW79O9V9Wt9F79P9T9W29P9M959t9J9H2Wbra9TW79O9V9Wt9F9V9Wt9P9T9P96W9wWVtW94SWt9J9O9sW9T9H9Wbwl79IV9RbDDwebcekdmxq:x:yesdbk:Z9VvKue99euY99Ou8Jjjjjbc;W;qb9Rgs8Kjjjjbcbhzascxfcbc;Kbz:ljjjb8AdnabaeSmbabaeadcdtz:kjjjb8AkdnamcdGTmbalcrfci4gHcbyd:m:jjjbHjjjjbbheascxfasyd2gOcdtfaeBdbasaOcefBd2aecbaHz:ljjjbhAcbhlcbhednadTmbcbhlabheadhHinaAaeydbgOci4fgCaCRbbgCceaOcrGgOtV86bbaCcu7aO4ceGalfhlaeclfheaHcufgHmbkcualcdtalcFFFFi0Ehekaecbyd:m:jjjbHjjjjbbhzascxfasyd2gecdtfazBdbasaecefBd2alcd4alfhOcehHinaHgecethHaeaO6mbkcbhXcuaecdtgOaecFFFFi0Ecbyd:m:jjjbHjjjjbbhHascxfasyd2gCcdtfaHBdbasaCcefBd2aHcFeaOz:ljjjbhQdnadTmbaecufhLcbhKindndnaQabaXcdtfgYydbgCc:v;t;h;Ev2aLGgOcdtfgAydbgHcuSmbceheinazaHcdtfydbaCSmdaOaefhHaecefheaQaHaLGgOcdtfgAydbgHcu9hmbkkazaKcdtfaCBdbaAaKBdbaKhHaKcefhKkaYaHBdbaXcefgXad9hmbkkaQcbyd1:jjjbH:bjjjbbasasyd2cufBd2kcualcefgecdtaecFFFFi0Ecbyd:m:jjjbHjjjjbbh8Aascxfasyd2gecdtfa8ABdbasa8ABdlasaecefBd2cuadcitadcFFFFe0Ecbyd:m:jjjbHjjjjbbhEascxfasyd2gecdtfaEBdbasaEBdwasaecefBd2asclfabadalcbz:cjjjbcualcdtg3alcFFFFi0Eg5cbyd:m:jjjbHjjjjbbhLascxfasyd2gecdtfaLBdbasaecefBd2a5cbyd:m:jjjbHjjjjbbh8Eascxfasyd2gecdtfa8EBdbasaecefBd2alcd4alfhOcehHinaHgecethHaeaO6mbkcbhYcuaecdtgOaecFFFFi0Ecbyd:m:jjjbHjjjjbbhHascxfasyd2gCcdtfaHBdbasaCcefBd2aHcFeaOz:ljjjbhQdnalTmbavcd4hCaecufhKinaYhednazTmbazaYcdtfydbhekaiaeaC2cdtfgeydlgHcH4aH7c:F:b:DD2aeydbgHcH4aH7c;D;O:B8J27aeydwgecH4ae7c:3F;N8N27aKGhHaYcdth8FdndndnazTmbaQaHcdtfgAydbgecuSmeaiaza8FfydbaC2cdtfhXcehOinaiazaecdtfydbaC2cdtfaXcxz:ojjjbTmiaHaOfheaOcefhOaQaeaKGgHcdtfgAydbgecu9hmbxdkkaQaHcdtfgAydbgecuSmbaiaYaC2cdtfhXcehOinaiaeaC2cdtfaXcxz:ojjjbTmdaHaOfheaOcefhOaQaeaKGgHcdtfgAydbgecu9hmbkkaAaYBdbaYhekaLa8FfaeBdbaYcefgYal9hmbkcbhea8EhHinaHaeBdbaHclfhHalaecefge9hmbkcbheaLhHa8EhOindnaeaHydbgCSmbaOa8EaCcdtfgCydbBdbaCaeBdbkaHclfhHaOclfhOalaecefge9hmbkkcbhaaQcbyd1:jjjbH:bjjjbbasasyd2cufBd2alcbyd:m:jjjbHjjjjbbhKascxfasyd2gecdtfaKBdbasaecefBd2a5cbyd:m:jjjbHjjjjbbheascxfasyd2gHcdtfaeBdbasaHcefBd2a5cbyd:m:jjjbHjjjjbbhHascxfasyd2gOcdtfaHBdbasaOcefBd2aecFea3z:ljjjbhhaHcFea3z:ljjjbhgdnalTmbaEcwfh8Jindna8AaagOcefgacdtfydbgCa8AaOcdtgefydbgHSmbaCaH9Rh8FaEaHcitfh3agaefh8KahaefhYcbhAindndna3aAcitfydbgQaO9hmbaYaOBdba8KaOBdbxekdna8AaQcdtg8LfgeclfydbgHaeydbgeSmbaEaecitgCfydbaOSmeaHae9Rh8Maecu7aHfhXa8JaCfhHcbheinaXaeSmeaecefheaHydbhCaHcwfhHaCaO9hmbkaea8M6mekaga8LfgeaOaQaeydbcuSEBdbaYaQaOaYydbcuSEBdbkaAcefgAa8F9hmbkkaaal9hmbkaLhHa8EhOaghCahhAcbheindndnaeaHydbgQ9hmbdnaeaOydbgQ9hmbaAydbhQdnaCydbgXcu9hmbaQcu9hmbaKaefcb86bbxikaKaefhYdnaeaXSmbaeaQSmbaYce86bbxikaYcl86bbxdkdnaea8EaQcdtgXfydb9hmbdnaCydbgYcuSmbaeaYSmbaAydbg8FcuSmbaea8FSmbagaXfydbg3cuSmba3aQSmbahaXfydbgXcuSmbaXaQSmbdnaLaYcdtfydbgQaLaXcdtfydb9hmbaQaLa8FcdtfydbgXSmbaXaLa3cdtfydb9hmbaKaefcd86bbxlkaKaefcl86bbxikaKaefcl86bbxdkaKaefcl86bbxekaKaefaKaQfRbb86bbkaHclfhHaOclfhOaCclfhCaAclfhAalaecefge9hmbkdnaqTmbdndnazTmbazheaLhHalhOindnaqaeydbfRbbTmbaKaHydbfcl86bbkaeclfheaHclfhHaOcufgOmbxdkkaLhealhHindnaqRbbTmbaKaeydbfcl86bbkaqcefhqaeclfheaHcufgHmbkkaLhealhOaKhHindnaKaeydbfRbbcl9hmbaHcl86bbkaeclfheaHcefhHaOcufgOmbkkamceGTmbaKhealhHindnaeRbbce9hmbaecl86bbkaecefheaHcufgHmbkkcualcx2alc;v:Q;v:Qe0Ecbyd:m:jjjbHjjjjbbhaascxfasyd2gecdtfaaBdbasaecefBd2aaaialavazz:djjjbh8NdndnaDmbcbhycbh8Jxekcbh8JawhecbhHindnaeIdbJbbbb9ETmbasc;Wbfa8JcdtfaHBdba8Jcefh8JkaeclfheaDaHcefgH9hmbkcua8Jal2gecdtaecFFFFi0Ecbyd:m:jjjbHjjjjbbhyascxfasyd2gecdtfayBdbasaecefBd2alTmba8JTmbarcd4hYdnazTmba8Jcdth8FcbhQayhXinaoazaQcdtfydbaY2cdtfhAasc;WbfheaXhHa8JhOinaHaAaeydbcdtgCfIdbawaCfIdbNUdbaeclfheaHclfhHaOcufgOmbkaXa8FfhXaQcefgQal9hmbxdkka8Jcdth8FcbhQayhXinaoaQaY2cdtfhAasc;WbfheaXhHa8JhOinaHaAaeydbcdtgCfIdbawaCfIdbNUdbaeclfheaHclfhHaOcufgOmbkaXa8FfhXaQcefgQal9hmbkkcualc8S2gHalc;D;O;f8U0EgCcbyd:m:jjjbHjjjjbbheascxfasyd2gOcdtfaeBdbasaOcefBd2aecbaHz:ljjjbhqdndndndna8JTmbaCcbyd:m:jjjbHjjjjbbhvascxfasyd2gecdtfavBdbcehOasaecefBd2avcbaHz:ljjjb8Acua8Jal2gecltgHaecFFFFb0Ecbyd:m:jjjbHjjjjbbhrascxfasyd2gecdtfarBdbasaecefBd2arcbaHz:ljjjb8AadmexikcbhvadTmecbhrkcbhAabhHindnaaaHclfydbgQcx2fgeIdbaaaHydbgXcx2fgOIdbg8P:tgIaaaHcwfydbgYcx2fgCIdlaOIdlg8R:tg8SNaCIdba8P:tgRaeIdla8R:tg8UN:tg8Va8VNa8UaCIdwaOIdwg8W:tg8XNa8SaeIdwa8W:tg8UN:tg8Sa8SNa8UaRNa8XaIN:tgIaINMM:rgRJbbbb9ETmba8VaR:vh8VaIaR:vhIa8SaR:vh8SkaqaLaXcdtfydbc8S2fgea8SaR:rgRa8SNNg8UaeIdbMUdbaeaIaRaINg8YNg8XaeIdlMUdlaea8VaRa8VNg8ZNg80aeIdwMUdwaea8Ya8SNg8YaeIdxMUdxaea8Za8SNg81aeIdzMUdzaea8ZaINg8ZaeIdCMUdCaea8SaRa8Va8WNa8Sa8PNa8RaINMM:mg8RNg8PNg8SaeIdKMUdKaeaIa8PNgIaeId3MUd3aea8Va8PNg8VaeIdaMUdaaea8Pa8RNg8PaeId8KMUd8KaeaRaeIdyMUdyaqaLaQcdtfydbc8S2fgea8UaeIdbMUdbaea8XaeIdlMUdlaea80aeIdwMUdwaea8YaeIdxMUdxaea81aeIdzMUdzaea8ZaeIdCMUdCaea8SaeIdKMUdKaeaIaeId3MUd3aea8VaeIdaMUdaaea8PaeId8KMUd8KaeaRaeIdyMUdyaqaLaYcdtfydbc8S2fgea8UaeIdbMUdbaea8XaeIdlMUdlaea80aeIdwMUdwaea8YaeIdxMUdxaea81aeIdzMUdzaea8ZaeIdCMUdCaea8SaeIdKMUdKaeaIaeId3MUd3aea8VaeIdaMUdaaea8PaeId8KMUd8KaeaRaeIdyMUdyaHcxfhHaAcifgAad6mbkcbh8FabhXinaba8FcdtfhQcbhHinaKaQaHc;a1jjbfydbcdtfydbgOfRbbhedndnaKaXaHfydbgCfRbbgAc99fcFeGcpe0mbaec99fcFeGc;:e6mekdnaAcufcFeGce0mbahaCcdtfydbaO9hmekdnaecufcFeGce0mbagaOcdtfydbaC9hmekdnaAcv2aefc:G1jjbfRbbTmbaLaOcdtfydbaLaCcdtfydb0mekJbbacJbbacJbbjZaecFeGceSEaAceSEh8ZdnaaaQaHc;e1jjbfydbcdtfydbcx2fgeIdwaaaCcx2fgAIdwg8R:tg8VaaaOcx2fgYIdwa8R:tg8Sa8SNaYIdbaAIdbg8W:tgIaINaYIdlaAIdlg8U:tgRaRNMMg8PNa8Va8SNaeIdba8W:tg80aINaRaeIdla8U:tg8YNMMg8Xa8SN:tg8Va8VNa80a8PNa8XaIN:tg8Sa8SNa8Ya8PNa8XaRN:tgIaINMM:rgRJbbbb9ETmba8VaR:vh8VaIaR:vhIa8SaR:vh8SkaqaLaCcdtfydbc8S2fgea8Sa8Za8P:rNgRa8SNNg8XaeIdbMUdbaeaIaRaINg8ZNg80aeIdlMUdlaea8VaRa8VNg8PNg8YaeIdwMUdwaea8Za8SNg8ZaeIdxMUdxaea8Pa8SNg81aeIdzMUdzaea8PaINgBaeIdCMUdCaea8SaRa8Va8RNa8Sa8WNa8UaINMM:mg8RNg8PNg8SaeIdKMUdKaeaIa8PNgIaeId3MUd3aea8Va8PNg8VaeIdaMUdaaea8Pa8RNg8PaeId8KMUd8KaeaRaeIdyMUdyaqaLaOcdtfydbc8S2fgea8XaeIdbMUdbaea80aeIdlMUdlaea8YaeIdwMUdwaea8ZaeIdxMUdxaea81aeIdzMUdzaeaBaeIdCMUdCaea8SaeIdKMUdKaeaIaeId3MUd3aea8VaeIdaMUdaaea8PaeId8KMUd8KaeaRaeIdyMUdykaHclfgHcx9hmbkaXcxfhXa8Fcifg8Fad6mbkdna8JTmbcbhXinJbbbbh8WaaabaXcdtfgeclfydbgYcx2fgHIdwaaaeydbg8Fcx2fgOIdwg8Y:tgIaINaHIdbaOIdbg81:tg8Va8VNaHIdlaOIdlgB:tgRaRNMMg8Zaaaecwfydbg3cx2fgeIdwa8Y:tg8PNaIaIa8PNa8VaeIdba81:tg8RNaRaeIdlaB:tg8UNMMg8SN:tJbbbbJbbjZa8Za8Pa8PNa8Ra8RNa8Ua8UNMMg80Na8Sa8SN:tg8X:va8XJbbbb9BEg8XNh83a80aINa8Pa8SN:ta8XNhUa8Za8UNaRa8SN:ta8XNh85a80aRNa8Ua8SN:ta8XNh86a8Za8RNa8Va8SN:ta8XNh87a80a8VNa8Ra8SN:ta8XNh88a8Va8UNa8RaRN:tg8Sa8SNaRa8PNa8UaIN:tg8Sa8SNaIa8RNa8Pa8VN:tg8Sa8SNMM:rJbbbZNh8Saya8Fa8J2gwcdtfhHaya3a8J2g8LcdtfhOayaYa8J2gicdtfhCa8Y:mh89aB:mh8:a81:mhZcbhAa8JhQJbbbbh8UJbbbbh8XJbbbbh8ZJbbbbh80Jbbbbh8YJbbbbh81JbbbbhBJbbbbhnJbbbbhcinasc;WbfaAfgecwfa8SaUaCIdbaHIdbg8P:tgRNa83aOIdba8P:tg8RNMgINUdbaeclfa8Sa86aRNa85a8RNMg8VNUdbaea8Sa88aRNa87a8RNMgRNUdbaecxfa8Sa89aINa8:a8VNa8PaZaRNMMMg8PNUdba8SaIa8VNNa80Mh80a8SaIaRNNa8YMh8Ya8Sa8VaRNNa81Mh81a8Sa8Pa8PNNa8WMh8Wa8SaIa8PNNa8UMh8Ua8Sa8Va8PNNa8XMh8Xa8SaRa8PNNa8ZMh8Za8SaIaINNaBMhBa8Sa8Va8VNNanMhna8SaRaRNNacMhcaHclfhHaCclfhCaOclfhOaAczfhAaQcufgQmbkava8Fc8S2fgeacaeIdbMUdbaeanaeIdlMUdlaeaBaeIdwMUdwaea81aeIdxMUdxaea8YaeIdzMUdzaea80aeIdCMUdCaea8ZaeIdKMUdKaea8XaeId3MUd3aea8UaeIdaMUdaaea8WaeId8KMUd8Kaea8SaeIdyMUdyavaYc8S2fgeacaeIdbMUdbaeanaeIdlMUdlaeaBaeIdwMUdwaea81aeIdxMUdxaea8YaeIdzMUdzaea80aeIdCMUdCaea8ZaeIdKMUdKaea8XaeId3MUd3aea8UaeIdaMUdaaea8WaeId8KMUd8Kaea8SaeIdyMUdyava3c8S2fgeacaeIdbMUdbaeanaeIdlMUdlaeaBaeIdwMUdwaea81aeIdxMUdxaea8YaeIdzMUdzaea80aeIdCMUdCaea8ZaeIdKMUdKaea8XaeId3MUd3aea8UaeIdaMUdaaea8WaeId8KMUd8Kaea8SaeIdyMUdyarawcltfhQcbhHa8JhCinaQaHfgeasc;WbfaHfgOIdbaeIdbMUdbaeclfgAaOclfIdbaAIdbMUdbaecwfgAaOcwfIdbaAIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaCcufgCmbkaraicltfhQcbhHa8JhCinaQaHfgeasc;WbfaHfgOIdbaeIdbMUdbaeclfgAaOclfIdbaAIdbMUdbaecwfgAaOcwfIdbaAIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaCcufgCmbkara8LcltfhQcbhHa8JhCinaQaHfgeasc;WbfaHfgOIdbaeIdbMUdbaeclfgAaOclfIdbaAIdbMUdbaecwfgAaOcwfIdbaAIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaCcufgCmbkaXcifgXad6mbkkcbhOxekcehOcbhrkcbh3dndnamcwGg9cmbJbbbbh8UcbhJcbhocbhCxekcbhea5cbyd:m:jjjbHjjjjbbhCascxfasyd2gHcdtfaCBdbasaHcefBd2dnalTmbaChHinaHaeBdbaHclfhHalaecefge9hmbkkdnaOmbcbh8Finaba8FcdtfhYcbhXinaLaYaXcdtgec;a1jjbfydbcdtfydbcdtfydbhHdnaCaLaYaefydbcdtfydbgOcdtfgAydbgeaOSmbinaAaCaegOcdtfgQydbgeBdbaQhAaOae9hmbkkdnaCaHcdtfgAydbgeaHSmbinaAaCaegHcdtfgQydbgeBdbaQhAaHae9hmbkkdnaOaHSmbaCaOaHaOaH0EcdtfaOaHaOaH6EBdbkaXcefgXci9hmbka8Fcifg8Fad6mbkkcbhJdnalTmbcbhQindnaLaQcdtgefydbaQ9hmbaQhHdnaCaefgXydbgeaQSmbaXhOinaOaCaegHcdtfgAydbgeBdbaAhOaHae9hmbkkaXaHBdbkaQcefgQal9hmbkcbheaLhOaChHcbhJindndnaeaOydbgA9hmbdnaeaHydbgA9hmbaHaJBdbaJcefhJxdkaHaCaAcdtfydbBdbxekaHaCaAcdtfydbBdbkaOclfhOaHclfhHalaecefge9hmbkkcuaJcltgeaJcjjjjiGEcbyd:m:jjjbHjjjjbbhoascxfasyd2gHcdtfaoBdbasaHcefBd2aocbaez:ljjjbhAdnalTmbaChOaahealhQinaecwfIdbh8SaeclfIdbhIaAaOydbcltfgHaeIdbaHIdbMUdbaHclfgXaIaXIdbMUdbaHcwfgXa8SaXIdbMUdbaHcxfgHaHIdbJbbjZMUdbaOclfhOaecxfheaQcufgQmbkkdnaJTmbaAheaJhHinaecxfgOIdbh8SaOcbBdbaeaeIdbJbbbbJbbjZa8S:va8SJbbbb9BEg8SNUdbaeclfgOa8SaOIdbNUdbaecwfgOa8SaOIdbNUdbaeczfheaHcufgHmbkkdnalTmbaChOaahealhQinaAaOydbcltfgHcxfgXaecwfIdbaHcwfIdb:tg8Sa8SNaeIdbaHIdb:tg8Sa8SNaeclfIdbaHclfIdb:tg8Sa8SNMMg8SaXIdbgIaIa8S9DEUdbaOclfhOaecxfheaQcufgQmbkkdnaJmbcbhJJFFuuh8UxekaAcxfheaAhHaJhOinaHaeIdbUdbaeczfheaHclfhHaOcufgOmbkJFFuuh8UaAheaJhHinaeIdbg8Sa8Ua8Ua8S9EEh8UaeclfheaHcufgHmbkkasydlh9ednalTmba9eclfhea9eydbhAaKhHalhQcbhOincbaeydbgXaA9RaHRbbcpeGEaOfhOaHcefhHaeclfheaXhAaQcufgQmbkaOce4h3kcuada39RcifgTcx2aTc;v:Q;v:Qe0Ecbyd:m:jjjbHjjjjbbhDascxfasyd2gecdtfaDBdbasaecefBd2cuaTcdtaTcFFFFi0Ecbyd:m:jjjbHjjjjbbhSascxfasyd2gecdtfaSBdbasaecefBd2a5cbyd:m:jjjbHjjjjbbh8Mascxfasyd2gecdtfa8MBdbasaecefBd2alcbyd:m:jjjbHjjjjbbh9hascxfasyd2gecdtfa9hBdbasaecefBd2axaxNa8NJbbjZamclGEg83a83N:vhcJbbbbhndnadak9nmbdnaTci6mba8Jclth9iaDcwfh6JbbbbhBJbbbbhninasclfabadalaLz:cjjjbabh3cbhEcbh5inaba5cdtfhwcbheindnaLa3aefydbgOcdtg8FfydbgQaLawaec;q1jjbfydbcdtfydbgHcdtg8LfydbgXSmbaKaHfRbbgYcv2aKaOfRbbgAfc;G1jjbfRbbg8AaAcv2aYfgic;G1jjbfRbbg8KVcFeGTmbdnaXaQ9nmbaic:G1jjbfRbbcFeGmekaAcufhQdnaAaY9hmbaQcFeGce0mbaha8FfydbaH9hmekdndnaAclSmbaYcl9hmekdnaQcFeGce0mbaha8FfydbaH9hmdkaYcufcFeGce0mbaga8LfydbaO9hmekaDaEcx2fgAaHaOa8KcFeGgQEBdlaAaOaHaQEBdbaAaQa8AGcb9hBdwaEcefhEkaeclfgecx9hmbkdna5cifg5ad9pmba3cxfh3aEcifaT9nmekkaETmdcbhYinaqaLaDaYcx2fgAydbgQcdtg3fydbc8S2fgeIdwaaaAydlgXcx2fgHIdwg8VNaeIdzaHIdbgRNaeIdaMg8Sa8SMMa8VNaeIdlaHIdlg8PNaeIdCa8VNaeId3Mg8Sa8SMMa8PNaeIdbaRNaeIdxa8PNaeIdKMg8Sa8SMMaRNaeId8KMMM:lh8SJbbbbJbbjZaeIdygI:vaIJbbbb9BEhIdndnaAydwg8FmbJFFuuh8XxekJbbbbJbbjZaqaLaXcdtfydbc8S2fgeIdyg8R:va8RJbbbb9BEaeIdwaaaQcx2fgHIdwg8RNaeIdzaHIdbg8WNaeIdaMg8Xa8XMMa8RNaeIdlaHIdlg8XNaeIdCa8RNaeId3Mg8Ra8RMMa8XNaeIdba8WNaeIdxa8XNaeIdKMg8Ra8RMMa8WNaeId8KMMM:lNh8XkaIa8SNh8Zdna8JTmbavaQc8S2fgOIdwa8VNaOIdzaRNaOIdaMg8Sa8SMMa8VNaOIdla8PNaOIdCa8VNaOId3Mg8Sa8SMMa8PNaOIdbaRNaOIdxa8PNaOIdKMg8Sa8SMMaRNaOId8KMMMh8SayaXa8J2gwcdtfhHaraQa8J2g8LcltfheaOIdyh8Ra8JhOinaHIdbgIaIa8RNaecxfIdba8VaecwfIdbNaRaeIdbNa8PaeclfIdbNMMMgIaIM:tNa8SMh8SaHclfhHaeczfheaOcufgOmbkdndna8FmbJbbbbhIxekavaXc8S2fgOIdwaaaQcx2fgeIdwgRNaOIdzaeIdbg8PNaOIdaMgIaIMMaRNaOIdlaeIdlg8RNaOIdCaRNaOId3MgIaIMMa8RNaOIdba8PNaOIdxa8RNaOIdKMgIaIMMa8PNaOId8KMMMhIaya8LcdtfhHarawcltfheaOIdyh8Wa8JhOinaHIdbg8Va8Va8WNaecxfIdbaRaecwfIdbNa8PaeIdbNa8RaeclfIdbNMMMg8Va8VM:tNaIMhIaHclfhHaeczfheaOcufgOmbkaI:lhIka8Za8S:lMh8Za8XaIMh8XaKaQfRbbcd9hmbdnagahaha3fydbaXSEa8Ea3fydbgwcdtfydbg3cu9hmba8EaXcdtfydbh3kavawc8S2fgOIdwaaa3cx2fgeIdwg8VNaOIdzaeIdbgRNaOIdaMg8Sa8SMMa8VNaOIdlaeIdlg8PNaOIdCa8VNaOId3Mg8Sa8SMMa8PNaOIdbaRNaOIdxa8PNaOIdKMg8Sa8SMMaRNaOId8KMMMh8Saya3a8J2g8LcdtfhHarawa8J2gicltfheaOIdyh8Ra8JhOinaHIdbgIaIa8RNaecxfIdba8VaecwfIdbNaRaeIdbNa8PaeclfIdbNMMMgIaIM:tNa8SMh8SaHclfhHaeczfheaOcufgOmbkdndna8FmbJbbbbhIxekava3c8S2fgOIdwaaawcx2fgeIdwgRNaOIdzaeIdbg8PNaOIdaMgIaIMMaRNaOIdlaeIdlg8RNaOIdCaRNaOId3MgIaIMMa8RNaOIdba8PNaOIdxa8RNaOIdKMgIaIMMa8PNaOId8KMMMhIayaicdtfhHara8LcltfheaOIdyh8Wa8JhOinaHIdbg8Va8Va8WNaecxfIdbaRaecwfIdbNa8PaeIdbNa8RaeclfIdbNMMMg8Va8VM:tNaIMhIaHclfhHaeczfheaOcufgOmbkaI:lhIka8Za8S:lMh8Za8XaIMh8XkaAa8Za8Xa8Za8X9FgeEUdwaAaXaQaea8FTVgeEBdlaAaQaXaeEBdbaYcefgYaE9hmbkasc;Wbfcbcj;qbz:ljjjb8Aa6heaEhHinasc;WbfaeydbcA4cF8FGgOcFAaOcFA6EcdtfgOaOydbcefBdbaecxfheaHcufgHmbkcbhecbhHinasc;WbfaefgOydbhAaOaHBdbaAaHfhHaeclfgecj;qb9hmbkcbhea6hHinasc;WbfaHydbcA4cF8FGgOcFAaOcFA6EcdtfgOaOydbgOcefBdbaSaOcdtfaeBdbaHcxfhHaEaecefge9hmbkadak9RgOci9Uh9kdnalTmbcbhea8MhHinaHaeBdbaHclfhHalaecefge9hmbkkcbh0a9hcbalz:ljjjbh5aOcO9Uh9ma9kce4h9nasydwh9ocbh8Kcbh8AdninaDaSa8Acdtfydbcx2fgiIdwg8Sac9Emea8Ka9k9pmeJFFuuhIdna9naE9pmbaDaSa9ncdtfydbcx2fIdwJbb;aZNhIkdna8SaI9ETmba8San9ETmba8Ka9m0mdkdna5aLaiydlgwcdtg9pfydbgAfg9qRbba5aLaiydbg3cdtg9rfydbgefg9sRbbVmbaKa3fRbbh9tdna9eaecdtfgHclfydbgOaHydbgHSmbaOaH9RhQaaaAcx2fhYaaaecx2fh8Fa9oaHcitfhecbhHceh8Ldnindna8MaeydbcdtfydbgOaASmba8MaeclfydbcdtfydbgXaASmbaOaXSmbaaaXcx2fgXIdbaaaOcx2fgOIdbg8V:tg8Sa8FIdlaOIdlgR:tg8WNa8FIdba8V:tg8XaXIdlaR:tgIN:tg8Pa8SaYIdlaR:tg8ZNaYIdba8V:tg80aIN:tgRNaIa8FIdwaOIdwg8R:tg8YNa8WaXIdwa8R:tg8VN:tg8WaIaYIdwa8R:tg81Na8Za8VN:tgINa8Va8XNa8Ya8SN:tg8Ra8Va80Na81a8SN:tg8SNMMa8Pa8PNa8Wa8WNa8Ra8RNMMaRaRNaIaINa8Sa8SNMMN:rJbbj8:N9FmdkaecwfheaHcefgHaQ6h8LaQaH9hmbkka8LceGTmba9ncefh9nxekdndndndna9tc9:fPdebdka3heina8MaecdtgefawBdba8Eaefydbgea39hmbxikkdnagahaha9rfydbawSEa8Ea9rfydbg3cdtfydbgecu9hmba8Ea9pfydbheka8Ma9rfawBdbaehwka8Ma3cdtfawBdbka9sce86bba9qce86bbaiIdwg8Sanana8S9DEhna0cefh0cecda9tceSEa8Kfh8Kka8Acefg8AaE9hmbkka0TmddnalTmbcbhXcbh8Findna8Ma8FcdtgefydbgOa8FSmbaLaOcdtfydbh3dna8FaLaefydb9hgwmbaqa3c8S2fgeaqa8Fc8S2fgHIdbaeIdbMUdbaeaHIdlaeIdlMUdlaeaHIdwaeIdwMUdwaeaHIdxaeIdxMUdxaeaHIdzaeIdzMUdzaeaHIdCaeIdCMUdCaeaHIdKaeIdKMUdKaeaHId3aeId3MUd3aeaHIdaaeIdaMUdaaeaHId8KaeId8KMUd8KaeaHIdyaeIdyMUdyka8JTmbavaOc8S2fgeava8Fc8S2g8LfgHIdbaeIdbMUdbaeaHIdlaeIdlMUdlaeaHIdwaeIdwMUdwaeaHIdxaeIdxMUdxaeaHIdzaeIdzMUdzaeaHIdCaeIdCMUdCaeaHIdKaeIdKMUdKaeaHId3aeId3MUd3aeaHIdaaeIdaMUdaaeaHId8KaeId8KMUd8KaeaHIdyaeIdyMUdya9iaO2hYarhHa8JhAinaHaYfgeaHaXfgOIdbaeIdbMUdbaeclfgQaOclfIdbaQIdbMUdbaecwfgQaOcwfIdbaQIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaAcufgAmbkawmbJbbbbJbbjZaqa8LfgeIdyg8S:va8SJbbbb9BEaeIdwaaa3cx2fgHIdwg8SNaeIdzaHIdbgINaeIdaMg8Va8VMMa8SNaeIdlaHIdlg8VNaeIdCa8SNaeId3Mg8Sa8SMMa8VNaeIdbaINaeIdxa8VNaeIdKMg8Sa8SMMaINaeId8KMMM:lNg8SaBaBa8S9DEhBkaXa9ifhXa8Fcefg8Fal9hmbkcbhHahheindnaeydbgOcuSmbdnaHa8MaOcdtgAfydbgO9hmbcuhOahaAfydbgAcuSmba8MaAcdtfydbhOkaeaOBdbkaeclfhealaHcefgH9hmbkcbhHagheindnaeydbgOcuSmbdnaHa8MaOcdtgAfydbgO9hmbcuhOagaAfydbgAcuSmba8MaAcdtfydbhOkaeaOBdbkaeclfhealaHcefgH9hmbkkaBana8JEhBcbhAabhecbhQindna8MaeydbcdtfydbgHa8MaeclfydbcdtfydbgOSmbaHa8MaecwfydbcdtfydbgXSmbaOaXSmbabaAcdtfgYaHBdbaYcwfaXBdbaYclfaOBdbaAcifhAkaecxfheaQcifgQad6mbkdndna9cTmbaAak9nmba8UaB9FTmbcbhdabhecbhHindnaoaCaeydbgOcdtfydbcdtfIdbaB9ETmbabadcdtfgQaOBdbaQclfaeclfydbBdbaQcwfaecwfydbBdbadcifhdkaecxfheaHcifgHaA6mbkJFFuuh8UaJTmeaoheaJhHJFFuuh8SinaeIdbgIa8Sa8SaI9EEg8Va8SaIaB9EgOEh8Sa8Va8UaOEh8UaeclfheaHcufgHmbxdkkaAhdkadak0mbxdkkasclfabadalaLz:cjjjbkdndnadak0mbadhOxekdna9cmbadhOxekdna8Uac9FmbadhOxekina8UJbb;aZNg8Saca8Sac9DEh8VJbbbbh8SdnaJTmbaoheaJhHinaeIdbgIa8SaIa8V9FEa8SaIa8S9EEh8SaeclfheaHcufgHmbkkcbhOabhecbhHindnaoaCaeydbgAcdtfydbcdtfIdba8V9ETmbabaOcdtfgQaABdbaQclfaeclfydbBdbaQcwfaecwfydbBdbaOcifhOkaecxfheaHcifgHad6mbkJFFuuh8UdnaJTmbaoheaJhHJFFuuhIinaeIdbgRaIaIaR9EEg8PaIaRa8V9EgAEhIa8Pa8UaAEh8UaeclfheaHcufgHmbkkdnaOad9hmbadhOxdka8Sanana8S9DEhnaOak9nmeaOhda8Uac9FmbkkdnamcjjjjlGTmbazmbaOTmbcbhLabheinaKaeydbgAfRbbc3thXaecwfgYydbhHdndnahaAcdtg3fydbaeclfg8FydbgCSmbcbhQagaCcdtfydbaA9hmekcjjjj94hQkaeaXaQVaAVBdbaKaCfRbbc3thXdndnahaCcdtfydbaHSmbcbhQagaHcdtfydbaC9hmekcjjjj94hQka8FaXaQVaCVBdbaKaHfRbbc3thQdndnahaHcdtfydbaASmbcbhCaga3fydbaH9hmekcjjjj94hCkaYaQaCVaHVBdbaecxfheaLcifgLaO6mbkkdnazTmbaOTmbaOheinabazabydbcdtfydbBdbabclfhbaecufgembkkdnaPTmbaPa83an:rNUdbkasyd2gecdtascxffc98fhHdninaeTmeaHydbcbyd1:jjjbH:bjjjbbaHc98fhHaecufhexbkkasc;W;qbf8KjjjjbaOk;Yieouabydlhvabydbclfcbaicdtz:ljjjbhoadci9UhrdnadTmbdnalTmbaehwadhDinaoalawydbcdtfydbcdtfgqaqydbcefBdbawclfhwaDcufgDmbxdkkaehwadhDinaoawydbcdtfgqaqydbcefBdbawclfhwaDcufgDmbkkdnaiTmbcbhDaohwinawydbhqawaDBdbawclfhwaqaDfhDaicufgimbkkdnadci6mbinaecwfydbhwaeclfydbhDaeydbhidnalTmbalawcdtfydbhwalaDcdtfydbhDalaicdtfydbhikavaoaicdtfgqydbcitfaDBdbavaqydbcitfawBdlaqaqydbcefBdbavaoaDcdtfgqydbcitfawBdbavaqydbcitfaiBdlaqaqydbcefBdbavaoawcdtfgwydbcitfaiBdbavawydbcitfaDBdlawawydbcefBdbaecxfhearcufgrmbkkabydbcbBdbk;Qodvuv998Jjjjjbca9Rgvczfcwfcbyd11jjbBdbavcb8Pdj1jjb83izavcwfcbydN1jjbBdbavcb8Pd:m1jjb83ibdnadTmbaicd4hodnabmbdnalTmbcbhrinaealarcdtfydbao2cdtfhwcbhiinavczfaifgDawaifIdbgqaDIdbgkakaq9EEUdbavaifgDaqaDIdbgkakaq9DEUdbaiclfgicx9hmbkarcefgrad9hmbxikkaocdthrcbhwincbhiinavczfaifgDaeaifIdbgqaDIdbgkakaq9EEUdbavaifgDaqaDIdbgkakaq9DEUdbaiclfgicx9hmbkaearfheawcefgwad9hmbxdkkdnalTmbcbhrinabarcx2fgiaealarcdtfydbao2cdtfgwIdbUdbaiawIdlUdlaiawIdwUdwcbhiinavczfaifgDawaifIdbgqaDIdbgkakaq9EEUdbavaifgDaqaDIdbgkakaq9DEUdbaiclfgicx9hmbkarcefgrad9hmbxdkkaocdthlcbhraehwinabarcx2fgiaearao2cdtfgDIdbUdbaiaDIdlUdlaiaDIdwUdwcbhiinavczfaifgDawaifIdbgqaDIdbgkakaq9EEUdbavaifgDaqaDIdbgkakaq9DEUdbaiclfgicx9hmbkawalfhwarcefgrad9hmbkkJbbbbavIdbavIdzgk:tgqaqJbbbb9DEgqavIdlavIdCgx:tgmamaq9DEgqavIdwavIdKgm:tgPaPaq9DEhPdnabTmbadTmbJbbbbJbbjZaP:vaPJbbbb9BEhqinabaqabIdbak:tNUdbabclfgvaqavIdbax:tNUdbabcwfgvaqavIdbam:tNUdbabcxfhbadcufgdmbkkaPk8MbabaeadaialavcbcbcbcbcbaoarawaDz:bjjjbk8MbabaeadaialavaoarawaDaqakaxamaPz:bjjjbk:DCoDud99rue99iul998Jjjjjbc;Wb9Rgw8KjjjjbdndnarmbcbhDxekawcxfcbc;Kbz:ljjjb8Aawcuadcx2adc;v:Q;v:Qe0Ecbyd:m:jjjbHjjjjbbgqBdxawceBd2aqaeadaicbz:djjjb8AawcuadcdtadcFFFFi0Egkcbyd:m:jjjbHjjjjbbgxBdzawcdBd2adcd4adfhmceheinaegicetheaiam6mbkcbhPawcuaicdtgsaicFFFFi0Ecbyd:m:jjjbHjjjjbbgzBdCawciBd2dndnar:ZgH:rJbbbZMgO:lJbbb9p9DTmbaO:Ohexekcjjjj94hekaicufhAc:bwhmcbhCadhXcbhQinaChLaeamgKcufaeaK9iEaPgDcefaeaD9kEhYdndnadTmbaYcuf:YhOaqhiaxheadhmindndnaiIdbaONJbbbZMg8A:lJbbb9p9DTmba8A:OhCxekcjjjj94hCkaCcCthCdndnaiclfIdbaONJbbbZMg8A:lJbbb9p9DTmba8A:OhExekcjjjj94hEkaEcqtaCVhCdndnaicwfIdbaONJbbbZMg8A:lJbbb9p9DTmba8A:OhExekcjjjj94hEkaeaCaEVBdbaicxfhiaeclfheamcufgmmbkazcFeasz:ljjjbh3cbh5cbhPindna3axaPcdtfydbgCcm4aC7c:v;t;h;Ev2gics4ai7aAGgmcdtfgEydbgecuSmbaeaCSmbcehiina3amaifaAGgmcdtfgEydbgecuSmeaicefhiaeaC9hmbkkaEaCBdba5aecuSfh5aPcefgPad9hmbxdkkazcFeasz:ljjjb8Acbh5kaDaYa5ar0giEhPaLa5aiEhCdna5arSmbaYaKaiEgmaP9Rcd9imbdndnaQcl0mbdnaX:ZgOaL:Zg8A:taY:Yg8EaD:Y:tg8Fa8EaK:Y:tgaa5:ZghaH:tNNNaOaH:taaNa8Aah:tNa8AaH:ta8FNahaO:tNM:va8EMJbbbZMgO:lJbbb9p9DTmbaO:Ohexdkcjjjj94hexekaPamfcd9Theka5aXaiEhXaQcefgQcs9hmekkdndnaCmbcihicbhDxekcbhiawakcbyd:m:jjjbHjjjjbbg5BdKawclBd2aPcuf:Yh8AdndnadTmbaqhiaxheadhmindndnaiIdba8ANJbbbZMgO:lJbbb9p9DTmbaO:OhCxekcjjjj94hCkaCcCthCdndnaiclfIdba8ANJbbbZMgO:lJbbb9p9DTmbaO:OhExekcjjjj94hEkaEcqtaCVhCdndnaicwfIdba8ANJbbbZMgO:lJbbb9p9DTmbaO:OhExekcjjjj94hEkaeaCaEVBdbaicxfhiaeclfheamcufgmmbkazcFeasz:ljjjbh3cbhDcbhYindndndna3axaYcdtgKfydbgCcm4aC7c:v;t;h;Ev2gics4ai7aAGgmcdtfgEydbgecuSmbcehiinaxaecdtgefydbaCSmdamaifheaicefhia3aeaAGgmcdtfgEydbgecu9hmbkkaEaYBdbaDhiaDcefhDxeka5aefydbhika5aKfaiBdbaYcefgYad9hmbkcuaDc32giaDc;j:KM;jb0EhexekazcFeasz:ljjjb8AcbhDcbhekawaecbyd:m:jjjbHjjjjbbgeBd3awcvBd2aecbaiz:ljjjbhEavcd4hKdnadTmbdnalTmbaKcdth3a5hCaqhealhmadhAinaEaCydbc32fgiaeIdbaiIdbMUdbaiaeclfIdbaiIdlMUdlaiaecwfIdbaiIdwMUdwaiamIdbaiIdxMUdxaiamclfIdbaiIdzMUdzaiamcwfIdbaiIdCMUdCaiaiIdKJbbjZMUdKaCclfhCaecxfheama3fhmaAcufgAmbxdkka5hmaqheadhCinaEamydbc32fgiaeIdbaiIdbMUdbaiaeclfIdbaiIdlMUdlaiaecwfIdbaiIdwMUdwaiaiIdxJbbbbMUdxaiaiIdzJbbbbMUdzaiaiIdCJbbbbMUdCaiaiIdKJbbjZMUdKamclfhmaecxfheaCcufgCmbkkdnaDTmbaEhiaDheinaiaiIdbJbbbbJbbjZaicKfIdbgO:vaOJbbbb9BEgONUdbaiclfgmaOamIdbNUdbaicwfgmaOamIdbNUdbaicxfgmaOamIdbNUdbaiczfgmaOamIdbNUdbaicCfgmaOamIdbNUdbaic3fhiaecufgembkkcbhCawcuaDcdtgYaDcFFFFi0Egicbyd:m:jjjbHjjjjbbgeBdaawcoBd2awaicbyd:m:jjjbHjjjjbbg3Bd8KaecFeaYz:ljjjbhxdnadTmbJbbjZJbbjZa8A:vaPceSEaoNgOaONh8AaKcdthPalheina8Aaec;81jjbalEgmIdwaEa5ydbgAc32fgiIdC:tgOaONamIdbaiIdx:tgOaONamIdlaiIdz:tgOaONMMNaqcwfIdbaiIdw:tgOaONaqIdbaiIdb:tgOaONaqclfIdbaiIdl:tgOaONMMMhOdndnaxaAcdtgifgmydbcuSmba3aifIdbaO9ETmekamaCBdba3aifaOUdbka5clfh5aqcxfhqaeaPfheadaCcefgC9hmbkkabaxaYz:kjjjb8AcrhikaicdthiinaiTmeaic98fgiawcxffydbcbyd1:jjjbH:bjjjbbxbkkawc;Wbf8KjjjjbaDk:Ydidui99ducbhi8Jjjjjbca9Rglczfcwfcbyd11jjbBdbalcb8Pdj1jjb83izalcwfcbydN1jjbBdbalcb8Pd:m1jjb83ibdndnaembJbbjFhvJbbjFhoJbbjFhrxekadcd4cdthwincbhdinalczfadfgDabadfIdbgvaDIdbgoaoav9EEUdbaladfgDavaDIdbgoaoav9DEUdbadclfgdcx9hmbkabawfhbaicefgiae9hmbkalIdwalIdK:thralIdlalIdC:thoalIdbalIdz:thvkJbbbbavavJbbbb9DEgvaoaoav9DEgvararav9DEk9DeeuabcFeaicdtz:ljjjbhlcbhbdnadTmbindnalaeydbcdtfgiydbcu9hmbaiabBdbabcefhbkaeclfheadcufgdmbkkabk9teiucbcbyd:q:jjjbgeabcifc98GfgbBd:q:jjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;teeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk:3eedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdxaialBdwaialBdlaialBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabk9teiucbcbyd:q:jjjbgeabcrfc94GfgbBd:q:jjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik9:eiuZbhedndncbyd:q:jjjbgdaecztgi9nmbcuheadai9RcFFifcz4nbcuSmekadhekcbabae9Rcifc98Gcbyd:q:jjjbfgdBd:q:jjjbdnadZbcztge9nmbadae9RcFFifcz4nb8Akk6eiucbhidnadTmbdninabRbbglaeRbbgv9hmeaecefheabcefhbadcufgdmbxdkkalav9Rhikaikk:Iedbcjwk1eFFuuFFuuFFuuFFuFFFuFFFuFbbbbbbbbeeebeebebbeeebebbbbbebebbbbbbbbbebbbdbbbbbbbebbbebbbdbbbbbbbbbbbeeeeebebbebbebebbbeebbbbbbbbbbbbbbbbbbbbbc1Dkxebbbdbbb:GNbb";
    var wasmpack = new Uint8Array([
        32,
        0,
        65,
        2,
        1,
        106,
        34,
        33,
        3,
        128,
        11,
        4,
        13,
        64,
        6,
        253,
        10,
        7,
        15,
        116,
        127,
        5,
        8,
        12,
        40,
        16,
        19,
        54,
        20,
        9,
        27,
        255,
        113,
        17,
        42,
        67,
        24,
        23,
        146,
        148,
        18,
        14,
        22,
        45,
        70,
        69,
        56,
        114,
        101,
        21,
        25,
        63,
        75,
        136,
        108,
        28,
        118,
        29,
        73,
        115
    ]);
    if (typeof WebAssembly !== "object") {
        return {
            supported: false
        };
    }
    var instance2;
    var ready = WebAssembly.instantiate(unpack(wasm), {}).then(function (result) {
        instance2 = result.instance;
        instance2.exports.__wasm_call_ctors();
    });
    function unpack(data) {
        var result = new Uint8Array(data.length);
        for (var i = 0; i < data.length; ++i) {
            var ch = data.charCodeAt(i);
            result[i] = ch > 96 ? ch - 97 : ch > 64 ? ch - 39 : ch + 4;
        }
        var write = 0;
        for (var i = 0; i < data.length; ++i) {
            result[write++] = result[i] < 60 ? wasmpack[result[i]] : (result[i] - 60) * 64 + result[++i];
        }
        return result.buffer.slice(0, write);
    }
    function assert(cond) {
        if (!cond) {
            throw new Error("Assertion failed");
        }
    }
    function bytes(view) {
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    function reorder2(fun, indices, vertices) {
        var sbrk = instance2.exports.sbrk;
        var ip = sbrk(indices.length * 4);
        var rp = sbrk(vertices * 4);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        var indices8 = bytes(indices);
        heap.set(indices8, ip);
        var unique = fun(rp, ip, indices.length, vertices);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var remap2 = new Uint32Array(vertices);
        new Uint8Array(remap2.buffer).set(heap.subarray(rp, rp + vertices * 4));
        indices8.set(heap.subarray(ip, ip + indices.length * 4));
        sbrk(ip - sbrk(0));
        for (var i = 0; i < indices.length; ++i)
            indices[i] = remap2[indices[i]];
        return [remap2, unique];
    }
    function maxindex(source) {
        var result = 0;
        for (var i = 0; i < source.length; ++i) {
            var index = source[i];
            result = result < index ? index : result;
        }
        return result;
    }
    function simplify2(fun, indices, index_count, vertex_positions, vertex_count, vertex_positions_stride, target_index_count, target_error, options) {
        var sbrk = instance2.exports.sbrk;
        var te = sbrk(4);
        var ti = sbrk(index_count * 4);
        var sp = sbrk(vertex_count * vertex_positions_stride);
        var si = sbrk(index_count * 4);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(vertex_positions), sp);
        heap.set(bytes(indices), si);
        var result = fun(ti, si, index_count, sp, vertex_count, vertex_positions_stride, target_index_count, target_error, options, te);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var target = new Uint32Array(result);
        bytes(target).set(heap.subarray(ti, ti + result * 4));
        var error = new Float32Array(1);
        bytes(error).set(heap.subarray(te, te + 4));
        sbrk(te - sbrk(0));
        return [target, error[0]];
    }
    function simplifyAttr(fun, indices, index_count, vertex_positions, vertex_count, vertex_positions_stride, vertex_attributes, vertex_attributes_stride, attribute_weights, vertex_lock, target_index_count, target_error, options) {
        var sbrk = instance2.exports.sbrk;
        var te = sbrk(4);
        var ti = sbrk(index_count * 4);
        var sp = sbrk(vertex_count * vertex_positions_stride);
        var sa = sbrk(vertex_count * vertex_attributes_stride);
        var sw = sbrk(attribute_weights.length * 4);
        var si = sbrk(index_count * 4);
        var vl = vertex_lock ? sbrk(vertex_count) : 0;
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(vertex_positions), sp);
        heap.set(bytes(vertex_attributes), sa);
        heap.set(bytes(attribute_weights), sw);
        heap.set(bytes(indices), si);
        if (vertex_lock) {
            heap.set(bytes(vertex_lock), vl);
        }
        var result = fun(ti, si, index_count, sp, vertex_count, vertex_positions_stride, sa, vertex_attributes_stride, sw, attribute_weights.length, vl, target_index_count, target_error, options, te);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var target = new Uint32Array(result);
        bytes(target).set(heap.subarray(ti, ti + result * 4));
        var error = new Float32Array(1);
        bytes(error).set(heap.subarray(te, te + 4));
        sbrk(te - sbrk(0));
        return [target, error[0]];
    }
    function simplifyScale(fun, vertex_positions, vertex_count, vertex_positions_stride) {
        var sbrk = instance2.exports.sbrk;
        var sp = sbrk(vertex_count * vertex_positions_stride);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(vertex_positions), sp);
        var result = fun(sp, vertex_count, vertex_positions_stride);
        sbrk(sp - sbrk(0));
        return result;
    }
    function simplifyPoints(fun, vertex_positions, vertex_count, vertex_positions_stride, vertex_colors, vertex_colors_stride, color_weight, target_vertex_count) {
        var sbrk = instance2.exports.sbrk;
        var ti = sbrk(target_vertex_count * 4);
        var sp = sbrk(vertex_count * vertex_positions_stride);
        var sc = sbrk(vertex_count * vertex_colors_stride);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(vertex_positions), sp);
        if (vertex_colors) {
            heap.set(bytes(vertex_colors), sc);
        }
        var result = fun(ti, sp, vertex_count, vertex_positions_stride, sc, vertex_colors_stride, color_weight, target_vertex_count);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var target = new Uint32Array(result);
        bytes(target).set(heap.subarray(ti, ti + result * 4));
        sbrk(ti - sbrk(0));
        return target;
    }
    var simplifyOptions = {
        LockBorder: 1,
        Sparse: 2,
        ErrorAbsolute: 4,
        Prune: 8,
        _InternalDebug: 1 << 30
    };
    return {
        ready,
        supported: true,
        compactMesh: function (indices) {
            assert(indices instanceof Uint32Array || indices instanceof Int32Array || indices instanceof Uint16Array || indices instanceof Int16Array);
            assert(indices.length % 3 == 0);
            var indices32 = indices.BYTES_PER_ELEMENT == 4 ? indices : new Uint32Array(indices);
            return reorder2(instance2.exports.meshopt_optimizeVertexFetchRemap, indices32, maxindex(indices) + 1);
        },
        simplify: function (indices, vertex_positions, vertex_positions_stride, target_index_count, target_error, flags) {
            assert(indices instanceof Uint32Array || indices instanceof Int32Array || indices instanceof Uint16Array || indices instanceof Int16Array);
            assert(indices.length % 3 == 0);
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            assert(target_index_count >= 0 && target_index_count <= indices.length);
            assert(target_index_count % 3 == 0);
            assert(target_error >= 0);
            var options = 0;
            for (var i = 0; i < (flags ? flags.length : 0); ++i) {
                assert(flags[i] in simplifyOptions);
                options |= simplifyOptions[flags[i]];
            }
            var indices32 = indices.BYTES_PER_ELEMENT == 4 ? indices : new Uint32Array(indices);
            var result = simplify2(instance2.exports.meshopt_simplify, indices32, indices.length, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4, target_index_count, target_error, options);
            result[0] = indices instanceof Uint32Array ? result[0] : new indices.constructor(result[0]);
            return result;
        },
        simplifyWithAttributes: function (indices, vertex_positions, vertex_positions_stride, vertex_attributes, vertex_attributes_stride, attribute_weights, vertex_lock, target_index_count, target_error, flags) {
            assert(indices instanceof Uint32Array || indices instanceof Int32Array || indices instanceof Uint16Array || indices instanceof Int16Array);
            assert(indices.length % 3 == 0);
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            assert(vertex_attributes instanceof Float32Array);
            assert(vertex_attributes.length % vertex_attributes_stride == 0);
            assert(vertex_attributes_stride >= 0);
            assert(vertex_lock == null || vertex_lock instanceof Uint8Array);
            assert(vertex_lock == null || vertex_lock.length == vertex_positions.length / vertex_positions_stride);
            assert(target_index_count >= 0 && target_index_count <= indices.length);
            assert(target_index_count % 3 == 0);
            assert(target_error >= 0);
            assert(Array.isArray(attribute_weights));
            assert(vertex_attributes_stride >= attribute_weights.length);
            assert(attribute_weights.length <= 32);
            for (var i = 0; i < attribute_weights.length; ++i) {
                assert(attribute_weights[i] >= 0);
            }
            var options = 0;
            for (var i = 0; i < (flags ? flags.length : 0); ++i) {
                assert(flags[i] in simplifyOptions);
                options |= simplifyOptions[flags[i]];
            }
            var indices32 = indices.BYTES_PER_ELEMENT == 4 ? indices : new Uint32Array(indices);
            var result = simplifyAttr(instance2.exports.meshopt_simplifyWithAttributes, indices32, indices.length, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4, vertex_attributes, vertex_attributes_stride * 4, new Float32Array(attribute_weights), vertex_lock ? new Uint8Array(vertex_lock) : null, target_index_count, target_error, options);
            result[0] = indices instanceof Uint32Array ? result[0] : new indices.constructor(result[0]);
            return result;
        },
        getScale: function (vertex_positions, vertex_positions_stride) {
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            return simplifyScale(instance2.exports.meshopt_simplifyScale, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4);
        },
        simplifyPoints: function (vertex_positions, vertex_positions_stride, target_vertex_count, vertex_colors, vertex_colors_stride, color_weight) {
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            assert(target_vertex_count >= 0 && target_vertex_count <= vertex_positions.length / vertex_positions_stride);
            if (vertex_colors) {
                assert(vertex_colors instanceof Float32Array);
                assert(vertex_colors.length % vertex_colors_stride == 0);
                assert(vertex_colors_stride >= 3);
                assert(vertex_positions.length / vertex_positions_stride == vertex_colors.length / vertex_colors_stride);
                return simplifyPoints(instance2.exports.meshopt_simplifyPoints, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4, vertex_colors, vertex_colors_stride * 4, color_weight, target_vertex_count);
            }
            else {
                return simplifyPoints(instance2.exports.meshopt_simplifyPoints, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4, void 0, 0, 0, target_vertex_count);
            }
        }
    };
}();
var MeshoptClusterizer = function () {
    var wasm = "b9H79TebbbeVx9Geueu9Geub9Gbb9Giuuueu9Gmuuuuuuuuuuu9999eu9Gvuuuuueu9Gwuuuuuuuub9Gxuuuuuuuuuuuueu9Gkuuuuuuuuuu99eu9Gouuuuuub9Gruuuuuuub9GluuuubiOHdilvorwDDqkbiibeilve9Weiiviebeoweuec:q:Odkr:Yewo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9I919P29K9nW79O2Wt79c9V919U9KbeX9TW79O9V9Wt9F9I919P29K9nW79O2Wt7bo39TW79O9V9Wt9F9J9V9T9W91tWJ2917tWV9c9V919U9K7br39TW79O9V9Wt9F9J9V9T9W91tW9nW79O2Wt9c9V919U9K7bDL9TW79O9V9Wt9F9V9Wt9P9T9P96W9nW79O2Wtbql79IV9RbkDwebcekdsPq;29zHdbkIbabaec9:fgefcufae9Ugeabci9Uadfcufad9Ugbaeab0Ek:w8KDPue99eux99dui99euo99iu8Jjjjjbc:WD9Rgm8KjjjjbdndnalmbcbhPxekamc:Cwfcbc;Kbz:njjjb8Adndnalcb9imbaoal9nmbamcuaocdtaocFFFFi0Egscbyd:e1jjbHjjjjbbgzBd:CwamceBd;8wamascbyd:e1jjbHjjjjbbgHBd:GwamcdBd;8wamcualcdtalcFFFFi0Ecbyd:e1jjbHjjjjbbgOBd:KwamciBd;8waihsalhAinazasydbcdtfcbBdbasclfhsaAcufgAmbkaihsalhAinazasydbcdtfgCaCydbcefBdbasclfhsaAcufgAmbkaihsalhCcbhXindnazasydbcdtgQfgAydbcb9imbaHaQfaXBdbaAaAydbgQcjjjj94VBdbaQaXfhXkasclfhsaCcufgCmbkalci9UhLdnalci6mbcbhsaihAinaAcwfydbhCaAclfydbhXaHaAydbcdtfgQaQydbgQcefBdbaOaQcdtfasBdbaHaXcdtfgXaXydbgXcefBdbaOaXcdtfasBdbaHaCcdtfgCaCydbgCcefBdbaOaCcdtfasBdbaAcxfhAaLascefgs9hmbkkaihsalhAindnazasydbcdtgCfgXydbgQcu9kmbaXaQcFFFFrGgQBdbaHaCfgCaCydbaQ9RBdbkasclfhsaAcufgAmbxdkkamcuaocdtgsaocFFFFi0EgAcbyd:e1jjbHjjjjbbgzBd:CwamceBd;8wamaAcbyd:e1jjbHjjjjbbgHBd:GwamcdBd;8wamcualcdtalcFFFFi0Ecbyd:e1jjbHjjjjbbgOBd:KwamciBd;8wazcbasz:njjjbhXalci9UhLaihsalhAinaXasydbcdtfgCaCydbcefBdbasclfhsaAcufgAmbkdnaoTmbcbhsaHhAaXhCaohQinaAasBdbaAclfhAaCydbasfhsaCclfhCaQcufgQmbkkdnalci6mbcbhsaihAinaAcwfydbhCaAclfydbhQaHaAydbcdtfgKaKydbgKcefBdbaOaKcdtfasBdbaHaQcdtfgQaQydbgQcefBdbaOaQcdtfasBdbaHaCcdtfgCaCydbgCcefBdbaOaCcdtfasBdbaAcxfhAaLascefgs9hmbkkaoTmbcbhsaohAinaHasfgCaCydbaXasfydb9RBdbasclfhsaAcufgAmbkkamaLcbyd:e1jjbHjjjjbbgsBd:OwamclBd;8wascbaLz:njjjbhYamcuaLcK2alcjjjjd0Ecbyd:e1jjbHjjjjbbg8ABd:SwamcvBd;8wJbbbbhEdnalci6g3mbarcd4hKaihAa8AhsaLhrJbbbbh5inavaAclfydbaK2cdtfgCIdlh8EavaAydbaK2cdtfgXIdlhEavaAcwfydbaK2cdtfgQIdlh8FaCIdwhaaXIdwhhaQIdwhgasaCIdbg8JaXIdbg8KMaQIdbg8LMJbbnn:vUdbasclfaXIdlaCIdlMaQIdlMJbbnn:vUdbaQIdwh8MaCIdwh8NaXIdwhyascxfa8EaE:tg8Eagah:tggNa8FaE:tg8Faaah:tgaN:tgEJbbbbJbbjZa8Ja8K:tg8Ja8FNa8La8K:tg8Ka8EN:tghahNaEaENaaa8KNaga8JN:tgEaENMM:rg8K:va8KJbbbb9BEg8ENUdbasczfaEa8ENUdbascCfaha8ENUdbascwfa8Maya8NMMJbbnn:vUdba5a8KMh5aAcxfhAascKfhsarcufgrmbka5aL:Z:vJbbbZNhEkamcuaLcdtalcFFFF970Ecbyd:e1jjbHjjjjbbgCBd:WwamcoBd;8waEaq:ZNhEdna3mbcbhsaChAinaAasBdbaAclfhAaLascefgs9hmbkkaE:rhhcuh8PamcuaLcltalcFFFFd0Ecbyd:e1jjbHjjjjbbgIBd:0wamcrBd;8wcbaIa8AaCaLz:djjjb8AJFFuuhyJFFuuh8RJFFuuh8Sdnalci6gXmbJFFuuh8Sa8AhsaLhAJFFuuh8RJFFuuhyinascwfIdbgEayayaE9EEhyasclfIdbgEa8Ra8RaE9EEh8RasIdbgEa8Sa8SaE9EEh8SascKfhsaAcufgAmbkkahJbbbZNhgamaocetgscuaocu9kEcbyd:e1jjbHjjjjbbgABd:4waAcFeasz:njjjbhCdnaXmbcbhAJFFuuhEa8Ahscuh8PinascwfIdbay:tghahNasIdba8S:tghahNasclfIdba8R:tghahNMM:rghaEa8PcuSahaE9DVgXEhEaAa8PaXEh8PascKfhsaLaAcefgA9hmbkkamczfcbcjwz:njjjb8Aamcwf9cb83ibam9cb83ibagaxNhRJbbjZak:th8Ncbh8UJbbbbh8VJbbbbh8WJbbbbh8XJbbbbh8YJbbbbh8ZJbbbbh80cbh81cbhPinJbbbbhEdna8UTmbJbbjZa8U:Z:vhEkJbbbbhhdna80a80Na8Ya8YNa8Za8ZNMMg8KJbbbb9BmbJbbjZa8K:r:vhhka8XaENh5a8WaENh8Fa8VaENhaa8PhQdndndndndna8UaPVTmbamydwgBTmea80ahNh8Ja8ZahNh8La8YahNh8Maeamydbcdtfh83cbh3JFFuuhEcvhXcuhQindnaza83a3cdtfydbcdtgsfydbgvTmbaOaHasfydbcdtfhAindndnaCaiaAydbgKcx2fgsclfydbgrcetf8Vebcs4aCasydbgLcetf8Vebcs4faCascwfydbglcetf8Vebcs4fgombcbhsxekcehsazaLcdtfydbgLceSmbcehsazarcdtfydbgrceSmbcehsazalcdtfydbglceSmbdnarcdSaLcdSfalcdSfcd6mbaocefhsxekaocdfhskdnasaX9kmba8AaKcK2fgLIdwa5:thhaLIdla8F:th8KaLIdbaa:th8EdndnakJbbbb9DTmba8E:lg8Ea8K:lg8Ka8Ea8K9EEg8Kah:lgha8Kah9EEag:vJbbjZMhhxekahahNa8Ea8ENa8Ka8KNMM:rag:va8NNJbbjZMJ9VO:d86JbbjZaLIdCa8JNaLIdxa8MNa8LaLIdzNMMakN:tghahJ9VO:d869DENhhkaKaQasaX6ahaE9DVgLEhQasaXaLEhXahaEaLEhEkaAclfhAavcufgvmbkka3cefg3aB9hmbkkaQcu9hmekama5Ud:ODama8FUd:KDamaaUd:GDamcuBd:qDamcFFF;7rBdjDaIcba8AaYamc:GDfakJbbbb9Damc:qDfamcjDfz:ejjjbamyd:qDhQdndnaxJbbbb9ETmba8UaD6mbaQcuSmeceh3amIdjDaR9EmixdkaQcu9hmekdna8UTmbdnamydlgza8Uci2fgsciGTmbadasfcba8Uazcu7fciGcefz:njjjb8AkabaPcltfgzam8Pib83dbazcwfamcwf8Pib83dbaPcefhPkc3hzinazc98Smvamc:Cwfazfydbcbydj1jjbH:bjjjbbazc98fhzxbkkcbh3a8Uaq9pmbamydwaCaiaQcx2fgsydbcetf8Vebcs4aCascwfydbcetf8Vebcs4faCasclfydbcetf8Vebcs4ffaw9nmekcbhscbhAdna81TmbcbhAamczfhXinamczfaAcdtfaXydbgLBdbaXclfhXaAaYaLfRbbTfhAa81cufg81mbkkamydwhlamydbhXam9cu83i:GDam9cu83i:ODam9cu83i:qDam9cu83i:yDaAc;8eaAclfc:bd6Eh81inamcjDfasfcFFF;7rBdbasclfgscz9hmbka81cdthBdnalTmbaeaXcdtfhocbhrindnazaoarcdtfydbcdtgsfydbgvTmbaOaHasfydbcdtfhAcuhLcuhsinazaiaAydbgKcx2fgXclfydbcdtfydbazaXydbcdtfydbfazaXcwfydbcdtfydbfgXasaXas6gXEhsaKaLaXEhLaAclfhAavcufgvmbkaLcuSmba8AaLcK2fgAIdway:tgEaENaAIdba8S:tgEaENaAIdla8R:tgEaENMM:rhEcbhAindndnasamc:qDfaAfgvydbgX6mbasaX9hmeaEamcjDfaAfIdb9FTmekavasBdbamc:GDfaAfaLBdbamcjDfaAfaEUdbxdkaAclfgAcz9hmbkkarcefgral9hmbkkamczfaBfhLcbhscbhAindnamc:GDfasfydbgXcuSmbaLaAcdtfaXBdbaAcefhAkasclfgscz9hmbkaAa81fg81TmbJFFuuhhcuhKamczfhsa81hvcuhLina8AasydbgXcK2fgAIdway:tgEaENaAIdba8S:tgEaENaAIdla8R:tgEaENMM:rhEdndnazaiaXcx2fgAclfydbcdtfydbazaAydbcdtfydbfazaAcwfydbcdtfydbfgAaL6mbaAaL9hmeaEah9DTmekaEhhaAhLaXhKkasclfhsavcufgvmbkaKcuSmbaKhQkdnamaiaQcx2fgrydbarclfydbarcwfydbaCabaeadaPawaqa3z:fjjjbTmbaPcefhPJbbbbh8VJbbbbh8WJbbbbh8XJbbbbh8YJbbbbh8ZJbbbbh80kcbhXinaOaHaraXcdtfydbcdtgAfydbcdtfgKhsazaAfgvydbgLhAdnaLTmbdninasydbaQSmeasclfhsaAcufgATmdxbkkasaKaLcdtfc98fydbBdbavavydbcufBdbkaXcefgXci9hmbka8AaQcK2fgsIdbhEasIdlhhasIdwh8KasIdxh8EasIdzh5asIdCh8FaYaQfce86bba80a8FMh80a8Za5Mh8Za8Ya8EMh8Ya8Xa8KMh8Xa8WahMh8Wa8VaEMh8Vamydxh8Uxbkkamc:WDf8KjjjjbaPk;Vvivuv99lu8Jjjjjbca9Rgv8Kjjjjbdndnalcw0mbaiydbhoaeabcitfgralcdtcufBdlaraoBdbdnalcd6mbaiclfhoalcufhwarcxfhrinaoydbhDarcuBdbarc98faDBdbarcwfhraoclfhoawcufgwmbkkalabfhrxekcbhDavczfcwfcbBdbav9cb83izavcwfcbBdbav9cb83ibJbbjZhqJbbjZhkinadaiaDcdtfydbcK2fhwcbhrinavczfarfgoawarfIdbgxaoIdbgm:tgPakNamMgmUdbavarfgoaPaxam:tNaoIdbMUdbarclfgrcx9hmbkJbbjZaqJbbjZMgq:vhkaDcefgDal9hmbkcbhoadcbcecdavIdlgxavIdwgm9GEgravIdbgPam9GEaraPax9GEgscdtgrfhzavczfarfIdbhxaihralhwinaiaocdtfgDydbhHaDarydbgOBdbaraHBdbarclfhraoazaOcK2fIdbax9Dfhoawcufgwmbkaeabcitfhrdndnaocv6mbaoalc98f6mekaraiydbBdbaralcdtcufBdlaiclfhoalcufhwarcxfhrinaoydbhDarcuBdbarc98faDBdbarcwfhraoclfhoawcufgwmbkalabfhrxekaraxUdbararydlc98GasVBdlabcefaeadaiaoz:djjjbhwararydlciGawabcu7fcdtVBdlawaeadaiaocdtfalao9Rz:djjjbhrkavcaf8Kjjjjbark:;idiud99dndnabaecitfgwydlgDciGgqciSmbinabcbaDcd4gDalaqcdtfIdbawIdb:tgkJbbbb9FEgwaecefgefadaialavaoarz:ejjjbak:larIdb9FTmdabawaD7aefgecitfgwydlgDciGgqci9hmbkkabaecitfgeclfhbdnavmbcuhwindnaiaeydbgDfRbbmbadaDcK2fgqIdwalIdw:tgkakNaqIdbalIdb:tgkakNaqIdlalIdl:tgkakNMM:rgkarIdb9DTmbarakUdbaoaDBdbkaecwfheawcefgwabydbcd46mbxdkkcuhwindnaiaeydbgDfRbbmbadaDcK2fgqIdbalIdb:t:lgkaqIdlalIdl:t:lgxakax9EEgkaqIdwalIdw:t:lgxakax9EEgkarIdb9DTmbarakUdbaoaDBdbkaecwfheawcefgwabydbcd46mbkkk;llevudnabydwgxaladcetfgm8Vebcs4alaecetfgP8Vebgscs4falaicetfgz8Vebcs4ffaD0abydxaq9pVakVgDce9hmbavawcltfgxab8Pdb83dbaxcwfabcwfgx8Pdb83dbdnaxydbgqTmbaoabydbcdtfhxaqhsinalaxydbcetfcFFi87ebaxclfhxascufgsmbkkdnabydxglci2gsabydlgxfgkciGTmbarakfcbalaxcu7fciGcefz:njjjb8Aabydxci2hsabydlhxabydwhqkab9cb83dwababydbaqfBdbabascifc98GaxfBdlaP8Vebhscbhxkdnascztcz91cu9kmbabaxcefBdwaPax87ebaoabydbcdtfaxcdtfaeBdbkdnam8Uebcu9kmbababydwgxcefBdwamax87ebaoabydbcdtfaxcdtfadBdbkdnaz8Uebcu9kmbababydwgxcefBdwazax87ebaoabydbcdtfaxcdtfaiBdbkarabydlfabydxci2faPRbb86bbarabydlfabydxci2fcefamRbb86bbarabydlfabydxci2fcdfazRbb86bbababydxcefBdxaDk8LbabaeadaialavaoarawaDaDaqJbbbbz:cjjjbk;Jkovud99euv99eul998Jjjjjbc:W;ae9Rgo8KjjjjbdndnadTmbavcd4hrcbhwcbhDindnaiaeclfydbar2cdtfgvIdbaiaeydbar2cdtfgqIdbgk:tgxaiaecwfydbar2cdtfgmIdlaqIdlgP:tgsNamIdbak:tgzavIdlaP:tgPN:tgkakNaPamIdwaqIdwgH:tgONasavIdwaH:tgHN:tgPaPNaHazNaOaxN:tgxaxNMM:rgsJbbbb9Bmbaoc:W:qefawcx2fgAakas:vUdwaAaxas:vUdlaAaPas:vUdbaoc8Wfawc8K2fgAaq8Pdb83dbaAav8Pdb83dxaAam8Pdb83dKaAcwfaqcwfydbBdbaAcCfavcwfydbBdbaAcafamcwfydbBdbawcefhwkaecxfheaDcifgDad6mbkab9cb83dbabcyf9cb83dbabcaf9cb83dbabcKf9cb83dbabczf9cb83dbabcwf9cb83dbawTmeaocbBd8Sao9cb83iKao9cb83izaoczfaoc8Wfawci2cxaoc8Sfcbz1jjjbaoIdKhCaoIdChXaoIdzhQao9cb83iwao9cb83ibaoaoc:W:qefawcxaoc8Sfcbz1jjjbJbbjZhkaoIdwgPJbbbbJbbjZaPaPNaoIdbgPaPNaoIdlgsasNMM:rgx:vaxJbbbb9BEgzNhxasazNhsaPazNhzaoc:W:qefheawhvinaecwfIdbaxNaeIdbazNasaeclfIdbNMMgPakaPak9DEhkaecxfheavcufgvmbkabaCUdwabaXUdlabaQUdbabaoId3UdxdndnakJ;n;m;m899FmbJbbbbhPaoc:W:qefheaoc8WfhvinaCavcwfIdb:taecwfIdbgHNaQavIdb:taeIdbgONaXavclfIdb:taeclfIdbgLNMMaxaHNazaONasaLNMM:vgHaPaHaP9EEhPavc8KfhvaecxfheawcufgwmbkabaxUd8KabasUdaabazUd3abaCaxaPN:tUdKabaXasaPN:tUdCabaQazaPN:tUdzabJbbjZakakN:t:rgkUdydndnaxJbbj:;axJbbj:;9GEgPJbbjZaPJbbjZ9FEJbb;:9cNJbbbZJbbb:;axJbbbb9GEMgP:lJbbb9p9DTmbaP:Ohexekcjjjj94hekabae86b8UdndnasJbbj:;asJbbj:;9GEgPJbbjZaPJbbjZ9FEJbb;:9cNJbbbZJbbb:;asJbbbb9GEMgP:lJbbb9p9DTmbaP:Ohvxekcjjjj94hvkabav86bRdndnazJbbj:;azJbbj:;9GEgPJbbjZaPJbbjZ9FEJbb;:9cNJbbbZJbbb:;azJbbbb9GEMgP:lJbbb9p9DTmbaP:Ohqxekcjjjj94hqkabaq86b8SdndnaecKtcK91:YJbb;:9c:vax:t:lavcKtcK91:YJbb;:9c:vas:t:laqcKtcK91:YJbb;:9c:vaz:t:lakMMMJbb;:9cNJbbjZMgk:lJbbb9p9DTmbak:Ohexekcjjjj94hekaecFbaecFb9iEhexekabcjjj;8iBdycFbhekabae86b8Vxekab9cb83dbabcyf9cb83dbabcaf9cb83dbabcKf9cb83dbabczf9cb83dbabcwf9cb83dbkaoc:W;aef8Kjjjjbk;Yodouk99cbho8Jjjjjbca9RgrczfcwfcbBdbar9cb83izarcwfcbBdbar9cb83ibavcd4hwaicd4hDdnadTmbaDcdthqaehkinalaoaw2cdtfIdbhxcbhvinarczfavfgiaoaiydbgiakavfIdbgmax:taeavaqai2ffIdbalaiaw2cdtfIdb:t9DEBdbaravfgiaoaiydbgiaxamMaeavaqai2ffIdbalaiaw2cdtfIdbM9EEBdbavclfgvcx9hmbkakaqfhkaocefgoad9hmbkkJbbbbhxcbhvcbhkcbhiinalaravfydbgoaw2cdtfIdbalarczfavfydbgqaw2cdtfIdbaeaoaD2cdtfgoIdwaeaqaD2cdtfgqIdw:tgmamNaoIdbaqIdb:tgmamNaoIdlaqIdl:tgmamNMM:rMMgmaxamax9EgoEhxaiakaoEhkavclfhvaicefgici9hmbkJbbbbhmdnaearakcdtgifydbgoaD2cdtfgvIdwaearczfaifydbgraD2cdtfgiIdwgP:tgsasNavIdbaiIdbgz:tgHaHNavIdlaiIdlgO:tgAaANMM:rgCJbbbb9ETmbaCalaoaw2cdtfIdbMalaraw2cdtfIdb:taCaCM:vhmkaxJbbbZNhCasamNaPMhPaAamNaOMhOaHamNazMhzdnadTmbaDcdthvawcdthiindnalIdbgXaecwfIdbaP:tgxaxNaeIdbaz:tgmamNaeclfIdbaO:tgsasNMM:rgHMgQaC9ETmbJbbbbhAdnaHJbbbb9ETmbaQaC:taHaHM:vhAkaAaxNaPMhPaAasNaOMhOaAamNazMhzaXaCaHMMJbbbZNhCkaeavfhealaifhladcufgdmbkkabaCUdxabaPUdwabaOUdlabazUdbkjeeiu8Jjjjjbcj8W9Rgr8Kjjjjbaici2hwdnaiTmbawceawce0EhDarhiinaiaeadRbbcdtfydbBdbadcefhdaiclfhiaDcufgDmbkkabarawaladaoz:hjjjbarcj8Wf8Kjjjjbk:3lequ8JjjjjbcjP9Rgl8Kjjjjbcbhvalcjxfcbaiz:njjjb8AdndnadTmbcjehoaehrincuhwarhDcuhqavhkdninawakaoalcjxfaDcefRbbfRbb9RcFeGci6aoalcjxfaDRbbfRbb9RcFeGci6faoalcjxfaDcdfRbbfRbb9RcFeGci6fgxaq9mgmEhwdnammbaxce0mdkaxaqaxaq9kEhqaDcifhDadakcefgk9hmbkkaeawci2fgDcdfRbbhqaDcefRbbhxaDRbbhkaeavci2fgDcifaDawav9Rci2z:qjjjb8Aakalcjxffaocefgo86bbaxalcjxffao86bbaDcdfaq86bbaDcefax86bbaDak86bbaqalcjxffao86bbarcifhravcefgvad9hmbkalcFeaicetz:njjjbhoadci2gDceaDce0EhqcbhxindnaoaeRbbgkcetfgw8UebgDcu9kmbawax87ebaocjlfaxcdtfabakcdtfydbBdbaxhDaxcefhxkaeaD86bbaecefheaqcufgqmbkaxcdthDxekcbhDkabalcjlfaDz:mjjjb8AalcjPf8Kjjjjbk9teiucbcbyd11jjbgeabcifc98GfgbBd11jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;teeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk:3eedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdxaialBdwaialBdlaialBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabk9teiucbcbyd11jjbgeabcrfc94GfgbBd11jjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik9:eiuZbhedndncbyd11jjbgdaecztgi9nmbcuheadai9RcFFifcz4nbcuSmekadhekcbabae9Rcifc98Gcbyd11jjbfgdBd11jjbdnadZbcztge9nmbadae9RcFFifcz4nb8Akk:;Deludndndnadch9pmbabaeSmdaeabadfgi9Rcbadcet9R0mekabaead;8qbbxekaeab7ciGhldndndnabae9pmbdnalTmbadhvabhixikdnabciGmbadhvabhixdkadTmiabaeRbb86bbadcufhvdnabcefgiciGmbaecefhexdkavTmiabaeRbe86beadc9:fhvdnabcdfgiciGmbaecdfhexdkavTmiabaeRbd86bdadc99fhvdnabcifgiciGmbaecifhexdkavTmiabaeRbi86biabclfhiaeclfheadc98fhvxekdnalmbdnaiciGTmbadTmlabadcufgifglaeaifRbb86bbdnalciGmbaihdxekaiTmlabadc9:fgifglaeaifRbb86bbdnalciGmbaihdxekaiTmlabadc99fgifglaeaifRbb86bbdnalciGmbaihdxekaiTmlabadc98fgdfaeadfRbb86bbkadcl6mbdnadc98fgocd4cefciGgiTmbaec98fhlabc98fhvinavadfaladfydbBdbadc98fhdaicufgimbkkaocx6mbaec9Wfhvabc9WfhoinaoadfgicxfavadfglcxfydbBdbaicwfalcwfydbBdbaiclfalclfydbBdbaialydbBdbadc9Wfgdci0mbkkadTmdadhidnadciGglTmbaecufhvabcufhoadhiinaoaifavaifRbb86bbaicufhialcufglmbkkadcl6mdaec98fhlabc98fhvinavaifgecifalaifgdcifRbb86bbaecdfadcdfRbb86bbaecefadcefRbb86bbaeadRbb86bbaic98fgimbxikkavcl6mbdnavc98fglcd4cefcrGgdTmbavadcdt9RhvinaiaeydbBdbaeclfheaiclfhiadcufgdmbkkalc36mbinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaiaeydzBdzaiaeydCBdCaiaeydKBdKaiaeyd3Bd3aecafheaicafhiavc9Gfgvci0mbkkavTmbdndnavcrGgdmbavhlxekavc94GhlinaiaeRbb86bbaicefhiaecefheadcufgdmbkkavcw6mbinaiaeRbb86bbaiaeRbe86beaiaeRbd86bdaiaeRbi86biaiaeRbl86blaiaeRbv86bvaiaeRbo86boaiaeRbr86braicwfhiaecwfhealc94fglmbkkabkkAebcjwkxebbbdbbbzNbb";
    var wasmpack = new Uint8Array([
        32,
        0,
        65,
        2,
        1,
        106,
        34,
        33,
        3,
        128,
        11,
        4,
        13,
        64,
        6,
        253,
        10,
        7,
        15,
        116,
        127,
        5,
        8,
        12,
        40,
        16,
        19,
        54,
        20,
        9,
        27,
        255,
        113,
        17,
        42,
        67,
        24,
        23,
        146,
        148,
        18,
        14,
        22,
        45,
        70,
        69,
        56,
        114,
        101,
        21,
        25,
        63,
        75,
        136,
        108,
        28,
        118,
        29,
        73,
        115
    ]);
    if (typeof WebAssembly !== "object") {
        return {
            supported: false
        };
    }
    var instance2;
    var ready = WebAssembly.instantiate(unpack(wasm), {}).then(function (result) {
        instance2 = result.instance;
        instance2.exports.__wasm_call_ctors();
    });
    function unpack(data) {
        var result = new Uint8Array(data.length);
        for (var i = 0; i < data.length; ++i) {
            var ch = data.charCodeAt(i);
            result[i] = ch > 96 ? ch - 97 : ch > 64 ? ch - 39 : ch + 4;
        }
        var write = 0;
        for (var i = 0; i < data.length; ++i) {
            result[write++] = result[i] < 60 ? wasmpack[result[i]] : (result[i] - 60) * 64 + result[++i];
        }
        return result.buffer.slice(0, write);
    }
    function assert(cond) {
        if (!cond) {
            throw new Error("Assertion failed");
        }
    }
    function bytes(view) {
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    var BOUNDS_SIZE = 48;
    var MESHLET_SIZE = 16;
    function extractMeshlet(buffers, index) {
        var vertex_offset = buffers.meshlets[index * 4 + 0];
        var triangle_offset = buffers.meshlets[index * 4 + 1];
        var vertex_count = buffers.meshlets[index * 4 + 2];
        var triangle_count = buffers.meshlets[index * 4 + 3];
        return {
            vertices: buffers.vertices.subarray(vertex_offset, vertex_offset + vertex_count),
            triangles: buffers.triangles.subarray(triangle_offset, triangle_offset + triangle_count * 3)
        };
    }
    function buildMeshlets(indices, vertex_positions, vertex_count, vertex_positions_stride, max_vertices, max_triangles, cone_weight) {
        var sbrk = instance2.exports.sbrk;
        var max_meshlets = instance2.exports.meshopt_buildMeshletsBound(indices.length, max_vertices, max_triangles);
        var meshletsp = sbrk(max_meshlets * MESHLET_SIZE);
        var meshlet_verticesp = sbrk(max_meshlets * max_vertices * 4);
        var meshlet_trianglesp = sbrk(max_meshlets * max_triangles * 3);
        var indicesp = sbrk(indices.byteLength);
        var verticesp = sbrk(vertex_positions.byteLength);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(indices), indicesp);
        heap.set(bytes(vertex_positions), verticesp);
        var count = instance2.exports.meshopt_buildMeshlets(meshletsp, meshlet_verticesp, meshlet_trianglesp, indicesp, indices.length, verticesp, vertex_count, vertex_positions_stride, max_vertices, max_triangles, cone_weight);
        heap = new Uint8Array(instance2.exports.memory.buffer);
        var meshletBytes = heap.subarray(meshletsp, meshletsp + count * MESHLET_SIZE);
        var meshlets = new Uint32Array(meshletBytes.buffer, meshletBytes.byteOffset, meshletBytes.byteLength / 4).slice();
        for (var i = 0; i < count; ++i) {
            var vertex_offset = meshlets[i * 4 + 0];
            var triangle_offset = meshlets[i * 4 + 1];
            var vertex_count = meshlets[i * 4 + 2];
            var triangle_count = meshlets[i * 4 + 3];
            instance2.exports.meshopt_optimizeMeshlet(meshlet_verticesp + vertex_offset * 4, meshlet_trianglesp + triangle_offset, triangle_count, vertex_count);
        }
        var last_vertex_offset = meshlets[(count - 1) * 4 + 0];
        var last_triangle_offset = meshlets[(count - 1) * 4 + 1];
        var last_vertex_count = meshlets[(count - 1) * 4 + 2];
        var last_triangle_count = meshlets[(count - 1) * 4 + 3];
        var used_vertices = last_vertex_offset + last_vertex_count;
        var used_triangles = last_triangle_offset + (last_triangle_count * 3 + 3 & ~3);
        var result = {
            meshlets,
            vertices: new Uint32Array(heap.buffer, meshlet_verticesp, used_vertices).slice(),
            triangles: new Uint8Array(heap.buffer, meshlet_trianglesp, used_triangles * 3).slice(),
            meshletCount: count
        };
        sbrk(meshletsp - sbrk(0));
        return result;
    }
    function extractBounds(boundsp) {
        var bounds_floats = new Float32Array(instance2.exports.memory.buffer, boundsp, BOUNDS_SIZE / 4);
        return {
            centerX: bounds_floats[0],
            centerY: bounds_floats[1],
            centerZ: bounds_floats[2],
            radius: bounds_floats[3],
            coneApexX: bounds_floats[4],
            coneApexY: bounds_floats[5],
            coneApexZ: bounds_floats[6],
            coneAxisX: bounds_floats[7],
            coneAxisY: bounds_floats[8],
            coneAxisZ: bounds_floats[9],
            coneCutoff: bounds_floats[10]
        };
    }
    function computeMeshletBounds(buffers, vertex_positions, vertex_count, vertex_positions_stride) {
        var sbrk = instance2.exports.sbrk;
        var results = [];
        var verticesp = sbrk(vertex_positions.byteLength);
        var meshlet_verticesp = sbrk(buffers.vertices.byteLength);
        var meshlet_trianglesp = sbrk(buffers.triangles.byteLength);
        var resultp = sbrk(BOUNDS_SIZE);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(vertex_positions), verticesp);
        heap.set(bytes(buffers.vertices), meshlet_verticesp);
        heap.set(bytes(buffers.triangles), meshlet_trianglesp);
        for (var i = 0; i < buffers.meshletCount; ++i) {
            var vertex_offset = buffers.meshlets[i * 4 + 0];
            var triangle_offset = buffers.meshlets[i * 4 + 0 + 1];
            var triangle_count = buffers.meshlets[i * 4 + 0 + 3];
            instance2.exports.meshopt_computeMeshletBounds(resultp, meshlet_verticesp + vertex_offset * 4, meshlet_trianglesp + triangle_offset, triangle_count, verticesp, vertex_count, vertex_positions_stride);
            results.push(extractBounds(resultp));
        }
        sbrk(verticesp - sbrk(0));
        return results;
    }
    function computeClusterBounds(indices, vertex_positions, vertex_count, vertex_positions_stride) {
        var sbrk = instance2.exports.sbrk;
        var resultp = sbrk(BOUNDS_SIZE);
        var indicesp = sbrk(indices.byteLength);
        var verticesp = sbrk(vertex_positions.byteLength);
        var heap = new Uint8Array(instance2.exports.memory.buffer);
        heap.set(bytes(indices), indicesp);
        heap.set(bytes(vertex_positions), verticesp);
        instance2.exports.meshopt_computeClusterBounds(resultp, indicesp, indices.length, verticesp, vertex_count, vertex_positions_stride);
        var result = extractBounds(resultp);
        sbrk(resultp - sbrk(0));
        return result;
    }
    return {
        ready,
        supported: true,
        buildMeshlets: function (indices, vertex_positions, vertex_positions_stride, max_vertices, max_triangles, cone_weight) {
            assert(indices.length % 3 == 0);
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            assert(max_vertices <= 256 || max_vertices > 0);
            assert(max_triangles <= 512);
            assert(max_triangles % 4 == 0);
            cone_weight = cone_weight || 0;
            var indices32 = indices.BYTES_PER_ELEMENT == 4 ? indices : new Uint32Array(indices);
            return buildMeshlets(indices32, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4, max_vertices, max_triangles, cone_weight);
        },
        computeClusterBounds: function (indices, vertex_positions, vertex_positions_stride) {
            assert(indices.length % 3 == 0);
            assert(indices.length / 3 <= 512);
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            var indices32 = indices.BYTES_PER_ELEMENT == 4 ? indices : new Uint32Array(indices);
            return computeClusterBounds(indices32, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4);
        },
        computeMeshletBounds: function (buffers, vertex_positions, vertex_positions_stride) {
            assert(buffers.meshletCount != 0);
            assert(vertex_positions instanceof Float32Array);
            assert(vertex_positions.length % vertex_positions_stride == 0);
            assert(vertex_positions_stride >= 3);
            return computeMeshletBounds(buffers, vertex_positions, vertex_positions.length / vertex_positions_stride, vertex_positions_stride * 4);
        },
        extractMeshlet: function (buffers, index) {
            assert(index >= 0 && index < buffers.meshletCount);
            return extractMeshlet(buffers, index);
        }
    };
}();
export { ALL_EXTENSIONS, Accessor, Animation, AnimationChannel, AnimationSampler, Anisotropy, Buffer$1 as Buffer, BufferUtils, COPY_IDENTITY, Camera, Clearcoat, ColorUtils, ComponentTypeToTypedArray, DRACO_DEFAULTS, DenoIO, DiffuseTransmission, Dispersion, Document, EXTMeshGPUInstancing, EXTMeshoptCompression, EXTTextureAVIF, EXTTextureWebP, EmissiveStrength, ExtensibleProperty, Extension, ExtensionProperty, FLATTEN_DEFAULTS, FileUtils, Format, GLB_BUFFER, Graph, GraphEdge, HTTPUtils, INSTANCE_ATTRIBUTE, INSTANCE_DEFAULTS, IOR, ImageUtils, InstancedMesh, Iridescence, JOIN_DEFAULTS, KHRDracoMeshCompression, KHRLightsPunctual, KHRMaterialsAnisotropy, KHRMaterialsClearcoat, KHRMaterialsDiffuseTransmission, KHRMaterialsDispersion, KHRMaterialsEmissiveStrength, KHRMaterialsIOR, KHRMaterialsIridescence, KHRMaterialsPBRSpecularGlossiness, KHRMaterialsSheen, KHRMaterialsSpecular, KHRMaterialsTransmission, KHRMaterialsUnlit, KHRMaterialsVariants, KHRMaterialsVolume, KHRMeshQuantization, KHRONOS_EXTENSIONS, KHRTextureBasisu, KHRTextureTransform, KHRXMP, Light, Logger, MESHOPT_DEFAULTS, Mapping, MappingList, Material, MathUtils, Mesh, MeshoptClusterizer, MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier, Node, NodeIO, PALETTE_DEFAULTS, PBRSpecularGlossiness, PRUNE_DEFAULTS, Packet, PlatformIO, Primitive, PrimitiveTarget, Property, PropertyType, QUANTIZE_DEFAULTS, ReaderContext, RefList, RefMap, RefSet, Root, SIMPLIFY_DEFAULTS, Scene, Sheen, Skin, Specular, TEXTURE_COMPRESS_DEFAULTS, TEXTURE_COMPRESS_SUPPORTED_FORMATS, Texture, TextureChannel, TextureInfo, TextureResizeFilter, Transform, Transmission, Unlit, VERSION, Variant, Verbosity, VertexCountMethod, VertexLayout, Volume, WELD_DEFAULTS, WebIO, WriterContext, assignDefaults, center, clearNodeParent, clearNodeTransform, cloneDocument, compactAttribute, compactPrimitive, compressTexture, convertPrimitiveToLines, convertPrimitiveToTriangles, copyToDocument, createDefaultPropertyResolver, createInstanceNodes, createTransform, dedup, dequantize, dequantizePrimitive, draco, fitPowerOfTwo, fitWithin, flatten, getGLPrimitiveCount, getMeshVertexCount, getNodeVertexCount, getPrimitiveVertexCount, getSceneVertexCount, getTextureChannelMask, getTextureColorSpace, inspect, instance, isTransformPending, join, joinPrimitives, listNodeScenes, listTextureChannels, listTextureInfo, listTextureInfoByMaterial, listTextureSlots, mergeDocuments, meshopt, metalRough, moveToDocument, normals, palette, partition, prune, quantize, reorder, resample, sequence, simplify, simplifyPrimitive, sortPrimitiveWeights, sparse, tangents, textureCompress, transformMesh, transformPrimitive, uninstance, unlit, unpartition, unweld, unweldPrimitive, uuid, vertexColorSpace, weld, weldPrimitive };
