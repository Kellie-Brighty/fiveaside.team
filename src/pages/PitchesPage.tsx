import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

// Define types directly to avoid import issues
interface PitchSettings {
  matchDuration: number;
  maxGoals: number;
  allowDraws: boolean;
  maxPlayersPerTeam: number; // Maximum number of players per team (max 5)
  customColors?: {
    primary: string;
    secondary: string;
  };
  pricePerPerson?: number; // Price per person in Naira
}

interface Pitch {
  id: string;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  logo?: string;
  createdAt: Date;
  referees: string[];
  customSettings?: PitchSettings;
  availability: {
    daysOpen: string[];
    openingTime: string;
    closingTime: string;
  };
  ownerId: string;
  pricePerPerson?: number; // Price per person in Naira
}

// Add new interface for player payments
interface PlayerPayment {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  amount: number;
  isPaid: boolean;
  isExempted: boolean; // New field to track exemption status
  exemptionReason?: string; // New field to track reason for exemption
  paymentDate?: Date;
}

// Mock data for pitches
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
      maxPlayersPerTeam: 5, // Five-a-side
      pricePerPerson: 3000, // 3,000 Naira per person
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
    pricePerPerson: 3000, // 3,000 Naira per person
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
    ownerId: "owner1",
    customSettings: {
      matchDuration: 1200, // 20 minutes
      maxGoals: 10,
      allowDraws: true,
      maxPlayersPerTeam: 5, // Five-a-side
      pricePerPerson: 2500, // 2,500 Naira per person
    },
    availability: {
      daysOpen: ["monday", "wednesday", "friday", "saturday", "sunday"],
      openingTime: "10:00",
      closingTime: "21:00",
    },
    pricePerPerson: 2500, // 2,500 Naira per person
  },
  {
    id: "pitch3",
    name: "Port Harcourt Urban Kickz",
    location: "GRA Phase 2",
    address: "789 Aba Road",
    city: "Port Harcourt",
    state: "Rivers State",
    country: "Nigeria",
    coordinates: {
      latitude: 4.8156,
      longitude: 7.0498,
    },
    description: "Modern indoor facility with 3 separate 5-a-side pitches",
    createdAt: new Date(),
    referees: ["referee2"],
    ownerId: "owner2",
    customSettings: {
      matchDuration: 900,
      maxGoals: 8,
      allowDraws: false,
      maxPlayersPerTeam: 5, // Five-a-side
      pricePerPerson: 2000, // 2,000 Naira per person
    },
    availability: {
      daysOpen: ["tuesday", "thursday", "friday", "saturday", "sunday"],
      openingTime: "08:00",
      closingTime: "23:00",
    },
    pricePerPerson: 2000, // 2,000 Naira per person
  },
  {
    id: "pitch4",
    name: "Kano Football Factory",
    location: "Nasarawa GRA",
    address: "101 Zaria Road",
    city: "Kano",
    state: "Kano State",
    country: "Nigeria",
    coordinates: {
      latitude: 12.0022,
      longitude: 8.592,
    },
    description: "Large complex with multiple pitches and on-site amenities",
    createdAt: new Date(),
    referees: ["referee1", "referee3"],
    ownerId: "owner3",
    customSettings: {
      matchDuration: 1080, // 18 minutes
      maxGoals: 9,
      allowDraws: true,
      maxPlayersPerTeam: 5, // Five-a-side
      pricePerPerson: 1500, // 1,500 Naira per person
    },
    availability: {
      daysOpen: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      openingTime: "07:00",
      closingTime: "23:00",
    },
    pricePerPerson: 1500, // 1,500 Naira per person
  },
];

const PitchesPage: React.FC = () => {
  const { currentUser, isPitchOwner, joinPitch } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>(mockPitches);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pitch>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Get user location for new pitches
  const [_userLocation, _setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [distanceSort, setDistanceSort] = useState<boolean>(false);
  const [cities, setCities] = useState<string[]>([]);

  // Add referee state management
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [formReferees, setFormReferees] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);

  // In the component, add state for tracking player payments
  const [playersInPitch, setPlayersInPitch] = useState<PlayerPayment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Add state for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "payment" | "exemption";
    playerId: string;
    playerName: string;
    newStatus: boolean;
  } | null>(null);

  useEffect(() => {
    // In a real app, fetch pitches from API
    setPitches(mockPitches);
  }, []);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Extract unique cities from pitches for the filter dropdown
    const uniqueCities = Array.from(
      new Set(pitches.map((pitch) => pitch.city))
    ).filter(Boolean);
    setCities(uniqueCities as string[]);

    // Get user location for distance calculations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, [pitches]);

  const handleSelectPitch = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setFormData(pitch);

    // In a real app, fetch referee details from API
    setFormReferees(
      pitch.referees.map((id, index) => ({
        id,
        name: `Referee ${index + 1}`, // Placeholder, would fetch actual names in real app
        email: `referee${index + 1}@example.com`, // Placeholder, would fetch actual emails in real app
      }))
    );
  };

  const handleEditPitch = () => {
    setIsEditing(true);
  };

  const handleCreatePitch = () => {
    setSelectedPitch(null);
    setFormReferees([]);
    setFormData({
      name: "",
      location: "",
      address: "",
      city: "",
      country: "Nigeria",
      state: "",
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
      description: "",
      referees: [],
      ownerId: currentUser?.id || "",
      customSettings: {
        matchDuration: 900,
        maxGoals: 7,
        allowDraws: false,
        maxPlayersPerTeam: 5, // Default to 5 players (five-a-side)
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
      pricePerPerson: 2000, // Default 2,000 Naira per person
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (selectedPitch) {
      setFormData(selectedPitch);
    } else {
      setFormData({});
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Pitch>) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const processedValue =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : type === "number"
        ? parseInt(value)
        : value;

    setFormData((prev: Partial<Pitch>) => {
      const updatedSettings = prev.customSettings
        ? { ...prev.customSettings }
        : {
            matchDuration: 900,
            maxGoals: 7,
            allowDraws: false,
            maxPlayersPerTeam: 5,
          };

      return {
        ...prev,
        customSettings: {
          ...updatedSettings,
          [name]: processedValue,
        },
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // In a real app, send to API
    if (selectedPitch) {
      // Update existing pitch
      setPitches(
        pitches.map((p) =>
          p.id === selectedPitch.id ? { ...p, ...formData } : p
        )
      );
    } else {
      // Create new pitch
      const newPitch: Pitch = {
        id: `pitch${Date.now()}`,
        createdAt: new Date(),
        referees: [],
        ...(formData as any),
      };
      setPitches([...pitches, newPitch]);
    }

    setIsEditing(false);
    setSelectedPitch(null);
  };

  const handleJoinPitch = (pitchId: string) => {
    joinPitch(pitchId);
    // In a real app, you would also make an API call to join the pitch
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter pitches based on search query and location filters
  const getFilteredPitches = () => {
    let filtered = pitches.filter(
      (pitch) =>
        pitch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pitch.location &&
          pitch.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pitch.city &&
          pitch.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Apply city filter if selected
    if (cityFilter) {
      filtered = filtered.filter((pitch) => pitch.city === cityFilter);
    }

    // Sort by distance if user coordinates available and sort is enabled
    if (distanceSort && userCoordinates) {
      filtered.sort((a, b) => {
        if (!a.coordinates || !b.coordinates) return 0;

        const distanceA = calculateDistance(
          userCoordinates.latitude,
          userCoordinates.longitude,
          a.coordinates.latitude,
          a.coordinates.longitude
        );

        const distanceB = calculateDistance(
          userCoordinates.latitude,
          userCoordinates.longitude,
          b.coordinates.latitude,
          b.coordinates.longitude
        );

        return distanceA - distanceB;
      });
    }

    return filtered;
  };

  // Separate owned pitches
  const myOwnedPitches =
    isPitchOwner && currentUser?.ownedPitches
      ? getFilteredPitches().filter((pitch) =>
          currentUser.ownedPitches?.includes(pitch.id)
        )
      : [];

  // Non-owned pitches
  // const otherPitches =
  //   isPitchOwner && currentUser?.ownedPitches
  //     ? getFilteredPitches().filter(
  //         (pitch) => !currentUser.ownedPitches?.includes(pitch.id)
  //       )
  //     : getFilteredPitches();

  // Add handleAddReferee function
  const handleAddReferee = () => {
    if (refereeEmail && refereeName) {
      const newReferee = {
        id: `referee-${Date.now()}`, // Temporary ID
        name: refereeName,
        email: refereeEmail,
      };

      setFormReferees([...formReferees, newReferee]);

      // Update form data with new referee ID
      setFormData((prev) => ({
        ...prev,
        referees: [...(prev.referees || []), newReferee.id],
      }));

      // Clear inputs
      setRefereeEmail("");
      setRefereeName("");
    }
  };

  const handleRemoveReferee = (refereeId: string) => {
    setFormReferees(formReferees.filter((referee) => referee.id !== refereeId));

    // Update form data by removing referee ID
    setFormData((prev) => ({
      ...prev,
      referees: (prev.referees || []).filter((id) => id !== refereeId),
    }));
  };

  // Add mock data for demonstration
  const generateMockPlayerPayments = (_pitchId: string) => {
    // This would normally come from an API call based on teams assigned to the pitch
    const mockTeamNames = [
      "Lightning Warriors",
      "Royal Eagles",
      "Urban Kickers",
      "Silver Hawks",
    ];
    const mockPlayerPayments: PlayerPayment[] = [];

    for (let teamIndex = 0; teamIndex < 4; teamIndex++) {
      const teamId = `team-${teamIndex + 1}`;
      const teamName = mockTeamNames[teamIndex];

      // Generate 5 players per team (5-a-side)
      for (let playerIndex = 0; playerIndex < 5; playerIndex++) {
        const playerId = `player-${teamIndex * 5 + playerIndex + 1}`;
        const playerName = `Player ${teamIndex * 5 + playerIndex + 1}`;

        mockPlayerPayments.push({
          id: `payment-${teamIndex * 5 + playerIndex + 1}`,
          playerId,
          playerName,
          teamId,
          teamName,
          amount: 3000, // Fixed price per person (3000 Naira)
          isPaid: Math.random() > 0.5, // Randomly set some as paid
          isExempted: Math.random() > 0.5, // Randomly set some as exempted
          exemptionReason: Math.random() > 0.5 ? "Medical Reason" : undefined,
          paymentDate: Math.random() > 0.5 ? new Date() : undefined,
        });
      }
    }

    return mockPlayerPayments;
  };

  // Add function to load player payments based on pitch and date
  const loadPlayerPayments = (pitchId: string, _date: string) => {
    // In a real app, this would be an API call
    // For now, we'll use our mock data generator
    setPlayersInPitch(generateMockPlayerPayments(pitchId));
  };

  // Show confirmation for toggling payment status
  const confirmTogglePaymentStatus = (player: PlayerPayment) => {
    const newStatus = !player.isPaid;
    setConfirmAction({
      type: "payment",
      playerId: player.id,
      playerName: player.playerName,
      newStatus,
    });
    setShowConfirmModal(true);
  };

  // Show confirmation for toggling exemption status
  const confirmToggleExemptionStatus = (player: PlayerPayment) => {
    const newStatus = !player.isExempted;
    setConfirmAction({
      type: "exemption",
      playerId: player.id,
      playerName: player.playerName,
      newStatus,
    });
    setShowConfirmModal(true);
  };

  // Actual function to toggle payment status after confirmation
  const togglePaymentStatus = (paymentId: string) => {
    setPlayersInPitch((prevPayments) =>
      prevPayments.map((payment) => {
        if (payment.id === paymentId) {
          const newPaymentStatus = !payment.isPaid;
          return {
            ...payment,
            isPaid: newPaymentStatus,
            paymentDate: newPaymentStatus ? new Date() : undefined,
          };
        }
        return payment;
      })
    );
  };

  // Actual function to toggle exemption status after confirmation
  const toggleExemptionStatus = (paymentId: string) => {
    setPlayersInPitch((prevPayments) =>
      prevPayments.map((payment) => {
        if (payment.id === paymentId) {
          const newExemptionStatus = !payment.isExempted;

          // If exempted, set isPaid to false to avoid conflicts
          return {
            ...payment,
            isExempted: newExemptionStatus,
            exemptionReason: newExemptionStatus
              ? "Fee exempted by manager"
              : undefined,
            isPaid: newExemptionStatus ? false : payment.isPaid,
          };
        }
        return payment;
      })
    );
  };

  // Handle confirmation action
  const handleConfirmAction = () => {
    if (confirmAction) {
      if (confirmAction.type === "payment") {
        togglePaymentStatus(confirmAction.playerId);
      } else if (confirmAction.type === "exemption") {
        toggleExemptionStatus(confirmAction.playerId);
      }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Add useEffect to load payments when pitch is selected
  useEffect(() => {
    if (selectedPitch && isPitchOwner) {
      loadPlayerPayments(selectedPitch.id, selectedDate);
    }
  }, [selectedPitch, selectedDate]);

  // Calculate payment statistics
  const calculatePaymentStats = () => {
    const totalPlayers = playersInPitch.length;
    const paidPlayers = playersInPitch.filter((player) => player.isPaid).length;
    const exemptedPlayers = playersInPitch.filter(
      (player) => player.isExempted
    ).length;
    const unpaidPlayers = totalPlayers - paidPlayers - exemptedPlayers;

    const expectedTotal = totalPlayers * (selectedPitch?.pricePerPerson || 0);
    const collectedTotal = paidPlayers * (selectedPitch?.pricePerPerson || 0);
    const exemptedTotal =
      exemptedPlayers * (selectedPitch?.pricePerPerson || 0);
    const remainingTotal = expectedTotal - collectedTotal - exemptedTotal;

    return {
      totalPlayers,
      paidPlayers,
      unpaidPlayers,
      exemptedPlayers,
      expectedTotal,
      collectedTotal,
      exemptedTotal,
      remainingTotal,
    };
  };

  // Add payment section renderer
  const renderPaymentTrackingSection = () => {
    if (!isPitchOwner || !selectedPitch) return null;

    const paymentStats = calculatePaymentStats();

    return (
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-green-500 mb-2">
              Payment Tracking
            </h2>
            <p className="text-gray-400 text-sm">
              Track and manage payments from players at your pitch
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center">
              <span className="text-gray-400 mr-2">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-dark border border-gray-700 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-light/40 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">
              Total Expected
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-white">
              ₦{paymentStats.expectedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {paymentStats.totalPlayers} players × ₦
              {selectedPitch.pricePerPerson?.toLocaleString() || 0}
            </p>
          </div>

          <div className="bg-dark-light/40 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">
              Collected
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-500">
              ₦{paymentStats.collectedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {paymentStats.paidPlayers} paid players
            </p>
          </div>

          <div className="bg-dark-light/40 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">
              Remaining
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-yellow-500">
              ₦{paymentStats.remainingTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {paymentStats.unpaidPlayers} unpaid players
            </p>
          </div>
        </div>

        <div className="bg-dark-light/40 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-1">
            Exempted Payments
          </h3>
          <p className="text-xl sm:text-2xl font-bold text-blue-400">
            ₦{paymentStats.exemptedTotal.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {paymentStats.exemptedPlayers} exempted players
          </p>
        </div>

        <div className="bg-dark-lighter rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold">Players at {selectedPitch.name}</h3>
            <div className="text-xs text-gray-400">
              {playersInPitch.length} players total
            </div>
          </div>

          {playersInPitch.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {playersInPitch.map((player) => (
                <div
                  key={player.id}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-dark-light/20"
                >
                  <div className="mb-2 sm:mb-0">
                    <div className="font-medium">{player.playerName}</div>
                    <div className="text-sm text-gray-400">
                      {player.teamName}
                    </div>
                    {player.isExempted && player.exemptionReason && (
                      <div className="text-xs text-blue-400 mt-1">
                        Reason: {player.exemptionReason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center w-full sm:w-auto">
                    <div className="text-left sm:text-right mr-0 sm:mr-4 mb-2 sm:mb-0">
                      <div className="font-medium">
                        ₦{player.amount.toLocaleString()}
                      </div>
                      {player.isPaid && player.paymentDate && (
                        <div className="text-xs text-gray-400">
                          {player.paymentDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => confirmTogglePaymentStatus(player)}
                        disabled={player.isExempted}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          player.isExempted
                            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                            : player.isPaid
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        }`}
                      >
                        {player.isPaid ? "Paid" : "Unpaid"}
                      </button>
                      <button
                        onClick={() => confirmToggleExemptionStatus(player)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          player.isExempted
                            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {player.isExempted ? "Exempted" : "Exempt"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              No players found for this date. Players appear here when they join
              teams at your pitch.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isPitchOwner ? (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-500 mb-3 sm:mb-0">
              Manage Your Pitches
            </h1>
            <button
              onClick={handleCreatePitch}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center w-full sm:w-auto justify-center sm:justify-start"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Register New Pitch
            </button>
          </div>

          {myOwnedPitches.length > 0 ? (
            <div className="bg-dark-light/20 rounded-lg p-4 sm:p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Your Pitches
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myOwnedPitches.map((pitch) => (
                  <div
                    key={pitch.id}
                    className={`bg-dark-light/40 border ${
                      selectedPitch?.id === pitch.id
                        ? "border-green-500"
                        : "border-green-500/30"
                    } rounded-lg overflow-hidden cursor-pointer hover:bg-dark-light/60 transition-all`}
                    onClick={() => handleSelectPitch(pitch)}
                  >
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-white">
                        {pitch.name}
                      </h3>
                      <p className="text-gray-400 text-sm">{pitch.location}</p>
                      <div className="mt-2 flex items-center text-xs text-green-400">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Owner
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !isEditing && (
              <div className="bg-dark-light/20 rounded-lg p-4 sm:p-6 mb-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">
                  No Pitches Registered Yet
                </h2>
                <p className="text-gray-400 mb-4">
                  Register your first pitch to start hosting matches
                </p>
                <button
                  onClick={handleCreatePitch}
                  className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-md"
                >
                  Register Your First Pitch
                </button>
              </div>
            )
          )}

          {/* Display selected pitch details inline */}
          {selectedPitch && !isEditing && (
            <div className="bg-dark-lighter rounded-lg p-4 sm:p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1">
                    {selectedPitch.name}
                  </h2>
                  <p className="text-gray-400">{selectedPitch.location}</p>
                </div>
                <button
                  onClick={() => setSelectedPitch(null)}
                  className="bg-dark/50 text-white p-1.5 rounded-full hover:bg-dark/80"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-gray-300 mb-6">{selectedPitch.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-dark p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-300">
                    Match Settings
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-400">Match Duration:</span>
                      <span>
                        {selectedPitch.customSettings?.matchDuration
                          ? selectedPitch.customSettings.matchDuration / 60
                          : 15}{" "}
                        minutes
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Max Goals:</span>
                      <span>
                        {selectedPitch.customSettings?.maxGoals || 7} goals
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Draws Allowed:</span>
                      <span>
                        {selectedPitch.customSettings?.allowDraws
                          ? "Yes"
                          : "No"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Team Size:</span>
                      <span>
                        {selectedPitch.customSettings?.maxPlayersPerTeam || 5}
                        -a-side
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-semibold text-primary">
                        ₦
                        {selectedPitch.pricePerPerson?.toLocaleString() ||
                          "2,000"}
                        /person
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-300">
                    Pitch Info
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-400">Surface:</span>
                      <span>Artificial Turf</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Indoor/Outdoor:</span>
                      <span>
                        {selectedPitch.name.includes("Indoor")
                          ? "Indoor"
                          : "Outdoor"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Changing Rooms:</span>
                      <span>Available</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Referees Section */}
              <div className="bg-dark p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-2 text-gray-300">Referees</h3>
                {selectedPitch.referees && selectedPitch.referees.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {selectedPitch.referees.map((refereeId) => (
                      <li
                        key={refereeId}
                        className="flex items-center text-gray-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2 text-green-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Referee (ID: {refereeId.substring(0, 8)})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    No referees assigned yet
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
                {isPitchOwner &&
                currentUser?.ownedPitches?.includes(selectedPitch.id) ? (
                  <button
                    onClick={handleEditPitch}
                    className="btn-primary flex-1 py-2.5"
                  >
                    Edit Pitch
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleJoinPitch(selectedPitch.id);
                        setSelectedPitch(null);
                      }}
                      className="bg-dark hover:bg-dark-light text-white text-center py-2.5 rounded-lg flex-1"
                    >
                      Join This Pitch
                    </button>
                    <Link
                      to="/teams"
                      className="bg-primary hover:bg-primary/90 text-white text-center py-2.5 rounded-lg flex-1"
                      onClick={() => handleJoinPitch(selectedPitch.id)}
                    >
                      Create a Team
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Render payment tracking section */}
          {renderPaymentTrackingSection()}

          <h2 className="text-xl font-bold text-white mb-4">Other Pitches</h2>
        </div>
      ) : null}

      {/* Always show pitch-finding and team-creation UI for all users, including pitch owners */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold sport-gradient-text mb-2">
              Find Pitches to Play Today
            </h1>
            <p className="text-gray-400 text-sm">
              Browse available five-a-side pitches and join a team or create
              your own
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-dark-lighter p-4 sm:p-5 rounded-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pitches by name or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 w-full focus:outline-none focus:border-primary"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {userCoordinates && (
              <div className="flex items-center mt-4 md:mt-0">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distanceSort}
                    onChange={() => setDistanceSort(!distanceSort)}
                    className="sr-only"
                  />
                  <span
                    className={`w-10 h-5 ${
                      distanceSort ? "bg-primary" : "bg-gray-700"
                    } rounded-full relative transition-colors duration-200 ease-in-out mr-2`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                        distanceSort ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></span>
                  </span>
                  <span className="text-sm text-gray-300">
                    Sort by Distance
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-primary"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            Pitches Near You
          </h2>

          {getFilteredPitches().length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredPitches().map((pitch) => {
                // Calculate distance if user coordinates available
                let distance = null;
                if (userCoordinates && pitch.coordinates) {
                  distance = calculateDistance(
                    userCoordinates.latitude,
                    userCoordinates.longitude,
                    pitch.coordinates.latitude,
                    pitch.coordinates.longitude
                  );
                }

                return (
                  <div
                    key={pitch.id}
                    className="bg-dark-lighter hover:bg-dark-lighter/80 transition-colors duration-200 rounded-lg overflow-hidden border border-gray-700 hover:border-primary/30"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg">{pitch.name}</h3>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          Available
                        </span>
                      </div>

                      <div className="flex items-center text-gray-400 text-sm mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-gray-500"
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
                        {pitch.city}
                        {pitch.state ? `, ${pitch.state}` : ""}

                        {distance !== null && (
                          <span className="ml-2 text-xs bg-dark py-0.5 px-1.5 rounded-full">
                            {distance.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <p className="text-gray-500 text-xs mb-4 line-clamp-2">
                        {pitch.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-dark rounded-md text-xs text-gray-300 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
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
                          {pitch.customSettings?.matchDuration
                            ? pitch.customSettings.matchDuration / 60
                            : 15}{" "}
                          min
                        </span>
                        <span className="px-2 py-1 bg-dark rounded-md text-xs text-gray-300 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
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
                          {pitch.customSettings?.maxPlayersPerTeam || 5}
                          -a-side
                        </span>
                        {pitch.availability && (
                          <span className="px-2 py-1 bg-dark rounded-md text-xs text-gray-300 flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Open today
                          </span>
                        )}
                        <span className="px-2 py-1 bg-primary/20 rounded-md text-xs text-primary flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          ₦{pitch.pricePerPerson?.toLocaleString() || "2,000"}
                          /person
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                        <button
                          onClick={() => handleSelectPitch(pitch)}
                          className="text-sm text-gray-400 hover:text-white"
                        >
                          View Details
                        </button>
                        <Link
                          to="/teams"
                          className="btn-primary text-sm py-1.5 px-4"
                          onClick={() => handleJoinPitch(pitch.id)}
                        >
                          Play Here
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center bg-dark-lighter p-8 rounded-lg border border-gray-700">
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="text-xl font-bold mb-2">No Pitches Found</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Action Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowConfirmModal(false)}
          ></div>
          <div className="relative bg-dark-lighter rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
              <p className="text-gray-300 mb-6">
                Are you sure you want to mark{" "}
                <span className="font-bold">{confirmAction.playerName}</span> as{" "}
                {confirmAction.type === "payment"
                  ? confirmAction.newStatus
                    ? "paid"
                    : "unpaid"
                  : confirmAction.newStatus
                  ? "exempted from payment"
                  : "not exempted"}
                ?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-center py-2.5 rounded-lg flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`${
                    confirmAction.type === "payment"
                      ? confirmAction.newStatus
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-yellow-600 hover:bg-yellow-700"
                      : confirmAction.newStatus
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  } text-white text-center py-2.5 rounded-lg flex-1`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={handleCancel}
          ></div>
          <div className="relative bg-dark-lighter rounded-xl w-full max-w-3xl md:max-w-4xl my-8 shadow-xl overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {selectedPitch ? "Edit Pitch" : "Register New Pitch"}
                </h2>
                <button
                  onClick={handleCancel}
                  className="bg-dark/50 text-white p-1.5 rounded-full hover:bg-dark/80"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-6 max-h-[70vh] overflow-y-auto px-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Pitch Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      required
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      placeholder="Enter pitch name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Location/Area *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location || ""}
                      onChange={handleChange}
                      required
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      placeholder="e.g. Lekki Phase 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ""}
                      onChange={handleChange}
                      required
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      placeholder="Enter street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ""}
                      onChange={handleChange}
                      required
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state || ""}
                      onChange={handleChange}
                      required
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country || "Nigeria"}
                      onChange={handleChange}
                      disabled
                      className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary opacity-75"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    rows={3}
                    className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                    placeholder="Describe your pitch, surface type, amenities, etc."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Price Per Person (₦) *
                  </label>
                  <input
                    type="number"
                    name="pricePerPerson"
                    value={formData.pricePerPerson || 2000}
                    onChange={handleChange}
                    required
                    min={500}
                    className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                    placeholder="e.g. 2000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the amount each player will pay per match
                  </p>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-semibold mb-3">Match Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Match Duration (minutes)
                      </label>
                      <input
                        type="number"
                        name="matchDuration"
                        value={
                          formData.customSettings?.matchDuration
                            ? formData.customSettings.matchDuration / 60
                            : 15
                        }
                        onChange={(e) => {
                          const minutes = parseInt(e.target.value);
                          handleSettingsChange({
                            target: {
                              name: "matchDuration",
                              value: minutes * 60, // Convert to seconds
                              type: "number",
                            },
                          } as any);
                        }}
                        min={5}
                        max={60}
                        className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Max Goals (Game End)
                      </label>
                      <input
                        type="number"
                        name="maxGoals"
                        value={formData.customSettings?.maxGoals || 7}
                        onChange={handleSettingsChange}
                        min={1}
                        max={20}
                        className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Team Size (per side)
                      </label>
                      <select
                        name="maxPlayersPerTeam"
                        value={formData.customSettings?.maxPlayersPerTeam || 5}
                        onChange={handleSettingsChange}
                        className="bg-dark border border-gray-700 rounded-lg px-4 py-2 w-full focus:outline-none focus:border-primary appearance-none"
                      >
                        <option value={5}>5-a-side</option>
                        <option value={6}>6-a-side</option>
                        <option value={7}>7-a-side</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center h-full pt-4">
                        <input
                          type="checkbox"
                          name="allowDraws"
                          checked={formData.customSettings?.allowDraws || false}
                          onChange={handleSettingsChange}
                          className="form-checkbox h-5 w-5 text-green-500 rounded border-gray-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="ml-2 text-gray-300">
                          Allow matches to end in draws
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-semibold mb-3">Referees</h3>
                  {formReferees.length > 0 ? (
                    <div className="mb-4 space-y-2">
                      {formReferees.map((referee) => (
                        <div
                          key={referee.id}
                          className="bg-dark p-3 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {referee.name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {referee.email}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveReferee(referee.id)}
                            className="text-red-400 hover:text-red-300"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mb-4">
                      No referees added yet
                    </div>
                  )}

                  <div className="bg-dark p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Referee Name
                        </label>
                        <input
                          type="text"
                          value={refereeName}
                          onChange={(e) => setRefereeName(e.target.value)}
                          className="bg-dark-light border border-gray-700 rounded-lg px-3 py-1.5 w-full text-sm focus:outline-none focus:border-primary"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Referee Email
                        </label>
                        <input
                          type="email"
                          value={refereeEmail}
                          onChange={(e) => setRefereeEmail(e.target.value)}
                          className="bg-dark-light border border-gray-700 rounded-lg px-3 py-1.5 w-full text-sm focus:outline-none focus:border-primary"
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddReferee}
                      disabled={!refereeName || !refereeEmail}
                      className={`w-full py-1.5 rounded-lg text-sm ${
                        !refereeName || !refereeEmail
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-primary/20 text-primary hover:bg-primary/30"
                      }`}
                    >
                      Add Referee
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 border-t border-gray-700 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    {selectedPitch ? "Save Changes" : "Register Pitch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitchesPage;
