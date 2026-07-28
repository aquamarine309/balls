import { loadImages } from "./image-manager.js";
import { init, render } from "./render.js";
import { initOptions } from "./options.js";

initOptions();
init();
export const GameImages = loadImages(["arrow"], () => {
  render();
  document.querySelector("#loading").remove();
});