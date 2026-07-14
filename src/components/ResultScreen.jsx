import "./ResultScreen.css";

export default function ResultScreen({ score, totalQuestions, answers, questions, onRestart }) {
  const percent = Math.round((score / totalQuestions) * 100);

  const getGrade = () => {
    if (percent === 100) return { emoji: "🏆", text: "XUẤT SẮC!", color: "#fbbf24" };
    if (percent >= 80) return { emoji: "🌟", text: "GIỎI!", color: "#34d399" };
    if (percent >= 60) return { emoji: "👍", text: "KHÁ!", color: "#60a5fa" };
    if (percent >= 40) return { emoji: "📖", text: "CẦN CỐ GẮNG!", color: "#f59e0b" };
    return { emoji: "💪", text: "TIẾP TỤC HỌC!", color: "#f87171" };
  };

  const grade = getGrade();

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="result-screen">
      <div className="result-card">
        <div className="result-header">
          <div className="result-badge">🎮 KẾT QUẢ TRÒ CHƠI</div>
          <h2 className="result-title">Hoàn thành!</h2>
        </div>

        {/* Score circle */}
        <div className="score-circle-wrap">
          <svg className="score-circle-svg" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={grade.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="score-circle-progress"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="score-circle-content">
            <span className="score-circle-emoji">{grade.emoji}</span>
            <span className="score-circle-percent">{percent}%</span>
            <span className="score-circle-count">
              {score}/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="grade-text" style={{ color: grade.color }}>
          {grade.text}
        </div>

        {/* Stats */}
        <div className="result-stats">
          <div className="stat-item stat-correct">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{score}</span>
            <span className="stat-label">Đúng</span>
          </div>
          <div className="stat-item stat-wrong">
            <span className="stat-icon">❌</span>
            <span className="stat-value">{totalQuestions - score}</span>
            <span className="stat-label">Sai</span>
          </div>
          <div className="stat-item stat-total">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{totalQuestions}</span>
            <span className="stat-label">Tổng</span>
          </div>
        </div>

        {/* Detailed results */}
        <div className="result-details">
          <h3 className="details-title">📋 Chi tiết đáp án</h3>
          <div className="details-list">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={`detail-item ${answers[index]?.isCorrect ? "detail-correct" : "detail-wrong"}`}
              >
                <div className="detail-header">
                  <span className="detail-number">Câu {index + 1}</span>
                  <span className="detail-status">
                    {answers[index]?.isCorrect ? "✅" : "❌"}
                  </span>
                </div>
                <p className="detail-question">{q.question}</p>
                <div className="detail-answers">
                  {answers[index]?.userAnswer && (
                    <div className={`detail-answer ${answers[index]?.isCorrect ? "answer-right" : "answer-wrong"}`}>
                      <span className="answer-label">Bạn trả lời:</span>
                      <span className="answer-value">{answers[index].userAnswer}</span>
                    </div>
                  )}
                  <div className="detail-answer answer-correct">
                    <span className="answer-label">Đáp án:</span>
                    <span className="answer-value">{q.correct}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button className="restart-btn" onClick={onRestart}>
            <span>🔄</span> Chơi lại
          </button>
        </div>
      </div>
    </div>
  );
}
