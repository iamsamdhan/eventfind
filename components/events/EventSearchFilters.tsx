"use client";

import * as React from "react";
import { EventCategory, EventFormat, EventSortOption } from "@/types/event";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EventSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: EventCategory | "ALL";
  onCategoryChange: (category: EventCategory | "ALL") => void;
  selectedFormat: EventFormat | "ALL";
  onFormatChange: (format: EventFormat | "ALL") => void;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedSort: EventSortOption;
  onSortChange: (sort: EventSortOption) => void;
  onResetFilters: () => void;
  locations: string[];
  totalResults: number;
}

export function EventSearchFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedFormat,
  onFormatChange,
  selectedLocation,
  onLocationChange,
  selectedSort,
  onSortChange,
  onResetFilters,
  locations,
  totalResults,
}: EventSearchFiltersProps) {
  const categories: { label: string; value: EventCategory | "ALL" }[] = [
    { label: "All Events", value: "ALL" },
    { label: "Hackathons", value: "HACKATHON" },
    { label: "Workshops", value: "WORKSHOP" },
    { label: "College Fests", value: "FEST" },
    { label: "Competitions", value: "COMPETITION" },
  ];

  const formats: { label: string; value: EventFormat | "ALL" }[] = [
    { label: "All Formats", value: "ALL" },
    { label: "In-Person", value: "IN_PERSON" },
    { label: "Online", value: "ONLINE" },
    { label: "Hybrid", value: "HYBRID" },
  ];

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "ALL" ||
    selectedFormat !== "ALL" ||
    selectedLocation !== "ALL";

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by event title, technology, university, or keyword..."
          className="w-full h-12 pl-12 pr-10 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Clear search query"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>Event Category</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline capitalize font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Reset all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onCategoryChange(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Filter Controls: Format, Location, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {/* Format Selector */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Format
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => onFormatChange(e.target.value as EventFormat | "ALL")}
            className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {formats.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Location Dropdown */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Location
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="ALL">All Locations & Cities</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sort Order
          </label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value as EventSortOption)}
            className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="upcoming">Upcoming Soonest</option>
            <option value="deadline">Registration Deadline Closing</option>
            <option value="popular">Most In-Demand (Capacity)</option>
            <option value="newest">Recently Listed</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{totalResults}</strong> events
          {selectedCategory !== "ALL" && ` in ${selectedCategory.toLowerCase()}s`}
        </span>
        {hasActiveFilters && (
          <span className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
            Filters Active
          </span>
        )}
      </div>
    </div>
  );
}

