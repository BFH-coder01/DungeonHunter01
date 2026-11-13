import { s as e } from "./resource.js";
//#region src/runtime/collisionGeometry.ts
/** The pieces now, by key. */
var t = class {
	constructor() {
		this.pieces_ = /* @__PURE__ */ new Map();
		this.revision = 0;
	}
	set(e, t) {
		this.pieces_.set(e, t);
		this.revision++;
	}
	delete(e) {
		if (this.pieces_.delete(e)) this.revision++;
	}
	get(e) {
		return this.pieces_.get(e);
	}
	/** Deletes every piece whose key starts with `prefix`. */
	deleteAll(e) {
		for (const t of [...this.pieces_.keys()]) if (t.startsWith(e)) this.delete(t);
	}
	entries() {
		return this.pieces_.entries();
	}
	get size() {
		return this.pieces_.size;
	}
};
const n = e(new t(), "CollisionGeometry");
/** The app's collision geometry, installed on first use. */
function r(e) {
	if (!e.hasResource(n)) e.insertResource(n, new t());
	return e.getResource(n);
}
//#endregion
export { n, r, t };

//# sourceMappingURL=collisionGeometry.js.map