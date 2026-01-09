// Mock implementation of bracketService for testing
import { vi } from 'vitest';

// In-memory store for test data
let mockStore = {};

export const resetMockStore = () => {
  mockStore = {};
};

export const getMockStore = () => mockStore;

export const setMockStore = (data) => {
  mockStore = { ...data };
};

export const createUser = vi.fn(async (firstName, lastName, avatar) => {
  const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

  if (mockStore[userId]) {
    throw new Error('This name is already taken. If this is you, click "Return to My Bracket" instead.');
  }

  const userData = {
    userId,
    id: userId,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName.charAt(0)}.`,
    avatar,
    picks: {},
    tiebreaker: '',
    submitted: false,
  };

  mockStore[userId] = userData;
  return userData;
});

export const getUser = vi.fn(async (firstName, lastName) => {
  const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

  if (!mockStore[userId]) {
    throw new Error('No bracket found with this name. Please check your spelling or create a new bracket.');
  }

  return { userId, ...mockStore[userId] };
});

export const updatePicks = vi.fn(async (userId, picks) => {
  if (mockStore[userId]) {
    mockStore[userId].picks = picks;
  }
});

export const updateTiebreaker = vi.fn(async (userId, tiebreaker) => {
  if (mockStore[userId]) {
    mockStore[userId].tiebreaker = tiebreaker;
  }
});

export const submitBracket = vi.fn(async (userId) => {
  if (mockStore[userId]) {
    mockStore[userId].submitted = true;
  }
});

export const clearSelections = vi.fn(async (userId) => {
  if (mockStore[userId]) {
    mockStore[userId].picks = {};
    mockStore[userId].tiebreaker = '';
    mockStore[userId].submitted = false;
  }
});

export const getLeaderboard = vi.fn(async (isPastDeadline) => {
  return Object.values(mockStore).map(user => ({
    id: user.userId,
    displayName: user.displayName,
    avatar: user.avatar,
    pickCount: Object.keys(user.picks || {}).length,
    submitted: user.submitted,
    tiebreaker: isPastDeadline ? user.tiebreaker : null,
    picks: isPastDeadline ? user.picks : null,
    champion: isPastDeadline && user.picks?.SUPER_BOWL ? user.picks.SUPER_BOWL : null,
  }));
});

export const getAllUsers = vi.fn(async () => {
  return Object.values(mockStore);
});
