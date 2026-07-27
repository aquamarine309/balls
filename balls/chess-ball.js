import { Ball } from "./ball.js";
import { size } from "../layout.js";
import { Vector } from "../vector.js";
import { randomElement } from "../utils.js";

export class ChessBall extends Ball {
  get color() { return "#EBB95E"; }
  get type() { return "chess"; }
  get cd() { return 5; }
  get skillTime() { return 3; }
  get name() { return "象棋"; }
  get isInvincible() { return this.isSkillActive; }
  
  path = null;
  
  onSkill() {
    this.lastDirection = this.vDirection;
    const dt = 1.5 / 22;
    this.path = randomElement([
      new ChessPath([
        { node: this.x, duration: 0.5 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.65 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.15 },
        { node: new Vector(size * 0.1, size * 0.5), duration: 0.3 },
        { node: new Vector(size * 0.9, size * 0.5), duration: 0.15 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.15 },
        { node: new Vector(size * 0.5, size * 0.1), duration: 0.3 },
        { node: new Vector(size * 0.5, size * 0.9), duration: 0.15 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.65 }
      ]),
      new ChessPath([
        { node: this.x, duration: 0.5 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.65 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.15 },
        { node: new Vector(size * 0.1, size * 0.1), duration: 0.3 },
        { node: new Vector(size * 0.9, size * 0.9), duration: 0.15 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.15 },
        { node: new Vector(size * 0.9, size * 0.1), duration: 0.3 },
        { node: new Vector(size * 0.1, size * 0.9), duration: 0.15 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.65 }
      ]),
      new ChessPath([
        { node: this.x, duration: 0.65 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.4 },
        { node: new Vector(size * 0.5, size * 0.5), duration: dt },
        { node: new Vector(size * 0.3, size * 0.5), duration: dt * 2 },
        { node: new Vector(size * 0.3, size * 0.1), duration: dt * 2 },
        { node: new Vector(size * 0.3, size * 0.5), duration: dt * 2 },
        { node: new Vector(size * 0.7, size * 0.5), duration: dt * 2 },
        { node: new Vector(size * 0.7, size * 0.9), duration: dt * 2 },
        { node: new Vector(size * 0.7, size * 0.5), duration: dt },
        { node: new Vector(size * 0.9, size * 0.5), duration: dt },
        { node: new Vector(size * 0.9, size * 0.3), duration: dt },
        { node: new Vector(size * 0.9, size * 0.5), duration: dt * 4 },
        { node: new Vector(size * 0.1, size * 0.5), duration: dt },
        { node: new Vector(size * 0.1, size * 0.7), duration: dt },
        { node: new Vector(size * 0.1, size * 0.5), duration: dt * 2 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.45 }
      ]),
      new ChessPath([
        { node: this.x, duration: 0.65 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.4 },
        { node: new Vector(size * 0.5, size * 0.5), duration: dt },
        { node: new Vector(size * 0.5, size * 0.3), duration: dt * 2 },
        { node: new Vector(size * 0.9, size * 0.3), duration: dt * 2 },
        { node: new Vector(size * 0.5, size * 0.3), duration: dt * 2 },
        { node: new Vector(size * 0.5, size * 0.7), duration: dt * 2 },
        { node: new Vector(size * 0.1, size * 0.7), duration: dt * 2 },
        { node: new Vector(size * 0.5, size * 0.7), duration: dt },
        { node: new Vector(size * 0.5, size * 0.9), duration: dt },
        { node: new Vector(size * 0.7, size * 0.9), duration: dt },
        { node: new Vector(size * 0.5, size * 0.9), duration: dt * 4 },
        { node: new Vector(size * 0.5, size * 0.1), duration: dt },
        { node: new Vector(size * 0.3, size * 0.1), duration: dt },
        { node: new Vector(size * 0.5, size * 0.1), duration: dt * 2 },
        { node: new Vector(size * 0.5, size * 0.5), duration: 0.45 }
      ]),
    ]);
  }
  
  onSkillEnd() {
    this.vDirection = this.lastDirection;
  }

  tick(diff) {
    super.tick(diff, this.isSkillActive);
    if (this.isSkillActive) {
      this.x = this.path.position(this.skillTimer);
    }
  }

  onCollision(ball) {
    if (!this.isSkillActive) return;
    ball.receiveDamage(3);
  }
}

class ChessPath {
  constructor(paths) {
    this.paths = paths;
  }
  
  position(time) {
    let total = 0;
    for (let i = 0; i < this.paths.length - 1; i++) {
      const path = this.paths[i];
      if (time >= total && time < total + path.duration) {
        const rate = (time - total) / path.duration;
        return path.node.times(1 - rate).add(this.paths[i  + 1].node.times(rate));
      }
      total += path.duration;
    }
    return this.paths[this.paths.length - 1].node;
  }
}