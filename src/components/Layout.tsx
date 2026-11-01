import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BotMessageSquare,
  CalendarClock,
  ChevronRight,
  History,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import type { IntegrationSettings } from '../../shared/types';
import { useApi } from '../hooks/useApi';
import { useAuth } from './Auth';

const navigation = [
  { to: '/app', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
  { to: '/app/schedules', label: 'Messages programmés', icon: CalendarClock },
  { to: '/app/chatbot', label: 'Chatbot', icon: BotMessageSquare },
  { to: '/app/contacts', label: 'Contacts', icon: UsersRound },
  { to: '/app/history', label: 'Historique', icon: History },
];

const pageTitles: Record<string, string> = {
  '/app': 'Vue d’ensemble',
  '/app/schedules': 'Messages programmés',
  '/app/chatbot': 'Chatbot',
  '/app/contacts': 'Contacts',
  '/app/history': 'Historique des messages',
  '/app/settings': 'Paramètres',
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: settings } = useApi<IntegrationSettings>('/settings');

  useEffect(() => {
    setMobileOpen(false);
    document.title = `${pageTitles[location.pathname] || 'Espace de travail'} · AutoWhatsApp`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-overlay" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <Link to="/app" className="brand" aria-label="AutoWhatsApp, tableau de bord">
            <span className="brand-mark"><MessageSquareText size={23} strokeWidth={2.2} /><Zap className="brand-zap" size={12} fill="currentColor" /></span>
            <span>Auto<span>WhatsApp</span></span>
          </Link>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fermer"><X size={20} /></button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">N</span>
          <span><strong>Néma Studio</strong><small>Espace principal</small></span>
          <ChevronRight size={16} />
        </div>

        <nav className="main-nav" aria-label="Navigation principale">
          <div className="nav-section-label">VOTRE ESPACE</div>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="nav-section-label nav-section-second">CONFIGURATION</div>
          <NavLink to="/app/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={19} strokeWidth={1.9} />
            <span>Paramètres</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Zap size={17} /></span>
            <strong>Gagnez du temps, chaque jour.</strong>
            <p>Laissez les automatisations s’occuper des messages répétitifs.</p>
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">NS</span>
            <span><strong>Néma Studio</strong><small>Administrateur</small></span>
            <button className="logout-button" onClick={() => { logout(); navigate('/login'); }} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu size={21} /></button>
            <span className="breadcrumb-root">Néma Studio</span>
            <ChevronRight size={14} className="breadcrumb-chevron" />
            <strong>{pageTitles[location.pathname] || 'AutoWhatsApp'}</strong>
          </div>
          <div className="topbar-right">
            <Link to="/" className="public-site-link" title="Voir le site public"><Globe2 size={17} /><span>Site public</span></Link>
            <Link to="/app/settings" className={`connection-pill ${settings?.mode === 'live' ? 'live' : ''}`}>
              <span className="connection-dot" />
              {settings?.mode === 'live' ? 'WhatsApp connecté' : 'Mode démo'}
            </Link>
            <span className="topbar-divider" />
            <span className="topbar-user">NS</span>
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}
