//#region src/ai/nav/minHeap.ts
/**
* @file    minHeap.ts
* @brief   The open set both searches run on — grid cells and mesh polygons are
*          the same problem to a heap.
*/
/**
* Binary min-heap of integer node ids keyed by an f-score, backed by flat typed
* arrays. Lazy-deletion friendly: a node may be pushed more than once with a
* lower key; the search skips already-closed pops.
*/
var e = class {
	constructor(e) {
		this.size = 0;
		const t = Math.max(16, e);
		this.nodes = new Int32Array(t);
		this.keys = new Float64Array(t);
	}
	push(e, t) {
		if (this.size === this.nodes.length) this.grow();
		let n = this.size++;
		this.nodes[n] = e;
		this.keys[n] = t;
		while (n > 0) {
			const e = n - 1 >> 1;
			if (this.keys[e] <= this.keys[n]) break;
			this.swap(n, e);
			n = e;
		}
	}
	pop() {
		const e = this.nodes[0];
		const t = --this.size;
		this.nodes[0] = this.nodes[t];
		this.keys[0] = this.keys[t];
		let n = 0;
		for (;;) {
			const e = n * 2 + 1;
			const t = e + 1;
			let r = n;
			if (e < this.size && this.keys[e] < this.keys[r]) r = e;
			if (t < this.size && this.keys[t] < this.keys[r]) r = t;
			if (r === n) break;
			this.swap(n, r);
			n = r;
		}
		return e;
	}
	swap(e, t) {
		const n = this.nodes[e];
		this.nodes[e] = this.nodes[t];
		this.nodes[t] = n;
		const r = this.keys[e];
		this.keys[e] = this.keys[t];
		this.keys[t] = r;
	}
	grow() {
		const e = new Int32Array(this.nodes.length * 2);
		const t = new Float64Array(this.keys.length * 2);
		e.set(this.nodes);
		t.set(this.keys);
		this.nodes = e;
		this.keys = t;
	}
};
//#endregion
export { e as t };

//# sourceMappingURL=minHeap.js.map