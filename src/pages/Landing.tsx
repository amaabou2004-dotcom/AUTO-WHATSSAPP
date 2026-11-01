import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BotMessageSquare,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Menu,
  MessageCircleMore,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import '../landing.css';

const chartBars = [38, 58, 45, 72, 54, 82, 66];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    document.title = 'AutoWhatsApp — Vos conversations, en autopilote';
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <Link to="/" className="landing-brand" onClick={closeMenu} aria-label="AutoWhatsApp, accueil">
            <span className="landing-brand-mark"><MessageSquareText size={22} /><Zap size={11} fill="currentColor" /></span>
            <span>Auto<span>WhatsApp</span></span>
          </Link>
          <nav className={`landing-links ${menuOpen ? 'landing-links-open' : ''}`} aria-label="Navigation du site">
            <a href="#features" onClick={closeMenu}>Fonctionnalités</a>
            <a href="#how-it-works" onClick={closeMenu}>Comment ça marche</a>
            <a href="#faq" onClick={closeMenu}>Questions fréquentes</a>
            <Link to="/app" className="landing-mobile-cta" onClick={closeMenu}>Ouvrir la démo <ArrowRight size={16} /></Link>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/app" className="landing-login">Ouvrir mon espace</Link>
            <Link to="/app" className="landing-button landing-button-small">Voir la démo <ArrowUpRight size={15} /></Link>
          </div>
          <button className="landing-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow"><Sparkles size={14} />L’automatisation qui reste humaine</div>
              <h1>Moins de messages répétitifs.<br /><span>Plus de temps pour vos clients.</span></h1>
              <p>Programmez vos envois, répondez instantanément aux questions fréquentes et gardez chaque conversation sous contrôle, depuis un seul espace.</p>
              <div className="hero-actions">
                <Link to="/app" className="landing-button landing-button-primary">Explorer le tableau de bord <ArrowRight size={17} /></Link>
                <a href="#features" className="landing-button landing-button-ghost">Découvrir la solution <ChevronDown size={17} /></a>
              </div>
              <div className="hero-assurances">
                <span><Check size={14} />Mode démo inclus</span>
                <span><Check size={14} />API WhatsApp officielle</span>
                <span><Check size={14} />Aucune carte requise</span>
              </div>
            </div>

            <div className="hero-visual" role="img" aria-label="Aperçu du tableau de bord AutoWhatsApp">
              <div className="product-window">
                <div className="product-window-top">
                  <div className="window-dots"><i /><i /><i /></div>
                  <span>Espace de travail</span>
                  <span className="window-demo"><i />DÉMO</span>
                </div>
                <div className="product-window-body">
                  <div className="preview-sidebar">
                    <span className="preview-logo"><MessageSquareText size={15} /></span>
                    <i className="active" /><i /><i /><i />
                    <b />
                  </div>
                  <div className="preview-content">
                    <div className="preview-greeting"><div><small>VUE D’ENSEMBLE</small><strong>Bonjour, Néma 👋</strong></div><span><Plus size={10} />Programmer</span></div>
                    <div className="preview-stats">
                      <div><span className="preview-stat-icon green"><Send size={11} /></span><small>Messages envoyés</small><strong>128</strong><i>+12%</i></div>
                      <div><span className="preview-stat-icon purple"><BotMessageSquare size={11} /></span><small>Réponses auto</small><strong>64</strong><i>Actif</i></div>
                      <div><span className="preview-stat-icon orange"><CalendarClock size={11} /></span><small>À venir</small><strong>08</strong><i>Planifié</i></div>
                    </div>
                    <div className="preview-panels">
                      <div className="preview-chart">
                        <div><strong>Activité des messages</strong><small>7 derniers jours</small></div>
                        <div className="preview-bars">
                          {chartBars.map((height, index) => <span key={index} style={{ height: `${height}%` }}><i /></span>)}
                        </div>
                        <div className="preview-days"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>
                      </div>
                      <div className="preview-next">
                        <strong>Prochains envois</strong>
                        <div><span>AM</span><p><b>Amina</b><small>Aujourd’hui, 14:30</small></p></div>
                        <div><span>MI</span><p><b>Moussa</b><small>Demain, 09:00</small></p></div>
                        <div><span>FD</span><p><b>Fatou</b><small>Vendredi, 11:15</small></p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-chat">
                <span className="floating-chat-icon"><BotMessageSquare size={19} /></span>
                <div><strong>Chatbot <span><i />en ligne</span></strong><p>« Vos horaires ? »</p><small>Réponse automatique envoyée <CheckCircle2 size={11} /></small></div>
              </div>
              <div className="floating-schedule"><span><Clock3 size={16} /></span><div><strong>Message programmé</strong><small>Demain, à 09:30</small></div><CheckCircle2 size={16} /></div>
            </div>
          </div>
          <div className="landing-container hero-audience">
            <span>Une solution pensée pour</span>
            <div><span><MessageCircleMore size={15} />Les commerces</span><span><UsersRound size={15} />Les services clients</span><span><BarChart3 size={15} />Les équipes indépendantes</span></div>
          </div>
        </section>

        <section className="landing-section features-section" id="features">
          <div className="landing-container">
            <div className="section-heading-landing">
              <div className="landing-eyebrow">FONCTIONNALITÉS ESSENTIELLES</div>
              <h2>Tout ce qu’il vous faut.<br /><span>Rien de superflu.</span></h2>
              <p>Des outils simples pour automatiser les tâches répétitives, sans perdre le fil de vos relations clients.</p>
            </div>
            <div className="feature-cards">
              <article className="feature-card feature-schedule">
                <div className="feature-card-top"><span className="feature-icon"><CalendarClock size={24} /></span><span className="feature-number">01</span></div>
                <h3>Vos messages, au bon moment</h3>
                <p>Préparez un rappel, une confirmation ou une campagne. Choisissez l’heure, nous nous chargeons de l’envoi.</p>
                <div className="feature-mini-schedule">
                  <div><span>AM</span><p><strong>Rappel de rendez-vous</strong><small>Amina · Demain, 09:30</small></p><CheckCircle2 size={16} /></div>
                  <div className="mini-schedule-line"><span /><small>Répéter chaque semaine</small></div>
                </div>
                <Link to="/app/schedules">Découvrir la planification <ArrowUpRight size={16} /></Link>
              </article>

              <article className="feature-card feature-bot">
                <div className="feature-card-top"><span className="feature-icon"><BotMessageSquare size={24} /></span><span className="feature-number">02</span></div>
                <h3>Des réponses, même en votre absence</h3>
                <p>Créez vos propres règles pour répondre aux questions récurrentes, tout en gardant la main sur chaque automatisation.</p>
                <div className="feature-mini-chat">
                  <p className="mini-user-message">Quels sont vos horaires ?</p>
                  <p className="mini-bot-message">Nous sommes ouverts du lundi au samedi, de 9h à 18h. À très vite !</p>
                  <small><Zap size={11} />Règle « Horaires » déclenchée</small>
                </div>
                <Link to="/app/chatbot">Tester le chatbot <ArrowUpRight size={16} /></Link>
              </article>

              <article className="feature-card feature-contacts">
                <div className="feature-card-top"><span className="feature-icon"><UsersRound size={24} /></span><span className="feature-number">03</span></div>
                <h3>Chaque contact, bien suivi</h3>
                <p>Centralisez vos contacts, leurs préférences et votre historique d’échanges pour une relation plus attentive.</p>
                <div className="feature-mini-contacts">
                  <div className="mini-avatars"><span>AM</span><span>MI</span><span>FD</span><span>IS</span><span>+8</span></div>
                  <div><strong>Votre audience, organisée</strong><small><span />Consentements et étiquettes à jour</small></div>
                </div>
                <Link to="/app/contacts">Voir les contacts <ArrowUpRight size={16} /></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section how-section" id="how-it-works">
          <div className="landing-container how-grid">
            <div className="how-copy">
              <div className="landing-eyebrow light">SIMPLE PAR CONCEPTION</div>
              <h2>Vous définissez les règles.<br /><span>La suite devient naturelle.</span></h2>
              <p>Pas besoin d’être développeur. Votre espace vous guide avec des exemples concrets et un mode démo pour tester chaque scénario.</p>
              <Link to="/app" className="landing-button landing-button-light">Commencer avec la démo <ArrowRight size={17} /></Link>
            </div>
            <div className="how-steps">
              <div className="how-step"><span>01</span><div><h3>Ajoutez vos contacts</h3><p>Enregistrez leurs numéros, leurs étiquettes et leur consentement en toute clarté.</p></div><UsersRound size={22} /></div>
              <div className="how-step"><span>02</span><div><h3>Créez votre scénario</h3><p>Programmez un message ou choisissez le mot-clé qui déclenchera une réponse.</p></div><Zap size={22} /></div>
              <div className="how-step"><span>03</span><div><h3>Suivez les résultats</h3><p>Retrouvez chaque envoi, chaque réponse et chaque interaction dans votre historique.</p></div><BarChart3 size={22} /></div>
            </div>
          </div>
        </section>

        <section className="landing-section control-section">
          <div className="landing-container control-grid">
            <div className="control-card">
              <div className="control-card-header"><span><ShieldCheck size={23} /></span><div><strong>Votre espace reste sous contrôle</strong><small>Toutes les automatisations</small></div><span className="control-live"><i />À jour</span></div>
              <div className="control-rule"><span className="control-rule-icon"><BotMessageSquare size={18} /></span><div><strong>Horaires d’ouverture</strong><small>31 déclenchements</small></div><span className="control-toggle on"><i /></span></div>
              <div className="control-rule"><span className="control-rule-icon"><CalendarClock size={18} /></span><div><strong>Rappel de rendez-vous</strong><small>Prochain envoi demain</small></div><span className="control-toggle on"><i /></span></div>
              <div className="control-rule"><span className="control-rule-icon muted"><MessageCircleMore size={18} /></span><div><strong>Relance hebdomadaire</strong><small>En pause</small></div><span className="control-toggle"><i /></span></div>
              <div className="control-card-footer"><CheckCircle2 size={15} />Vous pouvez tout mettre en pause, à tout moment.</div>
            </div>
            <div className="control-copy">
              <div className="landing-eyebrow">AUTOMATISER SANS DÉHUMANISER</div>
              <h2>La technologie s’efface.<br /><span>La relation reste.</span></h2>
              <p>AutoWhatsApp vous aide sur les tâches répétitives, mais vous laisse toujours décider ce qui part, quand et à qui.</p>
              <ul><li><CheckCircle2 size={18} /><span><strong>Un consentement clair</strong> pour chaque contact.</span></li><li><CheckCircle2 size={18} /><span><strong>Un historique transparent</strong> de chaque message.</span></li><li><CheckCircle2 size={18} /><span><strong>L’API officielle WhatsApp Business</strong> pour les envois réels.</span></li></ul>
            </div>
          </div>
        </section>

        <section className="landing-section faq-section" id="faq">
          <div className="landing-container faq-grid">
            <div className="faq-heading"><div className="landing-eyebrow">QUESTIONS FRÉQUENTES</div><h2>Avant de<br /><span>commencer.</span></h2><p>Les réponses essentielles pour découvrir l’outil en toute confiance.</p></div>
            <div className="faq-list">
              <details open><summary>Puis-je tester sans connecter mon compte WhatsApp ?<Plus size={19} /></summary><p>Oui. Le mode démo est disponible immédiatement. Il simule les envois et les réponses sans transmettre aucun message réel.</p></details>
              <details><summary>Puis-je modifier ou arrêter une automatisation ?<Plus size={19} /></summary><p>À tout moment. Chaque règle peut être mise en pause, modifiée ou supprimée. Un message programmé peut être annulé tant qu’il est en attente.</p></details>
              <details><summary>Comment fonctionne le passage aux vrais envois ?<Plus size={19} /></summary><p>La connexion utilise la WhatsApp Business Cloud API. Les identifiants sont configurés côté serveur et ne sont jamais exposés dans le site public.</p></details>
              <details><summary>Ai-je besoin de compétences techniques ?<Plus size={19} /></summary><p>Non pour utiliser l’interface. La connexion initiale à Meta et l’hébergement sont documentés pas à pas dans le guide fourni avec le projet.</p></details>
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-container final-cta-inner">
            <div className="final-cta-decoration"><MessageSquareText size={170} /></div>
            <div className="landing-eyebrow light">VOTRE PREMIER SCÉNARIO VOUS ATTEND</div>
            <h2>Reprenez du temps.<br />Restez proche de vos clients.</h2>
            <p>Explorez le tableau de bord et testez votre première automatisation en quelques minutes.</p>
            <Link to="/app" className="landing-button landing-button-accent">Ouvrir la démo maintenant <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-main">
          <div><Link to="/" className="landing-brand"><span className="landing-brand-mark"><MessageSquareText size={22} /><Zap size={11} fill="currentColor" /></span><span>Auto<span>WhatsApp</span></span></Link><p>Vos conversations, en autopilote.<br />Votre relation client, toujours humaine.</p></div>
          <div className="footer-links"><div><strong>Produit</strong><a href="#features">Fonctionnalités</a><a href="#how-it-works">Comment ça marche</a><Link to="/app">Ouvrir la démo</Link></div><div><strong>Ressources</strong><a href="#faq">Questions fréquentes</a><Link to="/app/settings">Guide de connexion</Link><span>Documentation incluse</span></div></div>
        </div>
        <div className="landing-container footer-bottom"><span>© {new Date().getFullYear()} AutoWhatsApp. Tous droits réservés.</span><span>Application indépendante utilisant la WhatsApp Business Cloud API.</span></div>
      </footer>
    </div>
  );
}
