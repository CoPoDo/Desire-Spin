import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { useGame } from '../../game-context';

export type GameCardProps = { to?: string; title: string; subtitle?: string; badge?: string; art: ReactNode; bg?: string; disabled?: boolean };

export function GameCard({ to, title, subtitle, art, bg, disabled }: GameCardProps) {
  const { favorites } = useGame();
  const favorite = to ? favorites.isFavorite(to) : false;
  return <article className={`game-card group relative overflow-hidden rounded-2xl border border-edge ${disabled ? 'opacity-50' : 'hover:border-accent/50'}`} style={{ aspectRatio: '3 / 4', background: bg ?? '#1a1f29' }}>
    <div aria-hidden="true" className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.05]">{art}</div>
    <div className="absolute inset-x-0 bottom-0 p-3 pt-16 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none">
      <h3 className="font-display font-bold text-base leading-tight">{title}</h3>
      {subtitle && <p className="mt-1 text-[11px] leading-normal text-white/75">{subtitle}</p>}
    </div>
    {!disabled && to && <>
      <Link to={to} aria-label={`Play ${title}`} className="absolute inset-0 rounded-2xl"><span className="absolute left-3 top-3 rounded-full bg-black/55 border border-white/15 px-2 py-1 text-[9px] tracking-wider uppercase text-white/80 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">Play for fun</span></Link>
      <button type="button" aria-label={favorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`} aria-pressed={favorite} onClick={() => favorites.toggle(to)} className={`absolute z-10 top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center text-xl bg-black/55 backdrop-blur-sm border border-white/15 transition active:scale-95 ${favorite ? 'text-accent' : 'text-white/70 hover:text-white'}`}>{favorite ? '★' : '☆'}</button>
    </>}
    {disabled && <span className="absolute top-2 right-2 pill bg-black/60 text-white/80">Coming soon</span>}
  </article>;
}
