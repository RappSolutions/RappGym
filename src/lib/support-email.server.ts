import { z } from "zod";

export interface SupportEmail {
  id: string;
  kind: "question" | "feedback" | "bug" | "exercise-suggestion";
  message: string;
  senderEmail: string;
  senderName: string;
  userId: string;
}

/** Plain text deliberately keeps user content out of HTML and header syntax. */
export function supportEmailPayload(message: SupportEmail) {
  const email = z.string().email().max(254).parse(message.senderEmail);
  const name = message.senderName.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 120);
  return {
    Recipients: { To: ["gym@rappsol.com"] },
    Content: {
      From: "RappGym <gym@rappsol.com>",
      ReplyTo: email,
      Subject: `[RappGym ${message.kind}] ${name || email}`,
      Body: [{
        ContentType: "PlainText",
        Charset: "utf-8",
        Content: `${message.message}\n\n--- RappGym ---\nName: ${name}\nEmail: ${email}\nAccount ID: ${message.userId}`,
      }],
    },
  };
}

/** Called only after persistence. Never expose provider responses or credentials. */
export async function sendSupportEmail(message: SupportEmail): Promise<boolean> {
  const apiKey = process.env["ELASTIC_EMAIL_API_KEY"];
  if (!apiKey) return false;
  try {
    const response = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ElasticEmail-ApiKey": apiKey },
      body: JSON.stringify(supportEmailPayload(message)),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}