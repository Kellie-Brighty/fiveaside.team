// Phase 3: Talent Pool - Discover and browse player profiles
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { searchPlayerProfiles } from "../services/playerProfileService";
import { hasPermission } from "../utils/permissions";
import type { PlayerProfile } from "../types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "../types";

const TalentPoolPage: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<
    (PlayerProfile & { user: User })[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Search filters
  const [positionFilter, setPositionFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [minGoalsFilter, setMinGoalsFilter] = useState("");

  useEffect(() => {
    // Check if user has permission to view talent pool
    if (!isLoading && isAuthenticated && currentUser) {
      const canView =
        hasPermission(currentUser.role, "scout_players") ||
        hasPermission(currentUser.role, "view_talent_pool");

      if (!canView) {
        setError("You don't have permission to access the talent pool");
      } else {
        // Load all public profiles on mount
        loadPlayers();
      }
    } else if (!isLoading && !isAuthenticated) {
      setError("Please login to access the talent pool");
    }
  }, [currentUser, isAuthenticated, isLoading]);

  const loadPlayers = async () => {
    if (!currentUser) return;

    try {
      setSearching(true);
      setError(null);

      // Build filters
      const filters: Parameters<typeof searchPlayerProfiles>[0] = {
        isPublic: true, // Only show public profiles
      };

      if (positionFilter) {
        filters.position = positionFilter;
      }
      if (stateFilter) {
        filters.state = stateFilter;
      }
      if (minGoalsFilter) {
        filters.minGoals = parseInt(minGoalsFilter);
      }

      // Search for public player profiles
      const profiles = await searchPlayerProfiles(filters);

      // Load user data for each profile
      const playersWithUsers = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const userDoc = await getDoc(doc(db, "users", profile.userId));
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              return { ...profile, user: userData };
            }
            return null;
          } catch (error) {
            console.error(`Error loading user for profile ${profile.id}:`, error);
            return null;
          }
        })
      );

      // Filter out null results
      setPlayers(
        playersWithUsers.filter((p) => p !== null) as (PlayerProfile & {
          user: User;
        })[]
      );
    } catch (error) {
      console.error("Error loading players:", error);
      setError("Failed to load players. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPlayers();
  };

  const handleClearFilters = () => {
    setPositionFilter("");
    setStateFilter("");
    setMinGoalsFilter("");
    loadPlayers();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Talent Pool</h1>
        <p className="text-gray-400">
          Discover and browse public player profiles
        </p>
      </div>

      {/* Search Filters */}
      <div className="bg-dark-lighter rounded-xl shadow-xl p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Position
              </label>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
              >
                <option value="">All Positions</option>
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Defender">Defender</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Forward">Forward</option>
                <option value="Winger">Winger</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., Ondo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Min Goals
              </label>
              <input
                type="number"
                value={minGoalsFilter}
                onChange={(e) => setMinGoalsFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., 10"
                min="0"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={searching}
                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-3 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {!searching && players.length === 0 && (
        <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
          <p className="text-gray-400">No players found matching your criteria.</p>
          <p className="text-gray-500 text-sm mt-2">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}

      {!searching && players.length > 0 && (
        <>
          <div className="mb-4">
            <p className="text-gray-400">
              Found {players.length} player{players.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/player/${player.userId}`)}
              >
                {/* Player Image */}
                <div className="aspect-video bg-gray-800 relative">
                  <img
                    src={
                      player.user.profileImage ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        player.user.name
                      )}&background=6366f1&color=fff&size=256`
                    }
                    alt={player.user.name}
                    className="w-full h-full object-cover"
                  />
                  {player.position && (
                    <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-medium">
                      {player.position}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {player.user.name}
                  </h3>
                  {player.user.location && (
                    <p className="text-gray-400 text-sm mb-3">
                      {player.user.location.city}
                      {player.user.location.state &&
                        `, ${player.user.location.state}`}
                    </p>
                  )}

                  {/* Stats Preview */}
                  {player.stats && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-dark p-2 rounded text-center">
                        <p className="text-xs text-gray-400">Goals</p>
                        <p className="text-lg font-bold text-white">
                          {player.stats.goals || 0}
                        </p>
                      </div>
                      <div className="bg-dark p-2 rounded text-center">
                        <p className="text-xs text-gray-400">Assists</p>
                        <p className="text-lg font-bold text-white">
                          {player.stats.assists || 0}
                        </p>
                      </div>
                      <div className="bg-dark p-2 rounded text-center">
                        <p className="text-xs text-gray-400">Matches</p>
                        <p className="text-lg font-bold text-white">
                          {player.stats.matchesPlayed || 0}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Physical Attributes */}
                  {(player.height || player.weight || player.preferredFoot) && (
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      {player.height && <span>{player.height}cm</span>}
                      {player.weight && <span>{player.weight}kg</span>}
                      {player.preferredFoot && (
                        <span className="capitalize">
                          {player.preferredFoot} foot
                        </span>
                      )}
                    </div>
                  )}

                  {/* View Profile Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/player/${player.userId}`);
                    }}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TalentPoolPage;

