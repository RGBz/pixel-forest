// @flow
export type RGBA = {
  r: number,
  g: number,
  b: number,
  a: number,
};

const NEARBY_THRESHOLD = 15;

export function getRandom(min: number, max: number) {
  const range = max - min;
  return Math.floor(Math.random() * range) - min;
}

export function getNearbyValue(n: number, threshold = NEARBY_THRESHOLD, min, max): n {
  const variance = getRandom(0, threshold);
  const negate = !!getRandom(0, 1);
  const nearby = n + (negate ? -variance : variance);
  if (nearby < min) {
    return min;
  } else if (nearby > max) {
    return max;
  }
  return nearby;
}

export function isSameColor(a: RGBA, b: RGBA): boolean {
  return (
    a.r === b.r &&
    a.g === b.g &&
    a.b === b.b
  );
}

export function createColor(r, g, b, a = 255) {
  return { r, g, b, a};
}

export function getNearbyColor(rgba: RGBA, threshold): RGBA {
  return {
    r: getNearbyValue(rgba.r, threshold, 0, 255),
    g: getNearbyValue(rgba.g, threshold, 0, 255),
    b: getNearbyValue(rgba.b, threshold, 0, 255),
    a: rgba.a
  }
}
