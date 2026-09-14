import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { items, jumis, reckoning, ui } from '../content/script';
import { state } from '../core/state';
import { jumisOutcome, type JumisPick } from '../core/rules';
import { Layout, Palette } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Hotspot } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { DainaCard } from '../ui/DainaCard';
import { Reckoning } from '../ui/Reckoning';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { Painting } from '../ui/Painting';
import { Prompt } from '../ui/Prompt';
import { attachWind, type WindPipeline } from '../fx/WindPipeline';
import { fadeIn, goTo } from './transition';
import { audio } from '../core/audio';

/**
 * Encounter one — Jumis, the harvest spirit, in a Zemgale rye field.
 *
 * Three phases:
 *   SEARCH  the player hunts the field for a stem with two ears. Five decoys,
 *           one real. The boundary stone carries the folk rule that makes the
 *           right choice knowable rather than a coin flip.
 *   CHOOSE  what to do with it. Leaving it and binding it down is the tithe;
 *           cutting everything or uprooting it are both diminished, and both
 *           get their own ending text rather than a shared failure line.
 *   CUT     the choice loads the sickle; the swing is the player's own. The
 *           field then visibly goes down — the standing rye cross-fades to
 *           stubble and sheaves, and the double ear falls or is bound.
 *
 * Nothing here can kill you or end the run. The worst case is a smaller barn.
 */

/** Positions read off the painting. Re-measure if the art is regenerated. */
const DECOYS = [
  { x: 330, y: 640 },
  { x: 700, y: 560 },
  { x: 1150, y: 610 },
  { x: 1500, y: 700 },
  // Lifted from y=800, where its ring sat under the narration panel's ramp.
  { x: 640, y: 720 },
] as const;

const TRUE_STALK = { x: 1596, y: 540 } as const;
/**
 * The boundary stone: the box sits on the painted boulder itself. (It was once
 * lifted above the narration panel, which left it hovering over empty rye; the
 * panel is folded away during the search, and the ring now draws above it.)
 */
const HINT_STONE = { x: 888, y: 918, w: 300, h: 150 } as const;
/** jumis_bound.png, placed and tinted to sit on field_cut.jpg (see ART_NOTES). */
const BOUND = { x: 1596, y: 655, h: 190 } as const;
const STALK_TINT = 0xcdbf9b;
/** Below this line a swing meets rye; above it, sky. */
const HORIZON = Layout.height * 0.34;
/** How long a player may search before the double ear starts, very faintly, to breathe. */
const SEARCH_HELP_MS = 25000;

export class JumisScene extends Phaser.Scene {
  private narration!: Narration;
  private spots: Hotspot[] = [];
  private found = false;
  private prompt!: Prompt;
  private bagUi!: Bag;
  /** Set once the player has chosen; the sickle then carries it out. */
  private pending: JumisPick | null = null;
  private cutBg!: Phaser.GameObjects.Image;
  private stalk!: Phaser.GameObjects.Image;
  private bound!: Phaser.GameObjects.Image;
  private wind: WindPipeline | null = null;
  /** The faint band over the rye that says "swing here" while the sickle is in hand. */
  private band!: Phaser.GameObjects.Rectangle;
  private stalkPulse: Phaser.Tweens.Tween | null = null;
  private searchHelp: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Jumis');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('field');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.found = false;
    this.spots = [];
    this.pending = null;
    this.stalkPulse = null;
    this.searchHelp = null;
    state.set('scene', 'Jumis');

    const { width, height } = Layout;
    fadeIn(this);
    const painting = new Painting(this, 'bg-field');

    // The same field after the swing, waiting invisibly under everything else.
    // It goes in before the stalk — inside the painting, draw order is add
    // order — or the cut field would cover the double ear.
    this.cutBg = painting.add(
      this.add.image(width / 2, height / 2, 'bg-field-cut').setDisplaySize(width, height).setAlpha(0),
    );

    // The double ear is painted into the scene from the start — it is findable
    // by looking, not by exhausting every hotspot.
    this.stalk = painting.add(
      this.add
        .image(TRUE_STALK.x, TRUE_STALK.y + 84, 'jumis-stalk')
        .setOrigin(0.5, 1)
        // Tinted down into the field's own washed-out gold. Untinted it reads as
        // a marker rather than a plant, and there is no puzzle left to solve.
        .setTint(STALK_TINT),
    );
    this.stalk.setScale(158 / this.stalk.height);
    // Rooted at its base and rocking, so it belongs to the same wind.
    this.tweens.add({
      targets: this.stalk,
      angle: { from: -2.4, to: 2.4 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // The tithe, as the old women left it: bent to the ground and tied. Shown
    // only if the player leaves the field its share.
    this.bound = painting.add(
      this.add.image(BOUND.x, BOUND.y, 'jumis-bound').setOrigin(0.5, 1).setTint(STALK_TINT).setAlpha(0),
    );
    this.bound.setScale(BOUND.h / this.bound.height);

    // Wind. The displacement pass on the standing crop is what actually makes
    // the rye move. It goes on the painting — the field and the stalk standing
    // in it — so the text drawn over them stays still.
    //
    // Both lines are read off field.jpg: the crop starts just under the
    // treeline at 0.4, and the near foreground — cut stubble, the grass verge,
    // the boundary stone, the sickle lying across it — starts around 0.78.
    // Without the lower line the wind was strongest exactly there and the
    // ground waved along with the rye.
    this.wind = attachWind(painting.root, { amp: 0.0045, horizon: 0.4, ground: 0.78 });

    new Atmosphere(this)
      .drift(painting.root, { scale: 1.03, duration: 42000 })
      // Chaff and seed heads blowing off the crop, left to right with the wind.
      // Brown flecks, not pale ones: cream on pale-gold rye had no contrast and
      // could not be seen at all.
      .motes({ tint: 0x7a5a30, count: 48, driftX: 70, scale: 0.1, alpha: 0.7, band: [0.34, 0.86] })
      .birds({ band: [0.1, 0.26], every: [9000, 20000], tint: 0x3a3d38 })
      .breathe({ amount: 0.05, duration: 24000 });

    const bandBottom = height - Layout.panelH;
    this.band = this.add
      .rectangle(width / 2, (HORIZON + bandBottom) / 2, width, bandBottom - HORIZON, Palette.ryeBright, 1)
      .setDepth(190)
      .setAlpha(0.03)
      .setVisible(false);
    this.tweens.add({
      targets: this.band,
      alpha: 0.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      // With a cut waiting, a click on the field is someone looking for how to
      // make it: say how, rather than "only rye".
      if (!holding && !over.length) this.narration.mutter(this.pending ? [items.cutPrompt] : jumis.nothing);
    });

    this.bagUi = new Bag(this);

    // Using the sickle on the field is what actually performs the harvest.
    // Choosing from a list decides *what* you do; this is you doing it.
    this.bagUi.onUse = (id, _x, y) => {
      if (!this.pending) {
        this.tell(items.notYet);
        return false;
      }
      if (id !== 'sickle') {
        this.tell(items.cutWrongTool);
        return false;
      }
      if (y < HORIZON) {
        // Say so, and keep the sickle in hand to aim again — the sky used to
        // take it back without a word.
        this.tell(items.cutWrongPlace);
        return true;
      }
      this.swing();
      return true;
    };

    this.prompt = new Prompt(this);

    new DainaCard(this, 'jumis', () => {
      this.narration.say(jumis.arrive, () => this.beginSearch());
    });
  }

  update(): void {
    // With a cut to make: the bag pulses until the sickle is out, then the
    // strike zone shows while it is in hand.
    const cutting = this.pending !== null;
    this.band?.setVisible(cutting && this.bagUi?.holding === 'sickle');
    this.bagUi?.attention(cutting && !this.bagUi.holding);
  }

  /**
   * A remark on something the player tried. In the panel when it is free; at
   * the top of the frame when the panel is holding a decision, so the
   * choices are not wiped.
   */
  private tell(line: Loc): void {
    if (this.narration.busy) this.prompt.flash(line);
    else this.narration.flash(line);
  }

  private beginSearch(): void {
    // Clear the panel: the sickle, the stubble and the boundary stone all live
    // in the bottom third of this painting, and the player needs to see them.
    this.narration.hide();
    this.prompt.show(ui.clickAnywhere);

    DECOYS.forEach((p, i) => {
      this.spots.push(
        new Hotspot(this, {
          x: p.x,
          y: p.y,
          r: 78,
          discreet: true,
          label: ui.examine,
          guard: () => !this.found && !this.bagUi.holding,
          onClick: () => this.narration.flash(jumis.decoys[i]),
        }),
      );
    });

    this.spots.push(
      new Hotspot(this, {
        x: HINT_STONE.x,
        y: HINT_STONE.y,
        w: HINT_STONE.w,
        h: HINT_STONE.h,
        label: jumis.hintStone.label,
        guard: () => !this.found && !this.bagUi.holding,
        onClick: () => this.narration.flash(jumis.hintStone.text),
      }),
    );

    this.spots.push(
      new Hotspot(this, {
        x: TRUE_STALK.x,
        y: TRUE_STALK.y,
        r: 92,
        discreet: true,
        label: ui.examine,
        guard: () => !this.bagUi.holding,
        onClick: () => this.onFound(),
      }),
    );

    // A floor under the search. Honest for the first 25 seconds; after that a
    // very slow breath on the double ear — invisible if you are looking right
    // at it, catches the eye if you are lost.
    this.searchHelp = this.time.delayedCall(SEARCH_HELP_MS, () => {
      this.searchHelp = null;
      if (this.found) return;
      this.stalkPulse = this.tweens.add({
        targets: this.stalk,
        alpha: 0.85,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private onFound(): void {
    if (this.found) return;
    this.found = true;
    this.searchHelp?.remove(false);
    this.searchHelp = null;
    this.stalkPulse?.remove();
    this.stalkPulse = null;
    this.stalk.setAlpha(1);
    this.spots.forEach((s) => s.setEnabled(false));
    this.prompt.hide(300);

    this.narration.say(jumis.found, () => this.offerChoice());
  }

  private offerChoice(): void {
    // The tithe is deliberately not the first option. The right answer should
    // come from reading the field stone, not from its place in the list.
    this.narration.ask(jumis.question, [
      { label: jumis.choices.all, onPick: () => this.resolve('all') },
      { label: jumis.choices.leave, onPick: () => this.resolve('leave') },
      { label: jumis.choices.take, onPick: () => this.resolve('take') },
    ]);
  }

  /**
   * A choice does not resolve the encounter — it loads the sickle. The player
   * then takes it out of the bag and puts it to the rye, which is the
   * difference between picking an option and doing a day's work.
   *
   * There is deliberately no "cut" line in the panel: a player click-advancing
   * through the text hit it without meaning to, and the field came down with
   * the sickle still in the bag. The instruction stays at the top of the
   * frame and the bag pulses until the sickle is out.
   */
  private resolve(pick: JumisPick): void {
    this.pending = pick;
    this.narration.dismiss();
    this.prompt.show(items.cutPrompt, 350);
  }

  private swing(): void {
    const pick = this.pending;
    if (!pick) return;
    this.pending = null;
    this.bagUi.putBack();
    this.cut(pick);
  }

  /** The swing itself, and everything that follows from it. */
  private cut(pick: JumisPick): void {
    this.prompt.hide(200);
    this.narration.dismiss();
    // A short blade-flash of the whole frame, then the field goes down.
    audio.play('sickle');
    this.cameras.main.flash(90, 240, 232, 208, false);
    this.cameras.main.shake(140, 0.002);

    const outcome = jumisOutcome(pick);
    const good = outcome === 'good';

    // Commit now, before the prose plays: a player who closes the tab
    // mid-sentence comes back to a harvested field, not a half-finished one.
    //
    // The loaf used to fly into the bag right here, mid-cutscene. The first
    // playtester never saw it happen and could not say afterwards what she had
    // got out of the field. The bread is now baked and handed over by Anna
    // when the harvest is reported back, so the reward has a giver.
    state.set('jumis', outcome);

    this.harvest(pick);

    const lines = [...jumis.outcomes[pick], good ? jumis.reward.good : jumis.reward.poor];

    // Let the field go down before anyone says so — the picture first, then the words.
    this.time.delayedCall(1100, () => {
      this.narration.say(lines, () => {
        this.narration.hide();

        // The prose above says what happened. This says what it was worth.
        const r = good ? reckoning.jumis.good : reckoning.jumis.poor;
        new Reckoning(this, {
          sign: 'jumis',
          good,
          verdict: r.verdict,
          gain: r.gain,
          missed: r.missed,
          onDone: () => goTo(this, 'Village'),
        });
      });
    });
  }

  /**
   * The picture catches up with the prose. The standing rye dissolves into the
   * cut field (aligned to it horizon-for-horizon, so it reads as the crop going
   * down rather than the camera moving), the wind drops with it, and the
   * double ear either falls or is bent down and tied.
   */
  private harvest(pick: JumisPick): void {
    this.tweens.add({ targets: this.cutBg, alpha: 1, duration: 900, ease: 'Sine.easeInOut' });

    // A cut field that is still rippling is the tell.
    const wind = this.wind;
    if (wind) {
      this.tweens.addCounter({
        from: wind.amp,
        to: 0,
        duration: 900,
        ease: 'Sine.easeOut',
        onUpdate: (tw) => {
          wind.amp = tw.getValue() ?? 0;
        },
      });
    }

    this.tweens.killTweensOf(this.stalk);
    if (pick === 'leave') {
      this.tweens.add({ targets: this.stalk, alpha: 0, duration: 600, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: this.bound, alpha: 1, duration: 900, ease: 'Sine.easeInOut' });
    } else {
      // Cut or pulled: it goes over and is gone, and nothing replaces it.
      this.tweens.add({
        targets: this.stalk,
        angle: 80,
        y: this.stalk.y + 40,
        duration: 300,
        ease: 'Cubic.easeIn',
        onComplete: () => this.tweens.add({ targets: this.stalk, alpha: 0, duration: 250 }),
      });
    }
  }
}
