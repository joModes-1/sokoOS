import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;
let cachedKey = '';

function buildTransport(): Transporter | null {
  const host = process.env['SMTP_HOST'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];
  if (!host || !user || !pass) return null;
  const port = Number(process.env['SMTP_PORT'] ?? 587);
  const secure = String(process.env['SMTP_SECURE'] ?? 'false') === 'true';
  const key = `${host}:${port}:${secure}:${user}`;
  if (transporter && key === cachedKey) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  cachedKey = key;
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASS']);
}

export function getEmailFrom(): string {
  return process.env['EMAIL_FROM'] || `SokoOS <${process.env['SMTP_USER']}>`;
}

export function getSupportEmail(): string | undefined {
  return process.env['SUPPORT_EMAIL'];
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const transport = buildTransport();
  if (!transport) {
    return { ok: false, error: 'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)' };
  }
  try {
    await transport.sendMail({
      from: getEmailFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo ?? getSupportEmail(),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mailer] send failed:', message);
    return { ok: false, error: message };
  }
}
