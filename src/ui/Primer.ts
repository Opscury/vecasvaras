import Phaser from 'phaser';
import { fillLoc, L } from '../core/i18n';
import { once } from '../core/once';
import { lore, LORE_SHOWN, type LoreId } from '../core/lore';
import { beliefs } from '../content/ticejumi';
import { loreUi } from '../content/script';
import { beings, beliefCard, howTo } from '../content/primer';
import { Notice } from './Notice';

/** Art shown beside each being's card: the first that has loaded. */
const BEING_ICON: Record<'jumis' | 'velns', string[]> = {
  jumis: ['codex-jumis', 'jumis-stalk'],
  velns: ['portrait-velns', 'codex-velnaTilts'],
};

const firstLoaded = (scene: Phaser.Scene, keys: string[]): string | undefined =>
  keys.find((k) => scene.textures.exists(k));

/** What the game is — before the opening narration. */
export function showHowTo(scene: Phaser.Scene, onDone: () => void): void {
  new Notice(scene, {
    kicker: howTo.kicker,
    title: howTo.title,
    body: howTo.body,
    ok: howTo.ok,
    icon: firstLoaded(scene, ['primer-stone']),
    onClose: onDone,
  });
}

/**
 * Who the player is about to meet, once per run (a new game shows it again:
 * it is teaching, like the bag's card).
 */
export function showBeing(scene: Phaser.Scene, key: 'jumis' | 'velns', onDone: () => void): void {
  if (!once.mark(`being:${key}`)) {
    onDone();
    return;
  }
  const b = beings[key];
  new Notice(scene, {
    kicker: beings.kicker,
    title: b.title,
    body: b.body,
    note: b.note,
    ok: beings.ok,
    icon: firstLoaded(scene, BEING_ICON[key]),
    onClose: onDone,
  });
}

/**
 * The ticējums that goes with what was just done, as a card. It is also
 * written into the book, so the book and the card never disagree.
 */
export function showBelief(scene: Phaser.Scene, id: LoreId, onDone: () => void): void {
  if (!LORE_SHOWN.includes(id)) {
    onDone();
    return;
  }
  lore.unlock(id);
  const b = beliefs[id];
  const note = b.ref
    ? fillLoc(b.book === 'teikas' ? loreUi.sourceTale : loreUi.source, L(b.ref, b.ref))
    : undefined;
  new Notice(scene, {
    kicker: beliefCard.kicker,
    title: b.title,
    body: b.text,
    note,
    ok: beliefCard.ok,
    icon: firstLoaded(scene, [`codex-${id}`]),
    onClose: onDone,
  });
}
