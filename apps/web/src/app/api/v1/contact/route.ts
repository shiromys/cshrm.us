import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "no-reply@cloudsourcehrm.us";

    await resend.emails.send({
      from: `CloudSourceHRM <${fromAddress}>`,
      to: "info@cloudsourcehrm.us",
      replyTo: email,
      subject: `[CloudSourceHRM Contact] ${subject}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    // Auto-reply to sender
    await resend.emails.send({
      from: `CloudSourceHRM <${fromAddress}>`,
      to: email,
      subject: "We received your message — CloudSourceHRM",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for reaching out! We&apos;ve received your message and will get back to you within 1–2 business days.</p>
        <p>Here&apos;s a copy of what you sent:</p>
        <blockquote style="border-left:3px solid #e2e8f0;padding-left:12px;color:#64748b;margin:16px 0;">
          <p><strong>${subject}</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </blockquote>
        <p>Best regards,<br/>The CloudSourceHRM Team<br/>SHIRO Technologies LLC</p>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
