import Phaser from 'phaser';
import { flags } from '../core/flags';

/**
 * A post-processing pass that pushes pixels sideways in slow travelling waves,
 * confined to a band: nothing above the horizon line moves, and nothing below
 * the ground line moves either.
 *
 * This is what makes the rye move. Particles drifting over a photograph of a
 * field still read as a photograph of a field; displacing the crop itself is
 * the difference between "picture with dust on it" and "windy afternoon".
 *
 * Two sine waves at different frequencies are summed so the motion never
 * repeats visibly, and a third very slow wave swells the amplitude so gusts
 * come and go instead of the whole field vibrating at a constant rate.
 *
 * The band matters as much as the waves. Ramping the amplitude all the way to
 * the bottom edge put the strongest displacement on the near foreground — the
 * cut stubble, the grass verge, the boundary stone and the sickle lying on it —
 * so the ground itself rippled. Solid things must stand still; only the crop
 * between the two lines moves.
 *
 * It goes on the painting group (see `Painting`), not the camera. On the
 * camera it also rippled every piece of text and UI drawn over the field.
 *
 * WebGL only. `attachWind` checks the renderer and no-ops on Canvas, so the
 * game still runs (just still) on a machine that fell back.
 */

const frag = `
#define SHADER_NAME VECAS_VARAS_WIND

precision mediump float;

uniform sampler2D uMainSampler;
uniform float uAmp;
uniform float uHorizon;
uniform float uGround;
uniform float uGust;
uniform float uPhase1;
uniform float uPhase2;

varying vec2 outTexCoord;

void main ()
{
    vec2 uv = outTexCoord;

    // The render target's v runs bottom-up, so this is the distance DOWN from
    // the top of the frame. An earlier version read uv.y directly, which put
    // all the wind in the sky and left the rye standing dead still.
    float down = 1.0 - uv.y;

    // Nothing above the horizon moves: sky and treeline must stay rock steady,
    // or the whole illusion reads as a wobbling video rather than wind.
    float rise = smoothstep(uHorizon, uHorizon + 0.15, down);

    // And nothing below the ground line moves either. The near foreground is
    // earth and objects lying on it, not crop; displacing it made the ground
    // itself wave. The fall-off is spread over the last tenth so the crop does
    // not stop dead along a visible seam.
    float fall = 1.0 - smoothstep(uGround - 0.10, uGround, down);

    float depth = rise * fall;

    // Two travelling waves, deliberately non-harmonic so they never line up.
    float w1 = sin(down * 15.0 + uPhase1);
    float w2 = sin(down * 27.0 - uv.x * 4.0 + uPhase2);

    uv.x += (w1 * 0.65 + w2 * 0.35) * uAmp * depth * uGust;

    // Clamp so the edge columns never sample outside the texture and smear.
    uv.x = clamp(uv.x, 0.0005, 0.9995);

    gl_FragColor = texture2D(uMainSampler, uv);
}
`;

const TAU = Math.PI * 2;

export class WindPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** Sideways displacement in UV units. 0.003 ≈ 6px at 1920 wide. */
  amp = 0.0028;
  /** Everything above this fraction of the screen is left alone. */
  horizon = 0.42;
  /** Everything below this fraction of the screen is left alone — the foreground. */
  ground = 0.82;

  private elapsed = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'WindPipeline', fragShader: frag });
  }

  /**
   * Runs once per frame for the object the pass is attached to. (`onPreRender`
   * is only called for camera-level passes, so the clock has to live here.)
   */
  onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
    // game.loop.delta rather than a wall clock, so the effect slows down with
    // the game instead of jumping after a stall.
    this.elapsed += this.game.loop.delta / 1000;

    // The clock becomes wave phases here, in double precision, wrapped to one
    // turn. Sent to the shader raw, it outgrows a mediump float within a minute
    // or two on phones with genuine 16-bit shader floats, and the wind stutters.
    this.set1f('uPhase1', (this.elapsed * 1.45) % TAU);
    this.set1f('uPhase2', (this.elapsed * 0.87) % TAU);
    // Gusts: a slow envelope so the field breathes instead of buzzing. It never
    // drops below 40% — at 10% the rye stood dead still for seconds at a time.
    this.set1f('uGust', 0.7 + 0.3 * Math.sin(this.elapsed * 0.23));
    this.set1f('uAmp', this.amp);
    this.set1f('uHorizon', this.horizon);
    this.set1f('uGround', this.ground);

    this.bindAndDraw(target);
  }
}

export const WIND_KEY = 'WindPipeline';

/** Registers the pipeline with the renderer. Safe to call from any scene, any number of times. */
export function registerWind(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  // addPostPipeline ignores a name it already holds, so repeating this is free.
  renderer.pipelines.addPostPipeline(WIND_KEY, WindPipeline);
  return true;
}

/**
 * Puts the wind on one object — normally a scene's `Painting` group. Returns
 * the pipeline so a scene can retune the amplitude (a gust during a story
 * beat, say), or null if we are on Canvas or effects are off.
 */
export function attachWind(
  target: Phaser.GameObjects.Container | Phaser.GameObjects.Image,
  opts: { amp?: number; horizon?: number; ground?: number } = {},
): WindPipeline | null {
  if (!flags.fx) return null;
  if (!registerWind(target.scene.game)) return null;
  target.setPostPipeline(WIND_KEY);
  const pipe = target.getPostPipeline(WIND_KEY) as unknown as WindPipeline | WindPipeline[] | undefined;
  const wind = Array.isArray(pipe) ? pipe[0] : pipe;
  if (!wind) return null;
  if (opts.amp !== undefined) wind.amp = opts.amp;
  if (opts.horizon !== undefined) wind.horizon = opts.horizon;
  if (opts.ground !== undefined) wind.ground = opts.ground;
  return wind;
}
