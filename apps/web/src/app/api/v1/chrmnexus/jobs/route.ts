import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const CHRMNEXUS_API = process.env.CHRMNEXUS_API_URL ?? "https://www.cloudsourcehrm.com/api";

// Stub job data for when CHRMNEXUS API is not yet live
const STUB_JOBS = [
  { id: "1", title: "Senior React Developer", company: "TechCorp Inc.", location: "Dallas, TX", type: "Full-time", salary: "$120k-$150k", postedAt: new Date().toISOString() },
  { id: "2", title: "Java Backend Engineer", company: "DataSystems LLC", location: "Remote", type: "Contract (C2C)", salary: "$85/hr", postedAt: new Date().toISOString() },
  { id: "3", title: "DevOps Engineer", company: "CloudBase Solutions", location: "Austin, TX", type: "Full-time", salary: "$130k-$160k", postedAt: new Date().toISOString() },
];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  try {
    const res = await fetch(`${CHRMNEXUS_API}/jobs?page=${page}&limit=${limit}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 900 }, // 15-minute cache
    });

    if (!res.ok) throw new Error("CHRMNEXUS API unavailable");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Stub response when API is not yet live
    return NextResponse.json({
      jobs: STUB_JOBS,
      total: STUB_JOBS.length,
      page: 1,
      _stub: true,
      _message: "CHRMNEXUS API is being integrated. Showing sample data.",
    });
  }
}
