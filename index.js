// @flow
import fs from 'fs';
import Jimp from 'jimp';
import async from 'async';
import { getNearbyColor, createColor, isSameColor } from './color-util';
import GIFEncoder from 'gifencoder';
import pngFileStream from 'png-file-stream';

function pad(n: number) {
  if (n < 10) {
    return `0${n}`;
  }
  return `${n}`;
}

const FPS = 8;
const DELAY = 1000 / FPS;
const FRAME_COUNT = FPS;
const SCALE = 10;

const ignoreColor = createColor(33, 33, 33);

function paintRect(image, color, x, y, w, h) {
  for (let i = x; i < x + w; i += 1) {
    for (let j = y; j < y + h; j += 1) {
      image.setPixelColor(color, i, j);
    }
  }
}

function createVariation(srcImage, scale, callback) {
  new Jimp(srcImage.bitmap.width * scale, srcImage.bitmap.height * scale, function (err, dstImage) {
    if (err) {
      return callback(err);
    }
    for (let y = 0; y < srcImage.bitmap.height; y += 1) {
      for (let x = 0; x < srcImage.bitmap.width; x += 1) {
        const colorHex = srcImage.getPixelColor(x, y);
        const color = Jimp.intToRGBA(colorHex);
        if (!isSameColor(ignoreColor, color)) {
          const nearbyColor = getNearbyColor(color, 32);
          const nearbyHex = Jimp.rgbaToInt(
            nearbyColor.r, nearbyColor.g, nearbyColor.b, 255,
          );
          paintRect(dstImage, nearbyHex, x * scale, y * scale, scale, scale);
        } else {
          paintRect(dstImage, colorHex, x * scale, y * scale, scale, scale);
        }
      }
    }
    callback(null, dstImage);
  });
}

function createFrames(srcImage, count, outputDir, callback) {
  async.times(
    count,
    (frame, next) => {
      createVariation(srcImage, SCALE, (err, dstImage) => {
        const filename = `${outputDir}/${pad(frame)}.png`;
        console.log('Creating frame', filename)
        dstImage.write(filename, next);
      });
    },
    callback,
  );
}

function createAnimatedGif(inputFilename, name, outputDir, callback) {
  console.log('Loading source for', name);
  Jimp.read(inputFilename, (err, srcImage) => {
    if (err) throw err;
    const frameDir = `${outputDir}/${name}`;
    console.log('Creating frames for', name);
    fs.mkdir(frameDir, (err) => {
      createFrames(srcImage, FRAME_COUNT, frameDir, (err) => {
        if (err) console.error(err);
        console.log('Creating GIF for', name);
        const encoder = new GIFEncoder(srcImage.bitmap.width * SCALE, srcImage.bitmap.height * SCALE);
        pngFileStream(`${frameDir}/*.png`)
          .pipe(encoder.createWriteStream({ repeat: 0, delay: DELAY, quality: 10 }))
          .pipe(fs.createWriteStream(`${name}.gif`))
          .on('finish', callback)
          .on('error', callback);
      });
    });
  });
}

function createFlatPic(inputFilename, name) {
  Jimp.read(inputFilename, (err, srcImage) => {
    if (err) throw err;
    const outputFilename = `${name}-big.png`;
    createVariation(srcImage, 10, (err, dstImage) =>
      dstImage.write(outputFilename),
    );
  });
}

fs.readdir('resources', (err, files) =>
  async.each(
    files,
    (file, next) => {
      const pngIndex = file.indexOf('.png');
      if (pngIndex >= 0) {
        const stem = file.substring(0, pngIndex);
        createAnimatedGif(`resources/${stem}.png`, stem, 'output', next);
        createFlatPic(`resources/${stem}.png`, stem);
      }
    },
    (err) => {
      if (err) console.error(err);
      console.log('Done.');
    }
  ),
);
