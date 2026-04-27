import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, campaigns } from "@/lib/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { campaignSchema } from "@/lib/schemas";
import { headers } from "next/headers";

async function getUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.userId, user.id), isNull(campaigns.deletedAt)))
    .orderBy(desc(campaigns.createdAt));

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [campaign] = await db.insert(campaigns).values({
    userId: user.id,
    ...parsed.data,
  }).returning();

  return NextResponse.json(campaign, { status: 201 });
}
