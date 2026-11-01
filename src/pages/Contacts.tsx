import { useMemo, useState } from 'react';
import { Edit3, MessageSquareText, Plus, Search, UserCheck, UsersRound } from 'lucide-react';
import type { Contact } from '../../shared/types';
import { ContactModal, MessageModal } from '../components/Forms';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorState, PageHeader, PageLoader } from '../components/UI';
import { useApi } from '../hooks/useApi';
import { formatRelative } from '../lib/format';

export default function Contacts() {
  const { data: contacts, loading, error, refresh } = useApi<Contact[]>('/contacts');
  const [search, setSearch] = useState('');
  const [contactModal, setContactModal] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });
  const [messageContact, setMessageContact] = useState<string | null>(null);
  const { showToast } = useToast();

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (!query) return contacts ?? [];
    return (contacts ?? []).filter((contact) => [contact.name, contact.phone, ...contact.tags].join(' ').toLocaleLowerCase('fr').includes(query));
  }, [contacts, search]);

  if (loading && !contacts) return <PageLoader />;
  if (error && !contacts) return <ErrorState message={error} retry={refresh} />;

  const optedInCount = contacts?.filter((contact) => contact.optedIn).length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="VOTRE AUDIENCE"
        title="Contacts"
        description="Retrouvez vos clients et leurs préférences au même endroit."
        actions={<button className="button button-primary" onClick={() => setContactModal({ open: true, contact: null })}><Plus size={18} />Ajouter un contact</button>}
      />

      <div className="contact-stats">
        <div><span className="mini-stat-icon green"><UsersRound size={19} /></span><span><strong>{contacts?.length ?? 0}</strong><small>contacts enregistrés</small></span></div>
        <div><span className="mini-stat-icon purple"><UserCheck size={19} /></span><span><strong>{optedInCount}</strong><small>consentements confirmés</small></span></div>
      </div>

      <section className="card table-card">
        <div className="table-toolbar contacts-toolbar">
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un nom, un numéro, une étiquette…" aria-label="Rechercher un contact" />{search && <button onClick={() => setSearch('')} aria-label="Effacer la recherche">Effacer</button>}</label>
          <span className="result-count">{visible.length} contact{visible.length > 1 ? 's' : ''}</span>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={UsersRound} title={search ? 'Aucun résultat' : 'Votre carnet est vide'} description={search ? `Aucun contact ne correspond à « ${search} ».` : 'Ajoutez votre premier contact pour commencer à échanger.'} action={search ? <button className="button button-secondary" onClick={() => setSearch('')}>Effacer la recherche</button> : <button className="button button-primary" onClick={() => setContactModal({ open: true, contact: null })}><Plus size={17} />Ajouter un contact</button>} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Contact</th><th>Numéro WhatsApp</th><th>Étiquettes</th><th>Consentement</th><th>Dernière activité</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {visible.map((contact) => (
                  <tr key={contact.id}>
                    <td><div className="contact-cell"><Avatar name={contact.name} /><div><strong>{contact.name}</strong><span>Contact depuis {formatRelative(contact.createdAt)}</span></div></div></td>
                    <td><span className="phone-cell">{contact.phone}</span></td>
                    <td><div className="tag-list">{contact.tags.length ? contact.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>) : <span className="muted">—</span>}</div></td>
                    <td><span className={`badge ${contact.optedIn ? 'status-sent' : 'status-cancelled'}`}><i />{contact.optedIn ? 'Confirmé' : 'Non confirmé'}</span></td>
                    <td><span className="muted">{formatRelative(contact.lastInteraction)}</span></td>
                    <td><div className="row-actions"><button className="icon-button" onClick={() => setContactModal({ open: true, contact })} aria-label={`Modifier ${contact.name}`} title="Modifier"><Edit3 size={16} /></button><button className="icon-button accent" onClick={() => setMessageContact(contact.id)} disabled={!contact.optedIn} aria-label={`Écrire à ${contact.name}`} title={contact.optedIn ? 'Envoyer un message' : 'Consentement requis'}><MessageSquareText size={17} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {contactModal.open && <ContactModal contact={contactModal.contact} onClose={() => setContactModal({ open: false, contact: null })} onSaved={() => { showToast(contactModal.contact ? 'Contact mis à jour.' : 'Contact ajouté à votre carnet.'); refresh(); }} />}
      {messageContact && <MessageModal contacts={contacts ?? []} initialContactId={messageContact} onClose={() => setMessageContact(null)} onSaved={() => { showToast('Votre message a été envoyé.'); refresh(); }} />}
    </div>
  );
}
