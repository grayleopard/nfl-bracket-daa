import { describe, it, expect } from 'vitest';
import {
  NFL_TEAMS,
  SEEDS,
  CONFIDENCE_POINTS,
  isUpset,
  getTeam,
  getAvailableConfidence,
  assignConfidence,
  countMatchingPicks,
  getWildCardGames,
  getDivisionalGames,
  getChampionshipGame,
  getSuperBowl,
  getBracket,
  makePick,
  formatCountdown,
  isValidTiebreaker,
  isValidUsername,
  getAllPickKeys,
  isBracketComplete,
  getPickDependencies,
  canMakePick,
} from './bracketUtils';

// ============================================
// NFL_TEAMS and SEEDS data validation
// ============================================
describe('NFL_TEAMS', () => {
  it('should have 14 teams', () => {
    expect(Object.keys(NFL_TEAMS).length).toBe(14);
  });

  it('should have required properties for each team', () => {
    Object.entries(NFL_TEAMS).forEach(([abbr, team]) => {
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('city');
      expect(team).toHaveProperty('abbr');
      expect(team).toHaveProperty('color');
      expect(team).toHaveProperty('color2');
      expect(team).toHaveProperty('logo');
      expect(team.abbr).toBe(abbr);
    });
  });

  it('should have valid color hex codes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(NFL_TEAMS).forEach(team => {
      expect(team.color).toMatch(hexRegex);
      expect(team.color2).toMatch(hexRegex);
    });
  });
});

describe('SEEDS', () => {
  it('should have AFC and NFC conferences', () => {
    expect(SEEDS).toHaveProperty('AFC');
    expect(SEEDS).toHaveProperty('NFC');
  });

  it('should have 7 teams per conference', () => {
    expect(SEEDS.AFC.length).toBe(7);
    expect(SEEDS.NFC.length).toBe(7);
  });

  it('should have seeds 1-7 for each conference', () => {
    const expectedSeeds = [1, 2, 3, 4, 5, 6, 7];
    expect(SEEDS.AFC.map(s => s.seed)).toEqual(expectedSeeds);
    expect(SEEDS.NFC.map(s => s.seed)).toEqual(expectedSeeds);
  });

  it('should have all teams exist in NFL_TEAMS', () => {
    [...SEEDS.AFC, ...SEEDS.NFC].forEach(seed => {
      expect(NFL_TEAMS[seed.team]).toBeDefined();
    });
  });
});

// ============================================
// getTeam
// ============================================
describe('getTeam', () => {
  it('should return team with correct seed for AFC teams', () => {
    expect(getTeam('DEN')).toEqual({ t: 'DEN', s: 1 });
    expect(getTeam('NE')).toEqual({ t: 'NE', s: 2 });
    expect(getTeam('LAC')).toEqual({ t: 'LAC', s: 7 });
  });

  it('should return team with correct seed for NFC teams', () => {
    expect(getTeam('SEA')).toEqual({ t: 'SEA', s: 1 });
    expect(getTeam('CHI')).toEqual({ t: 'CHI', s: 2 });
    expect(getTeam('GB')).toEqual({ t: 'GB', s: 7 });
  });

  it('should return undefined seed for unknown team', () => {
    expect(getTeam('UNKNOWN')).toEqual({ t: 'UNKNOWN', s: undefined });
  });
});

// ============================================
// isUpset
// ============================================
describe('isUpset', () => {
  it('should return true when lower seed wins', () => {
    const game = { h: { t: 'DEN', s: 1 }, l: { t: 'LAC', s: 7 } };
    expect(isUpset(game, 'LAC')).toBe(true);
  });

  it('should return false when higher seed wins', () => {
    const game = { h: { t: 'DEN', s: 1 }, l: { t: 'LAC', s: 7 } };
    expect(isUpset(game, 'DEN')).toBe(false);
  });

  it('should return false when game has no high seed', () => {
    const game = { h: null, l: { t: 'LAC', s: 7 } };
    expect(isUpset(game, 'LAC')).toBe(false);
  });

  it('should return false when game has no low seed', () => {
    const game = { h: { t: 'DEN', s: 1 }, l: null };
    expect(isUpset(game, 'DEN')).toBe(false);
  });

  it('should return false when no winner', () => {
    const game = { h: { t: 'DEN', s: 1 }, l: { t: 'LAC', s: 7 } };
    expect(isUpset(game, null)).toBe(false);
    expect(isUpset(game, undefined)).toBe(false);
  });

  it('should handle various upset scenarios', () => {
    // #7 beating #2
    const game1 = { h: { t: 'NE', s: 2 }, l: { t: 'LAC', s: 7 } };
    expect(isUpset(game1, 'LAC')).toBe(true);

    // #4 beating #3 (minor upset)
    const game2 = { h: { t: 'JAX', s: 3 }, l: { t: 'PIT', s: 4 } };
    expect(isUpset(game2, 'PIT')).toBe(true);
  });
});

// ============================================
// Confidence Points
// ============================================
describe('CONFIDENCE_POINTS', () => {
  it('should have 13 points (1-13)', () => {
    expect(CONFIDENCE_POINTS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});

describe('getAvailableConfidence', () => {
  it('should return all points when none are used', () => {
    expect(getAvailableConfidence({})).toEqual(CONFIDENCE_POINTS);
  });

  it('should exclude used points', () => {
    const used = { AFC_WC_0: 13, AFC_WC_1: 10 };
    const available = getAvailableConfidence(used);
    expect(available).not.toContain(13);
    expect(available).not.toContain(10);
    expect(available.length).toBe(11);
  });

  it('should return empty array when all points used', () => {
    const allUsed = {};
    CONFIDENCE_POINTS.forEach((p, i) => {
      allUsed[`pick_${i}`] = p;
    });
    expect(getAvailableConfidence(allUsed)).toEqual([]);
  });
});

describe('assignConfidence', () => {
  it('should assign confidence to a new pick', () => {
    const result = assignConfidence({}, 'AFC_WC_0', 13);
    expect(result).toEqual({ AFC_WC_0: 13 });
  });

  it('should reassign confidence from one pick to another', () => {
    const current = { AFC_WC_0: 13 };
    const result = assignConfidence(current, 'AFC_WC_1', 13);
    expect(result).toEqual({ AFC_WC_1: 13 });
    expect(result.AFC_WC_0).toBeUndefined();
  });

  it('should remove confidence when null is passed', () => {
    const current = { AFC_WC_0: 13 };
    const result = assignConfidence(current, 'AFC_WC_0', null);
    expect(result).toEqual({});
  });

  it('should allow adding multiple confidence values', () => {
    let conf = {};
    conf = assignConfidence(conf, 'AFC_WC_0', 13);
    conf = assignConfidence(conf, 'AFC_WC_1', 12);
    conf = assignConfidence(conf, 'AFC_WC_2', 11);
    expect(conf).toEqual({ AFC_WC_0: 13, AFC_WC_1: 12, AFC_WC_2: 11 });
  });

  it('should not mutate original object', () => {
    const original = { AFC_WC_0: 13 };
    const result = assignConfidence(original, 'AFC_WC_1', 12);
    expect(original).toEqual({ AFC_WC_0: 13 });
    expect(result).not.toBe(original);
  });
});

// ============================================
// countMatchingPicks
// ============================================
describe('countMatchingPicks', () => {
  it('should return 0 for empty picks', () => {
    expect(countMatchingPicks({}, {})).toBe(0);
  });

  it('should return 0 for no matching picks', () => {
    const picks1 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX' };
    const picks2 = { AFC_WC_0: 'LAC', AFC_WC_1: 'BUF' };
    expect(countMatchingPicks(picks1, picks2)).toBe(0);
  });

  it('should count matching picks correctly', () => {
    const picks1 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT' };
    const picks2 = { AFC_WC_0: 'NE', AFC_WC_1: 'BUF', AFC_WC_2: 'PIT' };
    expect(countMatchingPicks(picks1, picks2)).toBe(2);
  });

  it('should return correct count for all matching picks', () => {
    const picks1 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT' };
    const picks2 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT' };
    expect(countMatchingPicks(picks1, picks2)).toBe(3);
  });

  it('should handle asymmetric pick counts (first has more)', () => {
    const picks1 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT' };
    const picks2 = { AFC_WC_0: 'NE' };
    expect(countMatchingPicks(picks1, picks2)).toBe(1);
  });

  it('should only count based on picks1 keys', () => {
    const picks1 = { AFC_WC_0: 'NE' };
    const picks2 = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'PIT' };
    expect(countMatchingPicks(picks1, picks2)).toBe(1);
  });
});

// ============================================
// Wild Card Games
// ============================================
describe('getWildCardGames', () => {
  it('should generate 3 wild card games per conference', () => {
    const afcGames = getWildCardGames('AFC', {});
    const nfcGames = getWildCardGames('NFC', {});
    expect(afcGames.length).toBe(3);
    expect(nfcGames.length).toBe(3);
  });

  it('should have correct AFC matchups (2v7, 3v6, 4v5)', () => {
    const games = getWildCardGames('AFC', {});
    // Game 0: #2 NE vs #7 LAC
    expect(games[0].h.t).toBe('NE');
    expect(games[0].h.s).toBe(2);
    expect(games[0].l.t).toBe('LAC');
    expect(games[0].l.s).toBe(7);
    // Game 1: #3 JAX vs #6 BUF
    expect(games[1].h.t).toBe('JAX');
    expect(games[1].h.s).toBe(3);
    expect(games[1].l.t).toBe('BUF');
    expect(games[1].l.s).toBe(6);
    // Game 2: #4 PIT vs #5 HOU
    expect(games[2].h.t).toBe('PIT');
    expect(games[2].h.s).toBe(4);
    expect(games[2].l.t).toBe('HOU');
    expect(games[2].l.s).toBe(5);
  });

  it('should have correct NFC matchups (2v7, 3v6, 4v5)', () => {
    const games = getWildCardGames('NFC', {});
    // Game 0: #2 CHI vs #7 GB
    expect(games[0].h.t).toBe('CHI');
    expect(games[0].h.s).toBe(2);
    expect(games[0].l.t).toBe('GB');
    expect(games[0].l.s).toBe(7);
    // Game 1: #3 PHI vs #6 SF
    expect(games[1].h.t).toBe('PHI');
    expect(games[1].h.s).toBe(3);
    expect(games[1].l.t).toBe('SF');
    expect(games[1].l.s).toBe(6);
    // Game 2: #4 CAR vs #5 LAR
    expect(games[2].h.t).toBe('CAR');
    expect(games[2].h.s).toBe(4);
    expect(games[2].l.t).toBe('LAR');
    expect(games[2].l.s).toBe(5);
  });

  it('should include winner picks', () => {
    const picks = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU' };
    const games = getWildCardGames('AFC', picks);
    expect(games[0].w).toBe('NE');
    expect(games[1].w).toBe('JAX');
    expect(games[2].w).toBe('HOU');
  });
});

// ============================================
// Divisional Games
// ============================================
describe('getDivisionalGames', () => {
  it('should return empty matchups when wild card not complete', () => {
    const games = getDivisionalGames('AFC', {});
    expect(games[0].h).toBeNull();
    expect(games[0].l).toBeNull();
    expect(games[1].h).toBeNull();
    expect(games[1].l).toBeNull();
  });

  it('should return empty matchups with partial wild card picks', () => {
    const picks = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX' }; // Missing one
    const games = getDivisionalGames('AFC', picks);
    expect(games[0].h).toBeNull();
  });

  it('should reseed correctly when all WC games complete', () => {
    // If #2 NE, #3 JAX, #5 HOU win
    const picks = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU' };
    const games = getDivisionalGames('AFC', picks);

    // #1 DEN vs lowest remaining seed (#5 HOU)
    expect(games[0].h.t).toBe('DEN');
    expect(games[0].h.s).toBe(1);
    expect(games[0].l.t).toBe('HOU');
    expect(games[0].l.s).toBe(5);

    // #2 NE vs #3 JAX
    expect(games[1].h.t).toBe('NE');
    expect(games[1].h.s).toBe(2);
    expect(games[1].l.t).toBe('JAX');
    expect(games[1].l.s).toBe(3);
  });

  it('should handle upsets in wild card correctly', () => {
    // All lower seeds win (upsets): #7 LAC, #6 BUF, #5 HOU
    const picks = { AFC_WC_0: 'LAC', AFC_WC_1: 'BUF', AFC_WC_2: 'HOU' };
    const games = getDivisionalGames('AFC', picks);

    // Reseeded: sorted by seed = #5 HOU, #6 BUF, #7 LAC
    // #1 DEN vs #7 LAC (worst remaining)
    expect(games[0].h.t).toBe('DEN');
    expect(games[0].l.t).toBe('LAC');

    // #5 HOU (best WC winner) vs #6 BUF
    expect(games[1].h.t).toBe('HOU');
    expect(games[1].l.t).toBe('BUF');
  });
});

// ============================================
// Championship Games
// ============================================
describe('getChampionshipGame', () => {
  it('should return empty matchup when divisional not complete', () => {
    const game = getChampionshipGame('AFC', {});
    expect(game.h).toBeNull();
    expect(game.l).toBeNull();
  });

  it('should return correct matchup when divisional complete', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_WC_1: 'JAX',
      AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN',
      AFC_DIV_1: 'JAX',
    };
    const game = getChampionshipGame('AFC', picks);
    expect(game.h.t).toBe('DEN');
    expect(game.l.t).toBe('JAX');
  });

  it('should include championship pick', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_WC_1: 'JAX',
      AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN',
      AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
    };
    const game = getChampionshipGame('AFC', picks);
    expect(game.w).toBe('DEN');
  });
});

// ============================================
// Super Bowl
// ============================================
describe('getSuperBowl', () => {
  it('should return null teams when championships not complete', () => {
    const sb = getSuperBowl({});
    expect(sb.afc).toBeNull();
    expect(sb.nfc).toBeNull();
  });

  it('should return correct Super Bowl matchup', () => {
    const picks = {
      // AFC path
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      // NFC path
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
      NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
      NFC_CHAMP: 'PHI',
    };
    const sb = getSuperBowl(picks);
    expect(sb.afc.t).toBe('DEN');
    expect(sb.nfc.t).toBe('PHI');
  });

  it('should include Super Bowl pick', () => {
    const picks = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
      NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
      NFC_CHAMP: 'PHI',
      SUPER_BOWL: 'DEN',
    };
    const sb = getSuperBowl(picks);
    expect(sb.w).toBe('DEN');
  });
});

// ============================================
// getBracket (full bracket)
// ============================================
describe('getBracket', () => {
  it('should return complete bracket structure', () => {
    const bracket = getBracket({});
    expect(bracket).toHaveProperty('AFC');
    expect(bracket).toHaveProperty('NFC');
    expect(bracket).toHaveProperty('sb');
    expect(bracket.AFC).toHaveProperty('wc');
    expect(bracket.AFC).toHaveProperty('div');
    expect(bracket.AFC).toHaveProperty('champ');
    expect(bracket.NFC).toHaveProperty('wc');
    expect(bracket.NFC).toHaveProperty('div');
    expect(bracket.NFC).toHaveProperty('champ');
  });

  it('should populate bracket with complete picks', () => {
    const completePicks = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
      NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
      NFC_CHAMP: 'PHI',
      SUPER_BOWL: 'DEN',
    };
    const bracket = getBracket(completePicks);

    // Check AFC wild card winners
    expect(bracket.AFC.wc[0].w).toBe('NE');
    expect(bracket.AFC.wc[1].w).toBe('JAX');
    expect(bracket.AFC.wc[2].w).toBe('HOU');

    // Check NFC wild card winners
    expect(bracket.NFC.wc[0].w).toBe('CHI');
    expect(bracket.NFC.wc[1].w).toBe('PHI');
    expect(bracket.NFC.wc[2].w).toBe('CAR');

    // Check conference champs
    expect(bracket.AFC.champ.w).toBe('DEN');
    expect(bracket.NFC.champ.w).toBe('PHI');

    // Check Super Bowl
    expect(bracket.sb.w).toBe('DEN');
  });
});

// ============================================
// makePick (with cascade deletion)
// ============================================
describe('makePick', () => {
  it('should add a new pick', () => {
    const result = makePick({}, 'AFC_WC_0', 'NE');
    expect(result).toEqual({ AFC_WC_0: 'NE' });
  });

  it('should not mutate original picks', () => {
    const original = { AFC_WC_0: 'NE' };
    const result = makePick(original, 'AFC_WC_1', 'JAX');
    expect(original).toEqual({ AFC_WC_0: 'NE' });
    expect(result).not.toBe(original);
  });

  it('should cascade delete when changing wild card pick', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_WC_1: 'JAX',
      AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN',
      AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      SUPER_BOWL: 'DEN',
    };
    // Change AFC_WC_0 from NE to LAC
    const result = makePick(picks, 'AFC_WC_0', 'LAC');

    expect(result.AFC_WC_0).toBe('LAC');
    expect(result.AFC_WC_1).toBe('JAX'); // Other WC unchanged
    expect(result.AFC_WC_2).toBe('HOU'); // Other WC unchanged
    expect(result.AFC_DIV_0).toBeUndefined(); // Deleted
    expect(result.AFC_DIV_1).toBeUndefined(); // Deleted
    expect(result.AFC_CHAMP).toBeUndefined(); // Deleted
    expect(result.SUPER_BOWL).toBeUndefined(); // Deleted
  });

  it('should cascade delete when changing divisional pick', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_WC_1: 'JAX',
      AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN',
      AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      SUPER_BOWL: 'DEN',
    };
    // Change AFC_DIV_0 from DEN to HOU
    const result = makePick(picks, 'AFC_DIV_0', 'HOU');

    expect(result.AFC_DIV_0).toBe('HOU');
    expect(result.AFC_DIV_1).toBe('JAX'); // Other DIV unchanged
    expect(result.AFC_CHAMP).toBeUndefined(); // Deleted
    expect(result.SUPER_BOWL).toBeUndefined(); // Deleted
    expect(result.AFC_WC_0).toBe('NE'); // WC preserved
  });

  it('should cascade delete when changing championship pick', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_WC_1: 'JAX',
      AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN',
      AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      SUPER_BOWL: 'DEN',
    };
    // Change AFC_CHAMP from DEN to JAX
    const result = makePick(picks, 'AFC_CHAMP', 'JAX');

    expect(result.AFC_CHAMP).toBe('JAX');
    expect(result.SUPER_BOWL).toBeUndefined(); // Deleted
    expect(result.AFC_DIV_0).toBe('DEN'); // DIV preserved
    expect(result.AFC_DIV_1).toBe('JAX'); // DIV preserved
  });

  it('should not cascade when making same pick', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_DIV_0: 'DEN',
    };
    const result = makePick(picks, 'AFC_WC_0', 'NE');

    expect(result.AFC_WC_0).toBe('NE');
    expect(result.AFC_DIV_0).toBe('DEN'); // Should not be deleted
  });

  it('should not cascade NFC picks when changing AFC picks', () => {
    const picks = {
      AFC_WC_0: 'NE',
      AFC_DIV_0: 'DEN',
      AFC_CHAMP: 'DEN',
      NFC_WC_0: 'CHI',
      NFC_DIV_0: 'SEA',
      NFC_CHAMP: 'SEA',
      SUPER_BOWL: 'DEN',
    };
    const result = makePick(picks, 'AFC_WC_0', 'LAC');

    // NFC picks preserved
    expect(result.NFC_WC_0).toBe('CHI');
    expect(result.NFC_DIV_0).toBe('SEA');
    expect(result.NFC_CHAMP).toBe('SEA');
    // AFC downstream deleted
    expect(result.AFC_DIV_0).toBeUndefined();
    // Super Bowl deleted (depends on both)
    expect(result.SUPER_BOWL).toBeUndefined();
  });
});

// ============================================
// formatCountdown
// ============================================
describe('formatCountdown', () => {
  it('should return "Picks Locked" for zero or negative diff', () => {
    expect(formatCountdown(0)).toBe('Picks Locked');
    expect(formatCountdown(-1000)).toBe('Picks Locked');
  });

  it('should format days, hours, minutes', () => {
    const diff = 2 * 86400000 + 5 * 3600000 + 30 * 60000; // 2d 5h 30m
    expect(formatCountdown(diff)).toBe('2d 5h 30m');
  });

  it('should omit days when less than 1 day', () => {
    const diff = 5 * 3600000 + 30 * 60000; // 5h 30m
    expect(formatCountdown(diff)).toBe('5h 30m');
  });

  it('should handle exactly 1 day', () => {
    const diff = 86400000; // 1d 0h 0m
    expect(formatCountdown(diff)).toBe('1d 0h 0m');
  });

  it('should handle minutes only', () => {
    const diff = 45 * 60000; // 45 minutes
    expect(formatCountdown(diff)).toBe('0h 45m');
  });
});

// ============================================
// Validation functions
// ============================================
describe('isValidTiebreaker', () => {
  it('should accept valid numbers 0-200', () => {
    expect(isValidTiebreaker(0)).toBe(true);
    expect(isValidTiebreaker(47)).toBe(true);
    expect(isValidTiebreaker(200)).toBe(true);
    expect(isValidTiebreaker('47')).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(isValidTiebreaker(-1)).toBe(false);
    expect(isValidTiebreaker(201)).toBe(false);
    expect(isValidTiebreaker('abc')).toBe(false);
    expect(isValidTiebreaker(null)).toBe(false);
    expect(isValidTiebreaker(undefined)).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('should accept valid usernames', () => {
    expect(isValidUsername('John')).toBe(true);
    expect(isValidUsername('Jane Doe')).toBe(true);
    expect(isValidUsername('A')).toBe(true);
  });

  it('should reject invalid usernames', () => {
    expect(isValidUsername('')).toBe(false);
    expect(isValidUsername('   ')).toBe(false);
    expect(isValidUsername(null)).toBe(false);
    expect(isValidUsername(undefined)).toBe(false);
    expect(isValidUsername(123)).toBe(false);
  });
});

// ============================================
// Pick keys and completion
// ============================================
describe('getAllPickKeys', () => {
  it('should return all 13 pick keys', () => {
    const keys = getAllPickKeys();
    expect(keys.length).toBe(13);
    expect(keys).toContain('AFC_WC_0');
    expect(keys).toContain('AFC_WC_1');
    expect(keys).toContain('AFC_WC_2');
    expect(keys).toContain('NFC_WC_0');
    expect(keys).toContain('NFC_WC_1');
    expect(keys).toContain('NFC_WC_2');
    expect(keys).toContain('AFC_DIV_0');
    expect(keys).toContain('AFC_DIV_1');
    expect(keys).toContain('NFC_DIV_0');
    expect(keys).toContain('NFC_DIV_1');
    expect(keys).toContain('AFC_CHAMP');
    expect(keys).toContain('NFC_CHAMP');
    expect(keys).toContain('SUPER_BOWL');
  });
});

describe('isBracketComplete', () => {
  it('should return false for empty picks', () => {
    expect(isBracketComplete({})).toBe(false);
  });

  it('should return false for partial picks', () => {
    expect(isBracketComplete({ AFC_WC_0: 'NE' })).toBe(false);
    expect(isBracketComplete({
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
    })).toBe(false);
  });

  it('should return true for complete bracket', () => {
    const complete = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
      NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
      NFC_CHAMP: 'PHI',
      SUPER_BOWL: 'DEN',
    };
    expect(isBracketComplete(complete)).toBe(true);
  });
});

// ============================================
// Pick dependencies
// ============================================
describe('getPickDependencies', () => {
  it('should return empty array for wild card picks', () => {
    expect(getPickDependencies('AFC_WC_0')).toEqual([]);
    expect(getPickDependencies('AFC_WC_1')).toEqual([]);
    expect(getPickDependencies('NFC_WC_2')).toEqual([]);
  });

  it('should return wild card dependencies for divisional', () => {
    expect(getPickDependencies('AFC_DIV_0')).toEqual(['AFC_WC_0', 'AFC_WC_1', 'AFC_WC_2']);
    expect(getPickDependencies('NFC_DIV_1')).toEqual(['NFC_WC_0', 'NFC_WC_1', 'NFC_WC_2']);
  });

  it('should return divisional dependencies for championship', () => {
    expect(getPickDependencies('AFC_CHAMP')).toEqual(['AFC_DIV_0', 'AFC_DIV_1']);
    expect(getPickDependencies('NFC_CHAMP')).toEqual(['NFC_DIV_0', 'NFC_DIV_1']);
  });

  it('should return championship dependencies for Super Bowl', () => {
    expect(getPickDependencies('SUPER_BOWL')).toEqual(['AFC_CHAMP', 'NFC_CHAMP']);
  });
});

describe('canMakePick', () => {
  it('should allow wild card picks with no picks', () => {
    expect(canMakePick({}, 'AFC_WC_0')).toBe(true);
    expect(canMakePick({}, 'NFC_WC_2')).toBe(true);
  });

  it('should not allow divisional without wild card complete', () => {
    expect(canMakePick({}, 'AFC_DIV_0')).toBe(false);
    expect(canMakePick({ AFC_WC_0: 'NE', AFC_WC_1: 'JAX' }, 'AFC_DIV_0')).toBe(false);
  });

  it('should allow divisional when wild card complete', () => {
    const picks = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU' };
    expect(canMakePick(picks, 'AFC_DIV_0')).toBe(true);
  });

  it('should not allow championship without divisional', () => {
    const picks = { AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU' };
    expect(canMakePick(picks, 'AFC_CHAMP')).toBe(false);
  });

  it('should allow championship when divisional complete', () => {
    const picks = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
    };
    expect(canMakePick(picks, 'AFC_CHAMP')).toBe(true);
  });

  it('should not allow Super Bowl without both championships', () => {
    const picks = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
    };
    expect(canMakePick(picks, 'SUPER_BOWL')).toBe(false);
  });

  it('should allow Super Bowl when both championships complete', () => {
    const picks = {
      AFC_WC_0: 'NE', AFC_WC_1: 'JAX', AFC_WC_2: 'HOU',
      AFC_DIV_0: 'DEN', AFC_DIV_1: 'JAX',
      AFC_CHAMP: 'DEN',
      NFC_WC_0: 'CHI', NFC_WC_1: 'PHI', NFC_WC_2: 'CAR',
      NFC_DIV_0: 'SEA', NFC_DIV_1: 'PHI',
      NFC_CHAMP: 'PHI',
    };
    expect(canMakePick(picks, 'SUPER_BOWL')).toBe(true);
  });
});
