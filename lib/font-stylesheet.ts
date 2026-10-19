// FM-03 single source for the canonical web fonts. The URL (families, weights
// and `display=swap`) is unchanged from the former `@import` in app/globals.css;
// it is now requested by a <link rel="stylesheet"> in the root layout <head>, so
// the browser discovers it while parsing HTML instead of only after downloading
// and parsing the bundled CSS (one fewer render-blocking round trip).
// `display=swap` keeps text visible with the fallback stack while fonts load.
export const CANONICAL_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Space+Grotesk:wght@400;500;600;700&display=swap";
