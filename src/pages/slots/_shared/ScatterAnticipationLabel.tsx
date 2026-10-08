import type { SlotConfig } from './types';

/** A visual hint only; free-spin awards still come from engine events. */
export function ScatterAnticipationLabel({ count, cfg, inFree }: {
  count: number;
  cfg: Pick<SlotConfig, 'scatterTriggerCount' | 'scatterRetriggerCount'>;
  inFree: boolean;
}) {
  const threshold = inFree ? cfg.scatterRetriggerCount : cfg.scatterTriggerCount;
  const missing = Math.max(0, threshold - count);
  const hint = missing > 0
    ? `${missing} from ${inFree ? 'retrigger' : 'bonus'}!`
    : inFree ? 'Retrigger symbols' : 'Bonus symbols';
  return <>{count} scatters · {hint}</>;
}
