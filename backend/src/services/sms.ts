import { env } from '../config/env.js';

const logger = {
  info: (obj: any, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}`, obj),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    logger.warn('Twilio not configured, skipping SMS');
    return false;
  }

  try {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: env.TWILIO_PHONE_NUMBER,
          To: formatPhoneNumber(phone),
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error, phone }, 'Twilio SMS send failed');
      return false;
    }

    logger.info({ phone }, 'SMS sent');
    return true;
  } catch (error) {
    logger.error({ error, phone }, 'SMS error');
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
  
  return `+${cleaned}`;
}