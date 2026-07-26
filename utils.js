import { GlobalRNG } from "./global-rng.js";

export function randomElement(array) {
  return array[Math.floor(array.length * GlobalRNG.random())];
}

export function clamp(x, min, max) {
  return Math.min(max, Math.max(x, min));
}