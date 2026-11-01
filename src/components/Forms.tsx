import { useState, type FormEvent, type ReactNode } from 'react';
import { CalendarClock, Info, Send } from 'lucide-react';
import type { AutomationRule, Contact, MatchType, RepeatFrequency } from '../../shared/types';
import { api } from '../lib/api';
import { defaultScheduleDate } from '../lib/format';
import { Modal, SubmitButton } from './UI';

interface BaseModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Une erreur est survenue.';

export function ScheduleModal({ contacts, onClose, onSaved }: BaseModalProps & { contacts: Contact[] }) {
  const firstContact = contacts.find((contact) => contact.optedIn)?.id ?? '';
  const [contactId, setContactId] = useState(firstContact);
  const [message, setMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleDate());
  const [repeat, setRepeat] = useState<RepeatFrequency>('none');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/schedules', {
        method: 'POST',
        body: JSON.stringify({ contactId, message, scheduledFor: new Date(scheduledFor).toISOString(), repeat }),
      });
      onSaved();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Programmer un message" description="Choisissez le destinataire et le moment idéal. Nous nous occupons du reste." onClose={onClose} size="large">
      <form onSubmit={submit}>
        <div className="modal-body form-stack">
          <label className="field">
            <span>Destinataire</span>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} required autoFocus>
              <option value="" disabled>Sélectionner un contact</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.optedIn}>{contact.name} · {contact.phone}{!contact.optedIn ? ' (sans consentement)' : ''}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Bonjour ! Nous vous confirmons…" rows={5} maxLength={2000} required />
            <small className="field-counter">{message.length} / 2 000</small>
          </label>
          <div className="message-templates">
            <span>Idées de messages :</span>
            <button type="button" onClick={() => setMessage('Bonjour ! Petit rappel pour notre rendez-vous demain. Répondez OUI pour confirmer. À très vite !')}>Rappel de rendez-vous</button>
            <button type="button" onClick={() => setMessage('Bonne nouvelle ! Votre commande est prête. Vous pouvez la retirer dès aujourd’hui. 📦')}>Commande prête</button>
          </div>
          <div className="form-grid-two">
            <label className="field">
              <span>Date et heure</span>
              <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required />
            </label>
            <label className="field">
              <span>Répétition</span>
              <select value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatFrequency)}>
                <option value="none">Une seule fois</option>
                <option value="daily">Chaque jour</option>
                <option value="weekly">Chaque semaine</option>
              </select>
            </label>
          </div>
          <div className="form-note"><Info size={17} /><span>Le fuseau horaire utilisé est celui de votre appareil. Vous pourrez annuler l’envoi tant qu’il est en attente.</span></div>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>Annuler</button>
          <SubmitButton saving={saving}><CalendarClock size={17} />Programmer le message</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export function RuleModal({ rule, onClose, onSaved }: BaseModalProps & { rule?: AutomationRule | null }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [trigger, setTrigger] = useState(rule?.trigger ?? '');
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? 'contains');
  const [response, setResponse] = useState(rule?.response ?? '');
  const [active, setActive] = useState(rule?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(rule ? `/rules/${rule.id}` : '/rules', {
        method: rule ? 'PATCH' : 'POST',
        body: JSON.stringify({ name, trigger, matchType, response, active }),
      });
      onSaved();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={rule ? 'Modifier la règle' : 'Nouvelle règle automatique'} description="Le chatbot utilise la première règle active qui correspond au message reçu." onClose={onClose} size="large">
      <form onSubmit={submit}>
        <div className="modal-body form-stack">
          <label className="field">
            <span>Nom de la règle</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Questions sur la livraison" maxLength={80} required autoFocus />
          </label>
          <div className="form-grid-rule">
            <label className="field">
              <span>Si le message…</span>
              <select value={matchType} onChange={(event) => setMatchType(event.target.value as MatchType)}>
                <option value="contains">Contient</option>
                <option value="exact">Est exactement</option>
                <option value="starts_with">Commence par</option>
              </select>
            </label>
            <label className="field">
              <span>Ce mot ou cette expression</span>
              <input value={trigger} onChange={(event) => setTrigger(event.target.value)} placeholder="Ex. livraison" maxLength={120} required />
            </label>
          </div>
          <label className="field">
            <span>Alors répondre automatiquement</span>
            <textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Merci pour votre message ! Voici les informations…" rows={5} maxLength={2000} required />
            <small className="field-counter">{response.length} / 2 000</small>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            <span><strong>Activer cette règle immédiatement</strong><small>Vous pourrez la mettre en pause à tout moment.</small></span>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>Annuler</button>
          <SubmitButton saving={saving}>{rule ? 'Enregistrer les modifications' : 'Créer la règle'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export function ContactModal({ contact, onClose, onSaved }: BaseModalProps & { contact?: Contact | null }) {
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '+227 ');
  const [tags, setTags] = useState(contact?.tags.join(', ') ?? '');
  const [optedIn, setOptedIn] = useState(contact?.optedIn ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(contact ? `/contacts/${contact.id}` : '/contacts', {
        method: contact ? 'PATCH' : 'POST',
        body: JSON.stringify({ name, phone, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), optedIn }),
      });
      onSaved();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={contact ? 'Modifier le contact' : 'Ajouter un contact'} description="Enregistrez les coordonnées et les préférences de votre contact." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body form-stack">
          <label className="field"><span>Nom complet</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Amina Maïga" required maxLength={80} autoFocus /></label>
          <label className="field"><span>Numéro WhatsApp</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+227 90 00 00 00" required /><small className="field-help">Utilisez le format international avec l’indicatif du pays.</small></label>
          <label className="field"><span>Étiquettes</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="VIP, Commande, Prospect" /><small className="field-help">Séparez les étiquettes par des virgules.</small></label>
          <label className="checkbox-row">
            <input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} />
            <span><strong>Consentement aux messages confirmé</strong><small>Ce contact accepte de recevoir vos communications WhatsApp.</small></span>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-secondary" onClick={onClose}>Annuler</button>
          <SubmitButton saving={saving}>{contact ? 'Enregistrer' : 'Ajouter le contact'}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export function MessageModal({ contacts, initialContactId, onClose, onSaved }: BaseModalProps & { contacts: Contact[]; initialContactId?: string }) {
  const [contactId, setContactId] = useState(initialContactId ?? contacts.find((contact) => contact.optedIn)?.id ?? '');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/messages', { method: 'POST', body: JSON.stringify({ contactId, body }) });
      onSaved();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Envoyer un message" description="Votre message partira immédiatement via le canal configuré." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body form-stack">
          <label className="field"><span>Destinataire</span><select value={contactId} onChange={(event) => setContactId(event.target.value)} required autoFocus><option value="" disabled>Sélectionner un contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.optedIn}>{contact.name} · {contact.phone}</option>)}</select></label>
          <label className="field"><span>Message</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={2000} placeholder="Écrivez votre message…" required /><small className="field-counter">{body.length} / 2 000</small></label>
          <div className="form-note"><Info size={17} /><span>En mode démo, l’envoi est enregistré et simulé, mais aucun message réel n’est transmis.</span></div>
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Annuler</button><SubmitButton saving={saving}><Send size={16} />Envoyer maintenant</SubmitButton></div>
      </form>
    </Modal>
  );
}

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, children }: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setSaving(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }
  return (
    <Modal title={title} description={description} onClose={onClose} size="small">
      <div className="modal-body">{children}{error && <div className="form-error" role="alert">{error}</div>}</div>
      <div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Conserver</button><button className="button button-danger" onClick={confirm} disabled={saving}>{saving ? 'Suppression…' : confirmLabel}</button></div>
    </Modal>
  );
}
