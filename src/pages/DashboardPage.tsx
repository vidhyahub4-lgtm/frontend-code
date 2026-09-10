import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <p className="text-sm font-medium text-marigold-dark">Signed in</p>
      <h1 className="mt-1 font-display text-3xl text-ink">
        Welcome{user ? `, ${user.firstname}` : ""}
      </h1>
      <p className="mt-2 text-ink-soft max-w-md">
        Use the sidebar to navigate to admissions, student records, and
        school settings.
      </p>
    </div>
  );
}

export default DashboardPage;
