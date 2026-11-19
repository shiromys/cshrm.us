import { NextRequest, NextResponse } from "next/server";
import { db, supportTickets } from "@/lib/db";
import { mailercloud } from "@/lib/email/mailercloud";

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const fromAddress = process.env.MAILERCLOUD_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "info@cloudsourcehrm.us";
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.cloudsourcehrm.us";

    // ── 1. Create support ticket in DB ────────────────────────────────────────
    const [ticket] = await db.insert(supportTickets).values({
      userId:         null,
      source:         "contact_form",
      submitterName:  name.trim(),
      submitterEmail: email.trim().toLowerCase(),
      subject:        subject.trim(),
      body:           message.trim(),
    }).returning();

    // ── 2. Notify internal support inbox ─────────────────────────────────────
    await mailercloud.sendOne({
      to:       "info@cloudsourcehrm.us",
      toName:   "CloudSourceHRM Support",
      fromName: "CloudSourceHRM Contact Form",
      replyTo:  email,
      subject:  `[Support #${ticket.id.slice(0, 8).toUpperCase()}] ${subject}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Ticket ID:</strong> ${ticket.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br>")}</p>
        <p><a href="${appUrl}/admin/support/${ticket.id}">View ticket in admin panel →</a></p>
      `,
    }).catch((e) => console.error("[contact] Internal notification failed:", e));

    // ── 3. Auto-reply to sender ───────────────────────────────────────────────
    await mailercloud.sendOne({
      to:       email,
      toName:   name,
      fromName: "CloudSourceHRM Support",
      replyTo:  fromAddress,
      subject:  `We received your message — CloudSourceHRM [#${ticket.id.slice(0, 8).toUpperCase()}]`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0;">
            <p style="color:white;margin:0;font-size:14px;font-weight:600;">CloudSourceHRM Support</p>
          </div>
          <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <p>Hi ${name},</p>
            <p>Thanks for reaching out! We've received your message and will get back to you within 1–2 business days.</p>
            <p style="font-size:12px;color:#64748b;">Your ticket reference: <strong>#${ticket.id.slice(0, 8).toUpperCase()}</strong></p>
            <div style="background:#f8fafc;border-left:3px solid #e2e8f0;padding:16px;margin:16px 0;border-radius:0 4px 4px 0;color:#64748b;">
              <p style="margin:0 0 8px;font-weight:600;">${subject}</p>
              <p style="margin:0;">${message.replace(/\n/g, "<br>")}</p>
            </div>
            <p>Best regards,<br/>The CloudSourceHRM Team<br/>SHIRO Technologies LLC</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
            <p style="font-size:11px;color:#94a3b8;text-align:center;">
              CloudSourceHRM · <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
            </p>
          </div>
        </div>
      `,
    }).catch((e) => console.error("[contact] Auto-reply failed:", e));

    return NextResponse.json({ ok: true, ticketId: ticket.id }, { status: 200 });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
