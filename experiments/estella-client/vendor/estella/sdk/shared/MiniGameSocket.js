import { t as e } from "./emitter.js";
//#region src/math/scalar.ts
/**
* @file    scalar.ts
* @brief   Scalar math helpers — the single TS source for the clamp/lerp/remap
*          family game code previously re-implemented inline. Exposed as the
*          `scalar` namespace (e.g. `scalar.lerp(a, b, t)`).
*/
const t = Math.PI / 180;
const n = 180 / Math.PI;
const r = {
	/** Clamp `x` to [min, max]. */
	clamp(e, t, n) {
		return e < t ? t : e > n ? n : e;
	},
	/** Clamp `x` to [0, 1]. */
	clamp01(e) {
		return e < 0 ? 0 : e > 1 ? 1 : e;
	},
	/** Linear interpolate a→b by t (t is not clamped). */
	lerp(e, t, n) {
		return e + (t - e) * n;
	},
	/** Inverse of lerp: the t for which lerp(a,b,t)===value (0 if a===b). */
	inverseLerp(e, t, n) {
		return e === t ? 0 : (n - e) / (t - e);
	},
	/** Map `value` from [inMin,inMax] onto [outMin,outMax]. */
	remap(e, t, n, r, i) {
		return r + (i - r) * (t === n ? 0 : (e - t) / (n - t));
	},
	deg2rad(e) {
		return e * t;
	},
	rad2deg(e) {
		return e * n;
	},
	/** Within `epsilon` (default 1e-6). */
	approximately(e, t, n = 1e-6) {
		return Math.abs(e - t) <= n;
	},
	/** Hermite smoothstep of `x` across the [edge0, edge1] edge (clamped). */
	smoothstep(e, t, n) {
		const i = r.clamp01(e === t ? 0 : (n - e) / (t - e));
		return i * i * (3 - 2 * i);
	},
	/** Euclidean modulo — result has the sign of `n` (unlike JS `%`). */
	mod(e, t) {
		return (e % t + t) % t;
	},
	sign(e) {
		return e > 0 ? 1 : e < 0 ? -1 : 0;
	}
};
//#endregion
//#region src/net/MiniGameSocket.ts
/**
* @file    MiniGameSocket.ts
* @brief   The mini-game family's WebSocket transport, behind the platform
*          socket seam.
*
*          Mini-game hosts have no `WebSocket` constructor; they hand out a task
*          object from `connectSocket()`. This wraps that task against the
*          normalized {@link MiniGameSocketTask} — so it is the socket for every
*          vendor of the family, not for one of them.
*/
var i = class {
	constructor(t, n) {
		this.task_ = null;
		this.sendQueue_ = [];
		this.events_ = new e();
		this.delivery = "reliable-ordered";
		this.readyState = "closed";
		this.url_ = t.url;
		this.protocols_ = t.protocols;
		this.g_ = n;
	}
	on(e, t) {
		return this.events_.on(e, t);
	}
	connect() {
		if (this.task_) return;
		if (typeof this.g_.connectSocket !== "function") {
			this.events_.emit("error", "connectSocket is not available on this mini-game host");
			return;
		}
		this.readyState = "connecting";
		const e = this.g_.connectSocket({
			url: this.url_,
			protocols: Array.isArray(this.protocols_) ? this.protocols_ : this.protocols_ ? [this.protocols_] : void 0
		});
		this.task_ = e;
		e.onOpen(() => {
			this.readyState = "open";
			for (const t of this.sendQueue_) e.send({ data: t });
			this.sendQueue_ = [];
			this.events_.emit("open");
		});
		e.onMessage((e) => {
			this.events_.emit("message", e.data);
		});
		let t = false;
		const n = (n, r) => {
			if (t) return;
			t = true;
			this.readyState = "closed";
			if (this.task_ === e) this.task_ = null;
			this.events_.emit("close", n, r);
		};
		e.onClose((e) => n(e.code, e.reason));
		e.onError((e) => {
			const t = this.readyState === "connecting";
			this.events_.emit("error", e);
			if (t) n(1006, e?.errMsg ?? "connect failed");
		});
	}
	send(e) {
		if (this.readyState === "open" && this.task_) this.task_.send({ data: e });
		else this.sendQueue_.push(e);
	}
	close(e, t) {
		if (this.task_) {
			this.readyState = "closing";
			this.task_.close({
				code: e,
				reason: t
			});
		}
	}
};
//#endregion
export { r as n, i as t };

//# sourceMappingURL=MiniGameSocket.js.map