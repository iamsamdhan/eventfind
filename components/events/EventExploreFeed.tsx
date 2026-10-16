"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EventItem, EventCategory, EventFormat, EventSortOption } from "@/types/event";
import { EventCard } from "./EventCard";
import { EventSearchFilters } from "./EventSearchFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SearchX, Sparkles, Compass } from "lucide-react";

export interface EventExploreFeedProps {
  initialEvents: EventItem[];
  locations: string[];
}

export function EventExploreFeed({ initialEvents, locations }: EventExploreFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Validate and sanitize URL parameters safely
  const rawCat = searchParams.get("category")?.toUpperCase();
  const urlCategory: EventCategory | "ALL" =
    rawCat && ["HACKATHON", "WORKSHOP", "FEST", "COMPETITION"].includes(rawCat)
      ? (rawCat as EventCategory)
      : "ALL";

  const rawFormat = searchParams.get("format")?.toUpperCase();
  const urlFormat: EventFormat | "ALL" =
    rawFormat && ["ONLINE", "IN_PERSON", "HYBRID"].includes(rawFormat)
      ? (rawFormat as EventFormat)
      : "ALL";

  const urlQuery = searchParams.get("q") || "";
  const rawLoc = searchParams.get("location");
  const urlLocation = rawLoc && (locations.includes(rawLoc) || rawLoc === "ALL") ? rawLoc : "ALL";
  
  const rawSort = searchParams.get("sort");
  const urlSort: EventSortOption =
    rawSort && ["upcoming", "deadline", "popular", "newest"].includes(rawSort)
      ? (rawSort as EventSortOption)
      : "upcoming";

  const [searchQuery, setSearchQuery] = React.useState(urlQuery);
  const [selectedCategory, setSelectedCategory] = React.useState<EventCategory | "ALL">(urlCategory);
  const [selectedFormat, setSelectedFormat] = React.useState<EventFormat | "ALL">(urlFormat);
  const [selectedLocation, setSelectedLocation] = React.useState(urlLocation);
  const [selectedSort, setSelectedSort] = React.useState<EventSortOption>(urlSort);

  // Synchronize state when URL params change (e.g. from homepage category clicks)
  React.useEffect(() => {
    const nextCat = searchParams.get("category")?.toUpperCase();
    if (nextCat && ["HACKATHON", "WORKSHOP", "FEST", "COMPETITION"].includes(nextCat)) {
      setSelectedCategory(nextCat as EventCategory);
    } else if (nextCat === null) {
      setSelectedCategory("ALL");
    }

    const nextFormat = searchParams.get("format")?.toUpperCase();
    if (nextFormat && ["ONLINE", "IN_PERSON", "HYBRID"].includes(nextFormat)) {
      setSelectedFormat(nextFormat as EventFormat);
    } else if (nextFormat === null) {
      setSelectedFormat("ALL");
    }
  }, [searchParams]);

  // Keep URL search query updated without triggering full page reload
  const updateUrl = React.useCallback(
    (cat: EventCategory | "ALL", format: EventFormat | "ALL", loc: string, sort: EventSortOption, q: string) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (cat !== "ALL") params.set("category", cat.toLowerCase());
      if (format !== "ALL") params.set("format", format.toLowerCase());
      if (loc !== "ALL") params.set("location", loc);
      if (sort !== "upcoming") params.set("sort", sort);

      const queryString = params.toString();
      const newUrl = queryString ? `/explore?${queryString}` : "/explore";
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // Client-side instant multi-faceted filter calculation
  const filteredEvents = React.useMemo(() => {
    let result = [...initialEvents];

    // 1. Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.tagline.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.organizer.organization.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 2. Category
    if (selectedCategory !== "ALL") {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // 3. Format
    if (selectedFormat !== "ALL") {
      result = result.filter((e) => e.format === selectedFormat);
    }

    // 4. Location
    if (selectedLocation !== "ALL") {
      const loc = selectedLocation.toLowerCase();
      result = result.filter(
        (e) =>
          e.city.toLowerCase() === loc ||
          e.location.toLowerCase().includes(loc)
      );
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (selectedSort) {
        case "deadline":
          return new Date(a.registrationDeadline).getTime() - new Date(b.registrationDeadline).getTime();
        case "popular":
          return b.registeredCount / b.capacity - a.registeredCount / a.capacity;
        case "newest":
          return b.id.localeCompare(a.id);
        case "upcoming":
        default:
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    });

    return result;
  }, [initialEvents, searchQuery, selectedCategory, selectedFormat, selectedLocation, selectedSort]);

  const handleCategoryChange = (cat: EventCategory | "ALL") => {
    setSelectedCategory(cat);
    updateUrl(cat, selectedFormat, selectedLocation, selectedSort, searchQuery);
  };

  const handleFormatChange = (fmt: EventFormat | "ALL") => {
    setSelectedFormat(fmt);
    updateUrl(selectedCategory, fmt, selectedLocation, selectedSort, searchQuery);
  };

  const handleLocationChange = (loc: string) => {
    setSelectedLocation(loc);
    updateUrl(selectedCategory, selectedFormat, loc, selectedSort, searchQuery);
  };

  const handleSortChange = (sort: EventSortOption) => {
    setSelectedSort(sort);
    updateUrl(selectedCategory, selectedFormat, selectedLocation, sort, searchQuery);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrl(selectedCategory, selectedFormat, selectedLocation, selectedSort, q);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedFormat("ALL");
    setSelectedLocation("ALL");
    setSelectedSort("upcoming");
    router.replace("/explore", { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Search & Filter Controls */}
      <EventSearchFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        selectedFormat={selectedFormat}
        onFormatChange={handleFormatChange}
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        selectedSort={selectedSort}
        onSortChange={handleSortChange}
        onResetFilters={handleResetFilters}
        locations={locations}
        totalResults={filteredEvents.length}
      />

      {/* Events Results Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="h-7 w-7 text-blue-600 dark:text-blue-400" />}
          title="No events match your criteria"
          description="We couldn't find any events matching your current search or filters. Try adjusting keywords, resetting the category, or broadening your location."
          action={
            <Button variant="primary" onClick={handleResetFilters} className="gap-2">
              <Compass className="w-4 h-4" /> Reset Filters & Browse All
            </Button>
          }
        />
      )}
    </div>
  );
}

