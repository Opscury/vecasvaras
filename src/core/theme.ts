import { settings } from './settings';

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

/**
 * How small the 1920x1080 canvas is actually being drawn.
 *
 * `Scale.FIT` letterboxes the whole game into whatever the browser gives it, so
 * every size in this file is in canvas pixels, not screen pixels. On a phone
 * held sideways (844x390) the factor is about 0.36 — which turned the 34px
 * narration into 12px of real text and was the first thing a playtester
 * complained about. Measured once at boot; a phone does not change size.
 */
const fitFactor = (): number => {
  if (typeof window === 'undefined') return 1;
  const { innerWidth: w, innerHeight: h } = window;
  if (!w || !h) return 1;
  return Math.min(w / 1920, h / 1080);
};

/** No hover, and usually a thumb: hotspots have to advertise themselves some other way. */
export const Touch: boolean =
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)')?.matches ?? false);

/**
 * Set when the canvas is drawn small enough that desktop type would be
 * unreadable. A cramped desktop window counts too — bigger text in a small
 * window is right there as well.
 */
export const Compact: boolean = fitFactor() < 0.62 || Touch;

/**
 * Every font size and every bit of padding goes through here, so the whole UI
 * grows together instead of one label at a time. 1.45 puts the narration at
 * roughly 18 real pixels on a phone, which is about where a paperback sits.
 */
export const UI_SCALE = Compact ? 1.45 : 1;

/**
 * A font size in canvas pixels, scaled for the device and for the player's own
 * text-size setting. Read when a piece of text is made, so a change of setting
 * reaches everything drawn from then on.
 */
export const px = (base: number): string => `${Math.round(base * UI_SCALE * settings.textScale)}px`;

/** The same, for padding and spacing numbers. */
export const scaled = (base: number): number => Math.round(base * UI_SCALE);

export const Layout = {
  width: 1920,
  height: 1080,
  /**
   * Bottom dialogue panel. Taller on a phone because the type inside it is
   * half again as big; it folds away when nothing is being said, so the
   * painting is only covered while there are words on it.
   */
  panelH: Compact ? 400 : 300,
  panelPad: 56,
  margin: 64,
  /** Smallest comfortable tap target, in canvas pixels (~44 real px on a phone). */
  tap: Compact ? 120 : 64,
} as const;

export const Timing = {
  /** Each way. At 550 every hub↔encounter move was 1.1s of black. */
  fade: 340,
  typeSpeed: 18, // ms per character
  beat: 260,
} as const;
