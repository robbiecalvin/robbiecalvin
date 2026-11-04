export function frames(pageCount, spread = true) {
  if (!Number.isInteger(pageCount) || pageCount < 0) throw new RangeError('Invalid page count');
  const result = [[-1]];
  const step = spread ? 2 : 1;
  for (let i = 0; i < pageCount; i += step) result.push(Array.from({length: Math.min(step, pageCount - i)}, (_, offset) => i + offset));
  return result;
}

export function frameIndex(page, pageCount, spread = true) {
  if (page < 0 || pageCount === 0) return 0;
  return Math.floor(Math.min(page, pageCount - 1) / (spread ? 2 : 1)) + 1;
}

export function turn(page, pageCount, spread = true, direction = 1) {
  const list = frames(pageCount, spread);
  const next = Math.max(0, Math.min(list.length - 1, frameIndex(page, pageCount, spread) + direction));
  return list[next][0];
}
