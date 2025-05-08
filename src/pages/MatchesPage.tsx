import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Match, Team, Pitch } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Mock data for demonstration
const mockTeams: Team[] = [
  {
    id: "1",
    name: "Lightning Warriors",
    players: [],
    wins: 5,
    losses: 2,
    draws: 1,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
  {
    id: "2",
    name: "Royal Eagles",
    players: [],
    wins: 3,
    losses: 4,
    draws: 2,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
  {
    id: "3",
    name: "Phantom Strikers",
    players: [],
    wins: 6,
    losses: 1,
    draws: 0,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
  {
    id: "4",
    name: "Golden Tigers",
    players: [],
    wins: 2,
    losses: 5,
    draws: 3,
    createdAt: new Date(),
    pitchId: "pitch2",
  },
  {
    id: "5",
    name: "Silver Wolves",
    players: [],
    wins: 4,
    losses: 3,
    draws: 1,
    createdAt: new Date(),
    pitchId: "pitch2",
  },
];

const MatchesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const pitchIdFromState = location.state?.pitchId;

  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [waitingTeams, setWaitingTeams] = useState<Team[]>([]);
  const [matchTime, setMatchTime] = useState<number>(600); // 10 minutes in seconds
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [assignedPitches, setAssignedPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    const fetchRefereeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!currentUser || currentUser.role !== "referee") {
          setError("You must be logged in as a referee to view this page");
          setIsLoading(false);
          return;
        }

        // Fetch assigned pitches from Firestore
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

        // If pitchId is provided from state, select that pitch
        if (pitchIdFromState) {
          const selectedPitchData = pitches.find(
            (pitch) => pitch.id === pitchIdFromState
          );
          if (selectedPitchData) {
            setSelectedPitch(selectedPitchData);
          } else if (pitches.length > 0) {
            // If specified pitch not found but others exist, select the first one
            setSelectedPitch(pitches[0]);
          }
        } else if (pitches.length > 0) {
          // If no pitchId provided, select the first pitch by default
          setSelectedPitch(pitches[0]);
        }
      } catch (err) {
        console.error("Error fetching referee data:", err);
        setError(
          "Failed to load your assigned pitches. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRefereeData();
  }, [currentUser, pitchIdFromState]);

  // Load teams for selected pitch
  useEffect(() => {
    const fetchTeamsForPitch = async () => {
      if (!selectedPitch) return;

      try {
        // In a real app, fetch teams from Firestore for the selected pitch
        // For now, we'll use mock data filtered by pitchId
        const teamsForPitch = mockTeams.filter(
          (team) => team.pitchId === selectedPitch.id
        );
        setWaitingTeams(teamsForPitch);
        setCurrentMatch(null);
        setMatchHistory([]);

        // When we connect to Firebase, we would do something like:
        // const teamsQuery = query(
        //   collection(db, "teams"),
        //   where("pitchId", "==", selectedPitch.id)
        // );
        // const querySnapshot = await getDocs(teamsQuery);
        // const teams: Team[] = [];
        // querySnapshot.forEach((doc) => {
        //   teams.push({ id: doc.id, ...doc.data() } as Team);
        // });
        // setWaitingTeams(teams);
      } catch (err) {
        console.error("Error fetching teams for pitch:", err);
      }
    };

    fetchTeamsForPitch();
  }, [selectedPitch]);

  // Timer functionality
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isMatchActive && matchTime > 0) {
      interval = setInterval(() => {
        setMatchTime((prevTime) => {
          if (prevTime <= 1) {
            endMatch("time");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isMatchActive, matchTime]);

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Start a new match
  const startMatch = () => {
    if (!currentMatch) {
      if (waitingTeams.length < 2) {
        alert("Not enough teams to start a match!");
        return;
      }

      const newMatch: Match = {
        id: (matchHistory.length + 1).toString(),
        teamA: waitingTeams[0],
        teamB: waitingTeams[1],
        scoreA: 0,
        scoreB: 0,
        status: "in-progress",
        startTime: new Date(),
        isActive: true,
        pitchId: selectedPitch?.id || "pitch1",
      };

      setCurrentMatch(newMatch);
      setWaitingTeams(waitingTeams.slice(2));
    } else {
      // Start the timer for an existing match
      currentMatch.status = "in-progress";
      currentMatch.startTime = new Date();
      setCurrentMatch({ ...currentMatch });
    }

    setIsMatchActive(true);
    // Set match time based on pitch settings if available
    const duration = selectedPitch?.customSettings?.matchDuration || 600;
    setMatchTime(duration);
  };

  // End current match
  const endMatch = (_reason: "time" | "goals", finalMatch?: Match) => {
    const matchToEnd = finalMatch
      ? { ...finalMatch }
      : currentMatch
      ? { ...currentMatch }
      : null;
    if (!matchToEnd) return;

    setIsMatchActive(false);

    matchToEnd.status = "completed";
    matchToEnd.endTime = new Date();

    // Determine winner
    if (matchToEnd.scoreA > matchToEnd.scoreB) {
      matchToEnd.winner = matchToEnd.teamA;
    } else if (matchToEnd.scoreB > matchToEnd.scoreA) {
      matchToEnd.winner = matchToEnd.teamB;
    }
    // If scores are equal, no winner (draw)

    // Add match to history
    setMatchHistory([matchToEnd, ...matchHistory]);

    // Rotational queue logic
    if (matchToEnd.scoreA === matchToEnd.scoreB) {
      // Draw: both teams go to the back in random order
      let newQueue = [...waitingTeams];
      const teamsToAdd = [matchToEnd.teamA, matchToEnd.teamB];
      // Shuffle the two teams
      for (let i = teamsToAdd.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamsToAdd[i], teamsToAdd[j]] = [teamsToAdd[j], teamsToAdd[i]];
      }
      newQueue = [...newQueue, ...teamsToAdd];
      if (newQueue.length < 2) {
        setCurrentMatch(null);
      } else {
        setCurrentMatch({
          id: (matchHistory.length + 2).toString(),
          teamA: newQueue[0],
          teamB: newQueue[1],
          scoreA: 0,
          scoreB: 0,
          status: "scheduled",
          isActive: false,
          pitchId: selectedPitch?.id || "pitch1",
        });
        setWaitingTeams(newQueue.slice(2));
      }
    } else {
      // Winner stays, loser goes to back
      const winner =
        matchToEnd.scoreA > matchToEnd.scoreB
          ? matchToEnd.teamA
          : matchToEnd.teamB;
      const loser =
        matchToEnd.scoreA > matchToEnd.scoreB
          ? matchToEnd.teamB
          : matchToEnd.teamA;
      let newQueue = [...waitingTeams, loser];
      if (newQueue.length === 0) {
        setCurrentMatch(null);
      } else {
        setCurrentMatch({
          id: (matchHistory.length + 2).toString(),
          teamA: winner,
          teamB: newQueue[0],
          scoreA: 0,
          scoreB: 0,
          status: "scheduled",
          isActive: false,
          pitchId: selectedPitch?.id || "pitch1",
        });
        setWaitingTeams(newQueue.slice(1));
      }
    }
  };

  // Update score
  const updateScore = (team: "A" | "B") => {
    if (!currentMatch || !isMatchActive) return;

    const updatedMatch = { ...currentMatch };

    // Get max goals from pitch settings
    const maxGoals = selectedPitch?.customSettings?.maxGoals || 2;

    if (team === "A") {
      updatedMatch.scoreA += 1;
      if (updatedMatch.scoreA >= maxGoals) {
        endMatch("goals", updatedMatch);
        return;
      }
    } else {
      updatedMatch.scoreB += 1;
      if (updatedMatch.scoreB >= maxGoals) {
        endMatch("goals", updatedMatch);
        return;
      }
    }

    setCurrentMatch(updatedMatch);
  };

  const handlePitchSelect = (pitchId: string) => {
    const pitch = assignedPitches.find((p) => p.id === pitchId);
    if (pitch) {
      setSelectedPitch(pitch);
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
      <h1 className="text-3xl font-bold text-white mb-6">Today's Matches</h1>

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
        <>
          {/* Pitch Selector */}
          <div className="mb-6">
            <label
              htmlFor="pitch-select"
              className="block text-white mb-2 font-medium"
            >
              Select Pitch
            </label>
            <select
              id="pitch-select"
              className="w-full md:w-64 px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              value={selectedPitch?.id || ""}
              onChange={(e) => handlePitchSelect(e.target.value)}
            >
              {assignedPitches.map((pitch) => (
                <option key={pitch.id} value={pitch.id}>
                  {pitch.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPitch && (
            <div className="mb-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  {selectedPitch.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                  <p>
                    <span className="font-semibold">Location:</span>{" "}
                    {selectedPitch.location || selectedPitch.address},{" "}
                    {selectedPitch.city}
                  </p>
                  {selectedPitch.customSettings && (
                    <p>
                      <span className="font-semibold">Match Duration:</span>{" "}
                      {Math.floor(
                        selectedPitch.customSettings.matchDuration / 60
                      )}{" "}
                      minutes
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Match Area */}
          {currentMatch ? (
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg mb-6">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Current Match
                  </h2>
                  <div className="px-4 py-2 bg-blue-600 rounded-lg text-white font-bold">
                    {formatTime(matchTime)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center my-8">
                  <div className="text-white">
                    <h3 className="text-lg font-bold mb-2">
                      {currentMatch.teamA.name}
                    </h3>
                    <div className="bg-gray-700 rounded-lg p-4 mb-2">
                      <span className="text-4xl font-bold">
                        {currentMatch.scoreA}
                      </span>
                    </div>
                    <button
                      onClick={() => updateScore("A")}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
                      disabled={!isMatchActive}
                    >
                      Goal +
                    </button>
                  </div>

                  <div className="flex items-center justify-center text-2xl font-bold text-white">
                    vs
                  </div>

                  <div className="text-white">
                    <h3 className="text-lg font-bold mb-2">
                      {currentMatch.teamB.name}
                    </h3>
                    <div className="bg-gray-700 rounded-lg p-4 mb-2">
                      <span className="text-4xl font-bold">
                        {currentMatch.scoreB}
                      </span>
                    </div>
                    <button
                      onClick={() => updateScore("B")}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
                      disabled={!isMatchActive}
                    >
                      Goal +
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  {!isMatchActive ? (
                    <button
                      onClick={() => setIsMatchActive(true)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                    >
                      Start Match
                    </button>
                  ) : (
                    <button
                      onClick={() => endMatch("time")}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
                    >
                      End Match
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Available Teams */}
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Available Teams
                  </h2>
                  {waitingTeams.length === 0 ? (
                    <p className="text-gray-400">No teams available.</p>
                  ) : (
                    <div className="space-y-3">
                      {waitingTeams.map((team) => (
                        <div
                          key={team.id}
                          className="bg-gray-700 rounded-lg p-3 flex justify-between items-center"
                        >
                          <div>
                            <h3 className="font-medium text-white">
                              {team.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              W: {team.wins} / L: {team.losses} / D:{" "}
                              {team.draws}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {waitingTeams.length >= 2 && (
                    <div className="mt-6">
                      <button
                        onClick={startMatch}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium"
                      >
                        Start New Match
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Match History */}
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Today's Match History
                  </h2>
                  {matchHistory.length === 0 ? (
                    <p className="text-gray-400">No matches played today.</p>
                  ) : (
                    <div className="space-y-3">
                      {matchHistory.map((match, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <p className="text-white font-medium">
                              {match.teamA.name}{" "}
                              <span className="text-yellow-500 px-2">
                                {match.scoreA} - {match.scoreB}
                              </span>{" "}
                              {match.teamB.name}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            Winner: {match.winner ? match.winner.name : "Draw"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MatchesPage;
