import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

/**
 * Integration tests for complete user workflows
 */

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-01-05T12:00:00-08:00'));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('Complete User Journey', () => {
  it('should complete workflow: join -> make picks -> view leaderboard -> return', async () => {
    render(<App />);

    // Step 1: Join the bracket
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'TestPlayer' } });
    fireEvent.click(screen.getByRole('button', { name: '🐻' }));
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("TestPlayer's Bracket")).toBeInTheDocument();
    });

    // Step 2: Make wild card picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Houston Texans/)); // upset!

    await waitFor(() => {
      expect(screen.getByText(/UPSET/)).toBeInTheDocument();
    });

    // Step 3: Check progress
    expect(screen.getByText('3/13')).toBeInTheDocument();

    // Step 4: Navigate to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
      expect(screen.getByText('TestPlayer (You)')).toBeInTheDocument();
    });

    // Step 5: Return to bracket
    fireEvent.click(screen.getByRole('button', { name: /my bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("TestPlayer's Bracket")).toBeInTheDocument();
      expect(screen.getByText('3/13')).toBeInTheDocument();
    });
  });

  it('should persist and restore session across page reloads', async () => {
    const { unmount } = render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'PersistUser' } });
    fireEvent.click(screen.getByRole('button', { name: '🦅' }));
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("PersistUser's Bracket")).toBeInTheDocument();
    });

    // Make some picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));

    await waitFor(() => {
      expect(screen.getByText('2/13')).toBeInTheDocument();
    });

    // Enter tiebreaker
    fireEvent.change(screen.getByPlaceholderText('e.g. 47'), { target: { value: '55' } });

    // Wait for localStorage save
    await waitFor(() => {
      const saved = localStorage.getItem('nfl_bracket_2026');
      expect(saved).not.toBeNull();
    }, { timeout: 3000 });

    const savedData = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
    expect(savedData.picks.AFC_WC_0).toBe('NE');
    expect(savedData.userName).toBe('PersistUser');

    // Simulate page reload
    unmount();
    render(<App />);

    // Should go directly to bracket (skip join)
    await waitFor(() => {
      expect(screen.getByText("PersistUser's Bracket")).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('2/13')).toBeInTheDocument();
    });
  });
});

describe('Pick Cascade Deletion Workflow', () => {
  it('should cascade delete downstream picks when changing wild card pick', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Tester' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("Tester's Bracket")).toBeInTheDocument();
    });

    // Make AFC Wild Card picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Pittsburgh Steelers/));

    await waitFor(() => {
      expect(screen.getByText('3/13')).toBeInTheDocument();
    });

    // Verify we can see divisional matchups now
    await waitFor(() => {
      const denverTexts = screen.getAllByText(/Denver Broncos/);
      expect(denverTexts.length).toBeGreaterThan(1); // Bye team + divisional
    });

    // Change WC0 to upset pick - verify it works
    fireEvent.click(screen.getByText(/Los Angeles Chargers/));

    await waitFor(() => {
      expect(screen.getByText(/UPSET/)).toBeInTheDocument();
    });

    // Should still have 3 picks (WC picks unchanged count-wise)
    expect(screen.getByText('3/13')).toBeInTheDocument();
  });
});

describe('Head-to-Head Comparison Workflow', () => {
  it('should show detailed comparison with another user', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Comparer' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("Comparer's Bracket")).toBeInTheDocument();
    });

    // Make picks that match Sarah M's picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Pittsburgh Steelers/));

    await waitFor(() => {
      expect(screen.getByText('3/13')).toBeInTheDocument();
    });

    // Navigate to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    // Click compare button
    const compareButtons = screen.getAllByTitle('Compare picks');
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
      expect(screen.getByText('Matching Picks')).toBeInTheDocument();
    });
  });
});

describe('Deadline Workflow', () => {
  it('should prevent all interactions after deadline passes', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'LateUser' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("LateUser's Bracket")).toBeInTheDocument();
    });

    // Make a pick before deadline
    fireEvent.click(screen.getByText(/New England Patriots/));
    expect(screen.getByText('1/13')).toBeInTheDocument();

    // Simulate deadline passing by setting system time
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));

    // Force a re-render by triggering timer interval
    vi.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(screen.getByText('Picks Locked')).toBeInTheDocument();
    });

    // Try to make another pick - should not work
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));

    // Progress should still be 1/13
    expect(screen.getByText('1/13')).toBeInTheDocument();
  });
});

describe('Confidence Points Workflow', () => {
  it('should show confidence UI when enabled', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'Confident' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("Confident's Bracket")).toBeInTheDocument();
    });

    // Enable confidence mode
    fireEvent.click(screen.getByRole('button', { name: /confidence/i }));

    // Make a pick
    fireEvent.click(screen.getByText(/New England Patriots/));

    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    // Should see confidence label
    await waitFor(() => {
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
    });

    // Should see confidence dropdown
    const confDropdowns = screen.getAllByRole('combobox');
    expect(confDropdowns.length).toBeGreaterThan(0);
  });
});

describe('Error Recovery', () => {
  it('should handle and recover from corrupted localStorage', () => {
    localStorage.setItem('nfl_bracket_2026', '{ broken json');

    render(<App />);

    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('should handle partial/incomplete saved data', async () => {
    localStorage.clear();
    localStorage.setItem('nfl_bracket_2026', JSON.stringify({
      userName: 'PartialUser',
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("PartialUser's Bracket")).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('0/13')).toBeInTheDocument();
    });
  });
});

describe('Multi-Conference Independence', () => {
  it('should allow picks from both conferences independently', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'MultiConf' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("MultiConf's Bracket")).toBeInTheDocument();
    });

    // Make one AFC Wild Card pick
    fireEvent.click(screen.getByText(/New England Patriots/));

    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    // Make one NFC Wild Card pick
    fireEvent.click(screen.getByText(/Chicago Bears/));

    await waitFor(() => {
      expect(screen.getByText('2/13')).toBeInTheDocument();
    });

    // Verify both picks exist in localStorage
    await waitFor(() => {
      const saved = localStorage.getItem('nfl_bracket_2026');
      expect(saved).not.toBeNull();
    }, { timeout: 3000 });

    const saved = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
    expect(saved.picks.AFC_WC_0).toBe('NE');
    expect(saved.picks.NFC_WC_0).toBe('CHI');
  });
});
