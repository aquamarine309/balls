import { Ball } from "./ball.js";

export class KarabiBall extends Ball {
  get color() { return "#4F8EFA"; }
  get type() { return "karabi"; }
  get name() { return "卡拉比"; }
  get cd() { return 6; }
}