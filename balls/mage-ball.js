import { Ball } from "./ball.js";
import { Particle } from "../particle.js";

export class MageBall extends Ball {
  get color() { return "#fe8093"; }
  get type() { return "mage"; }
  get name() { return "法师"; }
  get cd() { return 0.3; }

  count = 0;

  onSkill() {
    new Particle({
      type: "magicball",
      effect: ["fire", "ice", "health"][this.count % 3],
      x: this.x.add(this.vDirection.scaleTo(this.radius * 2)),
      v: this.vDirection.rotate(),
      maxCollision: 0
    }, this);
    this.count++;
  }
}