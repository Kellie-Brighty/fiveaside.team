import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { getAllLeagues, updateFixtureScores, completeFixture, startFixture, autoUpdateFixtureStatus, recordFixturePlayerStats } from "../services/leagueService";
import { getAllClubs, getClub } from "../services/clubService";
import { getPlayerProfile } from "../services/playerProfileService";
import { doc, getDoc } from "firebase/firestore";
import type { Fixture, Pitch, League, Club, PlayerMatchStats, User } from "../types";

const RefereeOverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignedPitches, setAssignedPitches] = useState<Pitch[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }>>([]);
  const [activeTab, setActiveTab] = useState<"pitches" | "leagues">("pitches");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Record result modal state
  const [showRecordResultModal, setShowRecordResultModal] = useState(false);
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club } | null>(null);
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [updatingScores, setUpdatingScores] = useState(false);
  const [completingMatch, setCompletingMatch] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);
  
  // Player stats modal state
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState(false);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club } | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<Array<{ user: User; playerProfile?: any }>>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<Array<{ user: User; playerProfile?: any }>>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number; assists: number; yellowCards: number; redCard: boolean }>>({});
  const [recordingStats, setRecordingStats] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    const fetchAssignedPitches = async () => {
      if (!currentUser || currentUser.role !== "referee") {
        setError("You must be logged in as a referee to view this page");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Load assigned pitches
        const pitchesQuery = query(
          collection(db, "pitches"),
          where("referees", "array-contains", currentUser.id)
        );

        const querySnapshot = await getDocs(pitchesQuery);
        const pitches: Pitch[] = [];

        querySnapshot.forEach((doc) => {
          const pitchData = doc.data();
          pitches.push({
            id: doc.id,
            name: pitchData.name,
            city: pitchData.city,
            country: pitchData.country,
            referees: pitchData.referees || [],
            ownerId: pitchData.ownerId,
            createdAt: pitchData.createdAt.toDate(),
            location: pitchData.location,
            address: pitchData.address,
            state: pitchData.state,
            coordinates: pitchData.coordinates,
            description: pitchData.description,
            logo: pitchData.logo,
            customSettings: pitchData.customSettings,
            availability: pitchData.availability,
            pricePerPerson: pitchData.pricePerPerson,
          });
        });

        setAssignedPitches(pitches);
        
        // Load league matches assigned to this referee
        const allLeagues = await getAllLeagues();
        const allClubs = await getAllClubs();
        
        // Auto-update fixture statuses for all leagues
        for (const league of allLeagues) {
          try {
            await autoUpdateFixtureStatus(league.id);
          } catch (error) {
            console.error(`Error auto-updating status for league ${league.id}:`, error);
          }
        }
        
        // Reload leagues after status updates
        const updatedLeagues = await getAllLeagues();
        const matches: Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }> = [];
        
        updatedLeagues.forEach((league) => {
          if (league.fixtures) {
            league.fixtures.forEach((fixture) => {
              if (fixture.refereeId === currentUser.id) {
                const homeClub = allClubs.find((c) => c.id === fixture.teamAId);
                const awayClub = allClubs.find((c) => c.id === fixture.teamBId);
                matches.push({ league, fixture, homeClub, awayClub });
              }
            });
          }
        });
        
        // Sort matches: upcoming first, then by date
        matches.sort((a, b) => {
          const aDate = a.fixture.scheduledDate ? new Date(a.fixture.scheduledDate).getTime() : 0;
          const bDate = b.fixture.scheduledDate ? new Date(b.fixture.scheduledDate).getTime() : 0;
          return aDate - bDate;
        });
        
        setLeagueMatches(matches);
      } catch (err) {
        console.error("Error fetching assigned pitches:", err);
        setError(
          "Failed to load your assigned pitches. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedPitches();
  }, [currentUser]);

  const handleViewMatches = (pitchId: string) => {
    // Navigate to MatchesPage with the selected pitch
    navigate("/matches", { state: { pitchId } });
  };

  const handleOpenRecordResult = (match: { league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }) => {
    setSelectedMatchForResult(match);
    // Pre-fill with existing result if available, otherwise start with 0
    if (match.fixture.result) {
      setScoreA(match.fixture.result.scoreA.toString());
      setScoreB(match.fixture.result.scoreB.toString());
    } else {
      setScoreA("0");
      setScoreB("0");
    }
    setShowRecordResultModal(true);
  };

  const handleCloseRecordResultModal = () => {
    setShowRecordResultModal(false);
    setSelectedMatchForResult(null);
    setScoreA("");
    setScoreB("");
  };

  const handleStartMatch = async (match: { league: League; fixture: Fixture }) => {
    try {
      setStartingMatch(true);
      await startFixture(match.league.id, match.fixture.id);
      window.toast?.success("Match started successfully!");
      
      // Reload the league matches
      const allLeagues = await getAllLeagues();
      const allClubs = await getAllClubs();
      const matches: Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }> = [];
      
      allLeagues.forEach((league) => {
        if (league.fixtures) {
          league.fixtures.forEach((fixture) => {
            if (fixture.refereeId === currentUser?.id) {
              const homeClub = allClubs.find((c) => c.id === fixture.teamAId);
              const awayClub = allClubs.find((c) => c.id === fixture.teamBId);
              matches.push({ league, fixture, homeClub, awayClub });
            }
          });
        }
      });
      
      // Sort matches: upcoming first, then by date
      matches.sort((a, b) => {
        const aDate = a.fixture.scheduledDate ? new Date(a.fixture.scheduledDate).getTime() : 0;
        const bDate = b.fixture.scheduledDate ? new Date(b.fixture.scheduledDate).getTime() : 0;
        return aDate - bDate;
      });
      
      setLeagueMatches(matches);
    } catch (error: any) {
      console.error("Error starting match:", error);
      window.toast?.error(error.message || "Failed to start match");
    } finally {
      setStartingMatch(false);
    }
  };

  const handleOpenPlayerStats = async (match: { league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }) => {
    setSelectedMatchForStats(match);
    setShowPlayerStatsModal(true);
    setLoadingPlayers(true);
    setPlayerStats({});

    try {
      // Load club rosters
      const homeClub = await getClub(match.fixture.teamAId);
      const awayClub = await getClub(match.fixture.teamBId);

      const homePlayers: Array<{ user: User; playerProfile?: any }> = [];
      const awayPlayers: Array<{ user: User; playerProfile?: any }> = [];

      // Load home team players
      if (homeClub?.playerIds && homeClub.playerIds.length > 0) {
        for (const userId of homeClub.playerIds) {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const user = { id: userDoc.id, ...userDoc.data() } as User;
              let playerProfile;
              try {
                playerProfile = await getPlayerProfile(userId);
              } catch (error) {
                // Profile might not exist
              }
              homePlayers.push({ user, playerProfile });
              
              // Initialize stats if not exists
              const existingStat = match.fixture.playerStats?.find(s => s.userId === userId);
              setPlayerStats(prev => ({
                ...prev,
                [userId]: existingStat ? {
                  goals: existingStat.goals,
                  assists: existingStat.assists,
                  yellowCards: existingStat.yellowCards,
                  redCard: existingStat.redCard,
                } : { goals: 0, assists: 0, yellowCards: 0, redCard: false }
              }));
            }
          } catch (error) {
            console.error(`Error loading player ${userId}:`, error);
          }
        }
      }

      // Load away team players
      if (awayClub?.playerIds && awayClub.playerIds.length > 0) {
        for (const userId of awayClub.playerIds) {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const user = { id: userDoc.id, ...userDoc.data() } as User;
              let playerProfile;
              try {
                playerProfile = await getPlayerProfile(userId);
              } catch (error) {
                // Profile might not exist
              }
              awayPlayers.push({ user, playerProfile });
              
              // Initialize stats if not exists
              const existingStat = match.fixture.playerStats?.find(s => s.userId === userId);
              setPlayerStats(prev => ({
                ...prev,
                [userId]: existingStat ? {
                  goals: existingStat.goals,
                  assists: existingStat.assists,
                  yellowCards: existingStat.yellowCards,
                  redCard: existingStat.redCard,
                } : { goals: 0, assists: 0, yellowCards: 0, redCard: false }
              }));
            }
          } catch (error) {
            console.error(`Error loading player ${userId}:`, error);
          }
        }
      }

      setTeamAPlayers(homePlayers);
      setTeamBPlayers(awayPlayers);
    } catch (error) {
      console.error("Error loading players:", error);
      window.toast?.error("Failed to load players");
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleClosePlayerStatsModal = () => {
    setShowPlayerStatsModal(false);
    setSelectedMatchForStats(null);
    setTeamAPlayers([]);
    setTeamBPlayers([]);
    setPlayerStats({});
  };

  const updatePlayerStat = (userId: string, field: "goals" | "assists" | "yellowCards" | "redCard", value: number | boolean) => {
    setPlayerStats(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { goals: 0, assists: 0, yellowCards: 0, redCard: false }),
        [field]: value,
      }
    }));
  };

  const handleRecordPlayerStats = async () => {
    if (!selectedMatchForStats) return;

    try {
      setRecordingStats(true);

      // Convert playerStats to array format
      const statsArray: PlayerMatchStats[] = [];

      // Team A players
      teamAPlayers.forEach(({ user }) => {
        const stat = playerStats[user.id];
        if (stat && (stat.goals > 0 || stat.assists > 0 || stat.yellowCards > 0 || stat.redCard)) {
          statsArray.push({
            userId: user.id,
            clubId: selectedMatchForStats.fixture.teamAId,
            goals: stat.goals || 0,
            assists: stat.assists || 0,
            yellowCards: stat.yellowCards || 0,
            redCard: stat.redCard || false,
          });
        }
      });

      // Team B players
      teamBPlayers.forEach(({ user }) => {
        const stat = playerStats[user.id];
        if (stat && (stat.goals > 0 || stat.assists > 0 || stat.yellowCards > 0 || stat.redCard)) {
          statsArray.push({
            userId: user.id,
            clubId: selectedMatchForStats.fixture.teamBId,
            goals: stat.goals || 0,
            assists: stat.assists || 0,
            yellowCards: stat.yellowCards || 0,
            redCard: stat.redCard || false,
          });
        }
      });

      await recordFixturePlayerStats(
        selectedMatchForStats.league.id,
        selectedMatchForStats.fixture.id,
        statsArray
      );

      window.toast?.success("Player statistics recorded successfully!");
      
      // Reload the league matches
      const allLeagues = await getAllLeagues();
      const allClubs = await getAllClubs();
      const matches: Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }> = [];
      
      allLeagues.forEach((league) => {
        if (league.fixtures) {
          league.fixtures.forEach((fixture) => {
            if (fixture.refereeId === currentUser?.id) {
              const homeClub = allClubs.find((c) => c.id === fixture.teamAId);
              const awayClub = allClubs.find((c) => c.id === fixture.teamBId);
              matches.push({ league, fixture, homeClub, awayClub });
            }
          });
        }
      });
      
      matches.sort((a, b) => {
        const aDate = a.fixture.scheduledDate ? new Date(a.fixture.scheduledDate).getTime() : 0;
        const bDate = b.fixture.scheduledDate ? new Date(b.fixture.scheduledDate).getTime() : 0;
        return aDate - bDate;
      });
      
      setLeagueMatches(matches);
      handleClosePlayerStatsModal();
    } catch (error: any) {
      console.error("Error recording player stats:", error);
      window.toast?.error(error.message || "Failed to record player statistics");
    } finally {
      setRecordingStats(false);
    }
  };

  const handleUpdateScores = async () => {
    if (!selectedMatchForResult) return;

    const scoreAInt = parseInt(scoreA);
    const scoreBInt = parseInt(scoreB);

    // Validation
    if (isNaN(scoreAInt) || isNaN(scoreBInt)) {
      window.toast?.error("Please enter valid scores");
      return;
    }

    if (scoreAInt < 0 || scoreBInt < 0) {
      window.toast?.error("Scores cannot be negative");
      return;
    }

    try {
      setUpdatingScores(true);
      await updateFixtureScores(
        selectedMatchForResult.league.id,
        selectedMatchForResult.fixture.id,
        {
          scoreA: scoreAInt,
          scoreB: scoreBInt,
        }
      );
      window.toast?.success("Scores updated successfully!");
      
      // Reload the league matches
      const allLeagues = await getAllLeagues();
      const allClubs = await getAllClubs();
      const matches: Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }> = [];
      
      allLeagues.forEach((league) => {
        if (league.fixtures) {
          league.fixtures.forEach((fixture) => {
            if (fixture.refereeId === currentUser?.id) {
              const homeClub = allClubs.find((c) => c.id === fixture.teamAId);
              const awayClub = allClubs.find((c) => c.id === fixture.teamBId);
              matches.push({ league, fixture, homeClub, awayClub });
            }
          });
        }
      });
      
      // Sort matches: upcoming first, then by date
      matches.sort((a, b) => {
        const aDate = a.fixture.scheduledDate ? new Date(a.fixture.scheduledDate).getTime() : 0;
        const bDate = b.fixture.scheduledDate ? new Date(b.fixture.scheduledDate).getTime() : 0;
        return aDate - bDate;
      });
      
      setLeagueMatches(matches);
      
      // Update selected match to reflect new scores
      const updatedMatch = matches.find(
        m => m.league.id === selectedMatchForResult.league.id && 
        m.fixture.id === selectedMatchForResult.fixture.id
      );
      if (updatedMatch) {
        setSelectedMatchForResult(updatedMatch);
        setScoreA(updatedMatch.fixture.result?.scoreA.toString() || "0");
        setScoreB(updatedMatch.fixture.result?.scoreB.toString() || "0");
      }
    } catch (error: any) {
      console.error("Error updating scores:", error);
      window.toast?.error(error.message || "Failed to update scores");
    } finally {
      setUpdatingScores(false);
    }
  };

  const handleCompleteMatch = async () => {
    if (!selectedMatchForResult) return;

    const scoreAInt = parseInt(scoreA);
    const scoreBInt = parseInt(scoreB);

    // Validation
    if (isNaN(scoreAInt) || isNaN(scoreBInt)) {
      window.toast?.error("Please enter valid scores before completing match");
      return;
    }

    try {
      setCompletingMatch(true);
      await completeFixture(
        selectedMatchForResult.league.id,
        selectedMatchForResult.fixture.id
      );
      window.toast?.success("Match completed successfully!");
      
      // Reload the league matches
      const allLeagues = await getAllLeagues();
      const allClubs = await getAllClubs();
      const matches: Array<{ league: League; fixture: Fixture; homeClub?: Club; awayClub?: Club }> = [];
      
      allLeagues.forEach((league) => {
        if (league.fixtures) {
          league.fixtures.forEach((fixture) => {
            if (fixture.refereeId === currentUser?.id) {
              const homeClub = allClubs.find((c) => c.id === fixture.teamAId);
              const awayClub = allClubs.find((c) => c.id === fixture.teamBId);
              matches.push({ league, fixture, homeClub, awayClub });
            }
          });
        }
      });
      
      // Sort matches: upcoming first, then by date
      matches.sort((a, b) => {
        const aDate = a.fixture.scheduledDate ? new Date(a.fixture.scheduledDate).getTime() : 0;
        const bDate = b.fixture.scheduledDate ? new Date(b.fixture.scheduledDate).getTime() : 0;
        return aDate - bDate;
      });
      
      setLeagueMatches(matches);
      handleCloseRecordResultModal();
    } catch (error: any) {
      console.error("Error completing match:", error);
      window.toast?.error(error.message || "Failed to complete match");
    } finally {
      setCompletingMatch(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 mt-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-gray-700 rounded mb-4 mx-auto"></div>
          <div className="h-64 w-full max-w-md bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 mt-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        Referee Dashboard
      </h1>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("pitches")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "pitches"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Assigned Pitches ({assignedPitches.length})
        </button>
        <button
          onClick={() => setActiveTab("leagues")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "leagues"
              ? "text-primary border-b-2 border-primary"
              : "text-gray-400 hover:text-white"
          }`}
        >
          League Matches ({leagueMatches.length})
        </button>
      </div>

      {/* Pitches Tab */}
      {activeTab === "pitches" && (
        <>
          {assignedPitches.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-4">
            You don't have any pitches assigned to you yet.
          </p>
          <p className="text-gray-400 text-sm">
            Pitch owners will assign you to their pitches when they need a
            referee.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedPitches.map((pitch) => (
            <div
              key={pitch.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  {pitch.name}
                </h2>
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">Location:</span>{" "}
                  {pitch.address || pitch.location}
                </p>
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">City:</span> {pitch.city},{" "}
                  {pitch.state || pitch.country}
                </p>

                {pitch.description && (
                  <p className="text-gray-400 mt-3 text-sm">
                    {pitch.description}
                  </p>
                )}

                {pitch.customSettings && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-md font-semibold text-white mb-2">
                      Pitch Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-300">
                        <span className="text-gray-400">Match Duration:</span>{" "}
                        {Math.floor(pitch.customSettings.matchDuration / 60)}{" "}
                        minutes
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Max Goals:</span>{" "}
                        {pitch.customSettings.maxGoals}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Players Per Team:</span>{" "}
                        {pitch.customSettings.maxPlayersPerTeam}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Draws Allowed:</span>{" "}
                        {pitch.customSettings.allowDraws ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                )}

                {pitch.availability && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-md font-semibold text-white mb-2">
                      Operating Hours
                    </h3>
                    <p className="text-gray-300 text-sm">
                      <span className="text-gray-400">Open:</span>{" "}
                      {pitch.availability.openingTime} -{" "}
                      {pitch.availability.closingTime}
                    </p>
                    <p className="text-gray-300 text-sm">
                      <span className="text-gray-400">Days:</span>{" "}
                      {pitch.availability.daysOpen
                        .map(
                          (day) => day.charAt(0).toUpperCase() + day.slice(1)
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => handleViewMatches(pitch.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 transition-colors text-white font-medium rounded-lg flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    View Today's Matches
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* League Matches Tab */}
      {activeTab === "leagues" && (
        <>
          {leagueMatches.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-300 mb-4">
                You don't have any league matches assigned to you yet.
              </p>
              <p className="text-gray-400 text-sm">
                League officials will assign you to fixtures when needed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagueMatches.map(({ league, fixture, homeClub, awayClub }) => {
                const isToday =
                  fixture.scheduledDate &&
                  new Date(fixture.scheduledDate).toDateString() ===
                    new Date().toDateString();

                // Check if match time has arrived/passed
                const canStartMatch = (() => {
                  if (fixture.status !== "scheduled") return false;
                  
                  const now = new Date();
                  const scheduledDate = fixture.scheduledDate instanceof Date
                    ? fixture.scheduledDate
                    : new Date(fixture.scheduledDate);

                  if (fixture.scheduledTime) {
                    // Check both date and time
                    const [hours, minutes] = fixture.scheduledTime.split(":").map(Number);
                    const matchDateTime = new Date(scheduledDate);
                    matchDateTime.setHours(hours, minutes || 0, 0, 0);
                    return now >= matchDateTime;
                  } else {
                    // If no time specified, check if scheduled date is today or past
                    const scheduledDateOnly = new Date(scheduledDate);
                    scheduledDateOnly.setHours(0, 0, 0, 0);
                    const todayOnly = new Date(now);
                    todayOnly.setHours(0, 0, 0, 0);
                    return scheduledDateOnly.getTime() <= todayOnly.getTime();
                  }
                })();

                return (
                  <div
                    key={`${league.id}-${fixture.id}`}
                    className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Link
                          to={`/leagues/${league.id}`}
                          className="text-lg font-bold text-white hover:text-primary transition-colors"
                        >
                          {league.name}
                        </Link>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            fixture.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : fixture.status === "scheduled"
                              ? "bg-blue-500/20 text-blue-400"
                              : fixture.status === "cancelled"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {fixture.status}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-300 text-sm mb-3">
                          <span className="font-semibold">Round {fixture.round}</span>
                        </p>
                        <div className="flex items-center justify-between text-white mb-2">
                          <div className="flex-1 text-right">
                            <p className="font-medium text-sm">
                              {homeClub?.name || "Team A"}
                            </p>
                            {homeClub?.logo && (
                              <img
                                src={homeClub.logo}
                                alt={homeClub.name}
                                className="w-8 h-8 rounded-full object-cover mx-auto mt-1"
                              />
                            )}
                          </div>
                          {fixture.result ? (
                            <div className="mx-4 text-center">
                              <p className="text-2xl font-bold">
                                {fixture.result.scoreA} - {fixture.result.scoreB}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">FT</p>
                            </div>
                          ) : (
                            <div className="mx-4 text-gray-400 font-medium">
                              vs
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">
                              {awayClub?.name || "Team B"}
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
                      </div>

                      <div className="mb-4 border-t border-gray-700 pt-3 space-y-2">
                        {fixture.scheduledDate ? (
                          <>
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400">Date:</span>{" "}
                              {fixture.scheduledDate instanceof Date
                                ? fixture.scheduledDate.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : new Date(fixture.scheduledDate).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                            </p>
                            {fixture.scheduledTime && (
                              <p className="text-gray-300 text-sm">
                                <span className="text-gray-400">Time:</span> {fixture.scheduledTime}
                              </p>
                            )}
                            {isToday && (
                              <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                Today
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400 text-sm italic">Date not scheduled yet</p>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {fixture.status === "scheduled" && canStartMatch && (
                          <button
                            onClick={() => handleStartMatch({ league, fixture })}
                            disabled={startingMatch}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {startingMatch ? "Starting..." : "Start Match"}
                          </button>
                        )}
                        {fixture.status === "in-progress" && (
                          <>
                            <button
                              onClick={() => handleOpenRecordResult({ league, fixture, homeClub, awayClub })}
                              className="w-full py-3 bg-green-600 hover:bg-green-700 transition-colors text-white font-medium rounded-lg flex items-center justify-center mb-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                              </svg>
                              Update Scores
                            </button>
                            <button
                              onClick={() => handleOpenPlayerStats({ league, fixture, homeClub, awayClub })}
                              className="w-full py-3 bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium rounded-lg flex items-center justify-center"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              Player Stats
                            </button>
                          </>
                        )}
                        <Link
                          to={`/leagues/${league.id}`}
                          className="w-full py-3 bg-primary hover:bg-primary/90 transition-colors text-white font-medium rounded-lg flex items-center justify-center"
                        >
                          View League Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Record Result Modal */}
      {showRecordResultModal && selectedMatchForResult && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseRecordResultModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-dark rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Update Match Scores</h2>
                  <button
                    onClick={handleCloseRecordResultModal}
                    className="text-gray-400 hover:text-white transition-colors"
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
                <p className="text-gray-400 text-sm mt-1">
                  Round {selectedMatchForResult.fixture.round} • {selectedMatchForResult.league.name}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto flex-grow">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 text-center">
                      <p className="font-semibold text-white mb-2">
                        {selectedMatchForResult.homeClub?.name || "Team A"}
                      </p>
                      {selectedMatchForResult.homeClub?.logo && (
                        <img
                          src={selectedMatchForResult.homeClub.logo}
                          alt={selectedMatchForResult.homeClub.name}
                          className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                        />
                      )}
                      <input
                        type="number"
                        min="0"
                        value={scoreA}
                        onChange={(e) => setScoreA(e.target.value)}
                        placeholder="0"
                        className="w-20 mx-auto text-center text-2xl font-bold bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="mx-4 text-gray-400 text-2xl font-bold">vs</div>
                    <div className="flex-1 text-center">
                      <p className="font-semibold text-white mb-2">
                        {selectedMatchForResult.awayClub?.name || "Team B"}
                      </p>
                      {selectedMatchForResult.awayClub?.logo && (
                        <img
                          src={selectedMatchForResult.awayClub.logo}
                          alt={selectedMatchForResult.awayClub.name}
                          className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                        />
                      )}
                      <input
                        type="number"
                        min="0"
                        value={scoreB}
                        onChange={(e) => setScoreB(e.target.value)}
                        placeholder="0"
                        className="w-20 mx-auto text-center text-2xl font-bold bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-blue-400 text-sm">
                    💡 Update scores as goals are scored. Click "Complete Match" when the match ends.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
                <button
                  onClick={handleCloseRecordResultModal}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  disabled={updatingScores || completingMatch}
                >
                  Close
                </button>
                <button
                  onClick={handleUpdateScores}
                  disabled={updatingScores || completingMatch || !scoreA || !scoreB}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {updatingScores ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Scores"
                  )}
                </button>
                <button
                  onClick={handleCompleteMatch}
                  disabled={updatingScores || completingMatch || !scoreA || !scoreB}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {completingMatch ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Completing...
                    </>
                  ) : (
                    "Complete Match"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Player Stats Modal */}
      {showPlayerStatsModal && selectedMatchForStats && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClosePlayerStatsModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Record Player Statistics</h2>
                  <button
                    onClick={handleClosePlayerStatsModal}
                    className="text-gray-400 hover:text-white transition-colors"
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
                <p className="text-gray-400 text-sm mt-1">
                  Round {selectedMatchForStats.fixture.round} • {selectedMatchForStats.league.name}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto flex-grow">
                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A */}
                    <div>
                      <div className="mb-4 pb-2 border-b border-gray-700">
                        <h3 className="text-lg font-bold text-white">
                          {selectedMatchForStats.homeClub?.name || "Team A"}
                        </h3>
                      </div>
                      {teamAPlayers.length === 0 ? (
                        <p className="text-gray-400 text-sm">No players registered</p>
                      ) : (
                        <div className="space-y-3">
                          {teamAPlayers.map(({ user }) => {
                            const stat = playerStats[user.id] || { goals: 0, assists: 0, yellowCards: 0, redCard: false };
                            return (
                              <div key={user.id} className="bg-gray-800 rounded-lg p-3">
                                <p className="font-medium text-white mb-2">{user.name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-400">Goals</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stat.goals}
                                      onChange={(e) => updatePlayerStat(user.id, "goals", parseInt(e.target.value) || 0)}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Assists</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stat.assists}
                                      onChange={(e) => updatePlayerStat(user.id, "assists", parseInt(e.target.value) || 0)}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Yellow Cards</label>
                                    <select
                                      value={stat.yellowCards}
                                      onChange={(e) => updatePlayerStat(user.id, "yellowCards", parseInt(e.target.value))}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    >
                                      <option value={0}>0</option>
                                      <option value={1}>1</option>
                                      <option value={2}>2</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Red Card</label>
                                    <select
                                      value={stat.redCard ? "1" : "0"}
                                      onChange={(e) => updatePlayerStat(user.id, "redCard", e.target.value === "1")}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    >
                                      <option value="0">No</option>
                                      <option value="1">Yes</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Team B */}
                    <div>
                      <div className="mb-4 pb-2 border-b border-gray-700">
                        <h3 className="text-lg font-bold text-white">
                          {selectedMatchForStats.awayClub?.name || "Team B"}
                        </h3>
                      </div>
                      {teamBPlayers.length === 0 ? (
                        <p className="text-gray-400 text-sm">No players registered</p>
                      ) : (
                        <div className="space-y-3">
                          {teamBPlayers.map(({ user }) => {
                            const stat = playerStats[user.id] || { goals: 0, assists: 0, yellowCards: 0, redCard: false };
                            return (
                              <div key={user.id} className="bg-gray-800 rounded-lg p-3">
                                <p className="font-medium text-white mb-2">{user.name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-400">Goals</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stat.goals}
                                      onChange={(e) => updatePlayerStat(user.id, "goals", parseInt(e.target.value) || 0)}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Assists</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={stat.assists}
                                      onChange={(e) => updatePlayerStat(user.id, "assists", parseInt(e.target.value) || 0)}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Yellow Cards</label>
                                    <select
                                      value={stat.yellowCards}
                                      onChange={(e) => updatePlayerStat(user.id, "yellowCards", parseInt(e.target.value))}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    >
                                      <option value={0}>0</option>
                                      <option value={1}>1</option>
                                      <option value={2}>2</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Red Card</label>
                                    <select
                                      value={stat.redCard ? "1" : "0"}
                                      onChange={(e) => updatePlayerStat(user.id, "redCard", e.target.value === "1")}
                                      className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                                    >
                                      <option value="0">No</option>
                                      <option value="1">Yes</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
                <button
                  onClick={handleClosePlayerStatsModal}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  disabled={recordingStats}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPlayerStats}
                  disabled={recordingStats || loadingPlayers}
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {recordingStats ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Recording...
                    </>
                  ) : (
                    "Save Statistics"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RefereeOverviewPage;
