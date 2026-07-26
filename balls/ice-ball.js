import { Ball } from "./ball.js";
import { Particle } from "../particle.js";

export class IceBall extends Ball {
  get color() { return "#AEF1FF"; }
  get type() { return "ice"; }
  get name() { return "冰霜球"; }

  get cd() {
    return 5;
  }

  onSkill() {
    new Particle({
      type: "ice",
      x: this.x.add(this.v.scaleTo(this.radius)),
      v: this.v,
      maxCollision: 3
    }, this);
  }
}