import { Link } from 'react-router-dom';

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="text-6xl mb-4">🛠️</div>
      <h1 className="font-display text-3xl font-bold mb-2">{title}</h1>
      <p className="text-ink-dim max-w-md">
        Not in v1 — slots ship first, then dice, mines, crash, and plinko follow.
        Head back to the lobby to play Sweet Bonanza or Gates of Olympus.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to lobby
      </Link>
    </div>
  );
}
