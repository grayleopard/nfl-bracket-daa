// NFL Team data
export const NFL_TEAMS = {
  DEN: {
    name: 'Broncos', city: 'Denver', abbr: 'DEN', color: '#FB4F14', color2: '#002244',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/Denver_Broncos_logo.svg/100px-Denver_Broncos_logo.svg.png'
  },
  NE: {
    name: 'Patriots', city: 'New England', abbr: 'NE', color: '#002244', color2: '#C60C30',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b9/New_England_Patriots_logo.svg/100px-New_England_Patriots_logo.svg.png'
  },
  JAX: {
    name: 'Jaguars', city: 'Jacksonville', abbr: 'JAX', color: '#006778', color2: '#D7A22A',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Jacksonville_Jaguars_logo.svg/100px-Jacksonville_Jaguars_logo.svg.png'
  },
  PIT: {
    name: 'Steelers', city: 'Pittsburgh', abbr: 'PIT', color: '#FFB612', color2: '#101820',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Pittsburgh_Steelers_logo.svg/100px-Pittsburgh_Steelers_logo.svg.png'
  },
  HOU: {
    name: 'Texans', city: 'Houston', abbr: 'HOU', color: '#03202F', color2: '#A71930',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Houston_Texans_logo.svg/100px-Houston_Texans_logo.svg.png'
  },
  BUF: {
    name: 'Bills', city: 'Buffalo', abbr: 'BUF', color: '#00338D', color2: '#C60C30',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Buffalo_Bills_logo.svg/100px-Buffalo_Bills_logo.svg.png'
  },
  LAC: {
    name: 'Chargers', city: 'Los Angeles', abbr: 'LAC', color: '#0080C6', color2: '#FFC20E',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Los_Angeles_Chargers_logo.svg/100px-Los_Angeles_Chargers_logo.svg.png'
  },
  SEA: {
    name: 'Seahawks', city: 'Seattle', abbr: 'SEA', color: '#002244', color2: '#69BE28',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Seattle_Seahawks_logo.svg/100px-Seattle_Seahawks_logo.svg.png'
  },
  CHI: {
    name: 'Bears', city: 'Chicago', abbr: 'CHI', color: '#0B162A', color2: '#C83803',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Chicago_Bears_logo.svg/100px-Chicago_Bears_logo.svg.png'
  },
  PHI: {
    name: 'Eagles', city: 'Philadelphia', abbr: 'PHI', color: '#004C54', color2: '#A5ACAF',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Philadelphia_Eagles_logo.svg/100px-Philadelphia_Eagles_logo.svg.png'
  },
  CAR: {
    name: 'Panthers', city: 'Carolina', abbr: 'CAR', color: '#0085CA', color2: '#101820',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/Carolina_Panthers_logo.svg/100px-Carolina_Panthers_logo.svg.png'
  },
  LAR: {
    name: 'Rams', city: 'Los Angeles', abbr: 'LAR', color: '#003594', color2: '#FFA300',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Los_Angeles_Rams_logo.svg/100px-Los_Angeles_Rams_logo.svg.png'
  },
  SF: {
    name: '49ers', city: 'San Francisco', abbr: 'SF', color: '#AA0000', color2: '#B3995D',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/San_Francisco_49ers_logo.svg/100px-San_Francisco_49ers_logo.svg.png'
  },
  GB: {
    name: 'Packers', city: 'Green Bay', abbr: 'GB', color: '#203731', color2: '#FFB612',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Green_Bay_Packers_logo.svg/100px-Green_Bay_Packers_logo.svg.png'
  },
};

// 2025-26 NFL Playoff Seeds
export const SEEDS = {
  AFC: [
    { seed: 1, team: 'DEN' }, { seed: 2, team: 'NE' }, { seed: 3, team: 'JAX' }, { seed: 4, team: 'PIT' },
    { seed: 5, team: 'HOU' }, { seed: 6, team: 'BUF' }, { seed: 7, team: 'LAC' },
  ],
  NFC: [
    { seed: 1, team: 'SEA' }, { seed: 2, team: 'CHI' }, { seed: 3, team: 'PHI' }, { seed: 4, team: 'CAR' },
    { seed: 5, team: 'LAR' }, { seed: 6, team: 'SF' }, { seed: 7, team: 'GB' },
  ],
};

export const CONFIDENCE_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const AVATARS = ['🏈', '🦅', '🐻', '🐆', '🦁', '🐴', '🦬', '⚡', '🏴‍☠️', '🧀', '🌊', '⭐'];

/**
 * Check if a pick is an upset (lower seed beats higher seed)
 * @param {Object} game - Game object with h (high seed) and l (low seed)
 * @param {string} winner - Team abbreviation of the winner
 * @returns {boolean} - True if the pick is an upset
 */
export function isUpset(game, winner) {
  if (!game.h || !game.l || !winner) return false;
  return winner === game.l.t;
}

/**
 * Get team data with seed information
 * @param {string} team - Team abbreviation
 * @returns {Object} - Object with team abbreviation and seed
 */
export function getTeam(team) {
  const afcSeed = SEEDS.AFC.find(s => s.team === team)?.seed;
  const nfcSeed = SEEDS.NFC.find(s => s.team === team)?.seed;
  return { t: team, s: afcSeed || nfcSeed };
}

/**
 * Get available confidence points (not yet assigned)
 * @param {Object} currentConfidence - Object mapping pick keys to confidence points
 * @returns {number[]} - Array of available confidence points
 */
export function getAvailableConfidence(currentConfidence) {
  const used = Object.values(currentConfidence);
  return CONFIDENCE_POINTS.filter(p => !used.includes(p));
}

/**
 * Assign confidence to a pick, handling reassignment of existing points
 * @param {Object} currentConfidence - Current confidence assignments
 * @param {string} pickKey - The pick to assign confidence to
 * @param {number|null} points - The confidence points to assign (null to remove)
 * @returns {Object} - New confidence object
 */
export function assignConfidence(currentConfidence, pickKey, points) {
  const newConfidence = { ...currentConfidence };
  // Remove this point value from any existing assignment
  Object.keys(newConfidence).forEach(k => {
    if (newConfidence[k] === points) delete newConfidence[k];
  });
  if (points) {
    newConfidence[pickKey] = points;
  } else {
    delete newConfidence[pickKey];
  }
  return newConfidence;
}

/**
 * Count matching picks between two pick sets
 * @param {Object} picks1 - First pick set
 * @param {Object} picks2 - Second pick set
 * @returns {number} - Number of matching picks
 */
export function countMatchingPicks(picks1, picks2) {
  let matches = 0;
  Object.keys(picks1).forEach(k => {
    if (picks1[k] === picks2[k]) matches++;
  });
  return matches;
}

/**
 * Generate wild card games for a conference
 * @param {string} conf - Conference ('AFC' or 'NFC')
 * @param {Object} picks - Current picks
 * @returns {Array} - Array of wild card game objects
 */
export function getWildCardGames(conf, picks) {
  return [
    { h: getTeam(SEEDS[conf][1].team), l: getTeam(SEEDS[conf][6].team), w: picks[`${conf}_WC_0`] },
    { h: getTeam(SEEDS[conf][2].team), l: getTeam(SEEDS[conf][5].team), w: picks[`${conf}_WC_1`] },
    { h: getTeam(SEEDS[conf][3].team), l: getTeam(SEEDS[conf][4].team), w: picks[`${conf}_WC_2`] },
  ];
}

/**
 * Generate divisional games for a conference (with reseeding)
 * @param {string} conf - Conference ('AFC' or 'NFC')
 * @param {Object} picks - Current picks
 * @returns {Array} - Array of divisional game objects
 */
export function getDivisionalGames(conf, picks) {
  const wcGames = getWildCardGames(conf, picks);
  const wcWinners = wcGames.map(g => g.w ? getTeam(g.w) : null).filter(Boolean);

  if (wcWinners.length < 3) {
    return [
      { h: null, l: null, w: picks[`${conf}_DIV_0`] },
      { h: null, l: null, w: picks[`${conf}_DIV_1`] },
    ];
  }

  // Reseed: sort by seed and match #1 vs lowest remaining, highest remaining vs second highest
  const sorted = [...wcWinners].sort((a, b) => a.s - b.s);
  const topSeed = getTeam(SEEDS[conf][0].team); // #1 seed gets bye

  return [
    { h: topSeed, l: sorted[2], w: picks[`${conf}_DIV_0`] }, // #1 vs worst remaining
    { h: sorted[0], l: sorted[1], w: picks[`${conf}_DIV_1`] }, // best WC winner vs second best
  ];
}

/**
 * Generate conference championship game
 * @param {string} conf - Conference ('AFC' or 'NFC')
 * @param {Object} picks - Current picks
 * @returns {Object} - Championship game object
 */
export function getChampionshipGame(conf, picks) {
  const divGames = getDivisionalGames(conf, picks);
  const w0 = divGames[0].w ? getTeam(divGames[0].w) : null;
  const w1 = divGames[1].w ? getTeam(divGames[1].w) : null;
  return { h: w0, l: w1, w: picks[`${conf}_CHAMP`] };
}

/**
 * Generate Super Bowl game
 * @param {Object} picks - Current picks
 * @returns {Object} - Super Bowl game object
 */
export function getSuperBowl(picks) {
  const afcChamp = getChampionshipGame('AFC', picks);
  const nfcChamp = getChampionshipGame('NFC', picks);
  const afc = afcChamp.w ? getTeam(afcChamp.w) : null;
  const nfc = nfcChamp.w ? getTeam(nfcChamp.w) : null;
  return { afc, nfc, w: picks.SUPER_BOWL };
}

/**
 * Build complete bracket structure
 * @param {Object} picks - Current picks
 * @returns {Object} - Complete bracket with AFC, NFC, and Super Bowl
 */
export function getBracket(picks) {
  return {
    AFC: {
      wc: getWildCardGames('AFC', picks),
      div: getDivisionalGames('AFC', picks),
      champ: getChampionshipGame('AFC', picks),
    },
    NFC: {
      wc: getWildCardGames('NFC', picks),
      div: getDivisionalGames('NFC', picks),
      champ: getChampionshipGame('NFC', picks),
    },
    sb: getSuperBowl(picks),
  };
}

/**
 * Make a pick and cascade delete dependent picks if needed
 * @param {Object} currentPicks - Current picks object
 * @param {string} key - Pick key (e.g., 'AFC_WC_0')
 * @param {string} team - Team abbreviation
 * @returns {Object} - New picks object
 */
export function makePick(currentPicks, key, team) {
  const newPicks = { ...currentPicks };

  // If changing an existing pick, cascade delete dependent picks
  if (currentPicks[key] && currentPicks[key] !== team) {
    const [conf, round] = key.split('_');
    if (round === 'WC') {
      delete newPicks[`${conf}_DIV_0`];
      delete newPicks[`${conf}_DIV_1`];
      delete newPicks[`${conf}_CHAMP`];
      delete newPicks.SUPER_BOWL;
    } else if (round === 'DIV') {
      delete newPicks[`${conf}_CHAMP`];
      delete newPicks.SUPER_BOWL;
    } else if (round === 'CHAMP') {
      delete newPicks.SUPER_BOWL;
    }
  }

  newPicks[key] = team;
  return newPicks;
}

/**
 * Format countdown time
 * @param {number} diff - Time difference in milliseconds
 * @returns {string} - Formatted countdown string
 */
export function formatCountdown(diff) {
  if (diff <= 0) return 'Picks Locked';

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

/**
 * Validate tiebreaker input
 * @param {string|number} value - Tiebreaker value
 * @returns {boolean} - True if valid
 */
export function isValidTiebreaker(value) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0 && num <= 200;
}

/**
 * Validate username
 * @param {string} name - Username to validate
 * @returns {boolean} - True if valid
 */
export function isValidUsername(name) {
  return typeof name === 'string' && name.trim().length > 0;
}

/**
 * Get all pick keys for the bracket
 * @returns {string[]} - Array of all 13 pick keys
 */
export function getAllPickKeys() {
  return [
    'AFC_WC_0', 'AFC_WC_1', 'AFC_WC_2',
    'NFC_WC_0', 'NFC_WC_1', 'NFC_WC_2',
    'AFC_DIV_0', 'AFC_DIV_1',
    'NFC_DIV_0', 'NFC_DIV_1',
    'AFC_CHAMP', 'NFC_CHAMP',
    'SUPER_BOWL',
  ];
}

/**
 * Check if bracket is complete
 * @param {Object} picks - Current picks
 * @returns {boolean} - True if all 13 picks are made
 */
export function isBracketComplete(picks) {
  return Object.keys(picks).length === 13;
}

/**
 * Get pick dependencies (what picks must exist before this pick can be made)
 * @param {string} key - Pick key
 * @returns {string[]} - Array of dependent pick keys
 */
export function getPickDependencies(key) {
  const [conf, round] = key.split('_');

  if (round === 'WC') {
    return [];
  } else if (round === 'DIV') {
    return [`${conf}_WC_0`, `${conf}_WC_1`, `${conf}_WC_2`];
  } else if (round === 'CHAMP') {
    return [`${conf}_DIV_0`, `${conf}_DIV_1`];
  } else if (key === 'SUPER_BOWL') {
    return ['AFC_CHAMP', 'NFC_CHAMP'];
  }
  return [];
}

/**
 * Check if a pick can be made (all dependencies satisfied)
 * @param {Object} picks - Current picks
 * @param {string} key - Pick key to check
 * @returns {boolean} - True if pick can be made
 */
export function canMakePick(picks, key) {
  const dependencies = getPickDependencies(key);
  return dependencies.every(dep => picks[dep] !== undefined);
}
