import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ADMIN_NAV } from '../../lib/adminRights';
import './AdminHubPage.css';

export function AdminHubPage() {
  const navigate = useNavigate();
  const { hasRight, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-hub">
      <div className="admin-hub__header">
        <div>
          <h1>Admin portal</h1>
          <p>Onboard products and partners, and configure how buybacks are valued.</p>
        </div>
        <div className="admin-hub__actions">
          <Link to="/" className="admin-hub__link">
            Back to app
          </Link>
          <button type="button" className="admin-hub__logout" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </div>

      <div className="admin-hub__grid">
        {ADMIN_NAV.map((section) => {
          const items = section.items.filter((item) => hasRight(item.right));
          return (
            <section key={section.key} className={`admin-hub__card ${items.length === 0 ? 'admin-hub__card--locked' : ''}`}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              {items.length > 0 ? (
                <ul>
                  {items.map((item) => (
                    <li key={item.path}>
                      <Link to={item.path}>{item.label} →</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-hub__locked">You don't have access to this area.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
