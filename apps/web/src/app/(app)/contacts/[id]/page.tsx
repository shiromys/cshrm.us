"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, Building2, Briefcase } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  email: string;
  contactType: string;
  status: string;
  companyName: string | null;
  title: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  workAuthorization: string | null;
  skills: string[] | null;
  profileSummary: string | null;
  notes: string | null;
  unsubscribed: boolean;
  unsubscribedAt: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  reactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/contacts/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/contacts/${id}/reactivate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Contact reactivated");
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
    onError: () => toast.error("Failed to reactivate contact"),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Contact not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isBounced = !!contact.bouncedAt;
  const location = [contact.city, contact.state].filter(Boolean).join(", ");

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/contacts">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contacts
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{contact.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">{contact.contactType}</Badge>
            {isBounced && <Badge variant="destructive">Bounced</Badge>}
            {contact.unsubscribed && <Badge variant="warning">Unsubscribed</Badge>}
            {!isBounced && !contact.unsubscribed && contact.status === "active" && (
              <Badge variant="success">Active</Badge>
            )}
            {contact.status === "inactive" && !isBounced && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </div>
        {(isBounced || contact.status === "inactive") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
          >
            Reactivate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📞</span>
                <span>{contact.phone}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📍</span>
                <span>{location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Professional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contact.companyName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{contact.companyName}</span>
              </div>
            )}
            {contact.title && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span>{contact.title}</span>
              </div>
            )}
            {contact.workAuthorization && (
              <div>
                <span className="text-gray-500">Work Auth: </span>
                <span className="uppercase">{contact.workAuthorization.replace(/_/g, " ")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {contact.skills && contact.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.skills.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(contact.profileSummary || contact.notes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contact.profileSummary && (
              <p className="text-gray-700 whitespace-pre-wrap">{contact.profileSummary}</p>
            )}
            {contact.notes && (
              <p className="text-gray-600 whitespace-pre-wrap italic">{contact.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {isBounced && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 text-sm text-red-700">
            <strong>Bounced</strong> on {new Date(contact.bouncedAt!).toLocaleDateString()}
            {contact.bounceReason && <> — {contact.bounceReason}</>}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-400">
        Added {new Date(contact.createdAt).toLocaleDateString()} · Updated{" "}
        {new Date(contact.updatedAt).toLocaleDateString()}
        {contact.reactivatedAt && (
          <> · Reactivated {new Date(contact.reactivatedAt).toLocaleDateString()}</>
        )}
      </p>
    </div>
  );
}
