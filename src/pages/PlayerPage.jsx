import { useState, useEffect, useCallback, useRef } from "react";
import { quizData } from "../data/quizData";
import {
  joinRoom,
  submitAnswer,
  checkRoom,
  listenRoom,
  pingPlayer,
  listenPlayers,
  listenAnswers,
} from "../firebase/gameService";
import { useConfetti, useSoundEffects } from "../hooks/useGameEffects";
import Confetti from "../components/Confetti";
import AudioController from "../components/AudioController";
import "./PlayerPage.css";

const DIFFICULTY_COLOR = {
  "Dễ": "#34d399",
  "Trung bình": "#fbbf24",
  "Khó": "#f87171",
};

export default function PlayerPage({ roomCode: initialRoomCode }) {
  const [phase, setPhase] = useState("join");   // join|waiting|question|result|finished
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode || "");
  const [room, setRoom] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { isCorrect, points, timeMs }
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [finalRoom, setFinalRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answeredCount, setAnsweredCount] = useState(0);

  const timerRef = useRef(null);
  const playerIdRef = useRef("");
  const roomCodeRef = useRef(roomCode);
  const pingRef = useRef(null);
  const prevQuestionRef = useRef(-1);
  const prevStateRef = useRef("");

  const { particles, triggerConfetti } = useConfetti();
  const { playSound } = useSoundEffects();

  // ── Join room ────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) return;
    setJoining(true);
    setError("");
    try {
      const code = roomCodeInput.toUpperCase().trim();
      const { playerId: pid } = await joinRoom(code, playerName);
      playerIdRef.current = pid;
      roomCodeRef.current = code;
      setPlayerId(pid);
      setRoomCode(code);
      setPhase("waiting");
      playSound("click");

      // Ping keep-alive
      pingRef.current = setInterval(() => {
        pingPlayer(code, pid);
      }, 10_000);
    } catch (e) {
      setError(e.message || "Không thể vào phòng. Kiểm tra mã phòng!");
    } finally {
      setJoining(false);
    }
  };

  // ── Listen to room state ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const unsubRoom = listenRoom(roomCode, (data) => {
      if (!data) return;
      setRoom(data);

      const prevState = prevStateRef.current;
      const prevQ = prevQuestionRef.current;

      // New question started
      if (data.state === "question") {
        const isNewQ = data.currentQuestion !== prevQ;
        if (isNewQ) {
          prevQuestionRef.current = data.currentQuestion;
          setSubmitted(false);
          setUserAnswer("");
          setShowHint(false);
          setLastResult(null);
          setPhase("question");
          startLocalTimer(data.questionStartTime);
          playSound("click");
        } else if (prevState !== "question") {
          setPhase("question");
        }
      }

      // Reveal phase
      if (data.state === "reveal") {
        stopTimer();
        if (prevState !== "reveal") playSound(submitted ? "correct" : "wrong");
        setPhase("result");
      }

      // Game finished
      if (data.state === "finished") {
        stopTimer();
        setFinalRoom(data);
        setPhase("finished");
        triggerConfetti(80);
        playSound("victory");
      }

      prevStateRef.current = data.state;
    });

    const unsubPlayers = listenPlayers(roomCode, (pList) => {
      setPlayers(pList);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      clearInterval(pingRef.current);
    };
  }, [roomCode, playerId]); // eslint-disable-line

  // ── Local timer synced with server start time ─────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startLocalTimer = useCallback((questionStartTime) => {
    stopTimer();
    const update = () => {
      const elapsed = Date.now() - questionStartTime;
      const left = Math.max(0, 60 - Math.floor(elapsed / 1000));
      setTimeLeft(left);
      if (left <= 0) stopTimer();
    };
    update();
    timerRef.current = setInterval(update, 500);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Listen to answers count for current question ──────────────────────────
  useEffect(() => {
    if (!roomCode || room?.currentQuestion === undefined || phase !== "question") return;

    const unsubAnswers = listenAnswers(roomCode, room.currentQuestion, (ans) => {
      setAnsweredCount(Object.keys(ans).length);
    });

    return () => unsubAnswers();
  }, [roomCode, room?.currentQuestion, phase]);

  // ── Submit answer ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!userAnswer.trim() || submitted || !room) return;
    setSubmitted(true);
    stopTimer();

    try {
      const result = await submitAnswer(
        roomCode,
        room.currentQuestion,
        playerId,
        userAnswer,
        quizData[room.currentQuestion].correct,
        room.questionStartTime
      );
      setLastResult(result);
      setTotalScore((s) => s + result.points);
      if (result.isCorrect) {
        triggerConfetti(40);
        playSound("correct");
      } else {
        playSound("wrong");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const currentQuestion = room ? quizData[room.currentQuestion] : null;
  const timePercent = (timeLeft / 60) * 100;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="player-page">
      <Confetti particles={particles} />

      {/* Audio controller widget */}
      <div className="player-audio-wrapper">
        <AudioController 
          isPlayingBgm={phase === "join" || phase === "waiting" || phase === "question" || phase === "result"} 
          isPlayingVictory={phase === "finished"} 
        />
      </div>

      {/* ── JOIN ── */}
      {phase === "join" && (
        <div className="join-screen">
          <div className="join-logo">🤝</div>
          <h1 className="join-title">
            Giải Mã<br />
            <span>Từ Khóa</span>
          </h1>
          <p className="join-subtitle">Liên minh Công – Nông – Trí</p>

          <div className="join-form">
            {!initialRoomCode && (
              <div className="form-group">
                <label>Mã phòng</label>
                <input
                  className="join-input code-input"
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: ABC123"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="form-group">
              <label>Tên của bạn</label>
              <input
                className="join-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nhập tên bạn..."
                maxLength={20}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                autoFocus={!!initialRoomCode}
              />
            </div>

            {error && <div className="join-error">⚠️ {error}</div>}

            <button
              className="join-btn"
              onClick={handleJoin}
              disabled={joining || !playerName.trim() || !roomCodeInput.trim()}
            >
              {joining ? "Đang vào..." : "Tham gia 🚀"}
            </button>
          </div>

          {initialRoomCode && (
            <div className="room-badge">
              Phòng: <strong>{initialRoomCode}</strong>
            </div>
          )}
        </div>
      )}

      {/* ── WAITING ── */}
      {phase === "waiting" && (
        <div className="waiting-screen">
          <div className="waiting-avatar" style={{ background: "#818cf8" }}>
            {playerName[0]?.toUpperCase()}
          </div>
          <h2 className="waiting-name">Xin chào, <span>{playerName}</span>!</h2>
          <p className="waiting-room">Phòng: <strong>{roomCode}</strong></p>

          <div className="waiting-animation">
            <div className="pulse-ring" />
            <div className="pulse-ring pulse-ring-2" />
            <div className="waiting-icon">⏳</div>
          </div>

          <p className="waiting-text">Chờ host bắt đầu trò chơi...</p>
          <p className="waiting-hint">Chuẩn bị sẵn sàng nhé! 💪</p>
        </div>
      )}

      {/* ── QUESTION ── */}
      {phase === "question" && currentQuestion && (
        <div className="player-question-screen">
          {/* Timer bar */}
          <div className="player-timer-bar">
            <div
              className={`player-timer-fill ${timeLeft <= 10 ? "timer-warn" : ""} ${timeLeft <= 5 ? "timer-crit" : ""}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>

          <div className="pq-header">
            <span className="pq-num">Câu {(room?.currentQuestion ?? 0) + 1} / {quizData.length}</span>
            <span
              className="pq-difficulty"
              style={{ color: DIFFICULTY_COLOR[currentQuestion.difficulty] }}
            >
              {currentQuestion.difficulty === "Dễ" ? "🟢" : currentQuestion.difficulty === "Trung bình" ? "🟡" : "🔴"}
              {" "}{currentQuestion.difficulty}
            </span>
            <span className={`pq-timer ${timeLeft <= 5 ? "pq-timer-crit" : ""}`}>
              ⏱ {timeLeft}s
            </span>
          </div>

          <p className="pq-question">{currentQuestion.question}</p>

          {/* Scrambled */}
          <div className="pq-scrambled-box">
            <div className="pq-scrambled-label">🔀 Giải mã từ khóa</div>
            <div className="pq-scrambled">
              {currentQuestion.scrambled.split(" - ").map((part, pi) => (
                <span key={pi} className="pq-word-group">
                  {part.split("").map((ch, ci) => (
                    <span
                      key={ci}
                      className="pq-char"
                      style={{ animationDelay: `${(pi * 6 + ci) * 0.035}s` }}
                    >
                      {ch}
                    </span>
                  ))}
                  {pi < currentQuestion.scrambled.split(" - ").length - 1 && (
                    <span className="pq-sep">–</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="pq-hint">
              💡 Gợi ý: <strong>{currentQuestion.correct.length}</strong> ký tự, bắt đầu bằng <strong>"{currentQuestion.correct[0]}"</strong>
            </div>
          )}

          {/* Answer input */}
          {!submitted ? (
            <div className="pq-answer-wrap">
              <input
                className="pq-input"
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập đáp án..."
                autoFocus
                autoComplete="off"
                disabled={submitted}
              />
              <div className="pq-actions">
                {!showHint && (
                  <button className="pq-hint-btn" onClick={() => setShowHint(true)}>
                    💡 Gợi ý
                  </button>
                )}
                <button
                  className="pq-submit-btn"
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                >
                  Trả lời →
                </button>
              </div>
            </div>
          ) : (
            <div className="pq-submitted">
              <div className="submitted-icon">✅</div>
              <p>Đã nộp: <strong>"{userAnswer}"</strong></p>
              <p className="submitted-hint">Chờ host hiện đáp án...</p>
              {lastResult && (
                <div className={`pq-quick-result ${lastResult.isCorrect ? "qr-correct" : "qr-wrong"}`}>
                  {lastResult.isCorrect ? (
                    <>🎉 Chính xác! +<strong>{lastResult.points}</strong> điểm</>
                  ) : (
                    <>😢 Chưa đúng rồi!</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RESULT (after reveal) ── */}
      {phase === "result" && currentQuestion && (
        <div className="player-result-screen">
          <div className={`result-icon-big ${lastResult?.isCorrect ? "icon-correct" : "icon-wrong"}`}>
            {lastResult?.isCorrect ? "🎉" : "😢"}
          </div>

          <div className="result-feedback">
            {lastResult?.isCorrect ? (
              <h2 className="result-correct-text">Chính xác!</h2>
            ) : (
              <h2 className="result-wrong-text">Chưa đúng!</h2>
            )}
          </div>

          <div className="result-answer-reveal">
            <span className="rar-label">Đáp án đúng:</span>
            <span className="rar-value">{currentQuestion.correct}</span>
          </div>

          {lastResult && (
            <div className={`result-points ${lastResult.isCorrect ? "pts-green" : "pts-red"}`}>
              {lastResult.isCorrect ? `+${lastResult.points} điểm` : "0 điểm"}
            </div>
          )}

          <div className="result-total">
            <span>Tổng điểm của bạn</span>
            <strong>{totalScore}</strong>
          </div>

          <p className="result-waiting">⏳ Chờ host chuyển câu tiếp theo...</p>
        </div>
      )}

      {/* ── FINISHED ── */}
      {phase === "finished" && (
        <div className="player-final-screen">
          <div className="final-header">
            <h1 className="final-title">🏆 Kết Quả Cuối Cùng</h1>
            <p className="final-subtitle">Liên minh Công – Nông – Trí</p>
          </div>

          {/* Podium */}
          {sortedPlayers.length >= 1 && (
            <div className="podium">
              {/* 2nd */}
              {sortedPlayers[1] && (
                <div className="podium-slot podium-2">
                  <div className="podium-avatar" style={{ background: sortedPlayers[1].color }}>
                    {sortedPlayers[1].name[0].toUpperCase()}
                  </div>
                  <div className="podium-name">{sortedPlayers[1].name}</div>
                  <div className="podium-score">{sortedPlayers[1].score} điểm</div>
                  <div className="podium-bar bar-2">🥈</div>
                </div>
              )}
              {/* 1st */}
              <div className="podium-slot podium-1">
                <div className="podium-crown">👑</div>
                <div className="podium-avatar avatar-1" style={{ background: sortedPlayers[0].color }}>
                  {sortedPlayers[0].name[0].toUpperCase()}
                </div>
                <div className="podium-name">{sortedPlayers[0].name}</div>
                <div className="podium-score">{sortedPlayers[0].score} điểm</div>
                <div className="podium-bar bar-1">🥇</div>
              </div>
              {/* 3rd */}
              {sortedPlayers[2] && (
                <div className="podium-slot podium-3">
                  <div className="podium-avatar" style={{ background: sortedPlayers[2].color }}>
                    {sortedPlayers[2].name[0].toUpperCase()}
                  </div>
                  <div className="podium-name">{sortedPlayers[2].name}</div>
                  <div className="podium-score">{sortedPlayers[2].score} điểm</div>
                  <div className="podium-bar bar-3">🥉</div>
                </div>
              )}
            </div>
          )}

          {/* Full ranking */}
          <div className="final-ranking">
            {sortedPlayers.slice(3).map((p, i) => (
              <div
                key={p.id}
                className={`final-rank-row ${p.id === playerId ? "row-self" : ""}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="final-rank-num">#{i + 4}</span>
                <span className="final-rank-dot" style={{ background: p.color }} />
                <span className="final-rank-name">{p.name}</span>
                <span className="final-rank-score">{p.score} điểm</span>
              </div>
            ))}
          </div>

          {/* Prize message */}
          {sortedPlayers[0] && (
            <div className="prize-banner">
              🎁 Xin chúc mừng <strong>{sortedPlayers[0].name}</strong> — người chiến thắng xuất sắc nhất! 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}
