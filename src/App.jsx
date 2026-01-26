import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createUser,
  getUser,
  updatePicks,
  updateTiebreaker,
  submitBracket,
  clearSelections,
  getLeaderboard,
  getCompletedBrackets
} from './services/bracketService';

const GROUP_PASSWORD = import.meta.env.VITE_GROUP_PASSWORD || 'playoffs2026';

// Real NFL team logos from Wikipedia/Wikimedia Commons (public domain / fair use for fan projects)
const NFL_TEAMS = {
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
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png'
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

const NFL_SHIELD = 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/National_Football_League_logo.svg/100px-National_Football_League_logo.svg.png';
const LOMBARDI_TROPHY = 'https://www.pngall.com/wp-content/uploads/15/Lombardi-Trophy-Transparent.png';

// 2025-26 NFL Playoff Seeds
const SEEDS = {
  AFC: [
    { seed: 1, team: 'DEN' }, { seed: 2, team: 'NE' }, { seed: 3, team: 'JAX' }, { seed: 4, team: 'PIT' },
    { seed: 5, team: 'HOU' }, { seed: 6, team: 'BUF' }, { seed: 7, team: 'LAC' },
  ],
  NFC: [
    { seed: 1, team: 'SEA' }, { seed: 2, team: 'CHI' }, { seed: 3, team: 'PHI' }, { seed: 4, team: 'CAR' },
    { seed: 5, team: 'LAR' }, { seed: 6, team: 'SF' }, { seed: 7, team: 'GB' },
  ],
};

const DEADLINE = new Date('2026-01-10T12:55:00-08:00'); // 5 min before first kickoff
const AVATARS = ['🏈', '🦅', '🐻', '🐆', '🦁', '🐴', '🦬', '⚡', '🏴‍☠️', '🧀', '🌊', '⭐'];
const CONFIDENCE_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const SELECTION_COLOR = '#ffd700'; // Gold - uniform selection highlight color

// Point values for correct picks
const POINT_VALUES = {
  WC: 5,        // Wild Card
  DIV: 10,      // Divisional
  CHAMP: 25,    // Conference Championship
  SB: 50        // Super Bowl
};

// Actual game results (update as games complete)
// Key format matches pick keys: AFC_WC_0, NFC_DIV_1, AFC_CHAMP, SUPER_BOWL, etc.
const RESULTS = {
  // Wild Card Round (Jan 11-12)
  AFC_WC_0: 'NE',       // Patriots 16, Chargers 3
  AFC_WC_1: 'BUF',      // Bills 27, Jaguars 24
  AFC_WC_2: 'HOU',      // Texans 30, Steelers 6
  // NFC_WC_0: 'CHI',
  // NFC_WC_1: 'PHI',
  NFC_WC_0: 'CHI',      // Bears 31, Packers 27
  NFC_WC_1: 'SF',       // 49ers 23, Eagles 19
  NFC_WC_2: 'LAR',      // Rams 34, Panthers 31
  // Divisional Round (Jan 18-19)
  AFC_DIV_0: 'DEN',       // Broncos 33, Bills 30
  AFC_DIV_1: 'NE',        // Patriots 28, Texans 16
  NFC_DIV_0: 'SEA',       // Seahawks 41, 49ers 6
  NFC_DIV_1: 'LAR',       // Rams 20, Bears 17
  // Conference Championships (Jan 26)
  AFC_CHAMP: 'NE',        // Patriots beat Broncos
  NFC_CHAMP: 'SEA',       // Seahawks beat Rams
  // Super Bowl (Feb 8)
  // SUPER_BOWL: 'DEN',
};

// Get point value for a pick key
const getPointValue = (key) => {
  if (key.includes('_WC_')) return POINT_VALUES.WC;
  if (key.includes('_DIV_')) return POINT_VALUES.DIV;
  if (key.includes('_CHAMP')) return POINT_VALUES.CHAMP;
  if (key === 'SUPER_BOWL') return POINT_VALUES.SB;
  return 0;
};

// Get all eliminated teams (teams that lost in completed games)
const getEliminatedTeams = () => {
  const eliminated = new Set();

  // Helper to get WC winners for a conference (sorted by seed for reseeding)
  const getWcWinners = (conf) => {
    const winners = [];
    if (RESULTS[`${conf}_WC_0`]) winners.push({ team: RESULTS[`${conf}_WC_0`], seed: SEEDS[conf].find(s => s.team === RESULTS[`${conf}_WC_0`])?.seed });
    if (RESULTS[`${conf}_WC_1`]) winners.push({ team: RESULTS[`${conf}_WC_1`], seed: SEEDS[conf].find(s => s.team === RESULTS[`${conf}_WC_1`])?.seed });
    if (RESULTS[`${conf}_WC_2`]) winners.push({ team: RESULTS[`${conf}_WC_2`], seed: SEEDS[conf].find(s => s.team === RESULTS[`${conf}_WC_2`])?.seed });
    return winners.sort((a, b) => a.seed - b.seed);
  };

  // For each completed game, the loser is eliminated
  Object.entries(RESULTS).forEach(([key, winner]) => {
    const conf = key.startsWith('AFC') ? 'AFC' : 'NFC';

    if (key.includes('_WC_')) {
      const idx = parseInt(key.split('_')[2]);
      const matchups = [
        [SEEDS[conf][1].team, SEEDS[conf][6].team], // WC_0: #2 vs #7
        [SEEDS[conf][2].team, SEEDS[conf][5].team], // WC_1: #3 vs #6
        [SEEDS[conf][3].team, SEEDS[conf][4].team], // WC_2: #4 vs #5
      ];
      const [team1, team2] = matchups[idx];
      eliminated.add(winner === team1 ? team2 : team1);
    } else if (key.includes('_DIV_')) {
      const idx = parseInt(key.split('_')[2]);
      const wcWinners = getWcWinners(conf);
      if (wcWinners.length === 3) {
        const topSeed = SEEDS[conf][0].team; // #1 seed
        // DIV_0: #1 vs worst WC winner (index 2)
        // DIV_1: best WC winner (index 0) vs second best (index 1)
        const matchups = [
          [topSeed, wcWinners[2].team],
          [wcWinners[0].team, wcWinners[1].team],
        ];
        const [team1, team2] = matchups[idx];
        eliminated.add(winner === team1 ? team2 : team1);
      }
    } else if (key.includes('_CHAMP')) {
      // Championship: winner of DIV_0 vs winner of DIV_1
      const div0Winner = RESULTS[`${conf}_DIV_0`];
      const div1Winner = RESULTS[`${conf}_DIV_1`];
      if (div0Winner && div1Winner) {
        eliminated.add(winner === div0Winner ? div1Winner : div0Winner);
      }
    } else if (key === 'SUPER_BOWL') {
      const afcChamp = RESULTS['AFC_CHAMP'];
      const nfcChamp = RESULTS['NFC_CHAMP'];
      if (afcChamp && nfcChamp) {
        eliminated.add(winner === afcChamp ? nfcChamp : afcChamp);
      }
    }
  });

  return eliminated;
};

// Calculate score, correct picks, and max possible points for a user
const calculateScore = (picks) => {
  let points = 0;
  let correct = 0;
  let gamesCompleted = 0;
  let maxPoints = 0;

  const eliminated = getEliminatedTeams();
  const allPickKeys = [
    'AFC_WC_0', 'AFC_WC_1', 'AFC_WC_2', 'NFC_WC_0', 'NFC_WC_1', 'NFC_WC_2',
    'AFC_DIV_0', 'AFC_DIV_1', 'NFC_DIV_0', 'NFC_DIV_1',
    'AFC_CHAMP', 'NFC_CHAMP', 'SUPER_BOWL'
  ];

  allPickKeys.forEach(key => {
    const pointValue = getPointValue(key);

    if (RESULTS[key]) {
      // Game completed
      gamesCompleted++;
      if (picks[key] === RESULTS[key]) {
        correct++;
        points += pointValue;
        maxPoints += pointValue; // Already earned
      }
      // If wrong, no points added to max (already lost these points)
    } else {
      // Game not yet played
      const userPick = picks[key];
      if (userPick && !eliminated.has(userPick)) {
        // User has a pick and the team is still alive
        maxPoints += pointValue;
      }
    }
  });

  return { points, correct, gamesCompleted, maxPoints };
};

export default function App() {
  const [view, setView] = useState('join');
  const [joinMode, setJoinMode] = useState('new'); // 'new' or 'returning'
  const [viewingUser, setViewingUser] = useState(null); // For viewing other users' brackets after deadline
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [groupPassword, setGroupPassword] = useState('');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('🏈');
  const [picks, setPicks] = useState({});
  const [confidence, setConfidence] = useState({});
  const [tiebreaker, setTiebreaker] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [compareUser, setCompareUser] = useState(null);
  const [showConfidence, setShowConfidence] = useState(false);
  const [mobileTab, setMobileTab] = useState('AFC');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [completedBrackets, setCompletedBrackets] = useState([]);
  const saveTimeoutRef = useRef(null);

  // Fetch completed brackets on mount (for join screen display)
  useEffect(() => {
    getCompletedBrackets().then(setCompletedBrackets).catch(() => {});
  }, []);

  // After deadline: go straight to leaderboard (no login needed)
  useEffect(() => {
    if (isPastDeadline && view === 'join') {
      setView('leaderboard');
      getLeaderboard(true).then(setLeaderboardData).catch(() => {});
    }
  }, [isPastDeadline]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = DEADLINE - now;
      if (diff <= 0) {
        setIsPastDeadline(true);
        setCountdown('Picks Locked');
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
      }
    };
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, []);

  // Check for saved session in localStorage (just the userId, not the data)
  // Only switch to 'returning' mode after deadline to prevent accessing others' brackets
  useEffect(() => {
    const savedSession = localStorage.getItem('nfl_bracket_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.firstName && session.lastName) {
          setFirstName(session.firstName);
          setLastName(session.lastName);
          // Only allow returning mode after deadline
          if (isPastDeadline) {
            setJoinMode('returning');
          }
        }
      } catch (e) {}
    }
  }, [isPastDeadline]);

  // Auto-save picks to Firebase (debounced)
  useEffect(() => {
    if (!userId || view !== 'bracket') return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updatePicks(userId, picks);
      } catch (e) {
        console.error('Failed to save picks:', e);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [picks, userId, view]);

  // Auto-save tiebreaker to Firebase (debounced)
  useEffect(() => {
    if (!userId || view !== 'bracket') return;

    const timeout = setTimeout(async () => {
      try {
        await updateTiebreaker(userId, tiebreaker);
      } catch (e) {
        console.error('Failed to save tiebreaker:', e);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [tiebreaker, userId, view]);

  // Load leaderboard data when viewing leaderboard
  useEffect(() => {
    if (view === 'leaderboard') {
      loadLeaderboard();
    }
  }, [view, isPastDeadline]);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(isPastDeadline);
      setLeaderboardData(data);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  };

  // Go to home (leaderboard) and refresh data
  const goHome = () => {
    setViewingUser(null);
    setView('leaderboard');
    loadLeaderboard();
  };

  const picksComplete = Object.keys(picks).length === 13;
  const tiebreakerFilled = tiebreaker !== '' && !isNaN(parseInt(tiebreaker));
  const isComplete = picksComplete && tiebreakerFilled;

  // Join/Login handler
  const handleJoin = async () => {
    setAuthError('');

    // Block new entries after deadline
    if (isPastDeadline && joinMode === 'new') {
      setAuthError('Entries are closed. The deadline has passed.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setAuthError('Please enter your first and last name.');
      return;
    }

    if (groupPassword !== GROUP_PASSWORD) {
      setAuthError('Incorrect group password.');
      return;
    }

    setIsLoading(true);

    try {
      let userData;

      if (joinMode === 'new') {
        // Create new user
        userData = await createUser(firstName.trim(), lastName.trim(), userAvatar);
      } else {
        // Get existing user
        userData = await getUser(firstName.trim(), lastName.trim());
      }

      // Save session to localStorage
      localStorage.setItem('nfl_bracket_session', JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim()
      }));

      // Set user state
      setUserId(userData.userId);
      setUserName(userData.displayName);
      setUserAvatar(userData.avatar);
      setPicks(userData.picks || {});
      setTiebreaker(userData.tiebreaker || '');
      setSubmitted(userData.submitted || false);
      setView('bracket');
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('nfl_bracket_session');
    setUserId(null);
    setUserName('');
    setPicks({});
    setTiebreaker('');
    setSubmitted(false);
    setFirstName('');
    setLastName('');
    setGroupPassword('');
    setJoinMode('new');
    setView('join');
  };

  // Submit bracket handler
  const handleSubmit = async () => {
    if (isComplete && !submitted && userId) {
      try {
        await submitBracket(userId);
        setSubmitted(true);
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 3500);
      } catch (e) {
        console.error('Failed to submit bracket:', e);
      }
    }
  };

  // Clear all selections handler
  const handleClearSelections = async () => {
    try {
      if (userId) {
        await clearSelections(userId);
      }
      setPicks({});
      setConfidence({});
      setTiebreaker('');
      setSubmitted(false);
    } catch (e) {
      console.error('Failed to clear selections:', e);
    }
  };

  // Check if a pick is an upset (higher seed number beats lower seed number)
  const isUpset = (game, winner) => {
    if (!game.h || !game.l || !winner) return false;
    const winnerTeam = winner === game.h.t ? game.h : game.l;
    const loserTeam = winner === game.h.t ? game.l : game.h;
    // Upset = winner has higher seed number (worse seed) than loser
    return winnerTeam.s > loserTeam.s;
  };

  // Get available confidence points
  const getAvailableConfidence = () => {
    const used = Object.values(confidence);
    return CONFIDENCE_POINTS.filter(p => !used.includes(p));
  };

  // Assign confidence to a pick
  const assignConfidence = (pickKey, points) => {
    setConfidence(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => { if (n[k] === points) delete n[k]; });
      if (points) n[pickKey] = points;
      else delete n[pickKey];
      return n;
    });
  };

  // Count matching picks
  const countMatchingPicks = (picks1, picks2) => {
    let matches = 0;
    Object.keys(picks1).forEach(k => { if (picks1[k] === picks2[k]) matches++; });
    return matches;
  };

  // Display state for viewing other users' brackets
  const displayPicks = viewingUser ? (viewingUser.picks || {}) : picks;
  const displayName = viewingUser ? viewingUser.name : userName;
  const displayAvatar = viewingUser ? viewingUser.avatar : userAvatar;
  const isViewingOther = !!viewingUser;

  // Build bracket structure - uses ACTUAL results for matchups when available
  const getBracket = useCallback((picksToUse) => {
    const p = picksToUse || picks;
    const getTeam = (team) => ({ t: team, s: SEEDS.AFC.find(s => s.team === team)?.seed || SEEDS.NFC.find(s => s.team === team)?.seed });

    // Wild Card games - fixed matchups, show user's pick or actual result as winner
    const wcGames = (conf) => [
      { h: getTeam(SEEDS[conf][1].team), l: getTeam(SEEDS[conf][6].team), w: p[`${conf}_WC_0`] },
      { h: getTeam(SEEDS[conf][2].team), l: getTeam(SEEDS[conf][5].team), w: p[`${conf}_WC_1`] },
      { h: getTeam(SEEDS[conf][3].team), l: getTeam(SEEDS[conf][4].team), w: p[`${conf}_WC_2`] },
    ];

    // Get actual wild card winners from RESULTS (for building real divisional matchups)
    const getActualWcWinners = (conf) => {
      const winners = [];
      if (RESULTS[`${conf}_WC_0`]) winners.push(getTeam(RESULTS[`${conf}_WC_0`]));
      if (RESULTS[`${conf}_WC_1`]) winners.push(getTeam(RESULTS[`${conf}_WC_1`]));
      if (RESULTS[`${conf}_WC_2`]) winners.push(getTeam(RESULTS[`${conf}_WC_2`]));
      return winners;
    };

    // Divisional games - use ACTUAL wild card winners if all 3 games complete
    const divGames = (conf) => {
      const actualWinners = getActualWcWinners(conf);
      const top = getTeam(SEEDS[conf][0].team);

      // If all 3 wild card games are complete, use actual matchups
      if (actualWinners.length === 3) {
        const sorted = [...actualWinners].sort((a, b) => a.s - b.s);
        return [
          { h: top, l: sorted[2], w: p[`${conf}_DIV_0`] },
          { h: sorted[0], l: sorted[1], w: p[`${conf}_DIV_1`] },
        ];
      }

      // Otherwise fall back to user's picks for display
      const wcWinners = wcGames(conf).map(g => g.w ? getTeam(g.w) : null).filter(Boolean);
      if (wcWinners.length < 3) return [{ h: null, l: null, w: p[`${conf}_DIV_0`] }, { h: null, l: null, w: p[`${conf}_DIV_1`] }];
      const sorted = [...wcWinners].sort((a, b) => a.s - b.s);
      return [
        { h: top, l: sorted[2], w: p[`${conf}_DIV_0`] },
        { h: sorted[0], l: sorted[1], w: p[`${conf}_DIV_1`] },
      ];
    };

    // Get actual divisional winners from RESULTS
    const getActualDivWinners = (conf) => {
      const winners = [];
      if (RESULTS[`${conf}_DIV_0`]) winners.push(getTeam(RESULTS[`${conf}_DIV_0`]));
      if (RESULTS[`${conf}_DIV_1`]) winners.push(getTeam(RESULTS[`${conf}_DIV_1`]));
      return winners;
    };

    // Championship game - use ACTUAL divisional winners if both games complete
    const champGame = (conf) => {
      const actualDivWinners = getActualDivWinners(conf);

      if (actualDivWinners.length === 2) {
        return { h: actualDivWinners[0], l: actualDivWinners[1], w: p[`${conf}_CHAMP`] };
      }

      // Fall back to user's picks
      const dg = divGames(conf);
      const w0 = dg[0].w ? getTeam(dg[0].w) : null;
      const w1 = dg[1].w ? getTeam(dg[1].w) : null;
      return { h: w0, l: w1, w: p[`${conf}_CHAMP`] };
    };

    // Super Bowl - use ACTUAL conference champions if both complete
    const sb = () => {
      const afcChamp = RESULTS.AFC_CHAMP ? getTeam(RESULTS.AFC_CHAMP) : (champGame('AFC').w ? getTeam(champGame('AFC').w) : null);
      const nfcChamp = RESULTS.NFC_CHAMP ? getTeam(RESULTS.NFC_CHAMP) : (champGame('NFC').w ? getTeam(champGame('NFC').w) : null);
      return { afc: afcChamp, nfc: nfcChamp, w: p.SUPER_BOWL };
    };

    return {
      AFC: { wc: wcGames('AFC'), div: divGames('AFC'), champ: champGame('AFC') },
      NFC: { wc: wcGames('NFC'), div: divGames('NFC'), champ: champGame('NFC') },
      sb: sb(),
    };
  }, [picks]);

  const bracket = getBracket(displayPicks);

  // Make a pick (click again to deselect)
  const pick = (key, team) => {
    if (isPastDeadline || submitted) return;
    setPicks(p => {
      const n = { ...p };
      const [c, r] = key.split('_');
      // Deselect if clicking the same team
      if (p[key] === team) {
        delete n[key];
        // Clear dependent picks
        if (r === 'WC') { delete n[`${c}_DIV_0`]; delete n[`${c}_DIV_1`]; delete n[`${c}_CHAMP`]; delete n.SUPER_BOWL; }
        else if (r === 'DIV') { delete n[`${c}_CHAMP`]; delete n.SUPER_BOWL; }
        else if (r === 'CHAMP') delete n.SUPER_BOWL;
        return n;
      }
      // Clear dependent picks if changing selection
      if (p[key] && p[key] !== team) {
        if (r === 'WC') { delete n[`${c}_DIV_0`]; delete n[`${c}_DIV_1`]; delete n[`${c}_CHAMP`]; delete n.SUPER_BOWL; }
        else if (r === 'DIV') { delete n[`${c}_CHAMP`]; delete n.SUPER_BOWL; }
        else if (r === 'CHAMP') delete n.SUPER_BOWL;
      }
      n[key] = team;
      return n;
    });
  };

  // Team Logo Component with fallback
  const TeamLogo = ({ team, size = 28, style = {} }) => {
    const [error, setError] = useState(false);
    const t = NFL_TEAMS[team];
    if (!t) return null;
    
    if (error) {
      return (
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${t.color} 0%, ${t.color}dd 100%)`,
          border: `2px solid ${t.color2}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Oswald', sans-serif",
          fontSize: size * 0.35,
          fontWeight: 700,
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          boxShadow: `0 2px 8px ${t.color}44`,
          flexShrink: 0,
          ...style
        }}>
          {t.abbr.substring(0, 2)}
        </div>
      );
    }
    
    return (
      <img 
        src={t.logo} 
        alt={t.name}
        onError={() => setError(true)}
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          flexShrink: 0,
          ...style 
        }} 
      />
    );
  };

  // NFL Shield Component with fallback
  const NFLShieldLogo = ({ size = 40, style = {} }) => {
    const [error, setError] = useState(false);
    
    if (error) {
      return (
        <div style={{
          width: size,
          height: size * 1.2,
          background: 'linear-gradient(180deg, #013369 0%, #013369 50%, #D50A0A 50%, #D50A0A 100%)',
          borderRadius: size * 0.15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Oswald', sans-serif",
          fontSize: size * 0.25,
          fontWeight: 700,
          color: '#fff',
          border: '2px solid #fff',
          boxShadow: '0 4px 15px rgba(1,51,105,0.4)',
          ...style
        }}>
          NFL
        </div>
      );
    }
    
    return (
      <img 
        src={NFL_SHIELD} 
        alt="NFL"
        onError={() => setError(true)}
        style={{ 
          width: size, 
          height: size * 1.2, 
          objectFit: 'contain',
          ...style 
        }} 
      />
    );
  };

  // Get eliminated teams once for use in components
  const eliminatedTeams = getEliminatedTeams();

  // Team Component
  const Team = ({ data, selected, onClick, disabled, isUpsetPick, isEliminated }) => {
    if (!data) return (
      <div style={styles.teamEmpty}>
        <div style={styles.logoPlaceholder} />
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>TBD</span>
      </div>
    );
    const t = NFL_TEAMS[data.t];
    const clickable = onClick && !disabled;
    // Show eliminated styling whenever an eliminated team appears (not just when selected)
    const showEliminated = isEliminated;
    return (
      <div
        onClick={clickable ? onClick : undefined}
        style={{
          ...styles.team,
          background: showEliminated
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))'
            : 'rgba(255,255,255,0.03)',
          border: showEliminated
            ? '2px solid rgba(239,68,68,0.5)'
            : '2px solid transparent',
          cursor: clickable ? 'pointer' : 'default',
          opacity: disabled && !selected ? 0.5 : (showEliminated ? 0.7 : 1),
        }}
      >
        <TeamLogo team={data.t} size={28} style={showEliminated ? { opacity: 0.5 } : {}} />
        <span style={styles.seed}>{data.s}</span>
        <span style={{
          ...styles.name,
          textDecoration: showEliminated ? 'line-through' : 'none',
          color: showEliminated ? '#ef4444' : undefined,
          opacity: showEliminated ? 0.7 : 1
        }}>{t.city} {t.name}</span>
        {isUpsetPick && selected && !showEliminated && <span style={styles.upsetBadge} title="Upset Pick!">🔥</span>}
        {showEliminated && <span style={styles.eliminatedBadge} title="Eliminated">✗</span>}
        {selected && !showEliminated && (
          <div style={{ ...styles.check, background: SELECTION_COLOR }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  // Matchup Component
  const Matchup = ({ game, pickKey }) => {
    const upsetPick = isUpset(game, game.w);
    const confPts = confidence[pickKey];
    const availableConf = getAvailableConfidence();
    const isDisabled = isPastDeadline || isViewingOther;
    const hEliminated = game.h && eliminatedTeams.has(game.h.t);
    const lEliminated = game.l && eliminatedTeams.has(game.l.t);

    // Check if user picked correctly (game has a result and user's pick matches)
    const gameResult = RESULTS[pickKey];
    const isCorrectPick = gameResult && game.w === gameResult;
    const isWrongPick = gameResult && game.w && game.w !== gameResult;

    return (
      <div style={{
        ...styles.matchup,
        border: isCorrectPick ? '2px solid #22c55e' : isWrongPick ? '2px solid #ef4444' : undefined,
        borderRadius: isCorrectPick || isWrongPick ? 12 : undefined,
        boxShadow: isCorrectPick ? '0 0 12px rgba(34,197,94,0.3)' : isWrongPick ? '0 0 12px rgba(239,68,68,0.2)' : undefined,
        padding: isCorrectPick || isWrongPick ? 8 : undefined,
        background: isCorrectPick ? 'rgba(34,197,94,0.05)' : isWrongPick ? 'rgba(239,68,68,0.05)' : undefined,
      }}>
        <Team data={game.h} selected={game.w === game.h?.t} onClick={game.h && game.l && !isDisabled ? () => pick(pickKey, game.h.t) : null} disabled={isDisabled} isUpsetPick={false} isEliminated={hEliminated} />
        <div style={styles.vs}>VS</div>
        <Team data={game.l} selected={game.w === game.l?.t} onClick={game.h && game.l && !isDisabled ? () => pick(pickKey, game.l.t) : null} disabled={isDisabled} isUpsetPick={upsetPick} isEliminated={lEliminated} />
        {game.w && showConfidence && (
          <div style={styles.confRow}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Confidence:</span>
            <select
              value={confPts || ''}
              onChange={e => assignConfidence(pickKey, e.target.value ? parseInt(e.target.value) : null)}
              style={styles.confSelect}
            >
              <option value="">--</option>
              {confPts && <option value={confPts}>{confPts}</option>}
              {availableConf.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {confPts && <span style={styles.confBadge}>{confPts} pts</span>}
          </div>
        )}
        {upsetPick && !isCorrectPick && !isWrongPick && <div style={styles.upsetTag}>🔥 UPSET</div>}
        {isCorrectPick && <div style={styles.correctTag}>✓ CORRECT</div>}
      </div>
    );
  };

  // Bye Team Component
  const ByeTeam = ({ conf }) => {
    const t = NFL_TEAMS[SEEDS[conf][0].team];
    return (
      <div style={styles.bye}>
        <span style={styles.byeLabel}>👑 #1 Seed - First Round Bye</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <TeamLogo team={SEEDS[conf][0].team} size={28} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{t.city} {t.name}</span>
        </div>
      </div>
    );
  };

  // Process leaderboard data - calculate scores and sort by points
  const gamesCompleted = Object.keys(RESULTS).length;
  const leaderboard = leaderboardData
    .map(u => {
      const score = calculateScore(u.picks || {});
      return {
        ...u,
        name: u.displayName,
        isYou: u.id === userId,
        points: score.points,
        correct: score.correct,
        maxPoints: score.maxPoints,
      };
    })
    .sort((a, b) => {
      // Sort by points first, then by tiebreaker if points are equal
      if (b.points !== a.points) return b.points - a.points;
      // If points are tied and we have a tiebreaker result, use it
      // For now, just sort by correct picks as secondary
      return b.correct - a.correct;
    });

  // JOIN SCREEN
  if (view === 'join') return (
    <div style={styles.joinWrap}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', animation: 'float 6s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', animation: 'float 8s ease-in-out infinite reverse' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)' }} />

      <div style={styles.joinCard}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          <div className="float">
            <NFLShieldLogo size={80} />
          </div>
          <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1 }} />
        </div>

        <h1 style={styles.title}>NFL Playoffs 2026</h1>
        <p style={styles.subtitle}>Super Bowl LX • Levi's Stadium • Feb 8</p>

        {/* Playoff teams preview */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['DEN', 'NE', 'JAX', 'SEA', 'CHI', 'PHI', 'LAR'].map(t => (
            <div key={t} style={{ transition: 'transform 0.2s', cursor: 'default' }}
                 onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                 onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              <TeamLogo team={t} size={36} />
            </div>
          ))}
        </div>

        {/* Mode Toggle - only show after deadline to prevent accessing others' brackets */}
        {isPastDeadline && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
            <button
              onClick={() => setJoinMode('new')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: joinMode === 'new' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
                color: joinMode === 'new' ? 'white' : 'rgba(255,255,255,0.5)'
              }}
            >
              New Bracket
            </button>
            <button
              onClick={() => setJoinMode('returning')}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: joinMode === 'returning' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
                color: joinMode === 'returning' ? 'white' : 'rgba(255,255,255,0.5)'
              }}
            >
              Return to My Bracket
            </button>
          </div>
        )}

        {/* Name inputs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
          />
        </div>

        {/* Group password */}
        <input
          type="password"
          placeholder="Group password"
          value={groupPassword}
          onChange={e => setGroupPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleJoin()}
          style={styles.input}
        />

        {/* Error message */}
        {authError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.15)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
            <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{authError}</p>
          </div>
        )}

        {/* Avatar picker (only for new brackets) */}
        {joinMode === 'new' && (
          <div style={styles.avatarPicker}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Choose your avatar</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setUserAvatar(a)}
                  style={{
                    ...styles.avatarBtn,
                    border: userAvatar === a ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
                    background: userAvatar === a ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                    transform: userAvatar === a ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: userAvatar === a ? '0 0 20px rgba(59,130,246,0.4)' : 'none'
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={isLoading || !firstName.trim() || !lastName.trim() || !groupPassword || (isPastDeadline && joinMode === 'new')}
          onClick={handleJoin}
          style={{ ...styles.joinBtn, opacity: (isLoading || !firstName.trim() || !lastName.trim() || !groupPassword || (isPastDeadline && joinMode === 'new')) ? 0.5 : 1, cursor: (isLoading || !firstName.trim() || !lastName.trim() || !groupPassword || (isPastDeadline && joinMode === 'new')) ? 'not-allowed' : 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isLoading ? 'Loading...' : joinMode === 'new' ? '🏈 Create Bracket' : '🏈 Access Bracket'}
          </span>
        </button>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: isPastDeadline ? '#ef4444' : '#f59e0b' }} />
          <span style={{ fontSize: 13, color: isPastDeadline ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
            {isPastDeadline ? '🔒 Entries Closed' : `${countdown} until lock`}
          </span>
        </div>

        {/* Completed Brackets List */}
        {completedBrackets.length > 0 && (
          <div style={{ marginTop: 28, padding: '16px 20px', background: 'rgba(34,197,94,0.08)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '0 0 12px 0', fontWeight: 600 }}>
              ✓ Completed Brackets ({completedBrackets.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {completedBrackets.map((user, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: 20, fontSize: 13
                  }}
                >
                  <span>{user.avatar}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>{user.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // LEADERBOARD
  if (view === 'leaderboard') return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div
            onClick={goHome}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            title="Home"
          >
            <NFLShieldLogo size={36} />
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700 }}>NFL Playoffs 2026</h1>
          </div>
          {userId && <button onClick={() => setView('bracket')} style={styles.headerBtn}>📋 My Bracket</button>}
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, textAlign: 'center', marginBottom: 16 }}>🏆 Leaderboard</h2>

        {/* Scoring System Box */}
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(255,215,0,0.08)', borderRadius: 10, border: '1px solid rgba(255,215,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>POINTS:</span>
            {[
              ['Wild Card', POINT_VALUES.WC],
              ['Divisional', POINT_VALUES.DIV],
              ['Conference', POINT_VALUES.CHAMP],
              ['Super Bowl', POINT_VALUES.SB]
            ].map(([round, pts]) => (
              <span key={round} style={{ fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{round}</span>
                <span style={{ color: '#ffd700', fontWeight: 700, marginLeft: 4 }}>{pts}</span>
              </span>
            ))}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>• Max: 170 pts</span>
          </div>
        </div>

        {/* Picks hidden notice */}
        {!isPastDeadline && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245,158,11,0.15)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' }}>
            <p style={{ color: '#f59e0b', fontSize: 13, margin: 0 }}>🔒 Picks are hidden until the deadline. You can only see completion status.</p>
          </div>
        )}

        {/* Head-to-head comparison - only after deadline */}
        {isPastDeadline && compareUser && userName && (
          <div style={styles.h2hCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Head-to-Head vs {compareUser.name}</h3>
              <button onClick={() => setCompareUser(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>{userAvatar}</span>
                <p style={{ fontSize: 12, marginTop: 4 }}>You</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ffd700' }}>{countMatchingPicks(picks, compareUser.picks || {})}/13</div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Matching Picks</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>{compareUser.avatar}</span>
                <p style={{ fontSize: 12, marginTop: 4 }}>{compareUser.name}</p>
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Pick Comparison</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {Object.keys(picks).map(k => {
                  const yourPick = picks[k];
                  const theirPick = compareUser.picks?.[k];
                  const match = yourPick === theirPick;
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: match ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: 6, fontSize: 11 }}>
                      <TeamLogo team={yourPick} size={18} />
                      <span>{match ? '=' : '≠'}</span>
                      {theirPick ? <TeamLogo team={theirPick} size={18} /> : <span style={{ color: 'rgba(255,255,255,0.3)' }}>--</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            <p>No brackets submitted yet. Be the first!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboard.map((u, i) => (
              <div
                key={u.id || u.name}
                onClick={() => {
                  if (isPastDeadline) {
                    setViewingUser(u);
                    setView('bracket');
                  }
                }}
                style={{
                  ...styles.lbRow,
                  background: u.isYou ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))' : 'rgba(255,255,255,0.04)',
                  border: u.isYou ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: isPastDeadline ? 'pointer' : 'default',
                }}
              >
                <span style={styles.lbRank}>{i + 1}</span>
                <span style={{ fontSize: 24 }}>{u.avatar}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: isPastDeadline ? '#60a5fa' : 'inherit', textDecoration: isPastDeadline ? 'underline' : 'none' }}>
                    {u.name}{u.isYou ? ' (You)' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {u.correct}/13 correct {u.submitted && '✓'} {isPastDeadline && u.tiebreaker && `• TB: ${u.tiebreaker}`}
                  </div>
                </div>
                {gamesCompleted > 0 && (
                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ffd700' }}>{u.points}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>pts (max: {u.maxPoints})</div>
                  </div>
                )}
                {isPastDeadline && u.champion && <TeamLogo team={u.champion} size={28} />}
                {isPastDeadline && !u.isYou && userId && (
                  <button onClick={(e) => { e.stopPropagation(); setCompareUser(u); }} style={styles.compareBtn} title="Compare picks">⚔️</button>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );

  // BRACKET VIEW
  const displayScore = calculateScore(displayPicks);
  const displayCorrect = displayScore.correct;
  const displayMaxPoints = displayScore.maxPoints;
  const displayPoints = displayScore.points;

  return (
    <div style={styles.app}>
      <header style={styles.header} className="no-print">
        <div style={styles.headerInner}>
          <div
            onClick={goHome}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            title="Home"
          >
            <NFLShieldLogo size={36} />
            <div>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, margin: 0 }}>NFL Playoffs 2026</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                {displayName}'s Bracket
                {isViewingOther && <span style={{ color: '#60a5fa' }}> (viewing)</span>}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => { setViewingUser(null); setView('leaderboard'); }} style={styles.headerBtn}>
              {isViewingOther ? '← Back' : '🏆 Leaderboard'}
            </button>
            {!isViewingOther && userId && <button onClick={handleLogout} style={styles.headerBtn}>Logout</button>}
            {/* Confidence feature hidden for now
            <button
              onClick={() => setShowConfidence(!showConfidence)}
              style={{ ...styles.headerBtn, background: showConfidence ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', borderColor: showConfidence ? '#22c55e' : 'rgba(255,255,255,0.1)' }}
            >
              {showConfidence ? '✓' : '🎯'} Confidence
            </button>
            */}
            <div style={styles.badge}>
              <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: isPastDeadline ? '#ef4444' : '#f59e0b' }} />
              {countdown}
            </div>
            <div style={{ ...styles.badge, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(displayCorrect / 13) * 100}%`, background: displayCorrect === 13 ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))' : 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))', transition: 'width 0.3s ease' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: displayCorrect === 13 ? '#22c55e' : '#f59e0b', position: 'relative' }} />
              <span style={{ position: 'relative' }}>{displayCorrect}/13 correct</span>
            </div>
            {gamesCompleted > 0 && (
              <div style={{ ...styles.badge, background: 'rgba(255,215,0,0.1)', borderColor: 'rgba(255,215,0,0.3)' }}>
                <span style={{ color: '#ffd700', fontWeight: 700 }}>{displayPoints}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>pts (max: {displayMaxPoints})</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="mobile-tabs">
        <button className={mobileTab === 'AFC' ? 'active' : ''} onClick={() => setMobileTab('AFC')}>AFC</button>
        <button className={mobileTab === 'SUPER_BOWL' ? 'active' : ''} onClick={() => setMobileTab('SUPER_BOWL')}>Super Bowl</button>
        <button className={mobileTab === 'NFC' ? 'active' : ''} onClick={() => setMobileTab('NFC')}>NFC</button>
      </div>

      <main style={styles.bracketMain}>
        <div style={styles.bracketGrid} className="bracket-grid">
          {/* AFC */}
          <div className={`bracket-section bracket-afc ${mobileTab === 'AFC' ? 'active' : ''}`}>
            <div style={styles.confHeader}>
              <div style={{ ...styles.confDot, background: 'linear-gradient(135deg, #d50a0a, #ff4444)', boxShadow: '0 0 12px rgba(213,10,10,0.5)' }} />
              <h2 style={{ ...styles.confTitle, background: 'linear-gradient(135deg, #fff, #ff8888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AFC</h2>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>American Football Conference</span>
            </div>
            <div style={styles.rounds}>
              <div>
                <h3 style={styles.roundTitle}>🎯 Wild Card</h3>
                {bracket.AFC.wc.map((g, i) => <Matchup key={i} game={g} pickKey={`AFC_WC_${i}`} />)}
              </div>
              <div>
                <h3 style={styles.roundTitle}>⚔️ Divisional</h3>
                <ByeTeam conf="AFC" />
                {bracket.AFC.div.map((g, i) => <Matchup key={i} game={g} pickKey={`AFC_DIV_${i}`} />)}
              </div>
              <div>
                <h3 style={styles.roundTitle}>👑 AFC Championship</h3>
                <Matchup game={bracket.AFC.champ} pickKey="AFC_CHAMP" />
              </div>
            </div>
          </div>

          {/* Super Bowl */}
          <div style={styles.sbWrap} className={`bracket-section bracket-sb ${mobileTab === 'SUPER_BOWL' ? 'active' : ''}`}>
            <div style={{ position: 'absolute', top: 20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
            
            <div style={styles.sbHeader}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  className="float"
                  src={LOMBARDI_TROPHY}
                  alt="Lombardi Trophy"
                  style={{ height: 130, objectFit: 'contain', filter: 'drop-shadow(0 4px 20px rgba(255,215,0,0.5))' }}
                />
              </div>
              <h2 style={styles.sbTitle}>Super Bowl LX</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Levi's Stadium • Santa Clara • Feb 8</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(213,10,10,0.2)', borderRadius: 20, color: '#ff6b6b' }}>AFC Champion</span>
                <span style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(0,53,148,0.2)', borderRadius: 20, color: '#6b9fff' }}>NFC Champion</span>
              </div>
            </div>
            
            <div style={{ ...styles.sbMatchup, position: 'relative', overflow: 'hidden' }}>
              <div className="shimmer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit' }} />
              <Team data={bracket.sb.afc} selected={bracket.sb.w === bracket.sb.afc?.t} onClick={bracket.sb.afc && bracket.sb.nfc ? () => pick('SUPER_BOWL', bracket.sb.afc.t) : null} disabled={isPastDeadline} isEliminated={bracket.sb.afc && eliminatedTeams.has(bracket.sb.afc.t)} />
              <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,215,0,0.6)', letterSpacing: '0.2em', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 30, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5))' }} />
                VS
                <span style={{ width: 30, height: 1, background: 'linear-gradient(90deg, rgba(255,215,0,0.5), transparent)' }} />
              </div>
              <Team data={bracket.sb.nfc} selected={bracket.sb.w === bracket.sb.nfc?.t} onClick={bracket.sb.afc && bracket.sb.nfc ? () => pick('SUPER_BOWL', bracket.sb.nfc.t) : null} disabled={isPastDeadline} isEliminated={bracket.sb.nfc && eliminatedTeams.has(bracket.sb.nfc.t)} />
            </div>
            
            {bracket.sb.w && (
              <div style={{ ...styles.champion, position: 'relative', overflow: 'hidden' }}>
                <div className="shimmer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>🏆 Your Champion 🏆</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <TeamLogo team={bracket.sb.w} size={48} />
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, background: 'linear-gradient(135deg, #ffd700, #ffed4a, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{NFL_TEAMS[bracket.sb.w].city} {NFL_TEAMS[bracket.sb.w].name}</span>
                </div>
              </div>
            )}
            
            {/* Tiebreaker */}
            <div style={styles.tiebreaker}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Tiebreaker: Total Points in Super Bowl</label>
              {isViewingOther ? (
                <div style={{ ...styles.tiebreakerInput, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewingUser?.tiebreaker || '—'}
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 47"
                  value={tiebreaker}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 200)) {
                      setTiebreaker(val);
                    }
                  }}
                  style={{ ...styles.tiebreakerInput, borderColor: picksComplete && !tiebreakerFilled ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
                  disabled={isPastDeadline}
                />
              )}
              {!isViewingOther && tiebreaker && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Closest to actual without going over wins</p>}
              {!isViewingOther && picksComplete && !tiebreakerFilled && <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>⚠️ Required to complete bracket</p>}
            </div>

            {/* Clear All Button - only for own bracket before deadline */}
            {!isPastDeadline && !isViewingOther && (
              <button
                onClick={handleClearSelections}
                style={{
                  marginTop: 24,
                  padding: '12px 32px',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'Oswald', sans-serif",
                  background: 'rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                Clear All Selections
              </button>
            )}

            {/* Submit Button - only for own bracket */}
            {!isViewingOther && isComplete && !submitted && !isPastDeadline && (
              <button
                onClick={handleSubmit}
                style={{
                  marginTop: 24,
                  padding: '16px 48px',
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "'Oswald', sans-serif",
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                🏆 Submit Bracket
              </button>
            )}
            {!isViewingOther && submitted && (
              <div style={{ marginTop: 24, padding: '12px 24px', background: 'rgba(34,197,94,0.1)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)' }}>
                <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>✓ Bracket Submitted!</p>
              </div>
            )}
          </div>

          {/* NFC */}
          <div className={`bracket-section bracket-nfc ${mobileTab === 'NFC' ? 'active' : ''}`}>
            <div style={{ ...styles.confHeader, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginRight: 'auto' }}>National Football Conference</span>
              <h2 style={{ ...styles.confTitle, background: 'linear-gradient(135deg, #fff, #88aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NFC</h2>
              <div style={{ ...styles.confDot, background: 'linear-gradient(135deg, #003594, #4477ff)', boxShadow: '0 0 12px rgba(0,53,148,0.5)' }} />
            </div>
            <div style={{ ...styles.rounds, direction: 'rtl' }}>
              <div style={{ direction: 'ltr' }}>
                <h3 style={{ ...styles.roundTitle, textAlign: 'right' }}>🎯 Wild Card</h3>
                {bracket.NFC.wc.map((g, i) => <Matchup key={i} game={g} pickKey={`NFC_WC_${i}`} />)}
              </div>
              <div style={{ direction: 'ltr' }}>
                <h3 style={{ ...styles.roundTitle, textAlign: 'right' }}>⚔️ Divisional</h3>
                <ByeTeam conf="NFC" />
                {bracket.NFC.div.map((g, i) => <Matchup key={i} game={g} pickKey={`NFC_DIV_${i}`} />)}
              </div>
              <div style={{ direction: 'ltr' }}>
                <h3 style={{ ...styles.roundTitle, textAlign: 'right' }}>👑 NFC Championship</h3>
                <Matchup game={bracket.NFC.champ} pickKey="NFC_CHAMP" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Completion Overlay */}
      {showComplete && (
        <div style={styles.overlay}>
          <div style={styles.completeBox}>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 8 + Math.random() * 8,
                  height: 8 + Math.random() * 8,
                  background: ['#ffd700', '#ff6b35', '#3b82f6', '#22c55e', '#8b5cf6'][i % 5],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
            <div className="float" style={{ fontSize: 120, marginBottom: 20, filter: 'drop-shadow(0 0 40px rgba(255,215,0,0.6))' }}>🏆</div>
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 48, background: 'linear-gradient(135deg, #ffd700, #ffed4a, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>Bracket Complete!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>Good luck, {userName}! 🍀</p>
            {bracket.sb.w && (
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 24px', background: 'rgba(255,215,0,0.1)', borderRadius: 12, border: '1px solid rgba(255,215,0,0.3)' }}>
                <TeamLogo team={bracket.sb.w} size={36} />
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: '#ffd700' }}>Champion: {NFL_TEAMS[bracket.sb.w].name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  app: { minHeight: '100vh', background: 'linear-gradient(145deg, #0a0e14, #111827, #0f172a)', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e5e7eb' },
  joinWrap: { minHeight: '100vh', background: 'linear-gradient(145deg, #0a0e14, #111827, #0f172a)', fontFamily: "'Inter', -apple-system, sans-serif", color: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' },
  joinCard: { background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', borderRadius: 24, padding: 48, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', maxWidth: 440, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 },
  title: { fontFamily: "'Oswald', sans-serif", fontSize: 36, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4, marginBottom: 32 },
  input: { width: '100%', padding: '16px 20px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 20 },
  avatarPicker: { marginBottom: 20 },
  avatarBtn: { width: 44, height: 44, borderRadius: 10, fontSize: 20, cursor: 'pointer', transition: 'all 0.2s' },
  joinBtn: { width: '100%', padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: 16, fontWeight: 600, boxShadow: '0 8px 32px rgba(59,130,246,0.3)', cursor: 'pointer' },
  header: { position: 'sticky', top: 0, background: 'rgba(10,14,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px', zIndex: 100 },
  headerInner: { maxWidth: 1600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  headerBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  badge: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 500 },
  bracketMain: { padding: 24, overflowX: 'auto' },
  bracketGrid: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, maxWidth: 1600, margin: '0 auto' },
  confHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  confDot: { width: 14, height: 14, borderRadius: '50%' },
  confTitle: { fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, margin: 0 },
  rounds: { display: 'flex', flexDirection: 'column', gap: 24 },
  roundTitle: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 },
  matchup: { background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', borderRadius: 14, padding: 10, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 },
  vs: { textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', padding: '2px 0' },
  team: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, transition: 'all 0.2s', minHeight: 48 },
  teamEmpty: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, height: 44 },
  logoPlaceholder: { width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)' },
  seed: { background: 'rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' },
  name: { fontSize: 13, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  check: { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  upsetBadge: { fontSize: 14, marginLeft: 4 },
  eliminatedBadge: { fontSize: 14, marginLeft: 4, color: '#ef4444', fontWeight: 700 },
  upsetTag: { marginTop: 6, fontSize: 10, fontWeight: 700, color: '#f97316', textAlign: 'center', letterSpacing: '0.05em' },
  correctTag: { marginTop: 6, fontSize: 10, fontWeight: 700, color: '#22c55e', textAlign: 'center', letterSpacing: '0.05em' },
  confRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 },
  confSelect: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '2px 6px', color: '#e5e7eb', fontSize: 11, cursor: 'pointer' },
  confBadge: { background: 'linear-gradient(135deg, #22c55e, #16a34a)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: 'white' },
  bye: { background: 'linear-gradient(180deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))', borderRadius: 12, padding: 10, border: '1px solid rgba(255,215,0,0.2)', marginBottom: 10 },
  byeLabel: { display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,215,0,0.7)', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  sbWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, position: 'relative' },
  sbHeader: { textAlign: 'center', marginBottom: 20 },
  sbTitle: { fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #ffd700, #ffed4a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sbMatchup: { background: 'linear-gradient(180deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))', borderRadius: 20, padding: 16, border: '2px solid rgba(255,215,0,0.25)', boxShadow: '0 8px 48px rgba(255,215,0,0.1)', width: 300 },
  champion: { marginTop: 20, padding: '16px 24px', background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))', borderRadius: 12, textAlign: 'center' },
  tiebreaker: { marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, textAlign: 'center' },
  tiebreakerInput: { width: 100, padding: '10px 16px', borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 18, fontWeight: 700, textAlign: 'center', outline: 'none', fontFamily: 'inherit' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  completeBox: { textAlign: 'center', animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'relative' },
  lbRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, transition: 'all 0.2s' },
  lbRank: { width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  compareBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  h2hCard: { background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', borderRadius: 16, padding: 20, border: '1px solid rgba(139,92,246,0.2)', marginBottom: 24 },
};
