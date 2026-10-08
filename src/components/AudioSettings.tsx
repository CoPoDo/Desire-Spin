import { useAudioPreferences } from '../hooks/useAudioPreferences';
import { gameAudio } from '../lib/audio/engine';
import { AUDIO_ROOT } from '../lib/audio/catalog';
import type { AudioLevel } from '../lib/audio/preferences';

/** Shared in the game menu and Settings; controls all games and narration. */
export function AudioSettings({ compact = false }: { compact?: boolean }) {
  const { settings, update } = useAudioPreferences();
  const levels: [AudioLevel, string][] = [['master', 'Master volume'], ['effects', 'Sound effects'], ['music', 'Music'], ['voice', 'Voices']];
  return <div className={compact ? 'space-y-3 pt-3' : 'space-y-4'}>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={settings.enabled} onChange={(event) => { update({ enabled: event.target.checked }); if (event.target.checked) gameAudio.unlock(); }} className="accent-accent w-5 h-5" />All sound</label>
    {levels.map(([key, label]) => <label key={key} className="block text-sm">
      <span className="flex justify-between mb-1"><span>{label}</span><span className="tabular-nums text-ink-dim">{Math.round(settings[key] * 100)}%</span></span>
      <input aria-label={label} type="range" min="0" max="100" step="1" value={Math.round(settings[key] * 100)} disabled={!settings.enabled} onChange={(event) => update({ [key]: Number(event.target.value) / 100 })} className="w-full accent-accent min-h-11" />
    </label>)}
    <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <label className="flex min-h-11 items-center gap-2"><input className="accent-accent w-4 h-4" type="checkbox" checked={settings.musicEnabled} onChange={(event) => update({ musicEnabled: event.target.checked })} />Music enabled</label>
      <label className="flex min-h-11 items-center gap-2"><input className="accent-accent w-4 h-4" type="checkbox" checked={settings.voiceEnabled} onChange={(event) => update({ voiceEnabled: event.target.checked })} />Voices enabled</label>
    </div>
    <div className="flex gap-2">
      <button className="btn-ghost min-h-11 text-xs" disabled={!settings.enabled || settings.effects === 0 || settings.master === 0} onClick={() => { gameAudio.unlock(); gameAudio.play('win'); }}>Test effects</button>
      <button className="btn-ghost min-h-11 text-xs" disabled={!settings.enabled || !settings.voiceEnabled || settings.voice === 0 || settings.master === 0} onClick={() => { gameAudio.unlock(); gameAudio.stopBus('voice'); void gameAudio.speak(`${AUDIO_ROOT}/voices/olympus/glory.mp3`, gameAudio.getRoute(), 3); }}>Test voice</button>
    </div>
    {!compact && <p className="text-xs text-ink-dim">Original themed effects and music, with prerecorded synthetic narration. Audio starts after your first tap and stops when you leave a game or hide this tab.</p>}
  </div>;
}
