import "./HomePage.css";

export default function HomePage() {
  const goHost = () => {
    window.location.href = "/?mode=host";
  };

  return (
    <div className="home-page">
      <div className="home-bg-shapes">
        <div className="bg-shape bg-1" />
        <div className="bg-shape bg-2" />
        <div className="bg-shape bg-3" />
      </div>

      <div className="home-content">
        <div className="home-hero">
          <div className="hero-emoji">🏛️</div>
          <h1 className="hero-title">
            Trò Chơi<br />
            <span className="hero-accent">Giải Mã Đáp Án</span>
          </h1>
          <p className="hero-desc">
            Liên minh Công – Nông – Trí<br />
            trong công cuộc Công nghiệp hóa, Hiện đại hóa
          </p>
        </div>

        <div className="home-cards">
          {/* Host card */}
          <div className="mode-card card-host" onClick={goHost}>
            <div className="card-icon">📺</div>
            <h2>Tôi là Host</h2>
            <p>Chiếu lên màn hình, quản lý trò chơi và xem kết quả</p>
            <div className="card-tag">Dành cho giáo viên</div>
            <div className="card-arrow">→</div>
          </div>

          {/* Join card — needs room code */}
          <div className="mode-card card-join">
            <div className="card-icon">📱</div>
            <h2>Tôi là Người chơi</h2>
            <p>Nhập link hoặc mã phòng mà host chia sẻ để tham gia</p>
            <div className="join-example">
              Ví dụ: <code>yourdomain.com/?room=ABC123</code>
            </div>
            <div className="card-tag">Dành cho học sinh</div>
          </div>
        </div>

        <div className="home-features">
          <div className="feature">⚡ Real-time</div>
          <div className="feature">🏆 Bảng xếp hạng</div>
          <div className="feature">📱 Mobile-friendly</div>
          <div className="feature">🎉 Confetti & Âm thanh</div>
        </div>
      </div>
    </div>
  );
}
