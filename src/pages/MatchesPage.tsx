import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Match, Team, Pitch } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  
  serverTimestamp,
} from "firebase/firestore";
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
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [todayString, setTodayString] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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
        // Get today's date string in YYYY-MM-DD format
        const todayDateString = new Date().toISOString().split("T")[0];

        // Fetch teams from Firestore
        const teamsRef = collection(db, "teams");
        const q = query(
          teamsRef,
          where("pitchId", "==", selectedPitch.id),
          where("createdForDate", "==", todayDateString)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const firebaseTeams: Team[] = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              players: data.players || [],
              wins: data.wins || 0,
              losses: data.losses || 0,
              draws: data.draws || 0,
              createdAt: data.createdAt.toDate(),
              pitchId: data.pitchId,
              createdForDate: data.createdForDate,
              createdBy: data.createdBy,
            };
          });

          setWaitingTeams(firebaseTeams);
        } else {
          // Fallback to mock data filtered by pitch ID
          const teamsForPitch = mockTeams.filter(
            (team) => team.pitchId === selectedPitch.id
          );
          setWaitingTeams(teamsForPitch);
        }

        setCurrentMatch(null);
        setMatchHistory([]);
      } catch (err) {
        console.error("Error fetching teams for pitch:", err);
        // Fallback to mock data as a last resort
        const teamsForPitch = mockTeams.filter(
          (team) => team.pitchId === selectedPitch.id
        );
        setWaitingTeams(teamsForPitch);
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
  const startMatch = async () => {
    if (!currentMatch) {
      if (waitingTeams.length < 2) {
        alert("Not enough teams to start a match!");
        return;
      }

      try {
        setIsSavingMatch(true);

        // Clean up team objects for Firestore (remove circular references, functions)
        const teamA = {
          id: waitingTeams[0].id,
          name: waitingTeams[0].name,
          players: waitingTeams[0].players.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          wins: waitingTeams[0].wins,
          losses: waitingTeams[0].losses,
          draws: waitingTeams[0].draws,
          pitchId: waitingTeams[0].pitchId,
        };

        const teamB = {
          id: waitingTeams[1].id,
          name: waitingTeams[1].name,
          players: waitingTeams[1].players.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          wins: waitingTeams[1].wins,
          losses: waitingTeams[1].losses,
          draws: waitingTeams[1].draws,
          pitchId: waitingTeams[1].pitchId,
        };

        // Create the match object
        const newMatch: Match = {
          id: (matchHistory.length + 1).toString(), // Temporary ID
          teamA: waitingTeams[0], // Keep original team for UI
          teamB: waitingTeams[1], // Keep original team for UI
          scoreA: 0,
          scoreB: 0,
          status: "in-progress",
          startTime: new Date(),
          isActive: true,
          pitchId: selectedPitch?.id || "pitch1",
        };

        // Save to Firebase
        const matchData = {
          teamA: teamA, // Use cleaned team for Firestore
          teamB: teamB, // Use cleaned team for Firestore
          scoreA: newMatch.scoreA,
          scoreB: newMatch.scoreB,
          status: newMatch.status,
          startTime: serverTimestamp(),
          isActive: newMatch.isActive,
          pitchId: newMatch.pitchId,
          refereeId: currentUser?.id,
          matchDate: todayString, // Ensure matchDate is included
        };

        console.log("Creating new match in Firestore:", matchData);
        const docRef = await addDoc(collection(db, "matches"), matchData);
        console.log("New match created with ID:", docRef.id);

        // Update the match with the Firebase ID
        newMatch.id = docRef.id;

        setCurrentMatch(newMatch);
        setWaitingTeams(waitingTeams.slice(2));
      } catch (error) {
        console.error("Error saving match to Firebase:", error);
      } finally {
        setIsSavingMatch(false);
      }
    } else {
      // Start the timer for an existing match
      try {
        setIsSavingMatch(true);

        // Update in Firebase
        if (currentMatch.id) {
          const matchRef = doc(db, "matches", currentMatch.id);
          await updateDoc(matchRef, {
            status: "in-progress",
            startTime: serverTimestamp(),
            isActive: true,
          });
        }

        currentMatch.status = "in-progress";
        currentMatch.startTime = new Date();
        setCurrentMatch({ ...currentMatch });
      } catch (error) {
        console.error("Error updating match in Firebase:", error);
      } finally {
        setIsSavingMatch(false);
      }
    }

    setIsMatchActive(true);

    // Set match time based on pitch settings if available
    const duration = selectedPitch?.customSettings?.matchDuration || 600;
    setMatchTime(duration);
  };

  // End current match
  const endMatch = async (_reason: "time" | "goals", finalMatch?: Match) => {
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
    // If scores are equal, no winner (draw) - but endTime is still set above

    try {
      setIsSavingMatch(true);

      // Update the match in Firebase
      if (matchToEnd.id) {
        const matchRef = doc(db, "matches", matchToEnd.id);

        // Create a clean object for Firestore update
        const updateData = {
          status: "completed",
          endTime: serverTimestamp(),
          scoreA: matchToEnd.scoreA,
          scoreB: matchToEnd.scoreB,
          winner: matchToEnd.winner || null,
          isActive: false,
          matchDate: todayString, // Ensure matchDate is included
        };

        console.log("Updating match in Firestore:", matchToEnd.id, updateData);
        console.log(`Match ended as ${matchToEnd.scoreA === matchToEnd.scoreB ? 'draw' : 'win'} with endTime recorded`);
        await updateDoc(matchRef, updateData);
        console.log("Match updated successfully");
      }

      // Add match to history
      setMatchHistory([matchToEnd, ...matchHistory]);
    } catch (error) {
      console.error("Error updating match in Firebase:", error);
    } finally {
      setIsSavingMatch(false);
    }

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
  const updateScore = async (team: "A" | "B") => {
    if (!currentMatch || !isMatchActive) return;

    const updatedMatch = { ...currentMatch };

    // Get max goals from pitch settings
    const maxGoals = selectedPitch?.customSettings?.maxGoals || 2;

    if (team === "A") {
      updatedMatch.scoreA += 1;

      try {
        // Update score in Firebase
        if (updatedMatch.id) {
          const matchRef = doc(db, "matches", updatedMatch.id);
          await updateDoc(matchRef, {
            scoreA: updatedMatch.scoreA,
          });
        }

        if (updatedMatch.scoreA >= maxGoals) {
          endMatch("goals", updatedMatch);
          return;
        }
      } catch (error) {
        console.error("Error updating score in Firebase:", error);
      }
    } else {
      updatedMatch.scoreB += 1;

      try {
        // Update score in Firebase
        if (updatedMatch.id) {
          const matchRef = doc(db, "matches", updatedMatch.id);
          await updateDoc(matchRef, {
            scoreB: updatedMatch.scoreB,
          });
        }

        if (updatedMatch.scoreB >= maxGoals) {
          endMatch("goals", updatedMatch);
          return;
        }
      } catch (error) {
        console.error("Error updating score in Firebase:", error);
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

  useEffect(() => {
    // Set today's date in YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    setTodayString(dateString);
  }, []);

  // Fetch match history for the selected pitch
  useEffect(() => {
    const fetchMatchHistory = async () => {
      if (!selectedPitch) return;

      try {
        setIsHistoryLoading(true);
        console.log(
          "Fetching match history for pitch:",
          selectedPitch.id,
          "date:",
          todayString
        );

        // Fetch match history from Firestore
        const matchesRef = collection(db, "matches");
        const q = query(
          matchesRef,
          where("pitchId", "==", selectedPitch.id),
          where("matchDate", "==", todayString)
        );

        const querySnapshot = await getDocs(q);

        console.log("Match history query results:", querySnapshot.size);

        if (!querySnapshot.empty) {
          const matches: Match[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Match data:", doc.id, data);

            // Convert Firestore timestamps to Date objects
            const startTime = data.startTime?.toDate
              ? data.startTime.toDate()
              : data.startTime
              ? new Date(data.startTime)
              : new Date();

            // Ensure all completed matches have an end time
            const endTime = data.endTime?.toDate
              ? data.endTime.toDate()
              : data.endTime
              ? new Date(data.endTime)
              : data.status === "completed"
              ? new Date() // Fallback for completed matches without endTime
              : null;

            matches.push({
              id: doc.id,
              teamA: data.teamA,
              teamB: data.teamB,
              scoreA: data.scoreA || 0,
              scoreB: data.scoreB || 0,
              status: data.status,
              startTime: startTime,
              endTime: endTime,
              isActive: data.status === "in-progress",
              pitchId: data.pitchId,
              winner: data.winner || null,
            });
          });

          // Sort matches by end time, newest first
          matches.sort((a, b) => {
            // If both have end times, compare them
            if (a.endTime && b.endTime) {
              return b.endTime.getTime() - a.endTime.getTime();
            }
            // If only one has end time, that one is older
            if (a.endTime) return 1;
            if (b.endTime) return -1;
            // If neither has end time, compare start times
            return (
              (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
            );
          });

          console.log("Processed match history:", matches);
          setMatchHistory(matches);
        } else {
          console.log("No match history found for this pitch and date");
          setMatchHistory([]); // Make sure to clear previous matches
        }
      } catch (err) {
        console.error("Error fetching match history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    if (selectedPitch) {
      fetchMatchHistory();
    }
  }, [selectedPitch, todayString]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 mt-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-full max-w-md">
          <div className="bg-dark-lighter rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center mb-6">
              <svg
                className="animate-spin h-10 w-10 text-primary"
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
            </div>
            <div className="space-y-3">
              <div className="h-6 bg-dark/70 rounded w-3/4 mx-auto"></div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="h-24 bg-dark/70 rounded"></div>
                <div className="h-24 bg-dark/70 rounded"></div>
              </div>
              <div className="h-12 bg-dark/70 rounded mt-4"></div>
            </div>
          </div>
        </div>
        <p className="text-gray-400 mt-4">Loading referee data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-red-900/30 border border-red-800 text-red-100 p-6 rounded-lg flex items-start">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-3 text-red-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-200 mb-1">
              Error Loading Data
            </h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-md text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 mt-2 md:mt-6">
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 rounded-lg mb-6 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mr-2 text-primary"
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
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Today's Matches
        </h1>
      </div>

      {assignedPitches.length === 0 ? (
        <div className="bg-dark-lighter rounded-lg p-6 text-center">
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
              strokeWidth={1.5}
              d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
            />
          </svg>
          <p className="text-gray-300 text-lg mb-4">
            You don't have any pitches assigned to you yet.
          </p>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Pitch owners will assign you to their pitches when they need a
            referee. Check back later or contact the pitch owners.
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
              <div className="bg-dark-lighter rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
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
                    {selectedPitch.name}
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-300">
                    <div className="bg-dark/50 p-3 rounded-lg">
                      <p className="mb-1 text-xs text-gray-400 uppercase">
                        Location
                      </p>
                      <p>
                        {selectedPitch.location || selectedPitch.address},{" "}
                        {selectedPitch.city}
                      </p>
                    </div>

                    {selectedPitch.customSettings && (
                      <>
                        <div className="bg-dark/50 p-3 rounded-lg">
                          <p className="mb-1 text-xs text-gray-400 uppercase">
                            Match Duration
                          </p>
                          <p>
                            {Math.floor(
                              selectedPitch.customSettings.matchDuration / 60
                            )}{" "}
                            minutes
                          </p>
                        </div>
                        <div className="bg-dark/50 p-3 rounded-lg">
                          <p className="mb-1 text-xs text-gray-400 uppercase">
                            Format
                          </p>
                          <p>
                            {selectedPitch.customSettings.maxPlayersPerTeam}
                            -a-side, {selectedPitch.customSettings.maxGoals} max
                            goals
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Match Area */}
          {currentMatch ? (
            <div className="bg-dark-lighter rounded-lg overflow-hidden shadow-lg mb-6">
              <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Current Match
                  </h2>
                  <div className="px-4 py-2 bg-dark/50 rounded-lg text-white font-bold flex items-center border border-primary/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
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
                    Countdown: {formatTime(matchTime)}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center my-4 sm:my-8">
                  <div className="col-span-3 text-white">
                    <h3 className="text-lg font-bold mb-2 truncate">
                      {currentMatch.teamA.name}
                    </h3>
                    <div className="bg-dark/50 rounded-lg p-4 mb-2 border border-primary/10">
                      <span className="text-3xl sm:text-4xl font-bold text-primary">
                        {currentMatch.scoreA}
                      </span>
                    </div>
                    <button
                      onClick={() => updateScore("A")}
                      className="w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium flex items-center justify-center"
                      disabled={!isMatchActive || isSavingMatch}
                    >
                      {isSavingMatch ? (
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
                      ) : (
                        <>Goal +</>
                      )}
                    </button>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      VS
                    </div>
                  </div>

                  <div className="col-span-3 text-white">
                    <h3 className="text-lg font-bold mb-2 truncate">
                      {currentMatch.teamB.name}
                    </h3>
                    <div className="bg-dark/50 rounded-lg p-4 mb-2 border border-primary/10">
                      <span className="text-3xl sm:text-4xl font-bold text-primary">
                        {currentMatch.scoreB}
                      </span>
                    </div>
                    <button
                      onClick={() => updateScore("B")}
                      className="w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium flex items-center justify-center"
                      disabled={!isMatchActive || isSavingMatch}
                    >
                      {isSavingMatch ? (
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
                      ) : (
                        <>Goal +</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  {!isMatchActive ? (
                    <button
                      onClick={() => startMatch()}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium flex items-center"
                      disabled={isSavingMatch}
                    >
                      {isSavingMatch ? (
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
                          Starting...
                        </>
                      ) : (
                        <>Start Match</>
                      )}
                    </button>
                  ) : (
                    <div className="text-center bg-dark/50 p-4 rounded-lg border border-primary/20">
                      <p className="text-gray-300 mb-2">Match in progress</p>
                      <p className="text-xs text-gray-400">
                        Match will end automatically when time expires or max
                        goals are reached
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Available Teams */}
              <div className="bg-dark-lighter rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Available Teams
                  </h2>
                </div>
                <div className="p-4">
                  {waitingTeams.length === 0 ? (
                    <div className="p-6 text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto text-gray-500 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-gray-400">No teams available.</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Teams will appear here when they register for today's
                        matches.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {waitingTeams.map((team) => (
                        <div
                          key={team.id}
                          className="bg-dark/50 rounded-lg p-3 hover:bg-dark/70 transition-colors duration-150 border border-primary/10"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-white">
                              {team.name}
                            </h3>
                            <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
                              {team.players.length} player
                              {team.players.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <p className="text-gray-400">
                              W: {team.wins} / L: {team.losses} / D:{" "}
                              {team.draws}
                            </p>
                            {team.players.length > 0 && (
                              <div className="flex -space-x-2">
                                {team.players.slice(0, 3).map((player, _idx) => (
                                  <div
                                    key={player.id}
                                    className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs border border-primary/50"
                                    title={player.name}
                                  >
                                    {player.name.charAt(0)}
                                  </div>
                                ))}
                                {team.players.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs border border-primary/50">
                                    +{team.players.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {waitingTeams.length >= 2 && (
                    <div className="mt-4">
                      <button
                        onClick={startMatch}
                        className="w-full py-3 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium flex items-center justify-center"
                        disabled={isSavingMatch}
                      >
                        {isSavingMatch ? (
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
                        ) : (
                          <>
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
                            Start New Match
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Match History */}
              <div className="bg-dark-lighter rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary"
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
                    Today's Match History
                  </h2>
                </div>
                <div className="p-4">
                  {isHistoryLoading ? (
                    <div className="p-6 text-center">
                      <svg
                        className="animate-spin h-8 w-8 mx-auto text-primary mb-4"
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
                      <p className="text-gray-400">Loading match history...</p>
                    </div>
                  ) : matchHistory.length === 0 ? (
                    <div className="p-6 text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto text-gray-500 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <p className="text-gray-400">No matches played today.</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Completed matches will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {matchHistory.map((match, index) => {
                        // Skip rendering this match if teamA or teamB is missing
                        if (!match.teamA || !match.teamB) {
                          console.error(
                            "Invalid match data - missing teams:",
                            match
                          );
                          return (
                            <div
                              key={index}
                              className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-800"
                            >
                              <p className="text-yellow-200 font-medium">
                                Malformed match data.
                              </p>
                              <p className="text-yellow-300 text-xs">
                                Match ID: {match.id}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={index}
                            className="bg-dark/50 rounded-lg p-3 hover:bg-dark/70 transition-colors duration-150 border border-primary/10"
                          >
                            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 items-center">
                              <div className="col-span-3 text-center">
                                <p className="text-white font-medium truncate text-sm sm:text-base">
                                  {match.teamA.name}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-primary">
                                  {match.scoreA}
                                </p>
                              </div>
                              <div className="col-span-1 text-center text-xs text-gray-500">
                                vs
                              </div>
                              <div className="col-span-3 text-center">
                                <p className="text-white font-medium truncate text-sm sm:text-base">
                                  {match.teamB.name}
                                </p>
                                <p className="text-xl sm:text-2xl font-bold text-primary">
                                  {match.scoreB}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-700 flex flex-wrap sm:flex-nowrap justify-between items-center text-xs">
                              <div className="text-gray-400 w-full sm:w-auto text-center sm:text-left mb-1 sm:mb-0">
                                {match.endTime &&
                                  match.endTime.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full w-full sm:w-auto text-center ${
                                  match.winner
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                }`}
                              >
                                {match.winner
                                  ? `${match.winner.name} won`
                                  : "Draw"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
