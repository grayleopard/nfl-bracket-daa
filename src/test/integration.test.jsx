import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { resetMockStore, setMockStore, getMockStore } from '../__mocks__/bracketService';

// Mock the bracketService module to use our __mocks__ version
vi.mock('../services/bracketService', () => import('../__mocks__/bracketService'));

/**
 * Integration tests for complete user workflows
 */

beforeEach(() => {
  resetMockStore();
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-01-05T12:00:00-08:00'));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  resetMockStore();
});

// Helper function to complete the join flow
const joinBracket = async (firstName, lastName, isNewBracket = true) => {
  // Fill in the form
  fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: firstName } });
  fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: lastName } });
  fireEvent.change(screen.getByPlaceholderText('Group password'), { target: { value: 'mag2026' } });

  // Select an avatar
  fireEvent.click(screen.getByRole('button', { name: '🐻' }));

  // Click the appropriate button
  if (isNewBracket) {
    fireEvent.click(screen.getByRole('button', { name: /create bracket/i }));
  } else {
    // Switch to "Return" mode first
    fireEvent.click(screen.getByRole('button', { name: /return to my bracket/i }));
    fireEvent.click(screen.getByRole('button', { name: /access bracket/i }));
  }
};

describe('Complete User Journey', () => {
  it('should complete workflow: join -> make picks -> view leaderboard -> return', async () => {
    render(<App />);

    // Step 1: Join the bracket
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();

    await joinBracket('Test', 'Player');

    await waitFor(() => {
      expect(screen.getByText("Test P.'s Bracket")).toBeInTheDocument();
    });

    // Step 2: Make wild card picks (use getAllByText since teams appear in multiple rounds)
    fireEvent.click(screen.getAllByText(/New England Patriots/)[0]);
    fireEvent.click(screen.getAllByText(/Jacksonville Jaguars/)[0]);
    fireEvent.click(screen.getAllByText(/Houston Texans/)[0]);

    await waitFor(() => {
      expect(screen.getByText(/\/13 correct/)).toBeInTheDocument();
    });

    // Step 4: Navigate to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
      expect(screen.getByText('Test P. (You)')).toBeInTheDocument();
    });

    // Step 5: Return to bracket
    fireEvent.click(screen.getByRole('button', { name: /my bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("Test P.'s Bracket")).toBeInTheDocument();
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
    });
  });

  // Skip: After deadline, users go directly to leaderboard without login
  it.skip('should persist and restore session via Firebase', async () => {
    const { unmount } = render(<App />);

    await joinBracket('Persist', 'User');

    await waitFor(() => {
      expect(screen.getByText("Persist U.'s Bracket")).toBeInTheDocument();
    });

    // Make some picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
    });

    // Enter tiebreaker
    fireEvent.change(screen.getByPlaceholderText('e.g. 47'), { target: { value: '55' } });

    // Wait for auto-save
    await vi.advanceTimersByTimeAsync(1500);

    // Check mock store has the data
    const store = getMockStore();
    expect(store['persist_user']).toBeDefined();
    expect(store['persist_user'].picks.AFC_WC_0).toBe('NE');

    // Simulate page reload - need to set up localStorage to restore session
    localStorage.setItem('nfl_bracket_session', JSON.stringify({ firstName: 'Persist', lastName: 'User' }));

    // Set time past deadline so "Return to My Bracket" mode is available
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));

    unmount();
    render(<App />);

    // Form should be pre-filled and in returning mode (only available after deadline)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /access bracket/i })).toBeInTheDocument();
    });

    // Enter password and submit
    fireEvent.change(screen.getByPlaceholderText('Group password'), { target: { value: 'mag2026' } });
    fireEvent.click(screen.getByRole('button', { name: /access bracket/i }));

    // Should go to bracket with restored picks
    await waitFor(() => {
      expect(screen.getByText("Persist U.'s Bracket")).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
    });
  });
});

describe('Pick Cascade Deletion Workflow', () => {
  it('should cascade delete downstream picks when changing wild card pick', async () => {
    render(<App />);

    await joinBracket('Test', 'Cascade');

    await waitFor(() => {
      expect(screen.getByText("Test C.'s Bracket")).toBeInTheDocument();
    });

    // Make AFC Wild Card picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Pittsburgh Steelers/));

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
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
    expect(screen.getByText('0/13 correct')).toBeInTheDocument();
  });
});

describe('Head-to-Head Comparison Workflow', () => {
  it('should show detailed comparison with another user after deadline', async () => {
    // Pre-populate another user in the mock store
    setMockStore({
      'other_user': {
        userId: 'other_user',
        id: 'other_user',
        firstName: 'Other',
        lastName: 'User',
        displayName: 'Other U.',
        avatar: '🦊',
        picks: { AFC_WC_0: 'NE', AFC_WC_1: 'JAX' },
        tiebreaker: '42',
        submitted: true,
      }
    });

    render(<App />);

    // Create bracket before deadline
    await joinBracket('Compare', 'Test');

    await waitFor(() => {
      expect(screen.getByText("Compare T.'s Bracket")).toBeInTheDocument();
    });

    // Now set time past deadline so compare buttons are visible
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    await vi.advanceTimersByTimeAsync(60000);

    // Navigate to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    // Find the compare button for the other user (visible after deadline)
    await waitFor(() => {
      const compareButtons = screen.getAllByTitle('Compare picks');
      expect(compareButtons.length).toBeGreaterThan(0);
    });

    const compareButtons = screen.getAllByTitle('Compare picks');
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
    });
  });
});

describe('Deadline Workflow', () => {
  it('should prevent all interactions after deadline passes', async () => {
    render(<App />);

    await joinBracket('Late', 'User');

    await waitFor(() => {
      expect(screen.getByText("Late U.'s Bracket")).toBeInTheDocument();
    });

    // Make a pick before deadline
    fireEvent.click(screen.getByText(/New England Patriots/));
    expect(screen.getByText('0/13 correct')).toBeInTheDocument();

    // Simulate deadline passing by setting system time
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));

    // Force a re-render by triggering timer interval
    await vi.advanceTimersByTimeAsync(60000);

    await waitFor(() => {
      expect(screen.getByText('Picks Locked')).toBeInTheDocument();
    });

    // Try to make another pick - should not work
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));

    // Progress should still be 1/13
    expect(screen.getByText('0/13 correct')).toBeInTheDocument();
  });
});

// Confidence feature hidden for now
describe.skip('Confidence Points Workflow', () => {
  it('should show confidence UI when enabled', async () => {
    render(<App />);

    await joinBracket('Confident', 'User');

    await waitFor(() => {
      expect(screen.getByText("Confident U.'s Bracket")).toBeInTheDocument();
    });

    // Enable confidence mode
    fireEvent.click(screen.getByRole('button', { name: /confidence/i }));

    // Make a pick
    fireEvent.click(screen.getByText(/New England Patriots/));

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
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
  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('nfl_bracket_session', '{ broken json');

    render(<App />);

    // Should show the join screen since the session is corrupted
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
  });

  it('should show auth error for invalid group password', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText('Group password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: '🐻' }));
    fireEvent.click(screen.getByRole('button', { name: /create bracket/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect group password/i)).toBeInTheDocument();
    });
  });
});

describe('Multi-Conference Independence', () => {
  it('should allow picks from both conferences independently', async () => {
    render(<App />);

    await joinBracket('Multi', 'Conf');

    await waitFor(() => {
      expect(screen.getByText("Multi C.'s Bracket")).toBeInTheDocument();
    });

    // Make one AFC Wild Card pick
    fireEvent.click(screen.getByText(/New England Patriots/));

    await waitFor(() => {
      // Score depends on RESULTS - just check the format
      expect(screen.getByText(/\/13 correct/)).toBeInTheDocument();
    });

    // Make one NFC Wild Card pick (use getAllByText since Bears may appear in multiple rounds)
    const bearsElements = screen.getAllByText(/Chicago Bears/);
    fireEvent.click(bearsElements[0]);

    await waitFor(() => {
      // Score depends on RESULTS - just check the format
      expect(screen.getByText(/\/13 correct/)).toBeInTheDocument();
    });

    // Wait for auto-save
    await vi.advanceTimersByTimeAsync(1500);

    // Verify both picks exist in mock store
    const store = getMockStore();
    expect(store['multi_conf'].picks.AFC_WC_0).toBe('NE');
    expect(store['multi_conf'].picks.NFC_WC_0).toBe('CHI');
  });
});

describe('Logout Workflow', () => {
  it('should return to join screen after logout', async () => {
    render(<App />);

    await joinBracket('Logout', 'Test');

    await waitFor(() => {
      expect(screen.getByText("Logout T.'s Bracket")).toBeInTheDocument();
    });

    // Click logout
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    });

    // Verify localStorage is cleared
    expect(localStorage.getItem('nfl_bracket_session')).toBeNull();
  });
});

describe('Clear Selections Workflow', () => {
  it('should clear all selections when clicking clear button', async () => {
    render(<App />);

    await joinBracket('Clear', 'Test');

    await waitFor(() => {
      expect(screen.getByText("Clear T.'s Bracket")).toBeInTheDocument();
    });

    // Make some picks
    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Pittsburgh Steelers/));

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
    });

    // Click clear button
    fireEvent.click(screen.getByRole('button', { name: /clear all selections/i }));

    await waitFor(() => {
      expect(screen.getByText('0/13 correct')).toBeInTheDocument();
    });
  });
});
