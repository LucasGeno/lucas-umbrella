// Reveal-on-scroll threshold: a section is revealed once its top has
// crossed 1.4× the viewport height (i.e., it's still ~40% of a viewport
// below the fold), so the fade completes well before the user scrolls
// to it — the reveal exists but shouldn't feel like a load-in flash.
// Pure so the browser bundle and the Node self-check exercise the same
// function.
export function shouldReveal(rect, viewportHeight) {
  return rect.top < viewportHeight * 1.4 && rect.bottom > 0;
}
