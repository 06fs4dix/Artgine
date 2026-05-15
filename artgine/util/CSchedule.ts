
import { CUpdate } from "../basic/Basic.js";
import { CObject } from "../basic/CObject.js";
import { CTimer } from "../system/CTimer.js";

export class CSchedule extends CObject
{
	mDelay = 0;
	mCount = 1;
	mStart = 0;
	mEnd = 0;

	Execute(_dataTarget: any = null, _run = "", _update: CUpdate = null): boolean
	{
		if (_dataTarget == null) _dataTarget = this;
		return CSchedule.Update(_dataTarget, this.mCount, this.mDelay, this.mStart, this.mEnd, _run, _update);
	}

	IsEndReset(_dataTarget: any = null, _run = "")
	{
		if (_dataTarget == null) _dataTarget = this;
		return CSchedule.IsEndReset(_dataTarget, _run);
	}

	// 실시간 호출해줘야 갱신된다
	static Update(_dataTarget: any, count = 0, delay = 0, start = 0, end = 0, _run = "", _update: CUpdate = null): boolean
	{
		if (_dataTarget["mTemp"] == null) _dataTarget["mTemp"] = {};

		let offset = _update != null ? _update.Offset() : 0;

		let timer: CTimer;
		if (_dataTarget["mTemp"]["mTimer" + _run] == null)
		{
			_dataTarget["mTemp"]["mTimer" + _run] = new CTimer();
			_dataTarget["mTemp"]["mCount" + _run] = 0;
			_dataTarget["mTemp"]["mTime" + _run] = 0;
			_dataTarget["mTemp"]["mDelay" + _run] = 0;
		}
		else if (_dataTarget["mTemp"]["mOffset" + _run] + 1 < offset)
		{
			(_dataTarget["mTemp"]["mTimer" + _run] as CTimer).Delay();
			_dataTarget["mTemp"]["mCount" + _run] = 0;
			_dataTarget["mTemp"]["mTime" + _run] = 0;
			_dataTarget["mTemp"]["mDelay" + _run] = 0;
			_dataTarget["mTemp"]["mEnd" + _run] = false;
		}
		_dataTarget["mTemp"]["mOffset" + _run] = offset;

		timer = _dataTarget["mTemp"]["mTimer" + _run];
		let t = timer.Delay();
		_dataTarget["mTemp"]["mDelay" + _run] = _dataTarget["mTemp"]["mDelay" + _run] + t;
		_dataTarget["mTemp"]["mTime" + _run] = _dataTarget["mTemp"]["mTime" + _run] + t;

		if (delay != 0 && _dataTarget["mTemp"]["mDelay" + _run] < delay) return false;
		if (_dataTarget["mTemp"]["mTime" + _run] < start) return false;
		if (end != 0 && _dataTarget["mTemp"]["mTime" + _run] > end)
		{
			_dataTarget["mTemp"]["mEnd" + _run] = true;
			return false;
		}

		_dataTarget["mTemp"]["mDelay" + _run] = 0;
		_dataTarget["mTemp"]["mCount" + _run] = _dataTarget["mTemp"]["mCount" + _run] + 1;

		if (count != 0 && _dataTarget["mTemp"]["mCount" + _run] > count)
		{
			_dataTarget["mTemp"]["mEnd" + _run] = true;
			return false;
		}

		return true;
	}

	static IsEndReset(_dataTarget: any, _run = "")
	{
		if (_dataTarget["mTemp"] == null) return false;

		if (_dataTarget["mTemp"]["mEnd" + _run] == true)
		{
			_dataTarget["mTemp"]["mOffset" + _run] = 0;
			return true;
		}

		return false;
	}
}
