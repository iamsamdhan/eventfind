import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlugOrId, getEvents } from "@/lib/events/service";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserRegistrations } from "@/lib/registrations/service";
import { getUserTeams } from "@/lib/teams/service";
import { EventRegistrationCard } from "@/components/events/EventRegistrationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Trophy, 
  ShieldCheck, 
  ChevronRight, 
  Share2, 
  ArrowLeft,
  Building2,
  Laptop,
  Globe2,
  Mail,
  CheckCircle2
} from "lucide-react";

export interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await getEventBySlugOrId(id);
  if (!event) {
    return { title: "Event Not Found — EventFind" };
  }
  return {
    title: `${event.title} — EventFind`,
    description: event.tagline,
  };
}

export async function generateStaticParams() {
  const { events } = await getEvents();
  return events.map((event) => ({
    id: event.slug,
  }));
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await getEventBySlugOrId(id);

  if (!event) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  let userRegistrations: any[] = [];
  let userLeaderTeams: any[] = [];

  if (currentUser) {
    try {
      userRegistrations = await getUserRegistrations(currentUser.id, event.id);
      const allTeams = await getUserTeams(currentUser.id);
      userLeaderTeams = allTeams.filter(
        (t) =>
          t.creatorId === currentUser.id ||
          t.members.some((m) => m.userId === currentUser.id && m.role === "LEADER")
      );
    } catch {
      // Allow graceful fallback if DB is temporarily loading
    }
  }

  const existingReg =
    userRegistrations.find(
      (r) =>
        (r.eventId === event.id || r.event.slug === event.slug) &&
        r.status !== "CANCELLED"
    ) || null;

  const startDateFormatted = new Date(event.startDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const endDateFormatted = new Date(event.endDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const deadlineFormatted = new Date(event.registrationDeadline).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const deadline = new Date(event.registrationDeadline);
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isDeadlinePassed = diffDays < 0;

  const percentFilled = Math.min(
    100,
    Math.round((event.registeredCount / event.capacity) * 100)
  );

  const formatBadges = {
    ONLINE: { label: "Online Event", icon: Laptop },
    IN_PERSON: { label: "In-Person Event", icon: Building2 },
    HYBRID: { label: "Hybrid (Online & In-Person)", icon: Globe2 },
  };

  const FormatIcon = formatBadges[event.format].icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/explore" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Discover Events
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-xs sm:max-w-md">
          {event.title}
        </span>
      </nav>

      {/* Hero Banner Header */}
      <div className={`relative rounded-3xl bg-gradient-to-r ${event.bannerGradient} p-6 sm:p-10 text-white shadow-lg overflow-hidden`}>
        <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-black/30 backdrop-blur-md border border-white/20">
              {event.category}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-900">
              <FormatIcon className="w-3.5 h-3.5 text-blue-600" />
              {formatBadges[event.format].label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/20 text-white/90">
              {event.isTeamEvent ? `Team Event (${event.minTeamSize}-${event.maxTeamSize} members)` : "Individual Participation"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {event.title}
          </h1>

          <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal">
            {event.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white/80" />
              {startDateFormatted}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-white/80" />
              {event.venue || event.location}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Content (2/3) + Sticky Sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Event Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              About This Event
            </h2>
            <div className="prose dark:prose-invert max-w-none text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>

            {/* Tags */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Topics & Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          {/* Eligibility Criteria */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Eligibility & Requirements
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {event.eligibility}
            </p>
          </section>

          {/* Prizes / Awards */}
          {event.prizes && event.prizes.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Prizes & Recognition
                </h3>
              </div>
              <ul className="space-y-2.5">
                {event.prizes.map((prize, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{prize}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Schedule / Timeline */}
          {event.schedule && event.schedule.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Event Schedule
                </h3>
              </div>
              <div className="space-y-3 border-l-2 border-blue-500/30 pl-4 ml-2">
                {event.schedule.map((item, idx) => (
                  <div key={idx} className="relative space-y-1">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {item.time}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Organizer Info */}
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Organized by
            </h3>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                {event.organizer.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  {event.organizer.organization}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lead Organizer: {event.organizer.name}
                </p>
                <div className="pt-1">
                  <a
                    href={`mailto:${event.organizer.contactEmail}`}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" /> {event.organizer.contactEmail}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Registration & Rules Card */}
        <aside className="lg:sticky lg:top-24 space-y-6">
          <Card className="p-6 sm:p-7 shadow-lg border-blue-200/80 dark:border-slate-800 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Registration Status
                </span>
                {isDeadlinePassed ? (
                  <Badge variant="danger">Closed</Badge>
                ) : (
                  <Badge variant="success">Open</Badge>
                )}
              </div>

              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Free Student Registration
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Attendee Capacity</span>
                <span className="font-bold">
                  {event.registeredCount} / {event.capacity}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percentFilled >= 90
                      ? "bg-rose-500"
                      : percentFilled >= 70
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {event.capacity - event.registeredCount} spots remaining before waitlist.
              </p>
            </div>

            {/* Quick Details Checklist */}
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Registration Deadline</p>
                  <p>{deadlineFormatted}</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {diffDays > 0 ? `${diffDays} days left to apply` : "Deadline passed"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Participation Rules</p>
                  <p>
                    {event.isTeamEvent
                      ? `Teams of ${event.minTeamSize} to ${event.maxTeamSize} members required`
                      : "Individual participant"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Location / Format</p>
                  <p>{event.location}</p>
                </div>
              </div>
            </div>

            {/* Registration Action Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <EventRegistrationCard
                event={event}
                currentUser={currentUser}
                initialRegistration={existingReg}
                userTeams={userLeaderTeams}
              />
            </div>
          </Card>

          <div className="text-center">
            <Link href="/explore">
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ArrowLeft className="w-4 h-4" /> Back to Event Discovery
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

