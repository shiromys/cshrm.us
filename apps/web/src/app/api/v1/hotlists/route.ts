import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlists } from "@/lib/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { hotlistSchema } from "@/lib/schemas";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(hotlists)
    .where(and(eq(hotlists.userId, session.user.id), isNull(hotlists.deletedAt)))
    .orderBy(desc(hotlists.createdAt));

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = hotlistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [hotlist] = await db.insert(hotlists).values({
    userId: session.user.id,
    ...parsed.data,
  }).returning();

  return NextResponse.json(hotlist, { status: 201 });
}
