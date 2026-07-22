import type { GameReferenceManifest } from './contracts';

const AUDIT_DATE = '2026-07-22';
const STAKE = 'https://stake.com/casino/group/stake-originals';

function game(
  manifest: Omit<GameReferenceManifest, 'auditedAt' | 'controls'> & { controls?: readonly string[] },
): GameReferenceManifest {
  return {
    auditedAt: AUDIT_DATE,
    controls: manifest.controls ?? ['manual bet', 'bet amount', 'autobet', 'fairness replay'],
    ...manifest,
  };
}

export const GAME_REFERENCES: readonly GameReferenceManifest[] = [
  game({ id: 'sweet-bonanza', route: '/slots/sweet-bonanza', title: 'Sweet Bonanza', kind: 'provider', referenceTitle: 'Sweet Bonanza (original)', referenceVersion: 'Pragmatic Play original', sources: ['https://www.pragmaticplay.com/en/games/sweet-bonanza-slot/'], targetRtp: 0.9651, mechanics: ['6x5', 'pay anywhere', 'tumbles', 'free-spin multipliers'], fidelity: 'calibrated', proprietaryGaps: ['reel strips', 'PAR sheet'] }),
  game({ id: 'gates-of-olympus', route: '/slots/gates-of-olympus', title: 'Gates of Olympus', kind: 'provider', referenceTitle: 'Gates of Olympus', referenceVersion: 'Pragmatic Play original', sources: ['https://www.pragmaticplay.com/en/games/gates-of-olympus/'], targetRtp: 0.965, mechanics: ['6x5', 'pay anywhere', 'tumbles', '2x-500x multipliers', '15 free spins'], fidelity: 'calibrated', proprietaryGaps: ['reel strips', 'PAR sheet'] }),
  game({ id: 'sugar-rush', route: '/slots/sugar-rush', title: 'Sugar Rush', kind: 'provider', referenceTitle: 'Sugar Rush', referenceVersion: 'Pragmatic Play original', sources: ['https://www.pragmaticplay.com/en/games/sugar-rush/'], targetRtp: 0.965, mechanics: ['7x7', 'orthogonal clusters', 'tumbles', 'persistent multiplier spots'], fidelity: 'calibrated', proprietaryGaps: ['symbol weights', 'feature frequency'] }),
  game({ id: 'wanted-wild', route: '/slots/wanted-wild', title: 'Wanted Dead or a Wild', kind: 'provider', referenceTitle: 'Wanted Dead or a Wild', referenceVersion: 'Hacksaw Gaming original', sources: ['https://www.hacksawgaming.com/games/wanted-dead-or-a-wild'], targetRtp: 0.9638, mechanics: ['5x5', '15 paylines', 'DuelReels', 'three selectable bonuses'], fidelity: 'calibrated', proprietaryGaps: ['reel strips', 'feature distribution'] }),
  game({ id: 'wolf-gold', route: '/slots/wolf-gold', title: 'Wolf Gold', kind: 'provider', referenceTitle: 'Wolf Gold', referenceVersion: 'Pragmatic Play original', sources: ['https://www.pragmaticplay.com/en/games/wolf-gold-slot/'], targetRtp: 0.96, mechanics: ['5x3', '25 paylines', 'expanding symbols', 'Money Respin', 'jackpots'], fidelity: 'calibrated', proprietaryGaps: ['reel strips', 'jackpot frequency'] }),
  game({ id: 'big-juan', route: '/slots/big-juan', title: 'Big Juan', kind: 'provider', referenceTitle: 'Big Juan', referenceVersion: 'official sver=5 client, audited 2026-07-22', sources: ['https://www.pragmaticplay.com/en/games/big-juan/', 'https://www.pragmaticplay.com/en/news/pragmatic-play-delivers-a-fiery-fun-filled-fiesta-with-big-juan/', 'https://www.daznbet.com/uploads/media/DUK/Game-Rules/Big_Juan_EN.pdf'], targetRtp: 0.967, mechanics: ['5x4', '40 fixed paylines', 'Wild Switch on reels 2-4', '3x3 respins and fourth reel', 'Money Bag', 'four resettable jackpots', '100x Bonus Buy'], controls: ['coin value', 'coins per line', '40 fixed lines', 'spin/stop', 'Space/Enter', 'turbo', 'autoplay', 'Bonus Buy', 'intro preference', 'history'], fidelity: 'calibrated', proprietaryGaps: ['server outcome/PAR weights', 'feature correlation tables', 'licensed art and audio'] }),
  game({ id: 'big-bass-bonanza', route: '/slots/big-bass-bonanza', title: 'Big Bass Bonanza', kind: 'provider', referenceTitle: 'Big Bass Bonanza', referenceVersion: 'Pragmatic Play original', sources: ['https://www.pragmaticplay.com/en/games/big-bass-bonanza/'], targetRtp: 0.9669, mechanics: ['5x3', '10 paylines', 'fisherman wild collection', 'free-spin progression'], fidelity: 'calibrated', proprietaryGaps: ['reel strips', 'feature frequency'] }),
  game({ id: 'pharaoh-gold', route: '/slots/pharaoh-gold', title: "Pharaoh's Gold", kind: 'provider', referenceTitle: "Pharaoh's Gold", referenceVersion: 'Realtime Gaming classic', sources: ['https://www.realtimegaming.com/'], mechanics: ['3x3', '3 paylines', 'classic reel stops'], fidelity: 'observable', proprietaryGaps: ['official reel strips', 'current public game help'] }),
  game({ id: 'aviator', route: '/originals/aviator', title: 'Aviator', kind: 'provider', referenceTitle: 'Aviator', referenceVersion: 'Spribe observable client', sources: ['https://www.spribe.co/games/aviator'], mechanics: ['countdown rounds', 'two bets', 'cashout', 'round history'], fidelity: 'observable', multiplayerMode: 'local-simulation', proprietaryGaps: ['server round protocol', 'live player feed'] }),

  ...[
    ['dice', 'Dice', ['roll over/under', 'chance and multiplier']],
    ['limbo', 'Limbo', ['target multiplier', '1% edge']],
    ['mines', 'Mines', ['5x5 grid', '1-24 mines', 'cashout']],
    ['crash', 'Crash', ['countdown rounds', 'cashout', 'round history']],
    ['plinko', 'Plinko', ['8-16 rows', 'easy/medium/hard/expert', 'peg path']],
    ['wheel', 'Wheel', ['10-50 segments', 'low/medium/high risk']],
    ['hilo', 'Hilo', ['higher/lower', 'card history', 'cashout']],
    ['dragon-tower', 'Dragon Tower', ['difficulty levels', 'row progression', 'cashout']],
    ['keno', 'Keno', ['40 numbers', '1-10 picks', 'risk tables']],
    ['roulette', 'Roulette', ['European wheel', 'inside and outside bets']],
    ['blackjack', 'Blackjack', ['3:2 blackjack', 'split', 'double']],
    ['baccarat', 'Baccarat', ['Punto Banco', 'player/banker/tie', 'pair bets']],
    ['diamonds', 'Diamonds', ['five uniform gems', 'combination paytable']],
    ['video-poker', 'Video Poker', ['9/6 Jacks or Better', 'hold and draw']],
    ['flip', 'Flip', ['heads/tails', 'streak cashout']],
    ['pump', 'Pump', ['progressive pumps', 'cashout', 'difficulty']],
    ['rps', 'Rock Paper Scissors', ['player selection', 'win/push/loss']],
    ['cases', 'Cases', ['single reel', 'four risk levels', '10,000x maximum']],
    ['slide', 'Slide', ['target multiplier', 'animated shared-looking round']],
  ].map(([id, title, mechanics]) => game({
    id: id as string,
    route: `/originals/${id}`,
    title: title as string,
    kind: 'stake-original',
    referenceTitle: title as string,
    referenceVersion: 'Stake Originals web client, pinned audit',
    sources: [STAKE, `https://stake.com/casino/games/${id}`],
    targetRtp: id === 'diamonds' ? 0.9829 : 0.99,
    mechanics: mechanics as string[],
    fidelity: 'documented',
    multiplayerMode: id === 'crash' ? 'local-simulation' : 'none',
  })),

  game({ id: 'three-cups', route: '/originals/three-cups', title: 'Three Cups', kind: 'canonical', referenceTitle: 'Three-cup shell game', referenceVersion: 'equal-probability three-cup rules', sources: [], targetRtp: 0.99, mechanics: ['three cups', 'one hidden ball', 'single reveal'], fidelity: 'documented' }),
  game({ id: 'classic-slot', route: '/originals/classic-slot', title: 'Classic 3-Reel Slot', kind: 'canonical', referenceTitle: 'Single-line fruit machine', referenceVersion: 'three reel, one payline', sources: [], mechanics: ['three reels', 'one payline', 'wild substitutions'], fidelity: 'calibrated', proprietaryGaps: ['no single canonical reel strip'] }),
  game({ id: 'dragon-tiger', route: '/originals/dragon-tiger', title: 'Dragon Tiger', kind: 'canonical', referenceTitle: 'Eight-deck Dragon Tiger', referenceVersion: 'standard shoe rules', sources: [], mechanics: ['eight decks', 'dragon/tiger/tie', 'tie pushes main bets'], fidelity: 'documented' }),
  game({ id: 'sicbo', route: '/originals/sicbo', title: 'Sic Bo', kind: 'canonical', referenceTitle: 'Macau Sic Bo', referenceVersion: 'standard published payout table', sources: [], mechanics: ['three dice', 'small/big', 'totals', 'doubles and triples'], fidelity: 'documented' }),
  game({ id: 'scratch', route: '/originals/scratch', title: 'Scratch Card', kind: 'canonical', referenceTitle: '3x3 match-three scratch card', referenceVersion: 'published local paytable', sources: [], mechanics: ['3x3 card', 'match three', 'reveal all'], fidelity: 'calibrated' }),
  game({ id: 'bingo', route: '/originals/bingo', title: '75-Ball Bingo', kind: 'canonical', referenceTitle: 'American 75-ball Bingo', referenceVersion: '5x5 BINGO card with free center', sources: [], mechanics: ['75 balls', '5x5 card', 'free center', 'line patterns'], fidelity: 'documented' }),
];

export const GAME_REFERENCE_BY_ID = Object.fromEntries(GAME_REFERENCES.map((entry) => [entry.id, entry])) as Readonly<Record<string, GameReferenceManifest>>;

export const REMOVED_GAME_IDS = ['juan-cantina', 'race', 'mini-roulette', 'penalty', 'treasure'] as const;

if (GAME_REFERENCES.length !== 34) {
  throw new Error(`Expected 34 retained games, found ${GAME_REFERENCES.length}`);
}
