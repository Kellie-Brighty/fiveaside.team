import React, { useState, useEffect } from "react";
import type { Match, Team, Pitch } from "../types";
import { useAuth } from "../contexts/AuthContext";

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

// Mock pitches data
const mockPitches: Pitch[] = [
  {
    id: "pitch1",
    name: "Lagos Soccerdome",
    location: "Lekki Phase 1",
    address: "123 Admiralty Way",
    city: "Lagos",
    state: "Lagos State",
    country: "Nigeria",
    coordinates: {
      latitude: 6.4281,
      longitude: 3.4219,
    },
    description: "Indoor 5-a-side pitch with professional turf",
    createdAt: new Date(),
    referees: ["referee1", "referee2"],
    ownerId: "owner1",
    customSettings: {
      matchDuration: 900, // 15 minutes
      maxGoals: 7,
      allowDraws: false,
      maxPlayersPerTeam: 5,
      pricePerPerson: 3000,
    },
    availability: {
      daysOpen: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      openingTime: "09:00",
      closingTime: "22:00",
    },
    pricePerPerson: 3000,
  },
  {
    id: "pitch2",
    name: "Abuja Sports Arena",
    location: "Wuse Zone 5",
    address: "456 Constitution Avenue",
    city: "Abuja",
    state: "FCT",
    country: "Nigeria",
    coordinates: {
      latitude: 9.0765,
      longitude: 7.3986,
    },
    description: "Outdoor pitch with floodlights",
    createdAt: new Date(),
    referees: ["referee1"],
    ownerId: "owner2",
    customSettings: {
      matchDuration: 1200, // 20 minutes
      maxGoals: 10,
      allowDraws: true,
      maxPlayersPerTeam: 5,
      pricePerPerson: 2500,
    },
    availability: {
      daysOpen: ["monday", "wednesday", "friday", "saturday", "sunday"],
      openingTime: "10:00",
      closingTime: "21:00",
    },
    pricePerPerson: 2500,
  },
];

const MatchesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [waitingTeams, setWaitingTeams] = useState<Team[]>([]);
  const [matchTime, setMatchTime] = useState<number>(600); // 10 minutes in seconds
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [assignedPitches, setAssignedPitches] = useState<Pitch[]>([]);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    // Get pitches that the referee is assigned to
    if (currentUser && currentUser.role === "referee") {
      const assigned = mockPitches.filter((pitch) =>
        pitch.referees.includes(currentUser.id)
      );
      setAssignedPitches(assigned);
    }
  }, [currentUser]);

  // Load teams for selected pitch
  useEffect(() => {
    if (selectedPitch) {
      const teamsForPitch = mockTeams.filter(
        (team) => team.pitchId === selectedPitch.id
      );
      setWaitingTeams(teamsForPitch);
      setCurrentMatch(null);
      setMatchHistory([]);
    }
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

  // Handle back button click
  const handleBackToPitches = () => {
    setSelectedPitch(null);
    setCurrentMatch(null);
    setWaitingTeams([]);
    setMatchHistory([]);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold sport-gradient-text mb-8">
        Today's Matches
      </h2>

      {!selectedPitch ? (
        // First step: Show assigned pitches
        <>
          <div className="bg-dark-lighter rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-primary mb-6">
              Your Assigned Pitches
            </h3>

            {assignedPitches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedPitches.map((pitch) => (
                  <div
                    key={pitch.id}
                    className="bg-dark hover:bg-dark-light/40 border border-gray-700 hover:border-primary/50 rounded-lg p-5 cursor-pointer transition-colors"
                    onClick={() => setSelectedPitch(pitch)}
                  >
                    <h4 className="font-bold text-lg mb-1">{pitch.name}</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      {pitch.location}
                    </p>

                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
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
                      {pitch.city}, {pitch.state}
                    </div>

                    <div className="flex space-x-2 mb-3">
                      <span className="px-2 py-1 bg-dark-light rounded-md text-xs text-primary flex items-center">
                        {pitch.customSettings?.matchDuration
                          ? pitch.customSettings.matchDuration / 60
                          : 15}{" "}
                        min matches
                      </span>
                      <span className="px-2 py-1 bg-dark-light rounded-md text-xs text-primary flex items-center">
                        {pitch.customSettings?.maxPlayersPerTeam || 5}-a-side
                      </span>
                    </div>

                    <button className="w-full py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors">
                      Manage Matches
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">
                  You are not assigned to any pitches yet.
                </p>
                <p className="text-gray-500 text-sm">
                  Contact a pitch owner to be assigned as a referee.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        // Second step: Show match management for selected pitch
        <>
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={handleBackToPitches}
              className="flex items-center text-gray-400 hover:text-white"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to pitches
            </button>

            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">{selectedPitch.name}</span>
              <span className="ml-2 text-sm text-gray-400">
                {selectedPitch.location}
              </span>
            </div>
          </div>

          {/* Current Match Section */}
          <div className="card mb-8 relative overflow-hidden">
            {isMatchActive && (
              <div className="absolute top-0 left-0 right-0 h-1 sport-gradient"></div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary">Current Match</h3>
              <div className="text-xl font-mono bg-dark-light px-3 py-1 rounded">
                {formatTime(matchTime)}
              </div>
            </div>

            {currentMatch ? (
              <>
                <div className="flex justify-between items-center py-4">
                  <div className="text-center w-1/3">
                    <h4 className="font-bold mb-2">
                      {currentMatch.teamA.name}
                    </h4>
                    <div className="text-4xl font-bold">
                      {currentMatch.scoreA}
                    </div>
                    {isMatchActive && (
                      <button
                        className="mt-4 btn-outline text-sm"
                        onClick={() => updateScore("A")}
                      >
                        + Goal
                      </button>
                    )}
                  </div>

                  <div className="text-center text-xl font-bold">VS</div>

                  <div className="text-center w-1/3">
                    <h4 className="font-bold mb-2">
                      {currentMatch.teamB.name}
                    </h4>
                    <div className="text-4xl font-bold">
                      {currentMatch.scoreB}
                    </div>
                    {isMatchActive && (
                      <button
                        className="mt-4 btn-outline text-sm"
                        onClick={() => updateScore("B")}
                      >
                        + Goal
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  {!isMatchActive ? (
                    <button className="btn-primary" onClick={startMatch}>
                      Start Match
                    </button>
                  ) : (
                    <div className="bg-dark-light/40 px-4 py-2 rounded-lg text-sm text-gray-300">
                      Match will end automatically when time elapses or max
                      goals are reached
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">
                  No current match in progress
                </p>
                {waitingTeams.length >= 2 ? (
                  <button className="btn-primary" onClick={startMatch}>
                    Start New Match
                  </button>
                ) : (
                  <p className="text-secondary">
                    Not enough teams in queue to start a match
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Waiting Teams Section */}
          <div className="card mb-8">
            <h3 className="text-xl font-bold text-primary mb-4">
              Waiting Queue
            </h3>

            {waitingTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waitingTeams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center p-3 bg-dark-light rounded"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/20 text-primary rounded-full mr-3">
                      {index + 1}
                    </div>
                    <span>{team.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                No teams in waiting queue
              </p>
            )}
          </div>

          {/* Match History Section */}
          <div className="card">
            <h3 className="text-xl font-bold text-primary mb-4">
              Match History
            </h3>

            {matchHistory.length > 0 ? (
              <div className="divide-y divide-dark-light">
                {matchHistory.map((match) => (
                  <div key={match.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        Match #{match.id}
                      </div>
                      <div className="text-sm text-gray-400">
                        {match.startTime?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div
                        className={`text-center ${
                          match.winner?.id === match.teamA.id
                            ? "text-primary font-bold"
                            : ""
                        }`}
                      >
                        {match.teamA.name}
                      </div>
                      <div className="text-center font-bold">
                        {match.scoreA} - {match.scoreB}
                      </div>
                      <div
                        className={`text-center ${
                          match.winner?.id === match.teamB.id
                            ? "text-primary font-bold"
                            : ""
                        }`}
                      >
                        {match.teamB.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                No match history yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchesPage;
