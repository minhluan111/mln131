import { useEffect, useRef } from "react";
import "./Confetti.css";

export default function Confetti({ particles }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!particles.length) return;

    const container = containerRef.current;
    if (!container) return;

    // Clear previous particles
    container.innerHTML = "";

    particles.forEach((p) => {
      const el = document.createElement("div");
      el.className = `confetti-particle confetti-${p.shape}`;
      el.style.left = `${p.x}%`;
      el.style.backgroundColor = p.color;
      el.style.width = `${p.size}px`;
      el.style.height = p.shape === "rect" ? `${p.size * 1.5}px` : `${p.size}px`;
      el.style.setProperty("--tx", `${p.speedX * 80}px`);
      el.style.setProperty("--rot", `${p.rotation + p.rotationSpeed * 50}deg`);
      el.style.animationDuration = `${2 + Math.random()}s`;
      el.style.animationDelay = `${Math.random() * 0.3}s`;
      container.appendChild(el);
    });
  }, [particles]);

  if (!particles.length) return null;

  return <div ref={containerRef} className="confetti-container" />;
}
