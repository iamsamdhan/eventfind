import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
          <Compass className="w-10 h-10 animate-pulse" />
        </div>
        <div className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 rounded-full mb-3">
          404 Not Found
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          The event, page, or resource you are looking for does not exist, has been removed, or is currently private.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/explore">
            <Button variant="primary" className="w-full sm:w-auto">
              <Compass className="w-4 h-4 mr-2" />
              Discover Events
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
