"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { 
  OrganizerEventSummary, 
  OrganizerAttendeeItem 
} from "@/types/organizer";
import {
  Users,
  Search,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  GraduationCap,
  Crown,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface OrganizerRegistrationsViewProps {
  event: OrganizerEventSummary;
  initialAttendees: OrganizerAttendeeItem[];
}

export function OrganizerRegistrationsView({
  event,
  initialAttendees,
}: OrganizerRegistrationsViewProps) {
  const [attendees, setAttendees] = React.useState<OrganizerAttendeeItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [expandedTeamId, setExpandedTeamId] = React.useState<string | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  // Filtered attendees
  const filtered = React.useMemo(() => {
    return attendees.filter((a) => {
      const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
      const matchesType = typeFilter === "ALL" || a.type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        q === "" ||
        a.user.name.toLowerCase().includes(q) ||
        a.user.username.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.team && a.team.name.toLowerCase().includes(q));

      return matchesStatus && matchesType && matchesQuery;
    });
  }, [attendees, statusFilter, typeFilter, searchQuery]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/organizer/events/${event.id}/export`);
      if (!res.ok) {
        throw new Error("Failed to export registrations CSV.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.slug}-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmedCount = attendees.filter((a) => a.status === "CONFIRMED").length;
  const waitlistedCount = attendees.filter((a) => a.status === "WAITLISTED").length;
  const cancelledCount = attendees.filter((a) => a.status === "CANCELLED").length;
  const teamCount = attendees.filter((a) => a.type === "TEAM" && a.status === "CONFIRMED").length;

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1">
          <Link href="/organizer/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-500 pl-0 hover:pl-1 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Attendee Roster: {event.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {event.location} • {new Date(event.startDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCsv}
            disabled={isExporting || attendees.length === 0}
            size="sm"
            className="gap-2 font-bold shadow-sm"
          >
            <Download className="w-4 h-4" /> {isExporting ? "Generating CSV..." : "Export Roster (CSV)"}
          </Button>

          <Link href={`/events/${event.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> Public Page
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Confirmed Attendees
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {confirmedCount}
          </div>
          <p className="text-[11px] text-slate-500">
            {event.capacity - event.registeredCount} spots remaining before waitlist
          </p>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Waitlisted Students
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {waitlistedCount}
          </div>
          <p className="text-[11px] text-slate-500">Auto-promoted if spots open</p>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Participating Squads
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {teamCount}
          </div>
          <p className="text-[11px] text-slate-500">Team registrations</p>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Cancelled Registrations
          </div>
          <div className="text-2xl font-extrabold text-slate-400">
            {cancelledCount}
          </div>
          <p className="text-[11px] text-slate-500">Released back to capacity</p>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendee, username, email, squad..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="INDIVIDUAL">Solo Participants</option>
              <option value="TEAM">Squads</option>
            </select>
          </div>
        </div>
      </div>

      {/* ATTENDEE ROSTER TABLE */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center space-y-3 border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No attendees match the criteria
          </h3>
          <p className="text-xs text-slate-500">
            {searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
              ? "Try resetting your search or filter options."
              : "No registrations have been submitted for this event yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isConfirmed = item.status === "CONFIRMED";
            const isWaitlisted = item.status === "WAITLISTED";
            const isCancelled = item.status === "CANCELLED";
            const isTeam = item.type === "TEAM";
            const isExpanded = expandedTeamId === item.id;

            return (
              <Card
                key={item.id}
                className="p-4 sm:p-5 border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.user.name}
                      </span>
                      <span className="text-xs text-slate-500">@{item.user.username}</span>

                      {/* Status Badge */}
                      <Badge
                        variant={isConfirmed ? "success" : isWaitlisted ? "warning" : "outline"}
                      >
                        {item.status}
                      </Badge>

                      {/* Type Badge */}
                      <Badge variant="outline" className={isTeam ? "border-blue-400 text-blue-600 dark:text-blue-400" : ""}>
                        {isTeam ? "Squad Registration" : "Solo"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {item.user.email}
                      </span>
                      {item.user.college && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" /> {item.user.college}
                        </span>
                      )}
                      <span>• Registered on {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="text-right">
                      <span className="text-slate-400">Reserved Spots:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.spots} {item.spots === 1 ? "seat" : "seats"}
                      </p>
                    </div>

                    {isTeam && item.team && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedTeamId(isExpanded ? null : item.id)}
                        className="gap-1 text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" /> Hide Squad
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" /> View Squad ({item.team.members.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {item.notes && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Notes from Attendee:</span>{" "}
                    {item.notes}
                  </div>
                )}

                {/* SQUAD MEMBERS DRAWER */}
                {isTeam && item.team && isExpanded && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        Squad: {item.team.name}
                      </span>
                      <span className="text-slate-400">
                        {item.team.members.length} participating members
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {item.team.members.map((mem) => (
                        <div
                          key={mem.userId}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{mem.name}</p>
                            <p className="text-[11px] text-slate-400">@{mem.username}</p>
                          </div>
                          {mem.role === "LEADER" ? (
                            <Badge variant="default" className="gap-1 text-[10px]">
                              <Crown className="w-3 h-3 text-amber-400" /> Leader
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Member
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
