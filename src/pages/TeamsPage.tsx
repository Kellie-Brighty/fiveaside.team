import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

// Add PaystackPop to window global
declare global {
  interface Window {
    PaystackPop: any;
  }
}

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
  maxPlayersPerTeam?: number; // Maximum number of players allowed per team, now optional to fix linter errors
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
  availability?: {
    daysOpen: string[];
    openingTime: string;
    closingTime: string;
    bookingHours?: {
      start: string;
      end: string;
    };
    openBookingHours?: {
      start: string;
      end: string;
    };
  };
  bookingSettings?: {
    allowOnlineBooking: boolean;
    allowOpenBooking: boolean;
    onlinePaymentType: "timeSlot" | "perHead";
    onlineTimeSlotPrice?: number;
    physicalPaymentType: "timeSlot" | "perHead";
    physicalTimeSlotPrice?: number;
  };
  pricePerPerson?: number;
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
  maxPlayers?: number; // Maximum number of players allowed in this team (3, 4, or 5-a-side)
  booking?: {
    startTime?: string; // HH:MM format
    endTime?: string; // HH:MM format
    isPaid: boolean;
    paymentAmount: number;
    paymentMethod: "online" | "physical";
    paymentDate?: Date;
    bookingCode: string; // Unique code for this booking
  };
  sessionId?: string | null; // Optional session ID
}

interface UserTeamActivity {
  createdTeamId?: string;
  joinedTeamId?: string;
  date: string;
  pitchId: string;
  sessionId?: string | null; // Added sessionId property
}

// New interface for available timeslots
interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
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
  // const navigate ();
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatorPlayerName, setCreatorPlayerName] = useState("");

  const [selectedPitch, setSelectedPitch] = useState<string>(
    selectedPitchId || localStorage.getItem("selectedPitchId") || ""
  );
  const [pitches, setPitches] = useState<Pitch[]>(mockPitches);
  const [noPitchSelected, setNoPitchSelected] = useState(false);
  const [todayDateString] = useState<string>(getTodayDateString());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [selectedSlotHours, setSelectedSlotHours] = useState<number>(1);
  const [selectedMultiSlotEndTime, setSelectedMultiSlotEndTime] =
    useState<string>("");
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>("");
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [bookingType, setBookingType] = useState<"online" | "physical" | null>(
    null
  );
  const [_loadingPitch, setLoadingPitch] = useState(false);
  const [firebasePitchData, setFirebasePitchData] = useState<Pitch | null>(
    null
  );
  const [userTeamActivity, setUserTeamActivity] =
    useState<UserTeamActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);
  // Add state for join team name input
  const [joinPlayerName, setJoinPlayerName] = useState<string>("");
  const [showJoinForm, setShowJoinForm] = useState<string | null>(null);
  // State for Paystack payment
  // const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [_paymentAmount, setPaymentAmount] = useState(0);
  const [_paymentProcessing, setPaymentProcessing] = useState(false);
  const [_paymentPurpose, setPaymentPurpose] = useState("Team Booking");
  // State for private session
  const [privateSessionId, setPrivateSessionId] = useState<string | null>(null);
  const [privateSessionLink, setPrivateSessionLink] = useState<string>("");
  const [isPrivateSession, setIsPrivateSession] = useState(false);
  // Add to state declarations near the top where other state variables are defined
  const [isSessionCreator, setIsSessionCreator] = useState(false);

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

      console.log("Checking user team activity for:", {
        userId: currentUser.id,
        pitchId: selectedPitch,
        date: todayDateString,
        isPrivateSession,
        privateSessionId,
      });

      try {
        setIsLoading(true);

        // First try to fetch from Firebase
        const teamsRef = collection(db, "teams");

        // Check if user created a team today for this pitch
        // In a private session, only consider teams for this session
        let createdTeamQuery;
        if (isPrivateSession && privateSessionId) {
          createdTeamQuery = query(
            teamsRef,
            where("createdBy", "==", currentUser.id),
            where("createdForDate", "==", todayDateString),
            where("pitchId", "==", selectedPitch),
            where("sessionId", "==", privateSessionId)
          );
        } else {
          createdTeamQuery = query(
            teamsRef,
            where("createdBy", "==", currentUser.id),
            where("createdForDate", "==", todayDateString),
            where("pitchId", "==", selectedPitch)
          );
        }

        const createdTeamSnapshot = await getDocs(createdTeamQuery);
        let createdTeamId: string | undefined;

        console.log(
          `Found ${createdTeamSnapshot.size} teams created by the user today`
        );

        if (!createdTeamSnapshot.empty) {
          createdTeamId = createdTeamSnapshot.docs[0].id;
          console.log("User created team ID:", createdTeamId);
        }

        // Check if user joined a team today by querying for teams where the user is in the players array
        // Since Firestore can't query into arrays, we need to fetch all teams for this pitch and date
        // and then filter locally
        let pitchTeamsQuery;
        if (isPrivateSession && privateSessionId) {
          // In a private session, only consider teams for this session
          pitchTeamsQuery = query(
            teamsRef,
            where("pitchId", "==", selectedPitch),
            where("createdForDate", "==", todayDateString),
            where("sessionId", "==", privateSessionId)
          );
        } else {
          // In a public session, only consider public teams
          pitchTeamsQuery = query(
            teamsRef,
            where("pitchId", "==", selectedPitch),
            where("createdForDate", "==", todayDateString)
          );
        }

        const pitchTeamsSnapshot = await getDocs(pitchTeamsQuery);
        console.log(
          `Found ${pitchTeamsSnapshot.size} teams for this pitch today`
        );

        let joinedTeamId: string | undefined;

        pitchTeamsSnapshot.forEach((doc) => {
          const teamData = doc.data();
          const players = teamData.players || [];

          // Check if user is in this team's players
          if (players.some((player: any) => player.id === currentUser.id)) {
            joinedTeamId = doc.id;
            console.log("User is in team ID:", joinedTeamId);
          }
        });

        // Update activity state with what we found
        const updatedActivity = {
          createdTeamId,
          joinedTeamId,
          date: todayDateString,
          pitchId: selectedPitch,
          sessionId: isPrivateSession ? privateSessionId : null,
        };

        console.log("Setting user team activity:", updatedActivity);
        setUserTeamActivity(updatedActivity);

        // Update the teams with the user's created team if it exists
        if (createdTeamId && !teams.some((t) => t.id === createdTeamId)) {
          const createdTeamDoc = createdTeamSnapshot.docs[0];
          const createdTeamData = createdTeamDoc.data();

          // Handle date conversion properly
          let createdAtDate: Date;
          try {
            // Handle Firestore Timestamp
            createdAtDate = createdTeamData.createdAt.toDate();
          } catch (e) {
            // Fallback for other date formats
            createdAtDate = new Date(createdTeamData.createdAt);
          }

          const teamToAdd: Team = {
            id: createdTeamId,
            name: createdTeamData.name,
            players: createdTeamData.players || [],
            wins: createdTeamData.wins || 0,
            losses: createdTeamData.losses || 0,
            draws: createdTeamData.draws || 0,
            createdAt: createdAtDate,
            pitchId: createdTeamData.pitchId,
            createdForDate: createdTeamData.createdForDate,
            createdBy: createdTeamData.createdBy,
            maxPlayers: createdTeamData.maxPlayers,
            sessionId: createdTeamData.sessionId,
          };

          console.log("Adding created team to local state:", teamToAdd);
          setTeams((prev) => [...prev, teamToAdd]);
        }
      } catch (error) {
        console.error("Error checking user team activity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserTeamActivity();
  }, [
    currentUser,
    selectedPitch,
    todayDateString,
    isPrivateSession,
    privateSessionId,
    teams,
  ]);

  // Fetch teams for the selected pitch and today's date
  const fetchTeams = async () => {
    if (!selectedPitch) return;

    console.log(
      "Fetching teams for pitch:",
      selectedPitch,
      "date:",
      todayDateString,
      "isPrivateSession:",
      isPrivateSession,
      "sessionId:",
      privateSessionId
    );

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // First try to fetch from Firebase
      const teamsRef = collection(db, "teams");

      // For debugging, let's get ALL teams for this pitch and date
      const allTeamsForPitchQuery = query(
        teamsRef,
        where("pitchId", "==", selectedPitch),
        where("createdForDate", "==", todayDateString)
      );

      const allTeamsForPitchSnapshot = await getDocs(allTeamsForPitchQuery);
      console.log(
        `Found ${allTeamsForPitchSnapshot.size} total teams for this pitch and date`
      );

      // Log all teams to see what sessionIds they have
      allTeamsForPitchSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `Team: ${doc.id} - Name: "${data.name}", SessionId: "${
            data.sessionId || "null"
          }"`
        );
      });

      // Now let's try a direct query for teams with this session ID
      if (isPrivateSession && privateSessionId) {
        const privateSessionTeamsQuery = query(
          teamsRef,
          where("sessionId", "==", privateSessionId)
        );

        const privateSessionTeamsSnapshot = await getDocs(
          privateSessionTeamsQuery
        );
        console.log(
          `Direct query found ${privateSessionTeamsSnapshot.size} teams with sessionId=${privateSessionId}`
        );

        privateSessionTeamsSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(
            `Session team direct: ${doc.id} - "${data.name}" - PitchId: "${data.pitchId}" - Date: "${data.createdForDate}"`
          );
        });
      }

      // Get the right teams based on session state
      let teamsToFetch;

      if (isPrivateSession && privateSessionId) {
        console.log(
          `Using private session filter with sessionId = "${privateSessionId}"`
        );
        // Get teams for this private session
        teamsToFetch = query(
          teamsRef,
          where("sessionId", "==", privateSessionId)
        );
      } else {
        console.log("Using public session filter (all teams for pitch/date)");
        // Get all teams for this pitch and date
        teamsToFetch = query(
          teamsRef,
          where("pitchId", "==", selectedPitch),
          where("createdForDate", "==", todayDateString)
        );
      }

      const querySnapshot = await getDocs(teamsToFetch);
      console.log(`Query found ${querySnapshot.size} teams to display`);

      if (!querySnapshot.empty) {
        const firebaseTeams: Team[] = [];

        for (const doc of querySnapshot.docs) {
          try {
            const data = doc.data();
            console.log(`Processing team document: ${doc.id} - ${data.name}`);

            // Handle date conversion properly
            let createdAtDate: Date;
            try {
              // Handle Firestore Timestamp
              createdAtDate = data.createdAt.toDate();
            } catch (e) {
              // Fallback for other date formats
              createdAtDate = new Date(data.createdAt);
            }

            const team: Team = {
              id: doc.id,
              name: data.name || "Unnamed Team",
              players: data.players || [],
              wins: data.wins || 0,
              losses: data.losses || 0,
              draws: data.draws || 0,
              createdAt: createdAtDate,
              pitchId: data.pitchId,
              createdForDate: data.createdForDate,
              createdBy: data.createdBy,
              maxPlayers: data.maxPlayers,
              sessionId: data.sessionId || null,
              booking: data.booking,
            };

            firebaseTeams.push(team);
          } catch (docError) {
            console.error("Error processing team document:", doc.id, docError);
          }
        }

        console.log(
          "Setting teams in state:",
          firebaseTeams.map((t) => ({
            id: t.id,
            name: t.name,
            sessionId: t.sessionId,
          }))
        );
        setTeams(firebaseTeams);
      } else {
        console.log("No teams found, setting empty array");
        setTeams([]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      setErrorMessage("Failed to load teams. Please try refreshing the page.");
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [selectedPitch, todayDateString, isPrivateSession, privateSessionId]);

  // Function to handle joining a team
  const handleJoinTeam = async (teamId: string) => {
    if (!currentUser) {
      window.toast?.error("You must be logged in to join a team");
      return;
    }

    // Check if user is already in a team
    if (userTeamActivity?.createdTeamId || userTeamActivity?.joinedTeamId) {
      window.toast?.error(
        "You are already in a team. Please leave your current team first."
      );
      return;
    }

    // Get the team to join
    const team = teams.find((t) => t.id === teamId);

    if (!team) {
      window.toast?.error("Team not found");
      return;
    }

    console.log("Attempting to join team:", {
      teamId,
      teamSessionId: team.sessionId,
      currentSessionId: privateSessionId,
      isPrivateSession,
    });

    // Check if this is a private session team and user has access
    if (
      team.sessionId &&
      (!isPrivateSession || privateSessionId !== team.sessionId)
    ) {
      window.toast?.error(
        "You don't have access to join this private session team"
      );
      return;
    }

    // If name is not provided, show the join form
    if (!joinPlayerName.trim() && showJoinForm !== teamId) {
      setShowJoinForm(teamId);
      return;
    }

    setJoiningTeam(true);

    try {
      // Check if team is full
      if (team.players.length >= (team.maxPlayers || 5)) {
        window.toast?.error("This team is already full");
        return;
      }

      // Check if user is already in this team
      if (team.players.some((p) => p.id === currentUser.id)) {
        window.toast?.error("You are already in this team");
        return;
      }

      // Create player object with custom name if provided
      const playerName =
        joinPlayerName.trim() || currentUser.name || "Unknown Player";

      const player: Player = {
        id: currentUser.id,
        name: playerName,
        createdAt: new Date(),
      };

      console.log("Adding player to team:", {
        player,
        teamId,
        privateSession: isPrivateSession,
        sessionId: team.sessionId,
      });

      // Add player to team in Firestore
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        players: arrayUnion(player),
      });

      // Update user's team activity
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        teamActivities: arrayUnion({
          joinedTeamId: teamId,
          date: todayDateString,
          pitchId: selectedPitch,
          sessionId: team.sessionId, // Store session ID in user's activity
        }),
      });

      // Update local state
      setUserTeamActivity({
        joinedTeamId: teamId,
        date: todayDateString,
        pitchId: selectedPitch,
        sessionId: team.sessionId, // Include session ID in local state
      });

      // Update teams list
      const updatedTeams = teams.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            players: [...t.players, player],
          };
        }
        return t;
      });

      setTeams(updatedTeams);
      setShowJoinForm(null);
      setJoinPlayerName("");
      window.toast?.success("You have joined the team");
    } catch (error) {
      console.error("Error joining team:", error);
      window.toast?.error("Failed to join team");
    } finally {
      setJoiningTeam(false);
    }
  };

  // Function to handle leaving a team
  const handleLeaveTeam = async (teamId: string) => {
    if (!currentUser) {
      window.toast?.error("You must be logged in to leave a team");
      return;
    }

    // Prevent creator from leaving their own team
    if (userTeamActivity?.createdTeamId === teamId) {
      window.toast?.error(
        "You cannot leave a team you created. You can only delete it."
      );
      return;
    }

    // Check if user is actually in this team
    if (userTeamActivity?.joinedTeamId !== teamId) {
      window.toast?.error("You are not in this team");
      return;
    }

    setLeavingTeam(true);

    try {
      // Find the team
      const team = teams.find((t) => t.id === teamId);

      if (!team) {
        window.toast?.error("Team not found");
        return;
      }

      // Remove player from team in Firestore
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        players: team.players.filter((player) => player.id !== currentUser.id),
      });

      // Update user's team activity
      const userRef = doc(db, "users", currentUser.id);
      // Get current activities
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const teamActivities = userData.teamActivities || [];
        // Filter out this activity
        const updatedActivities = teamActivities.filter(
          (activity: any) =>
            !(
              activity.joinedTeamId === teamId &&
              activity.date === todayDateString &&
              activity.pitchId === selectedPitch
            )
        );
        // Update the user document
        await updateDoc(userRef, {
          teamActivities: updatedActivities,
        });
      }

      // Update local state
      setUserTeamActivity(null);

      // Update teams list
      const updatedTeams = teams.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            players: t.players.filter((player) => player.id !== currentUser.id),
          };
        }
        return t;
      });

      setTeams(updatedTeams);
      window.toast?.success("You have left the team");
    } catch (error) {
      console.error("Error leaving team:", error);
      window.toast?.error("Failed to leave team");
    } finally {
      setLeavingTeam(false);
    }
  };

  // Function to check if current user can create a team
  const canCreateTeam = (): boolean => {
    // Check if user is already in a team first
    if (userTeamActivity?.createdTeamId || userTeamActivity?.joinedTeamId) {
      return false;
    }

    // If this is a private session, user should be able to create a team
    if (isPrivateSession && privateSessionId) {
      return true;
    }

    // For regular sessions, allow team creation
    return true;
  };

  // Function to check if current user can join a specific team
  const canJoinTeam = (team?: Team): boolean => {
    // If no team specified, check general ability to join any team
    if (!team) {
      return (
        !userTeamActivity?.createdTeamId && !userTeamActivity?.joinedTeamId
      );
    }

    // Can't join if already in a team
    if (userTeamActivity?.createdTeamId || userTeamActivity?.joinedTeamId) {
      return false;
    }

    // Check if team is part of a private session
    if (team.sessionId) {
      // Only allow joining if user has access to this specific session
      return isPrivateSession && privateSessionId === team.sessionId;
    }

    // For regular teams, only allow joining if not in a private session
    return !isPrivateSession;
  };

  // Function to check if current user is in a specific team
  const isUserInTeam = (teamId: string): boolean => {
    return (
      userTeamActivity?.createdTeamId === teamId ||
      userTeamActivity?.joinedTeamId === teamId
    );
  };

  // Function to check if current user created a specific team
  const didUserCreateTeam = (teamId: string): boolean => {
    return userTeamActivity?.createdTeamId === teamId;
  };

  // In Create Team form, modify to hide booking options if in private session but not the creator
  const handleAddTeam = async () => {
    if (!currentUser) {
      window.toast?.error("You must be logged in to create a team");
      return;
    }

    if (!selectedPitch) {
      setNoPitchSelected(true);
      window.toast?.error("Please select a pitch first");
      return;
    }

    if (!newTeamName.trim()) {
      window.toast?.error("Please enter a team name");
      return;
    }

    // Check if user is already in a team
    if (!canCreateTeam()) {
      window.toast?.error(
        "You are already in a team. Please leave your current team first."
      );
      return;
    }

    // If in a private session as a guest (not creator), we skip booking options
    const skipBookingOptions = isPrivateSession && !isSessionCreator;

    // For online booking pitches, require a time slot selection if online booking type is selected
    // Only check if we're not in a private session as a guest
    if (
      !skipBookingOptions &&
      bookingType === "online" &&
      firebasePitchData?.bookingSettings?.allowOnlineBooking &&
      !bookingSuccess &&
      !selectedTimeSlot
    ) {
      window.toast?.error("Please select an available time slot");
      return;
    }

    // Require a booking type selection if both options are available
    // Only check if we're not in a private session as a guest
    if (
      !skipBookingOptions &&
      !bookingType &&
      firebasePitchData?.bookingSettings &&
      (firebasePitchData.bookingSettings.allowOnlineBooking ||
        firebasePitchData.bookingSettings.allowOpenBooking)
    ) {
      window.toast?.error(
        "Please select either online booking or team-only creation"
      );
      return;
    }

    try {
      // Create the player object for the creator with custom name if provided
      const playerName =
        creatorPlayerName.trim() || currentUser.name || "Unknown Player";

      const player: Player = {
        id: currentUser.id,
        name: playerName,
        createdAt: new Date(),
      };

      // Get max players allowed from the pitch settings
      const maxPlayersAllowed =
        firebasePitchData?.customSettings?.maxPlayersPerTeam || 5;

      // Prepare the team data
      const teamData: any = {
        name: newTeamName.trim(),
        players: [player],
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date(),
        pitchId: selectedPitch,
        createdForDate: todayDateString,
        createdBy: currentUser.id,
        maxPlayers: maxPlayersAllowed,
        sessionId: isPrivateSession ? privateSessionId : null, // Include session ID if in private session
      };

      console.log(
        "Creating team with session ID:",
        teamData.sessionId,
        "isPrivateSession:",
        isPrivateSession,
        "privateSessionId:",
        privateSessionId
      );

      // Validate the sessionId is set correctly for private sessions
      if (
        isPrivateSession &&
        privateSessionId &&
        teamData.sessionId !== privateSessionId
      ) {
        console.error("ERROR: Session ID mismatch!");
        teamData.sessionId = privateSessionId; // Force correct session ID
        console.log("Fixed team sessionId to:", teamData.sessionId);
      }

      // Add booking information only if not in a private session as a guest
      if (
        !skipBookingOptions &&
        bookingType === "online" &&
        ((selectedTimeSlot && selectedTimeSlot.isAvailable) || bookingSuccess)
      ) {
        // Use existing bookingCode or generate a new one
        const generatedBookingCode = generateBookingCode();
        const codeToUse = bookingCode || generatedBookingCode;

        // Determine payment method and amount
        let paymentAmount = 0;

        if (
          firebasePitchData?.bookingSettings?.onlinePaymentType === "timeSlot"
        ) {
          // Calculate based on number of hours selected
          const slotPrice =
            firebasePitchData.bookingSettings.onlineTimeSlotPrice || 5000;
          paymentAmount = slotPrice * selectedSlotHours;
        } else {
          // Per head pricing
          paymentAmount = firebasePitchData?.pricePerPerson || 3000;
        }

        teamData.booking = {
          startTime: selectedTimeSlot?.startTime || "00:00",
          endTime:
            selectedMultiSlotEndTime || selectedTimeSlot?.endTime || "00:00",
          isPaid: bookingSuccess, // Will be true if payment successful
          paymentAmount: paymentAmount,
          paymentMethod: "online",
          paymentDate: bookingSuccess ? new Date() : null,
          bookingCode: codeToUse,
        };

        // If this is a new booking (not continuing after payment)
        if (!bookingSuccess) {
          setBookingCode(codeToUse);
        }
      } else if (
        !skipBookingOptions &&
        bookingType === "physical" &&
        firebasePitchData?.bookingSettings?.allowOpenBooking
      ) {
        // For physical booking, we create a team without a specific time slot
        // but we still generate a booking code for team identification
        const physicalBookingCode = generateBookingCode();

        // Calculate expected payment amount based on physical payment type
        let expectedAmount = 0;

        if (
          firebasePitchData.bookingSettings.physicalPaymentType === "timeSlot"
        ) {
          expectedAmount =
            firebasePitchData.bookingSettings.physicalTimeSlotPrice || 5000;
        } else {
          // Per head pricing
          expectedAmount = firebasePitchData.pricePerPerson || 3000;
        }

        teamData.booking = {
          // No specific time slots for physical booking
          startTime: null,
          endTime: null,
          isPaid: false, // Will be paid at the venue
          paymentAmount: expectedAmount,
          paymentMethod: "physical",
          bookingCode: physicalBookingCode,
        };

        // Store the booking code for display
        setBookingCode(physicalBookingCode);
      }

      // Log the final team data before sending to Firebase
      console.log("Final team data to be saved:", teamData);

      // Add the team to Firestore
      const docRef = await addDoc(collection(db, "teams"), teamData);
      console.log("Team created with ID:", docRef.id);

      // Update with ID
      const newTeam: Team = {
        id: docRef.id,
        ...teamData,
      };

      // Add to local state
      setTeams([...teams, newTeam]);

      // Add to user's team activity
      const userActivityRef = doc(db, "users", currentUser.id);
      await updateDoc(userActivityRef, {
        teamActivities: arrayUnion({
          createdTeamId: docRef.id,
          date: todayDateString,
          pitchId: selectedPitch,
          sessionId: isPrivateSession ? privateSessionId : null, // Add session ID if in private session
        }),
      });

      // Store today's selection in localStorage
      const todaysActivity = {
        createdTeamId: docRef.id,
        date: todayDateString,
        pitchId: selectedPitch,
        sessionId: isPrivateSession ? privateSessionId : null, // Add session ID if in private session
      };
      localStorage.setItem(
        "todaysTeamActivity",
        JSON.stringify(todaysActivity)
      );

      // If in a private session, store the activity specifically for that session
      if (isPrivateSession && privateSessionId) {
        localStorage.setItem(
          `privateSessionActivity_${privateSessionId}`,
          JSON.stringify(todaysActivity)
        );
      }

      // Update local state for user team activity
      setUserTeamActivity({
        createdTeamId: docRef.id,
        date: todayDateString,
        pitchId: selectedPitch,
        sessionId: isPrivateSession ? privateSessionId : null, // Add session ID if in private session
      });

      // Reset form state
      setNewTeamName("");
      setShowAddTeamForm(false);

      // Show appropriate success message based on booking type
      if (teamData.booking) {
        if (bookingType === "online" && !bookingSuccess) {
          setBookingSuccess(true);
          window.toast?.success(
            `Team created and timeslot booked! Your booking code is ${bookingCode}`
          );
        } else if (bookingType === "physical") {
          window.toast?.success(
            `Team created! Your team code is ${teamData.booking.bookingCode}`
          );
          // For physical bookings, we want to show team created but not mark as fully paid
          setBookingSuccess(true);
        } else {
          window.toast?.success("Team created successfully!");
        }
      } else {
        window.toast?.success("Team created successfully!");
      }

      // In case of a private session, trigger a refresh to ensure we see the team
      if (isPrivateSession && privateSessionId) {
        console.log("Private session team created - refreshing teams list");
        setTimeout(() => {
          fetchTeams();
        }, 1000);
      }
    } catch (error) {
      console.error("Error adding team:", error);
      window.toast?.error("Failed to create team");
    }
  };

  // Calculate available time slots when pitch is selected or date changes
  useEffect(() => {
    if (selectedPitch) {
      fetchPitchFromFirebase();
    }
  }, [selectedPitch, todayDateString]);

  const fetchPitchFromFirebase = async () => {
    if (!selectedPitch) return;

    setLoadingPitch(true);

    try {
      const pitchRef = doc(db, "pitches", selectedPitch);
      const pitchSnap = await getDoc(pitchRef);

      if (!pitchSnap.exists()) {
        setNoPitchSelected(true);
        return;
      }

      const pitchData = {
        id: pitchSnap.id,
        ...pitchSnap.data(),
      } as Pitch;

      setFirebasePitchData(pitchData);

      // Calculate available time slots for booking
      await calculateAvailableTimeSlots();
    } catch (error) {
      console.error("Error fetching pitch data:", error);
      window.toast?.error("Failed to load pitch data");
    } finally {
      setLoadingPitch(false);
    }
  };

  // Add missing functions for time slot management
  const calculateAvailableTimeSlots = async () => {
    if (!selectedPitch) return;

    setLoadingTimeSlots(true);

    try {
      // Fetch booked slots for today from Firebase
      const teamsRef = collection(db, "teams");
      const q = query(
        teamsRef,
        where("pitchId", "==", selectedPitch),
        where("createdForDate", "==", todayDateString)
      );

      const querySnapshot = await getDocs(q);

      // Get all booked time slots
      const bookedSlots: { startTime: string; endTime: string }[] = [];
      querySnapshot.forEach((doc) => {
        const teamData = doc.data();
        if (teamData.booking) {
          bookedSlots.push({
            startTime: teamData.booking.startTime,
            endTime: teamData.booking.endTime,
          });
        }
      });

      // Generate time slots based on pitch availability
      const slots: TimeSlot[] = [];

      if (firebasePitchData?.availability?.bookingHours) {
        const { start, end } = firebasePitchData.availability.bookingHours;

        // Generate hourly slots between start and end time
        const startHour = parseInt(start.split(":")[0]);
        const endHour = parseInt(end.split(":")[0]);

        for (let hour = startHour; hour < endHour; hour++) {
          const startTime = `${hour.toString().padStart(2, "0")}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

          // Check if this slot is already booked
          const isBooked = bookedSlots.some(
            (slot) =>
              slot.startTime === startTime ||
              (slot.startTime < startTime && slot.endTime > startTime)
          );

          slots.push({
            startTime,
            endTime,
            isAvailable: !isBooked,
          });
        }
      } else {
        // Fallback to default slots if booking hours aren't configured
        for (let hour = 9; hour < 22; hour++) {
          const startTime = `${hour.toString().padStart(2, "0")}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

          // Check if this slot is already booked
          const isBooked = bookedSlots.some(
            (slot) =>
              slot.startTime === startTime ||
              (slot.startTime < startTime && slot.endTime > startTime)
          );

          slots.push({
            startTime,
            endTime,
            isAvailable: !isBooked,
          });
        }
      }

      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error("Error calculating available time slots:", error);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Calculate end time for multi-hour slots
  const calculateEndTime = (startTime: string, hoursToAdd: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    let newHours = hours + hoursToAdd;
    // Handle time overflow (past midnight)
    if (newHours >= 24) {
      newHours = newHours - 24;
    }
    return `${newHours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle time slot selection
  const handleSelectTimeSlot = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;

    // Calculate end time based on selected hours
    const endTime = calculateEndTime(slot.endTime, selectedSlotHours - 1);
    const updatedSlot = {
      ...slot,
      endTime,
      displayEndTime: endTime,
    };

    setSelectedTimeSlot(updatedSlot);
    setShowBookingOptions(true);

    // Scroll to booking options
    setTimeout(() => {
      const bookingOptionsSection = document.querySelector("#bookingOptions");
      if (bookingOptionsSection) {
        bookingOptionsSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Helper function to check if more slots can be added
  const canAddMoreSlots = (): boolean => {
    if (!selectedTimeSlot) return false;

    const startHour = parseInt(selectedTimeSlot.startTime.split(":")[0]);
    const currentEndHour = startHour + selectedSlotHours;

    // Check if next slot exists and is available
    const nextSlotIndex = availableTimeSlots.findIndex(
      (slot) =>
        slot.startTime === `${currentEndHour.toString().padStart(2, "0")}:00`
    );

    if (nextSlotIndex === -1) return false;

    return availableTimeSlots[nextSlotIndex].isAvailable;
  };

  // Function to update the multi-slot selection
  const updateMultiSlotSelection = (hours: number) => {
    if (!selectedTimeSlot) return;

    setSelectedSlotHours(hours);

    // Calculate the new end time based on hours
    const startHour = parseInt(selectedTimeSlot.startTime.split(":")[0]);
    const endHour = startHour + hours;
    const newEndTime = `${endHour.toString().padStart(2, "0")}:00`;

    setSelectedMultiSlotEndTime(newEndTime);
  };

  const resetBookingState = () => {
    setSelectedTimeSlot(null);
    setSelectedSlotHours(1);
    setSelectedMultiSlotEndTime("");
    setShowBookingOptions(false);
    setBookingSuccess(false);
    setBookingCode("");
    setBookingType(null);
  };

  // Generate a random booking code
  const generateBookingCode = (): string => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar-looking characters
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };

  // When pitch data is loaded, determine if we should auto-select a booking type
  useEffect(() => {
    if (firebasePitchData?.bookingSettings) {
      const { allowOnlineBooking, allowOpenBooking } =
        firebasePitchData.bookingSettings;

      // If only one booking type is allowed, auto-select it
      if (allowOnlineBooking && !allowOpenBooking) {
        setBookingType("online");
      } else if (!allowOnlineBooking && allowOpenBooking) {
        setBookingType("physical");
      }
    }
  }, [firebasePitchData]);

  // Initialize Paystack payment
  const handleInitiatePayment = (amount: number, purpose: string) => {
    setPaymentAmount(amount);
    setPaymentPurpose(purpose);

    if (!window.PaystackPop) {
      window.toast?.error(
        "Payment service not available. Please try again later."
      );
      return;
    }

    setPaymentProcessing(true);

    // Use Paystack's inline payment
    try {
      const handler = window.PaystackPop.setup({
        key:
          import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
          "pk_test_5531fec931676c977678d80186788589b8c54dfe",
        email: currentUser?.email || "customer@example.com",
        amount: amount * 100, // convert to kobo
        currency: "NGN",
        ref: `team_booking_${Date.now()}_${Math.floor(
          Math.random() * 1000000
        )}`,
        label: currentUser?.name || "Player",
        metadata: {
          custom_fields: [
            {
              display_name: "Booking Type",
              variable_name: "booking_type",
              value: "Team Booking",
            },
            {
              display_name: "Pitch ID",
              variable_name: "pitch_id",
              value: selectedPitch,
            },
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: currentUser?.id || "",
            },
          ],
        },
        onClose: () => {
          setPaymentProcessing(false);
          window.toast?.info("Payment was cancelled.");
        },
        callback: (response: { reference: string }) => {
          setPaymentProcessing(false);
          handlePaymentSuccess(response.reference);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Error initializing Paystack:", error);
      window.toast?.error("Failed to initialize payment. Please try again.");
      setPaymentProcessing(false);
    }
  };

  // Process Paystack payment success
  const handlePaymentSuccess = (reference: any) => {
    console.log("Payment successful with reference:", reference);
    setPaymentProcessing(false);

    // Generate a unique session ID
    const sessionId = `${selectedPitch}_${todayDateString}_${Date.now()}_${Math.floor(
      Math.random() * 1000000
    )}`;

    console.log("Generated new session ID:", sessionId);

    // Create a private session link
    const sessionLink = `${window.location.origin}/teams?pitch=${selectedPitch}&session=${sessionId}`;
    console.log("Created session link:", sessionLink);

    setPrivateSessionId(sessionId);
    setPrivateSessionLink(sessionLink);
    setIsPrivateSession(true); // Set isPrivateSession to true after successful payment
    setIsSessionCreator(true); // Mark user as the creator of this session
    setBookingSuccess(true);

    // Store private session data in localStorage for retrieval
    const sessionDataToStore = {
      id: sessionId,
      pitchId: selectedPitch,
      date: todayDateString,
      creatorId: currentUser?.id, // Store creator ID
      timeSlot: {
        startTime: selectedTimeSlot?.startTime || "",
        endTime: selectedMultiSlotEndTime || selectedTimeSlot?.endTime || "",
        hours: selectedSlotHours,
      },
      reference: reference,
    };

    console.log("Storing session data:", sessionDataToStore);
    localStorage.setItem(
      `privateSession_${sessionId}`,
      JSON.stringify(sessionDataToStore)
    );

    // Also store it in user's localStorage for later access with more details
    const userSessionLinks = JSON.parse(
      localStorage.getItem("userSessionLinks") || "{}"
    );
    userSessionLinks[sessionId] = {
      link: sessionLink,
      pitchId: selectedPitch,
      date: todayDateString,
      pitchName: firebasePitchData?.name || "Booked Pitch",
      createdAt: new Date().toISOString(),
      timeSlot: {
        startTime: selectedTimeSlot?.startTime || "",
        endTime: selectedMultiSlotEndTime || selectedTimeSlot?.endTime || "",
        hours: selectedSlotHours,
      },
    };
    localStorage.setItem("userSessionLinks", JSON.stringify(userSessionLinks));
    console.log("Updated user session links in localStorage");

    window.toast?.success("Payment successful! Your booking is confirmed.");
  };

  // Check for session ID in URL - moved to mount only once, outside of dependency array
  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get("session");
    const pitchParam = urlParams.get("pitch");

    if (sessionParam) {
      console.log("Found session parameter in URL:", sessionParam);
      console.log(
        "Current pitch:",
        selectedPitch,
        "URL pitch param:",
        pitchParam
      );

      // If pitch is specified in URL, use it
      if (pitchParam) {
        console.log("Setting pitch ID from URL parameter:", pitchParam);
        setSelectedPitch(pitchParam);
        localStorage.setItem("selectedPitchId", pitchParam);
      }

      // Set private session regardless of pitch ID first to ensure access
      setPrivateSessionId(sessionParam);
      setIsPrivateSession(true);
      console.log("Private session enabled with ID:", sessionParam);

      // Try to retrieve session data from localStorage
      const storedSessionData = localStorage.getItem(
        `privateSession_${sessionParam}`
      );

      if (storedSessionData) {
        try {
          const parsedData = JSON.parse(storedSessionData);
          console.log("Found session data in localStorage:", parsedData);

          // If needed, update selected pitch to match the session's pitch
          if (
            parsedData.pitchId &&
            (!pitchParam || pitchParam !== parsedData.pitchId)
          ) {
            console.log(
              "Setting pitch ID from session data:",
              parsedData.pitchId
            );
            setSelectedPitch(parsedData.pitchId);
            localStorage.setItem("selectedPitchId", parsedData.pitchId);
          }

          // Check if the current user is the creator of this session
          if (currentUser && parsedData.creatorId === currentUser.id) {
            console.log("Current user is the creator of this session");
            setIsSessionCreator(true);
          }

          // Check if we need to recreate the session link
          const recreatedLink = `${window.location.origin}/teams?pitch=${
            parsedData.pitchId || selectedPitch
          }&session=${sessionParam}`;
          setPrivateSessionLink(recreatedLink);
          console.log("Recreated session link:", recreatedLink);

          window.toast?.info("You've joined a private booking session");
        } catch (error) {
          console.error("Error parsing session data:", error);
        }
      } else {
        console.warn("No session data found for session ID:", sessionParam);
        // Even if we don't have session data, we still use the session ID from URL
        window.toast?.info("You've joined a private booking session");
      }
    }
  }, []); // Empty dependency array - only run once on component mount

  // Fetch teams when dependencies change, also when privateSessionId changes
  useEffect(() => {
    fetchTeams();
  }, [selectedPitch, todayDateString, isPrivateSession, privateSessionId]);

  // Check if user created this session
  useEffect(() => {
    if (privateSessionId && currentUser) {
      // Check if user is the creator of this session
      const storedSessionData = localStorage.getItem(
        `privateSession_${privateSessionId}`
      );
      if (storedSessionData) {
        try {
          const parsedData = JSON.parse(storedSessionData);
          if (parsedData.creatorId === currentUser.id) {
            setIsSessionCreator(true);

            // Recreate the session link if needed
            if (!privateSessionLink) {
              const recreatedLink = `${window.location.origin}/teams?pitch=${selectedPitch}&session=${privateSessionId}`;
              setPrivateSessionLink(recreatedLink);
            }
          }
        } catch (error) {
          console.error("Error checking session creator:", error);
        }
      }

      // Also check in user's stored sessions
      const userSessionLinks = JSON.parse(
        localStorage.getItem("userSessionLinks") || "{}"
      );
      if (userSessionLinks[privateSessionId]) {
        setIsSessionCreator(true);
        setPrivateSessionLink(userSessionLinks[privateSessionId].link);
      }
    }
  }, [privateSessionId, currentUser, selectedPitch]);

  // Move interface definition to the top near other interfaces
  interface SessionData {
    link: string;
    pitchId: string;
    date: string;
    pitchName?: string;
    createdAt: string;
    timeSlot?: {
      startTime?: string;
      endTime?: string;
      hours?: number;
    };
  }

  // Define the autoRestoreSession function
  const autoRestoreSession = useCallback(() => {
    if (!currentUser || !selectedPitch || isPrivateSession || privateSessionId)
      return;

    try {
      const userSessionLinks = JSON.parse(
        localStorage.getItem("userSessionLinks") || "{}"
      );

      // Find session for today and current pitch
      const currentPitchSession = Object.entries(userSessionLinks).find(
        ([_, data]) => {
          const typedData = data as SessionData;
          return (
            typedData.pitchId === selectedPitch &&
            typedData.date === todayDateString
          );
        }
      );

      if (currentPitchSession) {
        const [sessionId, sessionData] = currentPitchSession;
        const typedSessionData = sessionData as SessionData;

        // Set the session active
        setPrivateSessionId(sessionId);
        setPrivateSessionLink(typedSessionData.link);
        setIsPrivateSession(true);
        setIsSessionCreator(true);
        console.log("Automatically restored session:", sessionId);
        window.toast?.info("Your private booking session has been restored");
      }
    } catch (error) {
      console.error("Error restoring session:", error);
    }
  }, [
    currentUser,
    selectedPitch,
    todayDateString,
    isPrivateSession,
    privateSessionId,
  ]);

  // Run autoRestoreSession when the pitch changes
  useEffect(() => {
    autoRestoreSession();
  }, [autoRestoreSession, selectedPitch]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Teams</h1>

      {errorMessage && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-md mb-4">
          {errorMessage}
        </div>
      )}

      {noPitchSelected ? (
        <div className="bg-dark-lighter rounded-lg p-6 mb-6 text-center">
          <h2 className="text-xl font-semibold mb-3">No Pitch Selected</h2>
          <p className="text-gray-400 mb-4">
            You need to select a pitch to view or create teams
          </p>
          <Link
            to="/pitches"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md"
          >
            Browse Pitches
          </Link>
        </div>
      ) : (
        <>
          {/* Display private session banner if applicable */}
          {isPrivateSession && (
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3 text-purple-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-purple-400">
                    Private Booking Session
                  </h3>
                  <p className="text-sm text-gray-300">
                    You're viewing teams in a private booking session
                  </p>
                </div>
              </div>
              <Link
                to="/teams"
                className="text-purple-400 text-sm hover:text-purple-300 ml-4"
              >
                Exit Session
              </Link>
            </div>
          )}

          {/* Session Link for Creators */}
          {isPrivateSession && isSessionCreator && privateSessionLink && (
            <div className="bg-dark-lighter rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-white mb-2">
                Your Private Session Link
              </h3>
              <p className="text-sm text-gray-300 mb-3">
                Share this link with players you want to invite to your private
                session:
              </p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={privateSessionLink}
                  className="flex-grow bg-dark rounded-l px-3 py-2 text-gray-300 border border-gray-700 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(privateSessionLink);
                    window.toast?.success("Link copied to clipboard!");
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-r px-3 py-2 text-sm flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Pitch Info Section */}
          {firebasePitchData && (
            <div className="bg-dark-lighter rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <h2 className="text-xl font-semibold">
                  {firebasePitchData.name}
                </h2>
                <span className="bg-green-600/20 text-green-500 text-sm px-3 py-1 rounded-full mt-2 sm:mt-0">
                  Selected Pitch
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {firebasePitchData.location}
              </p>

              {/* Display booking information if available */}
              {firebasePitchData.bookingSettings && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                    {firebasePitchData.bookingSettings.allowOnlineBooking
                      ? "Online Booking Available"
                      : "No Online Booking"}
                  </span>
                  <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                    {firebasePitchData.bookingSettings.allowOpenBooking
                      ? "Physical Payment Accepted"
                      : "Online Payment Only"}
                  </span>
                  {firebasePitchData.bookingSettings.allowOnlineBooking && (
                    <span className="bg-dark px-2 py-1 rounded-md text-xs text-gray-300">
                      Payment:{" "}
                      {firebasePitchData.bookingSettings.onlinePaymentType ===
                      "timeSlot"
                        ? `₦${firebasePitchData.bookingSettings.onlineTimeSlotPrice} per slot`
                        : `₦${firebasePitchData?.pricePerPerson} per player`}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create Team Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Teams for Today</h2>
            <button
              onClick={() => setShowAddTeamForm(!showAddTeamForm)}
              disabled={isLoading || !canCreateTeam()}
              className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center ${
                !canCreateTeam() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              {!canCreateTeam() ? "Already in a Team" : "Create Team"}
            </button>
          </div>

          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams or players..."
                className="w-full bg-dark border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Create Team Form */}
          {showAddTeamForm && (
            <div className="bg-dark-lighter rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Create a New Team</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                    placeholder="e.g. Lightning Warriors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Your Player Name
                  </label>
                  <input
                    type="text"
                    value={creatorPlayerName}
                    onChange={(e) => setCreatorPlayerName(e.target.value)}
                    className="w-full bg-dark border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                    placeholder={currentUser?.name || "Enter your player name"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use your account name
                  </p>
                </div>

                {/* Private Session Message - show if it's a private session but user is not the creator */}
                {isPrivateSession && !isSessionCreator && (
                  <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                    <h4 className="text-md font-medium text-purple-300 mb-2 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Private Session
                    </h4>
                    <p className="text-sm text-gray-300">
                      You're creating a team in a private session that has
                      already been booked. You don't need to make any payment -
                      just create your team and join the session.
                    </p>
                  </div>
                )}

                {/* Display booking information message based on pitch settings - only if not in private session as guest */}
                {firebasePitchData?.bookingSettings &&
                  (!isPrivateSession || isSessionCreator) && (
                    <div className="p-4 bg-dark-light/30 rounded-lg border border-gray-700">
                      <h4 className="text-md font-medium text-gray-300 mb-2 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Booking Information
                      </h4>

                      {/* Booking Type Selection - only if not in private session as guest */}
                      {(firebasePitchData.bookingSettings.allowOnlineBooking ||
                        firebasePitchData.bookingSettings.allowOpenBooking) &&
                        (!isPrivateSession || isSessionCreator) && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-300 mb-3">
                              Select how you want to create your team:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {firebasePitchData.bookingSettings
                                .allowOnlineBooking && (
                                <div
                                  className={`border ${
                                    bookingType === "online"
                                      ? "border-green-500 bg-green-900/20"
                                      : "border-gray-700 bg-dark-light"
                                  } rounded-lg p-4 cursor-pointer transition-colors`}
                                  onClick={() => setBookingType("online")}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5
                                      className={`text-md font-medium ${
                                        bookingType === "online"
                                          ? "text-green-400"
                                          : "text-gray-300"
                                      }`}
                                    >
                                      Online Booking
                                    </h5>
                                    {bookingType === "online" && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-green-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400">
                                    Reserve a specific time slot and pay online
                                  </p>
                                  <div className="mt-2 text-xs text-gray-500">
                                    {firebasePitchData.bookingSettings
                                      .onlinePaymentType === "timeSlot"
                                      ? `₦${firebasePitchData.bookingSettings.onlineTimeSlotPrice?.toLocaleString()} per time slot`
                                      : `₦${firebasePitchData.pricePerPerson?.toLocaleString()} per player`}
                                  </div>
                                </div>
                              )}

                              {firebasePitchData.bookingSettings
                                .allowOpenBooking && (
                                <div
                                  className={`border ${
                                    bookingType === "physical"
                                      ? "border-blue-500 bg-blue-900/20"
                                      : "border-gray-700 bg-dark-light"
                                  } rounded-lg p-4 cursor-pointer transition-colors`}
                                  onClick={() => setBookingType("physical")}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5
                                      className={`text-md font-medium ${
                                        bookingType === "physical"
                                          ? "text-blue-400"
                                          : "text-gray-300"
                                      }`}
                                    >
                                      Create Team Only
                                    </h5>
                                    {bookingType === "physical" && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 text-blue-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400">
                                    Create team without booking a specific time
                                    slot
                                  </p>
                                  <div className="mt-2 text-xs text-gray-500">
                                    Pay at the venue during open hours
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Rest of the booking information - only if not in private session as guest */}
                      {!isPrivateSession || isSessionCreator ? (
                        <>
                          {firebasePitchData.bookingSettings
                            .allowOnlineBooking && (
                            <div className="text-sm text-gray-300 mb-2">
                              <p>
                                • This pitch requires{" "}
                                <span className="text-green-400 font-medium">
                                  online booking
                                </span>{" "}
                                - select a time slot below and complete payment
                                to secure your spot.
                              </p>
                              {firebasePitchData.bookingSettings
                                .onlinePaymentType === "timeSlot" ? (
                                <p className="mt-1">
                                  • You'll be charged ₦
                                  {firebasePitchData.bookingSettings.onlineTimeSlotPrice?.toLocaleString()}{" "}
                                  per time slot booked.
                                </p>
                              ) : (
                                <p className="mt-1">
                                  • You'll be charged ₦
                                  {firebasePitchData.pricePerPerson?.toLocaleString()}{" "}
                                  per player.
                                </p>
                              )}
                            </div>
                          )}
                          {!firebasePitchData.bookingSettings
                            .allowOnlineBooking &&
                            firebasePitchData.bookingSettings
                              .allowOpenBooking && (
                              <div className="text-sm text-gray-300">
                                <p>
                                  • This pitch only accepts{" "}
                                  <span className="text-blue-400 font-medium">
                                    physical payments
                                  </span>{" "}
                                  at the venue.
                                </p>
                                <p className="mt-1">
                                  • You can create your team now and pay when
                                  you arrive at the pitch.
                                </p>
                              </div>
                            )}
                          {!firebasePitchData.bookingSettings
                            .allowOnlineBooking &&
                            !firebasePitchData.bookingSettings
                              .allowOpenBooking && (
                              <div className="text-sm text-gray-300">
                                <p className="text-yellow-400">
                                  • This pitch is currently not accepting
                                  bookings.
                                </p>
                              </div>
                            )}
                        </>
                      ) : null}
                    </div>
                  )}

                {/* Display instructions based on booking type */}
                {firebasePitchData &&
                  firebasePitchData.bookingSettings &&
                  !firebasePitchData.bookingSettings.allowOnlineBooking &&
                  firebasePitchData.bookingSettings.allowOpenBooking && (
                    <div className="mt-4 bg-blue-500/20 p-4 rounded-md">
                      <h3 className="font-medium text-blue-400 text-sm mb-2">
                        Physical Payment Only
                      </h3>
                      <p className="text-gray-300 text-sm">
                        This pitch requires physical payment at the venue. No
                        online booking is needed.
                      </p>
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          Payment Type:{" "}
                          {firebasePitchData.bookingSettings
                            .physicalPaymentType === "timeSlot"
                            ? "Per Time Slot"
                            : "Per Player (Per Head)"}
                        </p>
                        {firebasePitchData.bookingSettings
                          .physicalPaymentType === "timeSlot" && (
                          <p className="text-sm text-gray-300">
                            Price: ₦
                            {firebasePitchData.bookingSettings.physicalTimeSlotPrice?.toLocaleString() ||
                              "5,000"}{" "}
                            per time slot
                          </p>
                        )}
                        {firebasePitchData.bookingSettings
                          .physicalPaymentType === "perHead" && (
                          <p className="text-sm text-gray-300">
                            Price: ₦
                            {firebasePitchData.pricePerPerson?.toLocaleString() ||
                              "3,000"}{" "}
                            per player
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Display Physical Booking Description */}
                {bookingType === "physical" &&
                  firebasePitchData?.bookingSettings?.allowOpenBooking && (
                    <div className="mt-4 bg-blue-500/20 p-4 rounded-md">
                      <h3 className="font-medium text-blue-400 text-sm mb-2">
                        Physical Payment at Venue
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Your team will be created without a specific time slot
                        reservation.
                      </p>
                      <p className="text-gray-300 text-sm mt-2">
                        You can play during the pitch's open booking hours:{" "}
                        <strong>
                          {firebasePitchData?.availability?.openBookingHours
                            ?.start ||
                            firebasePitchData?.availability?.openingTime ||
                            "N/A"}{" "}
                          -{" "}
                          {firebasePitchData?.availability?.openBookingHours
                            ?.end ||
                            firebasePitchData?.availability?.closingTime ||
                            "N/A"}
                        </strong>
                      </p>
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          Payment Type:{" "}
                          {firebasePitchData.bookingSettings
                            .physicalPaymentType === "timeSlot"
                            ? "Per Time Slot"
                            : "Per Player (Per Head)"}
                        </p>
                        {firebasePitchData.bookingSettings
                          .physicalPaymentType === "timeSlot" && (
                          <p className="text-sm text-gray-300">
                            Price: ₦
                            {firebasePitchData.bookingSettings.physicalTimeSlotPrice?.toLocaleString() ||
                              "5,000"}{" "}
                            per time slot
                          </p>
                        )}
                        {firebasePitchData.bookingSettings
                          .physicalPaymentType === "perHead" && (
                          <p className="text-sm text-gray-300">
                            Price: ₦
                            {firebasePitchData.pricePerPerson?.toLocaleString() ||
                              "3,000"}{" "}
                            per player
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Display available time slots for booking if online booking is allowed */}
                {firebasePitchData &&
                  firebasePitchData.bookingSettings?.allowOnlineBooking &&
                  bookingType === "online" &&
                  !bookingSuccess && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-medium text-white">
                          Online Booking
                        </h3>
                        <span className="text-sm text-gray-400">
                          {todayDateString}
                        </span>
                      </div>

                      {loadingTimeSlots ? (
                        <div className="text-center py-8">
                          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-purple-600 rounded-full mx-auto"></div>
                          <p className="text-gray-400 mt-2">
                            Loading available time slots...
                          </p>
                        </div>
                      ) : (
                        <>
                          {availableTimeSlots.length > 0 ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-gray-300">
                                  Select a time slot for your team:
                                </p>
                                <div className="flex items-center space-x-2">
                                  <label
                                    htmlFor="hoursSelect"
                                    className="text-sm text-gray-300"
                                  >
                                    Hours:
                                  </label>
                                  <select
                                    id="hoursSelect"
                                    value={selectedSlotHours}
                                    onChange={(e) =>
                                      setSelectedSlotHours(
                                        parseInt(e.target.value)
                                      )
                                    }
                                    className="bg-dark text-white text-sm border border-gray-700 rounded px-2 py-1"
                                  >
                                    {[1, 2, 3, 4, 5].map((hours) => (
                                      <option key={hours} value={hours}>
                                        {hours} {hours === 1 ? "hour" : "hours"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {availableTimeSlots.map((slot, index) => {
                                  // Determine if this slot is part of the current selection
                                  const isSelected =
                                    selectedTimeSlot &&
                                    ((slot.startTime >=
                                      selectedTimeSlot.startTime &&
                                      slot.endTime <=
                                        selectedMultiSlotEndTime) ||
                                      slot.startTime ===
                                        selectedTimeSlot.startTime);

                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 rounded-md border ${
                                        slot.isAvailable
                                          ? isSelected
                                            ? "bg-green-600/20 border-green-500"
                                            : "bg-dark border-gray-700 hover:border-green-500/50 cursor-pointer"
                                          : "bg-dark/40 border-gray-700 opacity-50 cursor-not-allowed"
                                      }`}
                                      onClick={() =>
                                        slot.isAvailable &&
                                        handleSelectTimeSlot(slot)
                                      }
                                    >
                                      <div className="text-center">
                                        <div className="font-semibold">
                                          {slot.startTime} - {slot.endTime}
                                        </div>
                                        <div className="text-xs mt-1">
                                          {slot.isAvailable ? (
                                            isSelected ? (
                                              <span className="text-green-400">
                                                Selected
                                              </span>
                                            ) : (
                                              <span className="text-green-400">
                                                Available
                                              </span>
                                            )
                                          ) : (
                                            <span className="text-red-400">
                                              Booked
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Display controls for multiple slot selection */}
                              {selectedTimeSlot && (
                                <div className="mt-4 p-3 bg-dark/60 border border-green-500/30 rounded-md">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-300 mb-1">
                                        Booking Duration
                                      </h5>
                                      <p className="text-xs text-gray-400">
                                        Select how many hours you want to book
                                      </p>
                                    </div>
                                    <div className="mt-2 sm:mt-0 flex items-center space-x-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateMultiSlotSelection(
                                            Math.max(1, selectedSlotHours - 1)
                                          )
                                        }
                                        disabled={selectedSlotHours <= 1}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                          selectedSlotHours <= 1
                                            ? "bg-gray-700 text-gray-500"
                                            : "bg-dark text-white hover:bg-dark-light"
                                        }`}
                                      >
                                        -
                                      </button>
                                      <span className="text-white font-medium">
                                        {selectedSlotHours} hour
                                        {selectedSlotHours !== 1 ? "s" : ""}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateMultiSlotSelection(
                                            selectedSlotHours + 1
                                          )
                                        }
                                        disabled={!canAddMoreSlots()}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                          !canAddMoreSlots()
                                            ? "bg-gray-700 text-gray-500"
                                            : "bg-dark text-white hover:bg-dark-light"
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-3 text-sm">
                                    <span className="text-gray-400">
                                      Selected time:{" "}
                                    </span>
                                    <span className="text-white font-medium">
                                      {selectedTimeSlot.startTime} -{" "}
                                      {selectedMultiSlotEndTime}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-dark/50 rounded-md">
                              <p className="text-gray-400">
                                No time slots available for today
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Payment Information */}
                      {selectedTimeSlot && showBookingOptions && (
                        <div
                          id="bookingOptions"
                          className="mt-6 p-4 bg-dark/60 border border-green-500/30 rounded-md"
                        >
                          <h4 className="text-lg font-semibold mb-2">
                            Booking Details
                          </h4>
                          <div className="mb-4">
                            <div className="flex justify-between py-2 border-b border-dark-light">
                              <span>Time Slot:</span>
                              <span className="font-semibold">
                                {selectedTimeSlot.startTime} -{" "}
                                {selectedMultiSlotEndTime}
                                {selectedSlotHours > 1 &&
                                  ` (${selectedSlotHours} hours)`}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-dark-light">
                              <span>Payment Type:</span>
                              <span className="font-semibold">
                                {firebasePitchData?.bookingSettings
                                  ?.onlinePaymentType === "timeSlot"
                                  ? "Per Time Slot"
                                  : "Per Player"}
                              </span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span>Amount:</span>
                              <span className="font-semibold">
                                ₦
                                {firebasePitchData?.bookingSettings
                                  ?.onlinePaymentType === "timeSlot"
                                  ? (firebasePitchData.bookingSettings
                                      .onlineTimeSlotPrice || 5000) *
                                    selectedSlotHours
                                  : firebasePitchData?.pricePerPerson || 3000}
                                {firebasePitchData?.bookingSettings
                                  ?.onlinePaymentType === "timeSlot" &&
                                  selectedSlotHours > 1 &&
                                  ` (₦${
                                    firebasePitchData.bookingSettings
                                      .onlineTimeSlotPrice || 5000
                                  } × ${selectedSlotHours})`}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              onClick={resetBookingState}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                            {/* Replace direct booking with Paystack payment */}
                            <button
                              type="button"
                              onClick={() => {
                                // Calculate payment amount
                                let amount = 0;
                                if (
                                  firebasePitchData?.bookingSettings
                                    ?.onlinePaymentType === "timeSlot"
                                ) {
                                  amount =
                                    (firebasePitchData.bookingSettings
                                      .onlineTimeSlotPrice || 5000) *
                                    selectedSlotHours;
                                } else {
                                  amount =
                                    firebasePitchData?.pricePerPerson || 3000;
                                }
                                handleInitiatePayment(
                                  amount,
                                  `Booking at ${firebasePitchData?.name}`
                                );
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                            >
                              Proceed to Payment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Booking Success */}
                {bookingSuccess && bookingType === "online" && (
                  <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-md">
                    <div className="flex items-center mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <h4 className="text-lg font-semibold text-green-500">
                        Payment Successful!
                      </h4>
                    </div>
                    <p className="mb-2">
                      Your booking has been confirmed for{" "}
                      {selectedTimeSlot?.startTime} - {selectedMultiSlotEndTime}
                      {selectedSlotHours > 1 && ` (${selectedSlotHours} hours)`}
                      .
                    </p>

                    {/* Private Session Link */}
                    <div className="my-3 p-4 bg-dark/80 rounded border border-green-500/20">
                      <h5 className="font-medium text-white mb-2">
                        Private Session Link
                      </h5>
                      <p className="text-sm text-gray-300 mb-3">
                        Share this link with your friends to let them join your
                        private booking session:
                      </p>
                      <div className="flex">
                        <input
                          type="text"
                          readOnly
                          value={privateSessionLink}
                          className="flex-grow bg-dark rounded-l px-3 py-2 text-gray-300 border border-gray-700 text-sm"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(privateSessionLink);
                            window.toast?.success("Link copied to clipboard!");
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white rounded-r px-3 py-2 text-sm flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Only people with this link can join or create teams in
                        your private session.
                      </p>
                    </div>
                  </div>
                )}

                {/* Physical Booking Success */}
                {bookingSuccess && bookingType === "physical" && (
                  <div className="mb-4 p-4 bg-blue-900/30 border border-blue-500/50 rounded-md">
                    <div className="flex items-center mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-blue-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <h4 className="text-lg font-semibold text-blue-500">
                        Team Created Successfully!
                      </h4>
                    </div>
                    <p className="mb-2">
                      Your team has been created. You can visit the pitch during
                      open hours (
                      {firebasePitchData?.availability?.openBookingHours
                        ?.start ||
                        firebasePitchData?.availability?.openingTime ||
                        "N/A"}{" "}
                      -{" "}
                      {firebasePitchData?.availability?.openBookingHours?.end ||
                        firebasePitchData?.availability?.closingTime ||
                        "N/A"}
                      ) and pay at the venue.
                    </p>
                    <div className="bg-dark/60 p-3 rounded border border-blue-500/20 text-center mb-2">
                      <p className="text-sm mb-1">Team Code:</p>
                      <p className="text-xl font-bold tracking-widest">
                        {bookingCode}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">
                      Share this team code with other players to invite them to
                      join your team.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddTeamForm(false);
                      resetBookingState();
                    }}
                    className="px-4 py-2 rounded bg-dark-lighter hover:bg-dark-light text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTeam}
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 mr-2"
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
                        Creating...
                      </span>
                    ) : (
                      "Create Team"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display Teams Section */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-green-500 rounded-full"></div>
            </div>
          ) : teams.length > 0 ? (
            <>
              {/* Filter teams based on search query */}
              {(() => {
                const filteredTeams = teams.filter((team) => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();

                  // Check if team name matches
                  if (team.name.toLowerCase().includes(query)) return true;

                  // Check if any player name matches
                  if (
                    team.players.some((player) =>
                      player.name.toLowerCase().includes(query)
                    )
                  )
                    return true;

                  return false;
                });

                if (filteredTeams.length === 0) {
                  return (
                    <div className="bg-dark-lighter rounded-lg p-6 text-center">
                      <h3 className="text-xl font-semibold mb-2">
                        No Results Found
                      </h3>
                      <p className="text-gray-400 mb-4">
                        No teams or players match your search: "{searchQuery}"
                      </p>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Clear Search
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map((team) => (
                      <div
                        key={team.id}
                        className="bg-dark-lighter rounded-lg overflow-hidden border border-gray-700"
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{team.name}</h3>
                            <div className="flex flex-col gap-1 items-end">
                              {team.booking && team.booking.startTime && (
                                <span className="bg-green-600/20 text-green-500 text-xs px-2 py-1 rounded-full">
                                  Booked
                                </span>
                              )}
                              {team.booking && !team.booking.startTime && (
                                <span className="bg-blue-600/20 text-blue-500 text-xs px-2 py-1 rounded-full">
                                  Open Play
                                </span>
                              )}
                              {team.sessionId && !isPrivateSession && (
                                <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 mr-1"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Private Session
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Display booking information if available */}
                          {team.booking && (
                            <div className="mb-3 bg-dark p-2 rounded">
                              <div className="text-sm text-gray-400">
                                {team.booking.startTime &&
                                  team.booking.endTime && (
                                    <div className="flex justify-between mb-1">
                                      <span>Time:</span>
                                      <span>
                                        {team.booking.startTime} -{" "}
                                        {team.booking.endTime}
                                      </span>
                                    </div>
                                  )}
                                {!team.booking.startTime && (
                                  <div className="flex justify-between mb-1">
                                    <span>Type:</span>
                                    <span>Physical payment at venue</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Code:</span>
                                  <span className="font-mono">
                                    {team.booking.bookingCode}
                                  </span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span>Status:</span>
                                  <span
                                    className={
                                      team.booking.isPaid
                                        ? "text-green-500"
                                        : "text-yellow-500"
                                    }
                                  >
                                    {team.booking.isPaid
                                      ? "Paid"
                                      : "Payment pending"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">
                              Players ({team.players.length}/{team.maxPlayers})
                            </h4>
                            <div className="space-y-1">
                              {team.players.map((player) => (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between bg-dark p-2 rounded"
                                >
                                  <span className="text-sm">{player.name}</span>
                                  {player.id === team.createdBy && (
                                    <span className="bg-dark-light px-2 py-0.5 rounded text-xs">
                                      Creator
                                    </span>
                                  )}
                                  {player.id === currentUser?.id &&
                                    player.id !== team.createdBy && (
                                      <span className="bg-purple-900/40 text-purple-400 px-2 py-0.5 rounded text-xs">
                                        You
                                      </span>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Join/Leave Team buttons */}
                          {currentUser && (
                            <div className="mt-3">
                              {isUserInTeam(team.id) ? (
                                didUserCreateTeam(team.id) ? (
                                  <p className="text-xs text-gray-400 italic">
                                    You created this team
                                  </p>
                                ) : (
                                  <button
                                    onClick={() => handleLeaveTeam(team.id)}
                                    disabled={leavingTeam}
                                    className="w-full py-1.5 px-3 bg-red-600/30 hover:bg-red-600/50 text-red-400 rounded text-sm flex items-center justify-center"
                                  >
                                    {leavingTeam ? (
                                      <>
                                        <svg
                                          className="animate-spin h-4 w-4 mr-2"
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
                                        Leaving...
                                      </>
                                    ) : (
                                      <>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4 mr-1"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        Leave Team
                                      </>
                                    )}
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => handleJoinTeam(team.id)}
                                  disabled={
                                    joiningTeam ||
                                    !canJoinTeam(team) ||
                                    team.players.length >=
                                      (team.maxPlayers || 5)
                                  }
                                  className={`w-full py-1.5 px-3 rounded text-sm flex items-center justify-center ${
                                    canJoinTeam(team) &&
                                    team.players.length < (team.maxPlayers || 5)
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  {joiningTeam ? (
                                    <>
                                      <svg
                                        className="animate-spin h-4 w-4 mr-2"
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
                                      Joining...
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                      </svg>
                                      {!canJoinTeam(team)
                                        ? userTeamActivity?.createdTeamId ||
                                          userTeamActivity?.joinedTeamId
                                          ? "Already in a Team"
                                          : team.sessionId && !isPrivateSession
                                          ? "Private Session Team"
                                          : "Cannot Join"
                                        : team.players.length >=
                                          (team.maxPlayers || 5)
                                        ? "Team Full"
                                        : "Join Team"}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="bg-dark-lighter rounded-lg p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
              <p className="text-gray-400 mb-4">
                Be the first to create a team for today at this pitch
              </p>
              <button
                onClick={() => setShowAddTeamForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded inline-flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create Team
              </button>
            </div>
          )}
        </>
      )}

      {/* Payment Modal is now handled by Paystack */}
    </div>
  );
};

export default TeamsPage;
