import "./App.css";
import HomePage from "./pages/HomePage";
import HostPage from "./pages/HostPage";
import PlayerPage from "./pages/PlayerPage";

/**
 * Simple URL-param based routing:
 *   /?mode=host           → HostPage
 *   /?room=ABCDEF         → PlayerPage (pre-filled room code)
 *   /                     → HomePage
 */
function getRoute() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const room = params.get("room");

  if (mode === "host") return { page: "host" };
  if (room) return { page: "player", roomCode: room.toUpperCase() };
  return { page: "home" };
}

export default function App() {
  const route = getRoute();

  return (
    <div className="app-root">
      {route.page === "home" && <HomePage />}
      {route.page === "host" && <HostPage />}
      {route.page === "player" && <PlayerPage roomCode={route.roomCode} />}
    </div>
  );
}
