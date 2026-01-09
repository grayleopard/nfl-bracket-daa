import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'brackets_2026';

// Generate a URL-safe ID from name
const generateUserId = (firstName, lastName) => {
  return `${firstName.toLowerCase().trim()}_${lastName.toLowerCase().trim()}`.replace(/\s+/g, '_');
};

// Check if a user exists
export const checkUserExists = async (firstName, lastName) => {
  const userId = generateUserId(firstName, lastName);
  const docRef = doc(db, COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

// Create a new user
export const createUser = async (firstName, lastName, avatar) => {
  const userId = generateUserId(firstName, lastName);
  const docRef = doc(db, COLLECTION, userId);

  // Check if already exists
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error('This name is already taken. If this is you, click "Return to My Bracket" instead.');
  }

  const userData = {
    id: userId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    displayName: `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
    avatar,
    picks: {},
    tiebreaker: '',
    submitted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, userData);
  return { userId, ...userData };
};

// Get user data
export const getUser = async (firstName, lastName) => {
  const userId = generateUserId(firstName, lastName);
  const docRef = doc(db, COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('No bracket found with this name. Please check your spelling or create a new bracket.');
  }

  return { userId, ...docSnap.data() };
};

// Update user picks
export const updatePicks = async (userId, picks) => {
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    picks,
    updatedAt: new Date().toISOString()
  });
};

// Update user tiebreaker
export const updateTiebreaker = async (userId, tiebreaker) => {
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    tiebreaker,
    updatedAt: new Date().toISOString()
  });
};

// Submit bracket
export const submitBracket = async (userId) => {
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    submitted: true,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

// Clear all selections
export const clearSelections = async (userId) => {
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    picks: {},
    tiebreaker: '',
    submitted: false,
    updatedAt: new Date().toISOString()
  });
};

// Get all users for leaderboard
export const getAllUsers = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  const users = [];
  querySnapshot.forEach((doc) => {
    users.push({ id: doc.id, ...doc.data() });
  });
  return users;
};

// Get leaderboard data (hides picks if before deadline)
export const getLeaderboard = async (isPastDeadline) => {
  const users = await getAllUsers();

  return users.map(user => ({
    id: user.id,
    displayName: user.displayName,
    avatar: user.avatar,
    pickCount: Object.keys(user.picks || {}).length,
    submitted: user.submitted,
    tiebreaker: isPastDeadline ? user.tiebreaker : null,
    // Only show picks after deadline
    picks: isPastDeadline ? user.picks : null,
    champion: isPastDeadline && user.picks?.SUPER_BOWL ? user.picks.SUPER_BOWL : null,
  }));
};
