"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye } from "lucide-react";

interface CsvBatch {
  id: string;
  originalFilename: string;
  targetTable: string;
  rowCount: number;
  status: string;
  rejectionReason: string | null;
  userId: string;
  submittedAt: string;
  parsedData: Record<string, unknown>[] | null;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  pending_review: "warning",
  approved: "success",
  rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminCsvBatchesPage() {
  const [selectedBatch, setSelectedBatch] = useState<CsvBatch | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: batches = [], isLoading } = useQuery<CsvBatch[]>({
    queryKey: ["admin-csv-batches"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/csv-batches");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/csv-batches/${id}/approve`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (data) => {
      toast.success(`Approved — ${data.inserted} contacts inserted, ${data.skipped} duplicates skipped`);
      qc.invalidateQueries({ queryKey: ["admin-csv-batches"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/v1/admin/csv-batches/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
    },
    onSuccess: () => {
      toast.success("Batch rejected");
      setShowRejectForm(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-csv-batches"] });
    },
    onError: () => toast.error("Failed to reject batch"),
  });

  const pending = batches.filter((b) => b.status === "pending_review");
  const processed = batches.filter((b) => b.status !== "pending_review");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">CSV Import Batches</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve contact import requests from account holders.
        </p>
      </div>

      {selectedBatch && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              Preview: {selectedBatch.originalFilename} ({selectedBatch.rowCount} rows)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              {selectedBatch.parsedData && selectedBatch.parsedData.length > 0 ? (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(selectedBatch.parsedData[0]).map((key) => (
                        <th key={key} className="border px-2 py-1 text-left font-medium text-gray-600">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBatch.parsedData.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="border px-2 py-1 text-gray-700">
                            {String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-sm">No preview data available.</p>
              )}
              {selectedBatch.parsedData && selectedBatch.parsedData.length > 20 && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing first 20 of {selectedBatch.parsedData.length} rows.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">
          Pending Review ({pending.length})
        </h2>
        {isLoading ? (
          <div className="text-gray-500 p-4">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">No pending batches.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((batch) => (
              <Card key={batch.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{batch.originalFilename}</p>
                      <p className="text-sm text-gray-500">
                        {batch.rowCount} rows ·{" "}
                        {batch.targetTable === "employer_contacts" ? "Private Contacts" : "Platform Contacts"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(batch.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(batch.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setShowRejectForm(showRejectForm === batch.id ? null : batch.id)
                        }
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  {showRejectForm === batch.id && (
                    <div className="mt-4 space-y-2">
                      <Textarea
                        placeholder="Reason for rejection (required)…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            rejectMutation.mutate({ id: batch.id, reason: rejectReason })
                          }
                          disabled={!rejectReason.trim() || rejectMutation.isPending}
                        >
                          Confirm Rejection
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowRejectForm(null); setRejectReason(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {processed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800">Processed ({processed.length})</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rows</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {processed.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{batch.originalFilename}</td>
                      <td className="px-4 py-3 text-gray-600">{batch.rowCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[batch.status] ?? "secondary"}>
                          {STATUS_LABEL[batch.status] ?? batch.status}
                        </Badge>
                        {batch.rejectionReason && (
                          <p className="text-xs text-gray-500 mt-1">{batch.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(batch.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
