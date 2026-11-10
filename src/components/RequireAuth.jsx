import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-5xl">⏳</div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="card space-y-4 p-5 text-center">
          <div className="text-4xl">🔥</div>
          <p>Loading your profile..</p>
          <button className="btn" onClick={signOut}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return children;
}
