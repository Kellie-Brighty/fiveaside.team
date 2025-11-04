// Phase 3: Talent Pool - Discover and browse player profiles
// Phase 11: Enhanced with advanced filters, watchlist, and saved searches
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { searchPlayerProfiles } from "../services/playerProfileService";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  createSavedSearch,
} from "../services/scoutService";
import { hasPermission } from "../utils/permissions";
import type { PlayerProfile } from "../types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "../types";

const TalentPoolPage: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<
    (PlayerProfile & { user: User; inWatchlist?: boolean })[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [watchlistStatus, setWatchlistStatus] = useState<Record<string, boolean>>({});
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  // Search filters
  const [positionFilter, setPositionFilter] = useState(searchParams.get("position") || "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "");
  const [minGoalsFilter, setMinGoalsFilter] = useState(searchParams.get("minGoals") || "");
  const [minAssistsFilter, setMinAssistsFilter] = useState(searchParams.get("minAssists") || "");
  const [minMatchesFilter, setMinMatchesFilter] = useState(searchParams.get("minMatches") || "");

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

  // Load watchlist status for players
  useEffect(() => {
    if (currentUser && players.length > 0 && currentUser.role === "scout") {
      const loadWatchlistStatus = async () => {
        const status: Record<string, boolean> = {};
        for (const player of players) {
          try {
            const inWatchlist = await isInWatchlist(currentUser.id, player.userId);
            status[player.userId] = inWatchlist;
          } catch (error) {
            console.error(`Error checking watchlist for player ${player.userId}:`, error);
          }
        }
        setWatchlistStatus(status);
      };
      loadWatchlistStatus();
    }
  }, [currentUser, players]);

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
      if (cityFilter) {
        filters.city = cityFilter;
      }
      if (minGoalsFilter) {
        filters.minGoals = parseInt(minGoalsFilter);
      }

      // Update URL params
      const params = new URLSearchParams();
      if (positionFilter) params.append("position", positionFilter);
      if (stateFilter) params.append("state", stateFilter);
      if (cityFilter) params.append("city", cityFilter);
      if (minGoalsFilter) params.append("minGoals", minGoalsFilter);
      if (minAssistsFilter) params.append("minAssists", minAssistsFilter);
      if (minMatchesFilter) params.append("minMatches", minMatchesFilter);
      setSearchParams(params);

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

      // Filter out null results and apply client-side filters
      let filteredPlayers = playersWithUsers.filter((p) => p !== null) as (PlayerProfile & {
        user: User;
      })[];

      // Apply client-side filters (assists, matches)
      if (minAssistsFilter) {
        const minAssists = parseInt(minAssistsFilter);
        filteredPlayers = filteredPlayers.filter(
          (p) => (p.stats?.assists || 0) >= minAssists
        );
      }
      if (minMatchesFilter) {
        const minMatches = parseInt(minMatchesFilter);
        filteredPlayers = filteredPlayers.filter(
          (p) => (p.stats?.matchesPlayed || 0) >= minMatches
        );
      }
      // Filter by city (client-side if not in Firestore query)
      if (cityFilter) {
        filteredPlayers = filteredPlayers.filter(
          (p) => p.user.location?.city?.toLowerCase().includes(cityFilter.toLowerCase())
        );
      }

      setPlayers(filteredPlayers);
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
    setCityFilter("");
    setMinGoalsFilter("");
    setMinAssistsFilter("");
    setMinMatchesFilter("");
    setSearchParams({});
    loadPlayers();
  };

  const handleToggleWatchlist = async (playerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.role !== "scout") return;

    try {
      const isInList = watchlistStatus[playerId];
      if (isInList) {
        await removeFromWatchlist(currentUser.id, playerId);
        setWatchlistStatus({ ...watchlistStatus, [playerId]: false });
        if (window.toast) {
          window.toast.success("Removed from watchlist");
        }
      } else {
        await addToWatchlist(currentUser.id, playerId);
        setWatchlistStatus({ ...watchlistStatus, [playerId]: true });
        if (window.toast) {
          window.toast.success("Added to watchlist");
        }
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      if (window.toast) {
        window.toast.error("Failed to update watchlist");
      }
    }
  };

  const handleSaveSearch = async () => {
    if (!currentUser || currentUser.role !== "scout" || !saveSearchName.trim()) {
      return;
    }

    try {
      await createSavedSearch(currentUser.id, saveSearchName.trim(), {
        position: positionFilter || undefined,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        minGoals: minGoalsFilter ? parseInt(minGoalsFilter) : undefined,
        minAssists: minAssistsFilter ? parseInt(minAssistsFilter) : undefined,
        minMatches: minMatchesFilter ? parseInt(minMatchesFilter) : undefined,
      });
      setShowSaveSearchModal(false);
      setSaveSearchName("");
      if (window.toast) {
        window.toast.success("Search saved successfully");
      }
    } catch (error) {
      console.error("Error saving search:", error);
      if (window.toast) {
        window.toast.error("Failed to save search");
      }
    }
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                City
              </label>
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., Akure"
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Min Assists
              </label>
              <input
                type="number"
                value={minAssistsFilter}
                onChange={(e) => setMinAssistsFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., 5"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Min Matches
              </label>
              <input
                type="number"
                value={minMatchesFilter}
                onChange={(e) => setMinMatchesFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., 10"
                min="0"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            {currentUser?.role === "scout" && (
              <button
                type="button"
                onClick={() => setShowSaveSearchModal(true)}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Save Search
              </button>
            )}
            {currentUser?.role === "scout" && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/scout-dashboard")}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Scout Dashboard
                </button>
                {selectedPlayers.size >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const playersToCompare = Array.from(selectedPlayers).slice(0, 5);
                      navigate(`/player-comparison?players=${playersToCompare.join(",")}`);
                      setSelectedPlayers(new Set());
                    }}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    Compare Selected ({selectedPlayers.size})
                  </button>
                )}
              </>
            )}
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
                className={`bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer relative ${
                  selectedPlayers.has(player.userId) ? "ring-2 ring-primary" : ""
                }`}
                onClick={(e) => {
                  // Allow selection on checkbox click
                  if ((e.target as HTMLElement).closest('.player-checkbox')) {
                    return;
                  }
                  navigate(`/player/${player.userId}`);
                }}
              >
                {/* Phase 11: Selection checkbox for scouts */}
                {currentUser?.role === "scout" && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.userId)}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedPlayers);
                        if (e.target.checked) {
                          newSelected.add(player.userId);
                        } else {
                          newSelected.delete(player.userId);
                        }
                        setSelectedPlayers(newSelected);
                      }}
                      className="player-checkbox w-5 h-5 rounded border-gray-600 bg-dark text-primary focus:ring-primary focus:ring-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
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

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/player/${player.userId}`);
                      }}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium"
                    >
                      View Profile
                    </button>
                    {currentUser?.role === "scout" && (
                      <button
                        onClick={(e) => handleToggleWatchlist(player.userId, e)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          watchlistStatus[player.userId]
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-yellow-600 hover:bg-yellow-700 text-white"
                        }`}
                        title={watchlistStatus[player.userId] ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        {watchlistStatus[player.userId] ? "★" : "☆"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Save Search Modal */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Save Search</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Name
              </label>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="e.g., Top Scorers in Ondo"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveSearch}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
                disabled={!saveSearchName.trim()}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveSearchModal(false);
                  setSaveSearchName("");
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentPoolPage;

