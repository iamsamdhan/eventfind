import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Sparkles, 
  Compass, 
  Users, 
  Calendar, 
  Trophy, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function HomePage() {
  const categories = [
    { name: "Hackathons", count: "Rapid prototyping & innovation sprints", icon: Zap, badge: "Popular" },
    { name: "Workshops", count: "Hands-on skill building & masterclasses", icon: GraduationCap, badge: "Learning" },
    { name: "College Fests", count: "Cultural, sports & technical celebrations", icon: Sparkles, badge: "Campus" },
    { name: "Competitions", count: "Case studies, design jams & coding cups", icon: Trophy, badge: "Prizes" },
  ];

  const highlights = [
    {
      title: "Discover Collegiate Events",
      description: "Search and filter hackathons, tech conferences, and campus festivals by category, location, and format.",
      icon: Compass,
    },
    {
      title: "Team Up Seamlessly",
      description: "Create or join squads with unique usernames, manage invites, and register together without friction.",
      icon: Users,
    },
    {
      title: "Trusted Organizer Hub",
      description: "Publish events, configure team requirements, monitor attendee rosters, and manage capacity in real time.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col gap-16 sm:gap-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 bg-gradient-to-b from-blue-50/60 via-slate-50 to-transparent dark:from-blue-950/20 dark:via-slate-950 dark:to-transparent">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide shadow-sm animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EventFind V1 • Student Event Discovery & Registration</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Discover. Connect. Explore.
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              The premier platform for university students to find hackathons, tech competitions, creative workshops, and campus festivals — register solo or with a team.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href="/explore" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 shadow-md shadow-blue-500/20">
                  <Compass className="w-5 h-5" />
                  Explore Events
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-6">
                  Log in to Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Quick feature checklist */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Individual & Team Registrations
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Strict Server-Side Validation
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Organizer Management Hub
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Category Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="brand" className="mb-2">Categories</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore by Opportunity
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Find what fits your semester schedule and team goals.
            </p>
          </div>
          <Link href="/explore">
            <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 dark:text-blue-400">
              View all events <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.name}
                className="hover:border-blue-500/50 hover:shadow-md transition-all duration-200 group cursor-pointer"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral">{cat.badge}</Badge>
                  </div>
                  <CardTitle className="text-base pt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cat.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {cat.count}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Highlights / Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="brand" className="mb-2">Engineered for Students</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Built for Smooth Discovery and Registrations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            No broken links, no chaotic spreadsheets. Everything student event managers and attendees need in one unified ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Visual Brand Asset Verification Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Card className="border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/40 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/30 p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2">
                <Badge variant="brand">Brand Identity</Badge>
                <span className="text-xs text-slate-500">Official Assets</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                EventFind Design Language
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Powered by Plus Jakarta Sans, high-contrast accessible palettes, seamless light & dark modes, and genuine persistence ready for event discovery.
              </p>
            </div>

            <div className="flex items-center gap-6 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="relative h-16 w-16">
                <Image
                  src="/logos/final logo.png.png"
                  alt="EventFind Icon"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">App Icon</p>
                <p className="text-xs text-slate-500">final logo.png.png</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">#2563EB • Plus Jakarta Sans</p>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
