import { Link } from 'react-router-dom';
import { ReactNode } from 'react';
import { useGame } from '../../game-context';

export type GameCardProps = {
  to?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  art: ReactNode;
  bg?: string;
  disabled?: boolean;
};

export function GameCard({ to, title, subtitle, badge, art, bg, disabled }: GameCardProps) {
  const { favorites } = useGame();
  const fav = to ? favorites.isFavorite(to) : false;
  const content = (
    <article
      className={
        'group relative overflow-hidden rounded-2xl border border-edge transition-all duration-200 ease-out ' +
        (disabled
          ? 'opacity-50 grayscale-[40%]'
          : 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-glow hover:border-accent/40 active:scale-[0.99] cursor-pointer')
      }
      style={{ aspectRatio: '3 / 4', background: bg ?? '#1a1f29' }}
    >
      <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.06]">
        {art}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-base leading-tight">{title}</div>
            {subtitle && <div className="text-[11px] text-white/70">{subtitle}</div>}
          </div>
          {badge && <span className="pill bg-accent/20 text-accent">{badge}</span>}
        </div>
      </div>
      {disabled && (
        <div className="absolute top-2 right-2 pill bg-black/60 text-white/80">soon</div>
      )}
      {!disabled && to && (
        <button
          type="button"
          aria-label={fav ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            favorites.toggle(to);
          }}
          className={
            'absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-base ' +
            'bg-black/55 backdrop-blur-sm border border-white/15 ' +
            'transition active:scale-90 ' +
            (fav ? 'text-accent-gold' : 'text-white/65 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100')
          }
          style={{ touchAction: 'manipulation' }}
        >
          {fav ? '★' : '☆'}
        </button>
      )}
    </article>
  );
  if (disabled || !to) return <div>{content}</div>;
  return <Link to={to}>{content}</Link>;
}
