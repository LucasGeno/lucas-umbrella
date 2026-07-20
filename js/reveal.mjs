// Reveal-on-scroll threshold: a section is revealed once its top has
// crossed 88% of the viewport (i.e., it's poked into view from below) and
// its bottom is still on-screen. Pure so the browser bundle and the Node
// self-check exercise the same function.
export function shouldReveal(rect, viewportHeight) {
  return rect.top < viewportHeight * 0.88 && rect.bottom > 0;
}
