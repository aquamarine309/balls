import { Vector } from "../vector.js";
import { Ball } from "./ball.js";
import { Particle } from "../particle.js";

export class HealingBall extends Ball {
  get color() { return "#60fe92"; }
  get type() { return "healing"; }
  get name() { return "治疗球"; }

  get cd() {
    return 10;
  }

  onSkill() {
    let directions = [
      new Vector(1, 0),
      new Vector(-1, 0),
      new Vector(0, 1),
      new Vector(0, -1)
    ];
    if (this.life <= 30) {
      directions.push(
        new Vector(-1, -1),
        new Vector(-1, 1),
        new Vector(1, 1),
        new Vector(1, -1)
      )
    }
    for (const v of directions) {
      new Particle({
        type: "healing",
        x: this.x.add(v.scaleTo(this.radius)),
        v,
        maxCollision: 4
      }, this);
    }
  }
}