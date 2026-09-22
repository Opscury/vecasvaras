/**
 * The valley, as the player knows it.
 *
 * The village used to say where it could get to with a row of dots in the
 * corner, which is an honest way of saying nothing at all: a dot cannot tell
 * you that the road east exists, that it is a cart road rather than a footpath,
 * or that the only thing standing between you and it is a bridge nobody has
 * rebuilt.
 *
 * So the ways out are a map instead. This module is the map's model — where
 * everything is, what state each way is in, and why — and `ui/MapPanel.ts`
 * only draws it. Coordinates are in board units on a 1000x560 sheet, laid out
 * to match the village painting: the field west, the bog east, the stream
 * coming down from the mill in the north.
 *
 * Nothing here is stored. The map is a function of the run, so it cannot claim
 * a road the village will not actually let you walk.
 */

import { type Loc } from './i18n';
import { mapUi } from '../content/script';
import { state, type RunState } from './state';

export type PlaceId = 'village' | 'field' | 'bog' | 'beyond' | 'mill';

/** Where you are, somewhere you can go, or somewhere you cannot go yet. */
export type PlaceState = 'here' | 'open' | 'shut';

/** What a way is like underfoot: a road a loaded cart can take, or a footpath. */
export type WayKind = 'cart' | 'path';

export interface Place {
  id: PlaceId;
  x: number;
  y: number;
  name: Loc;
  /** Said under the name when the place cannot be reached — why not. */
  note: Loc | null;
  state: PlaceState;
  /**
   * The encounter here has been met, one way or the other. The map stamps it,
   * so a glance says which of the year's errands are behind you.
   */
  done: boolean;
  /** Met well. The seal carries the whole mark, or the mark broken off short — as the reckoning carved it. */
  whole: boolean;
}

export interface Way {
  from: PlaceId;
  to: PlaceId;
  kind: WayKind;
  /** Can it be walked right now. A shut way is drawn, faintly: it still exists. */
  open: boolean;
  /** Board points the ink follows, start to end. */
  points: Array<[number, number]>;
  /**
   * Where something is missing from the way — a bridge, a washed-out stretch.
   * Drawn as a gap with a mark in it, which is the map's way of naming the one
   * thing that has to be put right.
   */
  breakAt?: [number, number];
  /**
   * Where a bridge now stands, and what kind: the one thing the player built
   * this year, so the map draws it rather than just closing the gap.
   */
  bridge?: { at: [number, number]; sound: boolean };
}

export interface Atlas {
  places: Place[];
  ways: Way[];
  /** The stream, drawn under everything. */
  water: Array<[number, number]>;
  /** The spread of the bog. */
  bog: { x: number; y: number; rx: number; ry: number };
  /** How many ways can be walked — what the HUD watches, so a new one can announce itself. */
  open: number;
}

/**
 * Where everything sits on the sheet, laid out against the village painting:
 * the field west, the bog north-east, the stream running out of the bog and
 * south past the village, and the mill upstream in the north.
 */
const AT: Record<PlaceId, [number, number]> = {
  mill: [545, 104],
  field: [138, 398],
  village: [455, 345],
  bog: [790, 212],
  beyond: [928, 402],
};

const xy = (id: PlaceId): { x: number; y: number } => ({ x: AT[id][0], y: AT[id][1] });

/** The part of the run the map reads — the same slice the HUD remembers. */
export type AtlasSource = Pick<RunState, 'jumisPaid' | 'velns'> & Partial<Pick<RunState, 'jumis'>>;

export function atlas(s: AtlasSource = state.get()): Atlas {
  const bogOpen = s.jumisPaid;
  const crossed = s.velns !== 'none';
  const cartRoad = s.velns === 'good';
  const harvested = (s.jumis ?? 'none') !== 'none';

  const places: Place[] = [
    { id: 'village', ...xy('village'), name: mapUi.village, note: null, state: 'here', done: false, whole: false },
    {
      id: 'field',
      ...xy('field'),
      name: mapUi.field,
      note: harvested ? mapUi.fieldDone : null,
      state: 'open',
      done: harvested,
      whole: s.jumis === 'good',
    },
    {
      id: 'bog',
      ...xy('bog'),
      name: mapUi.bog,
      note: crossed ? mapUi.bogDone : bogOpen ? null : mapUi.bogShut,
      state: bogOpen ? 'open' : 'shut',
      done: crossed,
      whole: s.velns === 'good',
    },
    {
      id: 'beyond',
      ...xy('beyond'),
      name: mapUi.beyond,
      // The whole reason for having a map: a road that plainly goes somewhere,
      // and the one thing standing in front of it.
      note: crossed ? mapUi.beyondOpen : mapUi.beyondShut,
      state: crossed ? 'open' : 'shut',
      done: false,
      whole: false,
    },
    { id: 'mill', ...xy('mill'), name: mapUi.mill, note: mapUi.millShut, state: 'shut', done: false, whole: false },
  ];

  const ways: Way[] = [
    {
      from: 'village',
      to: 'field',
      kind: 'cart',
      open: true,
      points: [
        [408, 354],
        [320, 370],
        [232, 386],
        [176, 396],
      ],
    },
    {
      from: 'village',
      to: 'bog',
      kind: 'path',
      open: bogOpen,
      points: [
        [494, 324],
        [580, 288],
        [668, 250],
        [746, 224],
      ],
    },
    // The way on, over the stream south of the bog. The bridge is the only
    // thing missing from it, and the map says so with a mark on the water.
    {
      from: 'village',
      to: 'beyond',
      kind: cartRoad ? 'cart' : 'path',
      open: crossed,
      points: [
        [500, 370],
        [612, 412],
        [700, 432],
        [792, 430],
        [890, 414],
      ],
      breakAt: crossed ? undefined : [762, 431],
      bridge: crossed ? { at: [762, 431], sound: cartRoad } : undefined,
    },
    {
      from: 'village',
      to: 'mill',
      kind: 'cart',
      open: false,
      points: [
        [458, 306],
        [468, 238],
        [500, 168],
        [530, 126],
      ],
      breakAt: [468, 238],
    },
  ];

  return {
    places,
    ways,
    // Out of the north, through the bog, and away south past the village.
    water: [
      [556, 122],
      [640, 150],
      [712, 176],
      [788, 214],
      [802, 300],
      [772, 400],
      [742, 512],
    ],
    bog: { x: 790, y: 214, rx: 78, ry: 48 },
    open: ways.filter((w) => w.open).length,
  };
}
