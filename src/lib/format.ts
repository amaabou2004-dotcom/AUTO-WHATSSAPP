import type { MessageSource, MessageStatus, RepeatFrequency, ScheduleStatus } from '../../shared/types';

export const formatDateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

export const formatFullDate = (value: string) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

export function formatRelative(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (absolute < 60) return seconds >= 0 ? 'à l’instant' : 'il y a un instant';
  if (absolute < 3_600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (absolute < 86_400) return formatter.format(Math.round(seconds / 3_600), 'hour');
  return formatter.format(Math.round(seconds / 86_400), 'day');
}

export function formatScheduleDay(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  if (sameDay(date, today)) return `Aujourd’hui, ${time}`;
  if (sameDay(date, tomorrow)) return `Demain, ${time}`;
  return formatDateTime(value);
}

export const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  scheduled: 'Programmé', sent: 'Envoyé', failed: 'Échec', cancelled: 'Annulé',
};

export const messageStatusLabels: Record<MessageStatus, string> = {
  received: 'Reçu', sent: 'Envoyé', delivered: 'Distribué', read: 'Lu', failed: 'Échec',
};

export const messageSourceLabels: Record<MessageSource, string> = {
  manual: 'Manuel', schedule: 'Programmé', chatbot: 'Chatbot', incoming: 'Entrant',
};

export const repeatLabels: Record<RepeatFrequency, string> = {
  none: 'Une seule fois', daily: 'Chaque jour', weekly: 'Chaque semaine',
};

export function defaultScheduleDate(): string {
  const date = new Date(Date.now() + 3_600_000);
  date.setMinutes(date.getMinutes() >= 30 ? 60 : 30, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
