import type { RequirementInput } from "@/lib/schemas";

// ── Label helpers ────────────────────────────────────────────────────────────

function workSettingLabel(v: string) {
  return { remote: "Remote", onsite: "On-Site", hybrid: "Hybrid" }[v] ?? v;
}
function hireTypeLabel(v: string) {
  return { direct_hire: "Direct Hire", contract: "Contract" }[v] ?? v;
}
function positionTypeLabel(v: string) {
  return { full_time: "Full Time", part_time: "Part Time" }[v] ?? v;
}
function payFreqLabel(v: string) {
  return { annual: "Annual", hourly: "Hourly" }[v] ?? v;
}
function travelLabel(v: string) {
  return (
    {
      no_travel:  "No Travel",
      up_to_10:   "Up to 10%",
      up_to_25:   "Up to 25%",
      up_to_50:   "Up to 50%",
      up_to_75:   "Up to 75%",
      up_to_100:  "Up to 100%",
    }[v] ?? v
  );
}

function payDisplay(data: RequirementInput): string {
  const freq = payFreqLabel(data.payFrequency);
  if (data.payType === "depends_on_experience") return `Depends on Experience (${freq})`;
  if (data.payType === "exact" && data.payExact) {
    return `$${data.payExact.toLocaleString()} / ${freq === "Annual" ? "yr" : "hr"}`;
  }
  if (data.payType === "range" && (data.payMin || data.payMax)) {
    const min = data.payMin ? `$${data.payMin.toLocaleString()}` : "—";
    const max = data.payMax ? `$${data.payMax.toLocaleString()}` : "—";
    return `${min} – ${max} / ${freq === "Annual" ? "yr" : "hr"}`;
  }
  return freq;
}

function detailCell(label: string, value: string) {
  return `
    <td style="width:50%;padding:12px 16px;vertical-align:top;">
      <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">${label}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#1e293b;font-weight:600;">${value}</p>
    </td>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateRequirementEmail(
  data: RequirementInput,
  senderName: string,
  senderCompany?: string | null,
): { html: string; subject: string; text: string } {

  // Subject
  const subject = `New ${hireTypeLabel(data.hireType)} Opportunity: ${data.jobTitle} (${workSettingLabel(data.workSetting)})`;

  // Skills pills
  const skillsPills = data.skills.length
    ? data.skills
        .map(
          (s) =>
            `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;margin:3px 4px 3px 0;border:1px solid #bfdbfe;">${s}</span>`,
        )
        .join("")
    : '<span style="color:#94a3b8;font-size:13px;">Not specified</span>';

  const jobIdRow = data.jobId
    ? `<p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">Job ID: ${data.jobId}</p>`
    : "";

  const senderLine = senderCompany
    ? `${senderName} · ${senderCompany}`
    : senderName;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px;">
        <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">New Job Opportunity from</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:500;">${senderLine}</p>
        <h1 style="margin:14px 0 0;color:#ffffff;font-size:26px;font-weight:700;line-height:1.2;">${data.jobTitle}</h1>
        ${jobIdRow}
      </td>
    </tr>

    <!-- ── Details grid ─────────────────────────────────────────────────── -->
    <tr>
      <td style="padding:28px 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;border-collapse:collapse;">
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            ${detailCell("Work Setting", workSettingLabel(data.workSetting))}
            ${detailCell("Hire Type", hireTypeLabel(data.hireType))}
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            ${detailCell("Position Type", positionTypeLabel(data.positionType))}
            ${detailCell("Compensation", payDisplay(data))}
          </tr>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            ${detailCell("Travel Required", travelLabel(data.travelPercentage))}
            ${detailCell("Staffing Firms Welcome", data.allowStaffingFirms ? "Yes" : "No")}
          </tr>
          <tr>
            ${detailCell("Visa Sponsorship", data.sponsorship ? "Available" : "Not Available")}
            <td style="width:50%;padding:12px 16px;vertical-align:top;"></td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Job Description ──────────────────────────────────────────────── -->
    <tr>
      <td style="padding:28px 24px 0;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;border-bottom:2px solid #2563eb;padding-bottom:8px;">Job Description</h2>
        <div style="font-size:14px;line-height:1.7;color:#334155;">
          ${data.jobDescription}
        </div>
      </td>
    </tr>

    <!-- ── Skills ───────────────────────────────────────────────────────── -->
    ${
      data.skills.length
        ? `<tr>
      <td style="padding:24px 24px 0;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;border-bottom:2px solid #2563eb;padding-bottom:8px;">Required Skills</h2>
        <div>${skillsPills}</div>
      </td>
    </tr>`
        : ""
    }

    <!-- ── Reply CTA ─────────────────────────────────────────────────────── -->
    <tr>
      <td style="padding:28px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px 24px;">
          <tr>
            <td>
              <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">Interested or have a matching candidate?</p>
              <p style="margin:6px 0 0;font-size:13px;color:#3b82f6;line-height:1.5;">Simply reply to this email with the candidate's resume and details. We look forward to hearing from you.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Footer ───────────────────────────────────────────────────────── -->
    <tr>
      <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">This requirement was sent via <strong>CloudSourceHRM</strong> on behalf of ${senderLine}.</p>
        <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">{{unsubscribe_link}}</p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

  // Plain text fallback
  const text = [
    `NEW JOB OPPORTUNITY FROM ${senderLine.toUpperCase()}`,
    "=".repeat(50),
    `Position: ${data.jobTitle}`,
    data.jobId ? `Job ID: ${data.jobId}` : null,
    "",
    `Work Setting:    ${workSettingLabel(data.workSetting)}`,
    `Hire Type:       ${hireTypeLabel(data.hireType)}`,
    `Position Type:   ${positionTypeLabel(data.positionType)}`,
    `Compensation:    ${payDisplay(data)}`,
    `Travel:          ${travelLabel(data.travelPercentage)}`,
    `Staffing Firms:  ${data.allowStaffingFirms ? "Welcome" : "Not accepted"}`,
    `Sponsorship:     ${data.sponsorship ? "Available" : "Not available"}`,
    "",
    "JOB DESCRIPTION",
    "-".repeat(30),
    data.jobDescription.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim(),
    "",
    data.skills.length ? `REQUIRED SKILLS\n${"-".repeat(30)}\n${data.skills.join(", ")}` : null,
    "",
    "Interested or have a matching candidate? Reply to this email with the resume and details.",
    "",
    `Sent via CloudSourceHRM on behalf of ${senderLine}.`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { html, subject, text };
}
