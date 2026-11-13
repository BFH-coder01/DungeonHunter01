//#region src/runtime/jobs.ts
/** How many workers to start: the cores beside the main thread's, and the render's, at most four. */
function e() {
	const e = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 2 : 2;
	return Math.max(1, Math.min(4, e - 2));
}
/** Starts a pool from the text of a worker script, or answers null where this realm has no Worker. */
function t(t, n = e()) {
	if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL?.createObjectURL !== "function") return null;
	const r = URL.createObjectURL(new Blob([t], { type: "text/javascript" }));
	const i = [];
	const a = /* @__PURE__ */ new Map();
	let o = 1, s = 0, c = 0, l = false;
	const u = (e) => {
		for (const t of a.values()) t.reject(e);
		a.clear();
		s = 0;
	};
	try {
		for (let e = 0; e < Math.max(1, n); e++) {
			const e = new Worker(r);
			e.onmessage = (e) => {
				const t = a.get(e.data.id);
				if (!t) return;
				a.delete(e.data.id);
				s--;
				c++;
				if (e.data.error !== void 0) t.reject(new Error(e.data.error));
				else t.resolve(e.data.result);
			};
			e.onerror = (e) => {
				l = true;
				u(/* @__PURE__ */ new Error(`a job worker failed: ${e.message}`));
			};
			i.push(e);
		}
	} finally {
		URL.revokeObjectURL(r);
	}
	return {
		size: i.length,
		get inFlight() {
			return s;
		},
		get done() {
			return c;
		},
		run(e, t, n = []) {
			if (l) return Promise.reject(/* @__PURE__ */ new Error("the job workers have stopped"));
			const r = o++;
			return new Promise((o, c) => {
				a.set(r, {
					resolve: o,
					reject: c
				});
				s++;
				i[(e % i.length + i.length) % i.length].postMessage({
					...t,
					id: r
				}, n);
			});
		},
		dispose() {
			for (const e of i) e.terminate();
			l = true;
			u(/* @__PURE__ */ new Error("the job pool was disposed"));
		}
	};
}
//#endregion
export { t };

//# sourceMappingURL=jobs.js.map