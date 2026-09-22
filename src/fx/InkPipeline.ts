import Phaser from 'phaser';

/**
 * Scene changes as ink, not as a fade.
 *
 * A camera fade is the one moment in the game that looks like software: the
 * whole frame dims evenly, as a monitor does. Ink does not arrive evenly. It
 * comes in from the edges of the sheet, faster along some fibres than others,
 * with a darker, warmer wet line running ahead of it — and it leaves the same
 * way, the middle of the picture clearing first.
 *
 * A camera post pass: it covers the UI as well as the painting, which is what
 * a transition has to do. `uProgress` 0 is clear, 1 is all ink. The noise is
 * computed in the shader, so there is no texture to load.
 */
const frag = `
#define SHADER_NAME VECAS_VARAS_INK
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uProgress;
uniform float uAspect;
uniform float uSeed;
varying vec2 outTexCoord;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = outTexCoord;
  vec4 col = texture2D(uMainSampler, uv);

  // 0 in the middle of the frame, about 1 in the corners: the ink finds the
  // edges first.
  vec2 c = (uv - 0.5) * vec2(1.0, 0.82);
  float edge = length(c) * 1.4;
  float field = mix(edge, fbm(uv * vec2(uAspect, 1.0) * 3.4), 0.55);

  // The front. Below it the paper is still dry; above it, ink.
  float front = 1.15 - uProgress * 1.35;
  float inked = smoothstep(front - 0.035, front + 0.035, field);
  // The wet line just ahead of the front: darker and browner than the ink
  // that has settled.
  float wet = smoothstep(front - 0.11, front - 0.02, field) * (1.0 - inked);

  vec3 ink = vec3(0.078, 0.086, 0.102);
  vec3 sepia = vec3(0.17, 0.115, 0.07);
  vec3 outc = mix(col.rgb, sepia, wet * 0.6);
  outc = mix(outc, ink, inked);
  gl_FragColor = vec4(outc, 1.0);
}
`;

export class InkPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  progress = 0;
  private seed = Math.random() * 100;

  constructor(game: Phaser.Game) {
    super({ game, name: 'InkPipeline', fragShader: frag });
  }

  /** A new pattern of fibres for each transition, so no two look alike. */
  reseed(): void {
    this.seed = Math.random() * 100;
  }

  onPreRender(): void {
    this.set1f('uProgress', this.progress);
    this.set1f('uAspect', this.renderer.width / Math.max(1, this.renderer.height));
    this.set1f('uSeed', this.seed);
  }
}

export const INK_KEY = 'InkPipeline';

/**
 * The camera's ink pass, registered and attached, or null on Canvas.
 *
 * Attached once per scene visit and then only switched on and off: a pass
 * removed from the camera and added again came back drawing solid black.
 */
export function inkOn(scene: Phaser.Scene): InkPipeline | null {
  const renderer = scene.game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  renderer.pipelines.addPostPipeline(INK_KEY, InkPipeline);
  const cam = scene.cameras.main;
  const find = (): InkPipeline | null => {
    const pipe = cam.getPostPipeline(INK_KEY) as unknown as InkPipeline | InkPipeline[] | undefined;
    const one = Array.isArray(pipe) ? pipe[0] : pipe;
    return one ?? null;
  };
  let ink = find();
  if (!ink) {
    cam.setPostPipeline(INK_KEY);
    ink = find();
  }
  if (ink) ink.active = true;
  return ink;
}

/** Switches the pass off once the frame is clear, so it costs nothing while playing. */
export function inkOff(scene: Phaser.Scene): void {
  // On shutdown the camera may already be gone.
  const cam = scene.cameras?.main;
  if (!cam) return;
  const pipe = cam.getPostPipeline(INK_KEY) as unknown as InkPipeline | InkPipeline[] | undefined;
  const ink = Array.isArray(pipe) ? pipe[0] : pipe;
  if (ink) ink.active = false;
}
