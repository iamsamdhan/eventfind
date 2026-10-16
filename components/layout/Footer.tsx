import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-slate-600 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Slogan */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block">
              <div className="relative h-10 w-44">
                <Image
                  src="/logos/Blue and Black Minimalist Business Brand Logo.png"
                  alt="EventFind"
                  fill
                  className="object-contain object-left dark:brightness-110"
                />
              </div>
            </Link>
            <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
              Discover. Connect. Explore.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The premier student-focused event discovery and registration platform for hackathons, workshops, collegiate fests, and competitive gatherings.
            </p>
          </div>

          {/* Column 1: For Students */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              For Students
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Browse Hackathons
                </Link>
              </li>
              <li>
                <Link href="/explore?format=IN_PERSON" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Campus Fests
                </Link>
              </li>
              <li>
                <Link href="/teams" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Build & Join Teams
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Registration History
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: For Organizers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              For Organizers
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/organizer/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/organizer/events/new" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Host an Event
                </Link>
              </li>
              <li>
                <Link href="/organizer/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Manage Attendees
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Organizer Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  About EventFind
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Terms of Participation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
          <p>© {new Date().getFullYear()} EventFind. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Discover. Connect. Explore. Built for student innovators.
          </p>
        </div>
      </div>
    </footer>
  );
}

