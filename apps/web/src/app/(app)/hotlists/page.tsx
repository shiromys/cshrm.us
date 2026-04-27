"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Eye, Send, Users } from "lucide-react";

export default function HotlistsPage() {
  const { data: hotlists = [], isLoading } = useQuery({
    queryKey: ["hotlists"],
    queryFn: async () => {
      const res = await fetch("/api/v1/hotlists");
      if (!res.ok) throw new Error("Failed to load hotlists");
      return res.json();
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hotlists</h1>
          <p className="text-muted-foreground">Generate and send candidate hotlists to employers</p>
        </div>
        <Link href="/hotlists/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" />New Hotlist</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : hotlists.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hotlists yet. Add candidates via Excel upload, form entry, or copy-paste.</p>
            <Link href="/hotlists/new"><Button>Create Hotlist</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {hotlists.map((h: Record<string, unknown>) => (
            <Card key={h.id as string}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{h.name as string}</h3>
                      <Badge variant={h.status === "sent" ? "success" : "outline"}>{h.status as string}</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{h.totalEntries as number} entries</span>
                      <span>Columns: {(h.visibleColumns as string[]).join(", ")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/hotlists/${h.id}`}>
                      <Button size="sm" variant="outline"><Eye className="w-3 h-3 mr-1" />Manage</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
