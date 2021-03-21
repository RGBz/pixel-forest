const NEARBY_THRESHOLD = 15;

export function getRandom(min, max) {
  const range = max - min;
  return Math.floor(Math.random() * range) - min;
}

export function getNearbyValue(n, threshold = NEARBY_THRESHOLD, min, max) {
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

export function isSameColor(a, b) {
  return (
    a.r === b.r &&
    a.g === b.g &&
    a.b === b.b
  );
}

export function createColor(r, g, b, a = 255) {
  return { r, g, b, a};
}

export function getNearbyColor(rgba, threshold) {
  return {
    r: getNearbyValue(rgba.r, threshold, 0, 255),
    g: getNearbyValue(rgba.g, threshold, 0, 255),
    b: getNearbyValue(rgba.b, threshold, 0, 255),
    a: rgba.a
  }
}
