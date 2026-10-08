import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ArtworkGate } from '../src/pages/slots/_shared/ArtworkGate';
let images: FakeImage[];
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  decode = vi.fn(() => Promise.resolve());
  constructor() { images.push(this); }
}
beforeEach(() => { images = []; vi.stubGlobal('Image', FakeImage); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const ready = async (image: FakeImage) => act(async () => { image.onload?.(); await Promise.resolve(); });
describe('artwork preparation', () => {
  it('does not show game actions until all assets have loaded and decoded', async () => {
    render(<ArtworkGate assets={['/a.webp', '/b.webp']} title="Game"><button>Spin</button></ArtworkGate>);
    expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
    await ready(images[0]); expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
    await ready(images[1]); expect(screen.getByRole('button', { name: 'Spin' })).toBeInTheDocument();
    expect(images[0].decode).toHaveBeenCalledOnce();
  });
  it('shows a retry after load failure and never opens the old game early', async () => {
    render(<ArtworkGate assets={['/a.webp']} title="Game"><button>Spin</button></ArtworkGate>);
    await act(async () => { images[0].onerror?.(); });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
    await ready(images[1]); expect(screen.getByRole('button', { name: 'Spin' })).toBeInTheDocument();
  });
});

it('offers retry when a network request stalls instead of locking the game indefinitely', async () => {
  vi.useFakeTimers();
  render(<ArtworkGate assets={['/slow.webp']} title="Game"><button>Spin</button></ArtworkGate>);
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
  vi.useRealTimers();
});

it('does not reveal a board when an image cannot decode', async () => {
  render(<ArtworkGate assets={['/bad.webp']} title="Game"><button>Spin</button></ArtworkGate>);
  images[0].decode.mockRejectedValueOnce(new Error('decode failed'));
  await ready(images[0]);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
});
