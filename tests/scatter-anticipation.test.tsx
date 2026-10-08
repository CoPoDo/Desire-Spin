import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScatterAnticipationLabel } from '../src/pages/slots/_shared/ScatterAnticipationLabel';
import { gatesOfOlympusConfig } from '../src/pages/slots/gates-of-olympus/config';

afterEach(cleanup);

describe('phase-aware scatter UI copy', () => {
  it.each([
    [3, false, '3 scatters · 1 from bonus!'],
    [4, false, '4 scatters · Bonus symbols'],
    [2, true, '2 scatters · 1 from retrigger!'],
    [3, true, '3 scatters · Retrigger symbols'],
    [4, true, '4 scatters · Retrigger symbols'],
  ] as const)('renders %i scatters in free mode %s without promising an award', (count, inFree, text) => {
    const view = render(<ScatterAnticipationLabel count={count} cfg={gatesOfOlympusConfig} inFree={inFree} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(view.container).not.toHaveTextContent('+5');
  });

  it('uses configured counts instead of a fixed one-away assumption', () => {
    render(<ScatterAnticipationLabel count={3} cfg={{ scatterTriggerCount: 5, scatterRetriggerCount: 4 }} inFree={false} />);
    expect(screen.getByText('3 scatters · 2 from bonus!')).toBeInTheDocument();
  });
});
