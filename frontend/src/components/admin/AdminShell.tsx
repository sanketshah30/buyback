import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ADMIN_NAV } from '../../lib/adminRights';
import './AdminShell.css';

export function AdminShell() {
  const navigate = useNavigate();
  const { user, hasRight, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-shell__nav">
        <NavLink to="/admin" end className="admin-shell__brand">
          <span className="admin-shell__logo">B</span>
          <span>Buyback Admin</span>
        </NavLink>

        <nav className="admin-shell__sections" aria-label="Admin navigation">
          {ADMIN_NAV.map((section) => {
            const items = section.items.filter((item) => hasRight(item.right));
            if (items.length === 0) return null;
            return (
              <div key={section.key} className="admin-shell__section">
                <h3 className="admin-shell__section-title">{section.title}</h3>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `admin-shell__link ${isActive ? 'admin-shell__link--active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="admin-shell__footer">
          <p className="admin-shell__user">{user?.name ?? user?.mobile ?? 'Admin'}</p>
          <NavLink to="/" className="admin-shell__link">
            Back to app
          </NavLink>
          <button type="button" className="admin-shell__logout" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </aside>

      <main className="admin-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
