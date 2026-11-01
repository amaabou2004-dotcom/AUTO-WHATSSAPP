import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BotMessageSquare,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircleMore,
  MessageSquareReply,
  Plus,
  Send,
  Sparkles,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AutomationRule, Contact, DashboardData, IntegrationSettings } from '../../shared/types';
import { ScheduleModal } from '../components/Forms';
import { Avatar, ErrorState, PageLoader, Toggle } from '../components/UI';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatRelative, formatScheduleDay } from '../lib/format';

const activityIcons: Record<string, LucideIcon> = {
  message_sent: Send,
  message_received: MessageCircleMore,
  schedule_created: CalendarClock,
  rule_triggered: Zap,
  contact_created: UserPlus,
  rule_updated: BotMessageSquare,
};

function WeeklyChart({ data }: { data: DashboardData['chart'] }) {
  const maxValue = Math.max(4, ...data.map((day) => Math.max(day.sent, day.received)));
  const roundedMax = Math.ceil(maxValue / 4) * 4;
  const baseline = 172;
  const chartHeight = 132;

  return (
    <div className="chart-wrap">
      <svg className="weekly-chart" viewBox="0 0 700 220" role="img" aria-label="Messages envoyés et reçus au cours des sept derniers jours">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = baseline - chartHeight * ratio;
          return (
            <g key={ratio}>
              <line x1="44" x2="680" y1={y} y2={y} className="chart-grid-line" />
              <text x="31" y={y + 4} className="chart-axis-label" textAnchor="end">{Math.round(roundedMax * ratio)}</text>
            </g>
          );
        })}
        {data.map((day, index) => {
          const groupX = 63 + index * 90;
          const sentHeight = (day.sent / roundedMax) * chartHeight;
          const receivedHeight = (day.received / roundedMax) * chartHeight;
          return (
            <g key={day.date}>
              <rect x={groupX} y={baseline - sentHeight} width="21" height={Math.max(sentHeight, 2)} rx="6" className="chart-bar-sent">
                <title>{day.label} : {day.sent} messages envoyés</title>
              </rect>
              <rect x={groupX + 25} y={baseline - receivedHeight} width="21" height={Math.max(receivedHeight, 2)} rx="6" className="chart-bar-received">
                <title>{day.label} : {day.received} messages reçus</title>
              </rect>
              <text x={groupX + 23} y="199" textAnchor="middle" className="chart-day-label">{day.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useApi<DashboardData>('/dashboard');
  const { data: contacts } = useApi<Contact[]>('/contacts');
  const { data: settings } = useApi<IntegrationSettings>('/settings');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (loading && !data) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} retry={refresh} />;
  if (!data) return null;

  const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const stats = [
    { label: 'Messages envoyés', value: data.stats.messagesSent, detail: 'Tous vos envois', icon: Send, color: 'green' },
    { label: 'Réponses automatiques', value: data.stats.automaticReplies, detail: 'Par le chatbot', icon: MessageSquareReply, color: 'purple' },
    { label: 'Envois à venir', value: data.stats.activeSchedules, detail: 'Messages en attente', icon: CalendarClock, color: 'orange' },
    { label: 'Automatisations actives', value: data.stats.activeRules, detail: `${data.rules.length} règles au total`, icon: Zap, color: 'blue' },
  ];

  async function toggleRule(rule: AutomationRule) {
    try {
      await api(`/rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify({ active: !rule.active }) });
      showToast(rule.active ? `« ${rule.name} » est en pause.` : `« ${rule.name} » est activée.`);
      refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'La règle n’a pas pu être modifiée.', 'error');
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <div className="page-eyebrow">{dateLabel}</div>
          <h1>Bonjour, Néma <span className="wave">👋</span></h1>
          <p>Vos conversations avancent bien. Voici ce qui se passe aujourd’hui.</p>
        </div>
        <div className="page-actions">
          <button className="button button-secondary" onClick={() => navigate('/chatbot')}><BotMessageSquare size={18} />Tester le chatbot</button>
          <button className="button button-primary" onClick={() => setScheduleOpen(true)}><Plus size={18} />Programmer un message</button>
        </div>
      </div>

      {settings?.mode === 'demo' && (
        <div className="demo-banner">
          <span className="demo-banner-icon"><Sparkles size={19} /></span>
          <div><strong>Votre espace est en mode démo.</strong><span> Explorez librement : les envois sont simulés, aucun message réel ne part.</span></div>
          <Link to="/settings">Connecter WhatsApp <ArrowUpRight size={16} /></Link>
        </div>
      )}

      <section className="stats-grid" aria-label="Indicateurs clés">
        {stats.map(({ label, value, detail, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon stat-${color}`}><Icon size={21} strokeWidth={1.9} /></div>
            <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="card chart-card">
          <div className="card-header">
            <div><h2>Activité des messages</h2><p>Vos échanges au cours des 7 derniers jours</p></div>
            <div className="chart-legend"><span><i className="legend-sent" />Envoyés</span><span><i className="legend-received" />Reçus</span></div>
          </div>
          <WeeklyChart data={data.chart} />
        </article>

        <article className="card upcoming-card">
          <div className="card-header">
            <div><h2>Prochains envois</h2><p>Votre file d’attente</p></div>
            <Link className="card-header-link" to="/schedules" aria-label="Voir tous les messages programmés"><ArrowUpRight size={18} /></Link>
          </div>
          <div className="upcoming-list">
            {data.upcoming.length === 0 && <div className="mini-empty"><Clock3 size={24} /><p>Aucun envoi en attente.</p></div>}
            {data.upcoming.map((schedule) => (
              <div className="upcoming-item" key={schedule.id}>
                <Avatar name={schedule.contact?.name ?? 'Contact supprimé'} />
                <div className="upcoming-copy">
                  <div><strong>{schedule.contact?.name ?? 'Contact supprimé'}</strong><span>{formatScheduleDay(schedule.scheduledFor)}</span></div>
                  <p>{schedule.message}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="upcoming-add" onClick={() => setScheduleOpen(true)}><Plus size={16} />Ajouter un message</button>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="card automation-overview">
          <div className="card-header">
            <div><h2>Vos automatisations</h2><p>Le chatbot veille sur vos conversations</p></div>
            <Link className="text-link" to="/chatbot">Tout gérer <ChevronRight size={16} /></Link>
          </div>
          <div className="automation-list">
            {data.rules.slice(0, 3).map((rule) => (
              <div className="automation-row" key={rule.id}>
                <span className={`automation-icon ${rule.active ? '' : 'inactive'}`}><BotMessageSquare size={19} /></span>
                <div className="automation-copy"><strong>{rule.name}</strong><span>Mot-clé : <b>{rule.trigger}</b> · {rule.triggerCount} déclenchements</span></div>
                <Toggle checked={rule.active} onChange={() => toggleRule(rule)} label={`${rule.active ? 'Désactiver' : 'Activer'} ${rule.name}`} />
              </div>
            ))}
          </div>
        </article>

        <article className="card activity-card">
          <div className="card-header"><div><h2>Activité récente</h2><p>Les dernières nouvelles de votre espace</p></div><CheckCircle2 size={19} className="muted-icon" /></div>
          <div className="activity-list">
            {data.activities.slice(0, 4).map((activity) => {
              const Icon = activityIcons[activity.kind] ?? Zap;
              return (
                <div className="activity-row" key={activity.id}>
                  <span className={`activity-icon activity-${activity.kind}`}><Icon size={16} /></span>
                  <div><strong>{activity.title}</strong><p>{activity.description}</p><small>{formatRelative(activity.createdAt)}</small></div>
                </div>
              );
            })}
          </div>
          <Link to="/history" className="activity-footer">Voir tout l’historique <ArrowRight size={15} /></Link>
        </article>
      </section>

      {scheduleOpen && <ScheduleModal contacts={contacts ?? []} onClose={() => setScheduleOpen(false)} onSaved={() => { showToast('Votre message est bien programmé.'); refresh(); }} />}
    </div>
  );
}
