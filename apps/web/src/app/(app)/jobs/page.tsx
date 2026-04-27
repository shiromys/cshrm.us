"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, DollarSign, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Job { id: string; title: string; company: string; location: string; type: string; salary: string; postedAt: string; }

export default function JobsPage() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const isSubscribed = user?.chrmnexusSubscribed as boolean ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["chrmnexus-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/v1/chrmnexus/jobs");
      return res.json();
    },
  });

  const jobs: Job[] = data?.jobs ?? [];
  const isStub = data?._stub;

  async function applyForJob(job: Job) {
    if (!isSubscribed) {
      toast.error("CHRMNEXUS add-on required to apply. Upgrade in Settings.");
      return;
    }
    const res = await fetch(`/api/v1/chrmnexus/jobs/${job.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTitle: job.title }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Application failed"); return; }
    toast.success("Application submitted!");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CHRMNEXUS Job Board</h1>
          <p className="text-muted-foreground">Browse open positions from cloudsourcehrm.com</p>
        </div>
        {!isSubscribed && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">View only — <Link href="/settings#chrmnexus" className="underline font-medium">Upgrade to Apply</Link></p>
          </div>
        )}
      </div>

      {isStub && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          {data._message}
        </div>
      )}

      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground">Loading jobs...</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <Badge variant="outline">{job.type}</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!isSubscribed}
                    onClick={() => applyForJob(job)}
                    title={!isSubscribed ? "CHRMNEXUS add-on required" : "Apply for this job"}
                  >
                    {isSubscribed ? "Apply" : <><Lock className="w-3 h-3 mr-1" />Apply</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
