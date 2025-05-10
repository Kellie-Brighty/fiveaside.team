import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import {  useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import BoostInfo from "../components/BoostInfo";

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
  boostData?: {
    isActive: boolean;
    boostType: string;
    startDate: Date;
    endDate: Date;
    transactionRef?: string;
    lastPaymentDate?: Date;
  };
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
  createdAt?: Date; // Adding timestamp for when the payment record was created
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

// Add a simple Map component for location selection
const LocationPicker: React.FC<{
  coordinates: { latitude: number; longitude: number } | undefined;
  onLocationSelected: (lat: number, lng: number) => void;
  readOnly?: boolean;
}> = ({ coordinates, onLocationSelected, readOnly = false }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading - in a real app, you would load an actual map library
    // such as Google Maps, Mapbox, Leaflet, etc.
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!mapLoaded) {
    return (
      <div className="h-60 bg-dark rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="relative h-60 bg-dark rounded-lg overflow-hidden">
      {/* This would be an actual map in production */}
      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
        <div className="text-gray-500">Map view (simulated)</div>

        {/* Current location marker */}
        {coordinates && (
          <div
            className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${50 + coordinates.longitude * 0.5}%`,
              top: `${50 - coordinates.latitude * 0.5}%`,
            }}
          >
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
            <div className="absolute -bottom-5 whitespace-nowrap text-xs text-primary">
              {coordinates.latitude.toFixed(4)},{" "}
              {coordinates.longitude.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="absolute bottom-2 right-2 z-10">
          <button
            type="button"
            onClick={() => {
              // In a real app, this would be the user's current location from browser
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    onLocationSelected(
                      position.coords.latitude,
                      position.coords.longitude
                    );
                  },
                  (error) => {
                    console.error("Error getting location:", error);
                    // Default to a location in Lagos, Nigeria
                    onLocationSelected(6.455, 3.3841);
                  }
                );
              } else {
                // Default to a location in Lagos, Nigeria
                onLocationSelected(6.455, 3.3841);
              }
            }}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm shadow-lg"
          >
            Use My Location
          </button>
        </div>
      )}
    </div>
  );
};

const PitchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isPitchOwner, setSelectedPitchId, joinPitch } =
    useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  // const [filteredPitches, setFilteredPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  // const [activeView, setActiveView] = useState<"grid" | "map">("grid");
  const [formData, setFormData] = useState<Partial<Pitch>>({
    name: "",
    location: "",
    city: "",
    state: "",
    country: "Nigeria",
    description: "",
    referees: [],
    availability: {
      daysOpen: ["monday", "wednesday", "friday"],
      openingTime: "09:00",
      closingTime: "22:00",
    },
    customSettings: {
      matchDuration: 900, // 15 minutes in seconds
      maxGoals: 7,
      allowDraws: false,
      maxPlayersPerTeam: 5,
    },
    pricePerPerson: 2000,
  });
  const [formReferees, setFormReferees] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [addingReferee, setAddingReferee] = useState(false);
  const [refereeError, setRefereeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "boost">("details");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalPitch, setModalPitch] = useState<Pitch | null>(null); // Add a separate state for modal pitch

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

  // Fetch pitches from Firestore
  useEffect(() => {
    const fetchPitches = async () => {
      setLoading(true);
      try {
        const pitchesCollection = collection(db, "pitches");
        const pitchesSnapshot = await getDocs(pitchesCollection);
        const pitchesList = pitchesSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamp to Date safely
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

          return {
            id: doc.id,
            ...data,
            createdAt: createdAtDate,
          } as Pitch;
        });
        setPitches(pitchesList);
      } catch (error) {
        console.error("Error fetching pitches:", error);
        // Fallback to mock data if fetch fails
        setPitches(mockPitches);
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();
  }, [refreshTrigger]);

  // Load owned pitches specifically for pitch owners
  useEffect(() => {
    const loadOwnedPitches = async () => {
      if (isPitchOwner && currentUser) {
        try {
          const pitchesCollection = collection(db, "pitches");
          const q = query(
            pitchesCollection,
            where("ownerId", "==", currentUser.id)
          );
          const querySnapshot = await getDocs(q);

          const ownedPitchesList = querySnapshot.docs.map((doc) => {
            const data = doc.data();

            // Convert Firestore timestamp to Date safely
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

            return {
              id: doc.id,
              ...data,
              createdAt: createdAtDate,
            } as Pitch;
          });

          // If we have owned pitches from Firebase, update our pitches state to include them
          if (ownedPitchesList.length > 0) {
            setPitches((currentPitches) => {
              const pitchIds = new Set(currentPitches.map((p) => p.id));
              const newPitches = [...currentPitches];

              ownedPitchesList.forEach((pitch) => {
                if (!pitchIds.has(pitch.id)) {
                  newPitches.push(pitch);
                }
              });

              return newPitches;
            });
          }
        } catch (error) {
          console.error("Error loading owned pitches:", error);
        }
      }
    };

    loadOwnedPitches();
  }, [isPitchOwner, currentUser, refreshTrigger]);

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

  const handleSelectPitch = (pitch: Pitch, showModal = false) => {
    // Always set modalPitch if showing as a modal
    if (showModal) {
      setModalPitch(pitch);
      setShowDetailsModal(true);
    }

    // For own pitches or regular selection without modal, we update the main view
    const isOwnedPitch =
      isPitchOwner &&
      currentUser &&
      (currentUser.id === pitch.ownerId ||
        currentUser.ownedPitches?.includes(pitch.id));

    // Only update main view if it's not a modal for non-owned pitch
    if (!showModal || (showModal && isOwnedPitch)) {
      setSelectedPitch(pitch);
      setFormData(pitch);
      setSelectedPitchId(pitch.id);

      // In a real app, fetch referee details from API
      setFormReferees(
        pitch.referees.map((id, index) => ({
          id,
          name: `Referee ${index + 1}`, // Placeholder, would fetch actual names in real app
          email: `referee${index + 1}@example.com`, // Placeholder, would fetch actual emails in real app
        }))
      );

      // Check if this pitch is owned by the current user but not yet in their ownedPitches array
      if (isPitchOwner && currentUser && pitch.ownerId === currentUser.id) {
        // In a real app, we would update the user's record in Firestore
        console.log("User is the owner of this pitch");
      }
    }
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
        maxPlayersPerTeam: 5,
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

    // No longer skip changes to maxPlayersPerTeam - allow selection from 3-5
    // if (name === "maxPlayersPerTeam") return;

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

  // Add function to update user's owned pitches
  const updateUserOwnedPitches = async (pitchId: string) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, "users", currentUser.id);

      // Add the pitch ID to the user's ownedPitches array
      await updateDoc(userRef, {
        ownedPitches: arrayUnion(pitchId),
      });

      console.log("User's owned pitches updated successfully");
    } catch (error) {
      console.error("Error updating user's owned pitches:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      if (selectedPitch) {
        // Update existing pitch
        const pitchRef = doc(db, "pitches", selectedPitch.id);
        await updateDoc(pitchRef, {
          ...formData,
          updatedAt: new Date(),
        });

        // Update local state
        setPitches(
          pitches.map((p) =>
            p.id === selectedPitch.id ? ({ ...p, ...formData } as Pitch) : p
          )
        );

        setIsEditing(false);
        setSelectedPitch(null);
        window.toast?.success("Pitch updated successfully!");
      } else {
        // Create new pitch - now without requiring a subscription
        const newPitchData = {
          ...formData,
          createdAt: new Date(),
          ownerId: currentUser?.id,
          referees: formData.referees || [],
          // Initialize boost data as inactive
          boostData: {
            isActive: false,
            boostType: "",
            startDate: null,
            endDate: null,
          },
        };

        const docRef = await addDoc(collection(db, "pitches"), newPitchData);

        // Add to local state
        const newPitch: Pitch = {
          id: docRef.id,
          ...(newPitchData as any),
        };
        setPitches([...pitches, newPitch]);

        // Update user's ownedPitches array
        await updateUserOwnedPitches(docRef.id);

        setIsEditing(false);

        // Show success message
        window.toast?.success(
          "Pitch created successfully! You can now boost it for more visibility."
        );

        // Set this new pitch as selected so we can show the boost section
        setSelectedPitch(newPitch);
        setActiveTab("boost");
      }
    } catch (error) {
      console.error("Error saving pitch:", error);
      window.toast?.error("Failed to save pitch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinPitch = (pitchId: string) => {
    console.log("handleJoinPitch called with pitchId:", pitchId);

    // Find the pitch object to get its name
    const selectedPitchObj = pitches.find((p) => p.id === pitchId);

    // Set the selected pitch ID in the auth context
    setSelectedPitchId(pitchId);

    // Also set in localStorage directly as a backup
    localStorage.setItem("selectedPitchId", pitchId);

    // Store pitch name and location for use in other pages
    if (selectedPitchObj) {
      const pitchData = {
        id: pitchId,
        name: selectedPitchObj.name,
        location: selectedPitchObj.location || "",
      };
      localStorage.setItem("selectedPitchData", JSON.stringify(pitchData));
      console.log("Stored pitch data in localStorage:", pitchData);
    }

    console.log(
      "After setting - localStorage:",
      localStorage.getItem("selectedPitchId")
    );

    // Call the joinPitch function to update the user's joined pitches
    joinPitch(pitchId);

    // Navigate to the teams page
    navigate("/teams");
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

  // Refresh boost data
  const refreshBoost = () => {
    // Refresh the pitches data to get updated boost info
    setRefreshTrigger((prev) => prev + 1);

    // Reload this pitch's data
    if (selectedPitch) {
      const pitchId = selectedPitch.id;
      const fetchUpdatedPitch = async () => {
        try {
          const pitchRef = doc(db, "pitches", pitchId);
          const pitchDoc = await getDoc(pitchRef);

          if (pitchDoc.exists()) {
            const data = pitchDoc.data();

            // Convert Firestore timestamps to Date safely
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

            const updatedPitch = {
              id: pitchDoc.id,
              ...data,
              createdAt: createdAtDate,
              city: data.city || "",
            } as Pitch;

            setSelectedPitch(updatedPitch);
          }
        } catch (error) {
          console.error("Error fetching updated pitch:", error);
        }
      };

      fetchUpdatedPitch();
    }
  };

  // Search for referee by email
  const searchRefereeByEmail = async (email: string) => {
    try {
      // In a real app, we would query the 'users' collection where role === 'referee'
      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("email", "==", email),
        where("role", "==", "referee")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const refereeDoc = querySnapshot.docs[0];
        const refereeData = refereeDoc.data();
        return {
          id: refereeDoc.id,
          name: refereeData.name || refereeData.email.split("@")[0],
          email: refereeData.email,
        };
      }
      return null;
    } catch (error) {
      console.error("Error searching for referee:", error);
      return null;
    }
  };

  // Add referee with Firebase integration and proper error handling
  const handleAddReferee = async () => {
    if (!refereeEmail || !refereeName) return;

    setAddingReferee(true);
    setRefereeError(null);

    try {
      // First, check if the email belongs to a registered referee
      const existingReferee = await searchRefereeByEmail(refereeEmail);

      let newReferee;
      if (existingReferee) {
        newReferee = existingReferee;
      } else {
        // If not found, create a temporary ID and show a notice
        newReferee = {
          id: `referee-${Date.now()}`,
          name: refereeName,
          email: refereeEmail,
        };

        // Show a notice that this referee isn't registered yet
        setRefereeError(
          "This referee is not registered in the system. We'll send them an invitation email."
        );
      }

      // Check if this referee is already added
      if (formReferees.some((ref) => ref.email === refereeEmail)) {
        setRefereeError("This referee has already been added to the pitch.");
        return;
      }

      setFormReferees([...formReferees, newReferee]);

      // Update form data with new referee ID
      setFormData((prev) => ({
        ...prev,
        referees: [...(prev.referees || []), newReferee.id],
      }));

      // Clear inputs
      setRefereeEmail("");
      setRefereeName("");
    } catch (error) {
      console.error("Error adding referee:", error);
      setRefereeError("Failed to add referee. Please try again.");
    } finally {
      setAddingReferee(false);
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

  // Get pitches owned by the current user
  const myOwnedPitches = useMemo(() => {
    if (!isPitchOwner || !currentUser) return [];

    const ownedPitches = pitches.filter(
      (pitch) =>
        // Either in the user's ownedPitches array or has matching ownerId
        currentUser.ownedPitches?.includes(pitch.id) ||
        pitch.ownerId === currentUser.id
    );

    // Filter owned pitches based on search query if one exists
    if (searchQuery) {
      return ownedPitches.filter(
        (pitch) =>
          pitch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (pitch.location &&
            pitch.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (pitch.city &&
            pitch.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return ownedPitches;
  }, [pitches, currentUser, isPitchOwner, searchQuery]);

  // Non-owned pitches
  // const otherPitches =
  //   isPitchOwner && currentUser?.ownedPitches
  //     ? getFilteredPitches().filter(
  //         (pitch) => !currentUser.ownedPitches?.includes(pitch.id)
  //       )
  //     : getFilteredPitches();

  // Add function to load player payments based on pitch and date
  const loadPlayerPayments = (pitchId: string, date: string) => {
    const fetchPlayersFromTeams = async () => {
      try {
        setPlayersInPitch([]); // Clear existing data

        // Fetch teams for this pitch and date from Firebase
        const teamsRef = collection(db, "teams");
        const q = query(
          teamsRef,
          where("pitchId", "==", pitchId),
          where("createdForDate", "==", date)
        );

        const teamsSnapshot = await getDocs(q);

        if (!teamsSnapshot.empty) {
          // We found teams for this pitch and date
          const realPlayerPayments: PlayerPayment[] = [];

          // Loop through each team
          teamsSnapshot.docs.forEach((teamDoc) => {
            const teamData = teamDoc.data();
            const teamId = teamDoc.id;
            const teamName = teamData.name || "Unknown Team";

            // Process each player in the team
            if (teamData.players && Array.isArray(teamData.players)) {
              teamData.players.forEach((player: any) => {
                // Get pricing from pitch settings
                const pitchPrice = selectedPitch?.pricePerPerson || 3000;

                // Check if we already have a payment record for this player
                const existingPaymentIndex = playersInPitch.findIndex(
                  (p) => p.playerId === player.id && p.teamId === teamId
                );

                // Check if this player is the pitch owner
                const isPlayerPitchOwner = Boolean(
                  currentUser &&
                    currentUser.id === player.id &&
                    selectedPitch &&
                    selectedPitch.ownerId === currentUser.id
                );

                if (existingPaymentIndex >= 0) {
                  // Use existing payment status if available
                  realPlayerPayments.push(playersInPitch[existingPaymentIndex]);
                } else {
                  // Create new payment record for this player
                  realPlayerPayments.push({
                    id: `payment-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    playerId: player.id,
                    playerName: player.name,
                    teamId: teamId,
                    teamName: teamName,
                    amount: pitchPrice,
                    isPaid: false, // Default to unpaid
                    // Automatically exempt the pitch owner from payment
                    isExempted: isPlayerPitchOwner,
                    exemptionReason: isPlayerPitchOwner
                      ? "Pitch Owner"
                      : undefined,
                    createdAt: new Date(), // Adding timestamp for when the payment record was created
                  });
                }
              });
            }
          });

          setPlayersInPitch(realPlayerPayments);
        }
      } catch (error) {
        console.error("Error fetching players for payment tracking:", error);
        setPlayersInPitch([]); // Set empty array instead of mock data
      }
    };

    fetchPlayersFromTeams();
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

  // Add a handler for location selection
  const handleLocationSelected = (latitude: number, longitude: number) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: {
        latitude,
        longitude,
      },
    }));
  };

  // Render the boost tab content
  const renderBoostSection = () => {
    if (!isPitchOwner || !selectedPitch || !currentUser) return null;

    return (
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Boost Your Pitch
            </h2>
            <p className="text-gray-400 text-sm">
              Increase visibility and attract more players to your pitch
            </p>
          </div>
        </div>

        <BoostInfo
          pitch={selectedPitch}
          userEmail={currentUser.email}
          onBoostUpdate={refreshBoost}
        />

        <div className="mt-8 p-4 bg-dark-lighter rounded-lg border border-yellow-500/20">
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5"
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
            <div>
              <h3 className="font-medium text-yellow-500 mb-1">
                Boost Information
              </h3>
              <p className="text-sm text-gray-300 mb-2">
                Boosting your pitch increases its visibility on the platform.
              </p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li>
                  Your pitch is visible in normal searches within its registered
                  location
                </li>
                <li>
                  Boost your pitch for broader visibility beyond the local area
                </li>
                <li>Higher boost tiers provide greater reach and duration</li>
                <li>
                  Boosted pitches appear higher in search results and
                  recommended lists
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
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

              {/* Add search bar for pitch owners */}
              <div className="bg-dark-lighter rounded-lg p-4 mb-6">
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
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
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your pitches by name or location"
                    className="w-full bg-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
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
                        onClick={() => handleSelectPitch(pitch, false)}
                      >
                        <div className="p-4">
                          <h3 className="font-bold text-lg text-white">
                            {pitch.name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {pitch.location}
                          </p>
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

                  <p className="text-gray-300 mb-6">
                    {selectedPitch.description}
                  </p>

                  {/* Tabs for pitch owner */}
                  {isPitchOwner &&
                    (currentUser?.ownedPitches?.includes(selectedPitch.id) ||
                      selectedPitch.ownerId === currentUser?.id) && (
                      <div className="mb-6">
                        <div className="flex border-b border-gray-700 mb-6">
                          <button
                            className={`px-4 py-2 text-sm font-medium ${
                              activeTab === "details"
                                ? "border-b-2 border-primary text-primary"
                                : "text-gray-400 hover:text-white"
                            }`}
                            onClick={() => setActiveTab("details")}
                          >
                            Pitch Details
                          </button>
                          <button
                            className={`px-4 py-2 text-sm font-medium ${
                              activeTab === "boost"
                                ? "border-b-2 border-primary text-primary"
                                : "text-gray-400 hover:text-white"
                            }`}
                            onClick={() => setActiveTab("boost")}
                          >
                            Boost Pitch
                          </button>
                        </div>
                      </div>
                    )}

                  {/* Tab content */}
                  {activeTab === "boost" && isPitchOwner ? (
                    renderBoostSection()
                  ) : (
                    <>
                      {/* Location map view */}
                      {selectedPitch.coordinates && (
                        <div className="mb-6">
                          <h3 className="font-semibold mb-3 text-gray-300">
                            Location
                          </h3>
                          <div className="bg-dark rounded-lg overflow-hidden">
                            <LocationPicker
                              coordinates={selectedPitch.coordinates}
                              onLocationSelected={() => {}}
                              readOnly={true}
                            />
                          </div>
                          <div className="mt-2 text-sm text-gray-400 flex items-center">
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
                            {selectedPitch.address}, {selectedPitch.city},{" "}
                            {selectedPitch.state}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"></div>

                      {/* Payment Tracking for pitch owners */}
                      {isPitchOwner && renderPaymentTrackingSection()}

                      {/* Edit button for pitch owners */}
                      {isPitchOwner &&
                        currentUser &&
                        (currentUser.id === selectedPitch.ownerId ||
                          currentUser.ownedPitches?.includes(
                            selectedPitch.id
                          )) && (
                          <div className="mt-6 flex gap-3">
                            <button
                              onClick={handleEditPitch}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              Edit Pitch
                            </button>

                            <button
                              onClick={() => handleJoinPitch(selectedPitch.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                              Play at This Pitch
                            </button>
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}

              {/* Add pitch form - displayed when isEditing is true */}
              {isEditing && (
                <div className="bg-dark-lighter rounded-lg p-4 sm:p-6 mb-8">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold mb-1">
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

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Pitch Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name || ""}
                          onChange={handleChange}
                          className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                          placeholder="Enter your pitch name"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Location*
                          </label>
                          <input
                            type="text"
                            name="location"
                            value={formData.location || ""}
                            onChange={handleChange}
                            className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                            placeholder="Neighborhood/Area"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address || ""}
                            onChange={handleChange}
                            className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                            placeholder="Street Address"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            City*
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city || ""}
                            onChange={handleChange}
                            className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                            placeholder="City"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state || ""}
                            onChange={handleChange}
                            className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                            placeholder="State"
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
                            className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                            readOnly
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
                          className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                          placeholder="Tell us about your pitch..."
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Price per Person (₦)
                        </label>
                        <input
                          type="number"
                          name="pricePerPerson"
                          value={formData.pricePerPerson || 2000}
                          onChange={handleChange}
                          min="500"
                          className="w-full bg-dark border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                          placeholder="e.g. 2000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This is the amount each player will pay to play at
                          your pitch
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Location Picker
                        </label>
                        <LocationPicker
                          coordinates={formData.coordinates}
                          onLocationSelected={handleLocationSelected}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Click "Use My Location" or click on the map to set
                          your pitch's location
                        </p>
                      </div>

                      <div>
                        <h3 className="text-md font-medium text-gray-300 mb-2">
                          Pitch Settings
                        </h3>
                        <div className="bg-dark rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Match Duration (seconds)
                              </label>
                              <input
                                type="number"
                                name="matchDuration"
                                value={
                                  formData.customSettings?.matchDuration || 900
                                }
                                onChange={handleSettingsChange}
                                min="300"
                                max="3600"
                                className="w-full bg-dark-light border border-gray-700 rounded-md px-3 py-2 text-white"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {Math.floor(
                                  (formData.customSettings?.matchDuration ||
                                    900) / 60
                                )}{" "}
                                minutes
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Max Goals
                              </label>
                              <input
                                type="number"
                                name="maxGoals"
                                value={formData.customSettings?.maxGoals || 7}
                                onChange={handleSettingsChange}
                                min="1"
                                max="99"
                                className="w-full bg-dark-light border border-gray-700 rounded-md px-3 py-2 text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Players Per Team
                              </label>
                              <select
                                name="maxPlayersPerTeam"
                                value={
                                  formData.customSettings?.maxPlayersPerTeam ||
                                  5
                                }
                                onChange={handleSettingsChange}
                                className="w-full bg-dark-light border border-gray-700 rounded-md px-3 py-2 text-white"
                              >
                                <option value="3">3-a-side</option>
                                <option value="4">4-a-side</option>
                                <option value="5">5-a-side</option>
                              </select>
                            </div>

                            <div className="flex items-center h-full pt-6">
                              <input
                                type="checkbox"
                                id="allowDraws"
                                name="allowDraws"
                                checked={
                                  formData.customSettings?.allowDraws || false
                                }
                                onChange={handleSettingsChange}
                                className="h-4 w-4 text-green-500 rounded border-gray-700 focus:ring-green-500 bg-dark-light"
                              />
                              <label
                                htmlFor="allowDraws"
                                className="ml-2 text-sm text-gray-300"
                              >
                                Allow Draws (or require winner)
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-md font-medium text-gray-300 mb-2">
                          Referees
                        </h3>
                        <div className="bg-dark rounded-lg p-4">
                          <div className="mb-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-1">
                                <input
                                  type="text"
                                  value={refereeName}
                                  onChange={(e) =>
                                    setRefereeName(e.target.value)
                                  }
                                  className="w-full bg-dark-light border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                                  placeholder="Name"
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="email"
                                  value={refereeEmail}
                                  onChange={(e) =>
                                    setRefereeEmail(e.target.value)
                                  }
                                  className="w-full bg-dark-light border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500"
                                  placeholder="Email"
                                />
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={handleAddReferee}
                                  disabled={
                                    !refereeEmail ||
                                    !refereeName ||
                                    addingReferee
                                  }
                                  className={`w-full rounded-md px-3 py-2 text-white ${
                                    !refereeEmail ||
                                    !refereeName ||
                                    addingReferee
                                      ? "bg-gray-700 cursor-not-allowed"
                                      : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  {addingReferee ? (
                                    <span className="flex items-center justify-center">
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
                                      Adding...
                                    </span>
                                  ) : (
                                    "Add Referee"
                                  )}
                                </button>
                              </div>
                            </div>
                            {refereeError && (
                              <p className="text-yellow-500 text-xs mt-1">
                                {refereeError}
                              </p>
                            )}
                          </div>

                          {formReferees.length > 0 ? (
                            <ul className="divide-y divide-gray-700">
                              {formReferees.map((referee) => (
                                <li
                                  key={referee.id}
                                  className="py-2 flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-medium text-sm">
                                      {referee.name}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      {referee.email}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveReferee(referee.id)
                                    }
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
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">
                              No referees added yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 bg-dark-light text-white rounded-md hover:bg-dark-light/80"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`px-6 py-2 rounded-md text-white ${
                          submitting
                            ? "bg-green-700 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {submitting ? (
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
                            Saving...
                          </span>
                        ) : selectedPitch ? (
                          "Update Pitch"
                        ) : (
                          "Create Pitch"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Confirmation modal for payment actions */}
              {showConfirmModal && confirmAction && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
                  <div className="bg-dark-lighter rounded-lg p-6 max-w-sm w-full">
                    <h3 className="text-lg font-bold mb-2">Confirm Action</h3>
                    <p className="text-gray-300 mb-4">
                      {confirmAction.type === "payment"
                        ? `Are you sure you want to mark ${
                            confirmAction.playerName
                          } as ${confirmAction.newStatus ? "paid" : "unpaid"}?`
                        : `Are you sure you want to ${
                            confirmAction.newStatus
                              ? "exempt"
                              : "remove exemption for"
                          } ${confirmAction.playerName}?`}
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmAction}
                        className={`px-4 py-2 text-white rounded-md ${
                          confirmAction.type === "payment"
                            ? confirmAction.newStatus
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-yellow-600 hover:bg-yellow-700"
                            : confirmAction.newStatus
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Find pitches section for pitch owners */}
              <div className="mt-12 border-t border-gray-700 pt-10">
                <h2 className="text-2xl font-bold text-purple-500 mb-4">
                  Find Other Pitches to Play At
                </h2>
                <p className="text-gray-400 mb-6">
                  Browse available five-a-side pitches to join as a player
                </p>

                <div className="bg-dark-lighter rounded-lg p-4 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Search
                        </label>
                        <div className="relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
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
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search pitches by name or location"
                            className="w-full bg-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          City
                        </label>
                        <select
                          value={cityFilter}
                          onChange={(e) => setCityFilter(e.target.value)}
                          className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">All Cities</option>
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-2">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">
                        Sort by Distance
                      </span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="distanceSortOwner"
                          checked={distanceSort}
                          onChange={() => setDistanceSort(!distanceSort)}
                          className="checked:bg-purple-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-700 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="distanceSortOwner"
                          className={`block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer ${
                            distanceSort ? "bg-purple-700" : "bg-gray-700"
                          }`}
                        ></label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h2 className="text-xl font-bold">Available Pitches</h2>
                  </div>

                  {getFilteredPitches().length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredPitches()
                        .filter(
                          (pitch) =>
                            !myOwnedPitches.some(
                              (ownedPitch) => ownedPitch.id === pitch.id
                            )
                        )
                        .map((pitch) => {
                          // Calculate distance if we have user coordinates
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
                              className="bg-dark-lighter rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                            >
                              <div className="p-4">
                                <div className="mb-3">
                                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
                                    {pitch.name}
                                  </h3>
                                  <div className="flex items-center text-sm text-gray-400 flex-wrap">
                                    <svg
                                      className="w-4 h-4 mr-1 flex-shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
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
                                    <span className="truncate max-w-[120px] mr-1">
                                      {pitch.location},
                                    </span>
                                    <span className="truncate max-w-[80px]">
                                      {pitch.city}
                                    </span>
                                    {distance !== null && (
                                      <span className="ml-2 text-xs bg-dark-light/40 px-1.5 py-0.5 rounded-full">
                                        {distance.toFixed(1)} km
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-gray-300 text-sm mb-4 line-clamp-2 h-10">
                                  {pitch.description?.substring(0, 100) ||
                                    "A really cool turf for cool players"}
                                  {pitch.description &&
                                  pitch.description.length > 100
                                    ? "..."
                                    : ""}
                                </p>

                                <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 mb-4 gap-y-2">
                                  <div className="flex items-center bg-dark/30 px-2 py-1 rounded-full">
                                    <svg
                                      className="w-3 h-3 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    {Math.floor(
                                      (pitch.customSettings?.matchDuration ||
                                        900) / 60
                                    )}{" "}
                                    min
                                  </div>
                                  <div className="flex items-center bg-dark/30 px-2 py-1 rounded-full">
                                    <svg
                                      className="w-3 h-3 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                      />
                                    </svg>
                                    {pitch.customSettings?.maxPlayersPerTeam ||
                                      5}
                                    -a-side
                                  </div>
                                  <div className="bg-dark/30 px-2 py-1 rounded-full">
                                    Open today
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                  <div className="text-purple-500 font-medium text-base">
                                    ₦
                                    {pitch.pricePerPerson?.toLocaleString() ||
                                      "Free"}
                                    <span className="text-xs">/person</span>
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                      onClick={() =>
                                        handleSelectPitch(pitch, true)
                                      }
                                      className="px-3 py-1.5 bg-dark text-gray-300 rounded hover:bg-dark-light flex-1 sm:flex-none text-center"
                                    >
                                      View Details
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleJoinPitch(pitch.id);
                                      }}
                                      className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 flex-1 sm:flex-none text-center"
                                    >
                                      Play Here
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="bg-dark-light/20 rounded-lg p-8 text-center">
                      <h2 className="text-xl font-bold text-white mb-2">
                        No Pitches Found
                      </h2>
                      <p className="text-gray-400 mb-4">
                        {searchQuery
                          ? `No pitches match your search for "${searchQuery}"`
                          : "No pitches are available in this location"}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setCityFilter("");
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-purple-500 mb-2">
                  Find Pitches to Play Today
                </h1>
                <p className="text-gray-400 mb-6">
                  Browse available five-a-side pitches and join a team or create
                  your own
                </p>

                <div className="bg-dark-lighter rounded-lg p-4 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Search
                        </label>
                        <div className="relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
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
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search pitches by name or location"
                            className="w-full bg-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          City
                        </label>
                        <select
                          value={cityFilter}
                          onChange={(e) => setCityFilter(e.target.value)}
                          className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">All Cities</option>
                          {cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-2">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">
                        Sort by Distance
                      </span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="distanceSort"
                          checked={distanceSort}
                          onChange={() => setDistanceSort(!distanceSort)}
                          className="checked:bg-purple-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-700 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="distanceSort"
                          className={`block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer ${
                            distanceSort ? "bg-purple-700" : "bg-gray-700"
                          }`}
                        ></label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <svg
                      className="w-5 h-5 text-purple-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h2 className="text-xl font-bold">Pitches Near You</h2>
                  </div>

                  {getFilteredPitches().length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredPitches().map((pitch) => {
                        // Calculate distance if we have user coordinates
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
                            className="bg-dark-lighter rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                          >
                            <div className="p-4">
                              <div className="mb-3">
                                <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
                                  {pitch.name}
                                </h3>
                                <div className="flex items-center text-sm text-gray-400 flex-wrap">
                                  <svg
                                    className="w-4 h-4 mr-1 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
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
                                  <span className="truncate max-w-[120px] mr-1">
                                    {pitch.location},
                                  </span>
                                  <span className="truncate max-w-[80px]">
                                    {pitch.city}
                                  </span>
                                  {distance !== null && (
                                    <span className="ml-2 text-xs bg-dark-light/40 px-1.5 py-0.5 rounded-full">
                                      {distance.toFixed(1)} km
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-gray-300 text-sm mb-4 line-clamp-2 h-10">
                                {pitch.description?.substring(0, 100) ||
                                  "A really cool turf for cool players"}
                                {pitch.description &&
                                pitch.description.length > 100
                                  ? "..."
                                  : ""}
                              </p>

                              <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 mb-4 gap-y-2">
                                <div className="flex items-center bg-dark/30 px-2 py-1 rounded-full">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {Math.floor(
                                    (pitch.customSettings?.matchDuration ||
                                      900) / 60
                                  )}{" "}
                                  min
                                </div>
                                <div className="flex items-center bg-dark/30 px-2 py-1 rounded-full">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                  {pitch.customSettings?.maxPlayersPerTeam || 5}
                                  -a-side
                                </div>
                                <div className="bg-dark/30 px-2 py-1 rounded-full">
                                  Open today
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="text-purple-500 font-medium text-base">
                                  ₦
                                  {pitch.pricePerPerson?.toLocaleString() ||
                                    "Free"}
                                  <span className="text-xs">/person</span>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <button
                                    onClick={() =>
                                      handleSelectPitch(pitch, true)
                                    }
                                    className="px-3 py-1.5 bg-dark text-gray-300 rounded hover:bg-dark-light flex-1 sm:flex-none text-center"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinPitch(pitch.id);
                                    }}
                                    className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 flex-1 sm:flex-none text-center"
                                  >
                                    Play Here
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-dark-light/20 rounded-lg p-8 text-center">
                      <h2 className="text-xl font-bold text-white mb-2">
                        No Pitches Found
                      </h2>
                      <p className="text-gray-400 mb-4">
                        {searchQuery
                          ? `No pitches match your search for "${searchQuery}"`
                          : "No pitches are available in this location"}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setCityFilter("");
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
      {showDetailsModal && modalPitch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-lighter rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {modalPitch.name}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
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

              <div className="mb-6">
                <div className="flex items-center text-gray-400 mb-2">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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
                  {modalPitch.location}, {modalPitch.city}, {modalPitch.state}
                </div>
                <p className="text-gray-300">{modalPitch.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-dark rounded-lg p-4">
                  <h3 className="font-medium text-gray-300 mb-3">
                    Pitch Settings
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Match Duration:</span>
                      <span className="text-white">
                        {Math.floor(
                          (modalPitch.customSettings?.matchDuration || 900) / 60
                        )}{" "}
                        minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Goals:</span>
                      <span className="text-white">
                        {modalPitch.customSettings?.maxGoals || 7}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team Size:</span>
                      <span className="text-white">
                        {modalPitch.customSettings?.maxPlayersPerTeam || 5}
                        -a-side
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Allow Draws:</span>
                      <span className="text-white">
                        {modalPitch.customSettings?.allowDraws ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-dark rounded-lg p-4">
                  <h3 className="font-medium text-gray-300 mb-3">
                    Availability
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Days Open:</span>
                      <span className="text-white">
                        {modalPitch.availability.daysOpen
                          .map(
                            (day) => day.charAt(0).toUpperCase() + day.slice(1)
                          )
                          .join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hours:</span>
                      <span className="text-white">
                        {modalPitch.availability.openingTime} -{" "}
                        {modalPitch.availability.closingTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per Person:</span>
                      <span className="text-purple-500 font-medium">
                        ₦{modalPitch.pricePerPerson?.toLocaleString() || "Free"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {modalPitch.coordinates && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-300 mb-3">Location</h3>
                  <div className="bg-dark rounded-lg overflow-hidden h-48">
                    <LocationPicker
                      coordinates={modalPitch.coordinates}
                      onLocationSelected={() => {}}
                      readOnly={true}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-dark text-gray-300 rounded hover:bg-dark-light"
                >
                  Close
                </button>
                {/* Add edit button for pitch owners viewing their own pitch */}
                {isPitchOwner &&
                  currentUser &&
                  (currentUser.id === modalPitch.ownerId ||
                    currentUser.ownedPitches?.includes(modalPitch.id)) && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        // Make sure the pitch is selected in the main view before editing
                        setSelectedPitch(modalPitch);
                        setFormData(modalPitch);
                        handleEditPitch();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Edit Pitch
                    </button>
                  )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleJoinPitch(modalPitch.id);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Play at This Pitch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitchesPage;
