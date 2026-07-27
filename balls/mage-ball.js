import { Ball } from "./ball.js";
import { Particle } from "../particle.js";
import { inner, ctx } from "../layout.js";

export class MageBall extends Ball {
  get color() { return "#ceaef3"; }
  get type() { return "mage"; }
  get name() { return "法师"; }
  get cd() { return 0.5; }

  count = 0;

  onSkill() {
    new Particle({
      type: "magicball",
      effect: ["fire", "ice", "health"][this.count % 3],
      x: this.x.add(this.vDirection.scaleTo(this.radius * 3)),
      v: this.vDirection.rotate(),
      maxCollision: 0,
      trail: false
    }, this);
    this.count++;
  }
  
  draw() {
    super.draw();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = this.color;
    ctx.arc(this.x.x, this.x.y, this.radius * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
}