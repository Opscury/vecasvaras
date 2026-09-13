/**
 * One place for every colour, size and easing in the game.
 *
 * The palette is pulled from the backgrounds themselves — weathered timber,
 * lichen grey, rye gold, peat black — so the UI sits inside the paintings
 * instead of on top of them.
 */

export const Palette = {
  ink: 0x14161a,
  inkSoft: 0x1d2026,
  parchment: 0xe8dfcd,
  parchmentDim: 0xbfb49c,
  timber: 0x6b5842,
  timberLight: 0x8f7a5c,
  rye: 0xc9a24a,
  ryeBright: 0xe0bd68,
  moss: 0x5c6b4a,
  peat: 0x3a2f28,
  blood: 0x8a3b30,
  mist: 0x9aa6ad,
} as const;

/** Same values as CSS strings, for Text styles which want '#rrggbb'. */
export const Hex = {
  ink: '#14161a',
  parchment: '#e8dfcd',
  parchmentDim: '#bfb49c',
  rye: '#c9a24a',
  ryeBright: '#e0bd68',
  mist: '#9aa6ad',
  moss: '#8fa06f',
  blood: '#b8564a',
} as const;

export const Fonts = {
  /** Serif everywhere — this is a game about old things. */
  body: 'Georgia, "Times New Roman", "Liberation Serif", serif',
  display: 'Georgia, "Times New Roman", "Liberation Serif", serif',
} as const;

export const Layout = {
  width: 1920,
  height: 1080,
  /** Bottom dialogue panel. */
  panelH: 300,
  panelPad: 56,
  margin: 64,
} as const;

export const Timing = {
  /** Each way. At 550 every hub↔encounter move was 1.1s of black. */
  fade: 340,
  typeSpeed: 18, // ms per character
  beat: 260,
} as const;
