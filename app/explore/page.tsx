import { Suspense } from "react";
import { getEvents, getUniqueLocations } from "@/lib/events/service";
import { EventExploreFeed } from "@/components/events/EventExploreFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Compass, Sparkles, Filter } from "lucide-react";

export const metadata = {
  title: "Explore Student Events — EventFind",
  description:
    "Discover collegiate hackathons, engineering workshops, campus fests, and competitive coding cups.",
};

function ExploreSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-96 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

export default async function ExplorePage() {
  const { events } = await getEvents();
  const locations = getUniqueLocations();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Live Discovery Feed</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Discover Student Events
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Find hackathons, technical workshops, campus fests, and algorithmic battles. Filter by format, team size, and deadline.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">{events.length}</span> Verified Events Listed
        </div>
      </div>

      {/* Main Interactive Feed */}
      <Suspense fallback={<ExploreSkeleton />}>
        <EventExploreFeed initialEvents={events} locations={locations} />
      </Suspense>
    </div>
  );
}
