import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Create hoisted mock store that can be accessed in the vi.mock factory
const { mockStore, mockFunctions } = vi.hoisted(() => {
  const store = { data: {} };

  const fns = {
    createUser: vi.fn(async (firstName, lastName, avatar) => {
      const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      if (store.data[userId]) {
        throw new Error('This name is already taken.');
      }
      const userData = {
        userId,
        displayName: `${firstName} ${lastName.charAt(0)}.`,
        avatar,
        picks: {},
        tiebreaker: '',
        submitted: false,
      };
      store.data[userId] = userData;
      return userData;
    }),
    getUser: vi.fn(async (firstName, lastName) => {
      const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      if (!store.data[userId]) {
        throw new Error('No bracket found.');
      }
      return { userId, ...store.data[userId] };
    }),
    updatePicks: vi.fn(async (userId, picks) => {
      if (store.data[userId]) {
        store.data[userId].picks = picks;
      }
    }),
    updateTiebreaker: vi.fn(async (userId, tiebreaker) => {
      if (store.data[userId]) {
        store.data[userId].tiebreaker = tiebreaker;
      }
    }),
    submitBracket: vi.fn(async (userId) => {
      if (store.data[userId]) {
        store.data[userId].submitted = true;
      }
    }),
    clearSelections: vi.fn(async (userId) => {
      if (store.data[userId]) {
        store.data[userId].picks = {};
        store.data[userId].tiebreaker = '';
        store.data[userId].submitted = false;
      }
    }),
    getLeaderboard: vi.fn(async (isPastDeadline) => {
      return Object.values(store.data).map(user => ({
        id: user.userId,
        displayName: user.displayName,
        avatar: user.avatar,
        pickCount: Object.keys(user.picks || {}).length,
        submitted: user.submitted,
        tiebreaker: isPastDeadline ? user.tiebreaker : null,
        picks: isPastDeadline ? user.picks : null,
        champion: isPastDeadline && user.picks?.SUPER_BOWL ? user.picks.SUPER_BOWL : null,
      }));
    }),
  };

  return { mockStore: store, mockFunctions: fns };
});

// Mock the bracketService module using the hoisted functions
vi.mock('./services/bracketService', () => mockFunctions);

import App from './App';

// Helper functions to access mock store
const resetMockStore = () => {
  mockStore.data = {};
};

const setMockStore = (data) => {
  mockStore.data = { ...data };
};

const getMockStore = () => mockStore.data;

// Re-export mock functions for test access
const { createUser, getUser, updatePicks, updateTiebreaker, submitBracket, clearSelections, getLeaderboard } = mockFunctions;

// Default group password for tests (matches the .env value)
const TEST_GROUP_PASSWORD = 'mag2026';

beforeEach(() => {
  resetMockStore();
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-01-05T12:00:00-08:00'));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  resetMockStore();
});

// Helper to fill in join form and submit
const fillJoinForm = async (firstName = 'John', lastName = 'Doe', password = TEST_GROUP_PASSWORD, mode = 'new') => {
  if (mode === 'returning') {
    fireEvent.click(screen.getByText('Return to My Bracket'));
  }

  fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: firstName } });
  fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: lastName } });
  fireEvent.change(screen.getByPlaceholderText('Group password'), { target: { value: password } });
};

const submitJoinForm = async () => {
  const button = screen.getByRole('button', { name: /create bracket|access bracket/i });
  fireEvent.click(button);
};

// ============================================
// Join Screen Tests
// ============================================
describe('Join Screen', () => {
  it('should render join screen by default', () => {
    render(<App />);
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Group password')).toBeInTheDocument();
  });

  it('should disable button when fields are empty', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /create bracket/i });
    expect(button).toHaveStyle({ opacity: '0.5' });
  });

  it('should enable button when all fields are provided', async () => {
    render(<App />);
    await fillJoinForm();
    const button = screen.getByRole('button', { name: /create bracket/i });
    expect(button).toHaveStyle({ opacity: '1' });
  });

  it('should show countdown timer', () => {
    render(<App />);
    expect(screen.getByText(/until lock/)).toBeInTheDocument();
  });

  it('should render avatar selection buttons for new bracket', () => {
    render(<App />);
    expect(screen.getByText('Choose your avatar')).toBeInTheDocument();
    const expectedAvatars = ['🏈', '🦅', '🐻', '🐆', '🦁', '🐴', '🦬', '⚡', '🏴‍☠️', '🧀', '🌊', '⭐'];
    expectedAvatars.forEach(avatar => {
      expect(screen.getByRole('button', { name: avatar })).toBeInTheDocument();
    });
  });

  it('should hide avatar picker for returning users', async () => {
    // Return mode only available after deadline
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    render(<App />);
    fireEvent.click(screen.getByText('Return to My Bracket'));
    expect(screen.queryByText('Choose your avatar')).not.toBeInTheDocument();
  });

  it('should show error for wrong password', async () => {
    render(<App />);
    await fillJoinForm('John', 'Doe', 'wrongpassword');
    await submitJoinForm();

    await waitFor(() => {
      expect(screen.getByText('Incorrect group password.')).toBeInTheDocument();
    });
  });

  it('should navigate to bracket view on successful join', async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();

    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  });

  it('should allow enter via keyboard on password field', async () => {
    render(<App />);
    await fillJoinForm();

    const passwordInput = screen.getByPlaceholderText('Group password');
    fireEvent.keyPress(passwordInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  });

  it('should show error when name is already taken', async () => {
    // Pre-create a user with the same name
    setMockStore({
      'john_doe': {
        userId: 'john_doe',
        displayName: 'John D.',
        avatar: '🏈',
        picks: {},
        tiebreaker: '',
        submitted: false,
      }
    });

    render(<App />);
    await fillJoinForm();
    await submitJoinForm();

    await waitFor(() => {
      expect(screen.getByText(/already taken/i)).toBeInTheDocument();
    });
  });

  it('should toggle between new bracket and returning modes', async () => {
    // Mode toggle only available after deadline
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    render(<App />);

    // Should start with new bracket mode
    expect(screen.getByRole('button', { name: /create bracket/i })).toBeInTheDocument();

    // Click to switch to returning mode
    fireEvent.click(screen.getByText('Return to My Bracket'));
    expect(screen.getByRole('button', { name: /access bracket/i })).toBeInTheDocument();

    // Click back to new mode
    fireEvent.click(screen.getByText('New Bracket'));
    expect(screen.getByRole('button', { name: /create bracket/i })).toBeInTheDocument();
  });
});

// ============================================
// Bracket View Tests
// ============================================
describe('Bracket View', () => {
  const navigateToBracket = async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  };

  it('should display AFC and NFC sections', async () => {
    await navigateToBracket();
    expect(screen.getAllByText('AFC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NFC').length).toBeGreaterThan(0);
  });

  it('should display Super Bowl section', async () => {
    await navigateToBracket();
    expect(screen.getByText('Super Bowl LX')).toBeInTheDocument();
  });

  it('should show Wild Card, Divisional, and Championship rounds', async () => {
    await navigateToBracket();
    expect(screen.getAllByText(/Wild Card/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Divisional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Championship/i).length).toBeGreaterThan(0);
  });

  it('should display progress counter', async () => {
    await navigateToBracket();
    expect(screen.getByText('0/13')).toBeInTheDocument();
  });

  it('should show header navigation buttons', async () => {
    await navigateToBracket();
    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('should show #1 seed bye for each conference', async () => {
    await navigateToBracket();
    expect(screen.getAllByText(/First Round Bye/i).length).toBe(2);
  });

  it('should show tiebreaker input', async () => {
    await navigateToBracket();
    expect(screen.getByPlaceholderText('e.g. 47')).toBeInTheDocument();
  });

  it('should logout and return to join screen', async () => {
    await navigateToBracket();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    });
  });
});

// ============================================
// Making Picks Tests
// ============================================
describe('Making Picks', () => {
  const navigateToBracket = async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  };

  it('should update progress when making a pick', async () => {
    await navigateToBracket();

    const patriotsTeam = screen.getByText(/New England Patriots/);
    fireEvent.click(patriotsTeam);

    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });
  });

  it('should deselect a team when clicking on it again', async () => {
    await navigateToBracket();

    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('0/13')).toBeInTheDocument();
    });
  });

  it('should show upset indicator when lower seed selected', async () => {
    await navigateToBracket();

    const chargersTeam = screen.getByText(/Los Angeles Chargers/);
    fireEvent.click(chargersTeam);

    await waitFor(() => {
      expect(screen.getByText(/UPSET/)).toBeInTheDocument();
    });
  });

  it('should allow making multiple wild card picks', async () => {
    await navigateToBracket();

    fireEvent.click(screen.getByText(/New England Patriots/));
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    fireEvent.click(screen.getByText(/Pittsburgh Steelers/));

    await waitFor(() => {
      expect(screen.getByText('3/13')).toBeInTheDocument();
    });
  });

  it('should call updatePicks when making a pick', async () => {
    await navigateToBracket();

    fireEvent.click(screen.getByText(/New England Patriots/));

    // Wait for debounced save
    await vi.advanceTimersByTimeAsync(600);

    expect(updatePicks).toHaveBeenCalled();
  });

  it('should show clear all selections button', async () => {
    await navigateToBracket();
    expect(screen.getByRole('button', { name: /clear all selections/i })).toBeInTheDocument();
  });

  it('should clear selections when clicking clear button', async () => {
    await navigateToBracket();

    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear all selections/i }));

    await waitFor(() => {
      expect(screen.getByText('0/13')).toBeInTheDocument();
    });
  });
});

// ============================================
// Leaderboard Tests
// ============================================
describe('Leaderboard', () => {
  const navigateToLeaderboard = async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));
  };

  it('should show leaderboard title', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });
  });

  it('should show current user in leaderboard', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByText('John D. (You)')).toBeInTheDocument();
    });
  });

  it('should show back to bracket button', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my bracket/i })).toBeInTheDocument();
    });
  });

  it('should navigate back to bracket', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /my bracket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /my bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  });

  it('should show scoring rules', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByText('5 pts')).toBeInTheDocument();
      expect(screen.getByText('10 pts')).toBeInTheDocument();
      expect(screen.getByText('25 pts')).toBeInTheDocument();
      expect(screen.getByText('50 pts')).toBeInTheDocument();
    });
  });

  it('should show picks hidden message before deadline', async () => {
    await navigateToLeaderboard();
    await waitFor(() => {
      expect(screen.getByText(/picks are hidden until the deadline/i)).toBeInTheDocument();
    });
  });
});

// ============================================
// Leaderboard After Deadline Tests
// ============================================
describe('Leaderboard After Deadline', () => {
  const setupWithOtherUsers = async () => {
    // Pre-populate other users
    setMockStore({
      'sarah_miller': {
        userId: 'sarah_miller',
        displayName: 'Sarah M.',
        avatar: '🦅',
        picks: { AFC_WC_0: 'NE', AFC_WC_1: 'JAX' },
        tiebreaker: '42',
        submitted: true,
      }
    });

    // Create bracket before deadline (default time from global beforeEach)
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });

    // Now advance past deadline
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    await vi.advanceTimersByTimeAsync(60000);

    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));
  };

  it('should show compare buttons after deadline', async () => {
    await setupWithOtherUsers();
    await waitFor(() => {
      expect(screen.getAllByTitle('Compare picks').length).toBeGreaterThan(0);
    });
  });

  // TODO: Fix mock timing issue - setMockStore data not persisting correctly for multi-user scenarios
  it.skip('should show tiebreaker values after deadline', async () => {
    await setupWithOtherUsers();
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('should show head-to-head comparison modal', async () => {
    await setupWithOtherUsers();
    await waitFor(() => {
      const compareButtons = screen.getAllByTitle('Compare picks');
      fireEvent.click(compareButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
    });
  });
});

// ============================================
// Deadline Behavior Tests
// ============================================
describe('Deadline Behavior', () => {
  it('should show Picks Locked after deadline', async () => {
    // Create bracket before deadline (default time from global beforeEach)
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });

    // Advance past deadline
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    await vi.advanceTimersByTimeAsync(60000);

    await waitFor(() => {
      expect(screen.getByText('Picks Locked')).toBeInTheDocument();
    });
  });

  it('should disable picking after deadline', async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });

    // Make a pick before deadline
    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    // Advance past deadline
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));
    await vi.advanceTimersByTimeAsync(60000);

    await waitFor(() => {
      expect(screen.getByText('Picks Locked')).toBeInTheDocument();
    });

    // Try to make another pick - should not change
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/));
    expect(screen.getByText('1/13')).toBeInTheDocument();
  });
});

// ============================================
// Mobile Navigation Tests
// ============================================
describe('Mobile Navigation', () => {
  const navigateToBracket = async () => {
    render(<App />);
    await fillJoinForm();
    await submitJoinForm();
    await waitFor(() => {
      expect(screen.getByText("John D.'s Bracket")).toBeInTheDocument();
    });
  };

  it('should have mobile tab navigation', async () => {
    await navigateToBracket();
    const afcTab = screen.getByRole('button', { name: 'AFC' });
    const nfcTab = screen.getByRole('button', { name: 'NFC' });
    const sbTab = screen.getByRole('button', { name: 'Super Bowl' });

    expect(afcTab).toBeInTheDocument();
    expect(nfcTab).toBeInTheDocument();
    expect(sbTab).toBeInTheDocument();
  });
});
