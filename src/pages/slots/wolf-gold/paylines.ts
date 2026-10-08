/** Visually transcribed from page2 of the provider-authored original rules:
 * https://yesplay.bet/assets/documents/pragmatic-play-Wolf-Gold-rules.pdf
 * Zero-based rows, left to right; order matches the numbered diagram. */
export const WOLF_PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1], [1, 0, 1, 2, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2],
  [1, 2, 0, 2, 1], [1, 0, 2, 0, 1], [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
];
