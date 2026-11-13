//#region src/platform/primaryPointer.ts
function e(e) {
	let t = null;
	return {
		start(n, r, i) {
			e.onTouchStart?.(n, r, i);
			if (t === null) {
				t = n;
				e.onPointerDown(0, r, i);
			}
		},
		move(n, r, i) {
			e.onTouchMove?.(n, r, i);
			if (n === t) e.onPointerMove(r, i);
		},
		end(n) {
			e.onTouchEnd?.(n);
			if (n === t) {
				t = null;
				e.onPointerUp(0);
			}
		},
		cancel(n) {
			e.onTouchCancel?.(n, n === t);
			if (n === t) {
				t = null;
				e.onPointerUp(0);
			}
		}
	};
}
//#endregion
export { e as t };

//# sourceMappingURL=primaryPointer.js.map