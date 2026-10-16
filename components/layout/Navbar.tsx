"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Menu, X, Compass, Users, LayoutDashboard, Sparkles, User, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: "/explore", label: "Discover Events", icon: Compass },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/organizer/dashboard", label: "Organizer Hub", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none">
              {/* Full logo for dark and light (contains transparent or light background) */}
              <div className="relative h-10 w-44 sm:h-12 sm:w-52 transition-transform group-hover:scale-[1.02]">
                <Image
                  src="/logos/Blue and Black Minimalist Business Brand Logo.png"
                  alt="EventFind — Discover. Connect. Explore."
                  fill
                  priority
                  className="object-contain object-left dark:brightness-110 dark:contrast-125"
                />
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-slate-800">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side controls: Theme toggle & Auth */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-xs">@{user.username}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold uppercase">
                      {user.role}
                    </span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()} 
                  className="text-xs text-slate-500 hover:text-rose-600 gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="md">
                    Log in
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button variant="primary" size="md" className="gap-2 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div data-testid="mobile-nav-drawer" className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-6 space-y-3">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="lg" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      @{user.username}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold uppercase">
                      {user.role}
                    </span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  onClick={() => { setMobileMenuOpen(false); logout(); }} 
                  className="w-full text-rose-600 gap-2"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="lg" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="lg" className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

