//#region src/platform/recordingClock.ts
/**
* @file    recordingClock.ts
* @brief   The time axis every screen recorder cuts highlights on.
*/
/** Recording time that does not count pauses — the axis both hosts cut clips on. */
var e = class {
	constructor(e = Date.now) {
		this.now_ = e;
		this.startedAt_ = 0;
		this.pausedAt_ = null;
		this.pausedTotal_ = 0;
		this.highlights_ = [];
	}
	start() {
		this.startedAt_ = this.now_();
		this.pausedAt_ = null;
		this.pausedTotal_ = 0;
		this.highlights_.length = 0;
	}
	pause() {
		if (this.pausedAt_ === null) this.pausedAt_ = this.now_();
	}
	resume() {
		if (this.pausedAt_ === null) return;
		this.pausedTotal_ += this.now_() - this.pausedAt_;
		this.pausedAt_ = null;
	}
	elapsedMs() {
		const e = this.pausedAt_ ?? this.now_();
		return Math.max(0, e - this.startedAt_ - this.pausedTotal_);
	}
	mark(e, t) {
		const n = this.elapsedMs();
		this.highlights_.push([Math.max(0, n - e * 1e3), n + t * 1e3]);
	}
	/** Ranges clipped to the recording and merged where they overlap. */
	highlights(e) {
		const t = [];
		const n = this.highlights_.map(([t, n]) => [t, Math.min(n, e)]).filter(([e, t]) => t > e).sort((e, t) => e[0] - t[0]);
		for (const e of n) {
			const n = t[t.length - 1];
			if (n && e[0] <= n[1]) n[1] = Math.max(n[1], e[1]);
			else t.push([e[0], e[1]]);
		}
		return t.map(([e, t]) => [Math.round(e), Math.round(t)]);
	}
};
//#endregion
export { e as t };

//# sourceMappingURL=recordingClock.js.map