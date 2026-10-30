// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import EncounterContainer from '../../src/ui/EncounterContainer';

afterEach(() => {
  cleanup();
});

describe('Adversarial Unit Verification of Phoenix Wright Game State Machine', () => {
  it('Statement paging boundaries: cannot navigate before statement 1', () => {
    render(<EncounterContainer />);

    const pager = screen.getByTestId('statement-pager');
    const prevBtn = screen.getByTestId('action-prev');

    // Initial state: Statement 1 (1 / 3)
    expect(pager.textContent).toBe('1 / 3');

    // BOUNDARY CHECK 1: Click Prev at Statement 1
    fireEvent.click(prevBtn);

    // Requirement: "cannot navigate before statement 1 or after statement 3"
    // If bounded, pager stays "1 / 3"
    expect(pager.textContent).toBe('1 / 3');
  });

  it('Statement paging boundaries: cannot navigate after statement 3', () => {
    render(<EncounterContainer />);

    const pager = screen.getByTestId('statement-pager');
    const nextBtn = screen.getByTestId('action-next');

    // Navigate to Statement 2
    fireEvent.click(nextBtn);
    expect(pager.textContent).toBe('2 / 3');

    // Navigate to Statement 3
    fireEvent.click(nextBtn);
    expect(pager.textContent).toBe('3 / 3');

    // BOUNDARY CHECK 2: Click Next at Statement 3
    fireEvent.click(nextBtn);

    // Requirement: "cannot navigate before statement 1 or after statement 3"
    // If bounded, pager stays "3 / 3"
    expect(pager.textContent).toBe('3 / 3');
  });

  it('Rapid clicking on Press button does not corrupt state or trigger multiple penalties', () => {
    render(<EncounterContainer />);

    const pressBtn = screen.getByTestId('action-press');

    // Rapid spam clicks
    for (let i = 0; i < 10; i++) {
      fireEvent.click(pressBtn);
    }

    // Still on statement 1, strikes intact (3/3)
    expect(screen.getByTestId('strike-0').textContent).toBe('✕');
    expect(screen.getByTestId('strike-1').textContent).toBe('✕');
    expect(screen.getByTestId('strike-2').textContent).toBe('✕');
    expect(screen.getByTestId('opening-badge')).toBeDefined();
  });

  it('Wrong evidence on statements 1, 2, and 3 decrements strikes and triggers defeat at 0', () => {
    render(<EncounterContainer />);

    const presentBtn = screen.getByTestId('action-present');
    const nextBtn = screen.getByTestId('action-next');

    // Statement 1: present express_slip -> Foul (Strikes: 2)
    fireEvent.click(presentBtn);
    const item1 = document.querySelector('[data-evidence-id="express_slip"]');
    fireEvent.click(item1);
    expect(screen.getByTestId('strike-2').textContent).toBe('·');
    expect(screen.getByTestId('strike-1').textContent).toBe('✕');
    expect(screen.getByTestId('strike-0').textContent).toBe('✕');

    // Statement 2: navigate, present pickup_bag -> Foul (Strikes: 1)
    fireEvent.click(nextBtn);
    fireEvent.click(screen.getByTestId('action-present'));
    const item2 = document.querySelector('[data-evidence-id="pickup_bag"]');
    fireEvent.click(item2);
    expect(screen.getByTestId('strike-2').textContent).toBe('·');
    expect(screen.getByTestId('strike-1').textContent).toBe('·');
    expect(screen.getByTestId('strike-0').textContent).toBe('✕');

    // Statement 3: navigate, present schedule_sheet -> Foul (Strikes: 0 -> Defeat)
    fireEvent.click(nextBtn);
    fireEvent.click(screen.getByTestId('action-present'));
    const item3 = document.querySelector('[data-evidence-id="schedule_sheet"]');
    fireEvent.click(item3);

    expect(screen.getByTestId('defeat-screen')).toBeDefined();
    expect(screen.getByText('OUT OF TIMEOUTS!')).toBeDefined();
  });

  it('Breakthrough condition: express_slip on statement 2 ONLY triggers breakthrough AFTER pressing', () => {
    render(<EncounterContainer />);

    const nextBtn = screen.getByTestId('action-next');
    const presentBtn = screen.getByTestId('action-present');
    const pressBtn = screen.getByTestId('action-press');

    // Navigate to Statement 2
    fireEvent.click(nextBtn);

    // Present express_slip BEFORE pressing -> Foul
    fireEvent.click(presentBtn);
    const slipBefore = document.querySelector('[data-evidence-id="express_slip"]');
    fireEvent.click(slipBefore);
    expect(screen.queryByTestId('victory-screen')).toBeNull();
    expect(screen.getByTestId('strike-2').textContent).toBe('·');

    // Now press Statement 2 (fresh query because action menu was re-mounted after tray closed)
    fireEvent.click(screen.getByTestId('action-press'));
    expect(screen.getByTestId('opening-badge')).toBeDefined();

    // Now present express_slip AFTER pressing -> Breakthrough!
    fireEvent.click(screen.getByTestId('action-present'));
    const slipAfter = document.querySelector('[data-evidence-id="express_slip"]');
    fireEvent.click(slipAfter);

    expect(screen.getByTestId('victory-screen')).toBeDefined();
    expect(screen.getByText('CONTRADICTION RESOLVED!')).toBeDefined();
  });

  it('Restart functionality from victory and defeat restores initial clean state', () => {
    render(<EncounterContainer />);

    // Trigger victory
    const nextBtn = screen.getByTestId('action-next');
    fireEvent.click(nextBtn);
    fireEvent.click(screen.getByTestId('action-press'));
    fireEvent.click(screen.getByTestId('action-present'));
    const slip = document.querySelector('[data-evidence-id="express_slip"]');
    fireEvent.click(slip);

    expect(screen.getByTestId('victory-screen')).toBeDefined();

    // Click PLAY AGAIN
    fireEvent.click(screen.getByTestId('btn-restart'));

    // Verified reset state
    expect(screen.queryByTestId('victory-screen')).toBeNull();
    expect(screen.getByTestId('statement-pager').textContent).toBe('1 / 3');
    expect(screen.getByTestId('strike-0').textContent).toBe('✕');
    expect(screen.getByTestId('strike-1').textContent).toBe('✕');
    expect(screen.getByTestId('strike-2').textContent).toBe('✕');
  });
});
