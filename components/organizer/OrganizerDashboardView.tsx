"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { 
  OrganizerDashboardData, 
  OrganizerEventSummary, 
  EventDomainStatus 
} from "@/types/organizer";
import { SafeUser } from "@/types/auth";
import {
  Calendar,
  PlusCircle,
  Users,
  Search,
  ExternalLink,
  Edit3,
  FileSpreadsheet,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface OrganizerDashboardViewProps {
  initialData: OrganizerDashboardData;
  currentUser: SafeUser;
}

export function OrganizerDashboardView({ initialData, currentUser }: OrganizerDashboardViewProps) {
  const [data, setData] = React.useState<OrganizerDashboardData>(initialData);
  const [activeTab, setActiveTab] = React.useState<"ALL" | EventDomainStatus>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Confirmation modal states
  const [pendingAction, setPendingAction] = React.useState<{
    type: "PUBLISH" | "UNPUBLISH" | "CLOSE" | "REOPEN";
    event: OrganizerEventSummary;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter events
  const filteredEvents = React.useMemo(() => {
    return data.events.filter((ev) => {
      const matchesTab = activeTab === "ALL" || ev.domainStatus === activeTab;
      const matchesSearch =
        searchQuery.trim() === "" ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [data.events, activeTab, searchQuery]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { type, event } = pendingAction;
    setActionLoading(true);
    setFeedbackMsg(null);

    try {
      let endpoint = "";
      let method = "PATCH";
      let body: any = {};

      if (type === "PUBLISH" || type === "UNPUBLISH") {
        endpoint = `/api/organizer/events/${event.id}/publish`;
        body = { published: type === "PUBLISH" };
      } else if (type === "CLOSE" || type === "REOPEN") {
        endpoint = `/api/organizer/events/${event.id}/close`;
        body = { isClosed: type === "CLOSE" };
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update event status.");
      }

      // Refresh dashboard data
      const refreshed = await fetch("/api/organizer/events").then((r) => r.json());
      if (refreshed.success) {
        setData({
          events: refreshed.events,
          stats: refreshed.stats,
        });
      }

      setFeedbackMsg({
        type: "success",
        text: json.message || "Event updated successfully.",
      });
      setPendingAction(null);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to execute action.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Organizer Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentUser.organization || "Independent Organizer"} • Logged in as{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/organizer/events/new">
            <Button size="lg" className="gap-2 shadow-md font-bold">
              <PlusCircle className="w-4 h-4" /> Host New Event
            </Button>
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <Alert variant={feedbackMsg.type} className="animate-in fade-in duration-200">
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2" />
          )}
          <span>{feedbackMsg.text}</span>
        </Alert>
      )}

      {/* METRIC STATS TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-5 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Hosted Events
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {data.stats.totalEvents}
          </div>
          <p className="text-xs text-slate-500">Events in your management roster</p>
        </Card>

        <Card className="p-5 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Public Listings
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {data.stats.activeEvents}
          </div>
          <p className="text-xs text-slate-500">Live on EventFind public discovery</p>
        </Card>

        <Card className="p-5 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Confirmed Attendees
          </div>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {data.stats.totalAttendees}
          </div>
          <p className="text-xs text-slate-500">Total registered seats across events</p>
        </Card>

        <Card className="p-5 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Participating Squads
          </div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {data.stats.totalTeams}
          </div>
          <p className="text-xs text-slate-500">Team registrations confirmed</p>
        </Card>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit overflow-x-auto max-w-full">
          {(["ALL", "PUBLISHED", "DRAFT", "CLOSED", "COMPLETED"] as const).map((tab) => {
            const count =
              tab === "ALL"
                ? data.events.length
                : data.events.filter((e) => e.domainStatus === tab).length;
            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {tab === "ALL" ? "All Events" : tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your events..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* EVENT CARDS LIST */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
            <Calendar className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No matching events found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery || activeTab !== "ALL"
                ? "Try clearing your search query or switching tabs."
                : "You have not created any events yet. Launch your first event listing to start accepting attendee registrations."}
            </p>
          </div>
          <div className="pt-2">
            <Link href="/organizer/events/new">
              <Button size="sm" className="gap-2 shadow-sm font-semibold">
                <PlusCircle className="w-4 h-4" /> Create Your First Event
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const percentFilled = Math.min(
              100,
              Math.round((event.registeredCount / event.capacity) * 100)
            );

            // Domain status badge variant
            const statusConfig = {
              PUBLISHED: {
                label: "PUBLISHED",
                color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200",
              },
              DRAFT: {
                label: "DRAFT",
                color: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
              },
              CLOSED: {
                label: "REGISTRATION CLOSED",
                color: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200",
              },
              COMPLETED: {
                label: "COMPLETED",
                color: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200",
              },
            }[event.domainStatus];

            return (
              <Card
                key={event.id}
                className="overflow-hidden border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow"
              >
                {/* Banner Strip */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${event.bannerGradient}`} />

                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                        <Badge variant="outline">{event.category}</Badge>
                        <Badge variant="outline">{event.format}</Badge>
                        {event.isTeamEvent && (
                          <Badge variant="default" className="bg-blue-600">
                            Teams of {event.minTeamSize}-{event.maxTeamSize}
                          </Badge>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {event.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                        {event.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/organizer/events/${event.id}/registrations`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 text-blue-600" /> Manage Roster
                        </Button>
                      </Link>

                      <Link href={`/organizer/events/${event.id}/edit`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Details Grid & Capacity Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500">Dates:</span>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {new Date(event.startDate).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Until {new Date(event.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">Registration Deadline:</span>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {new Date(event.registrationDeadline).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        {event.isClosed ? "Manually Closed" : "Open for applications"}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {event.city}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {event.location}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-500 mb-1">
                        <span>Capacity:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {event.registeredCount} / {event.capacity} ({percentFilled}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {event.availableSpots} spots remaining
                      </p>
                    </div>
                  </div>

                  {/* Bottom Stats & State Toggles */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {event.confirmedCount} Confirmed
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> {event.waitlistedCount} Waitlisted
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                        <Users className="w-3.5 h-3.5" /> {event.teamRegistrationCount} Squads
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Publish / Unpublish Toggle */}
                      {event.published ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingAction({ type: "UNPUBLISH", event })}
                          className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 gap-1.5"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Unpublish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingAction({ type: "PUBLISH", event })}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 gap-1.5 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> Publish Now
                        </Button>
                      )}

                      {/* Close / Reopen Registration Toggle */}
                      {event.isClosed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingAction({ type: "REOPEN", event })}
                          className="text-xs text-blue-600 dark:text-blue-400 gap-1.5 font-semibold"
                        >
                          <Unlock className="w-3.5 h-3.5" /> Reopen Registrations
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingAction({ type: "CLOSE", event })}
                          className="text-xs text-amber-600 dark:text-amber-400 gap-1.5 font-semibold"
                        >
                          <Lock className="w-3.5 h-3.5" /> Close Registrations
                        </Button>
                      )}

                      {/* Public Preview */}
                      <Link href={`/events/${event.slug}`} target="_blank">
                        <Button size="sm" variant="ghost" className="text-xs gap-1 text-slate-500">
                          <ExternalLink className="w-3.5 h-3.5" /> View Public Page
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      <Dialog
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={
          pendingAction?.type === "UNPUBLISH"
            ? "Unpublish Event Listing?"
            : pendingAction?.type === "PUBLISH"
            ? "Publish Event Publicly?"
            : pendingAction?.type === "CLOSE"
            ? "Close Attendee Registrations?"
            : "Reopen Attendee Registrations?"
        }
        description={
          pendingAction?.type === "UNPUBLISH"
            ? "Unpublishing will move this event back to Draft mode. It will immediately disappear from public search and reject new registrations."
            : pendingAction?.type === "PUBLISH"
            ? "Publishing will immediately surface this event in public discovery and allow verified students to register."
            : pendingAction?.type === "CLOSE"
            ? "Closing registration will block any new registrations regardless of countdown timers or open spots."
            : "Reopening will allow students to resume registering if spots or waitlist capacity are available."
        }
      >
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingAction(null)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={pendingAction?.type === "UNPUBLISH" || pendingAction?.type === "CLOSE" ? "danger" : "primary"}
            onClick={handleConfirmAction}
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : "Confirm Action"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
