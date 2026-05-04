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

function Wrap({ id, children, scatter }: { id: string; children: React.ReactNode; scatter?: boolean }) {
  // The wrap takes the symbol's color via currentColor, which cascades into
  // the SVG (currentColor fills + drop-shadow). Real Pragmatic glows in the
  // symbol's own color — gems glow their gem color, gold items glow gold.
  const color = SYMBOL_COLOR[id] ?? '#FFE9A8';
  return (
    <div
      className={`olympus-sym${scatter ? ' olympus-sym-scatter' : ''}`}
      style={{ color }}
    >
      {children}
    </div>
  );
}

/** Re-export so the Grid layer can read symbol colors for cell tinting. */
export const olympusSymbolColor = (id: string) => SYMBOL_COLOR[id] ?? '#FFE9A8';

export function CrownSymbol() {
  return (
    <Wrap id="crown">
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="crown-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FFF5C4" />
            <stop offset="55%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#8E5800" />
          </linearGradient>
          <linearGradient id="crown-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="50%" stopColor="#FFD37A" />
            <stop offset="100%" stopColor="#5A3A04" />
          </linearGradient>
          <radialGradient id="crown-jewel-r" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#FFB3C0" />
            <stop offset="80%" stopColor="#E51F35" />
            <stop offset="100%" stopColor="#5A0810" />
          </radialGradient>
          <radialGradient id="crown-jewel-b" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#A8E1FF" />
            <stop offset="80%" stopColor="#1E8DD9" />
            <stop offset="100%" stopColor="#0A3F66" />
          </radialGradient>
          <radialGradient id="crown-jewel-g" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#B6FFD0" />
            <stop offset="80%" stopColor="#1AAA5E" />
            <stop offset="100%" stopColor="#0A4520" />
          </radialGradient>
        </defs>
        {/* Crown band base */}
        <rect x="9" y="44" width="46" height="11" rx="2" fill="url(#crown-band)" stroke="#5A3A04" strokeWidth="1.2" />
        {/* Band ornament — 3 small bumps */}
        <circle cx="20" cy="49.5" r="1.8" fill="#5A3A04" opacity="0.55" />
        <circle cx="32" cy="49.5" r="2" fill="#5A3A04" opacity="0.55" />
        <circle cx="44" cy="49.5" r="1.8" fill="#5A3A04" opacity="0.55" />
        {/* Band top highlight stripe */}
        <rect x="11" y="44.5" width="42" height="2" fill="rgba(255,255,255,0.45)" />
        {/* Crown peaks */}
        <path d="M9 44 L 13 20 L 22 36 L 32 12 L 42 36 L 51 20 L 55 44 Z"
              fill="url(#crown-fill)" stroke="#5A3A04" strokeWidth="1.4" strokeLinejoin="round" />
        {/* Inner peak shading */}
        <path d="M13 20 L 22 36 L 18 36 Z" fill="rgba(0,0,0,0.18)" />
        <path d="M51 20 L 42 36 L 46 36 Z" fill="rgba(0,0,0,0.18)" />
        <path d="M32 12 L 38 30 L 28 30 Z" fill="rgba(255,255,255,0.18)" />
        {/* Peak gems */}
        <circle cx="13" cy="20" r="3.4" fill="url(#crown-jewel-r)" stroke="rgba(0,0,0,.5)" strokeWidth=".7" />
        <circle cx="32" cy="12" r="4" fill="url(#crown-jewel-b)" stroke="rgba(0,0,0,.5)" strokeWidth=".7" />
        <circle cx="51" cy="20" r="3.4" fill="url(#crown-jewel-g)" stroke="rgba(0,0,0,.5)" strokeWidth=".7" />
        {/* Gem highlights */}
        <circle cx="11.5" cy="18.5" r="1" fill="rgba(255,255,255,0.85)" />
        <circle cx="30.5" cy="10.5" r="1.2" fill="rgba(255,255,255,0.9)" />
        <circle cx="49.5" cy="18.5" r="1" fill="rgba(255,255,255,0.85)" />
        {/* Bottom shadow on band */}
        <rect x="9" y="53" width="46" height="2" fill="rgba(0,0,0,0.35)" rx="2" />
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
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="40%" stopColor="#FFD37A" />
            <stop offset="80%" stopColor="#A8761A" />
            <stop offset="100%" stopColor="#5A3A04" />
          </linearGradient>
          <radialGradient id="ring-stone" cx="40%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFC0DC" />
            <stop offset="65%" stopColor="#FF3D8B" />
            <stop offset="100%" stopColor="#5A0830" />
          </radialGradient>
          <linearGradient id="ring-stone-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Ring band — outer + inner ovals to create depth */}
        <ellipse cx="32" cy="44" rx="21" ry="14.5" fill="none" stroke="url(#ring-fill)" strokeWidth="7" />
        <ellipse cx="32" cy="44" rx="21" ry="14.5" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="1.2" />
        {/* Inner darker ring */}
        <ellipse cx="32" cy="44" rx="14" ry="9" fill="rgba(0,0,0,0.3)" />
        {/* Top highlight on band */}
        <ellipse cx="32" cy="38.5" rx="20" ry="2" fill="rgba(255,255,255,.4)" />
        {/* Bottom shadow */}
        <ellipse cx="32" cy="55" rx="18" ry="2" fill="rgba(0,0,0,0.25)" />
        {/* Prongs holding the stone */}
        <rect x="22" y="22" width="2.5" height="10" fill="url(#ring-fill)" />
        <rect x="39.5" y="22" width="2.5" height="10" fill="url(#ring-fill)" />
        {/* Setting cup */}
        <path d="M20 28 L 32 6 L 44 28 Z" fill="url(#ring-fill)" stroke="rgba(0,0,0,.4)" strokeWidth="1" />
        <path d="M22 26 L 32 9 L 42 26" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
        {/* Diamond stone */}
        <ellipse cx="32" cy="18" rx="8" ry="10" fill="url(#ring-stone)" stroke="rgba(0,0,0,.4)" strokeWidth=".7" />
        {/* Stone facets */}
        <path d="M32 8 L 25 14 L 32 18 Z" fill="rgba(255,255,255,0.35)" />
        <path d="M32 8 L 39 14 L 32 18 Z" fill="rgba(0,0,0,0.15)" />
        <path d="M25 14 L 24 24 L 32 28 Z" fill="rgba(255,255,255,0.12)" />
        <path d="M39 14 L 40 24 L 32 28 Z" fill="rgba(0,0,0,0.18)" />
        {/* Stone highlight */}
        <ellipse cx="29" cy="14" rx="2.8" ry="3.5" fill="rgba(255,255,255,.85)" />
        <circle cx="36" cy="11" r="1" fill="rgba(255,255,255,0.9)" />
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
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="50%" stopColor="#FFD37A" />
            <stop offset="100%" stopColor="#7A4A0A" />
          </linearGradient>
          <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE0A8" />
            <stop offset="50%" stopColor="#FFCB8A" />
            <stop offset="100%" stopColor="#E8761A" />
          </linearGradient>
          <linearGradient id="hg-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,233,168,0.05)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,233,168,0.05)" />
          </linearGradient>
        </defs>
        {/* Top + bottom plates with bevels */}
        <rect x="9" y="7" width="46" height="7" rx="2" fill="url(#hg-frame)" stroke="#5A3A04" strokeWidth="1.2" />
        <rect x="9" y="50" width="46" height="7" rx="2" fill="url(#hg-frame)" stroke="#5A3A04" strokeWidth="1.2" />
        {/* Highlights on plates */}
        <rect x="11" y="8" width="42" height="1.5" fill="rgba(255,255,255,0.6)" />
        <rect x="11" y="51" width="42" height="1.5" fill="rgba(255,255,255,0.45)" />
        {/* Glass body */}
        <path d="M16 14 L 48 14 L 32 32 L 48 50 L 16 50 L 32 32 Z"
              fill="url(#hg-glass)"
              stroke="url(#hg-frame)" strokeWidth="2" strokeLinejoin="round" />
        {/* Sand top (lit) */}
        <path d="M20 16 L 44 16 L 32 30 Z" fill="url(#hg-sand)" />
        <path d="M21 17 L 31 28" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
        {/* Sand stream */}
        <rect x="31" y="30" width="2" height="7" fill="#E8761A" />
        <rect x="31.5" y="30" width="0.6" height="7" fill="#FFE0A8" />
        {/* Sand bottom — pile */}
        <path d="M20 48 L 44 48 L 32 36 Z" fill="url(#hg-sand)" opacity=".88" />
        <path d="M22 47 L 31 38" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
        {/* Glass shine */}
        <path d="M19 16 L 24 22" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M40 50 L 36 44" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Bottom shadow */}
        <ellipse cx="32" cy="58" rx="18" ry="1.4" fill="rgba(0,0,0,0.35)" />
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
            <stop offset="40%" stopColor="#FFD37A" />
            <stop offset="80%" stopColor="#A8761A" />
            <stop offset="100%" stopColor="#5A3A04" />
          </linearGradient>
          <radialGradient id="ch-liquid" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFD1D6" />
            <stop offset="40%" stopColor="#FF5560" />
            <stop offset="80%" stopColor="#A30A1E" />
            <stop offset="100%" stopColor="#3A0008" />
          </radialGradient>
        </defs>
        {/* Cup outline */}
        <path d="M13 14 L 51 14 L 48 30 C 48 41 40 47 32 47 C 24 47 16 41 16 30 Z"
              fill="url(#ch-frame)" stroke="#5A3A04" strokeWidth="1.4" />
        {/* Cup rim band */}
        <rect x="13" y="13" width="38" height="3" fill="url(#ch-frame)" stroke="#5A3A04" strokeWidth="0.8" />
        {/* Decorative scrolls on cup */}
        <circle cx="22" cy="28" r="2" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.7" />
        <circle cx="42" cy="28" r="2" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.7" />
        <path d="M28 36 Q 32 32 36 36" stroke="rgba(0,0,0,0.45)" strokeWidth="0.8" fill="none" />
        {/* Liquid surface — wine */}
        <ellipse cx="32" cy="19" rx="15" ry="3.8" fill="url(#ch-liquid)" stroke="rgba(0,0,0,.4)" strokeWidth=".6" />
        {/* Liquid highlight */}
        <ellipse cx="28" cy="17.5" rx="5" ry="1" fill="rgba(255,255,255,0.55)" />
        {/* Cup vertical highlight */}
        <path d="M19 18 Q 22 26 22 36" stroke="rgba(255,255,255,.5)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M44 22 Q 44 28 43 34" stroke="rgba(0,0,0,.25)" strokeWidth="1.2" fill="none" />
        {/* Stem with detail */}
        <rect x="28.5" y="47" width="7" height="3" fill="url(#ch-frame)" />
        <rect x="28" y="50" width="8" height="6" fill="url(#ch-frame)" stroke="#5A3A04" strokeWidth="0.6" />
        <ellipse cx="32" cy="51" rx="3.5" ry="1" fill="rgba(255,255,255,0.4)" />
        {/* Base */}
        <ellipse cx="32" cy="57" rx="14" ry="3.4" fill="url(#ch-frame)" stroke="#5A3A04" strokeWidth="1.2" />
        <ellipse cx="32" cy="56" rx="11" ry="1.2" fill="rgba(255,255,255,0.45)" />
        {/* Bottom shadow */}
        <ellipse cx="32" cy="60.5" rx="13" ry="1.2" fill="rgba(0,0,0,0.3)" />
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
            <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.95" />
              <stop offset="100%" stopColor="currentColor" />
            </linearGradient>
            <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id={`${id}-deep`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.85)" />
            </linearGradient>
            <radialGradient id={`${id}-sparkle`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer hexagonal silhouette (main fill, deepest tone) */}
          <path
            d="M32 4 L 52 14 L 60 30 L 52 50 L 32 60 L 12 50 L 4 30 L 12 14 Z"
            fill={`url(#${id}-deep)`}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Crown facets (lit top) */}
          <path d="M32 4 L 52 14 L 32 24 Z" fill={`url(#${id}-top)`} />
          <path d="M32 4 L 12 14 L 32 24 Z" fill={`url(#${id}-top)`} opacity="0.85" />

          {/* Upper side facets */}
          <path d="M52 14 L 60 30 L 32 24 Z" fill={`url(#${id}-mid)`} />
          <path d="M12 14 L 4 30 L 32 24 Z" fill={`url(#${id}-mid)`} opacity="0.78" />

          {/* Pavilion facets (lower) — alternating light/dark for facet break */}
          <path d="M32 24 L 60 30 L 52 50 L 32 60 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M32 24 L 4 30 L 12 50 L 32 60 Z" fill="rgba(0,0,0,0.18)" />
          <path d="M32 24 L 52 50 L 32 60 Z" fill="rgba(0,0,0,0.12)" />
          <path d="M32 24 L 12 50 L 32 60 Z" fill="rgba(255,255,255,0.08)" />

          {/* Inner girdle line (where crown meets pavilion) */}
          <path d="M4 30 L 32 24 L 60 30" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />

          {/* Bright crown highlight */}
          <path d="M22 9 L 32 6 L 30 14 Z" fill="rgba(255,255,255,0.7)" />
          <ellipse cx="42" cy="11" rx="3" ry="1.5" fill="rgba(255,255,255,0.55)" transform="rotate(-15 42 11)" />

          {/* Sparkle star */}
          <circle cx="38" cy="14" r="6" fill={`url(#${id}-sparkle)`} />
          <line x1="38" y1="9" x2="38" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
          <line x1="33" y1="14" x2="43" y2="14" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
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
    <Wrap id="zeus-bolt" scatter>
      <svg viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="zb-bolt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFCE0" />
            <stop offset="40%" stopColor="#FFE9A8" />
            <stop offset="100%" stopColor="#FF8A20" />
          </linearGradient>
          <radialGradient id="zb-ring" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(40,20,2,.55)" />
            <stop offset="55%" stopColor="rgba(120,80,20,.4)" />
            <stop offset="100%" stopColor="rgba(255,200,80,.0)" />
          </radialGradient>
          <radialGradient id="zb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,233,168,.55)" />
            <stop offset="60%" stopColor="rgba(255,200,80,.18)" />
            <stop offset="100%" stopColor="rgba(255,200,80,0)" />
          </radialGradient>
        </defs>
        {/* Inner glow */}
        <circle cx="32" cy="32" r="30" fill="url(#zb-glow)" />
        {/* Outer halo */}
        <circle cx="32" cy="32" r="28" fill="url(#zb-ring)" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#FFC850" strokeWidth="1.6" opacity=".85" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
        {/* Lightning bolt */}
        <path d="M32 6 L 18 32 L 28 32 L 22 58 L 46 26 L 34 26 L 40 6 Z"
              fill="url(#zb-bolt)" stroke="#7A3A04" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Bolt highlight */}
        <path d="M32 8 L 22 30 L 28 30" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Sparkles */}
        <circle cx="14" cy="14" r="1.2" fill="#fff" opacity=".9" />
        <circle cx="50" cy="14" r="1" fill="#fff" opacity=".75" />
        <circle cx="50" cy="52" r="1.4" fill="#fff" opacity=".85" />
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
