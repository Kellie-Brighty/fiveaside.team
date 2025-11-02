// Phase 4: My Clubs Page - For club managers to view and manage their clubs
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getClubsByManager } from "../services/clubService";
import { hasPermission } from "../utils/permissions";
import type { Club } from "../types";

const MyClubsPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClubs = async () => {
      if (!currentUser || isAuthLoading) return;

      // Check permissions
      const canManageClubs =
        hasPermission(currentUser.role, "create_clubs") ||
        hasPermission(currentUser.role, "manage_clubs");

      if (!canManageClubs) {
        setError("You don't have permission to manage clubs");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const managerClubs = await getClubsByManager(currentUser.id);
        setClubs(managerClubs);
      } catch (error) {
        console.error("Error loading clubs:", error);
        setError("Failed to load clubs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadClubs();
    }
  }, [currentUser, isAuthLoading]);

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !hasPermission(currentUser?.role || "player", "create_clubs")) {
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Clubs</h1>
          <p className="text-gray-400 mb-4">
            Manage your registered clubs and register new ones
          </p>
          {/* Phase 4: Register button moved under description for mobile */}
          <Link
            to="/club/register"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm sm:text-base"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Register New Club
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Clubs List */}
      {clubs.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl shadow-xl p-8 sm:p-12 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-gray-500"
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
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            No Clubs Registered Yet
          </h2>
          <p className="text-gray-400 mb-6">
            Get started by registering your first club
          </p>
          <Link
            to="/club/register"
            className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm sm:text-base"
          >
            Register Your First Club
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              {/* Club Header */}
              <div className="p-4 sm:p-6 border-b border-gray-700">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
                      <span className="text-xl sm:text-2xl font-bold text-gray-500">
                        {club.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">{club.name}</h3>
                    {club.shortName && (
                      <p className="text-gray-400 text-xs sm:text-sm">({club.shortName})</p>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {club.registrationNumber ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/50">
                      Verified
                    </span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50">
                      Pending Verification
                    </span>
                  )}
                  {club.isLegitimate ? (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/50">
                      Legitimate
                    </span>
                  ) : (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full border border-red-500/50">
                      Not Legitimate
                    </span>
                  )}
                </div>
              </div>

              {/* Club Details */}
              <div className="p-4 sm:p-6 space-y-3">
                {club.location && (
                  <div>
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-white text-sm truncate">
                      {club.location.city}
                      {club.location.state && `, ${club.location.state}`}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Players</p>
                  <p className="text-white text-sm font-medium">
                    {club.playerIds.length} registered
                  </p>
                </div>
                {club.legitimacyFeePaidUntil && (
                  <div>
                    <p className="text-xs text-gray-400">Legitimacy Valid Until</p>
                    <p className="text-white text-sm">
                      {club.legitimacyFeePaidUntil instanceof Date
                        ? club.legitimacyFeePaidUntil.toLocaleDateString()
                        : club.legitimacyFeePaidUntil
                        ? new Date(club.legitimacyFeePaidUntil).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 sm:p-6 border-t border-gray-700 bg-dark flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link
                  to={`/club/${club.id}`}
                  className="flex-1 px-4 py-2 bg-dark-light border border-gray-700 hover:bg-dark-lighter text-white rounded-lg text-center text-sm"
                >
                  View Profile
                </Link>
                <Link
                  to={`/club/${club.id}/manage`}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-center text-sm"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClubsPage;

