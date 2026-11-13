//#region src/ecs/emitter.ts
let e = 0;
/**
* Handlers subscribed through every Emitter in this realm, right now.
*
* A forgotten unsubscribe is invisible per-instance — one extra handler looks
* like nothing — and shows only as a total that never comes back down. The
* census treats it as conserved: a Play/Stop round trip must end where it began.
*/
function t() {
	return e;
}
var n = class {
	constructor() {
		this.handlers_ = /* @__PURE__ */ new Map();
	}
	on(t, n) {
		let r = this.handlers_.get(t);
		if (!r) {
			r = /* @__PURE__ */ new Set();
			this.handlers_.set(t, r);
		}
		if (!r.has(n)) {
			r.add(n);
			e++;
		}
		return () => {
			if (r.delete(n)) {
				e--;
				if (r.size === 0) this.handlers_.delete(t);
			}
		};
	}
	emit(e, ...t) {
		const n = this.handlers_.get(e);
		if (!n) return;
		for (const e of [...n]) e(...t);
	}
	clear() {
		for (const t of this.handlers_.values()) e -= t.size;
		this.handlers_.clear();
	}
	/** Handlers held by this emitter across all its events. */
	get size() {
		let e = 0;
		for (const t of this.handlers_.values()) e += t.size;
		return e;
	}
};
//#endregion
export { t as n, n as t };

//# sourceMappingURL=emitter.js.map