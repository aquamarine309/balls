export function loadImages(fileNames, callback) {
  const images = {};
  let loadedCount = 0;
  const totalCount = fileNames.length;

  for (const name of fileNames) {
    const path = `./images/${name}.png`;
    const img = new Image();
    img.src = path;
    images[name] = img;
    img.onload = function() {
      loadedCount++;
      if (loadedCount === totalCount) {
        callback(images);
      }
    }
  }
  return images;
}