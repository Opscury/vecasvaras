import { ITEMS, type ItemId } from './inventory';
import { state } from './state';

/**
 * Which texture an item is drawn with right now.
 *
 * Only the loaf needs this, and it needs it badly. The bread from a good
 * harvest and the bread from a stripped field behave completely differently at
 * the bog — one wins the argument, the other gets laughed at — and until now
 * they were the same picture, so the player had no way to see which card they
 * were holding until the Devil told them. The bag's note already said it in
 * words; this says it in the only language an inventory really speaks.
 *
 * It lives here rather than in `inventory.ts` because `state.ts` imports the
 * bag, so the bag cannot import the state back without a cycle.
 */
export function textureFor(id: ItemId): string {
  if (id === 'bread') {
    const year = state.get().jumis;
    if (year === 'good') return 'item-bread-good';
    if (year === 'poor') return 'item-bread-poor';
  }
  return ITEMS[id].texture;
}
