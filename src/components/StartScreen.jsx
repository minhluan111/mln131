import "./StartScreen.css";

export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      {/* Floating decorative elements */}
      <div className="floating-shapes">
        <div className="shape shape-1">⚙️</div>
        <div className="shape shape-2">🌾</div>
        <div className="shape shape-3">📚</div>
        <div className="shape shape-4">🏭</div>
        <div className="shape shape-5">🇻🇳</div>
        <div className="shape shape-6">💡</div>
      </div>

      <div className="start-content">
        <div className="start-badge">🎮 TRÒ CHƠI TƯƠNG TÁC</div>

        <h1 className="start-title">
          <span className="title-line">Giải Mã</span>
          <span className="title-line title-accent">Từ Khóa</span>
        </h1>

        <div className="start-topic">
          <div className="topic-icon">🤝</div>
          <h2>Liên minh Công – Nông – Trí</h2>
          <p>trong công cuộc Công nghiệp hóa, Hiện đại hóa ở Việt Nam</p>
        </div>

        <div className="start-rules">
          <div className="rule-item">
            <span className="rule-icon">📝</span>
            <span>10 câu hỏi kiến thức</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🔤</span>
            <span>Giải mã từ bị đảo ngược</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⏱️</span>
            <span>60 giây cho mỗi câu</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⭐</span>
            <span>Ghi điểm và xếp hạng</span>
          </div>
        </div>

        <button className="start-btn" onClick={onStart}>
          <span className="btn-text">BẮT ĐẦU CHƠI</span>
          <span className="btn-icon">🚀</span>
          <div className="btn-glow"></div>
        </button>

        <p className="start-footer">Nhấn nút để bắt đầu trò chơi</p>
      </div>
    </div>
  );
}
