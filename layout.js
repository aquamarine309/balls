export const border = 2;
export const inner = 600;
export const size = inner + border * 2;

export const canvas = document.querySelector("canvas");
export const ctx = canvas.getContext("2d");
canvas.width = size;
canvas.height = size;