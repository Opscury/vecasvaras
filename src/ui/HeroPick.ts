import Phaser from 'phaser';
import { t, vocative } from '../core/i18n';
import { hero, pickName } from '../content/hero';
import { state, type Gender } from '../core/state';
import { Hex, Fonts } from '../core/theme';
import { setModal } from './keys';
import { audio } from '../core/audio';

/**
 * The start of a run: young man or young woman, and a name.
 *
 * Drawn in HTML over the canvas rather than in Phaser, because a name is
 * typed, and a real text field is the only thing that brings up the phone's
 * own keyboard (with its Latvian letters) and lets a name be corrected the
 * way people expect.
 *
 * Under the field it says what Anna will call the player — Jānis is called
 * «Jāni» — because Latvian calls people by a different form of their name
 * and the game says it out loud all year. `vocative` covers the endings a
 * parish register is full of, but not every name anyone will type, so the
 * line has a link that opens it for correction and the corrected form is
 * kept as `nameV`.
 *
 * Editing the NAME clears a correction: the called form was generated from
 * a name that is no longer the one being used, and a stale one is worse than
 * a generated one.
 */

/** Anything put into the card is player-typed or content, so it is escaped. */
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export class HeroPick {
  private root: HTMLDivElement;
  private gender: Gender;
  private input!: HTMLInputElement;
  /** The correction field, which only matters once it has been opened. */
  private vInput!: HTMLInputElement;
  /** True once the player has opened the called form for correction. */
  private fixing = false;
  private done = false;

  constructor(
    private scene: Phaser.Scene,
    private onDone: () => void,
    private onCancel: () => void,
  ) {
    const run = state.get();
    this.gender = run.gender;
    setModal(scene, this, true);
    this.root = document.createElement('div');
    this.root.className = 'vv-hero';
    this.root.innerHTML = this.html(run.name || pickName(this.gender));
    document.body.appendChild(this.root);
    this.wire();
    requestAnimationFrame(() => this.root.classList.add('on'));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.close());
  }

  private html(name: string): string {
    return `
      <style>
        .vv-hero { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          background: rgba(12,13,16,0.62); opacity: 0; transition: opacity .35s ease; z-index: 20;
          font-family: ${Fonts.body}; color: ${Hex.parchment}; padding: 16px; box-sizing: border-box; }
        .vv-hero.on { opacity: 1; }
        .vv-hero .card { width: min(560px, 100%); max-height: 100%; overflow: auto; box-sizing: border-box;
          background: rgba(20,22,26,0.94); border: 1px solid rgba(201,162,74,0.45); border-radius: 6px;
          padding: clamp(14px, 4vh, 32px) clamp(16px, 4vw, 36px); text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .vv-hero h2 { font-weight: normal; font-size: clamp(22px, 5vh, 34px); margin: 0 0 .3em; letter-spacing: .04em; }
        .vv-hero p { color: ${Hex.parchmentDim}; font-style: italic; font-size: clamp(14px, 2.6vh, 17px); margin: 0 0 clamp(10px, 3vh, 22px); }
        .vv-hero .who { display: flex; gap: 12px; margin-bottom: clamp(10px, 3vh, 22px); }
        .vv-hero .who button { flex: 1; font: inherit; font-size: clamp(16px, 3.2vh, 21px); padding: clamp(10px, 2.4vh, 16px) 8px;
          background: transparent; color: ${Hex.parchmentDim}; border: 1px solid rgba(232,223,205,0.25); border-radius: 4px; cursor: pointer; }
        .vv-hero .who button[aria-pressed="true"] { color: ${Hex.ink}; background: ${Hex.rye}; border-color: ${Hex.rye}; }
        .vv-hero label { display: block; text-align: left; font-size: 14px; color: ${Hex.parchmentDim}; margin-bottom: 6px; letter-spacing: .06em; }
        .vv-hero .name { display: flex; gap: 8px; margin-bottom: 6px; }
        .vv-hero .called { text-align: left; font-size: 14px; font-style: normal; color: ${Hex.parchmentDim}; margin: 0 0 6px; }
        .vv-hero .called b { font-weight: normal; color: ${Hex.rye}; }
        .vv-hero .called button { font: inherit; font-size: 14px; padding: 0; margin-left: 8px; background: none;
          border: none; border-bottom: 1px dotted ${Hex.rye}; color: ${Hex.rye}; cursor: pointer; }
        .vv-hero .vrow { display: none; margin-bottom: 6px; }
        .vv-hero .vrow.on { display: block; }
        /* The name row is a flex row, so its input grows; this one is not. */
        .vv-hero .vrow input { width: 100%; box-sizing: border-box; }
        .vv-hero input { flex: 1; min-width: 0; font: inherit; font-size: clamp(17px, 3.2vh, 21px); padding: 10px 12px; color: ${Hex.parchment};
          background: rgba(0,0,0,0.35); border: 1px solid rgba(232,223,205,0.3); border-radius: 4px; }
        .vv-hero input:focus { outline: none; border-color: ${Hex.rye}; }
        .vv-hero .dice { font: inherit; font-size: 14px; padding: 0 12px; background: transparent; color: ${Hex.rye};
          border: 1px solid rgba(201,162,74,0.45); border-radius: 4px; cursor: pointer; white-space: nowrap; }
        .vv-hero .warn { min-height: 1.3em; font-size: 14px; color: ${Hex.blood}; text-align: left; margin: 0 0 clamp(8px, 2vh, 16px); }
        .vv-hero .go { font: inherit; font-size: clamp(17px, 3.2vh, 22px); padding: clamp(10px, 2.2vh, 14px) 34px; color: ${Hex.ink};
          background: ${Hex.rye}; border: none; border-radius: 4px; cursor: pointer; }
        .vv-hero .go:hover, .vv-hero .who button:hover { filter: brightness(1.1); }
        .vv-hero .x { position: absolute; top: 14px; right: 18px; background: none; border: none; color: ${Hex.parchmentDim}; font-size: 26px; cursor: pointer; }
      </style>
      <button class="x" type="button" aria-label="Atpakaļ / Back">×</button>
      <form class="card" novalidate>
        <h2>${esc(t(hero.heading))}</h2>
        <p>${esc(t(hero.lead))}</p>
        <div class="who" role="group">
          <button type="button" data-g="m" aria-pressed="${this.gender === 'm'}">${esc(t(hero.man))}</button>
          <button type="button" data-g="f" aria-pressed="${this.gender === 'f'}">${esc(t(hero.woman))}</button>
        </div>
        <label for="vv-name">${esc(t(hero.name))}</label>
        <div class="name">
          <input id="vv-name" name="name" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(name)}" />
          <button class="dice" type="button">${esc(t(hero.another))}</button>
        </div>
        <p class="called" aria-live="polite"></p>
        <div class="vrow">
          <label for="vv-namev">${esc(t(hero.fixLabel))}</label>
          <input id="vv-namev" name="namev" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" />
        </div>
        <div class="warn" aria-live="polite"></div>
        <button class="go" type="submit">${esc(t(hero.begin))}</button>
      </form>`;
  }

  private wire(): void {
    const r = this.root;
    this.input = r.querySelector<HTMLInputElement>('#vv-name')!;
    const warn = r.querySelector<HTMLDivElement>('.warn')!;
    const called = r.querySelector<HTMLParagraphElement>('.called')!;
    const vrow = r.querySelector<HTMLDivElement>('.vrow')!;
    this.vInput = r.querySelector<HTMLInputElement>('#vv-namev')!;

    // The called form, said back to the player: generated, or theirs.
    const showCalled = () => {
      const form = this.calledForm();
      called.innerHTML = form
        ? esc(t(hero.called)).replace('{}', `<b>${esc(form)}</b>`) +
          (this.fixing ? '' : `<button class="editV" type="button">${esc(t(hero.fix))}</button>`)
        : '';
      called.querySelector('.editV')?.addEventListener('click', () => {
        audio.play('click', { volume: 0.3 });
        this.fixing = true;
        vrow.classList.add('on');
        this.vInput.value = this.calledForm();
        showCalled();
        this.vInput.focus();
        this.vInput.select();
      });
    };

    // A name typed or rolled again is a different name, so a correction made
    // for the old one is dropped rather than quietly kept.
    const nameChanged = () => {
      this.fixing = false;
      vrow.classList.remove('on');
      this.vInput.value = '';
      showCalled();
    };
    r.querySelectorAll<HTMLButtonElement>('.who button').forEach((b) =>
      b.addEventListener('click', () => {
        const g = b.dataset.g as Gender;
        if (g === this.gender) return;
        audio.play('click', { volume: 0.4 });
        // A name picked by the dice follows the choice; one typed by hand stays.
        const was = this.input.value.trim();
        const fromDice = this.input.dataset.dice === '1' || was === '';
        this.gender = g;
        r.querySelectorAll<HTMLButtonElement>('.who button').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.g === g)));
        if (fromDice) {
          this.input.value = pickName(g);
          this.input.dataset.dice = '1';
          nameChanged();
        } else {
          showCalled();
        }
      }),
    );
    this.input.dataset.dice = state.get().name ? '0' : '1';
    this.input.addEventListener('input', () => {
      this.input.dataset.dice = '0';
      warn.textContent = '';
      nameChanged();
    });
    this.vInput.addEventListener('input', () => showCalled());
    r.querySelector('.dice')!.addEventListener('click', () => {
      audio.play('click', { volume: 0.3 });
      this.input.value = pickName(this.gender, this.input.value.trim());
      this.input.dataset.dice = '1';
      warn.textContent = '';
      nameChanged();
    });
    r.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      // Collapse spaces, keep it one word or two, first letter up.
      const name = this.input.value.replace(/\s+/g, ' ').trim().slice(0, 20);
      if (!name) {
        warn.textContent = t(hero.needName);
        this.input.focus();
        return;
      }
      const tidy = name.charAt(0).toLocaleUpperCase('lv') + name.slice(1);
      // A correction is only worth keeping while it says something the
      // generator does not already say for this name.
      const fixed = this.vInput.value.replace(/\s+/g, ' ').trim().slice(0, 20);
      const nameV = this.fixing && fixed && fixed !== vocative(tidy) ? fixed : '';
      state.patch({ gender: this.gender, name: tidy, nameV, heroChosen: true });
      audio.play('click', { volume: 0.5 });
      this.finish(this.onDone);
    });
    r.querySelector('.x')!.addEventListener('click', () => this.finish(this.onCancel));
    r.addEventListener('keydown', (e) => {
      // Nothing typed here is for the game underneath.
      e.stopPropagation();
      if (e.key === 'Escape') this.finish(this.onCancel);
    });
    r.addEventListener('keyup', (e) => e.stopPropagation());

    // A player who has already corrected the form and come back to this card
    // gets their own correction back, not the generator's guess again.
    const saved = state.get().nameV.trim();
    if (saved) {
      this.fixing = true;
      this.vInput.value = saved;
      vrow.classList.add('on');
    }
    showCalled();
  }

  /** What the game will shout at the player: their correction, or the generator's. */
  private calledForm(): string {
    if (this.fixing) {
      const typed = this.vInput.value.trim();
      if (typed) return typed;
    }
    return vocative(this.input.value.replace(/\s+/g, ' ').trim());
  }

  private finish(then: () => void): void {
    if (this.done) return;
    this.close();
    then();
  }

  private close(): void {
    if (this.done) return;
    this.done = true;
    this.input?.blur();
    setModal(this.scene, this, false);
    this.root.classList.remove('on');
    const el = this.root;
    window.setTimeout(() => el.remove(), 360);
  }
}
