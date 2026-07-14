import { useEffect, useRef, useState } from "react";
import "./AudioController.css";

export default function AudioController({ isPlayingBgm, isPlayingVictory }) {
  const bgmRef = useRef(null);
  const victoryRef = useRef(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // Set volumes
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = isMuted ? 0 : volume;
    if (victoryRef.current) victoryRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle BGM playback
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (isPlayingBgm && !isPlayingVictory) {
      bgm.play().catch(() => {
        // Autoplay blocked: will play on first user interaction
      });
    } else {
      bgm.pause();
    }
  }, [isPlayingBgm, isPlayingVictory]);

  // Handle Victory playback
  useEffect(() => {
    const victory = victoryRef.current;
    if (!victory) return;

    if (isPlayingVictory) {
      victory.play().catch(() => {});
    } else {
      victory.pause();
      victory.currentTime = 0;
    }
  }, [isPlayingVictory]);

  // Try playing audio on first user click or touch anywhere (to bypass autoplay block on mobile)
  useEffect(() => {
    const startAudio = () => {
      if (isPlayingBgm && !isPlayingVictory && bgmRef.current) {
        bgmRef.current.play().catch(() => {});
      }
      if (isPlayingVictory && victoryRef.current) {
        victoryRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", startAudio);
    window.addEventListener("touchstart", startAudio, { passive: true });
    return () => {
      window.removeEventListener("click", startAudio);
      window.removeEventListener("touchstart", startAudio);
    };
  }, [isPlayingBgm, isPlayingVictory]);

  return (
    <div className="audio-controller">
      <audio ref={bgmRef} src="/bgm.mp3" loop />
      <audio ref={victoryRef} src="/victory.mp3" />
      <div className="audio-control-panel">
        <button className="audio-mute-btn" onClick={() => setIsMuted(!isMuted)}>
          {isMuted || volume === 0 ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="audio-volume-slider"
        />
        <span className="audio-volume-percent">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
