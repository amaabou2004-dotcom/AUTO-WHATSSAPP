import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History as HistoryIcon, Plus, Search } from 'lucide-react';
import type { Contact, MessageWithContact } from '../../shared/types';
import { MessageModal } from '../components/Forms';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorState, PageHeader, PageLoader } from '../components/UI';
import { useApi } from '../hooks/useApi';
import { formatDateTime, messageSourceLabels, messageStatusLabels } from '../lib/format';

type Filter = 'all' | 'outbound' | 'inbound' | 'failed';

export default function History() {
  const { data: messages, loading, error, refresh } = useApi<MessageWithContact[]>('/messages');
  const { data: contacts } = useApi<Contact[]>('/contacts');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return (messages ?? []).filter((message) => {
      if (filter === 'outbound' && message.direction !== 'outbound') return false;
      if (filter === 'inbound' && message.direction !== 'inbound') return false;
      if (filter === 'failed' && message.status !== 'failed') return false;
      if (query && ![message.body, message.contact?.name ?? '', message.contact?.phone ?? ''].join(' ').toLocaleLowerCase('fr').includes(query)) return false;
      return true;
    });
  }, [messages, filter, search]);

  if (loading && !messages) return <PageLoader />;
  if (error && !messages) return <ErrorState message={error} retry={refresh} />;

  return (
    <div>
      <PageHeader
        eyebrow="TRAÇABILITÉ"
        title="Historique des messages"
        description="Chaque échange, chaque envoi automatique : rien ne vous échappe."
        actions={<button className="button button-primary" onClick={() => setModalOpen(true)}><Plus size={18} />Nouveau message</button>}
      />

      <section className="card table-card">
        <div className="table-toolbar history-toolbar">
          <div className="segmented-control" aria-label="Filtrer l’historique">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tous</button>
            <button className={filter === 'outbound' ? 'active' : ''} onClick={() => setFilter('outbound')}>Envoyés</button>
            <button className={filter === 'inbound' ? 'active' : ''} onClick={() => setFilter('inbound')}>Reçus</button>
            <button className={filter === 'failed' ? 'active' : ''} onClick={() => setFilter('failed')}>Échecs</button>
          </div>
          <label className="search-field compact"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" aria-label="Rechercher dans l’historique" /></label>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="Aucun message ici" description="Modifiez vos filtres ou envoyez un nouveau message." action={<button className="button button-primary" onClick={() => setModalOpen(true)}><Plus size={17} />Nouveau message</button>} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Type</th><th>Contact</th><th>Message</th><th>Source</th><th>Date</th><th>Statut</th></tr></thead>
              <tbody>
                {visible.map((message) => (
                  <tr key={message.id}>
                    <td><span className={`direction-icon ${message.direction}`} title={message.direction === 'inbound' ? 'Message reçu' : 'Message envoyé'}>{message.direction === 'inbound' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span></td>
                    <td><div className="contact-cell compact-contact"><Avatar name={message.contact?.name ?? 'Contact supprimé'} size="small" /><div><strong>{message.contact?.name ?? 'Contact supprimé'}</strong><span>{message.contact?.phone ?? '—'}</span></div></div></td>
                    <td><p className="table-message history-message" title={message.body}>{message.body}</p></td>
                    <td><span className="source-label">{messageSourceLabels[message.source]}</span></td>
                    <td><span className="date-cell">{formatDateTime(message.createdAt)}</span></td>
                    <td><span className={`badge status-${message.status}`}><i />{messageStatusLabels[message.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="table-footnote">Les 150 événements les plus récents sont affichés. Les statuts de distribution et de lecture dépendent des notifications de la Cloud API.</p>

      {modalOpen && <MessageModal contacts={contacts ?? []} onClose={() => setModalOpen(false)} onSaved={() => { showToast('Message envoyé et ajouté à l’historique.'); refresh(); }} />}
    </div>
  );
}
