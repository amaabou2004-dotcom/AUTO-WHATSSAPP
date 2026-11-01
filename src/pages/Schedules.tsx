import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Repeat2, Trash2 } from 'lucide-react';
import type { Contact, ScheduleWithContact } from '../../shared/types';
import { ConfirmDialog, ScheduleModal } from '../components/Forms';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, ErrorState, PageHeader, PageLoader } from '../components/UI';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatFullDate, repeatLabels, scheduleStatusLabels } from '../lib/format';

type Filter = 'upcoming' | 'history' | 'all';

export default function Schedules() {
  const { data, loading, error, refresh } = useApi<ScheduleWithContact[]>('/schedules');
  const { data: contacts } = useApi<Contact[]>('/contacts');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [toCancel, setToCancel] = useState<ScheduleWithContact | null>(null);
  const { showToast } = useToast();

  const visible = useMemo(() => {
    const filtered = (data ?? []).filter((schedule) => {
      if (filter === 'upcoming') return schedule.status === 'scheduled';
      if (filter === 'history') return schedule.status !== 'scheduled';
      return true;
    });
    return filtered.sort((a, b) => filter === 'upcoming' ? a.scheduledFor.localeCompare(b.scheduledFor) : b.scheduledFor.localeCompare(a.scheduledFor));
  }, [data, filter]);

  if (loading && !data) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} retry={refresh} />;

  const upcomingCount = data?.filter((schedule) => schedule.status === 'scheduled').length ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="PLANIFICATION"
        title="Messages programmés"
        description="Préparez vos messages maintenant, ils partiront au bon moment."
        actions={<button className="button button-primary" onClick={() => setModalOpen(true)}><Plus size={18} />Programmer un message</button>}
      />

      <div className="summary-strip">
        <span className="summary-strip-icon"><CalendarClock size={20} /></span>
        <div><strong>{upcomingCount} message{upcomingCount > 1 ? 's' : ''} en attente</strong><p>Le planificateur vérifie les envois toutes les 15 secondes.</p></div>
      </div>

      <section className="card table-card">
        <div className="table-toolbar">
          <div className="segmented-control" aria-label="Filtrer les messages">
            <button className={filter === 'upcoming' ? 'active' : ''} onClick={() => setFilter('upcoming')}>À venir <span>{upcomingCount}</span></button>
            <button className={filter === 'history' ? 'active' : ''} onClick={() => setFilter('history')}>Terminés</button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tous</button>
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={filter === 'upcoming' ? 'Votre calendrier est libre' : 'Aucun message dans cette vue'}
            description="Programmez votre premier message pour le retrouver ici."
            action={<button className="button button-primary" onClick={() => setModalOpen(true)}><Plus size={17} />Programmer un message</button>}
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Destinataire</th><th>Message</th><th>Date et heure</th><th>Répétition</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {visible.map((schedule) => (
                  <tr key={schedule.id}>
                    <td><div className="contact-cell"><Avatar name={schedule.contact?.name ?? 'Contact supprimé'} /><div><strong>{schedule.contact?.name ?? 'Contact supprimé'}</strong><span>{schedule.contact?.phone ?? '—'}</span></div></div></td>
                    <td><p className="table-message" title={schedule.message}>{schedule.message}</p></td>
                    <td><span className="date-cell">{formatFullDate(schedule.scheduledFor)}</span></td>
                    <td><span className="repeat-cell">{schedule.repeat !== 'none' && <Repeat2 size={14} />}{repeatLabels[schedule.repeat]}</span></td>
                    <td><span className={`badge status-${schedule.status}`}><i />{scheduleStatusLabels[schedule.status]}</span></td>
                    <td>{schedule.status === 'scheduled' && <button className="icon-button row-action danger" onClick={() => setToCancel(schedule)} aria-label={`Annuler le message pour ${schedule.contact?.name}`} title="Annuler l’envoi"><Trash2 size={17} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && <ScheduleModal contacts={contacts ?? []} onClose={() => setModalOpen(false)} onSaved={() => { showToast('Message ajouté au calendrier.'); refresh(); }} />}
      {toCancel && (
        <ConfirmDialog
          title="Annuler cet envoi ?"
          description={`Le message pour ${toCancel.contact?.name ?? 'ce contact'} ne sera pas transmis.`}
          confirmLabel="Annuler l’envoi"
          onClose={() => setToCancel(null)}
          onConfirm={async () => {
            await api(`/schedules/${toCancel.id}`, { method: 'DELETE' });
            showToast('L’envoi programmé a été annulé.');
            refresh();
          }}
        ><p className="confirm-message-preview">« {toCancel.message} »</p></ConfirmDialog>
      )}
    </div>
  );
}
