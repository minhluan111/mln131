import "./ScoreBoard.css";

export default function ScoreBoard({ score, totalQuestions }) {
  return (
    <div className="scoreboard">
      <div className="score-icon">⭐</div>
      <div className="score-info">
        <span className="score-value">{score}</span>
        <span className="score-label">/{totalQuestions}</span>
      </div>
    </div>
  );
}
