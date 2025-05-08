import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Define types directly to avoid import issues
interface Player {
  id: string;
  name: string;
  createdAt: Date;
}

interface PitchSettings {
  matchDuration: number;
  maxGoals: number;
  allowDraws: boolean;
  maxPlayersPerTeam: number; // Maximum number of players allowed per team
  customColors?: {
    primary: string;
    secondary: string;
  };
}

interface Pitch {
  id: string;
  name: string;
  location?: string;
  description?: string;
  logo?: string;
  createdAt: Date;
  referees: string[];
  customSettings?: PitchSettings;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  pitchId: string;
  createdForDate?: string; // Date in YYYY-MM-DD format
  createdBy?: string; // User ID who created the team
}

interface UserTeamActivity {
  createdTeamId?: string;
  joinedTeamId?: string;
  date: string;
  pitchId: string;
}

// Mock pitches for the demo
const mockPitches: Pitch[] = [
  {
    id: "pitch1",
    name: "Lagos Soccerdome",
    location: "Lekki Phase 1",
    description: "Indoor 5-a-side pitch with professional turf",
    createdAt: new Date(),
    referees: ["referee1", "referee2"],
    customSettings: {
      matchDuration: 900, // 15 minutes
      maxGoals: 7,
      allowDraws: false,
      maxPlayersPerTeam: 5,
    },
  },
  {
    id: "pitch2",
    name: "Abuja Sports Arena",
    location: "Wuse Zone 5",
    description: "Outdoor pitch with floodlights",
    createdAt: new Date(),
    referees: ["referee1"],
    customSettings: {
      matchDuration: 1200, // 20 minutes
      maxGoals: 10,
      allowDraws: true,
      maxPlayersPerTeam: 5,
    },
  },
  {
    id: "pitch3",
    name: "Port Harcourt Urban Kickz",
    location: "GRA Phase 2",
    description: "Modern indoor facility with separate 5-a-side pitches",
    createdAt: new Date(),
    referees: ["referee2"],
    customSettings: {
      matchDuration: 900,
      maxGoals: 8,
      allowDraws: false,
      maxPlayersPerTeam: 5,
    },
  },
  {
    id: "pitch4",
    name: "Kano Football Factory",
    location: "Nasarawa GRA",
    description: "Large complex with multiple pitches and on-site amenities",
    createdAt: new Date(),
    referees: ["referee1", "referee3"],
    customSettings: {
      matchDuration: 1080, // 18 minutes
      maxGoals: 9,
      allowDraws: true,
      maxPlayersPerTeam: 5,
    },
  },
];

// Generate today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Remove mock teams
// const mockTodaysTeams: Team[] = [
//   {
//     id: "1",
//     name: "Lightning Warriors",
//     players: [
//       { id: "1", name: "John Doe", createdAt: new Date() },
//       { id: "2", name: "Jane Smith", createdAt: new Date() },
//       { id: "3", name: "Alex Johnson", createdAt: new Date() },
//       { id: "4", name: "Sam Wilson", createdAt: new Date() },
//       { id: "5", name: "Mike Brown", createdAt: new Date() },
//     ],
//     wins: 2,
//     losses: 1,
//     draws: 0,
//     createdAt: new Date(),
//     pitchId: "pitch1",
//     createdForDate: getTodayDateString(),
//   },
//   {
//     id: "2",
//     name: "Royal Eagles",
//     players: [
//       { id: "6", name: "Tom Smith", createdAt: new Date() },
//       { id: "7", name: "Kate Wilson", createdAt: new Date() },
//       { id: "8", name: "James Brown", createdAt: new Date() },
//       { id: "9", name: "Emma Johnson", createdAt: new Date() },
//       { id: "10", name: "Chris Davis", createdAt: new Date() },
//     ],
//     wins: 1,
//     losses: 2,
//     draws: 0,
//     createdAt: new Date(),
//     pitchId: "pitch2",
//     createdForDate: getTodayDateString(),
//   },
//   {
//     id: "3",
//     name: "Urban Kickers",
//     players: [
//       { id: "11", name: "David Lee", createdAt: new Date() },
//       { id: "12", name: "Sarah Chen", createdAt: new Date() },
//       { id: "13", name: "Ryan Parker", createdAt: new Date() },
//     ],
//     wins: 3,
//     losses: 0,
//     draws: 1,
//     createdAt: new Date(),
//     pitchId: "pitch1",
//     createdForDate: getTodayDateString(),
//   },
// ];

const TeamsPage: React.FC = () => {
  const { currentUser, selectedPitchId } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showAddPlayerForm, setShowAddPlayerForm] = useState<string | null>(
    null
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedPitch, setSelectedPitch] = useState<string>(
    selectedPitchId || localStorage.getItem("selectedPitchId") || ""
  );
  const [pitches, setPitches] = useState<Pitch[]>(mockPitches);
  const [noPitchSelected, setNoPitchSelected] = useState(false);
  const [todayDateString] = useState<string>(getTodayDateString());
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [firebasePitchData, setFirebasePitchData] = useState<Pitch | null>(
    null
  );
  const [userTeamActivity, setUserTeamActivity] =
    useState<UserTeamActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshingTeam, setRefreshingTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add scroll to top effect
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Debug log to check the selected pitch ID
  useEffect(() => {
    console.log("TeamsPage - Selected Pitch ID from context:", selectedPitchId);
    console.log(
      "TeamsPage - Selected Pitch ID from localStorage:",
      localStorage.getItem("selectedPitchId")
    );
    console.log("TeamsPage - Current selectedPitch state:", selectedPitch);
  }, [selectedPitchId, selectedPitch]);

  useEffect(() => {
    // If we have a selected pitch from context, use it
    const contextPitchId = selectedPitchId;
    const localStoragePitchId = localStorage.getItem("selectedPitchId");

    console.log(
      "Checking pitch IDs - Context:",
      contextPitchId,
      "LocalStorage:",
      localStoragePitchId
    );

    if (contextPitchId || localStoragePitchId) {
      const pitchIdToUse = contextPitchId || localStoragePitchId;
      console.log("Setting selected pitch to:", pitchIdToUse);
      setSelectedPitch(pitchIdToUse || "");
      setNoPitchSelected(false);

      // Force update selected pitch object
      if (pitchIdToUse) {
        const foundPitch = pitches.find((p) => p.id === pitchIdToUse);
        if (!foundPitch) {
          console.warn(
            `Pitch with ID ${pitchIdToUse} not found in pitches array`,
            pitches
          );

          // If the pitch doesn't exist in our mock data, try to fetch it from PitchesPage mock data
          // (This is a workaround for demo purposes; in a real app we'd fetch from an API)
          const mockPitchData: Record<
            string,
            { id: string; name: string; location: string }
          > = {
            pitch1: {
              id: "pitch1",
              name: "Lagos Soccerdome",
              location: "Lekki Phase 1",
            },
            pitch2: {
              id: "pitch2",
              name: "Abuja Sports Arena",
              location: "Wuse Zone 5",
            },
            pitch3: {
              id: "pitch3",
              name: "Port Harcourt Urban Kickz",
              location: "GRA Phase 2",
            },
            pitch4: {
              id: "pitch4",
              name: "Kano Football Factory",
              location: "Nasarawa GRA",
            },
          };

          if (mockPitchData[pitchIdToUse]) {
            // Add this pitch to our pitches array
            const newPitch = {
              ...mockPitchData[pitchIdToUse],
              createdAt: new Date(),
              referees: [],
              customSettings: {
                matchDuration: 900,
                maxGoals: 7,
                allowDraws: false,
                maxPlayersPerTeam: 5,
              },
            };

            console.log("Adding missing pitch to pitches array:", newPitch);
            setPitches((currentPitches) => [
              ...currentPitches,
              newPitch as Pitch,
            ]);
          }
        }
      }
    } else if (!selectedPitch && pitches.length > 0) {
      // If no pitch is selected, prompt the user to select one
      console.log("No pitch selected, showing prompt");
      setNoPitchSelected(true);
    }
  }, [selectedPitchId, selectedPitch, pitches]);

  // When selectedPitch changes, update the filtered teams
  useEffect(() => {
    // Make sure the selectedPitch is current
    if (selectedPitchId && selectedPitchId !== selectedPitch) {
      setSelectedPitch(selectedPitchId);
    }

    // No need to filter here - we'll use the filteredTeams computed value
  }, [selectedPitchId, selectedPitch]);

  // Check if user has already created/joined a team today
  useEffect(() => {
    const checkUserTeamActivity = async () => {
      if (!currentUser || !selectedPitch) return;

      try {
        setIsLoading(true);

        // First try to fetch from Firebase
        const teamsRef = collection(db, "teams");

        // Check if user created a team today for this pitch
        const createdTeamQuery = query(
          teamsRef,
          where("createdBy", "==", currentUser.id),
          where("createdForDate", "==", todayDateString),
          where("pitchId", "==", selectedPitch)
        );

        const createdTeamSnapshot = await getDocs(createdTeamQuery);
        let createdTeamId: string | undefined;

        if (!createdTeamSnapshot.empty) {
          createdTeamId = createdTeamSnapshot.docs[0].id;
        }

        // Check if user joined a team today
        const joinedTeamIds: string[] = [];
        for (const team of teams) {
          if (
            team.pitchId === selectedPitch &&
            team.players.some((player) => player.id === currentUser.id)
          ) {
            joinedTeamIds.push(team.id);
          }
        }

        const joinedTeamId =
          joinedTeamIds.length > 0 ? joinedTeamIds[0] : undefined;

        setUserTeamActivity({
          createdTeamId,
          joinedTeamId,
          date: todayDateString,
          pitchId: selectedPitch,
        });

        // Update the teams with the user's created team if it exists
        if (createdTeamId && !teams.some((t) => t.id === createdTeamId)) {
          const createdTeamData = createdTeamSnapshot.docs[0].data();
          const teamToAdd: Team = {
            id: createdTeamId,
            name: createdTeamData.name,
            players: createdTeamData.players || [],
            wins: createdTeamData.wins || 0,
            losses: createdTeamData.losses || 0,
            draws: createdTeamData.draws || 0,
            createdAt: new Date(createdTeamData.createdAt.toDate()),
            pitchId: createdTeamData.pitchId,
            createdForDate: createdTeamData.createdForDate,
            createdBy: createdTeamData.createdBy,
          };

          setTeams((prev) => [...prev, teamToAdd]);
        }
      } catch (error) {
        console.error("Error checking user team activity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserTeamActivity();
  }, [currentUser, selectedPitch, todayDateString, teams]);

  // Fetch teams for the selected pitch and today's date
  const fetchTeams = async () => {
    if (!selectedPitch) return;

    try {
      setIsLoading(true);

      // First try to fetch from Firebase
      const teamsRef = collection(db, "teams");
      const q = query(
        teamsRef,
        where("pitchId", "==", selectedPitch),
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

        setTeams(firebaseTeams);
      } else {
        // If no teams in Firebase, set an empty array instead of using mock data
        setTeams([]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      // Set empty array instead of using mock data
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [selectedPitch, todayDateString]);

  const handleAddTeam = async () => {
    if (newTeamName.trim() === "") return;
    if (!currentUser) {
      setErrorMessage("You must be logged in to create a team");
      return;
    }

    if (userTeamActivity?.createdTeamId) {
      setErrorMessage("You have already created a team today");
      return;
    }

    if (userTeamActivity?.joinedTeamId) {
      setErrorMessage(
        "You have already joined a team today and cannot create a new team"
      );
      return;
    }

    try {
      const newTeamData = {
        name: newTeamName,
        players: [
          {
            id: currentUser.id,
            name: currentUser.name || "Anonymous Player",
            createdAt: new Date(),
          },
        ],
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date(),
        pitchId: selectedPitch,
        createdForDate: todayDateString,
        createdBy: currentUser.id,
      };

      // Add to Firebase
      let newTeamId: string;
      try {
        const docRef = await addDoc(collection(db, "teams"), newTeamData);
        newTeamId = docRef.id;
      } catch (error) {
        console.error("Error adding team to Firebase:", error);
        // Fallback to local ID for demo
        newTeamId = (teams.length + 1).toString();
      }

      const newTeam: Team = {
        ...newTeamData,
        id: newTeamId,
      };

      setTeams([...teams, newTeam]);
      setNewTeamName("");
      setShowAddTeamForm(false);

      // Update user team activity
      setUserTeamActivity({
        createdTeamId: newTeamId,
        joinedTeamId: newTeamId, // Creating a team means you're also in it
        date: todayDateString,
        pitchId: selectedPitch,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      setErrorMessage("Failed to create team. Please try again.");
    }
  };

  const handleAddPlayer = async (teamId: string) => {
    if (newPlayerName.trim() === "") return;
    if (!currentUser) {
      setErrorMessage("You must be logged in to join a team");
      return;
    }

    if (userTeamActivity?.joinedTeamId) {
      setErrorMessage("You have already joined a team today");
      return;
    }

    try {
      const newPlayer: Player = {
        id: currentUser.id,
        name: newPlayerName,
        createdAt: new Date(),
      };

      const updatedTeams = teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            players: [...team.players, newPlayer],
          };
        }
        return team;
      });

      setTeams(updatedTeams);
      setNewPlayerName("");
      setShowAddPlayerForm(null);

      // Update the team in Firebase
      try {
        const teamRef = doc(db, "teams", teamId);
        const teamSnapshot = await getDoc(teamRef);

        if (teamSnapshot.exists()) {
          const teamData = teamSnapshot.data();
          const updatedPlayers = [...(teamData.players || []), newPlayer];

          await setDoc(teamRef, { players: updatedPlayers }, { merge: true });
        }
      } catch (error) {
        console.error("Error updating team in Firebase:", error);
      }

      // Update user team activity
      setUserTeamActivity({
        ...userTeamActivity,
        joinedTeamId: teamId,
        date: todayDateString,
        pitchId: selectedPitch,
      });
    } catch (error) {
      console.error("Error joining team:", error);
      setErrorMessage("Failed to join team. Please try again.");
    }
  };

  // Navigate to pitches page if user needs to select a pitch
  const handleBrowsePitches = () => {
    navigate("/pitches");
  };

  // Fetch the real pitch data from Firebase when we have a Firebase ID
  useEffect(() => {
    const fetchPitchFromFirebase = async () => {
      // Only proceed if we have a pitch ID that looks like a Firebase ID
      if (!selectedPitch || selectedPitch.startsWith("pitch")) {
        return;
      }

      try {
        console.log("Fetching pitch data from Firebase for ID:", selectedPitch);
        setLoadingPitch(true);

        // Fetch the pitch document from Firestore
        const pitchRef = doc(db, "pitches", selectedPitch);
        const pitchSnapshot = await getDoc(pitchRef);

        if (pitchSnapshot.exists()) {
          const data = pitchSnapshot.data();
          console.log("Firebase pitch data:", data);

          // Create a valid Pitch object from the data
          let createdAtDate = new Date();
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === "function") {
              createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            } else {
              createdAtDate = new Date(data.createdAt);
            }
          }

          const pitchData: Pitch = {
            id: pitchSnapshot.id,
            name: data.name || "Unknown Pitch",
            location: data.location || "",
            description: data.description || "",
            createdAt: createdAtDate,
            referees: data.referees || [],
            customSettings: data.customSettings || {
              matchDuration: 900,
              maxGoals: 7,
              allowDraws: false,
              maxPlayersPerTeam: 5,
            },
          };

          setFirebasePitchData(pitchData);

          // Update localStorage with the real data
          const storageData = {
            id: pitchData.id,
            name: pitchData.name,
            location: pitchData.location,
          };
          localStorage.setItem(
            "selectedPitchData",
            JSON.stringify(storageData)
          );

          // Add to the pitches array if not already there
          if (!pitches.some((p) => p.id === pitchData.id)) {
            setPitches((current) => [...current, pitchData]);
          }
        } else {
          console.log("No pitch found with ID:", selectedPitch);
        }
      } catch (error) {
        console.error("Error fetching pitch data:", error);
      } finally {
        setLoadingPitch(false);
      }
    };

    fetchPitchFromFirebase();
  }, [selectedPitch, pitches]);

  // Find the selected pitch - prioritize Firebase data if available
  const selectedPitchObject = useMemo(() => {
    // If we have data from Firebase, use it
    if (firebasePitchData && firebasePitchData.id === selectedPitch) {
      return firebasePitchData;
    }

    // First try to find pitch in our mock data
    const pitch = pitches.find((pitch) => pitch.id === selectedPitch);

    // If not found and we have a real Firebase ID (doesn't match our mock IDs pattern)
    if (!pitch && selectedPitch && !selectedPitch.startsWith("pitch")) {
      // Try to get pitch data from localStorage
      const storedPitchData = localStorage.getItem("selectedPitchData");
      let pitchName = "Your Selected Pitch";
      let pitchLocation = "From Pitches Page";

      // If we have stored pitch data, use it
      if (storedPitchData) {
        try {
          const parsedData = JSON.parse(storedPitchData);
          if (parsedData.name) pitchName = parsedData.name;
          if (parsedData.location) pitchLocation = parsedData.location;
          console.log("Using stored pitch data:", parsedData);
        } catch (e) {
          console.error("Error parsing stored pitch data:", e);
        }
      }

      // Create a dynamic pitch object with better values
      console.log(
        "Creating fallback pitch object for Firebase ID:",
        selectedPitch
      );
      return {
        id: selectedPitch,
        name: pitchName,
        location: pitchLocation,
        description: "This pitch was selected from the Pitches page",
        createdAt: new Date(),
        referees: [],
        customSettings: {
          matchDuration: 900,
          maxGoals: 7,
          allowDraws: false,
          maxPlayersPerTeam: 5,
        },
      };
    }

    return pitch;
  }, [pitches, selectedPitch, firebasePitchData]);

  // Debug log to check the selected pitch ID
  useEffect(() => {
    console.log(
      "Pitch IDs in TeamsPage:",
      pitches.map((p) => p.id)
    );
    console.log("Selected Pitch ID:", selectedPitch);
    console.log("Found Pitch Object:", selectedPitchObject);

    // Check if the selected pitch exists in our mock data
    const pitchExists = pitches.some((p) => p.id === selectedPitch);
    console.log("Selected pitch exists in mock data:", pitchExists);

    if (!pitchExists && selectedPitch) {
      console.warn(
        "Selected pitch ID doesn't match any pitch in the mock data"
      );
    }
  }, [selectedPitch, pitches, selectedPitchObject]);

  // Add real Firebase IDs to our mock data permanently
  useEffect(() => {
    if (selectedPitch && !pitches.some((p) => p.id === selectedPitch)) {
      // This pitch ID doesn't exist in our mock data but is selected
      if (!selectedPitch.startsWith("pitch")) {
        // It's a Firebase ID - create a new pitch object and add it to our list
        const newPitch: Pitch = {
          id: selectedPitch,
          name: "Selected Pitch",
          location: "From Firebase",
          description: "This pitch was selected from the Pitches page",
          createdAt: new Date(),
          referees: [],
          customSettings: {
            matchDuration: 900,
            maxGoals: 7,
            allowDraws: false,
            maxPlayersPerTeam: 5,
          },
        };

        console.log("Adding Firebase pitch to mock data:", newPitch);
        setPitches((currentPitches) => [...currentPitches, newPitch]);
      }
    }
  }, [selectedPitch, pitches]);

  // Update display for loading state
  const renderSelectedPitchSection = () => {
    if (selectedPitchObject) {
      return (
        <div className="bg-dark-light/30 p-4 rounded-lg border border-primary/30 mb-4 transition-all duration-200 hover:border-primary/50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-primary">
              {selectedPitchObject.name}
            </h3>
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full mt-1 md:mt-0">
              Selected Pitch
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {selectedPitchObject.location}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            {selectedPitchObject.description}
          </p>
          {selectedPitchObject.customSettings && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                {selectedPitchObject.customSettings.matchDuration / 60} min
                matches
              </span>
              <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                Max {selectedPitchObject.customSettings.maxGoals} goals
              </span>
              <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                Draws{" "}
                {selectedPitchObject.customSettings.allowDraws
                  ? "allowed"
                  : "not allowed"}
              </span>
              <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                {selectedPitchObject.customSettings.maxPlayersPerTeam}-a-side
              </span>
            </div>
          )}
        </div>
      );
    } else if (
      loadingPitch ||
      (selectedPitch && !selectedPitch.startsWith("pitch"))
    ) {
      return (
        <div className="bg-dark-light/30 p-4 rounded-lg border border-primary/30 mb-4">
          <div className="flex items-center">
            <div className="animate-spin mr-3 h-5 w-5 border-t-2 border-b-2 border-primary rounded-full"></div>
            <p className="text-gray-300">Loading pitch information...</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-md mb-4">
          <p className="mb-3 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-red-400"
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
            No pitch selected. Please select a pitch before proceeding.
          </p>
          <button
            onClick={handleBrowsePitches}
            className="bg-dark hover:bg-dark-light text-white px-4 py-2 rounded-md text-sm flex items-center"
          >
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
            Browse Pitches
          </button>
        </div>
      );
    }
  };

  // Filter teams by selected pitch, today's date, and search query
  const filteredTeams = useMemo(() => {
    const teamsByPitchAndDate = teams.filter(
      (team) =>
        team.pitchId === selectedPitch &&
        team.createdForDate === todayDateString
    );

    if (!searchQuery.trim()) {
      return teamsByPitchAndDate;
    }

    const query = searchQuery.toLowerCase();
    return teamsByPitchAndDate.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.players.some((player) => player.name.toLowerCase().includes(query))
    );
  }, [teams, selectedPitch, todayDateString, searchQuery]);

  // Check if a team is full based on pitch settings
  const isTeamFull = (team: Team) => {
    const maxPlayers =
      selectedPitchObject?.customSettings?.maxPlayersPerTeam || 5;
    return team.players.length >= maxPlayers;
  };

  // Check if the current user created this team
  const isUserTeamCreator = (team: Team) => team.createdBy === currentUser?.id;

  // Check if the current user joined this team
  const isUserInTeam = (team: Team) =>
    team.players.some((player) => player.id === currentUser?.id);

  // Add refresh function for all teams
  const refreshAllTeams = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Fetch teams from Firebase
      const teamsRef = collection(db, "teams");
      const q = query(
        teamsRef,
        where("pitchId", "==", selectedPitch),
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

        setTeams(firebaseTeams);
      } else {
        // If no teams in Firebase, set empty array instead of using mock data
        setTeams([]);
      }
    } catch (error) {
      console.error("Error refreshing teams:", error);
      setErrorMessage("Failed to refresh teams. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add refresh function for a single team's players
  const refreshTeamPlayers = async (teamId: string) => {
    setRefreshingTeam(teamId);

    try {
      const teamRef = doc(db, "teams", teamId);
      const teamSnapshot = await getDoc(teamRef);

      if (teamSnapshot.exists()) {
        const teamData = teamSnapshot.data();

        // Update this specific team's players in the local state
        setTeams((prevTeams) =>
          prevTeams.map((team) => {
            if (team.id === teamId) {
              return {
                ...team,
                players: teamData.players || [],
              };
            }
            return team;
          })
        );
      }
    } catch (error) {
      console.error(`Error refreshing team ${teamId} players:`, error);
    } finally {
      setRefreshingTeam(null);
    }
  };

  // Add function to handle leaving a team
  const handleLeaveTeam = async (teamId: string) => {
    if (!currentUser) {
      setErrorMessage("You must be logged in to leave a team");
      return;
    }

    setIsLoading(true);

    try {
      // Find the team and remove the current user from its players
      const updatedTeams = teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            players: team.players.filter(
              (player) => player.id !== currentUser.id
            ),
          };
        }
        return team;
      });

      setTeams(updatedTeams);

      // Update the team in Firebase
      try {
        const teamRef = doc(db, "teams", teamId);
        const teamSnapshot = await getDoc(teamRef);

        if (teamSnapshot.exists()) {
          const teamData = teamSnapshot.data();
          const updatedPlayers = (teamData.players || []).filter(
            (player: Player) => player.id !== currentUser.id
          );

          await setDoc(teamRef, { players: updatedPlayers }, { merge: true });
        }
      } catch (error) {
        console.error("Error updating team in Firebase:", error);
      }

      // Update user team activity - remove joinedTeamId
      setUserTeamActivity((prev) =>
        prev
          ? {
              ...prev,
              joinedTeamId: undefined,
            }
          : null
      );

      // If the user was also the creator of this team and it now has no players, consider deleting it
      const team = teams.find((t) => t.id === teamId);
      if (team?.createdBy === currentUser.id && team.players.length <= 1) {
        setErrorMessage(
          "Note: You created this team. As you've left, the team may be deleted if empty."
        );
      }
    } catch (error) {
      console.error("Error leaving team:", error);
      setErrorMessage("Failed to leave team. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Pitch Selection Section */}
      <div className="bg-dark-lighter p-6 rounded-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-green-500/50"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="mr-2">Selected Pitch</span>
            {selectedPitchObject && (
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                Active
              </span>
            )}
          </h2>
          {renderSelectedPitchSection()}

          <div className="flex justify-between items-center">
            <div>
              <Link
                to="/pitches"
                className="text-primary text-sm hover:underline flex items-center"
              >
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
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
                Change pitch
              </Link>
            </div>
            <div className="bg-dark/50 px-3 py-1 rounded-lg flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-primary font-semibold">
                Today: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header with stats */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold sport-gradient-text mb-2">
              Teams for Today at {selectedPitchObject?.name || "Your Pitch"}
            </h2>
            <p className="text-gray-400 text-sm flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Create or join teams for matches on{" "}
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex mt-4 md:mt-0 space-x-2">
            <button
              className="btn-secondary flex items-center"
              onClick={refreshAllTeams}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              className={`btn-primary flex items-center ${
                !selectedPitchObject ||
                userTeamActivity?.createdTeamId ||
                userTeamActivity?.joinedTeamId
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() => {
                if (!selectedPitch) {
                  setNoPitchSelected(true);
                  return;
                }

                if (userTeamActivity?.createdTeamId) {
                  setErrorMessage("You have already created a team today");
                  return;
                }

                if (userTeamActivity?.joinedTeamId) {
                  setErrorMessage(
                    "You have already joined a team today and cannot create a new team"
                  );
                  return;
                }

                setShowAddTeamForm(!showAddTeamForm);
              }}
              disabled={
                !selectedPitchObject ||
                !!userTeamActivity?.createdTeamId ||
                !!userTeamActivity?.joinedTeamId
              }
            >
              {showAddTeamForm ? (
                <span>Cancel</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                  Create New Team
                </>
              )}
            </button>
          </div>
        </div>

        {noPitchSelected && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-md mb-4">
            Please select a pitch first before creating a team.
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-md mb-4">
            {errorMessage}
            <button
              className="ml-2 text-red-300 hover:text-red-100"
              onClick={() => setErrorMessage(null)}
            >
              ✕
            </button>
          </div>
        )}

        {userTeamActivity && (
          <div className="bg-primary/10 border border-primary/30 text-primary p-3 rounded-md mb-4">
            {userTeamActivity.createdTeamId && (
              <div>You created a team today at this pitch</div>
            )}
            {userTeamActivity.joinedTeamId &&
              !userTeamActivity.createdTeamId && (
                <div>You joined a team today at this pitch</div>
              )}
          </div>
        )}

        {/* Form to add a new team */}
        {showAddTeamForm && (
          <div className="bg-dark-lighter p-4 rounded-lg mb-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-3">Create New Team</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="bg-dark border border-gray-700 rounded px-4 py-2 flex-grow focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-grow md:flex-grow-0"
                  onClick={handleAddTeam}
                >
                  Create Team
                </button>
                <button
                  className="btn-secondary flex-grow md:flex-grow-0"
                  onClick={() => setShowAddTeamForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search box for teams */}
        <div className="bg-dark-lighter p-4 rounded-lg mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for teams or players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                onClick={() => setSearchQuery("")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-400">
              {filteredTeams.length === 0
                ? "No teams match your search"
                : `Found ${filteredTeams.length} teams matching "${searchQuery}"`}
            </div>
          )}
        </div>

        {/* Teams grid */}
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className={`team-card ${
                    isUserInTeam(team)
                      ? "border-primary/50"
                      : "hover:border-primary/50"
                  } transition-colors duration-200`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {team.name}
                        {isUserTeamCreator(team) && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary/30 text-primary">
                            Your team
                          </span>
                        )}
                      </h3>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1 text-green-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {team.wins} W
                        </span>
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1 text-red-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {team.losses} L
                        </span>
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1 text-yellow-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {team.draws} D
                        </span>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs ${
                        isTeamFull(team)
                          ? "bg-red-500/20 text-red-500"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {isTeamFull(team)
                        ? "Full team"
                        : `Need ${
                            (selectedPitchObject?.customSettings
                              ?.maxPlayersPerTeam || 5) - team.players.length
                          } more`}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-300">
                        Players ({team.players.length}/
                        {selectedPitchObject?.customSettings
                          ?.maxPlayersPerTeam || 5}
                        )
                      </h4>
                      <button
                        className="text-xs text-primary flex items-center hover:text-primary/80"
                        onClick={() => refreshTeamPlayers(team.id)}
                        disabled={refreshingTeam === team.id}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-3 w-3 mr-1 ${
                            refreshingTeam === team.id ? "animate-spin" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Refresh
                      </button>
                    </div>
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center py-1.5 px-3 ${
                            player.id === currentUser?.id
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-dark-lighter"
                          } rounded`}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-3">
                            {player.name.charAt(0)}
                          </div>
                          <span className="text-sm flex-grow">
                            {player.name}
                            {player.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-primary">
                                (You)
                              </span>
                            )}
                            {player.id === team.createdBy && (
                              <span className="ml-2 text-xs text-gray-400">
                                (Captain)
                              </span>
                            )}
                          </span>
                          {player.id === currentUser?.id && (
                            <button
                              className="text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleLeaveTeam(team.id)}
                            >
                              Leave
                            </button>
                          )}
                        </div>
                      ))}

                      {!isTeamFull(team) &&
                        !isUserInTeam(team) &&
                        !userTeamActivity?.joinedTeamId &&
                        showAddPlayerForm !== team.id && (
                          <button
                            className="w-full py-1.5 px-3 border border-dashed border-gray-600 rounded flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors duration-200"
                            onClick={() => setShowAddPlayerForm(team.id)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-2"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                            Join this team
                          </button>
                        )}

                      {!isTeamFull(team) &&
                        userTeamActivity?.joinedTeamId &&
                        !isUserInTeam(team) && (
                          <div className="w-full py-1.5 px-3 border border-dashed border-gray-600 rounded text-center text-gray-400 text-sm">
                            You've already joined a team today
                          </div>
                        )}

                      {showAddPlayerForm === team.id && (
                        <div className="flex items-center gap-2 mt-3">
                          <input
                            type="text"
                            placeholder="Your name"
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            className="bg-dark border border-gray-700 rounded px-3 py-1.5 text-sm flex-grow focus:outline-none focus:border-primary"
                          />
                          <button
                            className="btn-primary text-sm py-1.5"
                            onClick={() => handleAddPlayer(team.id)}
                          >
                            Join
                          </button>
                          <button
                            className="btn-secondary text-sm py-1.5"
                            onClick={() => setShowAddPlayerForm(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-dark-lighter rounded-xl border border-gray-700">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-light/50 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">
                  No teams yet at {selectedPitchObject?.name}
                </h3>
                <p className="text-gray-400 mb-4">
                  Be the first to create a team for today's matches at this
                  pitch!
                </p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 justify-center">
                  <button
                    className="btn-secondary flex items-center mx-auto justify-center"
                    onClick={refreshAllTeams}
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </button>
                  <button
                    className={`btn-primary flex items-center mx-auto justify-center ${
                      !selectedPitchObject || userTeamActivity?.createdTeamId
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={() => {
                      if (userTeamActivity?.createdTeamId) {
                        setErrorMessage(
                          "You have already created a team today"
                        );
                        return;
                      }
                      setShowAddTeamForm(true);
                    }}
                    disabled={
                      !selectedPitchObject || !!userTeamActivity?.createdTeamId
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Create the first team
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsPage;
