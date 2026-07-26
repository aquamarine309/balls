import { AOE } from "./aoe.js";
import { Ball } from "./balls/ball.js";
import { Particle } from "./particle.js"
import { ctx, border, inner, size } from "./layout.js";
import { loadImages } from "./image-manager.js";
import { init, render, setToSeed } from "./render.js";

init();

export const GameImages = loadImages(["arrow"], () => {
  render();
  document.querySelector("#loading").remove();
});