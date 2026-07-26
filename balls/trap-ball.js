import { Ball } from "./ball.js";
import { GlobalRNG } from "../global-rng.js";
import { inner } from "../layout.js";
import { AOE } from "../aoe.js";

export class TrapBall extends Ball {
  get color() { return "#fe6958"; }
  get type() { return "trap"; }
  get cd() { return 4; }
  get skillTime() { return 0; }
  get name() { return "陷阱师"; }

  onSkill() {
    const balls = Ball.all.filter(x => x !== this);
    let pos = null;
    if (balls.length === 0) {
      pos = new Vector(GlobalRNG.random() * size, GlobalRNG.random() * size);
    } else {
      const idx = Math.floor(balls.length * GlobalRNG.random());
      const ball = balls[idx];
      pos = ball.x;
    }
    new AOE({
      center: pos,
      radius: inner * 0.15,
      lifeTime: 4.5,
      border: true,
      readyTime: 0.4
    }, this);
  }
}