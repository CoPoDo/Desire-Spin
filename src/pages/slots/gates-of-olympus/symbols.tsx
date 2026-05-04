/**
 * Gates of Olympus symbol set — original SVG art with `currentColor` so the
 * shared `.olympus-sym` wrapper drives both color and per-symbol drop-shadow.
 *
 * Color/glow values follow the design brief — premium symbols (crown, ring,
 * hourglass, chalice) get warm gold accents; gem symbols use vivid jewel
 * tones with matching glow.
 */

const SYMBOL_COLOR: Record<string, string> = {
  crown: '#FFD37A',
  ring: '#FF7AB8',
  hourglass: '#FF9B47',
  chalice: '#7AB8E0',
  'gem-red': '#FF5560',
  'gem-purple': '#C77AFA',
  'gem-yellow': '#FACC15',
  'gem-green': '#34D399',
  'gem-blue': '#7AC4FF',
  'zeus-bolt': '#FFE9A8',
};

function Wrap({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="olympus-sym" style={{ color: SYMBOL_COLOR[id] ?? '#FFE9A8' }}>
      {children}
    </div>
  );
}

export function CrownSymbol() {
  return (
    <Wrap id="crown">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="crown-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF5C4" />
            <stop offset="40%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#8E5800" />
          </linearGradient>
          <radialGradient id="crown-jewel-r" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFB3C0" />
            <stop offset="60%" stopColor="#E51F35" />
            <stop offset="100%" stopColor="#7A0814" />
          </radialGradient>
          <radialGradient id="crown-jewel-b" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#A8E1FF" />
            <stop offset="60%" stopColor="#1E8DD9" />
            <stop offset="100%" stopColor="#0A3F66" />
          </radialGradient>
          <radialGradient id="crown-jewel-g" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#B6FFD0" />
            <stop offset="60%" stopColor="#1AAA5E" />
            <stop offset="100%" stopColor="#0A4520" />
          </radialGradient>
        </defs>
        {/* Crown band */}
        <rect x="10" y="44" width="44" height="10" rx="2" fill="url(#crown-fill)" stroke="#5A3A04" strokeWidth="1" />
        <rect x="10" y="44" width="44" height="3" fill="rgba(255,255,255,.3)" />
        {/* Crown peaks */}
        <path d="M10 44 L 14 22 L 22 36 L 32 14 L 42 36 L 50 22 L 54 44 Z"
              fill="url(#crown-fill)" stroke="#5A3A04" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Peak gems */}
        <circle cx="14" cy="22" r="3" fill="url(#crown-jewel-r)" stroke="rgba(0,0,0,.4)" strokeWidth=".6" />
        <circle cx="32" cy="14" r="3.5" fill="url(#crown-jewel-b)" stroke="rgba(0,0,0,.4)" strokeWidth=".6" />
        <circle cx="50" cy="22" r="3" fill="url(#crown-jewel-g)" stroke="rgba(0,0,0,.4)" strokeWidth=".6" />
        {/* Highlight on band */}
        <ellipse cx="20" cy="48" rx="6" ry="1.2" fill="rgba(255,255,255,.35)" />
      </svg>
    </Wrap>
  );
}

export function RingSymbol() {
  return (
    <Wrap id="ring">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="ring-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE0F0" />
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#7A1A4D" />
          </linearGradient>
          <radialGradient id="ring-stone" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#FFC0DC" />
            <stop offset="80%" stopColor="#E51F8D" />
            <stop offset="100%" stopColor="#5A0930" />
          </radialGradient>
        </defs>
        {/* Ring band */}
        <ellipse cx="32" cy="44" rx="20" ry="14" fill="none" stroke="url(#ring-fill)" strokeWidth="6" />
        <ellipse cx="32" cy="44" rx="20" ry="14" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1" />
        <ellipse cx="32" cy="40" rx="18" ry="3" fill="rgba(255,255,255,.25)" />
        {/* Setting */}
        <path d="M22 28 L 32 8 L 42 28 Z" fill="url(#ring-fill)" stroke="rgba(0,0,0,.4)" strokeWidth="1" />
        {/* Diamond stone */}
        <ellipse cx="32" cy="20" rx="7" ry="9" fill="url(#ring-stone)" stroke="rgba(0,0,0,.3)" strokeWidth=".6" />
        <ellipse cx="29" cy="17" rx="2.5" ry="3" fill="rgba(255,255,255,.7)" />
      </svg>
    </Wrap>
  );
}

export function HourglassSymbol() {
  return (
    <Wrap id="hourglass">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="hg-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE2A8" />
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#7A4A0A" />
          </linearGradient>
          <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFCB8A" />
            <stop offset="100%" stopColor="#E8761A" />
          </linearGradient>
        </defs>
        {/* Top + bottom plates */}
        <rect x="10" y="8" width="44" height="6" rx="2" fill="url(#hg-frame)" stroke="#5A3A04" />
        <rect x="10" y="50" width="44" height="6" rx="2" fill="url(#hg-frame)" stroke="#5A3A04" />
        {/* Glass body */}
        <path d="M16 14 L 48 14 L 32 32 L 48 50 L 16 50 L 32 32 Z"
              fill="rgba(255, 240, 200, .12)"
              stroke="url(#hg-frame)" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Sand top */}
        <path d="M20 16 L 44 16 L 32 30 Z" fill="url(#hg-sand)" />
        {/* Sand stream */}
        <rect x="31" y="30" width="2" height="6" fill="#E8761A" />
        {/* Sand bottom */}
        <path d="M20 48 L 44 48 L 32 36 Z" fill="url(#hg-sand)" opacity=".85" />
        <ellipse cx="32" cy="48" rx="8" ry="1.5" fill="rgba(0,0,0,.3)" />
      </svg>
    </Wrap>
  );
}

export function ChaliceSymbol() {
  return (
    <Wrap id="chalice">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="ch-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFAE0" />
            <stop offset="50%" stopColor="#FFD37A" />
            <stop offset="100%" stopColor="#7A4A0A" />
          </linearGradient>
          <radialGradient id="ch-liquid" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFB3C0" />
            <stop offset="100%" stopColor="#A30A1E" />
          </radialGradient>
        </defs>
        {/* Cup */}
        <path d="M14 14 L 50 14 L 47 30 C 47 40 40 46 32 46 C 24 46 17 40 17 30 Z"
              fill="url(#ch-frame)" stroke="#5A3A04" strokeWidth="1.2" />
        {/* Liquid surface */}
        <ellipse cx="32" cy="20" rx="14" ry="3.5" fill="url(#ch-liquid)" />
        <ellipse cx="32" cy="20" rx="14" ry="3.5" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth=".5" />
        {/* Stem */}
        <rect x="29" y="46" width="6" height="9" fill="url(#ch-frame)" />
        {/* Base */}
        <ellipse cx="32" cy="56" rx="13" ry="3" fill="url(#ch-frame)" stroke="#5A3A04" />
        {/* Highlight on cup */}
        <path d="M19 18 Q 22 24 22 32" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" fill="none" />
      </svg>
    </Wrap>
  );
}

function makeGem(id: string) {
  return function Gem() {
    return (
      <Wrap id={id}>
        <svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".75" />
              <stop offset="60%" stopColor="currentColor" />
              <stop offset="100%" stopColor="rgba(0,0,0,.5)" />
            </linearGradient>
            <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" />
              <stop offset="100%" stopColor="rgba(0,0,0,.7)" />
            </linearGradient>
          </defs>
          {/* Octagonal gem outline */}
          <path d="M22 8 L 42 8 L 56 24 L 32 60 L 8 24 Z"
                fill={`url(#${id}-dark)`} stroke="rgba(0,0,0,.55)" strokeWidth="1" strokeLinejoin="round" />
          {/* Top facet (lit) */}
          <path d="M22 8 L 42 8 L 32 22 Z" fill={`url(#${id}-light)`} />
          {/* Side facets */}
          <path d="M22 8 L 32 22 L 8 24 Z" fill="rgba(255,255,255,.18)" />
          <path d="M42 8 L 32 22 L 56 24 Z" fill="rgba(0,0,0,.15)" />
          {/* Body facets */}
          <path d="M8 24 L 32 22 L 32 60 Z" fill="rgba(255,255,255,.06)" />
          <path d="M56 24 L 32 22 L 32 60 Z" fill="rgba(0,0,0,.18)" />
          {/* Highlight */}
          <path d="M16 14 L 26 12 L 24 18 Z" fill="rgba(255,255,255,.55)" />
        </svg>
      </Wrap>
    );
  };
}

export const RedGemSymbol = makeGem('gem-red');
export const PurpleGemSymbol = makeGem('gem-purple');
export const YellowGemSymbol = makeGem('gem-yellow');
export const GreenGemSymbol = makeGem('gem-green');
export const BlueGemSymbol = makeGem('gem-blue');

export function ZeusBoltSymbol() {
  return (
    <Wrap id="zeus-bolt">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="zb-bolt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFCE0" />
            <stop offset="40%" stopColor="#FFE9A8" />
            <stop offset="100%" stopColor="#FF8A20" />
          </linearGradient>
          <radialGradient id="zb-ring" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,.7)" />
            <stop offset="60%" stopColor="rgba(60,30,5,.6)" />
            <stop offset="100%" stopColor="rgba(255,200,80,.0)" />
          </radialGradient>
        </defs>
        {/* Outer halo */}
        <circle cx="32" cy="32" r="28" fill="url(#zb-ring)" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#FFC850" strokeWidth="1.5" opacity=".75" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        {/* Lightning bolt */}
        <path d="M32 6 L 18 32 L 28 32 L 22 58 L 46 26 L 34 26 L 40 6 Z"
              fill="url(#zb-bolt)" stroke="#7A3A04" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Bolt highlight */}
        <path d="M32 8 L 22 30 L 28 30" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </Wrap>
  );
}

export function OlympusMultiplierSymbol({ value }: { value: number; accent?: string }) {
  return (
    <div className="olympus-orb">
      <span className="olympus-orb-text">{value}×</span>
    </div>
  );
}

export const OLYMPUS_SYMBOL_MAP: Record<string, React.FC> = {
  crown: CrownSymbol,
  ring: RingSymbol,
  hourglass: HourglassSymbol,
  chalice: ChaliceSymbol,
  'gem-red': RedGemSymbol,
  'gem-purple': PurpleGemSymbol,
  'gem-yellow': YellowGemSymbol,
  'gem-green': GreenGemSymbol,
  'gem-blue': BlueGemSymbol,
  'zeus-bolt': ZeusBoltSymbol,
};
