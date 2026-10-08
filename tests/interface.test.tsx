import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/components/ui/Modal';
import { useHotkey } from '../src/hooks/useHotkey';

afterEach(cleanup);
function Hotkey({ onAction }: { onAction: () => void }) { useHotkey(' ', onAction); return <><input aria-label="Stake" /><button>Button</button><a href="#">Link</a></>; }
describe('safe keyboard controls', () => {
  it('ignores held keys, modified keys and focused controls', () => {
    const action = vi.fn(); render(<Hotkey onAction={action} />);
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    fireEvent.keyDown(window, { key: ' ', ctrlKey: true });
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('link'), { key: ' ' });
    expect(action).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: ' ' }); expect(action).toHaveBeenCalledOnce();
  });
  it('does not place a background bet while a modal is open', () => {
    const action = vi.fn(); render(<><Hotkey onAction={action} /><Modal open onClose={() => {}} title="History"><p>History</p></Modal></>);
    fireEvent.keyDown(window, { key: ' ' }); expect(action).not.toHaveBeenCalled();
  });
});
describe('accessible dialogs', () => {
  it('labels the dialog and closes with Escape', () => {
    const close = vi.fn(); render(<Modal open onClose={close} title="Game menu"><button>Action</button></Modal>);
    expect(screen.getByRole('dialog', { name: 'Game menu' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });
  it('wraps tab focus in both directions and restores the trigger', () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const { unmount } = render(<Modal open onClose={() => {}} title="Test"><button>Last</button></Modal>);
    const first = screen.getByRole('button', { name: 'Close dialog' }); const last = screen.getByRole('button', { name: 'Last' });
    last.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus();
    unmount(); expect(trigger).toHaveFocus(); trigger.remove();
  });
});

it('shows an immediate, finite count when animation duration is zero', async () => {
  const { CountUp } = await import('../src/components/ui/CountUp');
  const { rerender } = render(<CountUp value={0} duration={0} />);
  rerender(<CountUp value={25.5} duration={0} />);
  expect(screen.getByText('25.50')).toBeInTheDocument();
});
