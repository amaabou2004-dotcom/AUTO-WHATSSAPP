import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BotMessageSquare,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../components/Auth';
import { PageLoader } from '../components/UI';
import '../login.css';

export default function Login() {
  const { user, loading, error: authError, demoMode, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/app') ? requestedPath : '/app';

  useEffect(() => {
    document.title = 'Connexion · AutoWhatsApp';
  }, []);

  useEffect(() => {
    if (demoMode) {
      setEmail('admin@demo.local');
      setPassword('demo1234');
    }
  }, [demoMode]);

  if (loading) return <PageLoader />;
  if (user) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La connexion a échoué. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-showcase">
        <Link to="/" className="login-brand"><span><MessageSquareText size={22} /><Zap size={11} fill="currentColor" /></span>Auto<b>WhatsApp</b></Link>
        <div className="login-showcase-content">
          <div className="login-eyebrow"><ShieldCheck size={15} />VOTRE ESPACE, EN TOUTE CONFIANCE</div>
          <h1>Vos conversations vous attendent.</h1>
          <p>Retrouvez vos messages, vos contacts et vos automatisations exactement là où vous les avez laissés.</p>
          <div className="login-benefits">
            <span><CheckCircle2 size={17} />Sessions signées et expiration automatique</span>
            <span><CheckCircle2 size={17} />Accès à votre espace protégé</span>
            <span><CheckCircle2 size={17} />Vos automatisations toujours sous contrôle</span>
          </div>
          <div className="login-preview-card">
            <div><span className="login-preview-icon"><BotMessageSquare size={18} /></span><p><strong>Le chatbot est prêt</strong><small>Vos règles continuent de veiller.</small></p><i /></div>
            <div><span className="login-preview-icon orange"><CalendarClock size={18} /></span><p><strong>Vos envois sont planifiés</strong><small>Tout reprend dès votre connexion.</small></p><CheckCircle2 size={16} /></div>
          </div>
        </div>
        <p className="login-showcase-footer">Vos conversations, en autopilote.<br />Votre relation client, toujours humaine.</p>
      </aside>

      <main className="login-main">
        <Link to="/" className="login-back"><ArrowLeft size={16} />Retour au site</Link>
        <div className="login-mobile-brand"><MessageSquareText size={20} /><span>AutoWhatsApp</span></div>
        <section className="login-form-section">
          <div className="login-form-heading">
            <span className="login-lock"><LockKeyhole size={22} /></span>
            <div className="login-form-eyebrow">ACCÈS À VOTRE ESPACE</div>
            <h2>Ravi de vous revoir.</h2>
            <p>Connectez-vous pour accéder à votre tableau de bord.</p>
          </div>

          {demoMode && <div className="login-demo-note"><Sparkles size={18} /><div><strong>Mode démo</strong><span>Les identifiants sont déjà remplis. Cliquez simplement sur « Se connecter ».</span></div></div>}
          {authError && <div className="login-error" role="alert">{authError}</div>}

          <form onSubmit={submit} className="login-form">
            <label><span>Adresse e-mail</span><div className="login-input"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" autoComplete="username" required autoFocus /></div></label>
            <label><span>Mot de passe</span><div className="login-input"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="login-submit" type="submit" disabled={submitting || Boolean(authError)}>{submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{submitting ? 'Connexion en cours…' : 'Se connecter'}</button>
          </form>

          <div className="login-security"><ShieldCheck size={15} /><span>Votre session est sécurisée et expire automatiquement pour protéger votre espace.</span></div>
          <p className="login-help">Un souci de connexion ?<br />Vérifiez vos identifiants ou contactez l’administrateur de votre espace.</p>
        </section>
        <div className="login-main-footer"><span>© {new Date().getFullYear()} AutoWhatsApp</span><span>Connexion sécurisée</span></div>
      </main>
    </div>
  );
}
