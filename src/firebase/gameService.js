import { db } from "./config";
import {
  ref,
  set,
  get,
  push,
  update,
  onValue,
  off,
  remove,
  serverTimestamp,
} from "firebase/database";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a random 6-character room code (uppercase letters) */
export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Calculate points based on response time (1000 → 100 over 30s) */
export function calculatePoints(timeMs, isCorrect) {
  if (!isCorrect) return 0;
  const timeLimitMs = 30_000;
  const minPts = 100;
  const maxPts = 1000;
  const ratio = Math.max(0, 1 - timeMs / timeLimitMs);
  return Math.round(minPts + (maxPts - minPts) * ratio);
}

/** Normalize Vietnamese answer for comparison */
export function normalizeAnswer(str) {
  return str.trim().toLowerCase().normalize("NFC").replace(/\s+/g, " ");
}

// ─── Room lifecycle ───────────────────────────────────────────────────────────

/**
 * Create a new game room.
 * Returns the room code.
 */
export async function createRoom(totalQuestions) {
  let code = generateRoomCode();
  // Ensure room code is unique
  let attempt = 0;
  while (attempt < 5) {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) break;
    code = generateRoomCode();
    attempt++;
  }

  await set(ref(db, `rooms/${code}`), {
    state: "lobby",        // lobby | question | reveal | finished
    currentQuestion: 0,
    totalQuestions,
    questionStartTime: 0,
    createdAt: Date.now(),
  });

  return code;
}

/** Delete a room (host cleanup) */
export async function deleteRoom(roomCode) {
  await remove(ref(db, `rooms/${roomCode}`));
}

// ─── Player management ────────────────────────────────────────────────────────

const PLAYER_COLORS = [
  "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7",
  "#DDA0DD","#FF9FF3","#54A0FF","#FF6348","#2ED573",
  "#FFA502","#FF4757","#7BED9F","#70A1FF","#ECCC68",
];

/**
 * Join a room as a player.
 * Returns { playerId } or throws if room not found.
 */
export async function joinRoom(roomCode, playerName) {
  const roomSnap = await get(ref(db, `rooms/${roomCode}`));
  if (!roomSnap.exists()) throw new Error("Phòng không tồn tại!");
  const roomData = roomSnap.val();
  if (roomData.state !== "lobby") throw new Error("Trò chơi đã bắt đầu!");

  const playerRef = push(ref(db, `rooms/${roomCode}/players`));
  const colorIndex = Math.floor(Math.random() * PLAYER_COLORS.length);
  await set(playerRef, {
    name: playerName.trim(),
    score: 0,
    color: PLAYER_COLORS[colorIndex],
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  });

  return { playerId: playerRef.key };
}

/** Update player last seen (keep-alive) */
export async function pingPlayer(roomCode, playerId) {
  await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
    lastSeen: Date.now(),
  });
}

// ─── Game flow (host controls) ────────────────────────────────────────────────

/** Host starts the game → set state to 'question', currentQuestion = 0 */
export async function startGame(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    state: "question",
    currentQuestion: 0,
    questionStartTime: Date.now(),
  });
}

/** Host moves to reveal phase for current question */
export async function revealAnswer(roomCode, questionIndex, correctAnswer) {
  await update(ref(db, `rooms/${roomCode}`), {
    state: "reveal",
    revealedAnswer: correctAnswer,
  });
}

/** Host moves to next question */
export async function nextQuestion(roomCode, nextIndex) {
  await update(ref(db, `rooms/${roomCode}`), {
    state: "question",
    currentQuestion: nextIndex,
    questionStartTime: Date.now(),
    revealedAnswer: null,
  });
}

/** Host ends the game */
export async function endGame(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    state: "finished",
  });
}

// ─── Answer submission ────────────────────────────────────────────────────────

/**
 * Player submits an answer.
 * Calculates points and writes to Firebase.
 */
export async function submitAnswer(
  roomCode,
  questionIndex,
  playerId,
  answer,
  correctAnswer,
  questionStartTime
) {
  const timeMs = Date.now() - questionStartTime;
  const isCorrect =
    normalizeAnswer(answer) === normalizeAnswer(correctAnswer);
  const points = calculatePoints(timeMs, isCorrect);

  // Write answer
  await set(
    ref(db, `rooms/${roomCode}/answers/${questionIndex}/${playerId}`),
    {
      answer: answer.trim(),
      isCorrect,
      points,
      timeMs,
      submittedAt: Date.now(),
    }
  );

  // Update player total score
  const playerSnap = await get(ref(db, `rooms/${roomCode}/players/${playerId}`));
  if (playerSnap.exists()) {
    const currentScore = playerSnap.val().score || 0;
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      score: currentScore + points,
    });
  }

  return { isCorrect, points, timeMs };
}

// ─── Realtime listeners ───────────────────────────────────────────────────────

/** Listen to the full room state */
export function listenRoom(roomCode, callback) {
  const r = ref(db, `rooms/${roomCode}`);
  onValue(r, (snap) => callback(snap.val()));
  return () => off(r);
}

/** Listen to players in a room */
export function listenPlayers(roomCode, callback) {
  const r = ref(db, `rooms/${roomCode}/players`);
  onValue(r, (snap) => {
    const val = snap.val() || {};
    const players = Object.entries(val).map(([id, data]) => ({
      id,
      ...data,
    }));
    callback(players);
  });
  return () => off(r);
}

/** Listen to answers for a specific question */
export function listenAnswers(roomCode, questionIndex, callback) {
  const r = ref(db, `rooms/${roomCode}/answers/${questionIndex}`);
  onValue(r, (snap) => {
    const val = snap.val() || {};
    callback(val);
  });
  return () => off(r);
}

/** One-time check if room exists */
export async function checkRoom(roomCode) {
  const snap = await get(ref(db, `rooms/${roomCode}`));
  return snap.exists() ? snap.val() : null;
}
