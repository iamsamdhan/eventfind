import Link from "next/link";
import { EventItem } from "@/types/event";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ArrowRight,
  Sparkles,
  Laptop,
  Building2,
  Globe2
} from "lucide-react";

export interface EventCardProps {
  event: EventItem;
  featured?: boolean;
}

export function EventCard({ event, featured }: EventCardProps) {
  const startDate = new Date(event.startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
    ONLINE: { label: "Online", variant: "brand" as const, icon: Laptop },
    IN_PERSON: { label: "In-Person", variant: "success" as const, icon: Building2 },
    HYBRID: { label: "Hybrid", variant: "warning" as const, icon: Globe2 },
  };

  const categoryLabels = {
    HACKATHON: "Hackathon",
    WORKSHOP: "Workshop",
    FEST: "College Fest",
    COMPETITION: "Competition",
  };

  const formatInfo = formatBadges[event.format];
  const FormatIcon = formatInfo.icon;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all duration-200 overflow-hidden">
      <div>
        {/* Card Cover Gradient Header */}
        <div className={`relative h-32 w-full bg-gradient-to-r ${event.bannerGradient} p-4 flex flex-col justify-between text-white overflow-hidden`}>
          {/* Subtle noise/glow background */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
          
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-black/30 backdrop-blur-md text-white border border-white/20">
              {categoryLabels[event.category]}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-900 shadow-sm">
              <FormatIcon className="w-3.5 h-3.5 text-blue-600" />
              {formatInfo.label}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-white/90 font-medium">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-white/80" />
              {event.isTeamEvent ? `Teams (${event.minTeamSize}-${event.maxTeamSize})` : "Individual"}
            </span>

            {event.featured && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-bold">
                <Sparkles className="w-3 h-3 fill-current" /> Featured
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          <Link href={`/events/${event.slug}`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
              {event.title}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {event.tagline}
          </p>

          <div className="space-y-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{startDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Status & CTA */}
      <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2 space-y-3">
        {/* Capacity Progress Bar */}
        <div className="space-y-1 pt-3">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>Capacity</span>
            <span>
              {event.registeredCount} / {event.capacity} ({percentFilled}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
        </div>

        {/* Deadline & Button */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] font-medium">
            {isDeadlinePassed ? (
              <span className="text-rose-500 font-semibold">Registration closed</span>
            ) : diffDays <= 3 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Closes in {diffDays}d
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Closes in {diffDays}d
              </span>
            )}
          </div>

          <Link href={`/events/${event.slug}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs group-hover:border-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Details <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

