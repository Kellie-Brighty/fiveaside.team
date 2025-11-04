// Phase 5: Public League View Page
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getLeague, registerClubForLeague } from "../services/leagueService";
import { getClub, getClubsByManager } from "../services/clubService";
import { hasPermission } from "../utils/permissions";
import LoadingButton from "../components/LoadingButton";
import type { League, Club } from "../types";

const LeagueViewPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [clubs, setClubs] = useState<Array<Club | null>>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "standings" | "fixtures">("overview");
  const [error, setError] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [registeringClub, setRegisteringClub] = useState<string | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  useEffect(() => {
    if (leagueId) {
      loadLeague();
    }
  }, [leagueId]);

  useEffect(() => {
    if (currentUser && league) {
      loadUserClubs();
    }
  }, [currentUser, league]);

  const loadLeague = async () => {
    try {
      setLoading(true);
      setError(null);

      const leagueData = await getLeague(leagueId!);
      if (!leagueData) {
        setError("League not found");
        return;
      }

      setLeague(leagueData);

      // Load club details for standings and roster
      const allClubIds =
        leagueData.divisions?.flatMap((div) => div.clubIds) || [];
      const clubPromises = allClubIds.map((clubId) => getClub(clubId));
      const clubData = await Promise.all(clubPromises);
      setClubs(clubData);
    } catch (error) {
      console.error("Error loading league:", error);
      setError("Failed to load league");
    } finally {
      setLoading(false);
    }
  };

  const loadUserClubs = async () => {
    if (!currentUser) return;

    try {
      const clubs = await getClubsByManager(currentUser.id);
      setUserClubs(clubs);
    } catch (error) {
      console.error("Error loading user clubs:", error);
    }
  };

  const handleRegisterClub = async (clubId: string) => {
    if (!leagueId) return;

    try {
      setRegisteringClub(clubId);
      await registerClubForLeague(leagueId, clubId);
      window.toast?.success("Club registered successfully!");
      await loadLeague();
      await loadUserClubs();
      setShowRegistrationModal(false);
    } catch (error: any) {
      console.error("Error registering club:", error);
      window.toast?.error(error.message || "Failed to register club");
    } finally {
      setRegisteringClub(null);
    }
  };

  const isClubRegistered = (clubId: string): boolean => {
    if (!league) return false;
    return (
      league.divisions?.some((div) => div.clubIds.includes(clubId)) || false
    );
  };

  const canRegisterClub = (club: Club): boolean => {
    if (!league) return false;
    if (league.status !== "registration" || league.registrationClosed) return false;
    if (new Date() > league.registrationDeadline) return false;
    if (!club.isLegitimate && league.requireLegitimateClubs) return false;
    return !isClubRegistered(club.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">League Not Found</h2>
          <p className="text-gray-400 mb-4">{error || "This league does not exist"}</p>
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

  const canManage =
    currentUser &&
    (hasPermission(currentUser.role, "manage_leagues") ||
      league.organizerId === currentUser.id);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white mb-2 text-sm"
            >
              ← Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{league.name}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Season {league.season} • {league.status}
            </p>
          </div>
          {canManage && (
            <Link
              to={`/leagues/${league.id}/manage`}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
            >
              Manage League
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("standings")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "standings"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setActiveTab("fixtures")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "fixtures"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Fixtures
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* League Image */}
            {league.image && (
              <div className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden">
                <img
                  src={league.image}
                  alt={league.name}
                  className="w-full h-48 sm:h-64 lg:h-80 object-cover"
                />
              </div>
            )}

            {/* League Info */}
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h2 className="text-xl font-bold text-white mb-4">League Information</h2>
              {league.description && (
                <p className="text-gray-300 mb-4">{league.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Season</p>
                  <p className="text-white font-medium">{league.season}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      league.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : league.status === "registration"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : league.status === "completed"
                        ? "bg-gray-500/20 text-gray-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {league.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Start Date</p>
                  <p className="text-white font-medium">
                    {league.startDate.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">End Date</p>
                  <p className="text-white font-medium">
                    {league.endDate.toLocaleDateString()}
                  </p>
                </div>
                {league.status === "registration" && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Registration Deadline</p>
                    <p className="text-white font-medium">
                      {league.registrationDeadline.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Registered Clubs */}
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-white">Registered Clubs</h2>
                {currentUser &&
                  currentUser.role === "club_manager" &&
                  league.status === "registration" &&
                  !league.registrationClosed &&
                  new Date() <= league.registrationDeadline &&
                  userClubs.length > 0 && (
                    <button
                      onClick={() => setShowRegistrationModal(true)}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                    >
                      Register My Club
                    </button>
                  )}
              </div>
              {clubs.filter(Boolean).length === 0 ? (
                <p className="text-gray-400 text-center py-8">No clubs registered yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clubs
                    .filter((club): club is Club => club !== null)
                    .map((club) => (
                      <Link
                        key={club.id}
                        to={`/club/${club.id}`}
                        className="bg-dark p-4 rounded-lg border border-gray-700 hover:border-primary transition-colors"
                      >
                        {club.logo ? (
                          <img
                            src={club.logo}
                            alt={club.name}
                            className="w-12 h-12 rounded-full object-cover mb-2 mx-auto"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-2 mx-auto">
                            <span className="text-lg font-bold text-gray-400">
                              {club.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <h3 className="text-white font-medium text-center truncate">
                          {club.name}
                        </h3>
                        {club.location && (
                          <p className="text-gray-400 text-xs text-center mt-1">
                            {club.location.city}, {club.location.state}
                          </p>
                        )}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white mb-4">League Standings</h2>
            {!league.standings || league.standings.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Standings not available yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Pos</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Club</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">P</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">W</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">D</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">L</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">GF</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">GA</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">GD</th>
                      <th className="text-center py-3 px-2 text-gray-400 font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {league.standings.map((standing, _index) => {
                      const club = clubs.find((c) => c?.id === standing.clubId);
                      return (
                        <tr
                          key={standing.clubId}
                          className="border-b border-gray-700/50 hover:bg-dark transition-colors"
                        >
                          <td className="py-3 px-2 text-white font-medium">
                            {standing.position}
                          </td>
                          <td className="py-3 px-2">
                            {club ? (
                              <Link
                                to={`/club/${club.id}`}
                                className="text-white hover:text-primary transition-colors"
                              >
                                {club.logo ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={club.logo}
                                      alt={club.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                    <span className="truncate">{club.name}</span>
                                  </div>
                                ) : (
                                  club.name
                                )}
                              </Link>
                            ) : (
                              standing.clubName
                            )}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.matchesPlayed}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.matchesWon}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.matchesDrawn}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.matchesLost}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.goalsFor}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.goalsAgainst}
                          </td>
                          <td className="text-center py-3 px-2 text-gray-300">
                            {standing.goalDifference > 0 ? "+" : ""}
                            {standing.goalDifference}
                          </td>
                          <td className="text-center py-3 px-2 text-white font-bold">
                            {standing.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fixtures Tab */}
        {activeTab === "fixtures" && (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white mb-4">Fixtures</h2>
            {league.fixtures.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No fixtures scheduled yet</p>
            ) : (
              <div className="space-y-4">
                {league.fixtures.map((fixture) => {
                  const homeClub = clubs.find((c) => c?.id === fixture.teamAId);
                  const awayClub = clubs.find((c) => c?.id === fixture.teamBId);
                  return (
                    <div
                      key={fixture.id}
                      className="bg-dark p-4 rounded-lg border border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 flex items-center gap-4">
                          <div className="flex-1 text-right">
                            <p className="text-white font-medium">
                              {homeClub?.name || fixture.teamAId}
                            </p>
                            {homeClub?.logo && (
                              <img
                                src={homeClub.logo}
                                alt={homeClub.name}
                                className="w-8 h-8 rounded-full object-cover mx-auto mt-1"
                              />
                            )}
                          </div>
                          <div className="text-center">
                            {fixture.status === "completed" && fixture.result ? (
                              <div>
                                <span className="text-2xl font-bold text-white">
                                  {fixture.result.scoreA} - {fixture.result.scoreB}
                                </span>
                                <p className="text-gray-400 text-xs mt-1">FT</p>
                              </div>
                            ) : (
                              <div>
                                <span className="text-gray-400 text-sm">
                                  {fixture.scheduledDate
                                    ? fixture.scheduledDate.toLocaleDateString()
                                    : "TBD"}
                                </span>
                                {fixture.scheduledTime && (
                                  <p className="text-gray-400 text-xs">
                                    {fixture.scheduledTime}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">
                              {awayClub?.name || fixture.teamBId}
                            </p>
                            {awayClub?.logo && (
                              <img
                                src={awayClub.logo}
                                alt={awayClub.name}
                                className="w-8 h-8 rounded-full object-cover mx-auto mt-1"
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              fixture.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : fixture.status === "in-progress"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : fixture.status === "cancelled"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {fixture.status}
                          </span>
                          {fixture.round && (
                            <p className="text-gray-400 text-xs mt-1">Round {fixture.round}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Club Registration Modal */}
        {showRegistrationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Register Club for League</h2>
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {userClubs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">You don't have any clubs to register</p>
                    <Link
                      to="/club/register"
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm inline-block"
                    >
                      Register a Club
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-300 text-sm mb-4">
                      Select a club to register for this league:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userClubs.map((club) => {
                        const isRegistered = isClubRegistered(club.id);
                        const canRegister = canRegisterClub(club);
                        const isRegistering = registeringClub === club.id;

                        return (
                          <div
                            key={club.id}
                            className={`bg-dark p-3 rounded-lg border ${
                              isRegistered
                                ? "border-green-500/50"
                                : canRegister
                                ? "border-gray-700 hover:border-primary"
                                : "border-gray-700 opacity-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {club.logo ? (
                                  <img
                                    src={club.logo}
                                    alt={club.name}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-gray-400">
                                      {club.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-medium truncate">{club.name}</h4>
                                  {club.location && (
                                    <p className="text-gray-400 text-xs truncate">
                                      {club.location.city}, {club.location.state}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isRegistered ? (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                    Registered
                                  </span>
                                ) : canRegister ? (
                                  <LoadingButton
                                    onClick={() => handleRegisterClub(club.id)}
                                    isLoading={isRegistering}
                                    variant="primary"
                                    className="px-3 py-1.5 text-xs"
                                  >
                                    Register
                                  </LoadingButton>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                                    {!club.isLegitimate && league?.requireLegitimateClubs
                                      ? "Not Legitimate"
                                      : "Cannot Register"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueViewPage;

