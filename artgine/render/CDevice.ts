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
	mDepthVal=1.0;
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
		if (ext==null) {	    CAlert.W("no OES_texture_float_linear");		}
		
		
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
		this.GL().depthFunc(this.GL().LEQUAL); 
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
			this.GL().depthFunc(this.GL().LEQUAL);
			
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