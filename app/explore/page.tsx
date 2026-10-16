import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Compass, Sparkles, Filter, Calendar, MapPin, Users } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Stage 2 Pipeline Ready
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Discover Student Events
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse hackathons, technical workshops, campus fests, and competitive coding leagues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand" className="text-xs py-1 px-3">Public Feed Scaffold</Badge>
        </div>
      </div>

      {/* Filter preview bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </span>
        <Badge variant="brand" className="cursor-pointer">All Categories</Badge>
        <Badge variant="outline" className="cursor-pointer">Hackathons</Badge>
        <Badge variant="outline" className="cursor-pointer">Workshops</Badge>
        <Badge variant="outline" className="cursor-pointer">College Fests</Badge>
        <Badge variant="outline" className="cursor-pointer">Online</Badge>
        <Badge variant="outline" className="cursor-pointer">In-Person</Badge>
      </div>

      {/* Info notice about Stage 2 */}
      <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-6 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Public Event Discovery Feed
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Full dynamic event search, category/location/date filters, eligibility criteria, and detail views will be activated in Stage 2.
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" size="sm">Back to Home</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

