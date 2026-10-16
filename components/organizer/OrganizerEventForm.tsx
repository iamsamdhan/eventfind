"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EventCategory, EventFormat } from "@/types/event";
import { OrganizerEventSummary } from "@/types/organizer";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Palette,
  ShieldCheck,
  Eye,
} from "lucide-react";

interface OrganizerEventFormProps {
  mode: "create" | "edit";
  initialEvent?: OrganizerEventSummary | null;
}

const GRADIENT_PRESETS = [
  { id: "from-blue-600 via-indigo-600 to-purple-700", label: "Electric Blue & Indigo" },
  { id: "from-purple-600 via-violet-600 to-indigo-800", label: "Deep Violet & Purple" },
  { id: "from-emerald-600 via-green-600 to-teal-700", label: "Emerald & Teal" },
  { id: "from-amber-500 via-orange-600 to-red-600", label: "Amber Sunset & Orange" },
  { id: "from-cyan-600 via-teal-600 to-blue-700", label: "Cyan & Marine Blue" },
  { id: "from-rose-600 via-pink-600 to-purple-700", label: "Rose & Neon Pink" },
];

function formatDateForInput(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  // Pad numbers for YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OrganizerEventForm({ mode, initialEvent }: OrganizerEventFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = React.useState(initialEvent?.title || "");
  const [slug, setSlug] = React.useState(initialEvent?.slug || "");
  const [tagline, setTagline] = React.useState(initialEvent?.tagline || "");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<EventCategory>(initialEvent?.category || "HACKATHON");
  const [format, setFormat] = React.useState<EventFormat>(initialEvent?.format || "IN_PERSON");
  const [location, setLocation] = React.useState(initialEvent?.location || "");
  const [city, setCity] = React.useState(initialEvent?.city || "");
  const [venue, setVenue] = React.useState(initialEvent?.venue || "");
  
  // Default dates: tomorrow, +2 days, and deadline tomorrow - 2h
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 86400000 * 7);
  const defaultEnd = new Date(now.getTime() + 86400000 * 8);
  const defaultDeadline = new Date(now.getTime() + 86400000 * 5);

  const [startDate, setStartDate] = React.useState(
    formatDateForInput(initialEvent?.startDate) || formatDateForInput(defaultStart.toISOString())
  );
  const [endDate, setEndDate] = React.useState(
    formatDateForInput(initialEvent?.endDate) || formatDateForInput(defaultEnd.toISOString())
  );
  const [registrationDeadline, setRegistrationDeadline] = React.useState(
    formatDateForInput(initialEvent?.registrationDeadline) || formatDateForInput(defaultDeadline.toISOString())
  );

  const [capacity, setCapacity] = React.useState<number>(initialEvent?.capacity || 200);
  const [isTeamEvent, setIsTeamEvent] = React.useState<boolean>(initialEvent?.isTeamEvent || false);
  const [minTeamSize, setMinTeamSize] = React.useState<number>(initialEvent?.minTeamSize || 2);
  const [maxTeamSize, setMaxTeamSize] = React.useState<number>(initialEvent?.maxTeamSize || 4);
  const [eligibility, setEligibility] = React.useState(
    initialEvent?.eligibility || "Open to all enrolled students with valid student ID."
  );
  const [tagsInput, setTagsInput] = React.useState("");
  const [prizesInput, setPrizesInput] = React.useState("");
  const [bannerGradient, setBannerGradient] = React.useState(
    initialEvent?.bannerGradient || GRADIENT_PRESETS[0].id
  );
  const [published, setPublished] = React.useState<boolean>(
    initialEvent ? initialEvent.published : true
  );
  const [isClosed, setIsClosed] = React.useState<boolean>(
    initialEvent ? initialEvent.isClosed : false
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // If editing, fetch description & existing tags/prizes if not populated
  React.useEffect(() => {
    if (mode === "edit" && initialEvent) {
      fetch(`/api/organizer/events/${initialEvent.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.event) {
            setDescription(res.event.description || "");
            if (Array.isArray(res.event.tags)) {
              setTagsInput(res.event.tags.join(", "));
            }
            if (Array.isArray(res.event.prizes)) {
              setPrizesInput(res.event.prizes.join("\n"));
            }
          }
        })
        .catch(() => {});
    }
  }, [mode, initialEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic date validation
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const deadlineMs = new Date(registrationDeadline).getTime();

    if (isNaN(startMs) || isNaN(endMs) || isNaN(deadlineMs)) {
      setErrorMsg("Please provide valid dates and times.");
      return;
    }

    if (startMs > endMs) {
      setErrorMsg("Start date must be before or equal to the event end date.");
      return;
    }

    if (deadlineMs > startMs) {
      setErrorMsg("Registration deadline must be before or equal to the event start date.");
      return;
    }

    if (isTeamEvent && minTeamSize > maxTeamSize) {
      setErrorMsg("Minimum team size cannot be greater than maximum team size.");
      return;
    }

    if (mode === "edit" && initialEvent && capacity < initialEvent.registeredCount) {
      setErrorMsg(
        `Cannot reduce event capacity to ${capacity}. There are currently ${initialEvent.registeredCount} confirmed attendees.`
      );
      return;
    }

    // Process tags and prizes
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const prizes = prizesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      tagline: tagline.trim(),
      description: description.trim(),
      category,
      format,
      location: location.trim(),
      city: city.trim(),
      venue: venue.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      capacity,
      isTeamEvent,
      minTeamSize: isTeamEvent ? minTeamSize : 1,
      maxTeamSize: isTeamEvent ? maxTeamSize : 1,
      eligibility: eligibility.trim(),
      tags,
      prizes,
      published,
      isClosed,
      bannerGradient,
    };

    try {
      setIsLoading(true);
      const url = mode === "create" ? "/api/organizer/events" : `/api/organizer/events/${initialEvent?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save event.");
      }

      setSuccessMsg(data.message || "Event saved successfully!");
      setTimeout(() => {
        router.push("/organizer/dashboard");
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMsg && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span>{errorMsg}</span>
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          <span>{successMsg}</span>
        </Alert>
      )}

      {/* SECTION 1: BASIC INFORMATION */}
      <Card className="p-6 space-y-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" /> Basic Event Information
          </h3>
          <p className="text-xs text-slate-500">Define how your event will appear in search and discovery.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., HackPulse Global Hackathon 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Custom URL Slug <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., hackpulse-2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400">Leave blank to auto-generate a unique URL.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="HACKATHON">Hackathon</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="FEST">College Fest</option>
              <option value="COMPETITION">Competition</option>
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tagline <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., 36 hours to build the next generation of AI-driven student solutions."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Event Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed schedule, tracks, eligibility criteria, mentor sessions, and submission requirements..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tags <span className="text-slate-400 font-normal">(Comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="AI, Web Development, Open Source, Cash Prizes"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* SECTION 2: FORMAT & LOCATION */}
      <Card className="p-6 space-y-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Format & Location
          </h3>
          <p className="text-xs text-slate-500">Provide venue details or stream links for attendees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Format <span className="text-red-500">*</span>
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as EventFormat)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="IN_PERSON">In-Person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid (Online & In-Person)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              City / Region <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., San Francisco or Virtual"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Display Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Francisco, CA & Online"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Specific Venue / Platform Link <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Bayview Innovation Quad or Discord / Zoom link"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* SECTION 3: DATES & DEADLINES */}
      <Card className="p-6 space-y-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Schedule & Registration Deadline
          </h3>
          <p className="text-xs text-slate-500">Ensure dates follow the chronological order required by the domain.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Registration Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400">Must be on or before start date.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Event Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Event End Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* SECTION 4: CAPACITY & PARTICIPATION RULES */}
      <Card className="p-6 space-y-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Capacity & Participation Rules
          </h3>
          <p className="text-xs text-slate-500">
            Define attendee caps and whether students must form teams or can participate solo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total Attendee Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={mode === "edit" && initialEvent ? initialEvent.registeredCount : 1}
              max={100000}
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {mode === "edit" && initialEvent && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Floor limit: Cannot reduce below {initialEvent.registeredCount} confirmed attendees.
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Participation Mode
            </label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="participationMode"
                  checked={!isTeamEvent}
                  onChange={() => setIsTeamEvent(false)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Individual Participants Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="radio"
                  name="participationMode"
                  checked={isTeamEvent}
                  onChange={() => setIsTeamEvent(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Team / Squad Event</span>
              </label>
            </div>
          </div>

          {isTeamEvent && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Minimum Team Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maximum Team Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={minTeamSize}
                  max={50}
                  required
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value) || minTeamSize)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Eligibility Requirements
            </label>
            <input
              type="text"
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              placeholder="e.g., Open to all enrolled undergraduate and graduate students with valid college ID."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Prizes & Perks <span className="text-slate-400 font-normal">(One per line)</span>
            </label>
            <textarea
              rows={3}
              value={prizesInput}
              onChange={(e) => setPrizesInput(e.target.value)}
              placeholder="$15,000 Grand Prize Pool&#10;Fast-track venture interviews for top 3 teams&#10;Cloud compute credits for all attendees"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* SECTION 5: APPEARANCE & BANNER GRADIENT */}
      <Card className="p-6 space-y-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" /> Visual Theme & Header Banner
          </h3>
          <p className="text-xs text-slate-500">Pick an accessible banner theme consistent with EventFind.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GRADIENT_PRESETS.map((p) => {
            const isSelected = bannerGradient === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setBannerGradient(p.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className={`h-8 w-full rounded-lg bg-gradient-to-r ${p.id}`} />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* SECTION 6: PUBLICATION & REGISTRATION STATUS */}
      <Card className="p-6 space-y-4 border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Publication & Access Controls
          </h3>
          <p className="text-xs text-slate-500">Configure publication visibility and manual registration gates.</p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Publish Event Publicly
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When unchecked, the event remains in Draft mode and will not appear on public discovery or accept registrations.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isClosed}
              onChange={(e) => setIsClosed(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Manually Close Registration
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check this to immediately halt new attendee registrations regardless of the countdown deadline.
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* ACTIONS */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <Link href="/organizer/dashboard">
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isLoading} className="gap-2 font-bold shadow-md">
            {isLoading ? (
              "Saving Event..."
            ) : mode === "create" ? (
              <>
                <Sparkles className="w-4 h-4" /> Create & Launch Event
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
