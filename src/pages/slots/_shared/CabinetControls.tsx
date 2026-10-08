import { fmtCurrency } from '../../../lib/format';
import { MinusIcon, PlusIcon, SpinArrowIcon, StopIcon } from '../../../components/ui/icons';
import type { ReactNode } from 'react';

/** A physical control rail kept next to its board on every viewport. */
export function CabinetControls({ bet, win, busy, spinDisabled, controlsDisabled, onSpin, onDecrease, onIncrease, onBet, decreaseDisabled, increaseDisabled, spinLabel, toolbar }: {
  bet: number; win: number; busy: boolean; spinDisabled?: boolean; controlsDisabled?: boolean;
  onSpin: () => void; onDecrease: () => void; onIncrease: () => void; onBet: () => void;
  decreaseDisabled?: boolean; increaseDisabled?: boolean; spinLabel?: string; toolbar: ReactNode;
}) {
  return <div className="cabinet-controls">
    <div className="cabinet-console">
      <div className="cabinet-bet"><span className="cabinet-label">Total bet</span><div className="cabinet-stepper">
        <button aria-label="Decrease bet" disabled={controlsDisabled || decreaseDisabled} onClick={onDecrease}><MinusIcon size={12} /></button>
        <button aria-label="Choose bet" className="cabinet-bet-value" disabled={controlsDisabled} onClick={onBet}>{fmtCurrency(bet)}</button>
        <button aria-label="Increase bet" disabled={controlsDisabled || increaseDisabled} onClick={onIncrease}><PlusIcon size={12} /></button>
      </div></div>
      <div className="cabinet-win"><span className="cabinet-label">Round win</span><strong>{fmtCurrency(win)}</strong></div>
      <button className="cabinet-spin" aria-label={spinLabel ?? (busy ? 'Skip to result' : 'Spin')} onClick={onSpin} disabled={spinDisabled}>
        {busy || spinLabel === 'Stop autoplay' ? <StopIcon size={24} /> : <SpinArrowIcon size={27} strokeWidth={2} />}<span>{spinLabel === 'Stop autoplay' ? 'Stop' : busy ? 'Skip' : 'Spin'}</span>
      </button>
    </div>
    <div className="cabinet-toolbar">{toolbar}</div>
  </div>;
}
