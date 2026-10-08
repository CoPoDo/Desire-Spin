import { useGameAudioMix } from '../hooks/useGameAudioMix';
import { DEFAULT_GAME_MIX, type GameAudioMix } from '../lib/audio/preferences';

export function GameAudioSettings({ route }: { route: string }) {
  const { enabled, mix, save } = useGameAudioMix(route);
  const channels = [['effects', 'effectsEnabled', 'Effects'], ['music', 'musicEnabled', 'Music'], ['voice', 'voiceEnabled', 'Voices']] as const;
  const update = (patch: Partial<GameAudioMix>) => save({ ...mix, ...patch });
  return <div className="space-y-3 border-t border-white/10 pt-3 mt-4">
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="accent-accent w-5 h-5" checked={enabled} onChange={(event) => save(event.target.checked ? { ...DEFAULT_GAME_MIX } : null)} />Separate mix for this game</label>
    {enabled && <>
      <p className="text-xs text-ink-dim">Saved for this game. Global volume and mute still apply.</p>
      {channels.map(([channel, flag, label]) => <div key={channel} className="space-y-1">
        <label className="flex min-h-11 items-center justify-between text-sm"><span className="flex min-h-11 items-center gap-2"><input aria-label={`${label} in this game`} type="checkbox" className="accent-accent w-4 h-4" checked={mix[flag]} onChange={(event) => update({ [flag]: event.target.checked })} />{label} in this game</span><span className="text-ink-dim tabular-nums">{Math.round(mix[channel] * 100)}%</span></label>
        <input aria-label={`${label} game volume`} className="w-full min-h-11 accent-accent" type="range" min="0" max="100" step="1" disabled={!mix[flag]} value={Math.round(mix[channel] * 100)} onChange={(event) => update({ [channel]: Number(event.target.value) / 100 })} />
      </div>)}
      <button className="btn-ghost min-h-11 text-xs" onClick={() => save(null)}>Use global mix</button>
    </>}
  </div>;
}
