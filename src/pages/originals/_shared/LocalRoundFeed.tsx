const PLAYERS = [
  ['Nova', 3.2, 1.42], ['River', 8, 1.85], ['Mika', 1.5, 2.2],
  ['Orion', 12, 3.1], ['Sage', 0.8, 5.5], ['Luna', 4.4, 12],
] as const;

export function LocalRoundFeed({ currentMultiplier, active, crashed, game }: { currentMultiplier: number; active: boolean; crashed: boolean; game: 'Crash' | 'Aviator' }) {
  return (
    <div className="rounded-xl border border-stake-border bg-stake-card p-2.5" aria-label={`${game} simulated player feed`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stake-muted">Round activity</span>
        <span className="rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-cyan">Local simulation</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[9px] text-stake-muted">
        {PLAYERS.map(([name, amount, target]) => {
          const cashed = active && currentMultiplier >= target;
          const busted = crashed && currentMultiplier < target;
          return (
            <div key={name} className="rounded-md bg-stake-input px-2 py-1.5">
              <div className="flex items-center justify-between gap-1"><span className="truncate">{name}</span><span className="font-mono text-stake-text">${amount}</span></div>
              <div className={`mt-0.5 font-mono font-bold ${cashed ? 'text-stake-green' : busted ? 'text-stake-red' : active ? 'text-accent-gold' : 'text-stake-muted'}`}>
                {cashed ? `cashed ${target.toFixed(2)}×` : busted ? 'busted' : active ? 'live' : `auto ${target.toFixed(2)}×`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
