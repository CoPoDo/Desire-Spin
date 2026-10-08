import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGame } from '../../game-context';
import { GAME_REFERENCES } from '../../games/references';
import { Modal } from '../ui/Modal';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';
import { SessionStatsPanel } from '../SessionStatsPanel';

export function GameMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sound } = useGame();
  const { pathname } = useLocation();
  const reference = GAME_REFERENCES.find((game) => game.route === pathname);
  const [panel, setPanel] = useState<'stats' | 'history' | 'fairness' | 'rules' | null>(null);
  const show = (next: typeof panel) => { onClose(); setPanel(next); };
  return <>
    <Modal open={open} onClose={onClose} title="Game menu" width="sm">
      <div className="space-y-2">
        <p className="mb-4 text-xs text-ink-dim">Play-money credits · saved on this device</p>
        <button className="game-menu-item" aria-pressed={sound.enabled} onClick={() => sound.setEnabled(!sound.enabled)}><span>Sound effects</span><span>{sound.enabled ? 'On' : 'Off'}</span></button>
        <button className="game-menu-item" onClick={() => show('rules')}>About this game <span>›</span></button>
        <button className="game-menu-item" onClick={() => show('stats')}>Session stats <span>›</span></button>
        <button className="game-menu-item" onClick={() => show('history')}>Bet history <span>›</span></button>
        <button className="game-menu-item" onClick={() => show('fairness')}>Local fairness <span>›</span></button>
        <Link className="game-menu-item" to="/settings" onClick={onClose}>Settings <span>›</span></Link>
        <Link className="game-menu-item" to="/" onClick={onClose}>Back to lobby <span>↗</span></Link>
      </div>
    </Modal>
    <Modal open={panel === 'rules'} onClose={() => setPanel(null)} title={reference?.title ?? 'About this game'}>
      <div className="space-y-4 text-sm text-ink-dim">
        <p>This is an independent, local play-money recreation. Credits have no monetary value and can be refilled for free.</p>
        {reference && <><h3 className="text-ink font-semibold">Game format</h3><ul className="list-disc pl-5 space-y-2">{reference.mechanics.map((rule) => <li key={rule}>{rule}</li>)}</ul></>}
        <p>Use the in-game paytable and rules for payouts. Any displayed RTP describes long-run mathematical behaviour, never a guarantee for a session.</p>
        {!!reference?.proprietaryGaps?.length && <p>Provider reel strips and probabilities are proprietary. This version uses its own local model and does not reproduce the provider's exact odds.</p>}
        <p>History and seeds are kept only in this browser. Animated player activity is simulated; no other players or live wagering are connected.</p>
      </div>
    </Modal>
    <FairnessPanel open={panel === 'fairness'} onClose={() => setPanel(null)} />
    <BetHistoryTable open={panel === 'history'} onClose={() => setPanel(null)} />
    <SessionStatsPanel open={panel === 'stats'} onClose={() => setPanel(null)} />
  </>;
}
