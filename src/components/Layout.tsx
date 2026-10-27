import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { team, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-amber-500 text-slate-950 font-semibold"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-400"
            >
              <span>Log Pose Console</span>
              {team && (
                <span className="hidden rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 sm:inline-block">
                  {team.code}
                </span>
              )}
            </NavLink>

            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navegación principal">
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/wanted" className={navLinkClass}>
                Se Busca
              </NavLink>
              <NavLink to="/news" className={navLinkClass}>
                News Coo
              </NavLink>
              <NavLink to="/sagas" className={navLinkClass}>
                Poneglyph
              </NavLink>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export default Layout;
