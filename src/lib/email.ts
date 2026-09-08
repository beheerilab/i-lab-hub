import { Resend } from "resend";

const VERZENDADRES = "i-lab Hub <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function stuurEmail({
  aan,
  onderwerp,
  html,
}: {
  aan: string | string[];
  onderwerp: string;
  html: string;
}) {
  const resend = getClient();
  if (!resend) return;

  const ontvangers = Array.isArray(aan) ? aan.filter(Boolean) : [aan].filter(Boolean);
  if (ontvangers.length === 0) return;

  try {
    await resend.emails.send({
      from: VERZENDADRES,
      to: ontvangers,
      subject: onderwerp,
      html,
    });
  } catch {
    // E-mail is een nice-to-have bij een boeking, geen kritiek pad — een
    // mislukte verzending mag de boeking zelf niet laten falen.
  }
}
