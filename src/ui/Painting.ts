import Phaser from 'phaser';
import { Layout } from '../core/theme';
import { applyGrade } from '../fx/GradePipeline';

type Placeable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * A scene's background painting and everything set into it — the granary, the
 * bridge, the cat, the double ear, the Devil — held as one group.
 *
 * The slow drift in `Atmosphere` scales whatever it is handed. Handed the bare
 * background, it slid the painting out from under the sprites standing on it,
 * by up to twenty pixels at the edges of the frame, so buildings swam on their
 * foundations. Drifting the group keeps them planted. The wind shader goes on
 * the group for the same reason: the rye and the stalk move together, and the
 * UI on top stays still.
 *
 * Callers keep working in screen coordinates; `add` converts.
 */
export class Painting {
  readonly root: Phaser.GameObjects.Container;
  readonly bg: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, key: string) {
    const { width, height } = Layout;
    // Centred, so scaling the group pushes in toward the middle of the frame.
    this.root = scene.add.container(width / 2, height / 2);
    this.bg = scene.add.image(0, 0, key).setDisplaySize(width, height);
    this.root.add(this.bg);
    // Every painting through the same grade, so the scenes read as one hand.
    applyGrade(this.root);
  }

  /**
   * Sets an object into the painting at its current screen position. Children
   * draw in the order they are added; depth has no effect inside the group.
   */
  add<T extends Placeable>(obj: T): T {
    obj.setPosition(obj.x - Layout.width / 2, obj.y - Layout.height / 2);
    this.root.add(obj);
    return obj;
  }

  /** Moves an object already in the painting to a screen position. */
  setScreenPosition(obj: Phaser.GameObjects.Components.Transform, x: number, y: number): void {
    obj.setPosition(x - Layout.width / 2, y - Layout.height / 2);
  }
}
