import { useState, useEffect, useCallback, useRef } from "react";
import { quizData } from "../data/quizData";
import {
  createRoom,
  startGame,
  revealAnswer,
  nextQuestion,
  endGame,
  listenRoom,
  listenPlayers,
  listenAnswers,
  deleteRoom,
} from "../firebase/gameService";
import { useConfetti, useSoundEffects } from "../hooks/useGameEffects";
import Confetti from "../components/Confetti";
import "./HostPage.css";

const TIME_LIMIT = 30;

const DIFFICULTY_COLOR = {
  "Dễ": "#34d399",
  "Trung bình": "#fbbf24",
  "Khó": "#f87171",
};

export default function HostPage() {
  const [phase, setPhase] = useState("creating"); // creating|lobby|question|reveal|finished
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [room, setRoom] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [currentQ, setCurrentQ] = useState(0);
  const [error, setError] = useState("");

  const timerRef = useRef(null);
  const unsubRoomRef = useRef(null);
  const unsubPlayersRef = useRef(null);
  const unsubAnswersRef = useRef(null);
  const roomCodeRef = useRef("");

  const { particles, triggerConfetti } = useConfetti();
  const { playSound } = useSoundEffects();

  // ── Init room ────────────────────────────────────────────────────────────
  useEffect(() => {
    let code = "";

    async function init() {
      try {
        code = await createRoom(quizData.length);
        roomCodeRef.current = code;
        setRoomCode(code);
        setPhase("lobby");

        // Listen room state
        unsubRoomRef.current = listenRoom(code, (data) => {
          if (data) setRoom(data);
        });

        // Listen players
        unsubPlayersRef.current = listenPlayers(code, (pList) => {
          setPlayers(pList.sort((a, b) => b.score - a.score));
        });
      } catch (e) {
        setError("Lỗi kết nối Firebase. Kiểm tra lại config.");
        console.error(e);
      }
    }

    init();

    return () => {
      unsubRoomRef.current?.();
      unsubPlayersRef.current?.();
      unsubAnswersRef.current?.();
      if (roomCodeRef.current) deleteRoom(roomCodeRef.current);
    };
  }, []);

  // ── Listen answers when question changes ─────────────────────────────────
  useEffect(() => {
    if (!roomCode || phase !== "question") return;
    unsubAnswersRef.current?.();
    unsubAnswersRef.current = listenAnswers(roomCode, currentQ, (ans) => {
      setAnswers(ans);
    });
  }, [roomCode, currentQ, phase]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          handleReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [roomCode, currentQ]); // eslint-disable-line

  // ── Handle start game ────────────────────────────────────────────────────
  const handleStart = async () => {
    if (players.length === 0) return;
    playSound("click");
    await startGame(roomCode);
    setPhase("question");
    setCurrentQ(0);
    setAnswers({});
    startTimer();
  };

  // ── Handle reveal ────────────────────────────────────────────────────────
  const handleReveal = useCallback(async () => {
    stopTimer();
    const code = roomCodeRef.current;
    if (!code) return;
    const correct = quizData[currentQ].correct;
    await revealAnswer(code, currentQ, correct);
    setPhase("reveal");
    playSound("correct");
  }, [currentQ, stopTimer, playSound]);

  // ── Handle next ──────────────────────────────────────────────────────────
  const handleNext = async () => {
    playSound("click");
    const next = currentQ + 1;
    if (next >= quizData.length) {
      await endGame(roomCode);
      setPhase("finished");
      triggerConfetti(120);
      playSound("victory");
    } else {
      await nextQuestion(roomCode, next);
      setCurrentQ(next);
      setAnswers({});
      setPhase("question");
      startTimer();
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  const leaderboard = [...players].sort((a, b) => b.score - a.score);
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=0f172a&color=818cf8&margin=10`;

  const timePercent = (timeLeft / TIME_LIMIT) * 100;
  const timerColor =
    timeLeft > 15 ? "#34d399" : timeLeft > 7 ? "#fbbf24" : "#f87171";

  // ── Render ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="host-error">
        <div className="error-icon">⚠️</div>
        <h2>Lỗi kết nối</h2>
        <p>{error}</p>
        <p className="error-hint">Xem hướng dẫn trong file <code>src/firebase/config.js</code></p>
      </div>
    );
  }

  if (phase === "creating") {
    return (
      <div className="host-loading">
        <div className="loading-spinner" />
        <p>Đang tạo phòng...</p>
      </div>
    );
  }

  return (
    <div className="host-page">
      <Confetti particles={particles} />

      {/* ── LOBBY ── */}
      {phase === "lobby" && (
        <div className="lobby-screen">
          <div className="lobby-header">
            <div className="lobby-title-group">
              <span className="lobby-badge">🏛️ LIÊN MINH CÔNG – NÔNG – TRÍ</span>
              <h1 className="lobby-title">Trò Chơi Giải Mã Từ Khóa</h1>
            </div>
            <div className="lobby-meta">
              <span>📝 {quizData.length} câu hỏi</span>
              <span>⏱️ {TIME_LIMIT}s/câu</span>
            </div>
          </div>

          <div className="lobby-main">
            {/* QR + Code */}
            <div className="lobby-join-panel">
              <div className="join-instruction">📱 Học sinh quét mã để tham gia</div>
              <img className="qr-code" src={qrUrl} alt="QR join" />
              <div className="room-code-display">
                <span className="code-label">MÃ PHÒNG</span>
                <span className="code-value">{roomCode}</span>
              </div>
              <div className="join-url">{joinUrl}</div>
            </div>

            {/* Player list */}
            <div className="lobby-players-panel">
              <div className="players-header">
                <span className="players-count-badge">
                  👥 {players.length} người đã tham gia
                </span>
              </div>
              <div className="players-grid">
                {players.length === 0 ? (
                  <div className="no-players">
                    <div className="waiting-dots">
                      <span /><span /><span />
                    </div>
                    <p>Chờ học sinh tham gia...</p>
                  </div>
                ) : (
                  players.map((p, i) => (
                    <div
                      key={p.id}
                      className="player-chip"
                      style={{ borderColor: p.color, animationDelay: `${i * 0.05}s` }}
                    >
                      <span className="player-avatar" style={{ background: p.color }}>
                        {p.name[0].toUpperCase()}
                      </span>
                      <span className="player-name">{p.name}</span>
                    </div>
                  ))
                )}
              </div>

              <button
                className={`host-start-btn ${players.length === 0 ? "disabled" : ""}`}
                onClick={handleStart}
                disabled={players.length === 0}
              >
                {players.length === 0
                  ? "⏳ Chờ người chơi..."
                  : `🚀 BẮT ĐẦU (${players.length} người)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION ── */}
      {phase === "question" && (
        <div className="question-screen">
          {/* Top bar */}
          <div className="q-topbar">
            <div className="q-progress">
              {quizData.map((_, i) => (
                <div
                  key={i}
                  className={`q-dot ${i === currentQ ? "active" : ""} ${i < currentQ ? "done" : ""}`}
                />
              ))}
            </div>
            <div className="q-counter">
              Câu <strong>{currentQ + 1}</strong> / {quizData.length}
            </div>

            {/* Answers counter */}
            <div className="answers-counter">
              ✅ {answeredCount} / {players.length} đã trả lời
            </div>

            {/* Force reveal button */}
            <button className="force-reveal-btn" onClick={handleReveal}>
              Hiện đáp án →
            </button>
          </div>

          <div className="q-body">
            {/* Left: question content */}
            <div className="q-content">
              <div className="q-difficulty-tag" style={{ color: DIFFICULTY_COLOR[quizData[currentQ].difficulty] }}>
                {quizData[currentQ].difficulty === "Dễ" ? "🟢" : quizData[currentQ].difficulty === "Trung bình" ? "🟡" : "🔴"}
                {" "}{quizData[currentQ].difficulty}
              </div>
              <p className="q-text">{quizData[currentQ].question}</p>

              {/* Scrambled word */}
              <div className="q-scrambled-wrap">
                <div className="q-scrambled-label">🔀 Từ khóa bị xáo trộn</div>
                <div className="q-scrambled">
                  {quizData[currentQ].scrambled.split(" - ").map((part, pi) => (
                    <span key={pi} className="q-scrambled-group">
                      {part.split("").map((ch, ci) => (
                        <span
                          key={ci}
                          className="q-scrambled-char"
                          style={{ animationDelay: `${(pi * 6 + ci) * 0.04}s` }}
                        >
                          {ch}
                        </span>
                      ))}
                      {pi < quizData[currentQ].scrambled.split(" - ").length - 1 && (
                        <span className="q-scrambled-sep">–</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: timer + mini leaderboard */}
            <div className="q-sidebar">
              {/* Circular timer */}
              <div className="timer-wrap">
                <svg viewBox="0 0 120 120" className="timer-svg">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={timerColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - timePercent / 100)}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                  />
                </svg>
                <div className="timer-value" style={{ color: timerColor }}>
                  {timeLeft}
                </div>
              </div>

              {/* Mini leaderboard */}
              <div className="mini-leaderboard">
                <div className="mini-lb-title">🏆 Bảng điểm</div>
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="mini-lb-row">
                    <span className="mini-lb-rank">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span
                      className="mini-lb-dot"
                      style={{ background: p.color }}
                    />
                    <span className="mini-lb-name">{p.name}</span>
                    <span className="mini-lb-score">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVEAL ── */}
      {phase === "reveal" && (
        <div className="reveal-screen">
          <div className="reveal-header">
            <span>Câu {currentQ + 1} / {quizData.length} — Đáp án</span>
          </div>

          <div className="reveal-body">
            <div className="reveal-left">
              <p className="reveal-question">{quizData[currentQ].question}</p>
              <div className="reveal-answer-box">
                <div className="reveal-label">✅ Đáp án đúng</div>
                <div className="reveal-answer">{quizData[currentQ].correct}</div>
              </div>

              {/* Answer stats */}
              <div className="answer-stats">
                <div className="stat-chip stat-correct-chip">
                  <span>✅</span>
                  <span>Đúng: {Object.values(answers).filter(a => a.isCorrect).length}</span>
                </div>
                <div className="stat-chip stat-wrong-chip">
                  <span>❌</span>
                  <span>Sai: {Object.values(answers).filter(a => !a.isCorrect).length}</span>
                </div>
                <div className="stat-chip stat-skip-chip">
                  <span>⏭️</span>
                  <span>Bỏ qua: {players.length - Object.keys(answers).length}</span>
                </div>
              </div>
            </div>

            {/* Right: top 5 leaderboard */}
            <div className="reveal-right">
              <div className="reveal-lb-title">📊 Bảng xếp hạng</div>
              <div className="reveal-lb-list">
                {leaderboard.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="reveal-lb-row" style={{ animationDelay: `${i * 0.1}s` }}>
                    <span className="reveal-lb-rank">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span className="reveal-lb-avatar" style={{ background: p.color }}>
                      {p.name[0].toUpperCase()}
                    </span>
                    <span className="reveal-lb-name">{p.name}</span>
                    <div className="reveal-lb-right">
                      {answers[p.id] && (
                        <span className={`reveal-lb-ans ${answers[p.id].isCorrect ? "ans-correct" : "ans-wrong"}`}>
                          {answers[p.id].isCorrect ? "+" + answers[p.id].points : "0"}
                        </span>
                      )}
                      <span className="reveal-lb-score">{p.score}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="next-btn-host" onClick={handleNext}>
                {currentQ < quizData.length - 1
                  ? "Câu tiếp theo →"
                  : "Kết thúc & Xem kết quả 🏆"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FINISHED ── */}
      {phase === "finished" && (
        <div className="final-screen">
          <div className="final-header">
            <h1 className="final-title">🏆 Kết Quả Cuối Cùng</h1>
            <p className="final-subtitle">Liên minh Công – Nông – Trí</p>
          </div>

          {/* Podium */}
          {leaderboard.length >= 1 && (
            <div className="podium">
              {/* 2nd */}
              {leaderboard[1] && (
                <div className="podium-slot podium-2">
                  <div className="podium-avatar" style={{ background: leaderboard[1].color }}>
                    {leaderboard[1].name[0].toUpperCase()}
                  </div>
                  <div className="podium-name">{leaderboard[1].name}</div>
                  <div className="podium-score">{leaderboard[1].score} điểm</div>
                  <div className="podium-bar bar-2">🥈</div>
                </div>
              )}
              {/* 1st */}
              <div className="podium-slot podium-1">
                <div className="podium-crown">👑</div>
                <div className="podium-avatar avatar-1" style={{ background: leaderboard[0].color }}>
                  {leaderboard[0].name[0].toUpperCase()}
                </div>
                <div className="podium-name">{leaderboard[0].name}</div>
                <div className="podium-score">{leaderboard[0].score} điểm</div>
                <div className="podium-bar bar-1">🥇</div>
              </div>
              {/* 3rd */}
              {leaderboard[2] && (
                <div className="podium-slot podium-3">
                  <div className="podium-avatar" style={{ background: leaderboard[2].color }}>
                    {leaderboard[2].name[0].toUpperCase()}
                  </div>
                  <div className="podium-name">{leaderboard[2].name}</div>
                  <div className="podium-score">{leaderboard[2].score} điểm</div>
                  <div className="podium-bar bar-3">🥉</div>
                </div>
              )}
            </div>
          )}

          {/* Full ranking */}
          <div className="final-ranking">
            {leaderboard.slice(3).map((p, i) => (
              <div key={p.id} className="final-rank-row" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="final-rank-num">#{i + 4}</span>
                <span className="final-rank-dot" style={{ background: p.color }} />
                <span className="final-rank-name">{p.name}</span>
                <span className="final-rank-score">{p.score} điểm</span>
              </div>
            ))}
          </div>

          {/* Prize message */}
          {leaderboard[0] && (
            <div className="prize-banner">
              🎁 Xin chúc mừng <strong>{leaderboard[0].name}</strong> — người chiến thắng xuất sắc nhất! 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}
