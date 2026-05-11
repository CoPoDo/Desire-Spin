import { useEffect, useState } from 'react';
import { BigJuanSvg } from './symbols';

/** Big Juan animated mascot beside the reels (bible Part 8 / §2).
 *
 *  Idle: gentle bobbing. On `mood` change, plays the reaction
 *  animation once then falls back to idle. The animations themselves
 *  live in globals.css (.bj-juan-*) and are driven by class toggles
 *  on the outer wrapper — this component just owns the prop-to-class
 *  mapping and the auto-reset back to idle after a reaction. */

export type JuanMood = 'idle' | 'cheer' | 'pistols' | 'dance' | 'bored';

const REACTION_MS: Partial<Record<JuanMood, number>> = {
  cheer: 1500,
  pistols: 1800,
  dance: 2400,
  bored: 0, // ambient — no auto-reset
};

export function JuanCharacter({ mood }: { mood: JuanMood }) {
  const [active, setActive] = useState<JuanMood>(mood);

  useEffect(() => {
    setActive(mood);
    const dur = REACTION_MS[mood];
    if (!dur) return;
    const t = setTimeout(() => setActive('idle'), dur);
    return () => clearTimeout(t);
  }, [mood]);

  const cls =
    'bj-juan-character' +
    (active === 'cheer' ? ' bj-juan-cheer' : '') +
    (active === 'pistols' ? ' bj-juan-pistols' : '') +
    (active === 'dance' ? ' bj-juan-dance' : '') +
    (active === 'bored' ? ' bj-juan-bored' : '');

  return (
    <div className={cls} aria-hidden>
      <BigJuanSvg />
      {/* Pistol muzzle-flashes anchored at hand positions in the SVG.
       *  They're keyed to .bj-juan-pistols and fire twice (delay) per
       *  the css animation timing. Each muzzle has its own delay so
       *  the two pistols don't fire perfectly in sync. */}
      <div
        className="bj-juan-muzzle bj-juan-muzzle-l"
        style={{ left: '12%', top: '50%' }}
      />
      <div
        className="bj-juan-muzzle bj-juan-muzzle-r"
        style={{ right: '12%', top: '50%' }}
      />
    </div>
  );
}
