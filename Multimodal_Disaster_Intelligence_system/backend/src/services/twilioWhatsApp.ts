import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM;

let client: twilio.Twilio | null = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export const sendWhatsAppAlert = async (to: string, message: string) => {
  if (!client || !fromWhatsAppNumber) {
    console.warn('Twilio not configured. Mocking WhatsApp send to', to);
    return { success: true, messageId: `mock_wa_${Date.now()}` };
  }

  try {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    const res = await client.messages.create({
      body: message,
      from: fromWhatsAppNumber,
      to: formattedTo
    });

    return { success: true, messageId: res.sid };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};
