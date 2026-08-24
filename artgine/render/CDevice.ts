import {CAlert} from "../basic/CAlert.js";
import { CConsol } from "../basic/CConsol.js";
import {CPreferences} from "../basic/CPreferences.js";
import {CUtil} from "../basic/CUtil.js";
import {CVec4} from "../geometry/CVec4.js";
import {CRenderPass} from "./CRenderPass.js";

//var g_support={half_float:true}
var g_property=new Map<number,number>();
export class CDevice
{
    public mDrawType=-1;
	mViewportArr=[0,0,0,0];
	mDepthVal=0.0;
	mColorVal=new CVec4(0,0,0,0);
	mClearColor=true;
	mClearDepth=true;
    mStaticRP=new CRenderPass();
	

    public m_pf : CPreferences=null;

    constructor(_pf : CPreferences,_handle : HTMLCanvasElement)
	{
        this.m_pf=_pf;

		this.mStaticRP.mDepthTest=true;
		this.mStaticRP.mDepthWrite=true;
		this.mStaticRP.mAlpha=true;
		this.mStaticRP.mCullFace=CRenderPass.eCull.CCW;
		this.mStaticRP.mLine=CRenderPass.eLine.TRIANGLES;
		this.mStaticRP.mBlend=[CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.FUNC_ADD,CRenderPass.eBlend.SRC_ALPHA,
            CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA,CRenderPass.eBlend.ONE,CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA];
	}
    GetMainFrameTex() { return null; }
	PF()	{	return this.m_pf;	}
    GetHandle()	{		return null;	}
    GL()	:  WebGL2RenderingContext	{	    return null;	}
	GPU()	:  GPUDevice	{	    return null;	}
    DrawType()	{	return -1;	}
	async Init(){}
    SetClearColor(_enable,_val : CVec4=null)
	{	
		this.mClearColor=_enable;	
		if(_val!=null)	this.mColorVal=_val;
	}
	SetClearDepth(_enable,_val=null)
	{	
		this.mClearDepth=_enable;
		if(_val!=null)	this.mDepthVal=_val;
	}
	SetAlpha(_enable){}
	SetCullFace(_enable : number){}
	SetDepthWrite(_enable){}
	SetDepthTest(_enable){}
	SetBlend(_data : Array<number>){}
	SetLine(_type : number|boolean){}
	ViewPort(_x : number,_y : number,_w : number,_h : number){}
	//렌더링 중에는 rp가 안변한다고 생각하고 이렇게 처리
	//멀티 스레딩 상황에서는 문제가 될수 있다!
	ChangeRenderPass(_rp : CRenderPass)
	{
		var dum=new CRenderPass();
		dum.mAlpha=this.mStaticRP.mAlpha;
		dum.mCullFace=this.mStaticRP.mCullFace;
		dum.mDepthTest=this.mStaticRP.mDepthTest;
		dum.mDepthWrite=this.mStaticRP.mDepthWrite;
		dum.mLine=this.mStaticRP.mLine;
		for(var i=0;i<this.mStaticRP.mBlend.length;++i)
		{
			dum.mBlend[i]=this.mStaticRP.mBlend[i];
		}
		
		
		
		if(_rp.mAlpha!=null && dum.mAlpha!=_rp.mAlpha)
		{
			this.SetAlpha(_rp.mAlpha);
			//this.SetAlpha(dum.m_alpha);
		}
			
		if(_rp.mCullFace!=null && dum.mCullFace!=_rp.mCullFace)
		{
			this.SetCullFace(_rp.mCullFace);
			//this.SetCull(dum.m_cull);
		}
			
		if(_rp.mDepthTest!=null && dum.mDepthTest!=_rp.mDepthTest)
		{
			this.SetDepthTest(_rp.mDepthTest);
			//this.SetDepthTest(dum.m_depthTest);
		}
		
		if(_rp.mDepthWrite!=null && dum.mDepthWrite!=_rp.mDepthWrite)
		{
			this.SetDepthWrite(_rp.mDepthWrite);
			//this.SetDepthWrite(dum.m_depthWrite);
		}
		if(_rp.mLine!=null && dum.mLine!=_rp.mLine)
		{
			this.SetLine(_rp.mLine);
			//this.SetDepthWrite(dum.m_depthWrite);
		}
		if(dum.mBlend[0]!=_rp.mBlend[0] || dum.mBlend[1]!=_rp.mBlend[1] || dum.mBlend[2]!=_rp.mBlend[2] || 
			dum.mBlend[3]!=_rp.mBlend[3] || dum.mBlend[4]!=_rp.mBlend[4] || dum.mBlend[5]!=_rp.mBlend[5] )
		{
			this.SetBlend(_rp.mBlend);
			//this.SetDepthWrite(dum.m_depthWrite);
		}
		
		
		return dum;
		
	}
	static GetProperty(_pro : number)
	{
		return g_property.get(_pro);
	}
	static SetProperty(_pro : number,_val)
	{
		return g_property.set(_pro,_val);
	}
	static eProperty=
	{
		VertexUniform:0,
		PixelUniform:1,
		Sam2DMax:2,
		Sam2DArrMax:3,
		SamCubeMax:4,
		Sam2dArrLayerMax:5,
		//TexSize:6,
		Sam2DSize:7,
		//Sam2DWriteX:7,
		//Sam2DWriteY:8,

        //HalfFloat:9,
		FloatTex16:10,
		FloatTex32:11,

		ClipControl:12,
		
	}
	//2060 Super : BenchmarkScore: 142  ALU:89ms  FILL:81ms  GEO:27ms
	//se2 : BenchmarkScore: 8  ALU:1837ms  FILL:1141ms  GEO:191ms
	//1050 ti : BenchmarkScore: 55  ALU:270ms  FILL:175ms  GEO:51ms
	async BenchmarkScore() : Promise<number>{	return null;	}
    
}
export class CDeviceGL extends CDevice
{
	public mGL : RenderingContext;
	mKHR_parallel_shader_compile : any=0;
	constructor(_pf : CPreferences,_handle : HTMLCanvasElement)
	{
		super(_pf,_handle);
		//powerPreference
    	//"default": 유저 에이전트가 가장 적합한 GPU 구성을 결정하도록 합니다. 기본 값입니다.
    	//"high-performance": 전력 소비보다 렌더링 성능을 우선시합니다.
    	//"low-power": 렌더링 성능보다 전력 절약을 우선시합니다.

		//failIfMajorPerformanceCaveat
		//시스템 성능이 낮을 경우에 컨텍스트를 생성할지 여부를 나타내는 불리언입니다.
		
		//premultipliedAlpha 20251107
		this.mGL=_handle.getContext("webgl2",{antialias: this.m_pf.mAnti,depth:true,stencil:true,"xrCompatible":_pf.mXR,
			"premultipliedAlpha": false,"alpha": true});

		// webgl-debug.js를 추가하면 웹지엘 워링도 캐치 가능하다!
		if(window["WebGLDebugUtils"]!=null)
		{
			this.mGL = window["WebGLDebugUtils"].makeDebugContext(this.mGL, function (err, funcName, args) {
				console.error(`🚨 WebGL error: ${window["WebGLDebugUtils"].glEnumToString(err)} in ${funcName}`, args);
				debugger;
			});
		}
		
		
		//this.GL().pixelStorei(this.GL().UNPACK_FLIP_Y_WEBGL, true);
		if (!this.mGL)
		{	
			CAlert.E("초기화 실패.(하드웨어 가속을 켜주세요!");
			return;
		}
		
		this.mDrawType=this.GL().TRIANGLES;
		
		//g_property.set(CDevice.eProperty.HalfFloat,1);

		let ext : any = this.GL().getExtension('EXT_color_buffer_float');
		if (ext!=null) 	g_property.set(CDevice.eProperty.FloatTex32,1);
		else {
			g_property.set(CDevice.eProperty.FloatTex32,0);
			{	    CAlert.W("no EXT_color_buffer_float");		}
		}

		ext = this.GL().getExtension('EXT_color_buffer_half_float');
		if (ext!=null) 	g_property.set(CDevice.eProperty.FloatTex16,1);
		else {
			g_property.set(CDevice.eProperty.FloatTex16,0);
			{	    CAlert.W("no EXT_color_buffer_half_float");		}
		}
		if(CUtil.IsSafari())	this.m_pf.mTexture16f=true;

        ext = this.GL().getExtension('EXT_clip_control');
		if (ext!=null) 
		{
			g_property.set(CDevice.eProperty.ClipControl,1);
			ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.ZERO_TO_ONE_EXT);
		}
			
        else 
		{
			g_property.set(CDevice.eProperty.ClipControl,0);
            CAlert.W("no EXT_clip_control");		
        }
        
		ext = this.GL().getExtension('OES_texture_float_linear');
		if (ext==null) 
		{	    
			CAlert.W("no OES_texture_float_linear");	
			this.m_pf.mTexture16f=true;	
		}
		
		
		CRenderPass.eBlend.FUNC_ADD=this.GL().FUNC_ADD;
		CRenderPass.eBlend.FUNC_SUBTRACT=this.GL().FUNC_SUBTRACT;
		CRenderPass.eBlend.FUNC_REVERSE_SUBTRACT=this.GL().FUNC_REVERSE_SUBTRACT;
		
		
		CRenderPass.eBlend.ZERO=this.GL().ZERO;
		CRenderPass.eBlend.ONE=this.GL().ONE;
		CRenderPass.eBlend.SRC_COLOR=this.GL().SRC_COLOR;
		CRenderPass.eBlend.ONE_MINUS_SRC_COLOR=this.GL().ONE_MINUS_SRC_COLOR;
		CRenderPass.eBlend.DST_COLOR=this.GL().DST_COLOR;
		
		CRenderPass.eBlend.ONE_MINUS_DST_COLOR=this.GL().ONE_MINUS_DST_COLOR;
		CRenderPass.eBlend.SRC_ALPHA=this.GL().SRC_ALPHA;
		CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA=this.GL().ONE_MINUS_SRC_ALPHA;
		CRenderPass.eBlend.DST_ALPHA=this.GL().DST_ALPHA;
		CRenderPass.eBlend.ONE_MINUS_DST_ALPHA=this.GL().ONE_MINUS_DST_ALPHA;
		
		CRenderPass.eBlend.CONSTANT_COLOR=this.GL().CONSTANT_COLOR;
		CRenderPass.eBlend.ONE_MINUS_CONSTANT_COLOR=this.GL().ONE_MINUS_CONSTANT_COLOR;
		CRenderPass.eBlend.CONSTANT_ALPHA=this.GL().CONSTANT_ALPHA;
		CRenderPass.eBlend.ONE_MINUS_CONSTANT_ALPHA=this.GL().ONE_MINUS_CONSTANT_ALPHA;
		CRenderPass.eBlend.SRC_ALPHA_SATURATE=this.GL().SRC_ALPHA_SATURATE;

		var max_v_uniforms=this.GL().getParameter(this.GL().MAX_VERTEX_UNIFORM_VECTORS);
		var max_f_uniforms=this.GL().getParameter(this.GL().MAX_FRAGMENT_UNIFORM_VECTORS);
		var texture_units=this.GL().getParameter(this.GL().MAX_TEXTURE_IMAGE_UNITS);
		var TexLay=this.GL().getParameter(this.GL().MAX_ARRAY_TEXTURE_LAYERS);
		var TexSize=this.GL().getParameter(this.GL().MAX_TEXTURE_SIZE);
		
		g_property.set(CDevice.eProperty.Sam2DMax,11);
		g_property.set(CDevice.eProperty.Sam2DArrMax,3);
		g_property.set(CDevice.eProperty.SamCubeMax,2);
		g_property.set(CDevice.eProperty.Sam2dArrLayerMax,TexLay);
		
		g_property.set(CDevice.eProperty.VertexUniform,1024);
		g_property.set(CDevice.eProperty.PixelUniform,1024);
		//g_property.set(CDevice.eProperty.Sam2DSize,TexSize/2/4);
		g_property.set(CDevice.eProperty.Sam2DSize,2048);
		
		
		
		this.mStaticRP.mCullFace=CRenderPass.eCull.CCW;
		
		CConsol.Log(`MAX_VERTEX_UNIFORM_VECTORS : ${max_v_uniforms} MAX_FRAGMENT_UNIFORM_VECTORS : ${max_f_uniforms} 
			MAX_TEXTURE_IMAGE_UNITS : ${texture_units} MAX_ARRAY_TEXTURE_LAYERS : ${TexLay} MAX_TEXTURE_SIZE : ${TexSize}`);
		

	}
	
	override async Init()
	{
		
		this.GL().frontFace(this.GL().CCW);
		
			
			
		this.GL().enable(this.GL().CULL_FACE);
		this.GL().enable(this.GL().DEPTH_TEST);
        this.GL().depthFunc(this.GL().GEQUAL); 
		//https://mrdoob.github.io/webgl-blendfunctions/blendfunc.html
		//http://mrdoob.github.io/webgl-blendfunctions/blendfuncseparate.html
		this.GL().enable(this.GL().BLEND);
		
		//this.GL().blendFunc( 1, 0 );
		this.GL().blendEquationSeparate( this.GL().FUNC_ADD, this.GL().FUNC_ADD );
		this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
		
		//var test=[this.GL().SRC_ALPHA,this.GL().ZERO,this.GL().ONE];
		//this.GL().blendFunc(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA);
		//this.GL().colorMask(true, true, true, true);
		//this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
		this.GL().depthMask(true);
	
		
		
		this.GL().canvas.width=this.m_pf.mWidth;
		this.GL().canvas.height=this.m_pf.mHeight;
		this.GL().viewport(0, 0, this.GL().canvas.width, this.GL().canvas.height);

		this.GL().clearColor(0, 0, 0, 1);
		this.GL().clear(this.GL().COLOR_BUFFER_BIT | this.GL().DEPTH_BUFFER_BIT);


		this.GL().pixelStorei(this.GL().UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); // 업로드 중 알파 사전곱 적용

		
		// this.GL().enable(this.GL().BLEND);
		// this.GL().blendFunc(this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA); // PMA 전용
	}
	
	
	override GetHandle()
	{
	    return this.mGL;
	}

	override GL()	:  WebGL2RenderingContext
	{
	    return this.mGL as WebGL2RenderingContext;
	}
	override DrawType()	{	return this.mDrawType;	}

	
	override ViewPort(_x : number,_y : number,_w : number,_h : number)
	{
		if(this.mViewportArr[0]!=_x || this.mViewportArr[1]!=_y || this.mViewportArr[2]!=_w || this.mViewportArr[3]!=_h)
		{
			this.mViewportArr[0]=_x;
			this.mViewportArr[1]=_y;
			this.mViewportArr[2]=_w;
			this.mViewportArr[3]=_h;
			this.GL().viewport(_x, _y, _w, _h);
		}
		
	}
	
	override SetBlend(_data : Array<number>)
	{
		for(var i=0;i<_data.length;++i)
		{
			this.mStaticRP.mBlend[i]=_data[i];
		}
		
		
		this.GL().blendEquationSeparate( _data[0], _data[1] );
		this.GL().blendFuncSeparate(_data[2],_data[3],_data[4],_data[5]);
	}
	override SetCullFace(_enable : number)
	{
		this.mStaticRP.mCullFace=_enable;
		if (_enable!=0)
		{
			this.GL().enable(this.GL().CULL_FACE);

			if(_enable==CRenderPass.eCull.CCW)
				this.GL().frontFace(this.GL().CCW);
			else
				this.GL().frontFace(this.GL().CW);
		}
		else
		{
			this.GL().disable(this.GL().CULL_FACE);
		}
	}
	override SetDepthTest(_enable)
	{
		this.mStaticRP.mDepthTest=_enable;
		if (_enable)
		{
			//this.GL().enable(this.GL().DEPTH_TEST);

            this.GL().depthFunc(this.GL().GEQUAL);
			
		}
		else
		{
			this.GL().depthFunc(this.GL().ALWAYS);

			
			
			//this.GL().disable(this.GL().DEPTH_TEST);
		}
	}
	override SetAlpha(_enable)
	{
		this.mStaticRP.mAlpha=_enable;
		if (_enable)
		{
			this.GL().enable(this.GL().BLEND);
			this.GL().blendEquationSeparate( this.GL().FUNC_ADD, this.GL().FUNC_ADD );
			this.GL().blendFuncSeparate(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA, this.GL().ONE, this.GL().ONE_MINUS_SRC_ALPHA);
			//this.GL().blendFunc(this.GL().SRC_ALPHA, this.GL().ONE_MINUS_SRC_ALPHA);
		}
		else
		{
			this.GL().disable(this.GL().BLEND);
			//this.GL().disable(this.GL().ALPHA_TEST);
		}
	}
	override SetDepthWrite(_enable)
	{
		this.mStaticRP.mDepthWrite=_enable;
		if (_enable)
		{
			this.GL().depthMask(true);
		}
		else
		{
			this.GL().depthMask(false);
		}
	}
	override SetLine(_type : number)
	{

		this.mStaticRP.mLine=_type;
		if(_type==null)
			this.mDrawType=this.GL().TRIANGLES;
		else
			this.mDrawType=_type;
		
			
	}
	// ── 실측 벤치마크 ────────────────────────────────────────────────
	// gl.finish()로 GPU 완료를 동기화해서 실제 처리량을 측정한다.
	// 각 테스트는 고정 workload를 반복하고 경과 ms를 읽는다.
	// 점수 = workload / ms → 상한 없음, 빠를수록 높다.
	private _BenchMakeProgram(_vs : string, _fs : string) : WebGLProgram
	{
		const gl=this.GL();
		const vs=gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs,_vs);	gl.compileShader(vs);
		const fs=gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs,_fs);	gl.compileShader(fs);
		const prog=gl.createProgram();
		gl.attachShader(prog,vs);	gl.attachShader(prog,fs);
		gl.linkProgram(prog);
		gl.deleteShader(vs);		gl.deleteShader(fs);
		return prog;
	}
 
	private _syncBuf=new Uint8Array(4);
	// N회 측정 후 최솟값 — OS 스케줄링/thermal 간섭 제거
	private _BenchRun(_draws : number, _runs : number, _drawFn : ()=>void) : number
	{
		const gl=this.GL();
		// warmup: GPU clock 안정화
		for(let i=0;i<10;i++) _drawFn();
		gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,this._syncBuf);

		let best=Infinity;
		for(let r=0;r<_runs;r++)
		{
			const t0=performance.now();
			for(let i=0;i<_draws;i++) _drawFn();
			gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,this._syncBuf);
			const ms=performance.now()-t0;
			if(ms<best) best=ms;
		}
		return Math.max(best, 0.1);
	}

	override async BenchmarkScore() : Promise<number>
	{
		const gl=this.GL();
		const prevW=(gl.canvas as HTMLCanvasElement).width;
		const prevH=(gl.canvas as HTMLCanvasElement).height;

		const quadVerts=new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
		const buf=gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,buf);
		gl.bufferData(gl.ARRAY_BUFFER,quadVerts,gl.STATIC_DRAW);
		const quadVS=`attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }`;

		// ── Test 1: Shader ALU ─────────────────────────────────────
		(gl.canvas as HTMLCanvasElement).width=2048;
		(gl.canvas as HTMLCanvasElement).height=2048;
		gl.viewport(0,0,2048,2048);
		const aluProg=this._BenchMakeProgram(quadVS,`
			precision highp float;
			uniform float t;
			void main(){
				vec2 uv=gl_FragCoord.xy/2048.0;
				vec3 c=vec3(0.0);
				for(int i=0;i<256;i++){
					float f=float(i)*0.049+t;
					c+=vec3(sin(uv.x*f+t),cos(uv.y*f-t),sin(f*uv.x*uv.y));
				}
				gl_FragColor=vec4(c/256.0*0.5+0.5,1.0);
			}
		`);
		gl.useProgram(aluProg);
		const aluP=gl.getAttribLocation(aluProg,'p');
		gl.enableVertexAttribArray(aluP);
		gl.vertexAttribPointer(aluP,2,gl.FLOAT,false,0,0);
		const aluT=gl.getUniformLocation(aluProg,'t');
		let t=0;
		const aluMs=this._BenchRun(20,5,()=>{ gl.uniform1f(aluT,t+=0.01); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); });

		// ── Test 2: Fill Rate ──────────────────────────────────────
		(gl.canvas as HTMLCanvasElement).width=2048;
		(gl.canvas as HTMLCanvasElement).height=2048;
		gl.viewport(0,0,2048,2048);
		const fillProg=this._BenchMakeProgram(quadVS,`
			precision mediump float;
			uniform float t;
			void main(){ gl_FragColor=vec4(0.5+t*0.0001,0.5,0.5,0.02); }
		`);
		gl.useProgram(fillProg);
		const fillP=gl.getAttribLocation(fillProg,'p');
		gl.enableVertexAttribArray(fillP);
		gl.vertexAttribPointer(fillP,2,gl.FLOAT,false,0,0);
		const fillT=gl.getUniformLocation(fillProg,'t');
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		const fillMs=this._BenchRun(10,5,()=>{
			gl.uniform1f(fillT,t+=0.01);
			for(let i=0;i<128;i++) gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
		});
		gl.disable(gl.BLEND);

		// ── Test 3: Geometry ───────────────────────────────────────
		(gl.canvas as HTMLCanvasElement).width=512;
		(gl.canvas as HTMLCanvasElement).height=512;
		gl.viewport(0,0,512,512);
		const VTXN=524288;
		const geoVS=`
			attribute float idx;
			uniform float t;
			void main(){
				float a=idx*6.2831853*7.3+t;
				float r=fract(idx*0.618)*0.95;
				gl_Position=vec4(cos(a)*r,sin(a)*r,0.0,1.0);
				gl_PointSize=1.0;
			}
		`;
		const geoProg=this._BenchMakeProgram(geoVS,`precision lowp float; void main(){ gl_FragColor=vec4(1.0); }`);
		const geoBuf=gl.createBuffer();
		const idxArr=new Float32Array(VTXN);
		for(let i=0;i<VTXN;i++) idxArr[i]=i/VTXN;
		gl.bindBuffer(gl.ARRAY_BUFFER,geoBuf);
		gl.bufferData(gl.ARRAY_BUFFER,idxArr,gl.STATIC_DRAW);
		gl.useProgram(geoProg);
		const geoP=gl.getAttribLocation(geoProg,'idx');
		gl.enableVertexAttribArray(geoP);
		gl.vertexAttribPointer(geoP,1,gl.FLOAT,false,0,0);
		const geoT=gl.getUniformLocation(geoProg,'t');
		const geoMs=this._BenchRun(50,5,()=>{ gl.uniform1f(geoT,t+=0.01); gl.drawArrays(gl.POINTS,0,VTXN); });

		// ── 점수 ───────────────────────────────────────────────────
		// 10000 / 가중평균ms — 빠를수록 높음, 선형 비례
		const score=Math.round(10000 / (aluMs*0.4 + fillMs*0.35 + geoMs*0.25));

		CAlert.W(`BenchmarkScore: ${score}  ALU:${aluMs.toFixed(0)}ms  FILL:${fillMs.toFixed(0)}ms  GEO:${geoMs.toFixed(0)}ms`);

		// ── 정리 ───────────────────────────────────────────────────
		gl.disableVertexAttribArray(aluP);
		gl.disableVertexAttribArray(fillP);
		gl.disableVertexAttribArray(geoP);
		gl.deleteBuffer(buf);
		gl.deleteBuffer(geoBuf);
		gl.deleteProgram(aluProg);
		gl.deleteProgram(fillProg);
		gl.deleteProgram(geoProg);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
		gl.useProgram(null);

		(gl.canvas as HTMLCanvasElement).width=prevW;
		(gl.canvas as HTMLCanvasElement).height=prevH;
		gl.viewport(0,0,prevW,prevH);

		return score;
	}

}

/**
 * WebGPU 디바이스.
 *
 * GL 과 성격이 근본적으로 다른 두 가지가 설계를 가른다.
 *
 * 1) 상태가 즉시 반영되지 않는다.
 *    컬링/깊이/블렌드는 파이프라인에 박히는 값이라 SetCullFace 같은 호출이
 *    그 자리에서 할 일이 없다. 여기서는 mStaticRP 에 적어두기만 하고,
 *    렌더러가 파이프라인을 만들 때 이 값으로 서술자를 뽑아 쓴다.
 *    그래서 파이프라인 캐시 키에 렌더패스가 반드시 들어가야 한다(RPHash).
 *
 * 2) 그리기가 기록형이다.
 *    Begin 에서 커맨드 인코더를 열고 End 에서 큐에 제출한다.
 *
 * 깊이는 GL 경로와 같은 reverse-Z 다(가까울수록 1). WebGPU 는 클립 공간이
 * 원래 0..1 이라 GL 처럼 확장(EXT_clip_control)이 필요 없다.
 */
export class CDeviceGPU extends CDevice
{
	public mAdapter : GPUAdapter=null;
	public mDevice : GPUDevice=null;
	public mHandle : HTMLCanvasElement=null;
	public mContext : GPUCanvasContext=null;
	public mCanvasFormat : GPUTextureFormat="bgra8unorm";
	public mDepthTexture : GPUTexture=null;
	public mDepthFormat : GPUTextureFormat="depth24plus";

	/**
	 * 지금 여는 패스가 오프스크린 RT 인가. 그때는 정점 셰이더가 클립 Y 를 뒤집어
	 * GL 과 같은 메모리 배치로 채운다(CShaderInterpretGPU.kRenderTarget 참고).
	 * Y 를 뒤집으면 삼각형 감김 방향도 뒤집히므로 앞면 기준을 같이 바꿔줘야 한다.
	 */
	public mClipFlip=false;

	public mEncoder : GPUCommandEncoder=null;
	/** 현재 열려 있는 렌더패스. GL 의 프레임버퍼 바인딩에 대응한다 */
	public mPass : GPURenderPassEncoder=null;

	constructor(_pf : CPreferences,_handle : HTMLCanvasElement)
	{
		super(_pf,_handle);
		this.mHandle=_handle;

		//셰이더 백엔드가 이 값으로 바인딩 번호를 만든다(CShaderInterpretGPU.TexBinding).
		//기본 한도가 스테이지당 샘플드 텍스처 16개라 2D 11 + 배열 3 + 큐브 2 로 맞춘다
		g_property.set(CDevice.eProperty.Sam2DMax,11);
		g_property.set(CDevice.eProperty.Sam2DArrMax,3);
		g_property.set(CDevice.eProperty.SamCubeMax,2);
		g_property.set(CDevice.eProperty.Sam2dArrLayerMax,256);
		g_property.set(CDevice.eProperty.VertexUniform,1024);
		g_property.set(CDevice.eProperty.PixelUniform,1024);
		g_property.set(CDevice.eProperty.Sam2DSize,2048);
		g_property.set(CDevice.eProperty.FloatTex16,1);
		g_property.set(CDevice.eProperty.FloatTex32,1);
		//클립 공간이 원래 0..1 이라 GL 의 clip_control 에 해당하는 보정이 필요 없다
		g_property.set(CDevice.eProperty.ClipControl,1);

		this.mStaticRP.mDepthTest=true;
		this.mStaticRP.mDepthWrite=true;
		this.mStaticRP.mAlpha=true;
		this.mStaticRP.mCullFace=CRenderPass.eCull.CCW;
		this.mStaticRP.mLine=CRenderPass.eLine.TRIANGLES;
	}

	override async Init()
	{
		if(navigator.gpu==null)
		{
			CAlert.E("WebGPU 를 지원하지 않는 환경입니다.");
			return;
		}
		this.mAdapter=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});
		if(this.mAdapter==null)
		{
			CAlert.E("WebGPU 어댑터를 얻지 못했습니다.");
			return;
		}
		//유니폼을 텍스처로 실어 보내는 경로가 RGBA32F 를 쓴다.
		//WebGPU 는 32비트 실수 텍스처를 기본적으로 필터링 불가로 보기 때문에,
		//이 기능이 없으면 그 텍스처를 일반 샘플러로 묶을 수 없다(라이팅이 안 들어간다)
		const feat : Array<GPUFeatureName>=[];
		if(this.mAdapter.features.has("float32-filterable"))	feat.push("float32-filterable");
		else	CAlert.W("float32-filterable 미지원. 유니폼 텍스처 경로가 제한됩니다");
		//Deferred 라이트 서페이스가 RGBA32F 타겟에 여러 광원을 누적 블렌딩한다.
		//WebGPU 는 32비트 실수 포맷 블렌딩을 이 기능 없이는 기본적으로 막는다
		if(this.mAdapter.features.has("float32-blendable"))	feat.push("float32-blendable");
		else	CAlert.W("float32-blendable 미지원. RGBA32F 타겟 블렌딩이 제한됩니다");
		//기본 한도(32바이트/샘플)로는 gBuf 를 RGBA32F 여러 장으로 쓰는 Deferred 패스가
		//곧바로 넘친다(예: RGBA8+RGBA32F+RGBA8+RGBA8 = 40바이트). 어댑터가 실제로 지원하는
		//한도로 명시 요청해야 그만큼 쓸 수 있다 - 요청 안 하면 스펙 최소 보장치로 묶인다
		this.mDevice=await this.mAdapter.requestDevice({requiredFeatures:feat,
			requiredLimits:{maxColorAttachmentBytesPerSample:this.mAdapter.limits.maxColorAttachmentBytesPerSample}});
		this.mDevice.lost.then((_info)=>{	CAlert.E("WebGPU 디바이스를 잃었습니다: "+_info.message);	});
		//에러 스코프를 안 쓰면 검증 오류가 콘솔로만 흘러가서 원인 추적이 어렵다
		this.mDevice.addEventListener("uncapturederror",(_e : any)=>{
			CAlert.E("WebGPU: "+(_e.error!=null?_e.error.message:_e));
		});

		this.mContext=this.mHandle.getContext("webgpu") as GPUCanvasContext;
		this.mCanvasFormat=navigator.gpu.getPreferredCanvasFormat();
		//premultiplied 는 GL 경로의 blendFuncSeparate(.., ONE, ONE_MINUS_SRC_ALPHA) 와 짝이 맞는다
		this.mContext.configure({
			device:this.mDevice,
			format:this.mCanvasFormat,
			alphaMode:"premultiplied",
			//COPY_SRC 가 있어야 화면을 버퍼로 읽어올 수 있다(스크린샷/픽셀 검사)
			usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC,
		});

		//depth24plus 는 스펙상 copyTextureToTexture 로 복사가 금지돼 있어(벤더별 비트 레이아웃이 불명확)
		//BlitDepth 를 쓰는 렌더패스(스카이박스 깊이 테스트 등)가 조용히 깨진다. m32fDepth 설정과
		//무관하게 WebGPU 는 항상 depth32float 를 써서 이 함정을 구조적으로 없앤다(GL 은 이 제약이 없다)
		this.mDepthFormat="depth32float";
		this.mHandle.width=this.m_pf.mWidth;
		this.mHandle.height=this.m_pf.mHeight;
		this.ResizeDepth();

		//reverse-Z: 먼 곳이 0, 가까운 곳이 1이라 깊이 초기값도 0이다
		this.mDepthVal=0.0;
	}

	override GetHandle()	{	return this.mHandle;	}
	override GPU() : GPUDevice	{	return this.mDevice;	}
	GetCanvasFormat()	{	return this.mCanvasFormat;	}
	GetDepthFormat()	{	return this.mDepthFormat;	}
	GetEncoder()	{	return this.mEncoder;	}
	GetPass()		{	return this.mPass;	}
	override DrawType()	{	return this.mStaticRP.mLine;	}

	/** 캔버스 크기가 바뀌면 깊이 버퍼도 다시 만들어야 한다 */
	ResizeDepth()
	{
		if(this.mDevice==null || this.mHandle==null)	return;
		const w=Math.max(1,this.mHandle.width);
		const h=Math.max(1,this.mHandle.height);
		if(this.mDepthTexture!=null)
		{
			if(this.mDepthTexture.width==w && this.mDepthTexture.height==h)	return;
			this.mDepthTexture.destroy();
		}
		this.mDepthTexture=this.mDevice.createTexture({
			size:[w,h],
			format:this.mDepthFormat,
			usage:GPUTextureUsage.RENDER_ATTACHMENT,
		});
	}

	// ---- 상태. 즉시 반영이 아니라 기록만 한다 ---------------------------------
	override SetAlpha(_enable)		{	this.mStaticRP.mAlpha=_enable;		}
	override SetCullFace(_enable : number)	{	this.mStaticRP.mCullFace=_enable;	}
	override SetDepthWrite(_enable)	{	this.mStaticRP.mDepthWrite=_enable;	}
	override SetDepthTest(_enable)	{	this.mStaticRP.mDepthTest=_enable;	}
	override SetLine(_type : number|boolean)	{	this.mStaticRP.mLine=_type as number;	}
	override SetBlend(_data : Array<number>)
	{
		for(var i=0;i<_data.length;++i)	this.mStaticRP.mBlend[i]=_data[i];
	}
	override ViewPort(_x : number,_y : number,_w : number,_h : number)
	{
		if(this.mViewportArr[0]==_x && this.mViewportArr[1]==_y &&
			this.mViewportArr[2]==_w && this.mViewportArr[3]==_h)	return;
		this.mViewportArr[0]=_x;	this.mViewportArr[1]=_y;
		this.mViewportArr[2]=_w;	this.mViewportArr[3]=_h;
		if(this.mPass!=null)	this.mPass.setViewport(_x,_y,_w,_h,0,1);
	}

	// ---- CRenderPass -> WebGPU 서술자 -----------------------------------------

	/** GL 상수로 적힌 블렌드 값을 WebGPU 이름으로 바꾼다 */
	static BlendOp(_v : number) : GPUBlendOperation
	{
		switch(_v)
		{
		case CRenderPass.eBlend.FUNC_SUBTRACT:			return "subtract";
		case CRenderPass.eBlend.FUNC_REVERSE_SUBTRACT:	return "reverse-subtract";
		case CRenderPass.eBlend.FUNC_MIN:				return "min";
		case CRenderPass.eBlend.FUNC_MAX:				return "max";
		}
		return "add";
	}
	static BlendFactor(_v : number) : GPUBlendFactor
	{
		switch(_v)
		{
		case CRenderPass.eBlend.ZERO:					return "zero";
		case CRenderPass.eBlend.ONE:					return "one";
		case CRenderPass.eBlend.SRC_COLOR:				return "src";
		case CRenderPass.eBlend.ONE_MINUS_SRC_COLOR:	return "one-minus-src";
		case CRenderPass.eBlend.DST_COLOR:				return "dst";
		case CRenderPass.eBlend.ONE_MINUS_DST_COLOR:	return "one-minus-dst";
		case CRenderPass.eBlend.SRC_ALPHA:				return "src-alpha";
		case CRenderPass.eBlend.ONE_MINUS_SRC_ALPHA:	return "one-minus-src-alpha";
		case CRenderPass.eBlend.DST_ALPHA:				return "dst-alpha";
		case CRenderPass.eBlend.ONE_MINUS_DST_ALPHA:	return "one-minus-dst-alpha";
		//WebGPU 는 색/알파 상수를 따로 두지 않는다. 하나로 접는다
		case CRenderPass.eBlend.CONSTANT_COLOR:
		case CRenderPass.eBlend.CONSTANT_ALPHA:			return "constant";
		case CRenderPass.eBlend.ONE_MINUS_CONSTANT_COLOR:
		case CRenderPass.eBlend.ONE_MINUS_CONSTANT_ALPHA:	return "one-minus-constant";
		case CRenderPass.eBlend.SRC_ALPHA_SATURATE:		return "src-alpha-saturated";
		}
		return "one";
	}
	GetPrimitiveState(_rp : CRenderPass=null) : GPUPrimitiveState
	{
		const rp=_rp!=null?_rp:this.mStaticRP;
		//감김 방향은 GL 과 같게 둔다. 실측으로 확인했다(CCW 메시가 ccw 로 앞면이 된다)
		const st : GPUPrimitiveState={
			topology:"triangle-list",
			frontFace:"ccw",
			cullMode:"back",
		};
		if(rp.mLine==CRenderPass.eLine.LINE_STRIP)		st.topology="line-strip";
		else if(rp.mLine==CRenderPass.eLine.LINE_LOOP)	st.topology="line-list";

		if(rp.mCullFace==CRenderPass.eCull.None)		st.cullMode="none";
		else if(rp.mCullFace==CRenderPass.eCull.CW)		st.frontFace="cw";

		//클립 Y 를 뒤집는 패스는 감김 방향도 뒤집힌다. 앞면 기준을 반대로 맞춘다
		if(this.mClipFlip)	st.frontFace=(st.frontFace=="cw")?"ccw":"cw";

		//띠(strip) 토폴로지는 인덱스 드로우에 쓰려면 인덱스 형식을 미리 정해야 한다.
		//엔진의 인덱스 버퍼는 32비트다(CIndexBuffer.CreateBuf32).
		//면 컬링은 선에 의미가 없으므로 같이 꺼둔다(와이어프레임이 뒷면에서 사라지지 않게)
		if(st.topology=="line-strip")	st.stripIndexFormat="uint32";
		if(st.topology!="triangle-list")	st.cullMode="none";
		return st;
	}
	GetDepthStencilState(_rp : CRenderPass=null) : GPUDepthStencilState
	{
		const rp=_rp!=null?_rp:this.mStaticRP;
		//reverse-Z 라 GL 의 GEQUAL 에 대응한다
		const st : GPUDepthStencilState={
			format:this.mDepthFormat,
			depthWriteEnabled:rp.mDepthWrite!=false,
			depthCompare:(rp.mDepthTest==false)?"always":"greater-equal",
		};
		return st;
	}
	GetBlendState(_rp : CRenderPass=null) : GPUBlendState
	{
		const rp=_rp!=null?_rp:this.mStaticRP;
		const b=rp.mBlend;
		return {
			color:{
				operation:CDeviceGPU.BlendOp(b[0]),
				srcFactor:CDeviceGPU.BlendFactor(b[2]),
				dstFactor:CDeviceGPU.BlendFactor(b[3]),
			},
			alpha:{
				operation:CDeviceGPU.BlendOp(b[1]),
				srcFactor:CDeviceGPU.BlendFactor(b[4]),
				dstFactor:CDeviceGPU.BlendFactor(b[5]),
			},
		};
	}
	GetColorTarget(_format : GPUTextureFormat=null,_rp : CRenderPass=null) : GPUColorTargetState
	{
		const rp=_rp!=null?_rp:this.mStaticRP;
		const t : GPUColorTargetState={format:_format!=null?_format:this.mCanvasFormat};
		if(rp.mAlpha!=false)	t.blend=this.GetBlendState(rp);
		return t;
	}
	/**
	 * 파이프라인 캐시 키에 넣을 상태 해시.
	 * WebGPU 는 이 값들이 전부 파이프라인에 박히므로 셰이더 키만으로 캐시하면
	 * 컬링만 바뀐 경우에 예전 파이프라인이 나온다.
	 */
	RPHash(_rp : CRenderPass=null) : string
	{
		const rp=_rp!=null?_rp:this.mStaticRP;
		return (rp.mLine)+"|"+(rp.mCullFace)+"|"+(rp.mDepthTest!=false?1:0)+"|"+
			(rp.mDepthWrite!=false?1:0)+"|"+(rp.mAlpha!=false?1:0)+"|"+rp.mBlend.join(",")+
			"|"+(this.mClipFlip?1:0);
	}

	// ---- 프레임 -----------------------------------------------------------------

	/** 커맨드 인코더를 연다. 그리기는 Pass 안에서만 가능하다 */
	BeginFrame()
	{
		this.ResizeDepth();
		this.mEncoder=this.mDevice.createCommandEncoder();
	}
	/**
	 * 렌더패스를 연다. _view 가 없으면 캔버스에 그린다.
	 *
	 * _clear 는 "이번에 여는 대상을 지워도 되는가" 다. 지울지 말지는 GL 과 똑같이
	 * mClearColor/mClearDepth 가 정하고(대상별로 CCanvas 가 세팅한다), 여기서는
	 * 닫았다 다시 여는 경우(중첩 대상에서 빠져나옴, Blit 전후)만 걸러낸다.
	 *
	 * 프레임 단위 플래그 하나로 막으면 그 프레임의 첫 패스만 지워지고
	 * 나머지 렌더타겟은 영영 안 지워져 이전 프레임이 계속 쌓인다.
	 */
	BeginPass(_view : GPUTextureView|Array<GPUTextureView>=null,_depth : GPUTextureView=null,_clear=true)
	{
		if(this.mEncoder==null)	this.BeginFrame();
		if(this.mPass!=null)	this.EndPass();

		const views=(_view==null)?[this.mContext.getCurrentTexture().createView()]
			:(Array.isArray(_view)?_view:[_view]);
		const depth=_depth!=null?_depth:this.mDepthTexture.createView();
		const color=views.map((v)=>({
			view:v,
			clearValue:[this.mColorVal.x,this.mColorVal.y,this.mColorVal.z,this.mColorVal.w],
			loadOp:(this.mClearColor && _clear)?"clear":"load",
			storeOp:"store",
		} as GPURenderPassColorAttachment));
		const ds : GPURenderPassDepthStencilAttachment={
			view:depth,
			depthClearValue:this.mDepthVal,
			depthLoadOp:(this.mClearDepth && _clear)?"clear":"load",
			depthStoreOp:"store",
		};
		this.mPass=this.mEncoder.beginRenderPass({colorAttachments:color,depthStencilAttachment:ds});
		return this.mPass;
	}
	EndPass()
	{
		if(this.mPass==null)	return;
		this.mPass.end();
		this.mPass=null;
	}
	/** 기록한 명령을 큐에 넘긴다 */
	EndFrame()
	{
		this.EndPass();
		if(this.mEncoder==null)	return;
		this.mDevice.queue.submit([this.mEncoder.finish()]);
		this.mEncoder=null;
	}

	// ── 실측 벤치마크 ────────────────────────────────────────────────
	// CDeviceGL.BenchmarkScore 와 같은 구조(ALU/FILL/GEO, 점수 공식)를 WebGPU 로 옮긴 것이다.
	// gl.finish()+readPixels 로 GPU 완료를 기다리던 자리는 queue.onSubmittedWorkDone() 이 맡는다.
	// 프로젝트 쪽(예: ModularVillage.ts)이 이 점수로 PCF/그림자 해상도를 고르므로, 값이 비어있으면
	// (베이스 CDevice 의 기본 구현은 null) 항상 저사양 분기로 떨어져 WebGPU 에서만 하드섀도우가 된다
	private _BenchMakePipeline(_vs : string,_fs : string,_topology : GPUPrimitiveTopology,_blend : boolean) : GPURenderPipeline
	{
		const d=this.mDevice;
		const mod=d.createShaderModule({code:_vs+"\n"+_fs});
		const target : GPUColorTargetState={format:"rgba8unorm"};
		if(_blend)
		{
			target.blend={
				color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"},
				alpha:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha",operation:"add"}};
		}
		return d.createRenderPipeline({layout:"auto",
			vertex:{module:mod,entryPoint:"vs"},
			fragment:{module:mod,entryPoint:"fs",targets:[target]},
			primitive:{topology:_topology}});
	}

	// N회 측정 후 최솟값 - OS 스케줄링/thermal 간섭 제거
	private async _BenchRun(_runs : number,_recordFn : (_enc : GPURenderPassEncoder)=>void,
		_view : GPUTextureView) : Promise<number>
	{
		const d=this.mDevice;
		// warmup: GPU clock 안정화
		for(let i=0;i<3;i++)
		{
			const enc=d.createCommandEncoder();
			const p=enc.beginRenderPass({colorAttachments:[{view:_view,loadOp:"load",storeOp:"store"}]});
			_recordFn(p);
			p.end();
			d.queue.submit([enc.finish()]);
		}
		await d.queue.onSubmittedWorkDone();

		let best=Infinity;
		for(let r=0;r<_runs;r++)
		{
			const t0=performance.now();
			const enc=d.createCommandEncoder();
			const p=enc.beginRenderPass({colorAttachments:[{view:_view,loadOp:"load",storeOp:"store"}]});
			_recordFn(p);
			p.end();
			d.queue.submit([enc.finish()]);
			await d.queue.onSubmittedWorkDone();
			const ms=performance.now()-t0;
			if(ms<best)	best=ms;
		}
		return Math.max(best,0.1);
	}

	override async BenchmarkScore() : Promise<number>
	{
		const d=this.mDevice;
		if(d==null)	return null;

		// ── Test 1: Shader ALU ─────────────────────────────────────
		const aluTex=d.createTexture({size:[2048,2048],format:"rgba8unorm",
			usage:GPUTextureUsage.RENDER_ATTACHMENT});
		const aluPipe=this._BenchMakePipeline(
			"@vertex fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f\n{\n"+
			"	var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n"+
			"	return vec4f(p[i],0.0,1.0);\n}\n",
			"@group(0) @binding(0) var<uniform> t : f32;\n"+
			"@fragment fn fs(@builtin(position) pos : vec4f) -> @location(0) vec4f\n{\n"+
			"	let uv=pos.xy/2048.0;\n	var c=vec3f(0.0);\n"+
			"	for(var i=0;i<256;i=i+1){\n"+
			"		let f=f32(i)*0.049+t;\n"+
			"		c+=vec3f(sin(uv.x*f+t),cos(uv.y*f-t),sin(f*uv.x*uv.y));\n	}\n"+
			"	return vec4f(c/256.0*0.5+0.5,1.0);\n}\n",
			"triangle-list",false);
		const aluUni=d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
		d.queue.writeBuffer(aluUni,0,new Float32Array([0.5]));
		const aluBG=d.createBindGroup({layout:aluPipe.getBindGroupLayout(0),
			entries:[{binding:0,resource:{buffer:aluUni}}]});
		const aluMs=await this._BenchRun(5,(p)=>{
			p.setPipeline(aluPipe);	p.setBindGroup(0,aluBG);
			for(let i=0;i<20;++i)	p.draw(3);
		},aluTex.createView());
		aluTex.destroy();	aluUni.destroy();

		// ── Test 2: Fill Rate ──────────────────────────────────────
		const fillTex=d.createTexture({size:[2048,2048],format:"rgba8unorm",
			usage:GPUTextureUsage.RENDER_ATTACHMENT});
		const fillPipe=this._BenchMakePipeline(
			"@vertex fn vs(@builtin(vertex_index) i : u32) -> @builtin(position) vec4f\n{\n"+
			"	var p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n"+
			"	return vec4f(p[i],0.0,1.0);\n}\n",
			"@fragment fn fs() -> @location(0) vec4f{	return vec4f(0.5,0.5,0.5,0.02);}\n",
			"triangle-list",true);
		const fillMs=await this._BenchRun(5,(p)=>{
			p.setPipeline(fillPipe);
			for(let i=0;i<128;++i)	p.draw(3);
		},fillTex.createView());
		fillTex.destroy();

		// ── Test 3: Geometry ───────────────────────────────────────
		const VTXN=524288;
		const geoTex=d.createTexture({size:[512,512],format:"rgba8unorm",
			usage:GPUTextureUsage.RENDER_ATTACHMENT});
		const geoPipe=this._BenchMakePipeline(
			"@vertex fn vs(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4f\n{\n"+
			"	let idx=f32(vi)/"+VTXN.toFixed(1)+";\n"+
			"	let a=idx*6.2831853*7.3;\n	let r=fract(idx*0.618)*0.95;\n"+
			"	return vec4f(cos(a)*r,sin(a)*r,0.0,1.0);\n}\n",
			"@fragment fn fs() -> @location(0) vec4f{	return vec4f(1.0);}\n",
			"point-list",false);
		const geoMs=await this._BenchRun(5,(p)=>{
			p.setPipeline(geoPipe);	p.draw(VTXN);
		},geoTex.createView());
		geoTex.destroy();

		// ── 점수 ───────────────────────────────────────────────────
		// GL 판과 같은 공식/가중치라 두 백엔드의 점수가 서로 비교 가능하다
		const score=Math.round(10000/(aluMs*0.4+fillMs*0.35+geoMs*0.25));
		CAlert.W(`BenchmarkScore(GPU): ${score}  ALU:${aluMs.toFixed(0)}ms  FILL:${fillMs.toFixed(0)}ms  GEO:${geoMs.toFixed(0)}ms`);
		return score;
	}
}