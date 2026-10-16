"use client";

import * as React from "react";
import Link from "next/link";
import { EventItem } from "@/types/event";
import { SafeUser } from "@/types/auth";
import { RegistrationItem } from "@/types/registration";
import { TeamItem } from "@/types/team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  Crown, 
  LogOut, 
  ArrowRight,
  ExternalLink,
  Sparkles
} from "lucide-react";

export interface EventRegistrationCardProps {
  event: EventItem;
  currentUser: SafeUser | null;
  initialRegistration: RegistrationItem | null;
  userTeams: TeamItem[];
}

export function EventRegistrationCard({
  event,
  currentUser,
  initialRegistration,
  userTeams,
}: EventRegistrationCardProps) {
  const [registration, setRegistration] = React.useState<RegistrationItem | null>(initialRegistration);
  const [selectedType, setSelectedType] = React.useState<"INDIVIDUAL" | "TEAM">(
    event.isTeamEvent && event.minTeamSize > 1 ? "TEAM" : "INDIVIDUAL"
  );
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>(
    userTeams.length > 0 ? userTeams[0].id : ""
  );
  const [notes, setNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false);

  const isDeadlinePassed = new Date() > new Date(event.registrationDeadline);
  const spotsRemaining = Math.max(0, event.capacity - event.registeredCount);
  const isFull = spotsRemaining <= 0;

  // Selected team object if registering as team
  const selectedTeam = React.useMemo(() => {
    return userTeams.find((t) => t.id === selectedTeamId) || null;
  }, [userTeams, selectedTeamId]);

  // Is selected team size valid?
  const isTeamSizeValid = React.useMemo(() => {
    if (!selectedTeam) return false;
    return (
      selectedTeam.members.length >= event.minTeamSize &&
      selectedTeam.members.length <= event.maxTeamSize
    );
  }, [selectedTeam, event.minTeamSize, event.maxTeamSize]);

  // Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser) return;

    if (selectedType === "TEAM") {
      if (!selectedTeam) {
        setErrorMsg("Please select a team to register.");
        return;
      }
      if (!isTeamSizeValid) {
        setErrorMsg(
          `Team must have between ${event.minTeamSize} and ${event.maxTeamSize} members. Current size: ${selectedTeam.members.length}.`
        );
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          teamId: selectedType === "TEAM" ? selectedTeamId : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete registration.");
      }

      setRegistration(data.registration);
      setSuccessMsg(data.message || "Registration confirmed!");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to register.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Cancellation
  const handleCancel = async () => {
    if (!registration) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/registrations/${registration.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel registration.");
      }

      setRegistration(null);
      setIsCancelConfirmOpen(false);
      setSuccessMsg("Registration cancelled successfully. Your capacity spot has been released.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to cancel registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {successMsg && (
        <Alert variant="success" className="animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" className="animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 mr-2" />
          {errorMsg}
        </Alert>
      )}

      {/* STATE 1: ALREADY REGISTERED */}
      {registration && registration.status !== "CANCELLED" ? (
        <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                  {registration.status === "CONFIRMED" ? "You Are Registered!" : "You Are on the Waitlist"}
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {registration.status === "CONFIRMED"
                  ? "Your spot has been reserved in this event."
                  : "You will be promoted automatically if capacity opens."}
              </p>
            </div>
            <Badge variant={registration.status === "CONFIRMED" ? "success" : "warning"}>
              {registration.status}
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Format:</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {registration.type === "TEAM" ? "Team Participation" : "Solo Participant"}
              </span>
            </div>

            {registration.team && (
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Squad:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {registration.team.name} ({registration.team.members.length} members)
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">Reserved Spots:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {registration.spots} {registration.spots === 1 ? "seat" : "seats"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Registered On:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {new Date(registration.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Cancel Registration Option */}
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={isLoading}
              className="w-full text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-950 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Cancel Registration
            </Button>
          </div>
        </div>
      ) : /* STATE 2: NOT LOGGED IN */
      !currentUser ? (
        <div className="space-y-3">
          <Link href={`/login?returnUrl=/events/${event.slug}`} className="block w-full">
            <Button size="lg" className="w-full gap-2 shadow-md font-semibold">
              <UserCheck className="w-4 h-4" /> Log in to Register
            </Button>
          </Link>
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
            Student account required to verify eligibility and reserve your spot.
          </p>
        </div>
      ) : /* STATE 3: LOGGED IN AS ORGANIZER / ADMIN */
      currentUser.role !== "STUDENT" ? (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-1 text-center">
          <ShieldCheck className="w-4 h-4 mx-auto text-amber-600" />
          <p className="font-semibold">Organizer Account Active</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            Organizers cannot register as attendee participants. Use a student account to test registrations.
          </p>
        </div>
      ) : /* STATE 4: DEADLINE PASSED */
      isDeadlinePassed ? (
        <div className="space-y-2 text-center">
          <Button size="lg" disabled className="w-full bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed">
            Registration Closed
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The deadline for this event was {new Date(event.registrationDeadline).toLocaleDateString()}.
          </p>
        </div>
      ) : (
        /* STATE 5: ACTIVE REGISTRATION FORM */
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Capacity notice if full */}
          {isFull && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Event Capacity Reached</p>
                <p className="text-[11px]">
                  Registering will place you on the priority waitlist. You will be automatically enrolled if spots open up.
                </p>
              </div>
            </div>
          )}

          {/* Participation Mode Selection */}
          {event.isTeamEvent && event.minTeamSize === 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Participation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType("INDIVIDUAL")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedType === "INDIVIDUAL"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Solo Participant
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("TEAM")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedType === "TEAM"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Register Team
                </button>
              </div>
            </div>
          )}

          {/* Team Selection Section */}
          {selectedType === "TEAM" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Team (Leader only)</span>
                <Link href="/teams" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                  Manage Teams
                </Link>
              </label>

              {userTeams.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                  <p>You have no squads where you are the Team Leader.</p>
                  <Link href="/teams">
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Go to Team Hub to Form Squad
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {userTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.members.length} members)
                      </option>
                    ))}
                  </select>

                  {/* Team validation summary */}
                  {selectedTeam && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Roster Size:</span>
                        <span className={`font-bold ${isTeamSizeValid ? "text-emerald-600" : "text-amber-600"}`}>
                          {selectedTeam.members.length} members (Required: {event.minTeamSize}-{event.maxTeamSize})
                        </span>
                      </div>
                      {!isTeamSizeValid && (
                        <p className="text-red-500 font-medium">
                          Size mismatch: Adjust your squad in Team Hub before registering.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            type="submit"
            size="lg"
            disabled={
              isLoading ||
              (selectedType === "TEAM" && (!selectedTeam || !isTeamSizeValid))
            }
            className="w-full gap-2 shadow-md font-bold"
          >
            {isLoading ? (
              "Processing Registration..."
            ) : isFull ? (
              <>
                <Clock className="w-4 h-4" /> Join Event Waitlist
              </>
            ) : selectedType === "TEAM" ? (
              <>
                <Users className="w-4 h-4" /> Register Team ({selectedTeam?.members.length || 0} spots)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Register Solo
              </>
            )}
          </Button>
        </form>
      )}

      {/* CANCEL CONFIRMATION DIALOG */}
      <Dialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Cancel Event Registration?"
        description="Are you sure you want to cancel your registration? Your reserved spot will be immediately released to waitlisted students."
      >
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCancelConfirmOpen(false)}
            disabled={isLoading}
          >
            Keep Registration
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? "Cancelling..." : "Yes, Cancel Registration"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
