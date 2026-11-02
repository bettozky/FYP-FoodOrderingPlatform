// Sends email (used for forgot-password codes). Configure SMTP_* in backend/.env (Gmail with an app password, Brevo, Mailgun ...).
// Without SMTP_HOST nothing is sent: the message is printed in the server console so you can still test the flow.
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

export const emailConfigured = Boolean(env.smtpHost);

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!env.smtpHost) {
    console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  transport ??= nodemailer.createTransport({
    host: env.smtpHost, port: env.smtpPort, secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
  await transport.sendMail({ from: env.mailFrom, to, subject, text });
}
