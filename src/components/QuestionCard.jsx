import "./QuestionCard.css";

export default function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
  timeLeft,
  userAnswer,
  setUserAnswer,
  onSubmit,
  feedback,
  onNext,
  showHint,
  onHint,
}) {
  const timePercent = (timeLeft / 60) * 100;
  const isTimeLow = timeLeft <= 10;
  const isTimeCritical = timeLeft <= 5;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && userAnswer.trim() && !feedback) {
      onSubmit();
    }
  };

  return (
    <div className={`question-card ${feedback ? `feedback-${feedback}` : ""}`}>
      {/* Header */}
      <div className="card-header">
        <div className="question-counter">
          <span className="counter-current">{currentIndex + 1}</span>
          <span className="counter-sep">/</span>
          <span className="counter-total">{totalQuestions}</span>
        </div>

        <div className={`timer ${isTimeLow ? "timer-low" : ""} ${isTimeCritical ? "timer-critical" : ""}`}>
          <div className="timer-icon">⏱️</div>
          <div className="timer-bar-wrap">
            <div
              className="timer-bar"
              style={{ width: `${timePercent}%` }}
            ></div>
          </div>
          <span className="timer-value">{timeLeft}s</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="progress-dots">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <div
            key={i}
            className={`dot ${i === currentIndex ? "dot-active" : ""} ${i < currentIndex ? "dot-done" : ""}`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="question-body">
        <div className="question-label">Câu hỏi</div>
        <p className="question-text">{question.question}</p>
      </div>

      {/* Scrambled word */}
      <div className="scrambled-section">
        <div className="scrambled-label">
          <span className="label-icon">🔀</span>
          Từ khóa bị xáo trộn
        </div>
        <div className="scrambled-word">
          {question.scrambled.split(" - ").map((part, i) => (
            <span key={i} className="scrambled-part">
              {part.split("").map((char, j) => (
                <span
                  key={j}
                  className="scrambled-char"
                  style={{ animationDelay: `${(i * 5 + j) * 0.05}s` }}
                >
                  {char}
                </span>
              ))}
              {i < question.scrambled.split(" - ").length - 1 && (
                <span className="scrambled-sep">–</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Hint */}
      {showHint && (
        <div className="hint-box">
          <span className="hint-icon">💡</span>
          <span>
            Gợi ý: Từ có <strong>{question.correct.length}</strong> ký tự, bắt
            đầu bằng "<strong>{question.correct[0]}</strong>"
          </span>
        </div>
      )}

      {/* Input area */}
      {!feedback && (
        <div className="answer-section">
          <div className="input-wrap">
            <input
              type="text"
              className="answer-input"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập đáp án của bạn..."
              autoFocus
              autoComplete="off"
            />
            <div className="input-border-glow"></div>
          </div>

          <div className="action-buttons">
            {!showHint && (
              <button className="hint-btn" onClick={onHint}>
                <span>💡</span> Gợi ý
              </button>
            )}
            <button
              className="submit-btn"
              onClick={onSubmit}
              disabled={!userAnswer.trim()}
            >
              <span>Trả lời</span>
              <span className="submit-arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`feedback-section feedback-${feedback}`}>
          <div className="feedback-icon">
            {feedback === "correct" ? "🎉" : "😢"}
          </div>
          <div className="feedback-text">
            {feedback === "correct" ? (
              <span>
                Chính xác! Đáp án là{" "}
                <strong>"{question.correct}"</strong>
              </span>
            ) : (
              <span>
                Chưa đúng! Đáp án đúng là{" "}
                <strong>"{question.correct}"</strong>
              </span>
            )}
          </div>
          <button className="next-btn" onClick={onNext}>
            {currentIndex < totalQuestions - 1 ? (
              <>
                Câu tiếp theo <span>→</span>
              </>
            ) : (
              <>
                Xem kết quả <span>🏆</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
