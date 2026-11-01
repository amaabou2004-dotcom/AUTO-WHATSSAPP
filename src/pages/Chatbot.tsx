import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BotMessageSquare,
  Braces,
  CornerDownLeft,
  Edit3,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import type { AutomationRule, ChatbotTestResult } from '../../shared/types';
import { ConfirmDialog, RuleModal } from '../components/Forms';
import { useToast } from '../components/Toast';
import { EmptyState, ErrorState, PageHeader, PageLoader, Toggle } from '../components/UI';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatRelative } from '../lib/format';

const matchLabels = { contains: 'contient', exact: 'est exactement', starts_with: 'commence par' };
interface ChatMessage { id: number; from: 'user' | 'bot'; text: string }

export default function Chatbot() {
  const { data: rules, loading, error, refresh } = useApi<AutomationRule[]>('/rules');
  const [ruleModal, setRuleModal] = useState<{ open: boolean; rule: AutomationRule | null }>({ open: false, rule: null });
  const [toDelete, setToDelete] = useState<AutomationRule | null>(null);
  const [input, setInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, from: 'bot', text: 'Bienvenue dans le simulateur 👋 Envoyez un message pour voir comment votre chatbot réagira.' },
  ]);
  const chatEnd = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, testing]);

  if (loading && !rules) return <PageLoader />;
  if (error && !rules) return <ErrorState message={error} retry={refresh} />;

  const activeCount = rules?.filter((rule) => rule.active).length ?? 0;
  const triggerCount = rules?.reduce((total, rule) => total + rule.triggerCount, 0) ?? 0;

  async function toggleRule(rule: AutomationRule) {
    try {
      await api(`/rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify({ active: !rule.active }) });
      showToast(rule.active ? 'Règle mise en pause.' : 'Règle activée.');
      refresh();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Modification impossible.', 'error');
    }
  }

  async function runTest(value: string) {
    const message = value.trim();
    if (!message || testing) return;
    setInput('');
    setMessages((current) => [...current, { id: Date.now(), from: 'user', text: message }]);
    setTesting(true);
    try {
      const result = await api<ChatbotTestResult>('/chatbot/test', { method: 'POST', body: JSON.stringify({ message }) });
      setMessages((current) => [...current, {
        id: Date.now() + 1,
        from: 'bot',
        text: result.response ?? 'Aucune règle active ne correspond à ce message. Je reste silencieux pour laisser un humain prendre le relais.',
      }]);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Le test a échoué.', 'error');
    } finally {
      setTesting(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void runTest(input);
  }

  return (
    <div>
      <PageHeader
        eyebrow="RÉPONSES AUTOMATIQUES"
        title="Votre chatbot, vos règles"
        description="Créez des réponses utiles pour les questions qui reviennent le plus souvent."
        actions={<button className="button button-primary" onClick={() => setRuleModal({ open: true, rule: null })}><Plus size={18} />Nouvelle règle</button>}
      />

      <div className="chatbot-summary">
        <span><i className="summary-live-dot" />{activeCount} règle{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}</span>
        <span><Zap size={15} />{triggerCount} réponses déclenchées</span>
        <span><Braces size={15} />Insensible à la casse et aux accents</span>
      </div>

      <div className="chatbot-layout">
        <section className="rules-section">
          <div className="section-heading"><div><h2>Règles de conversation</h2><p>La première règle active correspondante répond.</p></div></div>
          {rules?.length === 0 ? (
            <div className="card"><EmptyState icon={BotMessageSquare} title="Créez votre première règle" description="Par exemple, répondez automatiquement aux messages qui contiennent « horaires »." action={<button className="button button-primary" onClick={() => setRuleModal({ open: true, rule: null })}><Plus size={17} />Créer une règle</button>} /></div>
          ) : (
            <div className="rules-list">
              {rules?.map((rule) => (
                <article className={`card rule-card ${!rule.active ? 'rule-inactive' : ''}`} key={rule.id}>
                  <div className="rule-topline">
                    <span className="rule-icon"><MessageSquareText size={19} /></span>
                    <div><h3>{rule.name}</h3><span className={`rule-state ${rule.active ? 'active' : ''}`}><i />{rule.active ? 'Active' : 'En pause'}</span></div>
                    <Toggle checked={rule.active} onChange={() => toggleRule(rule)} label={`${rule.active ? 'Désactiver' : 'Activer'} ${rule.name}`} />
                  </div>
                  <div className="rule-trigger"><span>Si le message {matchLabels[rule.matchType]}</span><strong>« {rule.trigger} »</strong></div>
                  <div className="rule-response"><span>RÉPONSE AUTOMATIQUE</span><p>{rule.response}</p></div>
                  <div className="rule-footer">
                    <span><Zap size={14} />{rule.triggerCount} déclenchement{rule.triggerCount > 1 ? 's' : ''}</span>
                    <span>{rule.lastTriggeredAt ? `Dernier ${formatRelative(rule.lastTriggeredAt)}` : 'Jamais déclenchée'}</span>
                    <div className="rule-actions"><button className="icon-button" onClick={() => setRuleModal({ open: true, rule })} aria-label={`Modifier ${rule.name}`}><Edit3 size={16} /></button><button className="icon-button danger" onClick={() => setToDelete(rule)} aria-label={`Supprimer ${rule.name}`}><Trash2 size={16} /></button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="card simulator-card">
          <div className="simulator-header">
            <span className="simulator-avatar"><BotMessageSquare size={23} /></span>
            <div><h2>Simulateur du chatbot</h2><span><i />Prêt à tester</span></div>
            <Sparkles size={18} className="simulator-sparkle" />
          </div>
          <div className="simulator-body">
            <div className="simulator-day"><span>AUJOURD’HUI</span></div>
            {messages.map((message) => <div key={message.id} className={`chat-bubble chat-${message.from}`}>{message.text}<small>{message.from === 'bot' ? 'Chatbot' : 'Vous'}</small></div>)}
            {testing && <div className="chat-bubble chat-bot typing"><i /><i /><i /></div>}
            <div ref={chatEnd} />
          </div>
          <div className="quick-tests"><span>Essayez :</span>{['Bonjour', 'Vos horaires ?', 'Ma commande'].map((text) => <button key={text} onClick={() => runTest(text)} disabled={testing}>{text}</button>)}</div>
          <form className="simulator-input" onSubmit={submit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Écrivez un message…" aria-label="Message à tester" />
            <button type="submit" disabled={!input.trim() || testing} aria-label="Tester le message">{testing ? <CornerDownLeft className="spin" size={18} /> : <Send size={18} />}</button>
          </form>
          <p className="simulator-note">Aucun message réel n’est envoyé pendant un test.</p>
        </aside>
      </div>

      {ruleModal.open && <RuleModal rule={ruleModal.rule} onClose={() => setRuleModal({ open: false, rule: null })} onSaved={() => { showToast(ruleModal.rule ? 'Règle mise à jour.' : 'Nouvelle règle créée.'); refresh(); }} />}
      {toDelete && <ConfirmDialog title="Supprimer cette règle ?" description={`« ${toDelete.name} » sera définitivement retirée du chatbot.`} confirmLabel="Supprimer la règle" onClose={() => setToDelete(null)} onConfirm={async () => { await api(`/rules/${toDelete.id}`, { method: 'DELETE' }); showToast('Règle supprimée.'); refresh(); }} />}
    </div>
  );
}
