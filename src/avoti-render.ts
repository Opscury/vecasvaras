/**
 * Renders the standalone «Avoti» page (/avoti/) to static HTML, in both
 * languages, at build time — see the `avoti` plugin in vite.config.ts.
 *
 * Static on purpose: this is the link that goes into an email to the folklore
 * archive and into a grant application. It has to open instantly, on any
 * device, without loading the game, and read fine with scripts off. The only
 * script on the page is the language switch.
 *
 * Pure function, no DOM: it runs inside Vite's config, under Node.
 */

import type { Lang, Loc } from './core/i18n';
import {
  allEntries,
  AVOTI_TEXT,
  CONTACT_EMAIL,
  GARAMANTAS_URL,
  KIND_LABEL,
  STATUS_EXPLAIN,
  STATUS_LABEL,
  WORKS,
  type SourceEntry,
  type SourceStatus,
} from './content/avoti';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const UI = {
  back: { lv: '← Uz spēli', en: '← To the game' },
  switchTo: { lv: 'English', en: 'Latviski' },
  open: { lv: 'Atvērt avotu', en: 'Open the source' },
  noSource: { lv: 'Bez avota — spēles teksts', en: 'No source — the game’s own text' },
  where: { lv: 'Spēlē', en: 'In the game' },
  updated: { lv: 'Atjaunināts', en: 'Updated' },
  write: { lv: 'Rakstīt', en: 'Write to' },
} satisfies Record<string, Loc>;

const STATUSES = Object.keys(STATUS_LABEL) as SourceStatus[];

function entry(e: SourceEntry, lang: Lang): string {
  const cite = e.cite
    ? `<p class="cite">${esc(e.cite[lang])}</p>`
    : `<p class="cite muted">${esc(UI.noSource[lang])}</p>`;
  const link = e.url
    ? `<p class="open"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(UI.open[lang])} ↗</a></p>`
    : '';
  const note = e.note ? `<p class="note">${esc(e.note[lang])}</p>` : '';
  return `
      <li class="entry">
        <div class="meta"><span>${esc(KIND_LABEL[e.kind][lang])}</span><span>${esc(e.where[lang])}</span></div>
        <h3>${esc(e.title[lang])}</h3>
        <span class="tag tag-${e.status}">${esc(STATUS_LABEL[e.status][lang])}</span>
        ${cite}${note}${link}
      </li>`;
}

function body(lang: Lang, updated: string): string {
  const entries = allEntries();
  const legend = STATUSES.map((st) => {
    const n = entries.filter((e) => e.status === st).length;
    return `<li><span class="tag tag-${st}">${esc(STATUS_LABEL[st][lang])}</span> <span class="count">${n}</span><br><span class="muted">${esc(STATUS_EXPLAIN[st][lang])}</span></li>`;
  }).join('');
  const works = WORKS.map(
    (w) => `<li>${esc(w.cite[lang])} <a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.urlLabel)}</a></li>`,
  ).join('');
  const contact = CONTACT_EMAIL
    ? `<p>${esc(AVOTI_TEXT.corrections[lang])} <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a></p>`
    : '';
  return `
    <div class="lang" lang="${lang}"${lang === 'en' ? ' hidden' : ''}>
      <nav class="top">
        <a href="../">${esc(UI.back[lang])}</a>
        <button type="button" class="switch" data-to="${lang === 'lv' ? 'en' : 'lv'}">${esc(UI.switchTo[lang])}</button>
      </nav>
      <header>
        <p class="game">Vecās Varas</p>
        <h1>${esc(AVOTI_TEXT.heading[lang])}</h1>
        <p class="lead">${esc(AVOTI_TEXT.intro[lang])}</p>
        <p class="muted">${esc(AVOTI_TEXT.fiction[lang])}</p>
      </header>
      <section>
        <ul class="legend">${legend}</ul>
      </section>
      <section>
        <h2>${esc(AVOTI_TEXT.entries[lang])}</h2>
        <ol class="entries">${entries.map((e) => entry(e, lang)).join('')}
        </ol>
      </section>
      <section>
        <h2>${esc(AVOTI_TEXT.works[lang])}</h2>
        <ul class="works">${works}</ul>
      </section>
      <section class="more">
        <h2>${esc(AVOTI_TEXT.more[lang])}</h2>
        <p>${esc(AVOTI_TEXT.moreText[lang])}</p>
        <p><a class="button" href="${GARAMANTAS_URL}" target="_blank" rel="noopener">${esc(AVOTI_TEXT.moreLink[lang])} ↗</a></p>
      </section>
      <section>
        <h2>${esc(AVOTI_TEXT.art[lang])}</h2>
        <p>${esc(AVOTI_TEXT.artText[lang])}</p>
      </section>
      <footer>
        ${contact}
        <p class="muted">${esc(UI.updated[lang])}: ${esc(updated)}</p>
      </footer>
    </div>`;
}

/** The page's content, both languages, ready to drop into avoti/index.html. */
export function renderAvoti(updated: string): string {
  return body('lv', updated) + body('en', updated);
}
