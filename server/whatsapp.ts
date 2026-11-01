import { randomUUID } from 'node:crypto';
import type { IntegrationSettings } from '../shared/types.js';

interface WhatsAppResult {
  providerMessageId: string;
  demo: boolean;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function getIntegrationSettings(): IntegrationSettings {
  const configured = isWhatsAppConfigured();
  return {
    mode: configured ? 'live' : 'demo',
    configured,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
    webhookPath: '/api/webhooks/whatsapp',
  };
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { providerMessageId: `demo_${randomUUID()}`, demo: true };
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp Cloud API a refusé l’envoi (${response.status}) : ${details}`);
  }

  const payload = (await response.json()) as { messages?: Array<{ id: string }> };
  return {
    providerMessageId: payload.messages?.[0]?.id || randomUUID(),
    demo: false,
  };
}
