/**
 * Query-string switches.
 *
 * `?fx=off` disables every ambient effect — fog, particles, smoke, birds, the
 * wind shader. It exists for three reasons: it makes automated playtests fast
 * enough to actually run, it gives a fallback for a machine that chokes on the
 * full-screen blend passes, and it is the quickest way to tell whether a visual
 * bug is in the scene or in the atmosphere on top of it.
 */
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const flags = {
  /** Ambient motion on or off. */
  fx: params.get('fx') !== 'off',
  /**
   * Show folklore that has not been checked against a primary source yet —
   * an unverified verse card, an unmatched belief. Always on in development so
   * the gaps stay visible; off in a production build unless `?folklore=draft`
   * is given, so nothing unchecked is ever presented to players as tradition.
   */
  draftFolklore: import.meta.env.DEV || params.get('folklore') === 'draft',
};
