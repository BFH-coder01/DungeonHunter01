import { Nt as e, X as t, Y as n, cr as r, dt as i, et as a, or as o, rn as s, sr as c, wt as l } from "./system.js";
import { s as u } from "./logger.js";
import { t as d } from "./disposeAll.js";
import { s as f } from "./resourceManager.js";
import { a as p, n as m, t as h } from "./migrate.js";
//#region src/scene/sceneEntry.ts
/** True for a prefab-instance entry (carries a `prefab` asset ref). */
function g(e) {
	return typeof e.prefab === "string";
}
//#endregion
//#region src/prefab/deferred.ts
/** The metadata key that makes an instance virtual. */
const _ = "deferred";
/** The metadata key a scene instance carries when it is one layout of a page that has several (a phone's, say): `?expand-virtual` leaves such an instance out, as the layouts would stand side by side. */
const ee = "variant";
/** Whether the instance of `prefab` with `overrides` is virtual: the root's mark as the prefab has it and the overrides leave it. */
function v(e, t) {
	let n = e.entities.find((t) => t.prefabEntityId === e.rootEntityId)?.metadata?.[_] === true;
	for (const r of t) {
		if (r.prefabEntityId !== e.rootEntityId || r.metadataKey !== "deferred") continue;
		if (r.type === "metadata_set") n = r.value === true;
		else if (r.type === "metadata_removed") n = false;
	}
	return n;
}
/** Whether an instance's overrides only touch what a root-only stand-in has. Anything that moves entities about cannot wait. */
function te(e, t) {
	return !e.some((e) => e.type === "parent" && e.prefabEntityId !== t.rootEntityId);
}
/**
* The prefab cut down to its root, with no children and no nested slots: what a virtual instance is made as. Null for a variant,
* whose root is only known once its base has been merged; the caller then flattens it whole and cuts the result.
*/
function ne(e) {
	if (e.basePrefab) return null;
	const t = e.entities.find((t) => t.prefabEntityId === e.rootEntityId);
	if (!t || t.nestedPrefab) return null;
	return {
		...e,
		entities: [{
			...t,
			children: []
		}]
	};
}
/** Overrides that address the root itself: the only ones a root-only stand-in can use. */
function y(e, t) {
	return t.filter((t) => t.prefabEntityId === e.rootEntityId);
}
/** An expanded instance cut down to its root: the same root, no children, nothing else. */
function b(e, t) {
	const n = e.find((e) => e.id === t);
	return n ? [{
		...n,
		children: []
	}] : [];
}
//#endregion
//#region src/scene/deferredInstances.ts
const x = /* @__PURE__ */ new WeakMap();
/**
* Whether the page was asked to make virtual instances whole (`?expand-virtual` in its address): a switch for looking at a game as
* the editor shows it (an authoring preview, a pixel check of every page) and for ruling virtual instances in or out when something
* is wrong. A page without an address (a test host, a device) answers no.
*/
function S() {
	try {
		return new URLSearchParams(globalThis.location?.search ?? "").has("expand-virtual");
	} catch {
		return false;
	}
}
/** Remember the virtual instances a scene was loaded with: `entities` is the scene's id -> entity map the load answered. */
function C(e, t, n) {
	if (!t || t.length === 0) return;
	let r = x.get(e);
	if (!r) x.set(e, r = /* @__PURE__ */ new Map());
	for (const e of t) {
		const t = n.get(e.id);
		if (t === void 0) continue;
		r.set(t, e);
	}
}
/** What `entity` would be made from, if it is a virtual instance. */
function re(e, t) {
	const n = x.get(e);
	const r = n?.get(t);
	if (r === void 0) return void 0;
	if (!e.valid(t)) {
		n.delete(t);
		return;
	}
	return r;
}
/** Every virtual instance of the world, in the order they were registered. */
function ie(e) {
	const t = x.get(e);
	if (!t) return [];
	const n = [];
	for (const r of [...t.keys()]) if (e.valid(r)) n.push(r);
	else t.delete(r);
	return n;
}
//#endregion
//#region src/document/diagnostics.ts
/**
* @file  What is wrong with an authored document, said the same way for all of
*        them.
*
*        A scene and a prefab are the same shape of thing — entities with ids,
*        a parent/children topology, components, references between them — and
*        break in the same ways. The checks that find those breaks belong to
*        neither format: they take a view of the document and return findings,
*        so every gate that reads one (editor open, runtime load, cook, CI)
*        judges by the same rules.
*
*        Pure and total: nothing here throws. The caller decides what a finding
*        costs.
*/
/** Whether a document names its entities by string or by number, for messages. */
const w = (e) => typeof e === "string" ? `"${e}"` : String(e);
/** @internal Index wide immutable link lists once; tiny lists need no index. */
function T() {
	let e;
	return (t, n) => {
		if (t.length <= 8) return t.includes(n);
		e ??= /* @__PURE__ */ new Map();
		let r = e.get(t);
		if (!r) {
			r = new Set(t);
			e.set(t, r);
		}
		return r.has(n);
	};
}
/**
* Ids are unique, and no entity carries the same component twice. A repeated id
* is the finding nothing downstream can work around: a loader keying by id keeps
* whichever came last, and every reference to it lands elsewhere in silence.
* Returns the id→node index the later passes read.
*/
function E(e, t) {
	const n = /* @__PURE__ */ new Map();
	for (const r of e) {
		if (n.has(r.id)) t("duplicate-id", "error", `entity id ${w(r.id)} appears more than once`, r.id);
		else n.set(r.id, r);
		const e = /* @__PURE__ */ new Set();
		for (const n of r.components) if (e.has(n.type)) t("duplicate-component", "error", `entity ${w(r.id)} has more than one "${n.type}" component`, r.id, n.type);
		else e.add(n.type);
	}
	return n;
}
/**
* Parent and children agree with each other, and both name entities that exist.
*
* `rootIsDetached` decides what a null parent means: a prefab has exactly one
* root and anything else adrift is broken, while a scene is a forest and a null
* parent is ordinary.
*/
function ae(e, t, n) {
	const r = T();
	for (const i of e) {
		if (i.parent !== null) {
			const e = t.get(i.parent);
			if (!e) n("missing-parent", "error", `entity ${w(i.id)} parent ${w(i.parent)} does not exist`, i.id);
			else if (!r(e.children, i.id)) n("inconsistent-topology", "error", `entity ${w(i.id)} claims parent ${w(i.parent)} but that parent's children omit it`, i.id);
		}
		for (const e of i.children) {
			const r = t.get(e);
			if (!r) n("missing-child", "error", `entity ${w(i.id)} lists child ${w(e)} which does not exist`, i.id, String(e));
			else if (r.parent !== i.id) n("inconsistent-topology", "error", `entity ${w(i.id)} lists ${w(e)} as a child but its parent points elsewhere`, i.id, String(e));
		}
	}
}
/**
* No entity is its own ancestor. Reported once: a cycle otherwise names every
* entity on it, and the reader has to work out that it is one problem.
*/
function D(e, t, n) {
	const r = 0, i = 1, a = 2;
	const o = /* @__PURE__ */ new Map();
	for (const t of e) o.set(t.id, r);
	for (const r of e) {
		if (o.get(r.id) === a) continue;
		const e = [];
		let s = r.id;
		while (s !== null && t.has(s) && o.get(s) !== a) {
			if (o.get(s) === i) {
				n("parent-cycle", "error", `parent cycle detected: ${e.slice(e.indexOf(s)).concat(s).map(String).join(" → ")}`, s);
				return;
			}
			o.set(s, i);
			e.push(s);
			s = t.get(s).parent;
		}
		for (const t of e) o.set(t, a);
	}
}
/**
* Entity-reference fields point at entities of this document.
*
* A warning, not an error: a reference to something the author deleted leaves a
* document that still loads, with one field reading empty.
*/
function oe(e, t, n, r) {
	for (const i of e) for (const e of i.components) {
		const a = s(e.type);
		if (!a || a.entityFields.length === 0) continue;
		for (const o of a.entityFields) {
			const a = e.data[o];
			if (typeof a !== "string" && typeof a !== "number") continue;
			if (r(a) || t.has(a)) continue;
			n("dangling-entity-ref", "warning", `entity ${w(i.id)} field "${e.type}.${o}" references ${w(a)}, which is not in the document`, i.id, `${e.type}.${o}`);
		}
	}
}
//#endregion
//#region src/scene/validateScene.ts
/**
* @file  Everything wrong with a scene, in the vocabulary prefabs already speak.
*
*        A prefab has been validated at every gate it passes since it got a
*        format; a scene — the document a game actually ships — was checked
*        nowhere, and the loader answered a repeated id by keeping whichever
*        entity came last. Both are entity documents, so both are read by the
*        shared checks, and a scene only adds what is its own: it is a forest
*        rather than one rooted tree, and its prefab-instance entries stand in
*        for entities that are not expanded yet.
*/
/** A scene entity as the shared checks read it. */
const se = (e) => ({
	id: e.id,
	parent: e.parent ?? null,
	children: e.children ?? [],
	components: e.components ?? []
});
/**
* Validate a scene and return every problem found. Errors mean the scene cannot
* be loaded into a world that means what the file says; warnings are loadable.
* Pure + total — nothing here throws, and the caller decides what a finding
* costs.
*/
function ce(e) {
	const t = [];
	const n = (e, n, r, i, a) => {
		t.push({
			code: e,
			severity: n,
			message: r,
			...i !== void 0 ? { entityId: i } : {},
			...a !== void 0 ? { field: a } : {}
		});
	};
	if (!Array.isArray(e?.entities)) {
		n("malformed", "error", "scene has no \"entities\" array");
		return t;
	}
	const r = e.entities.map(se);
	const i = E(r, n);
	ae(r, i, n);
	D(r, i, n);
	oe(r, i, n, (e) => e === 0 || typeof e !== "number");
	for (const t of e.entities) {
		if (g(t) || !Array.isArray(t.components)) continue;
		for (const e of t.components) if (typeof e?.type !== "string" || e.type.length === 0) n("malformed-component", "error", `entity ${t.id} has a component with no type`, t.id);
	}
	return t;
}
//#endregion
//#region src/asset/AssetLease.ts
/**
* @file    AssetLease.ts
* @brief   The receipt for one acquisition, and a scope that holds several.
*
* @details A path answers "which asset do I want?". A lease answers "which
*          instance do I actually hold?" — and only the second one can be given
*          back correctly once `invalidate()` has made two generations of the
*          same path live at the same time.
*/
const le = (e) => e.release();
/** A composed resource has no cache generation to re-acquire. Its last receipt disposes it. */
function ue(e, t, n, r) {
	let i = 0;
	const a = () => {
		i++;
		let o = false;
		return {
			key: e,
			generation: t,
			value: n,
			release: () => {
				if (o) return;
				o = true;
				if (--i === 0) r(n);
			},
			retain: () => o ? null : a()
		};
	};
	return a();
}
/**
* @brief Everything one owner acquired, released together.
*
* @details Holds receipts rather than paths, so unloading releases what was
*          actually acquired — not what the manifest says this owner would
*          acquire if it loaded today. A failed acquisition produced no lease,
*          so there is nothing to release and nothing to guess about.
*/
var O = class {
	constructor() {
		this.leases_ = [];
	}
	add(e) {
		this.leases_.push(e);
		return e;
	}
	/** Hand back the current batch in reverse order, attempting all releases.
	* A failure is reported after cleanup; acquisitions made by cleanup belong
	* to the next batch. */
	releaseAll() {
		const e = this.leases_;
		this.leases_ = [];
		d(e, le, true);
	}
	/**
	* Take over every receipt `other` holds; it owes nothing afterwards.
	*
	* The transfer an owner needs when the acquiring code is not the owning
	* code: a loader acquires into a scope of its own and hands the whole thing
	* to whoever will outlive it.
	*/
	absorb(e) {
		if (e === this) return;
		for (const t of e.leases_) this.leases_.push(t);
		e.leases_ = [];
	}
	/** Stop tracking one lease without releasing it — for an ownership transfer. */
	forget(e) {
		const t = this.leases_.indexOf(e);
		if (t < 0) return false;
		this.leases_.splice(t, 1);
		return true;
	}
	/** How many acquisitions this scope still owes. Diagnostics and tests. */
	get size() {
		return this.leases_.length;
	}
	/** @internal The receipts themselves — for a census, never to release behind the scope. */
	leases() {
		return this.leases_;
	}
};
//#endregion
//#region src/asset/discoverAssets.ts
/**
* @file    discoverAssets.ts
* @brief   Unified asset discovery from scene/prefab data.
*
* Each component may reference assets in three ways: a custom
* `discoverAssets` callback, declared `assetFields`, or paired
* `skeletalFields`. This module walks a SceneData and buckets every
* such ref by asset type. A `discoverAssets` callback is authoritative:
* when present, `assetFields` are not walked for discovery (they still
* drive the editor's asset pickers and ref rewrites) — the callback may
* deliberately exclude values, e.g. FSM/BT agents skip plain
* code-registered names that only look like asset refs.
*
* Refs in serialized data may be either a concrete path
* (`"assets/player.png"`, legacy) or a UUID reference
* (`"@uuid:xxxxxxxx-..."`, produced by the meta-driven pipeline).
* An optional `refResolver` callback translates a ref to its
* current path before bucketing. Without a resolver the ref is
* passed through unchanged — works for legacy scenes that still
* store paths directly.
*/
function de(e, t) {
	const n = /* @__PURE__ */ new Map();
	const r = /* @__PURE__ */ new Map();
	const i = /* @__PURE__ */ new Map();
	const a = [];
	const o = [];
	const c = /* @__PURE__ */ new Set();
	const l = [];
	const u = /* @__PURE__ */ new Set();
	const d = /* @__PURE__ */ new Set();
	const f = (e) => {
		const n = t ? t(e) : e;
		if (n == null || n === "") {
			l.push(e);
			return null;
		}
		return n;
	};
	const p = (e, t, n) => {
		let r = e.get(t);
		if (!r) {
			r = /* @__PURE__ */ new Set();
			e.set(t, r);
		}
		r.add(n);
	};
	const m = (e, t) => {
		const a = f(t);
		if (a == null) return;
		p(n, e, a);
		p(r, e, t);
		if (!i.has(a)) i.set(a, t);
	};
	for (const n of e.entities) {
		if (n.visible === false) continue;
		if (!Array.isArray(n.components)) continue;
		for (const e of n.components) {
			const n = s(e.type);
			if (!n) continue;
			const r = e.data;
			if (e.type === "MeshRenderer") for (const [e, n] of [
				["texture", u],
				["normalMap", u],
				["material", d]
			]) {
				const i = r[e];
				const a = typeof i === "string" && i ? t ? t(i) : i : null;
				if (a) n.add(a);
			}
			if (n.discoverAssets) {
				for (const e of n.discoverAssets(r)) if (typeof e.path === "string" && e.path) m(e.type, e.path);
			} else for (const e of n.assetFields) {
				const t = r[e.field];
				if (typeof t === "string" && t) m(e.type, t);
			}
			if (n.skeletalFields) {
				const e = r[n.skeletalFields.skeletonField];
				const t = r[n.skeletalFields.atlasField];
				if (e && t) {
					const r = f(e);
					const i = f(t);
					if (r != null && i != null) {
						const e = `${r}:${i}`;
						if (!c.has(e)) {
							c.add(e);
							(n.skeletalFields.runtime === "dragonbones" ? o : a).push({
								skeleton: r,
								atlas: i
							});
						}
					}
				}
			}
		}
	}
	return {
		byType: n,
		rawByType: r,
		rawFor: i,
		spines: a,
		dragonBones: o,
		unresolved: l,
		meshTextures: u,
		meshMaterials: d
	};
}
//#endregion
//#region src/asset/spinePairKey.ts
/** The identity of a Spine asset: its skeleton and atlas references together. */
function fe(e, t) {
	return `${e}:${t}`;
}
//#endregion
//#region src/prefab/preparedAssetOwnership.ts
/** Project successful acquisitions onto immutable authored entities once, at bake time. */
function k(e, t, n, r) {
	if (!n || !t.acquisitions?.length) return void 0;
	const i = /* @__PURE__ */ new Map();
	for (const { type: e, path: n, lease: r } of t.acquisitions) {
		let t = i.get(e);
		if (!t) i.set(e, t = /* @__PURE__ */ new Map());
		t.set(n, r);
	}
	const a = /* @__PURE__ */ new Map();
	for (const t of e.entities) {
		const n = de({
			...e,
			entities: [t]
		}, r);
		const o = /* @__PURE__ */ new Set();
		for (const e of [n.byType, n.rawByType]) for (const [t, n] of e) {
			const e = i.get(t === "bitmap-font" ? "font" : t);
			for (const t of n) {
				const n = e?.get(t);
				if (n) o.add(n);
			}
		}
		for (const e of n.spines) {
			const t = i.get("spine")?.get(fe(e.skeleton, e.atlas));
			if (t) o.add(t);
		}
		if (o.size) a.set(t.id, [...o]);
	}
	if (!a.size) return void 0;
	return () => {
		const e = /* @__PURE__ */ new Map();
		const t = () => {
			for (const t of e.values()) t.releaseAll();
			e.clear();
		};
		try {
			for (const [t, n] of a) {
				const r = new O();
				e.set(t, r);
				for (const e of n) {
					const t = e.retain();
					if (!t) throw new Error(`Cannot spawn retired prefab: resource "${e.key}" was released`);
					r.add(t);
				}
			}
		} catch (e) {
			t();
			throw e;
		}
		return {
			attach(r, i) {
				for (const [t, a] of e) {
					const e = i.get(t);
					if (e !== void 0 && r.valid(e)) n.ensure(r, e).absorb(a);
				}
				t();
			},
			release: t
		};
	};
}
//#endregion
//#region src/util/provenance.ts
/**
* @file    provenance.ts
* @brief   Project-origin signatures stamped into shipped bundles and saved data.
*
* These constants are stable, project-unique markers used to verify the origin
* of a build and of the assets it produces. {@link ESTELLA_BUILD_FINGERPRINT}
* is referenced by core code so it survives bundling/minification;
* {@link ESTELLA_SCENE_GENERATOR} is written into every serialized scene, so it
* propagates into downstream project files. Authorship / anti-tamper aid —
* do not remove or alter.
*/
/** Build-origin fingerprint baked into the shipped runtime bundle. */
const pe = "estella-fp:38f17476-d32d-41e0-b2da-8f7ad89fd89c";
/**
* Generator tag written into serialized scenes. Embeds the build fingerprint so
* referencing the tag also keeps the fingerprint live through tree-shaking.
*/
const me = `estella-engine (${pe}; 0eee7df0-23b5-44ce-9538-6a80dde1064c)`;
//#endregion
//#region src/util/cloneJsonValue.ts
/** Copy authored JSON data without serializing ordinary records to text first.
* Exotic values keep JSON's conversion rules, including toJSON's property key. */
function A(e) {
	const t = /* @__PURE__ */ new Set();
	const n = (e, i, a = false, o = 0) => {
		if (e === null || typeof e === "string" || typeof e === "boolean") return e;
		if (typeof e === "number") return Number.isFinite(e) ? e === 0 ? 0 : e : null;
		if (e === void 0 || typeof e === "function" || typeof e === "symbol") return void 0;
		const s = () => a ? JSON.parse(JSON.stringify(e)) : JSON.parse(JSON.stringify({ [i]: e }))[i];
		if (typeof e !== "object") return s();
		if (o >= 64) return s();
		const c = Object.getPrototypeOf(e);
		const l = Array.isArray(e);
		if ("toJSON" in e || c !== Object.prototype && c !== null && !(l && c === Array.prototype)) return s();
		if (t.has(e)) return s();
		t.add(e);
		try {
			if (l) {
				const t = e.length;
				const r = new Array(t);
				for (let i = 0; i < t; i++) r[i] = n(e[i], String(i), false, o + 1) ?? null;
				return r;
			}
			const t = {};
			for (const i of Object.keys(e)) {
				const a = n(e[i], i, false, o + 1);
				if (a === void 0) continue;
				r(t, i, a);
			}
			return t;
		} finally {
			t.delete(e);
		}
	};
	if (e === void 0 || typeof e === "function" || typeof e === "symbol") return JSON.parse(JSON.stringify(e));
	return n(e, "", true);
}
//#endregion
//#region src/prefab/clone.ts
function j(e) {
	return e.map((e) => ({
		type: e.type,
		data: A(e.data)
	}));
}
function M(e) {
	return A(e);
}
function N(e) {
	return A(e);
}
//#endregion
//#region src/prefab/entityRef.ts
/**
* Apply @p one to an entity-ref field, which holds one ref or a LIST of them —
* `MeshSkin.joints` is a list, and a bare `typeof` test leaves those untouched.
* All three translation directions come through here, so none can disagree.
*/
function P(e, t) {
	return Array.isArray(e) ? e.map(t) : t(e);
}
/**
* Remap entity-typed component fields from prefab-local ids to runtime ids.
*
* The mapping is keyed by `PrefabEntityId` (string) → runtime entity (number),
* matching what flatten built. A component field whose value is a string —
* the authored prefab-local reference — gets resolved through the mapping;
* a numeric value is treated as already a runtime id (or zero/INVALID) and
* left alone, so partially-instantiated/mutated components round-trip.
*/
function F(e, t) {
	const n = (e) => {
		if (typeof e === "string") {
			const n = t.get(e);
			return n !== void 0 ? n : 0;
		}
		if (typeof e === "number" && e !== 0) {
			const n = t.get(e);
			if (n !== void 0) return n;
		}
		return e;
	};
	for (const t of e) {
		const e = s(t.type);
		if (!e || e.entityFields.length === 0) continue;
		for (const r of e.entityFields) t.data[r] = P(t.data[r], n);
	}
}
//#endregion
//#region src/prefab/override.ts
/**
* Group overrides by their target entity once so flatten can apply each
* entity's overrides in O(K) instead of O(N×M) per scene tree.
*/
function I(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e) {
		const e = t.get(n.prefabEntityId);
		if (e) e.push(n);
		else t.set(n.prefabEntityId, [n]);
	}
	return t;
}
function L(e, t) {
	if (!t || t.length === 0) return;
	for (const n of t) {
		if (n.prefabEntityId !== e.prefabEntityId) continue;
		switch (n.type) {
			case "property":
				if (n.componentType && n.propertyName !== void 0) {
					const t = e.components.find((e) => e.type === n.componentType);
					if (t) r(t.data, n.propertyName, M({ value: n.value }).value);
				}
				break;
			case "name":
				if (typeof n.value === "string") e.name = n.value;
				break;
			case "visibility":
				if (typeof n.value === "boolean") e.visible = n.value;
				break;
			case "component_added":
				if (n.componentData) {
					if (!e.components.some((e) => e.type === n.componentData.type)) e.components.push({
						type: n.componentData.type,
						data: M(n.componentData.data)
					});
				}
				break;
			case "component_replaced":
				if (n.componentData) {
					const t = n.componentData.type;
					const r = e.components.find((e) => e.type === t);
					if (r) r.data = M(n.componentData.data);
					else e.components.push({
						type: t,
						data: M(n.componentData.data)
					});
				}
				break;
			case "component_removed":
				if (n.componentType) e.components = e.components.filter((e) => e.type !== n.componentType);
				break;
			case "metadata_set":
				if (typeof n.metadataKey === "string") {
					if (!e.metadata) e.metadata = {};
					r(e.metadata, n.metadataKey, M({ value: n.value }).value);
				}
				break;
			case "metadata_removed": if (typeof n.metadataKey === "string" && e.metadata) {
				Reflect.deleteProperty(e.metadata, n.metadataKey);
				if (Object.keys(e.metadata).length === 0) delete e.metadata;
			}
		}
	}
}
/**
* Bake a set of overrides into a prefab's source, returning a NEW PrefabData with
* the changes applied as the base (entity identities preserved). This is the core
* of editor "Apply to Prefab": an instance's overrides (from {@link diffAgainstSource})
* become the prefab's new base, so every instance re-derives from them.
*
* Scope matches {@link diffAgainstSource}: property / name / visibility /
* component add·replace·remove / metadata overrides on existing prefab entities.
* Structural changes (entities the instance added or removed) are not folded in —
* the caller surfaces those separately. Pure: the input `source` is not mutated.
*/
function R(e, t) {
	const n = JSON.parse(JSON.stringify(e));
	if (t.length === 0) return n;
	const r = I(t);
	for (const e of n.entities) {
		const t = r.get(e.prefabEntityId);
		if (t) L(e, t);
	}
	return n;
}
//#endregion
//#region src/prefab/flatten.ts
const z = 10;
/** Prefix a nested entity's stable id with the slot it was mounted through. */
function B(e, t) {
	return `${e}${"/"}${t}`;
}
function V(e, t, n) {
	const r = n.depth ?? 0;
	if (r > z) throw new Error(`Prefab nesting depth exceeded ${z}. Check for deep or circular nesting in: ${e.name}`);
	if (e.basePrefab) return he(e, t, n, r);
	ge(e);
	const i = n.visited ?? /* @__PURE__ */ new Set();
	const a = /* @__PURE__ */ new Map();
	for (const t of e.entities) if (!t.nestedPrefab) a.set(t.prefabEntityId, n.allocateId());
	const o = [];
	const s = I(t);
	const c = [];
	const l = [];
	for (const u of e.entities) {
		if (u.nestedPrefab) {
			const e = u.nestedPrefab.prefabPath;
			if (i.has(e)) throw new Error(`[Prefab] Circular reference detected: "${e}" is already being instantiated in the current prefab chain`);
			const s = n.loadPrefab(e);
			if (!s) throw new Error(`Failed to load nested prefab: ${e}`);
			const d = u.prefabEntityId + "/";
			l.push(d);
			const f = t.filter((e) => e.prefabEntityId.startsWith(d)).map((e) => ({
				...e,
				prefabEntityId: e.prefabEntityId.slice(d.length)
			}));
			const p = f.length ? [...u.nestedPrefab.overrides, ...f] : u.nestedPrefab.overrides;
			i.add(e);
			const m = n.deferred !== void 0 && te(p, s) && (u.metadata?.["deferred"] === true || v(s, p));
			const h = m ? ne(s) : null;
			const g = V(h ?? s, h ? y(s, p) : p, {
				...n,
				visited: i,
				depth: r + 1,
				...m ? { deferred: void 0 } : {}
			});
			i.delete(e);
			if (m) {
				if (!h) g.entities = b(g.entities, g.rootId);
				g.unresolved = [];
				n.deferred.push({
					id: g.rootId,
					prefab: e,
					overrides: p.map((e) => ({ ...e }))
				});
			}
			for (const e of g.entities) e.prefabEntityId = B(u.prefabEntityId, e.prefabEntityId);
			for (const e of g.unresolved) c.push({
				...e,
				prefabEntityId: B(u.prefabEntityId, e.prefabEntityId)
			});
			a.set(u.prefabEntityId, g.rootId);
			const _ = g.entities.find((e) => e.id === g.rootId);
			if (_) _.parent = u.parent !== null ? a.get(u.parent) ?? null : null;
			o.push(...g.entities);
			continue;
		}
		const d = a.get(u.prefabEntityId);
		const f = u.prefabEntityId === e.rootEntityId;
		const p = {
			id: d,
			prefabEntityId: u.prefabEntityId,
			name: u.name,
			parent: f ? null : u.parent !== null ? a.get(u.parent) ?? null : null,
			children: [],
			components: j(u.components),
			visible: u.visible,
			...u.metadata ? { metadata: N(u.metadata) } : {}
		};
		L(p, s.get(u.prefabEntityId));
		F(p.components, a);
		o.push(p);
	}
	for (const e of t) {
		if (a.has(e.prefabEntityId)) continue;
		if (l.some((t) => e.prefabEntityId.startsWith(t))) continue;
		c.push(e);
	}
	const u = a.get(e.rootEntityId);
	if (u === void 0) throw new Error(`Failed to resolve prefab root entity "${e.rootEntityId}" in "${e.name}"`);
	const d = new Map(o.map((e) => [e.id, e]));
	for (const t of e.entities) {
		const n = a.get(t.prefabEntityId);
		if (n === void 0) continue;
		const r = d.get(n);
		if (!r) continue;
		r.parent = t.prefabEntityId === e.rootEntityId ? null : t.parent !== null ? a.get(t.parent) ?? null : null;
		const i = t.children.map((e) => a.get(e)).filter((e) => e !== void 0);
		if (!t.nestedPrefab) r.children = i;
		else if (i.length) {
			const e = new Set(r.children);
			for (const t of i) if (!e.has(t)) {
				e.add(t);
				r.children.push(t);
			}
		}
	}
	return {
		entities: o,
		rootId: u,
		unresolved: c
	};
}
/**
* Variants merge their own `entities` list onto the base before applying
* overrides. An entry whose `prefabEntityId` matches an entry in the base
* **replaces** that entry's authored data; an entry whose id is new gets
* **appended** as an additional child of the base. The variant's root
* identity must equal the base's root — variants extend, they do not
* relocate the root.
*/
function he(e, t, n, r) {
	const i = e.basePrefab;
	const a = n.visited ?? /* @__PURE__ */ new Set();
	if (a.has(i)) throw new Error(`[Prefab] Circular variant reference detected: "${i}" is already being instantiated in the current prefab chain`);
	const o = n.loadPrefab(i);
	if (!o) throw new Error(`Failed to load base prefab for variant: ${i}`);
	a.add(i);
	const s = V(U(o.basePrefab ? H(o, n, r + 1, a) : o, e), [...e.overrides ?? [], ...t], {
		...n,
		visited: a,
		depth: r + 1
	});
	a.delete(i);
	return s;
}
function H(e, t, n, r) {
	if (n > z) throw new Error(`Prefab variant chain exceeded depth ${z}; suspected circular inheritance ending at "${e.name}"`);
	const i = e.basePrefab;
	if (!i) return e;
	if (r.has(i)) throw new Error(`[Prefab] Circular variant reference detected: "${i}" is already being instantiated in the current prefab chain`);
	const a = t.loadPrefab(i);
	if (!a) throw new Error(`Failed to load base prefab for variant: ${i}`);
	r.add(i);
	const o = U(a.basePrefab ? H(a, t, n + 1, r) : a, e);
	r.delete(i);
	return o;
}
function U(e, t) {
	if (t.rootEntityId !== e.rootEntityId) throw new Error(`Variant "${t.name}" rootEntityId "${t.rootEntityId}" must match base "${e.name}" rootEntityId "${e.rootEntityId}". Variants extend the base; they do not relocate the root.`);
	const n = e.entities.map((e) => ({ ...e }));
	const r = /* @__PURE__ */ new Map();
	for (const e of n) r.set(e.prefabEntityId, e);
	const i = new Map(n.map((e, t) => [e.prefabEntityId, t]));
	const a = t.entities ?? [];
	for (const e of a) {
		if (r.get(e.prefabEntityId)) {
			const t = {
				...e,
				children: [...e.children],
				components: e.components.map((e) => ({
					type: e.type,
					data: { ...e.data }
				})),
				...e.metadata ? { metadata: { ...e.metadata } } : {}
			};
			const a = i.get(e.prefabEntityId);
			n[a] = t;
			r.set(e.prefabEntityId, t);
			continue;
		}
		if (e.parent === null) throw new Error(`Variant "${t.name}" entity "${e.prefabEntityId}" has parent=null but is not the root. Variant additions must attach to an existing entity from the base or another variant addition.`);
		const a = {
			...e,
			children: [...e.children],
			components: e.components.map((e) => ({
				type: e.type,
				data: { ...e.data }
			})),
			...e.metadata ? { metadata: { ...e.metadata } } : {}
		};
		i.set(e.prefabEntityId, n.length);
		n.push(a);
		r.set(e.prefabEntityId, a);
	}
	const o = new Set(e.entities.map((e) => e.prefabEntityId));
	const s = /* @__PURE__ */ new Map();
	for (const e of a) {
		if (!!o.has(e.prefabEntityId)) continue;
		const n = r.get(e.parent);
		if (!n) throw new Error(`Variant "${t.name}" entity "${e.prefabEntityId}" parent "${e.parent}" not found in base or other variant additions.`);
		let i = s.get(n.prefabEntityId);
		if (!i) {
			i = new Set(n.children);
			n.children = [...n.children];
			s.set(n.prefabEntityId, i);
		}
		if (!i.has(e.prefabEntityId)) {
			i.add(e.prefabEntityId);
			n.children.push(e.prefabEntityId);
		}
	}
	_e(n, t.name);
	return {
		version: e.version,
		name: t.name,
		rootEntityId: e.rootEntityId,
		entities: n
	};
}
function ge(e) {
	const t = /* @__PURE__ */ new Map();
	for (const n of e.entities) t.set(n.prefabEntityId, n);
	const n = T();
	for (const r of e.entities) {
		if (r.prefabEntityId.includes("/")) throw new Error(`Prefab "${e.name}" entity id "${r.prefabEntityId}" contains the reserved separator "${"/"}". Authored prefab entity ids must not contain it.`);
		if (r.parent !== null) {
			const i = t.get(r.parent);
			if (!i) throw new Error(`Prefab "${e.name}" entity "${r.prefabEntityId}" parent "${r.parent}" does not exist.`);
			if (!n(i.children, r.prefabEntityId)) throw new Error(`Prefab "${e.name}" inconsistent topology: entity "${r.prefabEntityId}" claims parent "${r.parent}" but the parent's children list does not contain it. children is the source of truth — fix by adding the child id there.`);
		}
		for (const n of r.children) {
			const i = t.get(n);
			if (!i) throw new Error(`Prefab "${e.name}" entity "${r.prefabEntityId}" lists child "${n}" which does not exist.`);
			if (i.parent !== r.prefabEntityId) throw new Error(`Prefab "${e.name}" inconsistent topology: entity "${r.prefabEntityId}" lists "${n}" as a child but the child's parent points elsewhere ("${i.parent ?? "null"}").`);
		}
	}
}
function _e(e, t) {
	const n = e.map((e) => ({
		id: e.prefabEntityId,
		parent: e.parent,
		children: e.children,
		components: e.components
	}));
	D(n, new Map(n.map((e) => [e.id, e])), (e, n, r) => {
		throw new Error(`Prefab "${t}" ${r}`);
	});
}
//#endregion
//#region src/prefab/collect.ts
function W(e, t, n) {
	const r = [];
	const i = n ?? /* @__PURE__ */ new Set();
	if (e.basePrefab && !i.has(e.basePrefab)) {
		i.add(e.basePrefab);
		r.push(e.basePrefab);
		const n = t(e.basePrefab);
		if (n) r.push(...W(n, t, i));
	}
	for (const n of e.entities) {
		if (!n.nestedPrefab) continue;
		const e = n.nestedPrefab.prefabPath;
		if (i.has(e)) continue;
		i.add(e);
		r.push(e);
		const a = t(e);
		if (a) r.push(...W(a, t, i));
	}
	return r;
}
const ve = 10;
async function G(e, t, n, r, i = 0) {
	if (i > ve) return;
	const a = r ?? /* @__PURE__ */ new Set();
	if (e.basePrefab && !a.has(e.basePrefab) && !n.has(e.basePrefab)) {
		a.add(e.basePrefab);
		const r = await t(e.basePrefab);
		n.set(e.basePrefab, r);
		await G(r, t, n, a, i + 1);
	}
	for (const r of e.entities) {
		if (!r.nestedPrefab) continue;
		const e = r.nestedPrefab.prefabPath;
		if (a.has(e) || n.has(e)) continue;
		a.add(e);
		const o = await t(e);
		n.set(e, o);
		await G(o, t, n, a, i + 1);
	}
}
//#endregion
//#region src/prefab/diff.ts
/**
* An entity-typed field on an instance holds a numeric runtime id; the source
* prefab stores the prefab-local string id. Translate the runtime id back to its
* prefab-local id (inverse of {@link remapComponentEntityRefs}) so an UNCHANGED
* intra-instance ref diffs equal — otherwise every such field produces a spurious
* override carrying a session-specific number that dangles on save+reload. A ref
* that points outside the instance (unmapped) stays numeric, best-effort.
*/
function ye(e, t) {
	return P(e, (e) => {
		if (typeof e === "number") {
			const n = t.get(e);
			if (n !== void 0) return n;
		}
		return e;
	});
}
/**
* Compute the minimal `PrefabOverride[]` that, applied to `source`, produces
* the `instance` state. The editor calls this on every change to an instance
* to keep `prefab:overrides` accurate.
*
* Contract:
*   applyOverrides(flattenPrefab(source, [], ctx), diffAgainstSource(source, instance))
*   reproduces `instance` modulo runtime id remapping.
*
* Current scope:
*   - Handles property / component_added / component_replaced / component_removed
*     / name / visibility / metadata_set / metadata_removed
*   - Handles instance entities that are NEW relative to source (reports them
*     via `untracked` — caller decides whether to surface as variant additions
*     or error)
*   - Does NOT yet emit "entity_removed" overrides (entity deletion from an
*     instance has no override type today); missing entities are reported via
*     `orphanedSourceIds`.
*/
function be(e, t, n) {
	return Se(e.entities, t, n);
}
/** Translate a parent link to stable-id space. Strings are already stable (raw
*  source); numbers map through the side's runtime→stable map (a target outside
*  the instance is unmapped → null). */
function xe(e, t) {
	if (e === null || e === void 0) return null;
	if (typeof e === "string") return e;
	return t.get(e) ?? null;
}
/**
* Diff an `instance` against a `baseline` (both keyed by the stable
* `prefabEntityId` — a composed `slot/localId` address once nesting is
* involved). Entity-ref component fields are normalised on BOTH sides to their
* own runtime-id→stable-id space, so an unchanged cross-reference diffs equal
* regardless of which side carries volatile runtime numbers.
*/
function Se(e, t, n) {
	const r = /* @__PURE__ */ new Map();
	for (const t of e) r.set(t.prefabEntityId, t);
	const i = /* @__PURE__ */ new Map();
	for (const e of t) i.set(e.prefabEntityId, e);
	const a = /* @__PURE__ */ new Map();
	for (const t of e) if (t.id !== void 0) a.set(t.id, t.prefabEntityId);
	const o = /* @__PURE__ */ new Map();
	for (const e of t) o.set(e.id, e.prefabEntityId);
	const s = new Set(n?.ignoreMetadataKeys ?? []);
	const c = new Set(n?.ignoreEntityNames ?? []);
	const l = n?.floatEpsilon ?? 0;
	const u = [];
	const d = [];
	const f = [];
	for (const e of t) {
		if (c.has(e.name)) continue;
		const t = r.get(e.prefabEntityId);
		if (!t) {
			d.push(e);
			continue;
		}
		if (e.name !== t.name) u.push({
			prefabEntityId: e.prefabEntityId,
			type: "name",
			value: e.name
		});
		if (e.visible !== t.visible) u.push({
			prefabEntityId: e.prefabEntityId,
			type: "visibility",
			value: e.visible
		});
		if (t.parent !== void 0) {
			const n = xe(t.parent, a);
			const r = xe(e.parent, o);
			if (n !== r) u.push({
				prefabEntityId: e.prefabEntityId,
				type: "parent",
				value: r
			});
		}
		Ce(t.metadata, e.metadata, s, e.prefabEntityId, u);
		we(t.components, e.components, e.prefabEntityId, l, u, a, o);
	}
	for (const [e] of r) if (!i.has(e)) f.push(e);
	return {
		overrides: u,
		untracked: d,
		orphanedSourceIds: f
	};
}
function Ce(e, t, n, r, i) {
	const a = e ?? {};
	const o = t ?? {};
	const s = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(o)]);
	for (const e of s) {
		if (n.has(e)) continue;
		const t = c(a, e);
		const s = c(o, e);
		if (s && !t) i.push({
			prefabEntityId: r,
			type: "metadata_set",
			metadataKey: e,
			value: o[e]
		});
		else if (!s && t) i.push({
			prefabEntityId: r,
			type: "metadata_removed",
			metadataKey: e
		});
		else if (s && t && !K(a[e], o[e])) i.push({
			prefabEntityId: r,
			type: "metadata_set",
			metadataKey: e,
			value: o[e]
		});
	}
}
function we(e, t, n, r, i, a, o) {
	const c = /* @__PURE__ */ new Map();
	for (const t of e) c.set(t.type, t);
	const l = /* @__PURE__ */ new Map();
	for (const e of t) l.set(e.type, e);
	for (const [e] of c) if (!l.has(e)) i.push({
		prefabEntityId: n,
		type: "component_removed",
		componentType: e
	});
	for (const [e, t] of l) {
		const l = c.get(e);
		if (!l) {
			i.push({
				prefabEntityId: n,
				type: "component_added",
				componentData: {
					type: e,
					data: Te(t.data)
				}
			});
			continue;
		}
		const u = new Set(s(e)?.entityFields ?? []);
		const d = /* @__PURE__ */ new Set([...Object.keys(l.data), ...Object.keys(t.data)]);
		for (const s of d) {
			if (!(s in t.data)) continue;
			const c = u.has(s) ? ye(l.data[s], a) : l.data[s];
			const d = u.has(s) ? ye(t.data[s], o) : t.data[s];
			if (!K(c, d, r)) i.push({
				prefabEntityId: n,
				type: "property",
				componentType: e,
				propertyName: s,
				value: Te(d)
			});
		}
	}
}
function K(e, t, n = 0) {
	if (e === t) return true;
	if (typeof e === "number" && typeof t === "number") {
		if (Number.isNaN(e) && Number.isNaN(t)) return true;
		return n > 0 ? Math.abs(e - t) <= n : false;
	}
	if (e === null || t === null || e === void 0 || t === void 0) return false;
	if (typeof e !== "object" || typeof t !== "object") return false;
	if (Array.isArray(e) !== Array.isArray(t)) return false;
	if (Array.isArray(e) && Array.isArray(t)) {
		if (e.length !== t.length) return false;
		for (let r = 0; r < e.length; r++) if (!K(e[r], t[r], n)) return false;
		return true;
	}
	const r = e;
	const i = t;
	const a = Object.keys(r);
	const o = Object.keys(i);
	if (a.length !== o.length) return false;
	for (const e of a) if (!c(i, e) || !K(r[e], i[e], n)) return false;
	return true;
}
function Te(e) {
	return JSON.parse(JSON.stringify(e));
}
//#endregion
//#region src/prefab/sceneInstance.ts
/**
* @file    sceneInstance.ts
* @brief   Prefab instance ⇄ scene-delta boundary (the canonical expand/collapse core)
*
* A prefab instance is persisted as a DELTA over its prefab asset and lives,
* once loaded, as EXPANDED ordinary entities. This module is the lossless
* boundary between the two, built on the engine's own prefab data layer
* (`flattenPrefab` / `diffAgainstSource`):
*
*   expand:   prefab asset + delta  →  flat instance entities
*   collapse: flat instance entities →  delta
*
* It is the SINGLE source for that transform — both the runtime scene loader
* (`scene.ts` `loadSceneWithAssets`, for `play == ship`) and the editor's
* model layer build on it, so the two never diverge.
*
* A `{prefab, overrides}` pair alone is NOT enough — `PrefabOverride` cannot
* express structural edits — so the delta also carries `added` (entities added
* under the instance) and `removed` (prefab children deleted in the instance),
* sourced from `diffAgainstSource`'s `untracked` / `orphanedSourceIds`. Both
* structural buckets reference entities by stable `prefabEntityId`, so the round
* trip survives the id reallocation that `flattenPrefab` performs.
*
* Pure data (no World / wasm) — unit-testable as the data-loss safety net.
*/
const q = () => null;
/**
* Expand a prefab asset + instance delta into flat instance entities, allocating
* ids via `allocateId`. Reuses `flattenPrefab` (which applies the overrides),
* drops `removed` prefab entities, and appends `added` entities re-linked by
* their stable parent id. `loadPrefab` resolves nested prefab refs (callers that
* know the prefab is flat may omit it).
*/
function Ee(e, t, n, r = q, i) {
	const { entities: a, rootId: o, unresolved: s } = V(e, t.overrides, {
		allocateId: n,
		loadPrefab: r,
		...i ? { deferred: i } : {}
	});
	De(a, t.overrides, o, false);
	const c = Oe(a, t.removed);
	const l = a.filter((e) => !c.has(e.prefabEntityId));
	const u = /* @__PURE__ */ new Map();
	for (const e of l) u.set(e.prefabEntityId, e.id);
	const d = t.added.map((e) => {
		const t = n();
		u.set(e.prefabEntityId, t);
		return {
			id: t,
			prefabEntityId: e.prefabEntityId,
			name: e.name,
			parent: o,
			children: [],
			components: j(e.components),
			visible: e.visible
		};
	});
	t.added.forEach((e, t) => {
		d[t].parent = e.parentId != null ? u.get(e.parentId) ?? o : o;
	});
	const f = [...l, ...d];
	De(f, t.overrides, o, true);
	J(f);
	return {
		entities: f,
		rootId: o,
		unresolved: s
	};
}
/**
* Apply structural `parent` overrides to flattened entities in place. Each moves
* a prefab-origin entity under the runtime id of its new stable parent (`value`),
* or under `rootId` when `value` is null. The instance root is never re-parented.
* When `fallbackToRoot` is false a target absent from `entities` leaves the entity
* where it is (a two-phase caller resolves added-entity targets in a later pass);
* when true, a missing target falls back to `rootId`.
*/
function De(e, t, n, r) {
	const i = /* @__PURE__ */ new Map();
	const a = /* @__PURE__ */ new Map();
	for (const t of e) {
		i.set(t.prefabEntityId, t.id);
		a.set(t.prefabEntityId, t);
	}
	for (const e of t) {
		if (e.type !== "parent") continue;
		const t = a.get(e.prefabEntityId);
		if (!t || t.id === n) continue;
		const o = e.value == null ? null : String(e.value);
		if (o === null) {
			t.parent = n;
			continue;
		}
		const s = i.get(o);
		if (s !== void 0) t.parent = s;
		else if (r) t.parent = n;
	}
}
/** Rebuild every entity's `children` array from its `parent` link (consistency). */
function J(e) {
	const t = new Map(e.map((e) => [e.id, e]));
	for (const t of e) t.children = [];
	for (const n of e) if (n.parent != null) t.get(n.parent)?.children.push(n.id);
}
/**
* The full set of stable ids to drop for a `removed` list of subtree roots:
* each root plus every descendant, walked over the flattened entities' parent
* links (in composed-address space, so it cascades through nested boundaries).
*/
function Oe(e, t) {
	const n = new Map(e.map((e) => [e.id, e.prefabEntityId]));
	const r = /* @__PURE__ */ new Map();
	for (const t of e) {
		if (t.parent == null) continue;
		const e = n.get(t.parent);
		if (e === void 0) continue;
		const i = r.get(e);
		if (i) i.push(t.prefabEntityId);
		else r.set(e, [t.prefabEntityId]);
	}
	const i = /* @__PURE__ */ new Set();
	const a = [...t];
	while (a.length > 0) {
		const e = a.shift();
		if (i.has(e)) continue;
		i.add(e);
		for (const t of r.get(e) ?? []) a.push(t);
	}
	return i;
}
/**
* Collapse expanded instance entities back to a delta. `diffAgainstSource`
* yields the override list + the structural buckets (`untracked` → added,
* `orphanedSourceIds` → removed), with added parents recorded by stable id.
*/
function Y(e, t, n, r = q) {
	const { entities: i, parentOf: a } = ke(e, r);
	const { overrides: o, untracked: s, orphanedSourceIds: c } = Se(i, n);
	const l = new Map(n.map((e) => [e.id, e]));
	const u = s.map((e) => ({
		prefabEntityId: e.prefabEntityId,
		name: e.name,
		components: e.components,
		visible: e.visible,
		parentId: e.parent != null ? l.get(e.parent)?.prefabEntityId ?? null : null
	}));
	const d = new Set(c);
	return {
		prefab: t,
		overrides: o,
		added: u,
		removed: c.filter((e) => {
			const t = a.get(e);
			return t == null || !d.has(t);
		})
	};
}
/**
* The pristine baseline to diff a collapsed instance against, plus each baseline
* entity's parent (in stable-id space) for subtree-root minimisation. A FLAT
* prefab's own `entities` list already IS that baseline (entity refs in
* prefab-local id space); a nested prefab is flattened so its children exist in
* composed-address space — `loadPrefab` resolves the nested refs synchronously,
* so callers with nested prefabs must preload them.
*/
function ke(e, t) {
	if (!(!!e.basePrefab || e.entities.some((e) => e.nestedPrefab))) {
		const t = /* @__PURE__ */ new Map();
		for (const n of e.entities) t.set(n.prefabEntityId, n.parent);
		return {
			entities: e.entities,
			parentOf: t
		};
	}
	let n = 0;
	const r = V(e, [], {
		allocateId: () => n++,
		loadPrefab: t
	}).entities;
	const i = new Map(r.map((e) => [e.id, e.prefabEntityId]));
	const a = /* @__PURE__ */ new Map();
	for (const e of r) a.set(e.prefabEntityId, e.parent != null ? i.get(e.parent) ?? null : null);
	return {
		entities: r,
		parentOf: a
	};
}
/**
* Expand a scene instance entry into flat entities: flatten the asset + delta,
* pin the instance root to the entry's stable `id` (re-allocating only the
* internal entities), and attach the root under the entry's scene `parent`.
*/
function Ae(e, t, n, r = q, i) {
	const { entities: a, rootId: o, unresolved: s } = Ee(e, t, n, r, i);
	for (const e of a) {
		if (e.id === o) e.id = t.id;
		if (e.parent === o) e.parent = t.id;
	}
	const c = a.find((e) => e.id === t.id);
	if (c) c.parent = t.parent;
	J(a);
	return {
		entities: a,
		rootId: t.id,
		unresolved: s
	};
}
/**
* Collapse an expanded instance subtree (root `rootId`, attached under
* `sceneParent`) back to a scene entry — the inverse of {@link expandEntry}.
*/
function je(e, t, n, r, i, a = q) {
	return {
		id: r,
		parent: i,
		...Y(e, t, n, a)
	};
}
/**
* Bake a complete instance delta into a prefab's source — the STRUCTURAL
* "Apply to Prefab". `applyOverridesToSource` only folds property/component/
* name/visibility/metadata edits; this also inserts `added` entities (linked
* under their parent) and deletes `removed` subtree roots and their descendants
* (never the prefab root), so an instance's structural changes truly enter the
* asset. Pure: `source` is not mutated. Nested-scoped ids (composed `slot/…`
* addresses) that don't exist on this source are skipped — structural apply
* targets the top-level asset.
*/
function Me(e, t) {
	const n = t.overrides.filter((e) => !Ne(e));
	let r = R(e, n);
	const i = n.filter((e) => e.type === "parent");
	if (i.length > 0) {
		const e = r.entities.map((e) => ({
			...e,
			children: [...e.children]
		}));
		const t = /* @__PURE__ */ new Map();
		for (const n of e) t.set(n.prefabEntityId, n);
		for (const e of i) {
			const n = t.get(e.prefabEntityId);
			if (!n || n.prefabEntityId === r.rootEntityId) continue;
			const i = e.value == null ? r.rootEntityId : String(e.value);
			const a = t.get(i);
			if (!a || i === n.prefabEntityId) continue;
			if (Pe(t, n.prefabEntityId, i)) continue;
			if (n.parent != null) {
				const e = t.get(n.parent);
				if (e) e.children = e.children.filter((e) => e !== n.prefabEntityId);
			}
			n.parent = i;
			if (!a.children.includes(n.prefabEntityId)) a.children.push(n.prefabEntityId);
		}
		r = {
			...r,
			entities: e
		};
	}
	if (t.removed.length > 0) {
		const e = /* @__PURE__ */ new Map();
		for (const t of r.entities) e.set(t.prefabEntityId, t.children);
		const n = /* @__PURE__ */ new Set();
		const i = t.removed.filter((e) => e !== r.rootEntityId);
		while (i.length > 0) {
			const t = i.shift();
			if (n.has(t)) continue;
			n.add(t);
			for (const n of e.get(t) ?? []) i.push(n);
		}
		if (n.size > 0) r = {
			...r,
			entities: r.entities.filter((e) => !n.has(e.prefabEntityId)).map((e) => ({
				...e,
				children: e.children.filter((e) => !n.has(e))
			}))
		};
	}
	if (t.added.length > 0) {
		const e = r.entities.map((e) => ({
			...e,
			children: [...e.children]
		}));
		const n = /* @__PURE__ */ new Map();
		for (const t of e) n.set(t.prefabEntityId, t);
		for (const i of t.added) {
			if (n.has(i.prefabEntityId)) continue;
			const t = {
				prefabEntityId: i.prefabEntityId,
				name: i.name,
				parent: i.parentId ?? r.rootEntityId,
				children: [],
				components: j([...i.components]),
				visible: i.visible
			};
			e.push(t);
			n.set(i.prefabEntityId, t);
		}
		for (const e of t.added) {
			const t = n.get(e.parentId ?? r.rootEntityId);
			if (t && !t.children.includes(e.prefabEntityId)) t.children.push(e.prefabEntityId);
		}
		r = {
			...r,
			entities: e
		};
	}
	return r;
}
/** True for a `property` override on an entity-ref field whose value is a raw
*  runtime id — an ExposeRef binding to something outside the instance. Such a
*  binding is per-instance and must not be baked into the shared prefab source. */
function Ne(e) {
	if (e.type !== "property" || !e.componentType || e.propertyName === void 0) return false;
	const t = s(e.componentType);
	if (!t || !t.entityFields.includes(e.propertyName)) return false;
	return typeof e.value === "number" && e.value !== 0;
}
/** Walk `node`'s parent chain in a stable-id entity map; true if `ancestor` is on
*  it (so re-parenting `ancestor` under `node` would create a cycle). */
function Pe(e, t, n) {
	let r = n;
	const i = /* @__PURE__ */ new Set();
	while (r != null && !i.has(r)) {
		if (r === t) return true;
		i.add(r);
		r = e.get(r)?.parent ?? null;
	}
	return false;
}
/**
* Build a prefab VARIANT that inherits `baseRef` and bakes an instance delta as
* the variant's own authored state — the authoring inverse of instantiating a
* variant, and the sibling of {@link applyDeltaToSource} (which bakes INTO the
* base instead of layering a new variant on top). Property / component / name /
* visibility overrides become the variant's `overrides`; entities the instance
* ADDED become variant `entities` (appended onto the base by
* `mergeVariantEntities`, which links them into their parent's children on
* flatten). The variant's rootEntityId mirrors the base — variants EXTEND their
* base, they never relocate the root.
*
* A variant cannot DELETE a base entity (merge only replaces / appends), so
* `delta.removed` is not representable and is ignored here; a caller that must
* surface dropped removals should inspect it first. Pure: neither `base` nor
* `delta` is mutated.
*/
function Fe(e, t, n, r) {
	const i = r.added.map((t) => ({
		prefabEntityId: t.prefabEntityId,
		name: t.name,
		parent: t.parentId ?? e.rootEntityId,
		children: [],
		components: j([...t.components]),
		visible: t.visible
	}));
	return {
		version: e.version,
		name: n,
		rootEntityId: e.rootEntityId,
		basePrefab: t,
		entities: i,
		...r.overrides.length ? { overrides: r.overrides.map((e) => ({ ...e })) } : {}
	};
}
/**
* Build a fresh {@link PrefabData} from a live entity subtree (the inverse of
* instantiation — "Create Prefab from selection"). Source ids are remapped to
* stable string `prefabEntityId`s (root first → rootEntityId), parent/child
* links are remapped within the subtree (the root detaches → parent null), and
* components are deep-cloned so the asset owns its own data. Emits the current
* prefab format, so no migration runs on load.
*
* Component fields that REFERENCE another entity (declared via the component's
* `entityFields` metadata) are remapped to prefab-local ids when the target is
* inside the subtree; instantiation maps them back (see remapComponentEntityRefs).
* A reference pointing OUTSIDE the subtree cannot be expressed in the prefab, so
* it is CLEARED (set to `INVALID_ENTITY`) rather than left as a runtime number
* that would dangle onto an unrelated entity when the prefab is instantiated
* elsewhere. Call {@link collectExternalEntityRefs} first to warn the user which
* refs will be dropped.
*/
/** Capture-side twin of remapComponentEntityRefs: runtime id → prefab-local id. */
function Ie(e, t) {
	const n = (e) => {
		if (typeof e !== "number") return e;
		if (t.has(e)) return t.get(e);
		return e !== 0 ? 0 : e;
	};
	for (const t of e) {
		const e = s(t.type);
		if (!e || e.entityFields.length === 0) continue;
		for (const r of e.entityFields) t.data[r] = P(t.data[r], n);
	}
	return e;
}
/**
* List the entity-ref fields in a subtree that point OUTSIDE it — the refs that
* {@link extractPrefab} will clear. The editor calls this before "Create Prefab"
* to warn the user (or let them cancel) rather than silently dropping links.
*/
function Le(e) {
	const t = new Set(e.map((e) => e.id));
	const n = [];
	for (const r of e) for (const e of r.components) {
		const i = s(e.type);
		if (!i || i.entityFields.length === 0) continue;
		for (const a of i.entityFields) {
			const i = e.data[a];
			if (typeof i === "number" && i !== 0 && !t.has(i)) n.push({
				entityId: r.id,
				componentType: e.type,
				field: a,
				target: i
			});
		}
	}
	return n;
}
function Re(e, t, n, r = () => crypto.randomUUID()) {
	const i = [...e].sort((e, n) => e.id === t ? -1 : n.id === t ? 1 : 0);
	const a = /* @__PURE__ */ new Map();
	i.forEach((e) => a.set(e.id, r(e.id)));
	const o = (e) => e != null && a.has(e);
	const s = i.map((e) => ({
		prefabEntityId: a.get(e.id),
		name: e.name,
		parent: e.id === t ? null : o(e.parent) ? a.get(e.parent) : null,
		children: e.children.filter((e) => a.has(e)).map((e) => a.get(e)),
		components: Ie(j(e.components), a),
		visible: e.visible ?? true
	}));
	return {
		version: "2",
		name: n,
		rootEntityId: a.get(t),
		entities: s
	};
}
//#endregion
//#region src/scene/scene.ts
var ze = class extends Error {
	constructor(e) {
		super(`Scene load aborted: ${e.length} asset(s) missing`);
		this.name = "MissingAssetsError";
		this.missing = e;
	}
};
function Be(e) {
	const t = s(e);
	if (!t) return [];
	const n = [];
	for (const { field: e } of t.assetFields) n.push(e);
	if (t.skeletalFields) {
		n.push(t.skeletalFields.skeletonField);
		n.push(t.skeletalFields.atlasField);
	}
	return n;
}
function Ve(e) {
	return s(e)?.assetFields ?? [];
}
/** The skeleton/atlas pair a component carries, and whose runtime it belongs to. */
function He(e) {
	return s(e)?.skeletalFields ?? null;
}
/**
* Resolve a document's entity references to live entities.
*
* `external` answers for authored ids that live in ANOTHER document — the rows a
* streamed cell is allowed to name in the persistent world. An id neither map
* knows is cleared, never left as a number that names a different entity.
*/
function Ue(e, t, n) {
	const r = s(e.type);
	if (!r || r.entityFields.length === 0) return;
	const i = e.data;
	const a = (r) => {
		if (typeof r !== "number" || r === 0) return r;
		const i = t.get(r) ?? n?.get(r);
		if (i === void 0) u.warn("scene", `Entity reference not found: ${e.type}.${o} references entity ${r} which does not exist`);
		return i !== void 0 ? i : 0;
	};
	let o = "";
	for (o of r.entityFields) {
		const e = i[o];
		i[o] = Array.isArray(e) ? e.map(a) : a(e);
	}
}
const X = /* @__PURE__ */ new Map();
const Z = /* @__PURE__ */ new WeakMap();
/** @internal A world's component codecs take precedence over host defaults. */
function We(e, t, n) {
	let r = Z.get(e);
	if (!r) Z.set(e, r = /* @__PURE__ */ new Map());
	r.set(t, n);
	return () => {
		if (r.get(t) === n) r.delete(t);
		if (r.size === 0) Z.delete(e);
	};
}
const Q = /* @__PURE__ */ new WeakMap();
/** @internal */
function Ge(e, t) {
	let n = Q.get(e);
	if (!n) Q.set(e, n = /* @__PURE__ */ new Set());
	n.add(t);
	return () => {
		n.delete(t);
		if (n.size === 0) Q.delete(e);
	};
}
function Ke(e, t) {
	return Z.get(e)?.get(t) ?? X.get(t);
}
/** Register a custom (de)serializer for a component type. Idempotent. */
function qe(e, t) {
	X.set(e, t);
}
/**
* What a component carries beside its fields — a MeshRenderer's inline `geometry`:
* saved with the scene by its codec, but no field, so no inspector or set_field
* reaches it. Empty for a component without such data.
*/
function Je(e) {
	return X.get(e)?.outOfBandFields ?? Ye.get(e) ?? [];
}
const Ye = /* @__PURE__ */ new Map();
/**
* @internal Say which data a component carries beside its fields before its codec
* is installed (codecs install with their plugin, which a tool asking about a
* component may never build).
*/
function Xe(e, t) {
	Ye.set(e, t);
}
/** True if any scene entry is a prefab instance (cheap gate before expansion). */
function Ze(e) {
	return e.entities.some(g);
}
const Qe = (e) => ({
	id: e.id,
	name: e.name,
	parent: e.parent,
	children: e.children,
	components: e.components,
	visible: e.visible
});
/**
* Expand every prefab-instance entry in a scene into ordinary entity records,
* leaving non-prefab entities untouched. Each instance is flattened via
* `expandEntry` (the shared prefab core) with its nested prefabs preloaded, so
* the result is a plain SceneData ready for migration + spawn. Async because
* resolving prefab (and nested-prefab) assets is async; an unresolvable prefab
* drops that one instance with a warning rather than aborting the whole scene.
*/
async function $e(e, t, n) {
	const r = n?.expandVirtual ?? S();
	const i = e.entities;
	let a = 0;
	for (const e of i) a = Math.max(a, e.id);
	const o = () => ++a;
	const s = [];
	const c = [];
	for (const e of i) {
		if (!g(e)) {
			s.push(e);
			continue;
		}
		if (r && e.overrides.some((e) => e.type === "metadata_set" && e.metadataKey === "variant")) continue;
		const n = await t(e.prefab);
		if (!n) {
			u.warn("scene", `Prefab instance "${e.prefab}" could not be resolved; instance skipped`);
			continue;
		}
		const i = m(n).data;
		const a = /* @__PURE__ */ new Map();
		try {
			await G(i, async (e) => {
				const n = await t(e);
				if (!n) throw new Error(`nested prefab "${e}" not found`);
				return m(n).data;
			}, a);
		} catch (t) {
			u.warn("scene", `Prefab instance "${e.prefab}" has an unresolved nested prefab; instance skipped (${t})`);
			continue;
		}
		const l = !r && v(i, e.overrides) && te(e.overrides, i) && e.added.length === 0 && e.removed.length === 0;
		const d = l ? ne(i) : null;
		const { entities: f, unresolved: p } = Ae(d ?? i, d ? {
			...e,
			overrides: y(i, e.overrides)
		} : e, o, (e) => a.get(e) ?? null, r ? void 0 : c);
		const h = l && !d ? b(f, e.id) : f;
		const _ = l ? [] : p;
		if (l) c.push({
			id: e.id,
			prefab: e.prefab,
			overrides: e.overrides.map((e) => ({ ...e }))
		});
		if (_.length > 0) {
			const t = [...new Set(_.map((e) => e.prefabEntityId))].join(", ");
			u.warn("scene", `Prefab instance "${e.prefab}" (entity ${e.id}) overrides ${_.length} thing(s) on ${t}, which the prefab has no entity for; those overrides change nothing`);
		}
		for (const e of h) s.push(Qe(e));
	}
	return c.length > 0 ? {
		...e,
		entities: s,
		deferredInstances: c
	} : {
		...e,
		entities: s
	};
}
/**
* Current scene format version — bump by one per migration step below.
*
* An integer, not semver: this number only has to answer "older, current, or
* newer", and dotted ones cannot. `parseFloat` sorts "1.10" below "1.2".
*
* 2: `Light2D` and `Mesh2D` renamed to `Light` and `MeshRenderer`. An engine
*    from before the rename reads the new names as components it has never
*    heard of and drops them, which is a scene that loads and has no lights —
*    so it must refuse the file instead, and the version is what tells it to.
* 3: the flat physics components took the `2D` suffix the 3D ones already had
*    (`RigidBody` → `RigidBody2D`, the four colliders, `CharacterController`).
*    Same reasoning as 2, and worse here: an older engine drops the bodies and
*    loads a level whose floor nothing collides with.
* 4: the flat joints took the 3D set's words, which are also the industry's
*    (`RevoluteJoint2D` → `HingeJoint2D`, prismatic → slider, weld → fixed).
*    Same reasoning again: dropped joints load a machine whose parts fall apart.
*/
const et = 4;
/**
* The format version of a scene, however it was written. Everything from before
* the integer scheme is format 1, so its leading digits are the whole answer.
* Unreadable reads as 1, not 0: a scene with no version predates having one.
*/
function tt(e) {
	if (typeof e === "number") return Number.isInteger(e) && e > 0 ? e : 1;
	if (typeof e === "string") {
		const t = /^\s*(\d+)/.exec(e);
		if (t) return Math.max(1, Number(t[1]));
	}
	return 1;
}
/**
* Upgrade a SceneData to the current format. Total + idempotent: already-current
* data returns `migrated: false`; migrations are shape-driven so they no-op on
* current scenes. Rejects data newer than this engine. Returns a deep copy, so
* loading never mutates the caller's object (snapshots can be reloaded).
*/
function $(e) {
	const t = nt(e);
	return rt(JSON.parse(JSON.stringify(e)), t);
}
function nt(e) {
	if (!e || typeof e !== "object" || !Array.isArray(e.entities)) throw new Error("Scene data must have an \"entities\" array");
	const t = tt(e.version);
	if (t > 4) throw new Error(`Scene format version ${t} is newer than this engine supports (${4}); upgrade the engine to load it.`);
	return t;
}
function rt(e, t = nt(e)) {
	let n = false;
	const r = /* @__PURE__ */ new Set();
	for (const t of e.entities) {
		if (g(t)) continue;
		if (p(t, r)) n = true;
	}
	e.version = 4;
	return {
		data: e,
		migrated: n,
		retired: [...r],
		fromVersion: t,
		toVersion: 4
	};
}
/**
* Findings that make a scene mean something other than what it says, where
* loading is worse than refusing: a repeated id sends every reference to it to
* whichever entity came last, and a parent cycle has no hierarchy to build.
* Everything else still loads — a lost parent leaves an entity at the root.
*/
const it = /* @__PURE__ */ new Set(["duplicate-id", "parent-cycle"]);
/** Refuse a scene the loader cannot honour; report the rest and carry on. */
function at(e) {
	const t = ce(e);
	if (t.length === 0) return;
	const n = t.filter((e) => it.has(e.code));
	for (const e of t) if (!n.includes(e)) u.warn("scene", `${e.code}: ${e.message}`);
	if (n.length > 0) throw new Error(`Scene "${e.name}" cannot be loaded as written:\n` + n.map((e) => `  ${e.code}: ${e.message}`).join("\n"));
}
function ot(e, t, n, r) {
	let i = r ? performance.now() : 0;
	const a = () => {
		const e = performance.now();
		const t = e - i;
		i = e;
		return t;
	};
	at(t);
	if (r) r("spawn.validate", a());
	const o = /* @__PURE__ */ new Map();
	try {
		for (const n of t.entities) {
			if (n.visible === false) continue;
			if (g(n)) {
				u.warn("scene", "Prefab-instance entry skipped in synchronous load; use loadSceneWithAssets to load prefab scenes");
				continue;
			}
			const t = e.spawn();
			o.set(n.id, t);
			e.insert(t, l, { value: n.name });
		}
		if (r) r("spawn.entities", a());
		const i = r ? /* @__PURE__ */ new Map() : null;
		for (const r of t.entities) {
			if (r.visible === false) continue;
			if (g(r)) continue;
			const t = o.get(r.id);
			for (const s of r.components) {
				Ue(s, o, n);
				mt(e, t, s, r.name);
				if (i) i.set(s.type, (i.get(s.type) ?? 0) + a());
			}
		}
		if (r && i) {
			let e = 0;
			for (const [t, n] of i) {
				e += n;
				r(`spawn.components.${t}`, n);
			}
			r("spawn.components", e);
		}
		for (const n of t.entities) if (n.parent !== null) {
			const t = o.get(n.id);
			const r = o.get(n.parent);
			if (t !== void 0 && r !== void 0) e.setParent(t, r);
		}
		if (r) r("spawn.hierarchy", a());
	} catch (t) {
		for (const t of o.values()) try {
			e.despawn(t);
		} catch {}
		throw t;
	}
	return o;
}
function st(e, t, n, r) {
	const i = r ? performance.now() : 0;
	const { data: a } = $(t);
	if (r) r("spawn.migrate", performance.now() - i);
	return ot(e, a, n, r);
}
/**
* Reset the world to a previously-captured scene: despawn every current entity,
* then reload `sceneData`. Used for editor play-state isolation (snapshot before
* Play via {@link serializeScene}, restore on Stop), level restart, etc. Because
* {@link loadSceneData} no longer mutates its input, the same snapshot can be
* restored repeatedly. Entity ids change; the returned map is
* snapshot-id → new entity for callers that need to remap references/selection.
*/
function ct(e, t) {
	for (const t of e.getAllEntities()) if (e.valid(t)) e.despawn(t);
	return st(e, t);
}
async function lt(e, t, n) {
	const r = dt(n?.onPhase);
	let i = t;
	if (n?.assets && Ze(i)) {
		const e = n.assets;
		const t = new O();
		try {
			i = await r("prefab", () => $e(i, async (n) => {
				try {
					return t.add(await e.acquireTyped("prefab", n)).value.data ?? null;
				} catch (e) {
					u.warn("scene", `Failed to load prefab "${n}": ${e}`);
					return null;
				}
			}));
		} finally {
			t.releaseAll();
		}
	}
	const { data: a } = $(i);
	const o = i.deferredInstances;
	const s = await ft(e, a, n, r);
	C(e, o, s);
	return s;
}
/**
* Consume fresh private scene records from an internal builder. The builder must
* have copied every mutable component and override value before handing them
* over. Validation, migrations, asset resolution and spawning are shared with
* the public scene loader; only its caller-protection copy is already paid.
* @internal
*/
async function ut(e, t, n) {
	const r = dt(n?.onPhase);
	const { data: i } = rt(t);
	return ft(e, i, n, r);
}
function dt(e) {
	return async (t, n) => {
		if (!e) return n();
		const r = performance.now();
		try {
			return await n();
		} finally {
			e(t, performance.now() - r);
		}
	};
}
async function ft(e, t, n, r) {
	let i;
	let a;
	let o;
	try {
		if (n?.assets) {
			const e = n.assets;
			const o = await r("assets", () => e.preloadSceneAssets(t, n.onProgress));
			if (!n.collectAssets && e.entityScopes) {
				a = () => o.scope.releaseAll();
				i = k(t, o, e.entityScopes, e.resolveRef.bind(e))?.();
			}
			if (n.onMissingAssets) n.onMissingAssets(o.missing);
			if (n.abortOnMissingAssets && o.missing.length > 0) throw new ze(o.missing);
			e.resolveSceneAssetPaths(t, o);
			pt(t, o.textureHandles);
			if (n.collectAssets) {
				n.collectAssets.scope?.absorb(o.scope);
				for (const e of o.materialHandles.values()) if (e) n.collectAssets.materialHandles.add(e);
			}
		}
		const s = await r("spawn", () => {
			o = ot(e, t, n?.externalEntities, n?.onPhase);
			return o;
		});
		i?.attach(e, s);
		n?.assets?.trackSceneAssetReferences(t, s);
		return s;
	} catch (t) {
		if (o) for (const t of o.values()) try {
			if (e.valid(t)) e.despawn(t);
		} catch {}
		throw t;
	} finally {
		i?.release();
		a?.();
	}
}
function pt(e, t) {
	if (!e.textureMetadata) return;
	const n = f();
	for (const [r, i] of Object.entries(e.textureMetadata)) {
		const e = t.get(r);
		if (e && i.sliceBorder) {
			const t = i.sliceBorder;
			n.setTextureMetadata(e, t.left, t.right, t.top, t.bottom);
		}
	}
}
function mt(e, r, i, a) {
	const o = s(i.type);
	if (!o) {
		const e = a ? ` on entity "${a}"` : "";
		u.warn("scene", `Unknown component type: ${i.type}${e}`);
		return;
	}
	const c = Ke(e, i.type);
	let l;
	if (c?.outOfBandFields?.length) {
		for (const e of c.outOfBandFields) if (e in i.data) {
			(l ??= {})[e] = i.data[e];
			delete i.data[e];
		}
	}
	const d = a ? ` (entity "${a}")` : "";
	const f = t(i.type, o._default, i.data, o.assetFields);
	if (f.length > 0) {
		for (const e of f) {
			const t = e.field in i.data ? e.field : e.field.split(".")[0];
			delete i.data[t];
		}
		(i.type.startsWith("Cocos.") && f.every((e) => e.actual === "unknown field") ? u.debug : u.warn).call(u, "scene", `${n(i.type + d, f)}\n  → invalid fields dropped, their defaults apply (fix the scene file to silence this)`);
	}
	try {
		e.insert(r, o, i.data);
	} catch (e) {
		u.error("scene", `component "${i.type}"${d} failed to insert — skipped: ${e instanceof Error ? e.message : String(e)}`);
		return;
	}
	if (c?.importData && l) c.importData(r, l);
}
const ht = /* @__PURE__ */ new Set([
	"Name",
	"Parent",
	"Children",
	"WorldTransform"
]);
/**
* One entity's serializable component payloads — the per-entity primitive
* serializeScene is built from, also the spawn-replication payload (RC11):
* skips structural + transient components, folds out-of-band codec state in.
* Round-trips through {@link loadComponent}.
*/
function gt(e, t) {
	const n = t;
	const r = [];
	for (const i of e.getComponentTypes(t)) {
		if (ht.has(i)) continue;
		const a = s(i);
		if (!a) continue;
		if (a.transient) continue;
		const c = e.tryGet(t, a);
		if (c === null) continue;
		const l = a._builtin ? c : o(c);
		Ke(e, i)?.exportData?.(n, l);
		for (const n of Q.get(e) ?? []) n(t, i, l);
		r.push({
			type: i,
			data: l
		});
	}
	return r;
}
/**
* Walks the live world and produces a SceneData that round-trips through
* loadSceneData. Editors call this on save; external tools (prefab extract,
* diff, CLI export) can reuse the same primitive.
*
* Parent/child links are collapsed into the entity record's parent+children
* fields; the Parent and Children components themselves are omitted from
* the components array so loadSceneData's setParent pass is the single
* source of truth for hierarchy.
*/
function _t(t, n = "scene") {
	const r = s("Parent");
	const i = t.getAllEntities().filter((n) => !t.has(n, e));
	const a = /* @__PURE__ */ new Map();
	if (r) for (const e of i) {
		const n = t.tryGet(e, r);
		if (n && n.entity !== void 0) a.set(e, n.entity);
	}
	const o = /* @__PURE__ */ new Map();
	for (const [e, t] of a) {
		let n = o.get(t);
		if (!n) {
			n = [];
			o.set(t, n);
		}
		n.push(e);
	}
	const c = [];
	for (const e of i) {
		const n = e;
		const r = t.tryGet(e, l)?.value ?? `Entity_${n}`;
		const i = gt(t, e);
		c.push({
			id: n,
			name: r,
			parent: a.get(n) ?? null,
			children: o.get(n) ?? [],
			components: i
		});
	}
	return {
		version: 4,
		name: n,
		generator: me,
		entities: c
	};
}
function vt(e, t) {
	const n = e.getEntitiesWithComponents([i]);
	for (const r of n) {
		const n = e.get(r, i);
		if (n) {
			n.aspectRatio = t;
			e.insert(r, i, n);
		}
	}
}
function yt(e, t) {
	return e.findEntityByName(t);
}
//#endregion
export { ie as $, Re as A, M as B, Me as C, Le as D, Y as E, V as F, de as G, N as H, L as I, ce as J, O as K, R as L, be as M, W as N, Ae as O, G as P, D as Q, I as R, vt as S, je as T, k as U, j as V, fe as W, ae as X, E as Y, oe as Z, Ue as _, yt as a, Je as b, He as c, st as d, re as et, lt as f, Ge as g, We as h, $e as i, J as j, Ee as k, mt as l, qe as m, et as n, C as nt, Ve as o, $ as p, ue as q, Xe as r, g as rt, Be as s, ze as t, S as tt, ut as u, ct as v, Fe as w, _t as x, Ze as y, F as z };

//# sourceMappingURL=scene.js.map