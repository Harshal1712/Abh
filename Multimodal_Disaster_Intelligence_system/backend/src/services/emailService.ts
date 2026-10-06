import nodemailer from 'nodemailer';

const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT || '587', 10);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASSWORD;
const fromAddress = process.env.EMAIL_FROM;

let transporter: nodemailer.Transporter | null = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
}

export const sendEmailAlert = async ({ to, subject, text, html }: { to: string, subject: string, text: string, html?: string }) => {
  if (!transporter || !fromAddress) {
    console.warn('Email SMTP not configured. Mocking Email send to', to);
    return { success: true, messageId: `mock_email_${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};
