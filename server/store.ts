import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Activity, ActivityKind, AppData, Contact, Message, Schedule } from '../shared/types.js';

export const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

function seedData(): AppData {
  const createdAt = hoursAgo(24 * 90);
  const contacts: Contact[] = [
    { id: 'contact_amina', name: 'Amina Maïga', phone: '+227 90 12 34 56', tags: ['VIP', 'Cliente'], optedIn: true, lastInteraction: hoursAgo(1), createdAt },
    { id: 'contact_moussa', name: 'Moussa Ibrahim', phone: '+227 80 45 22 18', tags: ['Commande'], optedIn: true, lastInteraction: hoursAgo(3), createdAt },
    { id: 'contact_fatou', name: 'Fatou Diallo', phone: '+227 96 44 08 21', tags: ['Prospect'], optedIn: true, lastInteraction: hoursAgo(8), createdAt },
    { id: 'contact_ibrahim', name: 'Ibrahim Sanda', phone: '+227 88 32 19 07', tags: ['Cliente'], optedIn: true, lastInteraction: hoursAgo(26), createdAt },
    { id: 'contact_mariama', name: 'Mariama Souley', phone: '+227 91 73 55 40', tags: ['VIP'], optedIn: true, lastInteraction: hoursAgo(31), createdAt },
    { id: 'contact_ali', name: 'Ali Boubacar', phone: '+227 93 20 18 64', tags: ['Prospect'], optedIn: false, lastInteraction: hoursAgo(54), createdAt },
  ];

  const rules = [
    {
      id: 'rule_welcome', name: 'Accueillir un nouveau contact', trigger: 'bonjour', matchType: 'contains' as const,
      response: 'Bonjour 👋 Bienvenue chez Néma Studio ! Comment pouvons-nous vous aider aujourd’hui ?',
      active: true, triggerCount: 48, lastTriggeredAt: hoursAgo(2), createdAt,
    },
    {
      id: 'rule_hours', name: 'Horaires d’ouverture', trigger: 'horaires', matchType: 'contains' as const,
      response: 'Nous sommes ouverts du lundi au samedi, de 9h à 18h. À très vite !',
      active: true, triggerCount: 31, lastTriggeredAt: hoursAgo(5), createdAt,
    },
    {
      id: 'rule_order', name: 'Suivi de commande', trigger: 'commande', matchType: 'contains' as const,
      response: 'Pour suivre votre commande, envoyez-nous votre numéro de commande. Un conseiller vérifie son statut immédiatement. 📦',
      active: true, triggerCount: 26, lastTriggeredAt: hoursAgo(7), createdAt,
    },
    {
      id: 'rule_advisor', name: 'Parler à un conseiller', trigger: 'conseiller', matchType: 'exact' as const,
      response: 'Je préviens un membre de l’équipe. Vous serez mis en relation dans quelques minutes.',
      active: false, triggerCount: 12, lastTriggeredAt: hoursAgo(70), createdAt,
    },
  ];

  const schedules: Schedule[] = [
    {
      id: 'schedule_delivery', contactId: 'contact_moussa',
      message: 'Bonjour Moussa ! Votre commande est prête. Vous pouvez la retirer dès aujourd’hui à partir de 14h. 📦',
      scheduledFor: hoursFromNow(2.5), repeat: 'none', status: 'scheduled', createdAt: hoursAgo(3),
    },
    {
      id: 'schedule_reminder', contactId: 'contact_amina',
      message: 'Bonjour Amina, petit rappel pour notre rendez-vous demain à 10h. Répondez OUI pour confirmer. À demain !',
      scheduledFor: hoursFromNow(22), repeat: 'none', status: 'scheduled', createdAt: hoursAgo(7),
    },
    {
      id: 'schedule_weekly', contactId: 'contact_fatou',
      message: 'Fatou, les nouveautés de la semaine sont arrivées ✨ Souhaitez-vous recevoir le catalogue ?',
      scheduledFor: hoursFromNow(47), repeat: 'weekly', status: 'scheduled', createdAt: hoursAgo(12),
    },
    {
      id: 'schedule_past', contactId: 'contact_ibrahim',
      message: 'Merci pour votre visite Ibrahim ! Nous restons à votre disposition.',
      scheduledFor: hoursAgo(25), repeat: 'none', status: 'sent', createdAt: hoursAgo(30), sentAt: hoursAgo(25),
    },
  ];

  const outboundTexts = [
    'Merci pour votre message ! Nous revenons vers vous rapidement.',
    'Votre commande est en cours de préparation. 📦',
    'Nous sommes ouverts du lundi au samedi, de 9h à 18h.',
    'Parfait, votre rendez-vous est bien confirmé.',
    'Voici les informations demandées. Bonne journée !',
  ];
  const inboundTexts = ['Bonjour, je souhaite avoir une information.', 'Où en est ma commande ?', 'Quels sont vos horaires ?', 'Merci beaucoup !', 'Je confirme le rendez-vous.'];
  const messages: Message[] = [];

  for (let day = 6; day >= 0; day -= 1) {
    const count = 5 + ((day * 3) % 4);
    for (let index = 0; index < count; index += 1) {
      const inbound = index % 4 === 0;
      const timestamp = hoursAgo(day * 24 + ((index * 3 + day) % 17) + 1);
      const contact = contacts[(index + day) % contacts.length];
      messages.push({
        id: `message_${day}_${index}`,
        contactId: contact.id,
        body: inbound ? inboundTexts[(index + day) % inboundTexts.length] : outboundTexts[(index + day) % outboundTexts.length],
        direction: inbound ? 'inbound' : 'outbound',
        source: inbound ? 'incoming' : index % 3 === 0 ? 'chatbot' : index % 3 === 1 ? 'schedule' : 'manual',
        status: inbound ? 'received' : index % 5 === 0 ? 'read' : index % 3 === 0 ? 'delivered' : 'sent',
        createdAt: timestamp,
      });
    }
  }

  const activities: Activity[] = [
    { id: 'activity_1', kind: 'rule_triggered', title: 'Réponse automatique envoyée', description: 'Règle « Suivi de commande » déclenchée pour Moussa.', createdAt: hoursAgo(0.4) },
    { id: 'activity_2', kind: 'message_received', title: 'Nouveau message d’Amina', description: '« Parfait, merci pour la confirmation ! »', createdAt: hoursAgo(1.2) },
    { id: 'activity_3', kind: 'schedule_created', title: 'Message programmé', description: 'Rappel de rendez-vous pour Amina, demain matin.', createdAt: hoursAgo(3) },
    { id: 'activity_4', kind: 'message_sent', title: 'Message livré à Ibrahim', description: 'Le remerciement après visite a bien été envoyé.', createdAt: hoursAgo(6) },
    { id: 'activity_5', kind: 'contact_created', title: 'Nouveau contact ajouté', description: 'Fatou Diallo a rejoint vos contacts.', createdAt: hoursAgo(9) },
  ];

  return { contacts, schedules, messages, rules, activities };
}

export function addActivity(
  data: AppData,
  kind: ActivityKind,
  title: string,
  description: string,
): void {
  data.activities.unshift({
    id: createId('activity'),
    kind,
    title,
    description,
    createdAt: new Date().toISOString(),
  });
  data.activities = data.activities.slice(0, 80);
}

export class JsonStore {
  private data: AppData;

  constructor(private readonly filePath = resolve(process.cwd(), 'data/store.json')) {
    mkdirSync(dirname(filePath), { recursive: true });
    if (existsSync(filePath)) {
      this.data = JSON.parse(readFileSync(filePath, 'utf8')) as AppData;
    } else {
      this.data = seedData();
      this.persist();
    }
  }

  get snapshot(): AppData {
    return this.data;
  }

  update<T>(mutator: (data: AppData) => T): T {
    const next = structuredClone(this.data);
    const result = mutator(next);
    this.data = next;
    this.persist();
    return result;
  }

  private persist(): void {
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, this.filePath);
  }
}
