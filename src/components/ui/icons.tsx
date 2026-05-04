/**
 * SVG icon components for the slot UI.
 * Designed to match the visual weight of real Pragmatic Olympus icons:
 * outlined, 2px stroke, rounded line caps, currentColor fill so they
 * inherit text color and pulse via CSS.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const baseProps = (size: number, className?: string, strokeWidth = 2.2) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

/** Lightning bolt — turbo / quick-spin */
export function TurboIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M13 2 L 4 14 L 11 14 L 10 22 L 20 9 L 13 9 L 14 2 Z" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

/** Circular arrow — auto-play */
export function AutoplayIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M21 12 a 9 9 0 1 1 -3.5 -7.1" />
      <path d="M21 4 L 21 10 L 15 10" />
    </svg>
  );
}

/** Info (i) — game info / paytable */
export function InfoIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Music note */
export function MusicIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M9 18 V 5 L 19 3 V 16" />
      <circle cx="6" cy="18" r="3" fill="currentColor" stroke="currentColor" />
      <circle cx="16" cy="16" r="3" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

/** Music muted */
export function MusicMutedIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M9 18 V 5 L 19 3 V 16" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

/** Speaker on (volume waves) */
export function SoundIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M3 9 v 6 h 4 l 5 4 V 5 L 7 9 Z" fill="currentColor" stroke="currentColor" />
      <path d="M16 9 a 4 4 0 0 1 0 6" />
      <path d="M19 6 a 8 8 0 0 1 0 12" />
    </svg>
  );
}

/** Speaker muted */
export function SoundMutedIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M3 9 v 6 h 4 l 5 4 V 5 L 7 9 Z" fill="currentColor" stroke="currentColor" />
      <line x1="16" y1="9" x2="22" y2="15" />
      <line x1="22" y1="9" x2="16" y2="15" />
    </svg>
  );
}

/** Plus — bet step up */
export function PlusIcon({ size = 18, className, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** Minus — bet step down */
export function MinusIcon({ size = 18, className, strokeWidth = 2.6 }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** Back chevron */
export function BackIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M15 18 l -6 -6 l 6 -6" />
    </svg>
  );
}

/** Three vertical dots — overflow menu */
export function MenuDotsIcon({ size = 20, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <circle cx="12" cy="5"  r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Square stop — replaces SPIN during autoplay */
export function StopIcon({ size = 22, className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <rect x="6" y="6" width="12" height="12" rx="1.6" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

/** Spin arrow — circular refresh, used inside the SPIN button */
export function SpinArrowIcon({ size = 28, className, strokeWidth = 2.4 }: IconProps) {
  return (
    <svg {...baseProps(size, className, strokeWidth)}>
      <path d="M19 12 a 7 7 0 1 1 -2.7 -5.5" />
      <polyline points="19 4 19 8 15 8" />
    </svg>
  );
}
