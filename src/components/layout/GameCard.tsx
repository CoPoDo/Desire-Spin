import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

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
  const content = (
    <article
      className={
        'group relative overflow-hidden rounded-2xl border border-edge transition-all ' +
        (disabled
          ? 'opacity-50 grayscale-[40%]'
          : 'hover:-translate-y-0.5 hover:shadow-glow cursor-pointer')
      }
      style={{ aspectRatio: '3 / 4', background: bg ?? '#1a1f29' }}
    >
      <div className="absolute inset-0">{art}</div>
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
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
    </article>
  );
  if (disabled || !to) return <div>{content}</div>;
  return <Link to={to}>{content}</Link>;
}
