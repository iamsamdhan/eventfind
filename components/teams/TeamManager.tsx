"use client";

import * as React from "react";
import Link from "next/link";
import { SafeUser } from "@/types/auth";
import { TeamItem, TeamInvitationItem, TeamMemberItem } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Clock, 
  Calendar, 
  Check, 
  X, 
  LogOut, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";

export interface TeamEventOption {
  id: string;
  slug: string;
  title: string;
  minTeamSize: number;
  maxTeamSize: number;
}

export interface TeamManagerProps {
  currentUser: SafeUser;
  initialTeams: TeamItem[];
  initialInvitations: TeamInvitationItem[];
  teamEvents: TeamEventOption[];
}

export function TeamManager({
  currentUser,
  initialTeams,
  initialInvitations,
  teamEvents,
}: TeamManagerProps) {
  const [teams, setTeams] = React.useState<TeamItem[]>(initialTeams);
  const [invitations, setInvitations] = React.useState<TeamInvitationItem[]>(initialInvitations);
  const [activeTab, setActiveTab] = React.useState<"teams" | "invitations">("teams");
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(
    initialTeams.length > 0 ? initialTeams[0].id : null
  );

  // Sent invitations for the active team
  const [sentInvitations, setSentInvitations] = React.useState<TeamInvitationItem[]>([]);
  const [loadingSentInvs, setLoadingSentInvs] = React.useState(false);

  // Status alerts
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Create Team Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamDesc, setNewTeamDesc] = React.useState("");
  const [newTeamEventId, setNewTeamEventId] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Invite Member Dialog State
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteUsername, setInviteUsername] = React.useState("");
  const [isInviting, setIsInviting] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  // Active selected team object
  const activeTeam = React.useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || (teams.length > 0 ? teams[0] : null);
  }, [teams, selectedTeamId]);

  // Is current user leader of active team?
  const isLeaderOfActiveTeam = React.useMemo(() => {
    if (!activeTeam) return false;
    const membership = activeTeam.members.find((m) => m.userId === currentUser.id);
    return membership?.role === "LEADER";
  }, [activeTeam, currentUser.id]);

  // Auto-clear notification messages after 6 seconds
  React.useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  // Fetch sent invitations whenever active team changes
  const fetchSentInvitations = React.useCallback(async (teamId: string) => {
    try {
      setLoadingSentInvs(true);
      const res = await fetch(`/api/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sentInvitations) {
          setSentInvitations(data.sentInvitations);
        } else {
          setSentInvitations([]);
        }
      }
    } catch {
      setSentInvitations([]);
    } finally {
      setLoadingSentInvs(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTeam?.id) {
      fetchSentInvitations(activeTeam.id);
    } else {
      setSentInvitations([]);
    }
  }, [activeTeam?.id, fetchSentInvitations]);

  // Refresh all teams from server
  const refreshTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTeams(data.teams);
          if (data.teams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(data.teams[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh teams:", err);
    }
  };

  // Refresh received invitations from server
  const refreshInvitations = async () => {
    try {
      const res = await fetch("/api/teams/invitations");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInvitations(data.invitations);
        }
      }
    } catch (err) {
      console.error("Failed to refresh invitations:", err);
    }
  };

  // Handle Team Creation
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newTeamName.trim() || newTeamName.trim().length < 2) {
      setCreateError("Team name must be at least 2 characters.");
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || undefined,
          eventId: newTeamEventId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create team.");
      }

      setTeams((prev) => [data.team, ...prev]);
      setSelectedTeamId(data.team.id);
      setIsCreateOpen(false);
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamEventId("");
      setActionSuccess(`Team "${data.team.name}" created successfully.`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Send Member Invitation
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (!activeTeam) return;
    const cleanUser = inviteUsername.trim().replace(/^@/, "");

    if (!cleanUser || cleanUser.length < 3) {
      setInviteError("Username must be at least 3 characters.");
      return;
    }

    try {
      setIsInviting(true);
      const res = await fetch(`/api/teams/${activeTeam.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send invitation.");
      }

      setSentInvitations((prev) => [data.invitation, ...prev]);
      setIsInviteOpen(false);
      setInviteUsername("");
      setActionSuccess(`Invitation sent to @${data.invitation.invitee.username}.`);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  // Handle Cancel Outgoing Invitation
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel invitation.");
      }

      setSentInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setActionSuccess("Invitation cancelled.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel invitation.");
    }
  };

  // Handle Respond to Received Invitation (Accept / Decline)
  const handleRespondInvitation = async (invitationId: string, action: "ACCEPT" | "DECLINE") => {
    try {
      const res = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to respond to invitation.");
      }

      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));

      if (action === "ACCEPT") {
        setActionSuccess("Invitation accepted! You have joined the team.");
        await refreshTeams();
        setSelectedTeamId(data.teamId);
        setActiveTab("teams");
      } else {
        setActionSuccess("Invitation declined.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to respond to invitation.");
    }
  };

  // Handle Leave or Remove Member
  const handleRemoveMember = async (teamId: string, targetUserId: string) => {
    const isSelf = targetUserId === currentUser.id;
    const confirmPrompt = isSelf
      ? "Are you sure you want to leave this team?"
      : "Are you sure you want to remove this member from the team?";

    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await fetch(`/api/teams/${teamId}?userId=${targetUserId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove member.");
      }

      setActionSuccess(data.message || (isSelf ? "You left the team." : "Member removed."));
      await refreshTeams();

      if (isSelf) {
        setSelectedTeamId(null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>Collegiate Team Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Team Management Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Form squads for hackathons, coordinate with peers, and invite teammates by @username.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 shadow-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" /> Create Team
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <Alert variant="success" className="animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {actionSuccess}
        </Alert>
      )}
      {actionError && (
        <Alert variant="error" className="animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 mr-2" />
          {actionError}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "teams"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Teams</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            {teams.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invitations")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "invitations"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Received Invitations</span>
          {invitations.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white font-bold animate-pulse">
              {invitations.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MY TEAMS */}
      {activeTab === "teams" && (
        <div>
          {teams.length === 0 ? (
            <EmptyState
              icon={<Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />}
              title="No teams joined yet"
              description="Create a team for an upcoming collegiate hackathon or ask a squad leader to invite @${currentUser.username}."
              action={
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" /> Create Your First Team
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Teams Sidebar Master List */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  <span>Your Roster ({teams.length})</span>
                </div>
                <div className="space-y-2">
                  {teams.map((t) => {
                    const isSelected = activeTeam?.id === t.id;
                    const userRole = t.members.find((m) => m.userId === currentUser.id)?.role || "MEMBER";

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeamId(t.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {t.name}
                          </h3>
                          {userRole === "LEADER" ? (
                            <Badge variant="brand" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                              <Crown className="w-3 h-3" /> Leader
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              Member
                            </Badge>
                          )}
                        </div>

                        {t.event && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium line-clamp-1 flex items-center gap-1">
                            <span>•</span> {t.event.title}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{t.members.length} {t.members.length === 1 ? "member" : "members"}</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Team Detail View */}
              {activeTeam && (
                <div className="lg:col-span-8 space-y-6">
                  {/* Team Overview Card */}
                  <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">
                              {activeTeam.name}
                            </CardTitle>
                            {isLeaderOfActiveTeam ? (
                              <Badge variant="brand" className="gap-1">
                                <Crown className="w-3.5 h-3.5" /> You are Team Leader
                              </Badge>
                            ) : (
                              <Badge variant="outline">Member</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
                            Identifier: {activeTeam.slug} • Formed {new Date(activeTeam.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>

                        {/* Top Team Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isLeaderOfActiveTeam ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setInviteError(null);
                                setInviteUsername("");
                                setIsInviteOpen(true);
                              }}
                              className="gap-1.5 font-semibold"
                            >
                              <UserPlus className="w-4 h-4" /> Invite Member
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRemoveMember(activeTeam.id, currentUser.id)}
                              className="gap-1.5"
                            >
                              <LogOut className="w-4 h-4" /> Leave Team
                            </Button>
                          )}
                        </div>
                      </div>

                      {activeTeam.description && (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                          {activeTeam.description}
                        </p>
                      )}
                    </CardHeader>

                    {/* Associated Event Banner */}
                    {activeTeam.event && (
                      <div className="mx-6 mb-6 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Linked Competition Event
                            </div>
                            <Link 
                              href={`/events/${activeTeam.event.slug}`}
                              className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 mt-0.5"
                            >
                              {activeTeam.event.title}
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            </Link>
                          </div>

                          <div className="text-right sm:border-l sm:border-blue-200 dark:sm:border-blue-900/60 sm:pl-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Team Size Constraint</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {activeTeam.members.length} / {activeTeam.event.maxTeamSize} Max
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400">
                              (Min {activeTeam.event.minTeamSize} required)
                            </div>
                          </div>
                        </div>

                        {/* Capacity meter */}
                        <div className="mt-3 w-full bg-blue-100 dark:bg-blue-950 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (activeTeam.members.length / activeTeam.event.maxTeamSize) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Members List Section */}
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Active Team Members ({activeTeam.members.length})</span>
                        </h4>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        {activeTeam.members.map((member) => {
                          const isMemberLeader = member.role === "LEADER";
                          const isSelf = member.userId === currentUser.id;

                          return (
                            <div
                              key={member.id}
                              className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm">
                                  {member.user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                      {member.user.name}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">
                                        You
                                      </span>
                                    )}
                                    {isMemberLeader && (
                                      <Badge variant="brand" className="text-[10px] py-0 px-1.5 gap-1">
                                        <Crown className="w-3 h-3" /> Leader
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span className="font-mono">@{member.user.username}</span>
                                    {member.user.college && (
                                      <>
                                        <span>•</span>
                                        <span>{member.user.college}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Leader Action: Remove Member */}
                              {isLeaderOfActiveTeam && !isMemberLeader && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(activeTeam.id, member.userId)}
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Outgoing Pending Invitations Section */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Outgoing Invitations ({sentInvitations.length})</span>
                          </h4>
                          {isLeaderOfActiveTeam && activeTeam.event && activeTeam.members.length >= activeTeam.event.maxTeamSize && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Team is at maximum capacity
                            </span>
                          )}
                        </div>

                        {loadingSentInvs ? (
                          <div className="p-4 text-center text-xs text-slate-400">Loading invitations...</div>
                        ) : sentInvitations.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            No active pending invitations. {isLeaderOfActiveTeam ? "Use the 'Invite Member' button to recruit peers by username." : ""}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {sentInvitations.map((inv) => (
                              <div
                                key={inv.id}
                                className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {inv.invitee.name}
                                  </span>{" "}
                                  <span className="font-mono text-slate-500">@{inv.invitee.username}</span>
                                  <span className="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Response</span>
                                  <span className="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-slate-400">
                                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {isLeaderOfActiveTeam && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelInvitation(inv.id)}
                                    className="h-7 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 gap-1"
                                  >
                                    <X className="w-3 h-3" /> Cancel
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVED INVITATIONS */}
      {activeTab === "invitations" && (
        <div>
          {invitations.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />}
              title="No pending invitations"
              description={`When a team leader invites @${currentUser.username} to join their squad, the invitation will show up here.`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((inv) => (
                <Card key={inv.id} className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {inv.teamName}
                      </CardTitle>
                      <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 text-xs">
                        Pending
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Invited by <strong className="text-slate-700 dark:text-slate-300">@{inv.inviter.username}</strong> ({inv.inviter.name})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div>Sent: {new Date(inv.createdAt).toLocaleDateString()}</div>
                      <div>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        onClick={() => handleRespondInvitation(inv.id, "ACCEPT")}
                        className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <Check className="w-4 h-4" /> Accept & Join
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondInvitation(inv.id, "DECLINE")}
                        className="w-full gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" /> Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TEAM DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isCreating) {
            setIsCreateOpen(false);
            setCreateError(null);
          }
        }}
        title="Create a New Team"
        description="Form a persistent squad for hackathons, team coding competitions, and academic challenges."
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
          {createError && (
            <Alert variant="error">
              <AlertCircle className="w-4 h-4 mr-2" />
              {createError}
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Team Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Neural Hackers, CodeTitans"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Team Description (Optional)
            </label>
            <Input
              type="text"
              placeholder="Short statement or focus area..."
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              maxLength={300}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Associated Event (Optional)
            </label>
            <select
              value={newTeamEventId}
              onChange={(e) => setNewTeamEventId(e.target.value)}
              disabled={isCreating}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">General / Independent Team (No event restriction)</option>
              {teamEvents.map((ev) => (
                <option key={ev.slug} value={ev.slug}>
                  {ev.title} (Max {ev.maxTeamSize} members)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Attaching an event enforces maximum team size rules during member recruitment.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-2">
              {isCreating ? "Creating Team..." : "Create Team"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* INVITE MEMBER DIALOG */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => {
          if (!isInviting) {
            setIsInviteOpen(false);
            setInviteError(null);
          }
        }}
        title={`Invite Member to ${activeTeam?.name || "Team"}`}
        description="Search by their unique EventFind username to dispatch an invitation."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <Alert variant="error">
              <AlertCircle className="w-4 h-4 mr-2" />
              {inviteError}
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <Input
                type="text"
                placeholder="username (e.g. sarah_hacks)"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                required
                className="pl-8 font-mono"
                minLength={3}
                maxLength={30}
                disabled={isInviting}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              The recipient will receive a pending invitation they can accept from their Team Hub.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting} className="gap-2">
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
