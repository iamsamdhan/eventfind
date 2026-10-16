"use client";

import * as React from "react";
import Link from "next/link";
import { RegistrationItem, RegistrationStatus } from "@/types/registration";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Ticket,
  Compass,
  AlertCircle,
  LogOut,
} from "lucide-react";

interface UserRegistrationsListProps {
  initialRegistrations: RegistrationItem[];
}

export function UserRegistrationsList({ initialRegistrations }: UserRegistrationsListProps) {
  const [registrations, setRegistrations] = React.useState<RegistrationItem[]>(initialRegistrations);
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | RegistrationStatus>("ALL");
  const [cancellingRegistration, setCancellingRegistration] = React.useState<RegistrationItem | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredRegistrations = React.useMemo(() => {
    return registrations.filter((r) => {
      if (statusFilter === "ALL") return true;
      return r.status === statusFilter;
    });
  }, [registrations, statusFilter]);

  const handleCancelRegistration = async () => {
    if (!cancellingRegistration) return;
    setIsCancelling(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/registrations/${cancellingRegistration.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel registration.");
      }

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === cancellingRegistration.id ? { ...r, status: "CANCELLED" as RegistrationStatus } : r
        )
      );

      setFeedback({
        type: "success",
        message: "Registration cancelled successfully. Your reserved spot has been released.",
      });
      setCancellingRegistration(null);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to cancel registration.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const confirmedCount = registrations.filter((r) => r.status === "CONFIRMED").length;
  const waitlistedCount = registrations.filter((r) => r.status === "WAITLISTED").length;
  const cancelledCount = registrations.filter((r) => r.status === "CANCELLED").length;

  return (
    <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg font-bold">My Event Registrations</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Track your confirmed spots, waitlist statuses, and squad participations.
            </CardDescription>
          </div>

          <Link href="/explore">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Compass className="w-3.5 h-3.5" /> Discover More Events
            </Button>
          </Link>
        </div>

        {/* Status Filter Tabs */}
        {registrations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              All ({registrations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "CONFIRMED"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Confirmed ({confirmedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("WAITLISTED")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "WAITLISTED"
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Waitlisted ({waitlistedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CANCELLED")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "CANCELLED"
                  ? "bg-slate-500 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback && (
          <Alert variant={feedback.type === "success" ? "success" : "error"}>
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-2" />
            )}
            {feedback.message}
          </Alert>
        )}

        {filteredRegistrations.length > 0 ? (
          <div className="space-y-3">
            {filteredRegistrations.map((reg) => {
              const eventDate = new Date(reg.event.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const isConfirmed = reg.status === "CONFIRMED";
              const isWaitlisted = reg.status === "WAITLISTED";
              const isCancelled = reg.status === "CANCELLED";

              return (
                <div
                  key={reg.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/events/${reg.event.slug}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-md"
                      >
                        {reg.event.title}
                      </Link>

                      <Badge
                        variant={
                          isConfirmed ? "success" : isWaitlisted ? "warning" : "neutral"
                        }
                      >
                        {reg.status}
                      </Badge>

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {reg.type === "TEAM" ? "Squad Entry" : "Solo"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {eventDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {reg.event.location}
                      </span>
                      {reg.team && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                          <Users className="w-3.5 h-3.5" />
                          Squad: {reg.team.name}
                        </span>
                      )}
                      <span>
                        Reserved: {reg.spots} {reg.spots === 1 ? "seat" : "seats"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link href={`/events/${reg.event.slug}`}>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                        View Event <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>

                    {!isCancelled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancellingRegistration(reg)}
                        className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Ticket className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
            title="No event registrations found"
            description={
              statusFilter === "ALL"
                ? "You haven't registered for any events yet. Explore upcoming hackathons, workshops, and college fests to get started!"
                : `No registrations found with status "${statusFilter}".`
            }
            action={
              <Link href="/explore">
                <Button variant="primary" className="gap-2">
                  <Compass className="w-4 h-4" /> Explore Events
                </Button>
              </Link>
            }
          />
        )}
      </CardContent>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(cancellingRegistration)}
        onClose={() => setCancellingRegistration(null)}
        title="Cancel Event Registration?"
        description={`Are you sure you want to cancel your registration for "${cancellingRegistration?.event.title}"? Your spot will be released immediately to waitlisted students.`}
      >
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCancellingRegistration(null)}
            disabled={isCancelling}
          >
            Keep Registration
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleCancelRegistration}
            isLoading={isCancelling}
          >
            Confirm Cancellation
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
