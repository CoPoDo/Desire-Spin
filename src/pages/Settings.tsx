import { useState } from 'react';
import { AudioSettings } from '../components/AudioSettings';
import { useGame } from '../game-context';
import { Modal } from '../components/ui/Modal';

export function Settings() {
  const { balance, fairness, history, session } = useGame();
  const [confirm, setConfirm] = useState<'balance' | 'zero' | 'seeds' | 'history' | 'stats' | null>(null);
  const actions = {
    balance: { title: 'Reset play balance?', text: 'Your play-money balance will become 1,000 credits. Your history and stats will stay unchanged.', run: () => balance.reset(1000) },
    zero: { title: 'Set balance to zero?', text: 'This removes the current play credits. You can refill for free at any time.', run: () => balance.reset(0) },
    seeds: { title: 'Reset local seeds?', text: 'This replaces current and previous seeds. Save any revealed seed you need first; old rounds cannot be reproduced without it.', run: () => fairness.resetSeeds() },
    history: { title: 'Clear bet history?', text: 'All recorded bets on this device will be removed. Balance and play stats stay unchanged.', run: () => history.clear() },
    stats: { title: 'Reset play stats?', text: 'Start a new tracking period. Your balance and bet history stay unchanged.', run: () => session.reset() },
  };
  return <div className="max-w-2xl space-y-6">
    <div><p className="label mb-2">Your lounge</p><h1 className="font-display text-3xl font-bold">Settings</h1></div>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Play-money balance</h2><p className="text-sm text-ink-dim">Current balance: <span className="font-mono">{balance.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> credits</p><div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => balance.credit(1000)}>Add 1,000</button><button className="btn-ghost" onClick={() => setConfirm('balance')}>Reset to 1,000</button><button className="btn-danger" onClick={() => setConfirm('zero')}>Set to zero</button></div></section>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Sound & motion</h2><AudioSettings /><p className="text-xs text-ink-dim">Animations follow your device's reduced-motion preference.</p></section>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Local fairness seeds</h2><p className="text-sm text-ink-dim">Rotate the local seed to reveal it and start a new one. Save revealed seeds before rotating again if you want to replay earlier rounds.</p><div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={fairness.rotate}>Rotate local seed</button><button className="btn-danger" onClick={() => setConfirm('seeds')}>Reset all seeds</button></div></section>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Your activity</h2><p className="text-sm text-ink-dim">{history.history.length} recent bets saved. Stats include all settled rounds since your last reset.</p><div className="flex flex-wrap gap-2"><button className="btn-danger" onClick={() => setConfirm('history')}>Clear history</button><button className="btn-ghost" onClick={() => setConfirm('stats')}>Reset stats</button></div></section>
    <p className="text-xs text-ink-mute">Everything stays in this browser. Clearing site data resets your credits, history, preferences and seeds. Nothing here has monetary value.</p>
    <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm ? actions[confirm].title : 'Confirm'} width="sm">{confirm && <><p className="text-sm text-ink-dim mb-5">{actions[confirm].text}</p><div className="flex gap-3"><button className="btn-ghost flex-1" onClick={() => setConfirm(null)}>Cancel</button><button className="btn-danger flex-1" onClick={() => { actions[confirm].run(); setConfirm(null); }}>Confirm</button></div></>}</Modal>
  </div>;
}
