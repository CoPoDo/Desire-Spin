import type { LineSlotProfile } from '../_shared/lineEngine';

export type PharaohLines = 1 | 2 | 3;
export const PHARAOH_RULE_SOURCE = 'https://www.coolcat-casino.com/slots/pharaohs-gold.php';
// Source verifies center-first activation; second/third horizontal placement
// and blank-stop frequencies are local pending an original machine rulebook.
const LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2]] as const;

/** Source-backed classic rules with expressly provisional Ankh pay and no
 * simulated network progressive. All pays below are coins per enabled line.
 * Operator prose inconsistently names Ankh/Mask for the top prize; we pin
 * the numerical paytable's Mask row and disclose that conflict in the audit. */
export const PHARAOH_PROFILE: LineSlotProfile = {
  id: 'pharaoh-gold', cols: 3, rows: 3, paylines: LINES, maxWin: 2500,
  wildId: 'eye', feature: 'classic', freeSpins: 0,
  symbols: [
    { id: 'pharaoh', weight: 10, pay: { 3: 50 }, payByLine: [{ 3: 50 }, { 3: 50 }, { 3: 100 }] },
    { id: 'ankh', weight: 12, pay: { 3: 25 } }, // Provisional local pay; absent from source table.
    { id: 'scarab', weight: 14, pay: { 3: 25 } },
    { id: 'cobra', weight: 28, pay: { 2: 2, 3: 5 } },
    { id: 'eye', weight: 1, wild: true },
    { id: 'blank', weight: 12 },
  ],
};

/** The UI passes a total stake; the shared evaluator divides it equally
 * among these active lines. A selected line count cannot change mid-round. */
export function pharaohProfileForLines(activeLines: PharaohLines): LineSlotProfile {
  if (!Number.isInteger(activeLines) || activeLines < 1 || activeLines > 3) throw new RangeError('Choose one, two or three Pharaoh lines');
  return { ...PHARAOH_PROFILE, paylines: LINES.slice(0, activeLines) };
}
