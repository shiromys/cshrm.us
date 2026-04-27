import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlistEntries, hotlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { normaliseName } from "@/lib/utils";
import * as XLSX from "xlsx";
import { headers } from "next/headers";

// Map common Excel column headers to our fields
const COLUMN_MAP: Record<string, string> = {
  name: "rawName", fullname: "rawName", "full name": "rawName", candidate: "rawName",
  title: "title", role: "title", position: "title", jobtitle: "title",
  skills: "skills", "skill set": "skills", expertise: "skills",
  city: "city", location: "city",
  state: "state", province: "state",
  "work auth": "workAuthorization", "work authorization": "workAuthorization", visa: "workAuthorization",
  availability: "availability", "available": "availability", "start date": "availability",
  rate: "rateSalary", salary: "rateSalary", compensation: "rateSalary",
  summary: "profileSummary", bio: "profileSummary",
  email: "contactEmail", "contact email": "contactEmail",
  phone: "contactPhone", "contact phone": "contactPhone",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotlist = await db.query.hotlists.findFirst({
    where: (h, { and, eq, isNull }) => and(eq(h.id, id), eq(h.userId, session.user.id), isNull(h.deletedAt)),
  });
  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json(ws, { raw: false }) as Record<string, string>[];

  const insertedEntries = [];
  for (const [index, row] of rows.entries()) {
    const entry: Record<string, unknown> = {
      hotlistId: id,
      userId: session.user.id,
      source: "excel_upload",
      sortOrder: index,
    };

    // Map columns
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().trim();
      const mappedField = COLUMN_MAP[normalizedKey];
      if (mappedField && value) {
        if (mappedField === "skills") {
          entry[mappedField] = String(value).split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          entry[mappedField] = String(value).trim();
        }
      }
    }

    if (!entry["rawName"]) continue; // Skip rows without a name

    entry["displayName"] = normaliseName(entry["rawName"] as string);

    const [e] = await db.insert(hotlistEntries).values(entry as Parameters<typeof db.insert>[1]).returning();
    insertedEntries.push(e);
  }

  return NextResponse.json({ imported: insertedEntries.length, total: rows.length });
}
