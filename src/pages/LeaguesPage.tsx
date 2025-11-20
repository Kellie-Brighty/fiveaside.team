// Phase 5: Leagues Discovery Page - Browse and discover leagues
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { getAllLeagues } from "../services/leagueService";
import type { League } from "../types";

const LeaguesPage: React.FC = () => {
  const { isLoading } = useAuth();
  const { currentState } = useStateContext();
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "registration" | "active" | "completed">("all");

  useEffect(() => {
    const loadLeagues = async () => {
      if (!currentState) {
        setError("State not available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load all leagues (public view)
        const allLeagues = await getAllLeagues(currentState.id);
        setLeagues(allLeagues);
        setFilteredLeagues(allLeagues);
      } catch (error) {
        console.error("Error loading leagues:", error);
        setError("Failed to load leagues. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isLoading) {
      loadLeagues();
    }
  }, [isLoading, currentState?.id]);

  // Apply filters
  useEffect(() => {
    let filtered = [...leagues];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((league) => league.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (league) =>
          league.name.toLowerCase().includes(query) ||
          league.season.toLowerCase().includes(query) ||
          league.description?.toLowerCase().includes(query)
      );
    }

    setFilteredLeagues(filtered);
  }, [leagues, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Browse Leagues
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Discover and join football leagues
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by league name, season..."
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary text-sm sm:text-base"
              />
            </div>

            {/* Status Filter - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="flex gap-2 min-w-max sm:min-w-0">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === "all"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("registration")}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === "registration"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  Registration Open
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === "active"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === "completed"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            {filteredLeagues.length} league{filteredLeagues.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Leagues Grid */}
        {filteredLeagues.length === 0 ? (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-8 sm:p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">No leagues found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "No leagues have been created yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredLeagues.map((league) => {
              const registeredClubs =
                league.divisions?.reduce((sum, div) => sum + div.clubIds.length, 0) || 0;
              const isRegistrationOpen =
                league.status === "registration" &&
                new Date() <= league.registrationDeadline;

              return (
                <Link
                  key={league.id}
                  to={`/leagues/${league.id}`}
                  className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:bg-dark-light transition-colors border border-gray-700 hover:border-primary/50"
                >
                  {/* League Image */}
                  {league.image && (
                    <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-primary/20 to-dark overflow-hidden">
                      <img
                        src={league.image}
                        alt={league.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-white flex-1 pr-2">
                        {league.name}
                      </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${
                        league.status === "active"
                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                          : league.status === "registration"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                          : league.status === "completed"
                          ? "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                      }`}
                    >
                      {league.status}
                    </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-4">
                      Season: {league.season}
                    </p>

                    {league.description && (
                      <p className="text-gray-500 text-xs sm:text-sm mb-4 line-clamp-2">
                        {league.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Clubs</p>
                        <p className="text-white font-semibold text-sm">
                          {registeredClubs}
                          {league.maxClubs && ` / ${league.maxClubs}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Fixtures</p>
                        <p className="text-white font-semibold text-sm">
                          {league.fixtures.length}
                        </p>
                      </div>
                    </div>

                    {isRegistrationOpen && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-yellow-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-yellow-400 text-xs font-medium">
                            Registration open until{" "}
                            {league.registrationDeadline.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">
                          Start: {league.startDate.toLocaleDateString()}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400"
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaguesPage;

