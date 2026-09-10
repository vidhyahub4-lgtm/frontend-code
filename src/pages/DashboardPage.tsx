import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm font-medium text-marigold-dark">Signed in</p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Welcome{user ? `, ${user.firstname}` : ""} to VidyaHub
        </h1>
        <p className="mt-3 text-ink-soft max-w-sm mx-auto">
          The dashboard is coming next — this is a placeholder screen for now.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-chalk"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
