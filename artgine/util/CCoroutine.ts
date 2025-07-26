// export interface ICoroutine
// {
// 	CallGenerator(_gFun);	
// }

import {CArray} from "../basic/CArray.js";

var gCoroutioneLoop=new CArray<CCoroutine>();

//리턴값으로 스테이트값을 넘기면 루프나 바로 멈출수 있다.
export class CCoroutine 
{
	static eState={
		Run:null,
		Loop:1,
		Stop:0,
	};
	private mGenerator: any;
	private mIterator: Generator;
	private mState: number;
	//private isRepeating: boolean;
	private mClass: Object;

	constructor(generator: any, _class : Object);
	constructor(generator: any);
	constructor(generator: any, _class : any=null) {
		this.mGenerator = generator;
		
		this.mState = CCoroutine.eState.Stop;
		//this.isRepeating = loop;
		if(typeof _class=="boolean")
		{
			//this.isRepeating = _class;
			this.mClass=null;
		}
		else
			this.mClass=_class;
		this.mIterator=null;
	}

	Start(): void 
	{
		if(this.mIterator!=null)
		{
			this.mState = CCoroutine.eState.Run;
		 	this.Process();
			return;
		}

		if (this.mState) return;

		
		if(this.mClass==null)
			this.mIterator=this.mGenerator();
		else
			this.mIterator=this.mGenerator.call(this.mClass);
		
			//this.m_iterator=this.m_class.CallGenerator(this.m_generator);
		this.mState = CCoroutine.eState.Run;
		this.Process();
	}
	GetState()
	{
		return this.mState;
	}
	Stop(): void {
		this.mState = CCoroutine.eState.Stop;
	}
	// Next()
	// {
	// 	this.m_state = CCoroutine.eState.Run;
	// 	this.Process();
	// }
	

	private Process(value?: any): void {
		if (this.mState==CCoroutine.eState.Stop) {
			return;
		}
		try {
			const result = this.mIterator.next(value);
			if(result.value==0)
			{
				this.mState = CCoroutine.eState.Stop;
				return;
			}

			if (result.done) {
				this.mIterator=null;
				this.mState = CCoroutine.eState.Stop;
				if(result.value==1)	gCoroutioneLoop.Push(this);
				return;
			}

			const promise = Promise.resolve(result.value);
			promise.then((nextValue) => {

				this.Process(nextValue);
		
					
				// if (this.m_running==false) 
				// {
				// 	g_coroutioneLoop.Push(this);
				// }
			})
			.catch(error => {
				this.mState = CCoroutine.eState.Stop;
				console.error(error);
			});
		} catch (error) {
			this.mState = CCoroutine.eState.Stop;
			console.error(error);
		}
	}
	static Wait(seconds: number): Promise<void> {
		return new Promise<void>((resolve) => setTimeout(resolve, seconds));
	}
	static GetLoopArr()
	{
		return gCoroutioneLoop;
	}
}
