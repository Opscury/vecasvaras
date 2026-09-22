import Phaser from 'phaser';
import { flags } from '../core/flags';

/**
 * One grade over every painting, so the village, the field and the bog read as
 * the work of one painter on one kind of canvas.
 *
 * They were generated separately and it shows side by side: the bog is cooler
 * and more saturated than the village, the field's blacks are deeper than
 * either. Retouching each would drift again with the next picture. A single
 * pass that every painting goes through does not:
 *
 *   - a tenth of the saturation out, so no scene out-shouts the others
 *   - shadows nudged cool and highlights warm — the northern-overcast split
 *   - a gentle S-curve for body
 *   - blacks lifted a little towards warm ink, like oil over a toned ground
 *   - a soft vignette, and a whisper of canvas grain that does not move
 *
 * It goes on the painting group, not the camera, so text and UI stay clean.
 */
const frag = `
#define SHADER_NAME VECAS_VARAS_GRADE
precision mediump float;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  vec3 col = c.rgb;
  float l = dot(col, vec3(0.299, 0.587, 0.114));

  col = mix(vec3(l), col, 0.9);
  col += vec3(-0.012, 0.004, 0.02) * (1.0 - l) + vec3(0.022, 0.012, -0.012) * l;
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.32);
  col = vec3(0.05, 0.043, 0.036) + col * 0.95;

  vec2 d = outTexCoord - 0.5;
  float v = smoothstep(0.86, 0.3, length(d * vec2(1.0, 1.12)));
  col *= mix(0.8, 1.0, v);

  float g = fract(sin(dot(floor(gl_FragCoord.xy / 1.5), vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.02;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * c.a, c.a);
}
`;

export class GradePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'GradePipeline', fragShader: frag });
  }
}

export const GRADE_KEY = 'GradePipeline';

/** Puts the house grade on a painting (or a bare background image). */
export function applyGrade(target: Phaser.GameObjects.Container | Phaser.GameObjects.Image): void {
  if (!flags.fx) return;
  const renderer = target.scene.game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  renderer.pipelines.addPostPipeline(GRADE_KEY, GradePipeline);
  target.setPostPipeline(GRADE_KEY);
}
