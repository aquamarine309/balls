import { Ball } from "./ball.js";
import { GlobalRNG } from "../global-rng.js";
import { size } from "../layout.js";

export class WDCBall extends Ball {
  get color() { return "#0355ff"; }
  get type() { return "wdc"; }
  get cd() { return 3; }
  get skillTime() { return 5; }
  get name() { return "WDC"; }

  gridDamages = new Array(9).fill(0);

  onSkill() {
    for (let i = 0; i < 9; i++) {
      const random = GlobalRNG.random();
      this.gridDamages[i] = Math.floor(random ** 3 * 30) + 5;
    }
  }

  onCollision(ball, pos) {
    if (!this.isSkillActive) return;
    const x = Math.floor(3 * pos.x / size);
    const y = Math.floor(3 * pos.y / size);
    ball.receiveDamage(this.gridDamages[3 * y + x]);
  }
}