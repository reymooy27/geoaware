import { getEnv } from '../config/env.js';

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const env = getEnv();
  if (!env.WHATSAPP_API_URL || !env.WHATSAPP_API_TOKEN) {
    logger.warn('WhatsApp API not configured, skipping WhatsApp');
    return false;
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    const response = await fetch(`${env.WHATSAPP_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error, phone }, 'WhatsApp send failed');
      return false;
    }

    logger.info({ phone }, 'WhatsApp message sent');
    return true;
  } catch (error) {
    logger.error({ error, phone }, 'WhatsApp error');
    return false;
  }
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}