// Phase 4.3: Clubs Discovery Page - Browse and discover clubs
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { getAllClubs } from "../services/clubService";
import type { Club } from "../types";

const ClubsPage: React.FC = () => {
  const { isLoading } = useAuth();
  const { currentState } = useStateContext();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [legitimateFilter, setLegitimateFilter] = useState<"all" | "legitimate" | "unpaid">("all");

  useEffect(() => {
    const loadClubs = async () => {
      if (!currentState) {
        setError("State not available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load all clubs (service will handle filtering)
        const allClubs = await getAllClubs(currentState.id, {
          verified: verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined,
          isLegitimate: legitimateFilter === "legitimate" ? true : legitimateFilter === "unpaid" ? false : undefined,
          city: cityFilter || undefined,
        });

        setClubs(allClubs);
        setFilteredClubs(allClubs);
      } catch (error) {
        console.error("Error loading clubs:", error);
        setError("Failed to load clubs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      loadClubs();
    }
  }, [isLoading, stateFilter, cityFilter, verifiedFilter, legitimateFilter, currentState?.id]);

  // Apply search query filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClubs(clubs);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = clubs.filter((club) => {
      const nameMatch = club.name.toLowerCase().includes(query);
      const shortNameMatch = club.shortName?.toLowerCase().includes(query);
      const descriptionMatch = club.description?.toLowerCase().includes(query);
      const locationMatch =
        club.location?.city?.toLowerCase().includes(query) ||
        club.location?.state?.toLowerCase().includes(query);

      return nameMatch || shortNameMatch || descriptionMatch || locationMatch;
    });

    setFilteredClubs(filtered);
  }, [searchQuery, clubs]);

  // Get unique states and cities for filter dropdowns
  const uniqueStates = Array.from(
    new Set(clubs.map((club) => club.location?.state).filter(Boolean))
  ).sort() as string[];

  const uniqueCities = Array.from(
    new Set(
      clubs
        .filter((club) => !stateFilter || club.location?.state === stateFilter)
        .map((club) => club.location?.city)
        .filter(Boolean)
    )
  ).sort() as string[];

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Browse Clubs
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Discover football clubs and find your next team
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clubs by name, location, or description..."
            className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* State Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
              State
            </label>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCityFilter(""); // Reset city when state changes
              }}
              className="w-full px-3 py-2 rounded-lg bg-dark border border-gray-700 text-white text-xs sm:text-sm focus:outline-none focus:border-primary"
            >
              <option value="">All States</option>
              {uniqueStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
              City
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              disabled={!stateFilter}
              className="w-full px-3 py-2 rounded-lg bg-dark border border-gray-700 text-white text-xs sm:text-sm focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Cities</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
              Verification Status
            </label>
            <select
              value={verifiedFilter}
              onChange={(e) =>
                setVerifiedFilter(
                  e.target.value as "all" | "verified" | "unverified"
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-dark border border-gray-700 text-white text-xs sm:text-sm focus:outline-none focus:border-primary"
            >
              <option value="all">All Clubs</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>

          {/* Legitimate Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
              Legitimacy Status
            </label>
            <select
              value={legitimateFilter}
              onChange={(e) =>
                setLegitimateFilter(
                  e.target.value as "all" | "legitimate" | "unpaid"
                )
              }
              className="w-full px-3 py-2 rounded-lg bg-dark border border-gray-700 text-white text-xs sm:text-sm focus:outline-none focus:border-primary"
            >
              <option value="all">All Clubs</option>
              <option value="legitimate">Legitimate Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400">
            Showing {filteredClubs.length} of {clubs.length} clubs
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Clubs Grid */}
      {filteredClubs.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl shadow-xl p-8 sm:p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            No clubs found
          </h3>
          <p className="text-gray-400 text-sm sm:text-base">
            {searchQuery || stateFilter || cityFilter || verifiedFilter !== "all" || legitimateFilter !== "all"
              ? "Try adjusting your search or filters"
              : "No clubs have been registered yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClubs.map((club) => (
            <Link
              key={club.id}
              to={`/club/${club.id}`}
              className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              {/* Club Logo/Image */}
              <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/20 to-dark overflow-hidden">
                {club.logo ? (
                  <img
                    src={club.logo}
                    alt={club.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-500">
                        {club.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                {/* Status Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  {club.registrationNumber && (
                    <span className="px-2 py-1 bg-green-500/90 text-white text-xs rounded-full font-semibold">
                      Verified
                    </span>
                  )}
                  {club.isLegitimate && (
                    <span className="px-2 py-1 bg-blue-500/90 text-white text-xs rounded-full font-semibold">
                      Legitimate
                    </span>
                  )}
                </div>
              </div>

              {/* Club Info */}
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate">
                  {club.name}
                </h3>
                {club.shortName && (
                  <p className="text-gray-400 text-xs sm:text-sm mb-2">
                    {club.shortName}
                  </p>
                )}
                {club.description && (
                  <p className="text-gray-300 text-xs sm:text-sm mb-3 line-clamp-2">
                    {club.description}
                  </p>
                )}

                {/* Location */}
                {club.location && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="truncate">
                      {club.location.city}
                      {club.location.state && `, ${club.location.state}`}
                    </span>
                  </div>
                )}

                {/* Club Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-4">
                    {club.stats && (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Players</p>
                          <p className="text-sm sm:text-base font-bold text-white">
                            {club.playerIds?.length || 0}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Matches</p>
                          <p className="text-sm sm:text-base font-bold text-white">
                            {club.stats.matchesPlayed || 0}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center text-primary text-xs sm:text-sm font-medium">
                    View Club
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubsPage;

