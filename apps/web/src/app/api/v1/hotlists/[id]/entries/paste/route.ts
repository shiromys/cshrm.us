import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlistEntries } from "@/lib/db";
import type { NewHotlistEntry } from "@cloudsourcehrm/db";
import { normaliseName } from "@/lib/utils";
import { headers } from "next/headers";

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

  const { text, delimiter = "tab", columns = ["name", "title", "skills"] } = await request.json();
  if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const sep = delimiter === "tab" ? "\t" : delimiter === "pipe" ? "|" : ",";
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const insertedEntries = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split(sep).map((p: string) => p.trim());
    const entry: Record<string, unknown> = {
      hotlistId: id,
      userId: session.user.id,
      source: "copy_paste",
      sortOrder: index,
    };

    columns.forEach((col: string, i: number) => {
      if (parts[i] !== undefined && parts[i] !== "") {
        if (col === "skills") {
          entry[col === "skills" ? "skills" : col] = parts[i].split(",").map((s: string) => s.trim());
        } else {
          const fieldMap: Record<string, string> = {
            name: "rawName", title: "title", skills: "skills",
            city: "city", state: "state", availability: "availability",
            rate: "rateSalary", email: "contactEmail", phone: "contactPhone",
          };
          const field = fieldMap[col] ?? col;
          entry[field] = parts[i];
        }
      }
    });

    if (!entry["rawName"]) continue;
    entry["displayName"] = normaliseName(entry["rawName"] as string);

    const [e] = await db.insert(hotlistEntries).values(entry as unknown as NewHotlistEntry).returning();
    insertedEntries.push(e);
  }

  return NextResponse.json({ parsed: insertedEntries.length, lines: lines.length });
}
