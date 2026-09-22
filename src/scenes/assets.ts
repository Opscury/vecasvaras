import Phaser from 'phaser';

/** [texture key, file in public/art] */
type Asset = readonly [string, string];

/** [texture key, file, frame size] — frames read left to right, then down. */
type Sheet = readonly [string, string, Phaser.Types.Loader.FileTypes.ImageFrameConfig];

/**
 * Just enough to draw the menu. Loading all 4 MB of art before the title was a
 * dark screen with a 3px bar for seven seconds on a slow connection.
 */
export const TITLE_ASSETS: readonly Asset[] = [['bg-title', 'title.jpg']];

/** Everything else, fetched while the player is looking at the title. */
export const GAME_ASSETS: readonly Asset[] = [
  ['bg-village', 'village.jpg'],
  ['bg-field', 'field.jpg'],
  // The same field after the swing, aligned to field.jpg for a cross-fade.
  ['bg-field-cut', 'field_cut.jpg'],
  ['bg-bog', 'bog.jpg'],
  ['granary-good', 'granary_full.webp'],
  ['granary-poor', 'granary_poor.webp'],
  // v3 is flat with a footing at each end, so it sits across the stream instead
  // of hanging over the path. v1 and v2 stay on disk.
  ['bridge-good', 'bridge_full_v3.webp'],
  ['bridge-poor', 'bridge_poor.webp'],
  // The granary's store, made visible: one sheaf leaning on its wall per loaf
  // inside it. Two of them, alternated, so a stack of three is not the same
  // picture three times.
  ['sheaf-a', 'sheaf_a.webp'],
  ['sheaf-b', 'sheaf_b.webp'],
  ['jumis-stalk', 'jumis_stalk.webp'],
  ['jumis-bound', 'jumis_bound.webp'],
  ['velns', 'velns.webp'],
  // Vecā Anna, who stands in the hub and hands out the run's two errands.
  ['elder', 'elder.webp'],
  ['item-sickle', 'item_sickle.webp'],
  // One loaf per kind of year. Same item, and the only way to see at a glance
  // whether the bread is worth anything before the Devil says so.
  ['item-bread-good', 'item_bread_good.webp'],
  ['item-bread-poor', 'item_bread_poor.webp'],
  ['item-cat', 'item_cat.webp'],
  ['item-bag', 'item_bag.webp'],
  // The Devil's hat, left for someone who answered him as an equal.
  ['item-hat', 'item_hat.webp'],
  // Painted busts shown beside the narration while each of them talks.
  ['portrait-anna', 'portrait_anna.webp'],
  ['portrait-velns', 'portrait_velns.webp'],
  // Ink vignettes for the beliefs book, one per belief.
  ['codex-jumis', 'codex_jumis.webp'],
  ['codex-jumjaKersana', 'codex_jumjaKersana.webp'],
  ['codex-maize', 'codex_maize.webp'],
  ['codex-pirmaisKumoss', 'codex_pirmaisKumoss.webp'],
  ['codex-maldugunis', 'codex_maldugunis.webp'],
  ['codex-velnaTilts', 'codex_velnaTilts.webp'],
  ['codex-gailis', 'codex_gailis.webp'],
];

/**
 * Sheets load through a different Phaser call than plain images, so they are
 * listed apart rather than given a nullable frame field on every image above.
 *
 * `cat_walk_sheet.png` is one full stride in twelve frames, 4x3. Every frame
 * sits on the same canvas with the same ground line, and the cat's own drift
 * across the source footage has been taken out, so the loop does not shunt
 * the cat backwards each time it wraps. `cat_walk.png` stays on disk.
 */
export const GAME_SHEETS: readonly Sheet[] = [
  ['cat-walk', 'cat_walk_sheet.webp', { frameWidth: 300, frameHeight: 150 }],
];

/** Animation key. Distinct from the texture key so the two cannot be confused. */
export const CAT_WALK_ANIM = 'cat-walk-cycle';

/** The frames of the cat sheet, in order. */
export const CAT_WALK_FRAMES = 12;

/**
 * Frame rate for the cat's walk, and the ground it covers.
 *
 * These two numbers are one decision, not two. In the sheet the cat walks on
 * the spot, so a planted paw slides backwards through the frame -- measured at
 * 13.5 px per frame in a 300 px frame (`.fix/gait.py`), consistently across the
 * whole cycle. That is the speed the cat is really travelling. Scaled to how
 * big it is drawn in the bog and integrated along its path, crossing the planks
 * takes 50.6 frames of animation. So the frame rate fixes the crossing time and
 * the crossing time fixes the frame rate; pick either freely and the paws slide.
 *
 * 16 fps is 1.33 walk cycles a second, which is a cat walking. The footage
 * itself came back at about half that -- the model's slow-motion habit -- and
 * replaying it at its own rate would have taken the cat six seconds to cross.
 */
export const CAT_WALK_FPS = 16;

/** Slide of a planted paw, in frame pixels, per frame of the cycle. */
export const CAT_PAW_SLIDE = 13.5;

/** Registers every animation in the game. Safe to call more than once. */
export function defineAnims(scene: Phaser.Scene): void {
  if (!scene.anims.exists(CAT_WALK_ANIM)) {
    scene.anims.create({
      key: CAT_WALK_ANIM,
      frames: scene.anims.generateFrameNumbers('cat-walk', { start: 0, end: CAT_WALK_FRAMES - 1 }),
      frameRate: CAT_WALK_FPS,
      repeat: -1,
    });
  }
}

/** Queues whatever in `list` is not already a texture. Returns how many were queued. */
export function queueMissing(scene: Phaser.Scene, list: readonly Asset[]): number {
  scene.load.setPath('art');
  let queued = 0;
  for (const [key, file] of list) {
    if (scene.textures.exists(key)) continue;
    scene.load.image(key, file);
    queued++;
  }
  return queued;
}

/** The same, for sheets. Returns how many were queued. */
export function queueMissingSheets(scene: Phaser.Scene, list: readonly Sheet[]): number {
  scene.load.setPath('art');
  let queued = 0;
  for (const [key, file, frames] of list) {
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, file, frames);
    queued++;
  }
  return queued;
}

/** Keys from `list` that are still not textures — after a load, the ones that failed. */
export const missingFrom = (
  scene: Phaser.Scene,
  list: readonly (readonly [string, ...unknown[]])[],
): string[] =>
  list.filter(([key]) => !scene.textures.exists(key)).map(([key]) => key);

/** Says which file failed in the console; the scene says so on screen. */
export function reportLoadErrors(scene: Phaser.Scene): void {
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    console.warn(`[Vecās Varas] could not load ${file.key} (${file.url})`);
  });
}
