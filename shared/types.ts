export type MatchType = 'contains' | 'exact' | 'starts_with';
export type RepeatFrequency = 'none' | 'daily' | 'weekly';
export type ScheduleStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageSource = 'manual' | 'schedule' | 'chatbot' | 'incoming';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  optedIn: boolean;
  lastInteraction: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  contactId: string;
  message: string;
  scheduledFor: string;
  repeat: RepeatFrequency;
  status: ScheduleStatus;
  createdAt: string;
  sentAt?: string;
  lastError?: string;
}

export interface ScheduleWithContact extends Schedule {
  contact: Contact | null;
}

export interface Message {
  id: string;
  contactId: string;
  body: string;
  direction: 'inbound' | 'outbound';
  source: MessageSource;
  status: MessageStatus;
  createdAt: string;
}

export interface MessageWithContact extends Message {
  contact: Contact | null;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  matchType: MatchType;
  response: string;
  active: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export type ActivityKind =
  | 'message_sent'
  | 'message_received'
  | 'schedule_created'
  | 'rule_triggered'
  | 'contact_created'
  | 'rule_updated';

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  createdAt: string;
}

export interface AppData {
  contacts: Contact[];
  schedules: Schedule[];
  messages: Message[];
  rules: AutomationRule[];
  activities: Activity[];
}

export interface DashboardData {
  stats: {
    messagesSent: number;
    automaticReplies: number;
    activeSchedules: number;
    activeRules: number;
    totalContacts: number;
  };
  chart: Array<{
    date: string;
    label: string;
    sent: number;
    received: number;
  }>;
  upcoming: ScheduleWithContact[];
  activities: Activity[];
  rules: AutomationRule[];
}

export interface IntegrationSettings {
  mode: 'demo' | 'live';
  configured: boolean;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  apiVersion: string;
  webhookPath: string;
}

export interface ChatbotTestResult {
  matched: boolean;
  response: string | null;
  rule: AutomationRule | null;
}
