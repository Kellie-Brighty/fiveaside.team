// Phase 11: Player Comparison Page - Compare multiple players side by side
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { hasPermission } from "../utils/permissions";
import { getPlayerProfile } from "../services/playerProfileService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { PlayerProfile, User } from "../types";

const PlayerComparisonPage: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [players, setPlayers] = useState<
    (PlayerProfile & { userId: string; user: User })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_playerIds, setPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser && currentState) {
      const canView = hasPermission(currentUser.role, "scout_players");
      if (!canView) {
        setError("You don't have permission to compare players");
      } else {
        // Get player IDs from URL params
        const ids = searchParams.get("players")?.split(",") || [];
        if (ids.length > 0) {
          setPlayerIds(ids);
          loadPlayers(ids);
        }
      }
    } else if (!isLoading && !isAuthenticated) {
      setError("Please login to compare players");
    }
  }, [currentUser, isAuthenticated, isLoading, searchParams, currentState?.id]);

  const loadPlayers = async (ids: string[]) => {
    if (!currentState) {
      setError("State not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const playersData: (PlayerProfile & { userId: string; user: User })[] = [];

      for (const playerId of ids) {
        try {
          // Get player profile
          const profile = await getPlayerProfile(playerId, currentState.id);
          if (!profile) continue;

          // Get user data
          const userDoc = await getDoc(doc(db, "users", playerId));
          if (!userDoc.exists()) continue;

          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          playersData.push({ ...profile, userId: playerId, user: userData });
        } catch (error) {
          console.error(`Error loading player ${playerId}:`, error);
        }
      }

      setPlayers(playersData);
    } catch (error) {
      console.error("Error loading players:", error);
      setError("Failed to load players. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
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

  if (players.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Players to Compare</h2>
          <p className="text-gray-400 mb-4">
            Add players from the Talent Pool to compare them side by side
          </p>
          <button
            onClick={() => navigate("/talent-pool")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Browse Talent Pool
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Player Comparison</h1>
        <p className="text-gray-400">
          Compare {players.length} player{players.length !== 1 ? "s" : ""} side by side
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark border-b border-gray-700">
                <th className="px-4 py-4 text-left text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Attribute
                </th>
                {players.map((player) => (
                  <th
                    key={player.id}
                    className="px-4 py-4 text-center text-sm font-medium text-gray-300 min-w-[200px]"
                  >
                    <div
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => navigate(`/player/${player.userId}`)}
                    >
                      <img
                        src={
                          player.user.profileImage ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            player.user.name
                          )}&background=6366f1&color=fff&size=128`
                        }
                        alt={player.user.name}
                        className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                      />
                      <p className="text-white font-semibold">{player.user.name}</p>
                      {player.position && (
                        <p className="text-gray-400 text-xs">{player.position}</p>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Physical Attributes */}
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Height
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.height ? `${player.height} cm` : "-"}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Weight
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.weight ? `${player.weight} kg` : "-"}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Preferred Foot
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white capitalize">
                    {player.preferredFoot || "-"}
                  </td>
                ))}
              </tr>

              {/* Statistics */}
              <tr className="bg-dark border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Goals
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white font-semibold">
                    {player.stats?.goals || 0}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Assists
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white font-semibold">
                    {player.stats?.assists || 0}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Matches Played
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.stats?.matchesPlayed || 0}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Matches Won
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.stats?.matchesWon || 0}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Win Rate
                </td>
                {players.map((player) => {
                  const matches = player.stats?.matchesPlayed || 0;
                  const wins = player.stats?.matchesWon || 0;
                  const winRate = matches > 0 ? ((wins / matches) * 100).toFixed(1) : "0";
                  return (
                    <td key={player.id} className="px-4 py-3 text-center text-white">
                      {winRate}%
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Yellow Cards
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.stats?.yellowCards || 0}
                  </td>
                ))}
              </tr>
              <tr className="bg-dark border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Red Cards
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white">
                    {player.stats?.redCards || 0}
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="bg-dark-lighter border-b border-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark-lighter z-10">
                  Location
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center text-white text-sm">
                    {player.user.location
                      ? `${player.user.location.city || ""}${player.user.location.state ? `, ${player.user.location.state}` : ""}`
                      : "-"}
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr className="bg-dark">
                <td className="px-4 py-3 text-sm font-medium text-gray-300 sticky left-0 bg-dark z-10">
                  Actions
                </td>
                {players.map((player) => (
                  <td key={player.id} className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/player/${player.userId}`)}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                    >
                      View Profile
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerComparisonPage;

