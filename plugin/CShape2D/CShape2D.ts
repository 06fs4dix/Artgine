import { CAlpha } from "../../artgine/render/CAlpha.js";
import { CAnimation } from "../../artgine/app/component/CAnimation.js";
import { CAniFlow } from "../../artgine/app/component/CAniFlow.js";
import { CAtelier } from "../../artgine/app/CAtelier.js";
import { CClass } from "../../artgine/basic/CClass.js";
import { CCollider } from "../../artgine/app/component/CCollider.js";
import { CColor } from "../../artgine/render/CColor.js";
import { CCondition } from "../../artgine/util/CCondition.js";
import { CForce } from "../../artgine/app/component/CForce.js";
import { CFrame } from "../../artgine/util/CFrame.js";
import { CMat } from "../../artgine/geometry/CMat.js";
import { CPaint2D } from "../../artgine/app/component/paint/CPaint2D.js";
import { CRPAuto } from "../../artgine/app/canvas/CRPMgr.js";
import { CRigidBody } from "../../artgine/app/component/CRigidBody.js";
import { CShaderAttr } from "../../artgine/render/CShaderAttr.js";
import { CSubject } from "../../artgine/app/subject/CSubject.js";
import { CVec1 } from "../../artgine/geometry/CVec1.js";
import { CVec2 } from "../../artgine/geometry/CVec2.js";
import { CVec3 } from "../../artgine/geometry/CVec3.js";
import { CVec4 } from "../../artgine/geometry/CVec4.js";

export interface ICShape2DUniform {
	key: string;
	val: CVec1 | CVec2 | CVec3 | CVec4 | CMat;
}

export interface ICShape2DForce {
	key: string;
	dir: CVec3;
	vel: number;
}

export interface ICShape2DRigidBody {
	gravity?: number;
	freezePos?: boolean[];
}

export interface ICShape2DCollider {
	event: number;
	layer?: string;
	collisionWith?: string[];
	boundType?: number;
	pickMouse?: boolean;
}

export interface ICShape2DYSort {
	origin?: number;
}

export interface ICShape2DOption {
	texture?: string | string[];
	size?: CVec2;

	pos?: CVec3;
	rot?: CVec3 | CVec4;
	sca?: CVec3 | number;
	pivot?: CVec3;

	color?: CColor;
	alpha?: CAlpha;

	texCodi?: CVec4;
	billboard?: boolean;
	ySort?: boolean | ICShape2DYSort;
	wind?: number;

	cullFace?: number;
	wireframe?: number;
	priority?: number;

	uniforms?: ICShape2DUniform[];

	rigidBody?: ICShape2DRigidBody;
	forces?: ICShape2DForce[];
	collider?: ICShape2DCollider;

	tags?: string[];

	animation?: CAnimation;
}

export class CShape2D extends CSubject {

	static sDefaultTag = "CS2D";
	static sDefaultRPRegistered = false;

	mPaint: CPaint2D;

	constructor(_opt: ICShape2DOption = {}) {
		super();

		let texKey: string = null;
		let normalKey: string = null;
		if (_opt.texture) {
			if (Array.isArray(_opt.texture)) {
				[texKey, normalKey] = _opt.texture;
			} else {
				texKey = _opt.texture;
			}
		}

		this.mPaint = new CPaint2D(texKey, _opt.size || null);
		if (normalKey) this.mPaint.PushNormalMap(normalKey);

		if (_opt.pos) this.SetPos(_opt.pos);
		if (_opt.rot) this.SetRot(_opt.rot);
		if (_opt.sca !== undefined) {
			this.SetSca(_opt.sca instanceof CVec3 ? _opt.sca : new CVec3(_opt.sca, _opt.sca, _opt.sca));
		}
		if (_opt.pivot) this.mPaint.SetPivot(_opt.pivot);

		if (_opt.color) this.mPaint.SetColorModel(_opt.color);
		if (_opt.alpha) this.mPaint.SetAlphaModel(_opt.alpha);

		if (_opt.texCodi) this.mPaint.SetTexCodi(_opt.texCodi);
		if (_opt.billboard) this.mPaint.SetBillBoard(true);
		if (_opt.ySort) {
			this.mPaint.SetYSort(true);
			if (typeof _opt.ySort === 'object' && _opt.ySort.origin !== undefined) {
				this.mPaint.SetYSortOrigin(_opt.ySort.origin);
			}
		}
		if (_opt.wind !== undefined) this.mPaint.Wind(_opt.wind);

		if (_opt.cullFace !== undefined || _opt.wireframe !== undefined || _opt.priority !== undefined) {
			const rp = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
			if (_opt.cullFace !== undefined) rp.mCullFace = _opt.cullFace;
			if (_opt.wireframe !== undefined) rp.mLine = _opt.wireframe;
			if (_opt.priority !== undefined) rp.mPriority = _opt.priority;
			this.mPaint.PushRenderPass(rp);
		}

		if (_opt.uniforms) {
			for (const u of _opt.uniforms) {
				this.mPaint.PushCShaderAttr(new CShaderAttr(u.key, u.val as any));
			}
		}

		let rb: CRigidBody | undefined;
		if (_opt.rigidBody) {
			rb = new CRigidBody();
			if (_opt.rigidBody.gravity !== undefined) rb.SetGravity(_opt.rigidBody.gravity);
			if (_opt.rigidBody.freezePos) rb.mFreezePos = _opt.rigidBody.freezePos;
			this.PushComp(rb);
		}
		if (_opt.forces) {
			if (!rb) { rb = new CRigidBody(); this.PushComp(rb); }
			for (const f of _opt.forces) {
				rb.Push(new CForce(f.key, f.dir, f.vel));
			}
		}

		if (_opt.collider) {
			const col = new CCollider(this.mPaint, rb);
			col.SetEvent(_opt.collider.event);
			if (_opt.collider.layer) col.SetLayer(_opt.collider.layer);
			if (_opt.collider.collisionWith) col.PushCollisionLayer(_opt.collider.collisionWith);
			if (_opt.collider.boundType !== undefined) col.SetBoundType(_opt.collider.boundType);
			if (_opt.collider.pickMouse) col.SetPickMouse(true);
			this.PushComp(col);
		}

		if (_opt.tags) {
			for (const tag of _opt.tags) {
				this.mPaint.PushTag(tag);
			}
		}

		if (_opt.animation) {
			this.PushComp(new CAniFlow(_opt.animation));
		}

		// 기본 Sl2D Auto RP (Brush에 한 번 등록, ClearCRPAuto 시 자동 복구)
		this.mPaint.PushTag(CShape2D.sDefaultTag);
		if (!CShape2D.sDefaultRPRegistered) {
			const defRP = new CRPAuto(CFrame.Main().Pal().Sl2D().mKey);
			defRP.PushAnd(new CCondition("mTag[" + CShape2D.sDefaultTag + "]"));
			CAtelier.Main().Brush().SetAutoRP("CShape2D_Default", defRP);
			CShape2D.sDefaultRPRegistered = true;
		}

		this.PushComp(this.mPaint);
	}

	GetPaint() { return this.mPaint; }
}

CClass.Push(CShape2D);
