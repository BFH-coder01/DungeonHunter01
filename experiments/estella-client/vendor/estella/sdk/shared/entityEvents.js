import { s as e } from "./resource.js";
import { s as t } from "./logger.js";
//#region src/ecs/entityEvents.ts
/**
* @file    entityEvents.ts
* @brief   EntityEventQueue — the entity-scoped, string-named event channel.
*
* The engine has two event channels and they answer different questions.
* `event.ts` is the GLOBAL, statically-typed bus: `defineEvent<T>()` gives a
* symbol-keyed, double-buffered stream that systems read as a batch ("all
* damage events this frame"). This file is the per-ENTITY one: an open string
* key ("click", "trigger_enter") dispatched synchronously to handlers
* subscribed for that entity, with bubbling to ancestors. It is what "this
* button was clicked" means, and it is the channel {@link EventBinding} wires
* authored data onto.
*
* It grew up inside `ui/` (as UIEventQueue) because widgets were its first
* producer, but nothing in it is UI-specific — the type strings are open and
* the queue never looks at a component. It lives here so non-UI producers and
* the core binding layer can speak it without importing `ui/`. The `ui/core/
* events.ts` names remain as aliases of these very objects.
*/
/**
* The event objects handed to handlers.
*
* A class rather than an object literal because the literal's two methods were
* fresh closures on every emit. Under a JIT that costs nothing; on the
* interpreter a device runs, a busy frame (physics republishes every contact to
* both participants) allocated them by the tens of thousands and threw them
* straight away. On the prototype they are allocated once.
*/
var n = class {
	constructor(e, t, n, r) {
		this.type = e;
		this.target = t;
		this.currentTarget = n;
		this.data = r;
		this.propagationStopped = false;
		this.defaultPrevented = false;
	}
	stopPropagation() {
		this.propagationStopped = true;
	}
	preventDefault() {
		this.defaultPrevented = true;
	}
};
/**
* A bubbled copy, which shares its propagation state with the event that
* started the walk — stopping it stops the root, so the caller's walk halts.
*/
var r = class extends n {
	constructor(e, t, n, r, i) {
		super(e, t, n, r);
		this.root_ = i;
		this.defaultPrevented = i.defaultPrevented;
	}
	stopPropagation() {
		this.propagationStopped = true;
		this.root_.propagationStopped = true;
	}
	preventDefault() {
		this.defaultPrevented = true;
		this.root_.defaultPrevented = true;
	}
};
/**
* Entity event queue: pub/sub with bubbling support.
*
* @example
* ```ts
* const events = new EntityEventQueue();
* world.onDespawn(e => events.removeAll(e));   // one-time wiring
*
* events.on(buttonEntity, 'click', e => console.log('clicked'));
* events.emit(buttonEntity, 'click');
* ```
*/
var i = class {
	constructor() {
		this.entityHandlers_ = /* @__PURE__ */ new Map();
		this.globalHandlers_ = /* @__PURE__ */ new Map();
		this.typeCounts_ = /* @__PURE__ */ new Map();
		this.pending_ = [];
		this.activeKeys_ = /* @__PURE__ */ new Set();
		this.observers_ = /* @__PURE__ */ new Set();
		this.eventIds_ = /* @__PURE__ */ new WeakMap();
		this.nextEventId_ = 0;
	}
	/** Observe actual dispatch after handlers, without subscribing as a game listener.
	* Observers cannot stop propagation, prevent defaults or change the payload. */
	observe(e) {
		this.observers_.add(e);
		return () => {
			this.observers_.delete(e);
		};
	}
	on(e, t, n) {
		if (typeof e === "number" && typeof t === "string" && typeof n === "function") {
			const r = e;
			const i = t;
			const a = n;
			let o = this.entityHandlers_.get(r);
			if (!o) {
				o = /* @__PURE__ */ new Map();
				this.entityHandlers_.set(r, o);
			}
			let s = o.get(i);
			if (!s) {
				s = /* @__PURE__ */ new Set();
				o.set(i, s);
			}
			if (!s.has(a)) this.countType_(i, 1);
			s.add(a);
			return () => {
				const e = this.entityHandlers_.get(r);
				const t = e?.get(i);
				if (t?.delete(a)) {
					this.countType_(i, -1);
					if (t.size === 0) e.delete(i);
					if (e && e.size === 0) this.entityHandlers_.delete(r);
				}
			};
		}
		const r = e;
		const i = t;
		let a = this.globalHandlers_.get(r);
		if (!a) {
			a = /* @__PURE__ */ new Set();
			this.globalHandlers_.set(r, a);
		}
		if (!a.has(i)) this.countType_(r, 1);
		a.add(i);
		return () => {
			const e = this.globalHandlers_.get(r);
			if (e?.delete(i)) {
				this.countType_(r, -1);
				if (e.size === 0) this.globalHandlers_.delete(r);
			}
		};
	}
	countType_(e, t) {
		const n = (this.typeCounts_.get(e) ?? 0) + t;
		if (n > 0) this.typeCounts_.set(e, n);
		else this.typeCounts_.delete(e);
	}
	/**
	* Is anyone subscribed to this event type, for any entity?
	*
	* For producers that must LOOK for their events rather than being handed them: a
	* visibility watcher walks the UI tree, a proximity watcher measures distances, and
	* neither should do that work into an empty room. Emitting is unaffected — an event
	* with no handlers still queues for `drain()`.
	*/
	hasListenersFor(e) {
		return this.typeCounts_.has(e);
	}
	/**
	* Remove all entity-specific handlers for `entity`.
	* Wire this to `world.onDespawn` for automatic cleanup.
	*/
	removeAll(e) {
		const t = this.entityHandlers_.get(e);
		if (!t) return;
		for (const [e, n] of t) this.countType_(e, -n.size);
		this.entityHandlers_.delete(e);
	}
	/**
	* Emit an event for `entity`. Synchronously dispatches to registered
	* handlers and queues the event for `drain()` / `query()`. Returns the
	* event so callers can inspect propagationStopped / defaultPrevented
	* (e.g. to drive bubbling to parents).
	*/
	emit(e, t, r) {
		const i = new n(t, e, e, r);
		if (this.observers_.size) this.eventIds_.set(i, ++this.nextEventId_);
		this.pending_.push(i);
		this.dispatch_(e, i);
		return i;
	}
	/**
	* Emit a bubbled event to an ancestor. Shares propagation state with
	* the root event: calling stopPropagation on the bubbled event marks
	* the root as stopped so callers can halt the bubbling walk.
	*
	* Callers are responsible for walking the parent chain; this queue
	* does not know about hierarchy.
	*/
	emitBubbled(e, t) {
		if (t.propagationStopped) return t;
		const n = new r(t.type, t.target, e, t.data, t);
		if (this.observers_.size) {
			const e = this.eventIds_.get(t) ?? ++this.nextEventId_;
			this.eventIds_.set(t, e);
			this.eventIds_.set(n, e);
		}
		this.pending_.push(n);
		this.dispatch_(e, n);
		return n;
	}
	/**
	* Return all events queued since the last drain and clear the queue.
	* Typically called once per frame by a UI system.
	*/
	drain() {
		const e = this.pending_;
		this.pending_ = [];
		return e;
	}
	/** Non-destructively inspect currently-pending events of a type. */
	query(e) {
		return this.pending_.filter((t) => t.type === e);
	}
	/** Restore an already-dispatched event for frame consumers without calling handlers again. @internal */
	requeue(e) {
		if (!this.pending_.includes(e)) this.pending_.push(e);
	}
	/** Remove all handlers and pending events. */
	clear() {
		this.entityHandlers_.clear();
		this.globalHandlers_.clear();
		this.pending_ = [];
		this.activeKeys_.clear();
		this.observers_.clear();
	}
	dispatch_(e, n) {
		const r = `${e}:${n.type}`;
		if (this.activeKeys_.has(r)) return;
		this.activeKeys_.add(r);
		try {
			const r = this.entityHandlers_.get(e);
			if (r) {
				const e = r.get(n.type);
				if (e) for (const r of Array.from(e)) try {
					r(n);
				} catch (e) {
					t.error("ui", `EntityEventQueue handler error [${n.type}]`, e);
				}
			}
			const i = this.globalHandlers_.get(n.type);
			if (i) for (const e of Array.from(i)) try {
				e(n);
			} catch (e) {
				t.error("ui", `EntityEventQueue handler error [${n.type}]`, e);
			}
		} finally {
			this.activeKeys_.delete(r);
			if (this.observers_.size) {
				const e = this.eventIds_.get(n) ?? ++this.nextEventId_;
				this.eventIds_.set(n, e);
				const r = Object.freeze({
					eventId: e,
					type: n.type,
					target: n.target,
					currentTarget: n.currentTarget,
					propagationStopped: n.propagationStopped,
					defaultPrevented: n.defaultPrevented
				});
				for (const e of [...this.observers_]) try {
					e(r);
				} catch (e) {
					t.error("ui", "Entity event observer error", e);
				}
			}
		}
	}
};
/**
* Shared EntityEventQueue resource. A plugin inserts the authoritative
* instance on startup; systems access it via `Res(EntityEvents)`.
*
* The default value exists only so the resource is well-typed before
* the owning plugin constructs the real queue. Consumers should never
* see the placeholder at runtime — UIInteractionPlugin inserts its
* queue during `build()`.
*/
const a = e(new i(), "EntityEvents");
/**
* The app's queue, creating it on first ask. Every producer and consumer — the
* UI hit-test, the physics bridge, the binding dispatcher — goes through here
* instead of inserting its own, so plugin build order cannot decide who wins and
* a late plugin can never replace the queue earlier subscribers captured.
* Despawn cleanup is wired once, with the queue.
*/
function o(e) {
	if (!e.hasResource(a)) {
		const t = new i();
		e.insertResource(a, t);
		e.world.onDespawn((e) => t.removeAll(e));
	}
	return e.getResource(a);
}
//#endregion
export { a as n, o as r, i as t };

//# sourceMappingURL=entityEvents.js.map