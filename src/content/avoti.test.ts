import { describe, expect, it } from 'vitest';
import { allEntries, beliefCite, WORKS } from './avoti';
import { beliefs } from './ticejumi';
import { LORE_ORDER } from '../core/lore';
import { renderAvoti } from '../avoti-render';

describe('Avoti — the sources list', () => {
  const entries = allEntries();

  it('lists every belief in the book exactly once', () => {
    LORE_ORDER.forEach((id) => {
      expect(entries.filter((e) => e.key === `ticejums:${id}`)).toHaveLength(1);
    });
  });

  it('never presents something as recorded without a citation', () => {
    entries
      .filter((e) => e.status === 'attested')
      .forEach((e) => {
        expect(e.cite, e.key).not.toBeNull();
        if (e.url) expect(e.url, e.key).toMatch(/^https:\/\//);
      });
  });

  it('explains everything that is the game’s own', () => {
    entries
      .filter((e) => e.status === 'own')
      .forEach((e) => {
        expect(e.note?.lv, e.key).toBeTruthy();
        expect(e.note?.en, e.key).toBeTruthy();
      });
  });

  it('cites each belief by the reference it was checked against', () => {
    Object.entries(beliefs).forEach(([id, b]) => {
      if (b.ref) expect(beliefCite(id as keyof typeof beliefs)?.lv, id).toContain(b.ref);
    });
  });

  it('has both languages everywhere', () => {
    entries.forEach((e) => {
      [e.title, e.where, e.cite, e.note].forEach((loc) => {
        if (!loc) return;
        expect(loc.lv.trim(), e.key).not.toBe('');
        expect(loc.en.trim(), e.key).not.toBe('');
      });
    });
    WORKS.forEach((w) => expect(w.short.lv && w.short.en && w.cite.lv && w.cite.en).toBeTruthy());
  });

  it('renders the standalone page in both languages, with no scripts of its own', () => {
    const html = renderAvoti('2026-10-12');
    expect(html).toContain('lang="lv"');
    expect(html).toContain('lang="en"');
    expect(html).toContain('garamantas.lv');
    expect(html).not.toMatch(/<script/i);
    expect(html.split('class="entry"').length - 1).toBe(entries.length * 2);
  });
});
