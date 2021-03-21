import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import Jimp from 'jimp';
import { getNearbyColor, createColor, isSameColor } from './color-util';
import GIFEncoder from 'gifencoder';
import pngFileStream from 'png-file-stream';

function pad(n) {
  if (n < 10) {
    return `0${n}`;
  }
  return `${n}`;
}

const FPS = 8;
const DELAY = 1000 / FPS;
const FRAME_COUNT = FPS;
const SCALE = 4;

const ignoreColor = createColor(33, 33, 33);

function paintRect(image, color, x, y, w, h) {
  for (let i = x; i < x + w; i += 1) {
    for (let j = y; j < y + h; j += 1) {
      image.setPixelColor(color, i, j);
    }
  }
}

async function createVariation(srcImage, scale) {
  const dstImage = await new Jimp(srcImage.bitmap.width * scale, srcImage.bitmap.height * scale);
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
  return dstImage;
}

function createFrames(srcImage, count, outputDir) {
  return Promise.all(
    new Array(count).fill(true).map(async (_, i) => {
      const dstImage = await createVariation(srcImage, SCALE);
      const filename = `${outputDir}/${pad(i)}.png`;
      console.log('Creating frame', filename);
      return new Promise((resolve, reject) =>
        dstImage.write(filename, err =>
          err ? reject(err) : resolve()
        )
      );
    })
  );
}

async function createAnimatedGif(inputFilename, name, outputDir) {
  console.log('Loading source for', name);
  const srcImage = await Jimp.read(inputFilename);
  const frameDirpath = `${outputDir}/${name}`;

  console.log('Creating frames for', name);
  try {
    await fs.access(frameDirpath);
  } catch (e) {
    await fs.mkdir(frameDirpath);
  }

  await createFrames(srcImage, FRAME_COUNT, frameDirpath);

  console.log('Creating GIF for', name);
  const encoder = new GIFEncoder(srcImage.bitmap.width * SCALE, srcImage.bitmap.height * SCALE);

  return new Promise((resolve, reject) => {
    try {
      pngFileStream(`${frameDirpath}/*.png`)
        .pipe(encoder.createWriteStream({ repeat: 0, delay: DELAY, quality: 10 }))
        .pipe(createWriteStream(`gallery/${name}.gif`))
        .on('finish', resolve)
        .on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function createFlatPic(inputFilename, name) {
  const srcImage = await Jimp.read(inputFilename);
  const outputFilename = `${name}-big.png`;
  const dstImage = await createVariation(srcImage, 10);
  dstImage.write(outputFilename);
}

async function main() {
  const files = await fs.readdir('resources');
  const html = [];
  await Promise.all(files.map(async file => {
    const pngIndex = file.indexOf('.png');
    if (pngIndex >= 0) {
      const stem = file.substring(0, pngIndex);
      const name = stem.split('-').join(' ');
      html.push(`  <div><img src="gallery/${stem}.gif" title="${name}" />${name}</div>`);
      await createAnimatedGif(`resources/${stem}.png`, stem, '.output');
      // await createFlatPic(`resources/${stem}.png`, stem);
    }
  }));
  const htmlTemplate = await fs.readFile('template.html', 'utf-8');
  await fs.writeFile('index.html', htmlTemplate.replace('$$$', html.join('\n')));
}

main().catch(console.error);
