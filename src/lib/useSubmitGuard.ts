import { useCallback, useRef } from "react";

/**
 * Guards a one-shot submit handler against double-tap / rapid-tap duplicates.
 * The wrapped handler runs at most once per component mount. The bottom-sheet
 * submit buttons all close (unmount) the sheet on success, so the guard resets
 * naturally the next time the sheet is opened.
 *
 *   const guard = useSubmitGuard();
 *   <Pressable onPress={guard(() => doThing())} />
 */
export function useSubmitGuard() {
  const done = useRef(false);
  return useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (done.current) return;
        done.current = true;
        fn(...args);
      },
    [],
  );
}
