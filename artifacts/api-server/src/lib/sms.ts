import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

export async function sendSms(to: string, body: string): Promise<boolean> {
  try {
    const fromNumber = process.env["TWILIO_FROM_NUMBER"];
    if (!fromNumber) {
      logger.warn("TWILIO_FROM_NUMBER not set — skipping SMS");
      return false;
    }
    const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
    const response = await connectors.proxy("twilio", "/2010-04-01/Accounts/Messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.warn({ to, status: response.status, text }, "SMS send failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err, to }, "SMS send error");
    return false;
  }
}

export async function sendSmsIfOptedIn(
  userId: string,
  phone: string | null | undefined,
  smsKey: string,
  settings: Record<string, unknown> | null | undefined,
  body: string,
): Promise<void> {
  if (!phone) return;
  const paused = settings?.notif_sms_paused === true;
  const optedOut = settings?.[smsKey] === false;
  if (paused || optedOut) return;
  sendSms(phone, body).catch(() => {});
}
