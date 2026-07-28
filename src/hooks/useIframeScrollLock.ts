import { useEffect } from 'react';

/**
 * useIframeScrollLock
 *
 * Prevents the parent page from jumping to the top when a cross-origin
 * iframe (e.g. a Fillout phone field's country-code dropdown) gains focus.
 *
 * Works on desktop (Chrome / Firefox / Safari / Edge), iOS Safari,
 * Android Chrome, and all tablet browsers.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ROOT CAUSE ANALYSIS — why every previous attempt failed
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The browser scroll triggered by iframe focus runs BEFORE window.blur on
 * desktop Chrome/Edge. rAF and blur-based listeners therefore always missed
 * the scroll.
 *
 * The "no user gesture" approach (Attempt 3) failed because touchstart events
 * originating INSIDE a cross-origin iframe also fire on the parent document,
 * targeting the <iframe> element. The handler incorrectly marked EVERY tap
 * as a user scroll gesture, disabling the guard on every mobile interaction.
 *
 * The "iframeTouched" approach (Attempt 4) failed on iOS Safari because iOS
 * may not propagate touchstart from inside the iframe to the parent document
 * at all — so iframeTouched was never set.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CORRECT THREE-SIGNAL STRATEGY
 * ─────────────────────────────────────────────────────────────────────────
 *
 * We keep a continuous scroll listener and evaluate THREE signals in order:
 *
 * Signal 1 — document.activeElement (desktop-reliable)
 *   When any element inside a cross-origin iframe has focus, the parent
 *   document's activeElement is the <iframe> element. This fires reliably
 *   before the scroll on Chrome, Firefox, Edge, and Safari desktop.
 *
 * Signal 2 — window.blur (iOS-reliable for keyboard-induced scroll)
 *   On iOS Safari the focus-scroll is ASYNCHRONOUS — it happens when the
 *   virtual keyboard opens (~300–600 ms after the tap), not instantly.
 *   This means window.blur on iOS fires BEFORE the keyboard scroll, making
 *   it a valid early signal. We guard for up to 3 seconds after blur so the
 *   delayed keyboard scroll is always caught.
 *
 * Signal 3 — "no parent-page touch gesture" (universal mobile fallback)
 *   The critical insight: we track ONLY touchstart events that target a
 *   NON-iframe element in the parent document. If such a touch was NOT seen
 *   recently, any abrupt scroll to near-zero is treated as spurious.
 *   This covers all cases:
 *     • If iOS does propagate iframe-touchstart to parent: e.target is IFRAME
 *       → parentGestured is immediately reset to false → noParentGesture = true ✓
 *     • If iOS does NOT propagate iframe-touchstart: no event at all
 *       → parentGestured stays false → noParentGesture = true ✓
 *     • User swipes on parent page: touchstart fires on a real parent element
 *       → parentGestured = true for 200 ms → noParentGesture = false → guard off ✓
 *     • User scrolls to form THEN taps iframe: after 200 ms the scroll gesture
 *       window expires; and if the tap hits IFRAME the guard is reset immediately
 *       → noParentGesture = true → guard arms ✓
 *
 * We also guard only abrupt jumps: prevY > 100 AND nowY < 50.
 * A gradual user swipe-to-top updates prevY incrementally; by the time
 * nowY < 50 the guard condition prevY > 100 is already false.
 */
export function useIframeScrollLock() {
  useEffect(() => {
    let prevX = window.scrollX;
    let prevY = window.scrollY;

    // ── Signal 2: window.blur tracking ────────────────────────────────────
    // On iOS Safari, blur fires before the keyboard-induced scroll.
    let windowBlurred = false;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    function onWindowBlur() {
      windowBlurred = true;
      if (blurTimer) clearTimeout(blurTimer);
      // 3 s covers keyboard open latency + Fillout JS processing time.
      blurTimer = setTimeout(() => { windowBlurred = false; }, 3000);
    }

    function onWindowFocus() {
      // Window regained focus from the parent page (not from the iframe).
      // Clear the blur guard so we don't block legitimate scrolling.
      windowBlurred = false;
      if (blurTimer) clearTimeout(blurTimer);
    }

    // ── Signal 3: parent-page touch tracking ──────────────────────────────
    // Mark a genuine parent-page scroll gesture only when the touch target
    // is NOT the iframe element. This is the key fix for mobile:
    //   • Tapping inside the iframe → e.target is IFRAME → skip marking
    //   • Swiping the parent page  → e.target is a parent element → mark
    let parentGestured = false;
    let gestureTimer: ReturnType<typeof setTimeout> | null = null;

    function onTouchStart(e: TouchEvent) {
      const target = e.target as Element | null;
      const path: EventTarget[] =
        typeof e.composedPath === 'function' ? e.composedPath() : [];

      const hitIframe =
        target?.tagName === 'IFRAME' ||
        path.some(node => (node as Element)?.tagName === 'IFRAME');

      if (!hitIframe) {
        // Genuine parent-page swipe gesture — allow the scroll.
        parentGestured = true;
        if (gestureTimer) clearTimeout(gestureTimer);
        // Reduce from 500ms to 200ms: a scroll gesture should not "carry over"
        // to protect an iframe tap that follows shortly after.
        gestureTimer = setTimeout(() => { parentGestured = false; }, 200);
      } else {
        // User tapped the iframe — immediately reset parentGestured so Signal 3
        // arms the guard even if the user had just scrolled down.
        parentGestured = false;
        if (gestureTimer) clearTimeout(gestureTimer);
      }
    }

    // ── Scroll guard ──────────────────────────────────────────────────────
    function onScroll() {
      const nowX = window.scrollX;
      const nowY = window.scrollY;

      // Only consider abrupt large-upward jumps to near the top.
      // prevY > 100: we were scrolled down a meaningful amount.
      // nowY  < 50:  we just jumped near the top (focus-scroll signature).
      if (prevY > 100 && nowY < 50) {
        const isTouchDevice = navigator.maxTouchPoints > 0;

        const s1 = document.activeElement?.tagName === 'IFRAME'; // desktop
        const s2 = windowBlurred;                                 // iOS blur
        const s3 = isTouchDevice && !parentGestured;             // mobile fallback

        if (s1 || s2 || s3) {
          // Restore using the two-argument form for maximum compatibility.
          // Always behaves as an instant (no animation) scroll.
          window.scrollTo(prevX, prevY);
          // Keep prevX/prevY unchanged — guard stays armed if the browser
          // retries the scroll multiple times.
          return;
        }
      }

      // Legitimate scroll — update saved position.
      prevX = nowX;
      prevY = nowY;
    }

    // ── Bind ─────────────────────────────────────────────────────────────
    window.addEventListener('blur',       onWindowBlur);
    window.addEventListener('focus',      onWindowFocus);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('scroll',     onScroll,     { passive: true });

    return () => {
      window.removeEventListener('blur',   onWindowBlur);
      window.removeEventListener('focus',  onWindowFocus);
      document.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('scroll', onScroll);
      if (blurTimer)    clearTimeout(blurTimer);
      if (gestureTimer) clearTimeout(gestureTimer);
    };
  }, []);
}
