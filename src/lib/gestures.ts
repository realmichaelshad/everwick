/**
 * Web touch-action for gesture-handler gestures. On the web, gesture-handler
 * sets `touch-action: none` on a gesture's view unless the gesture's own
 * config says otherwise, which stops the page from scrolling when a drag
 * starts on that view. GestureDetector's touchAction prop covers a single
 * gesture, but composed gestures (useCompetingGestures) re-apply each
 * gesture's config, so the value has to live in every gesture's config.
 *
 *   usePanGesture(withTouchAction<PanGestureConfig>({ activeOffsetX: [-6, 6], ... }, "pan-y"))
 *
 * (Wrapped in a call rather than spread into the literal: the worklets Babel
 * plugin doesn't accept spreads in gesture configs. The callbacks carry their
 * own "worklet" directives.) The key is accepted at runtime (gesture-handler's
 * props whitelist) but isn't in the public config type, hence this one helper.
 */
export type WebTouchAction = "auto" | "none" | "pan-x" | "pan-y" | "manipulation";

export function withTouchAction<T extends object>(config: T, touchAction: WebTouchAction): T {
  return Object.assign({}, config, { touchAction });
}
