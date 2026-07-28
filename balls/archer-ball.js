import { Ball } from "./ball.js";
import { Particle } from "../particle.js";

export class ArcherBall extends Ball {
  get color() { return "#ff9800"; }
  get type() { return "archer"; }
  get name() { return "弓箭手V2"; }

  count = 0;
  get cd() {
    const count = this.count ?? 0;
    return 0.4 + Math.pow(0.97, count) * (count % 2 === 0 ? 1.5 : 0.2);
  }

  onSkill() {
    this.count++;
    let nearset = null;
    let min = Infinity;
    for (const ball of Ball.all) {
      if (ball === this) continue;
      const distance = ball.x.minus(this.x).length;
      if (distance < min) {
        nearset = ball;
        min = distance;
      }
    }
    const direction = nearset ? nearset.x.minus(this.x) : this.v;
    new Particle({
      type: "arrow",
      x: this.x.add(direction.scaleTo(this.radius)),
      v: direction,
      maxCollision: 0,
      target: nearset
    }, this);
  }
}