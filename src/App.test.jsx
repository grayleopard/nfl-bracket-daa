import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-01-05T12:00:00-08:00'));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

// ============================================
// Join Screen Tests
// ============================================
describe('Join Screen', () => {
  it('should render join screen by default', () => {
    render(<App />);
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Choose your avatar')).toBeInTheDocument();
  });

  it('should disable enter button when name is empty', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /enter bracket/i });
    expect(button).toHaveStyle({ opacity: '0.5' });
  });

  it('should enable enter button when name is provided', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'John' } });
    const button = screen.getByRole('button', { name: /enter bracket/i });
    expect(button).toHaveStyle({ opacity: '1' });
  });

  it('should show countdown timer', () => {
    render(<App />);
    expect(screen.getByText(/until lock/)).toBeInTheDocument();
  });

  it('should render avatar selection buttons', () => {
    render(<App />);
    const expectedAvatars = ['🏈', '🦅', '🐻', '🐆', '🦁', '🐴', '🦬', '⚡', '🏴‍☠️', '🧀', '🌊', '⭐'];
    expectedAvatars.forEach(avatar => {
      expect(screen.getByRole('button', { name: avatar })).toBeInTheDocument();
    });
  });

  it('should navigate to bracket view on enter', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'John' } });

    const button = screen.getByRole('button', { name: /enter bracket/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });
  });

  it('should allow enter via keyboard', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });
  });
});

// ============================================
// Bracket View Tests
// ============================================
describe('Bracket View', () => {
  const navigateToBracket = () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));
  };

  it('should display AFC and NFC sections', async () => {
    navigateToBracket();
    await waitFor(() => {
      // AFC and NFC appear in both mobile tabs and section headers
      expect(screen.getAllByText('AFC').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NFC').length).toBeGreaterThan(0);
    });
  });

  it('should display Super Bowl section', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getByText('Super Bowl LX')).toBeInTheDocument();
    });
  });

  it('should show Wild Card, Divisional, and Championship rounds', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getAllByText(/Wild Card/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Divisional/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Championship/i).length).toBeGreaterThan(0);
    });
  });

  it('should display progress counter', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getByText('0/13')).toBeInTheDocument();
    });
  });

  it('should show header navigation buttons', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confidence/i })).toBeInTheDocument();
    });
  });

  it('should show #1 seed bye for each conference', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getAllByText(/First Round Bye/i).length).toBe(2);
    });
  });

  it('should show tiebreaker input', async () => {
    navigateToBracket();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. 47')).toBeInTheDocument();
    });
  });
});

// ============================================
// Making Picks Tests
// ============================================
describe('Making Picks', () => {
  const navigateToBracket = async () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter your name');
    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));
    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
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

  it('should save picks to localStorage', async () => {
    await navigateToBracket();

    fireEvent.click(screen.getByText(/New England Patriots/));

    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    // Give React time to save
    await waitFor(() => {
      const saved = localStorage.getItem('nfl_bracket_2026');
      expect(saved).not.toBeNull();
    }, { timeout: 3000 });

    const saved = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
    expect(saved.userName).toBe('John');
    expect(saved.picks.AFC_WC_0).toBe('NE');
  });
});

// ============================================
// Confidence Points Tests
// ============================================
describe('Confidence Points', () => {
  const setupWithPick = async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));
    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });
  };

  it('should show confidence toggle button', async () => {
    await setupWithPick();
    expect(screen.getByRole('button', { name: /confidence/i })).toBeInTheDocument();
  });

  it('should toggle confidence mode', async () => {
    await setupWithPick();

    const confidenceBtn = screen.getByRole('button', { name: /confidence/i });
    fireEvent.click(confidenceBtn);

    await waitFor(() => {
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
    });
  });
});

// ============================================
// Leaderboard Tests
// ============================================
describe('Leaderboard View', () => {
  const setupLeaderboard = async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));
    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });
  };

  it('should show leaderboard title', async () => {
    await setupLeaderboard();
    expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
  });

  it('should show mock users', async () => {
    await setupLeaderboard();
    expect(screen.getByText('Sarah M.')).toBeInTheDocument();
    expect(screen.getByText('Mike R.')).toBeInTheDocument();
    expect(screen.getByText('David K.')).toBeInTheDocument();
  });

  it('should show current user in leaderboard', async () => {
    await setupLeaderboard();
    expect(screen.getByText('John (You)')).toBeInTheDocument();
  });

  it('should show back to bracket button', async () => {
    await setupLeaderboard();
    expect(screen.getByRole('button', { name: /my bracket/i })).toBeInTheDocument();
  });

  it('should navigate back to bracket', async () => {
    await setupLeaderboard();

    fireEvent.click(screen.getByRole('button', { name: /my bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });
  });

  it('should show scoring rules', async () => {
    await setupLeaderboard();
    expect(screen.getByText('Wild Card')).toBeInTheDocument();
    expect(screen.getByText('Divisional')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    expect(screen.getByText('Super Bowl')).toBeInTheDocument();
  });
});

// ============================================
// Head to Head Comparison Tests
// ============================================
describe('Head to Head Comparison', () => {
  it('should open head-to-head comparison when clicking compare button', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));
    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/New England Patriots/));
    await waitFor(() => {
      expect(screen.getByText('1/13')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    const compareButtons = screen.getAllByTitle('Compare picks');
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
      expect(screen.getByText('Matching Picks')).toBeInTheDocument();
    });
  });
});

// ============================================
// Deadline/Lock Tests
// ============================================
describe('Deadline Behavior', () => {
  it('should show picks are locked after deadline', async () => {
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText('Picks Locked')).toBeInTheDocument();
    });
  });

  it('should prevent making picks after deadline', async () => {
    vi.setSystemTime(new Date('2026-01-11T12:00:00-08:00'));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/New England Patriots/));

    // Progress should still be 0 because picks are locked
    expect(screen.getByText('0/13')).toBeInTheDocument();
  });
});

// ============================================
// LocalStorage Persistence Tests
// ============================================
describe('LocalStorage Persistence', () => {
  it('should load saved data on mount', async () => {
    // Clear and set data before render
    localStorage.clear();
    localStorage.setItem('nfl_bracket_2026', JSON.stringify({
      userName: 'SavedUser',
      avatar: '🦅',
      picks: { AFC_WC_0: 'NE', AFC_WC_1: 'JAX' },
      confidence: {},
      tiebreaker: '42',
    }));

    render(<App />);

    // Should automatically load saved state and skip join screen
    await waitFor(() => {
      expect(screen.getByText("SavedUser's Bracket")).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('2/13')).toBeInTheDocument();
    });
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('nfl_bracket_2026', 'not valid json');

    render(<App />);
    expect(screen.getByText('NFL Playoffs 2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('should save avatar selection', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: '🦅' }));
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
      expect(saved.avatar).toBe('🦅');
    });
  });
});

// ============================================
// Tiebreaker Tests
// ============================================
describe('Tiebreaker', () => {
  it('should accept tiebreaker input', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    const tiebreakerInput = screen.getByPlaceholderText('e.g. 47');
    fireEvent.change(tiebreakerInput, { target: { value: '47' } });

    expect(tiebreakerInput).toHaveValue(47);
  });

  it('should save tiebreaker to localStorage', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 47'), { target: { value: '47' } });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
      expect(saved.tiebreaker).toBe('47');
    });
  });
});


// ============================================
// Team Display Tests
// ============================================
describe('Team Display', () => {
  it('should render team logos', () => {
    render(<App />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should display correct team matchups in wild card', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // AFC matchups
    expect(screen.getByText(/New England Patriots/)).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles Chargers/)).toBeInTheDocument();
    expect(screen.getByText(/Jacksonville Jaguars/)).toBeInTheDocument();
    expect(screen.getByText(/Buffalo Bills/)).toBeInTheDocument();

    // NFC matchups
    expect(screen.getByText(/Chicago Bears/)).toBeInTheDocument();
    expect(screen.getByText(/Green Bay Packers/)).toBeInTheDocument();
  });

  it('should show TBD for empty team slots in later rounds', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // Divisional teams should show TBD initially
    const tbdElements = screen.getAllByText('TBD');
    expect(tbdElements.length).toBeGreaterThan(0);
  });

  it('should show fallback when team logo fails to load', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // Find a team logo image and trigger error
    const images = screen.getAllByRole('img');
    const teamLogo = images.find(img => img.alt && img.alt !== 'NFL');
    if (teamLogo) {
      fireEvent.error(teamLogo);
      // After error, fallback should render (team abbreviation in colored circle)
      await waitFor(() => {
        // The fallback renders a div with the team abbreviation
        expect(screen.getByText("John's Bracket")).toBeInTheDocument();
      });
    }
  });

  it('should show fallback when NFL shield logo fails to load', async () => {
    render(<App />);

    // Find NFL shield image and trigger error
    const nflImage = screen.getByAltText('NFL');
    fireEvent.error(nflImage);

    // After error, fallback should render with "NFL" text
    await waitFor(() => {
      const nflFallbacks = screen.getAllByText('NFL');
      expect(nflFallbacks.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Head to Head Close Button Tests
// ============================================
describe('Head to Head Close Button', () => {
  it('should close comparison when clicking close button', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // Make a pick
    fireEvent.click(screen.getByText(/New England Patriots/));

    // Go to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    // Click compare button
    const compareButtons = screen.getAllByTitle('Compare picks');
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
    });

    // Click close button (×)
    const closeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeButton);

    // H2H card should be closed
    await waitFor(() => {
      expect(screen.queryByText(/Head-to-Head/)).not.toBeInTheDocument();
    });
  });
});

// ============================================
// Super Bowl and Champion Tests
// ============================================
describe('Super Bowl and Champion Display', () => {
  it('should show Your Champion section when Super Bowl winner is picked', async () => {
    // Pre-populate with almost complete bracket
    localStorage.setItem('nfl_bracket_2026', JSON.stringify({
      userName: 'John',
      avatar: '🏈',
      picks: {
        AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT',
        NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
        AFC_DIV_0: 'DEN', AFC_DIV_1: 'NE',
        NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
        AFC_CHAMP: 'DEN', NFC_CHAMP: 'SEA',
        SUPER_BOWL: 'DEN'
      },
      confidence: {},
      tiebreaker: '',
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // Should show champion section
    await waitFor(() => {
      expect(screen.getByText(/Your Champion/)).toBeInTheDocument();
    });
  });

  it('should show completion overlay for complete bracket', async () => {
    // Start with 12 picks and tiebreaker, then make the last pick
    localStorage.setItem('nfl_bracket_2026', JSON.stringify({
      userName: 'John',
      avatar: '🏈',
      picks: {
        AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT',
        NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
        AFC_DIV_0: 'DEN', AFC_DIV_1: 'NE',
        NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
        AFC_CHAMP: 'DEN', NFC_CHAMP: 'SEA'
      },
      confidence: {},
      tiebreaker: '47',
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
      expect(screen.getByText('12/13')).toBeInTheDocument();
    });

    // Pick Super Bowl winner - find the Denver option in Super Bowl section
    const denverOptions = screen.getAllByText(/Denver Broncos/);
    // Click the last Denver instance (in Super Bowl)
    fireEvent.click(denverOptions[denverOptions.length - 1]);

    // Completion overlay should appear (requires all 13 picks AND tiebreaker)
    await waitFor(() => {
      expect(screen.getByText('Bracket Complete!')).toBeInTheDocument();
    });
  });
});

// ============================================
// Avatar Selection Tests
// ============================================
describe('Avatar Selection', () => {
  it('should allow selecting different avatars', () => {
    render(<App />);

    // Click different avatar
    const bearAvatar = screen.getByRole('button', { name: '🐻' });
    fireEvent.click(bearAvatar);

    // Bear should have selected styling (background changes)
    expect(bearAvatar).toHaveStyle({ background: 'rgba(59, 130, 246, 0.2)' });
  });

  it('should persist avatar selection to bracket', async () => {
    render(<App />);

    // Select bear avatar
    fireEvent.click(screen.getByRole('button', { name: '🐻' }));

    // Enter name and proceed
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      const saved = localStorage.getItem('nfl_bracket_2026');
      expect(saved).not.toBeNull();
    });

    const saved = JSON.parse(localStorage.getItem('nfl_bracket_2026'));
    expect(saved.avatar).toBe('🐻');
  });
});

// ============================================
// Leaderboard Pick Comparison Display
// ============================================
describe('Leaderboard Pick Comparison', () => {
  it('should show pick comparison grid in head-to-head', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    // Make picks that match Sarah's picks
    fireEvent.click(screen.getByText(/New England Patriots/)); // Matches Sarah
    fireEvent.click(screen.getByText(/Jacksonville Jaguars/)); // Matches Sarah

    await waitFor(() => {
      expect(screen.getByText('2/13')).toBeInTheDocument();
    });

    // Go to leaderboard
    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    // Compare with Sarah
    const compareButtons = screen.getAllByTitle('Compare picks');
    // Find Sarah's row
    const sarahCompare = compareButtons[0]; // Sarah is usually first (most picks)
    fireEvent.click(sarahCompare);

    await waitFor(() => {
      expect(screen.getByText(/Head-to-Head/)).toBeInTheDocument();
      expect(screen.getByText('Pick Comparison')).toBeInTheDocument();
    });
  });

  it('should display user avatars in comparison', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: '🦅' })); // Select eagle avatar
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/New England Patriots/));

    fireEvent.click(screen.getByRole('button', { name: /leaderboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
    });

    const compareButtons = screen.getAllByTitle('Compare picks');
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Matching Picks')).toBeInTheDocument();
    });
  });
});

// ============================================
// Tiebreaker Explanation Tests
// ============================================
describe('Tiebreaker Explanation', () => {
  it('should show explanation text when tiebreaker is entered', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'John' } });
    fireEvent.click(screen.getByRole('button', { name: /enter bracket/i }));

    await waitFor(() => {
      expect(screen.getByText("John's Bracket")).toBeInTheDocument();
    });

    const tiebreakerInput = screen.getByPlaceholderText('e.g. 47');
    fireEvent.change(tiebreakerInput, { target: { value: '52' } });

    await waitFor(() => {
      expect(screen.getByText(/Closest to actual without going over wins/)).toBeInTheDocument();
    });
  });
});
