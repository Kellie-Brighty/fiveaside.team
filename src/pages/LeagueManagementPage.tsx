// Phase 5: League Management Page for Ministry/FA Officials
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  createLeague,
  getAllLeagues,
  getLeague,
  updateLeague,
  generateFixtures,
  calculateStandings,
  deleteLeague,
  updateFixtureSchedule,
  disqualifyClubFromLeague,
} from "../services/leagueService";
import { hasPermission } from "../utils/permissions";
import { uploadImageToImgBB } from "../utils/imgUpload";
import LoadingButton from "../components/LoadingButton";
import { getAllClubs } from "../services/clubService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { League, Fixture, Club, Pitch, User } from "../types";

const LeagueManagementPage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId?: string }>();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [recalculatingStandings, setRecalculatingStandings] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCloseRegistrationModal, setShowCloseRegistrationModal] = useState(false);
  const [closingRegistration, setClosingRegistration] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLeague, setDeletingLeague] = useState(false);
  
  // Fixture management state
  const [showFixtureScheduleModal, setShowFixtureScheduleModal] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [schedulingFixture, setSchedulingFixture] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedPitchId, setSelectedPitchId] = useState<string>("");
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>("");
  const [availablePitches, setAvailablePitches] = useState<Pitch[]>([]);
  const [availableReferees, setAvailableReferees] = useState<User[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Club disqualification state
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [clubToDisqualify, setClubToDisqualify] = useState<Club | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [disqualifyingClub, setDisqualifyingClub] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [season, setSeason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [minClubs, setMinClubs] = useState("");
  const [maxClubs, setMaxClubs] = useState("");
  const [requireLegitimateClubs, setRequireLegitimateClubs] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && currentUser && currentState) {
      const canManage = hasPermission(currentUser.role, "manage_leagues");
      if (!canManage) {
        navigate("/");
        return;
      }
      loadLeagues();
    }
  }, [isAuthLoading, currentUser, navigate, currentState?.id]);

  useEffect(() => {
    if (leagueId && currentState) {
      loadLeagueDetails(leagueId);
    }
  }, [leagueId, currentState?.id]);

  const loadLeagues = async () => {
    if (!currentState) return;
    try {
      setLoading(true);
      const allLeagues = await getAllLeagues(currentState.id, {
        organizerId: currentUser?.id,
      });
      setLeagues(allLeagues);
    } catch (error) {
      console.error("Error loading leagues:", error);
      window.toast?.error("Failed to load leagues");
    } finally {
      setLoading(false);
    }
  };

  const loadLeagueDetails = async (id: string) => {
    if (!currentState) return;
    try {
      setLoading(true);
      const league = await getLeague(id, currentState.id);
      if (league) {
        setSelectedLeague(league);
        
        // Load clubs for the league
        if (league.divisions) {
          const allClubIds = league.divisions.flatMap((div) => div.clubIds);
          try {
            const allClubs = await getAllClubs(currentState.id);
            const loadedClubs = allClubs.filter((c) => allClubIds.includes(c.id));
            setClubs(loadedClubs);
          } catch (error) {
            console.error("Error loading clubs:", error);
          }
        }
        
        // Load pitches
        try {
          const pitchesQuery = query(collection(db, "pitches"));
          const pitchesSnapshot = await getDocs(pitchesQuery);
          const loadedPitches: Pitch[] = [];
          pitchesSnapshot.forEach((doc) => {
            const pitchData = doc.data();
            loadedPitches.push({
              id: doc.id,
              ...pitchData,
              createdAt: pitchData.createdAt?.toDate() || new Date(),
            } as Pitch);
          });
          setAvailablePitches(loadedPitches);
        } catch (error) {
          console.error("Error loading pitches:", error);
        }
        setName(league.name);
        setDescription(league.description || "");
        setSeason(league.season);
        setStartDate(formatDateForInput(league.startDate));
        setEndDate(formatDateForInput(league.endDate));
        setRegistrationDeadline(formatDateForInput(league.registrationDeadline));
        setMinClubs(league.minClubs?.toString() || "");
        setMaxClubs(league.maxClubs?.toString() || "");
        setRequireLegitimateClubs(league.requireLegitimateClubs);
        setExistingImage(league.image || null);
        setImagePreview(league.image || null);
      }
    } catch (error) {
      console.error("Error loading league details:", error);
      window.toast?.error("Failed to load league details");
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: Date): string => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split("T")[0];
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        window.toast?.error("Image size should be less than 5MB");
        return;
      }

      setImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentState) {
      if (!currentState) {
        window.toast?.error("State not available");
      }
      return;
    }

    if (!name.trim()) {
      window.toast?.error("League name is required");
      return;
    }

    if (!season.trim()) {
      window.toast?.error("Season is required");
      return;
    }

    if (!startDate || !endDate || !registrationDeadline) {
      window.toast?.error("All dates are required");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      window.toast?.error("End date must be after start date");
      return;
    }

    if (new Date(registrationDeadline) >= new Date(startDate)) {
      window.toast?.error("Registration deadline must be before league start date");
      return;
    }

    try {
      setSubmitting(true);

      let imageUrl: string | undefined;

      // Upload image if provided
      if (image) {
        setIsUploadingImage(true);
        try {
          imageUrl = await uploadImageToImgBB(image);
          window.toast?.success("League image uploaded successfully!");
        } catch (error) {
          console.error("Error uploading image:", error);
          window.toast?.error("Failed to upload image. Please try again.");
          setIsUploadingImage(false);
          setSubmitting(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const leagueData: Omit<
        League,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "fixtures"
        | "standings"
        | "divisions"
        | "pointsSystem"
      > = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: imageUrl,
        organizerId: currentUser.id,
        organizerType:
          currentUser.role === "ministry_official"
            ? "ministry"
            : currentUser.role === "fa_official"
            ? "fa"
            : "admin",
        season: season.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "draft",
        registrationClosed: false,
        registrationDeadline: new Date(registrationDeadline),
        minClubs: minClubs ? parseInt(minClubs) : undefined,
        maxClubs: maxClubs ? parseInt(maxClubs) : undefined,
        requireLegitimateClubs,
      };

      const newLeague = await createLeague(leagueData, currentState.id);
      window.toast?.success("League created successfully!");
      setShowCreateForm(false);
      resetForm();
      await loadLeagues();
      navigate(`/leagues/${newLeague.id}/manage`);
    } catch (error: any) {
      console.error("Error creating league:", error);
      window.toast?.error(error.message || "Failed to create league");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!selectedLeague || !currentUser || !currentState) return;

    if (!name.trim()) {
      window.toast?.error("League name is required");
      return;
    }

    if (!season.trim()) {
      window.toast?.error("Season is required");
      return;
    }

    if (!startDate || !endDate || !registrationDeadline) {
      window.toast?.error("All dates are required");
      return;
    }

    try {
      setSubmitting(true);

      let imageUrl: string | undefined = existingImage || undefined;

      // Upload new image if provided
      if (image) {
        setIsUploadingImage(true);
        try {
          imageUrl = await uploadImageToImgBB(image);
          window.toast?.success("League image uploaded successfully!");
        } catch (error) {
          console.error("Error uploading image:", error);
          window.toast?.error("Failed to upload image. Please try again.");
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      await updateLeague(selectedLeague.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        image: imageUrl,
        season: season.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: new Date(registrationDeadline),
        minClubs: minClubs ? parseInt(minClubs) : undefined,
        maxClubs: maxClubs ? parseInt(maxClubs) : undefined,
        requireLegitimateClubs,
      }, currentState.id);

      window.toast?.success("League updated successfully!");
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error updating league:", error);
      window.toast?.error(error.message || "Failed to update league");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: League["status"]) => {
    if (!selectedLeague || !currentState) return;

    try {
      setSubmitting(true);
      await updateLeague(selectedLeague.id, { status }, currentState.id);
      window.toast?.success(`League status updated to ${status}`);
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error updating league status:", error);
      window.toast?.error(error.message || "Failed to update league status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!selectedLeague || !currentState) return;

    try {
      setClosingRegistration(true);
      await updateLeague(selectedLeague.id, {
        registrationClosed: true,
        status: "registration_closed",
      }, currentState.id);
      window.toast?.success("Registration closed successfully!");
      setShowCloseRegistrationModal(false);
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error closing registration:", error);
      window.toast?.error(error.message || "Failed to close registration");
    } finally {
      setClosingRegistration(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!selectedLeague || !currentState) return;

    try {
      setGeneratingFixtures(true);
      await generateFixtures(selectedLeague.id, currentState.id);
      window.toast?.success("Fixtures generated successfully!");
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error generating fixtures:", error);
      window.toast?.error(error.message || "Failed to generate fixtures");
    } finally {
      setGeneratingFixtures(false);
    }
  };

  const handleRecalculateStandings = async () => {
    if (!selectedLeague || !currentState) return;

    try {
      setRecalculatingStandings(true);
      await calculateStandings(selectedLeague.id, currentState.id);
      window.toast?.success("Standings recalculated successfully!");
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error recalculating standings:", error);
      window.toast?.error(error.message || "Failed to recalculate standings");
    } finally {
      setRecalculatingStandings(false);
    }
  };

  const handleDeleteLeague = async () => {
    if (!selectedLeague || !currentState) return;

    try {
      setDeletingLeague(true);
      await deleteLeague(selectedLeague.id, currentState.id);
      window.toast?.success("League deleted successfully!");
      setShowDeleteModal(false);
      setSelectedLeague(null);
      await loadLeagues();
      navigate("/leagues/manage");
    } catch (error: any) {
      console.error("Error deleting league:", error);
      window.toast?.error(error.message || "Failed to delete league");
    } finally {
      setDeletingLeague(false);
    }
  };

  const handleOpenFixtureSchedule = async (fixture: Fixture) => {
    setSelectedFixture(fixture);
    setScheduleDate(
      fixture.scheduledDate instanceof Date
        ? fixture.scheduledDate.toISOString().split("T")[0]
        : new Date(fixture.scheduledDate).toISOString().split("T")[0]
    );
    setScheduleTime(fixture.scheduledTime || "");
    setSelectedPitchId(fixture.pitchId || "");
    setSelectedRefereeId(fixture.refereeId || "");
    setShowFixtureScheduleModal(true);
    
    // Load referees
    try {
      setLoadingReferees(true);
      const refereesQuery = query(
        collection(db, "users"),
        where("role", "==", "referee")
      );
      const refereesSnapshot = await getDocs(refereesQuery);
      const loadedReferees: User[] = [];
      refereesSnapshot.forEach((doc) => {
        loadedReferees.push({
          id: doc.id,
          ...doc.data(),
        } as User);
      });
      setAvailableReferees(loadedReferees);
    } catch (error) {
      console.error("Error loading referees:", error);
    } finally {
      setLoadingReferees(false);
    }
  };

  const handleScheduleFixture = async () => {
    if (!selectedLeague || !selectedFixture || !currentState) return;

    try {
      setSchedulingFixture(true);
      await updateFixtureSchedule(selectedLeague.id, selectedFixture.id, {
        scheduledDate: scheduleDate ? new Date(scheduleDate) : undefined,
        scheduledTime: scheduleTime || undefined,
        pitchId: selectedPitchId || undefined,
        refereeId: selectedRefereeId || undefined,
      }, currentState.id);
      window.toast?.success("Fixture scheduled successfully!");
      setShowFixtureScheduleModal(false);
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error scheduling fixture:", error);
      window.toast?.error(error.message || "Failed to schedule fixture");
    } finally {
      setSchedulingFixture(false);
    }
  };

  const handleOpenDisqualifyClub = (club: Club) => {
    setClubToDisqualify(club);
    setDisqualifyReason("");
    setShowDisqualifyModal(true);
  };

  const handleDisqualifyClub = async () => {
    if (!selectedLeague || !clubToDisqualify || !currentState) return;

    try {
      setDisqualifyingClub(true);
      await disqualifyClubFromLeague(
        selectedLeague.id,
        clubToDisqualify.id,
        currentState.id
      );
      window.toast?.success("Club disqualified successfully!");
      setShowDisqualifyModal(false);
      setClubToDisqualify(null);
      await loadLeagueDetails(selectedLeague.id);
    } catch (error: any) {
      console.error("Error disqualifying club:", error);
      window.toast?.error(error.message || "Failed to disqualify club");
    } finally {
      setDisqualifyingClub(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSeason("");
    setStartDate("");
    setEndDate("");
    setRegistrationDeadline("");
    setMinClubs("");
    setMaxClubs("");
    setRequireLegitimateClubs(true);
    setImage(null);
    setImagePreview(null);
    setExistingImage(null);
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const canManage = hasPermission(currentUser.role, "manage_leagues");
  if (!canManage) {
    return null;
  }

  if (leagueId && selectedLeague) {
    // Edit existing league
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <button
                onClick={() => navigate("/leagues/manage")}
                className="text-gray-400 hover:text-white mb-2 text-sm"
              >
                ← Back to Leagues
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Manage League
              </h1>
            </div>
          </div>

          {/* League Status */}
          <div className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden mb-6">
            {selectedLeague.image && (
              <div className="w-full h-48 sm:h-64 overflow-hidden">
                <img
                  src={selectedLeague.image}
                  alt={selectedLeague.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedLeague.name}</h2>
                  <p className="text-gray-400 text-sm">
                    Season: {selectedLeague.season} | Status:{" "}
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        selectedLeague.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : selectedLeague.status === "registration"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : selectedLeague.status === "registration_closed"
                          ? "bg-orange-500/20 text-orange-400"
                          : selectedLeague.status === "completed"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {selectedLeague.status === "registration_closed"
                        ? "Registration Closed"
                        : selectedLeague.status}
                    </span>
                  </p>
                  </div>
                <div className="flex gap-2">
                  {selectedLeague.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange("registration")}
                      disabled={submitting}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Open Registration
                    </button>
                  )}
                  {selectedLeague.status === "registration" && !selectedLeague.registrationClosed && (
                    <button
                      onClick={() => setShowCloseRegistrationModal(true)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm"
                    >
                      Close Registration
                    </button>
                  )}
                  {selectedLeague.status === "registration_closed" && (
                    <button
                      onClick={handleGenerateFixtures}
                      disabled={generatingFixtures || selectedLeague.divisions?.flatMap((d) => d.clubIds).length === 0}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      {generatingFixtures ? "Generating..." : "Generate Fixtures"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    Delete League
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* League Details Form */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">League Details</h2>
            <form onSubmit={handleUpdateLeague} className="space-y-4">
              {/* League Image */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  League Image
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="league-image-input"
                    />
                    <label
                      htmlFor="league-image-input"
                      className="block w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white cursor-pointer hover:bg-dark-light transition-colors text-center text-sm"
                    >
                      {isUploadingImage ? "Uploading..." : image ? "Change Image" : "Upload Image"}
                    </label>
                  </div>
                  {(imagePreview || existingImage) && (
                    <div className="flex-shrink-0">
                      <img
                        src={imagePreview || existingImage || ""}
                        alt="League preview"
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover border border-gray-700"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, max 5MB
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    League Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Season *
                  </label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="e.g., 2024/2025"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Registration Deadline *
                  </label>
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Minimum Clubs
                  </label>
                  <input
                    type="number"
                    value={minClubs}
                    onChange={(e) => setMinClubs(e.target.value)}
                    min="2"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Maximum Clubs
                  </label>
                  <input
                    type="number"
                    value={maxClubs}
                    onChange={(e) => setMaxClubs(e.target.value)}
                    min="2"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireLegitimate"
                  checked={requireLegitimateClubs}
                  onChange={(e) => setRequireLegitimateClubs(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-dark text-primary focus:ring-primary"
                />
                <label htmlFor="requireLegitimate" className="text-sm text-gray-300">
                  Require legitimate clubs only
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <LoadingButton
                  onClick={handleUpdateLeague}
                  isLoading={submitting}
                  variant="primary"
                  className="flex-1"
                >
                  Update League
                </LoadingButton>
              </div>
            </form>
          </div>

          {/* League Statistics */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-white">Statistics</h2>
              <button
                onClick={handleRecalculateStandings}
                disabled={recalculatingStandings}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {recalculatingStandings ? "Recalculating..." : "Recalculate Standings"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-dark p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Registered Clubs</p>
                <p className="text-2xl font-bold text-white">
                  {selectedLeague.divisions?.reduce((sum, div) => sum + div.clubIds.length, 0) || 0}
                </p>
              </div>
              <div className="bg-dark p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Total Fixtures</p>
                <p className="text-2xl font-bold text-white">{selectedLeague.fixtures.length}</p>
              </div>
              <div className="bg-dark p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {selectedLeague.fixtures.filter((f) => f.status === "completed").length}
                </p>
              </div>
              <div className="bg-dark p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Standings</p>
                <p className="text-2xl font-bold text-white">
                  {selectedLeague.standings?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Fixtures Management */}
          {selectedLeague.fixtures.length > 0 && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-white">Fixtures</h2>
                <button
                  onClick={() => navigate(`/leagues/${selectedLeague.id}`)}
                  className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm"
                >
                  View Public Page
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Round</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Home</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Away</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Date/Time</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Pitch</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Referee</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Result</th>
                      <th className="text-left py-3 px-2 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLeague.fixtures.map((fixture) => {
                      const homeClub = clubs.find((c) => c.id === fixture.teamAId);
                      const awayClub = clubs.find((c) => c.id === fixture.teamBId);
                      const pitch = availablePitches.find((p) => p.id === fixture.pitchId);
                      const referee = availableReferees.find((r) => r.id === fixture.refereeId);
                      
                      return (
                        <tr key={fixture.id} className="border-b border-gray-700/50 hover:bg-dark transition-colors">
                          <td className="py-3 px-2 text-white">{fixture.round}</td>
                          <td className="py-3 px-2 text-white">{homeClub?.name || fixture.teamAId}</td>
                          <td className="py-3 px-2 text-white">{awayClub?.name || fixture.teamBId}</td>
                          <td className="py-3 px-2 text-gray-300">
                            {fixture.scheduledDate ? (
                              <>
                                {fixture.scheduledDate instanceof Date
                                  ? fixture.scheduledDate.toLocaleDateString()
                                  : new Date(fixture.scheduledDate).toLocaleDateString()}
                                {fixture.scheduledTime && ` ${fixture.scheduledTime}`}
                              </>
                            ) : (
                              <span className="text-gray-500">Not scheduled</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-gray-300">{pitch?.name || "-"}</td>
                          <td className="py-3 px-2 text-gray-300">{referee?.name || "-"}</td>
                          <td className="py-3 px-2">
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
                          </td>
                          <td className="py-3 px-2 text-gray-300">
                            {fixture.result
                              ? `${fixture.result.scoreA} - ${fixture.result.scoreB}`
                              : "-"}
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleOpenFixtureSchedule(fixture)}
                              className="px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded text-xs"
                            >
                              Schedule
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Registered Clubs with Disqualify Option */}
          {selectedLeague.divisions && selectedLeague.divisions.length > 0 && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Registered Clubs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clubs.map((club) => (
                  <div
                    key={club.id}
                    className="bg-dark p-4 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">{club.name}</h3>
                      <button
                        onClick={() => handleOpenDisqualifyClub(club)}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                      >
                        Disqualify
                      </button>
                    </div>
                    {club.location && (
                      <p className="text-gray-400 text-xs">
                        {club.location.city}, {club.location.state}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => navigate(`/leagues/${selectedLeague.id}`)}
              className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm"
            >
              View Public Page
            </button>
          </div>

          {/* Close Registration Modal */}
          {showCloseRegistrationModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Close Registration</h2>
                  <button
                    onClick={() => setShowCloseRegistrationModal(false)}
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
                  <div>
                    <p className="text-gray-300 text-sm sm:text-base mb-3">
                      Are you sure you want to close registration for{" "}
                      <span className="font-semibold text-white">{selectedLeague?.name}</span>?
                    </p>
                    <div className="bg-dark p-3 sm:p-4 rounded-lg border border-gray-700 space-y-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2">
                        Important Information:
                      </p>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300 list-disc list-inside">
                        <li>
                          Registration will be permanently closed and no new clubs can join
                        </li>
                        <li>
                          Fixtures will need to be generated manually after closing registration
                        </li>
                        <li>
                          Currently {selectedLeague?.divisions?.reduce((sum, div) => sum + div.clubIds.length, 0) || 0} club(s) registered
                        </li>
                        {selectedLeague && new Date() < selectedLeague.startDate && (
                          <li className="text-yellow-400">
                            League start date: {selectedLeague.startDate.toLocaleDateString()}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowCloseRegistrationModal(false)}
                      className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      onClick={handleCloseRegistration}
                      isLoading={closingRegistration}
                      variant="primary"
                      className="flex-1"
                    >
                      Close Registration
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete League Modal */}
          {showDeleteModal && selectedLeague && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Delete League</h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
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
                  <div>
                    <p className="text-gray-300 text-sm sm:text-base mb-3">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-white">{selectedLeague.name}</span>?
                    </p>
                    <div className="bg-red-500/10 border border-red-500/30 p-3 sm:p-4 rounded-lg space-y-2">
                      <p className="text-red-400 text-xs sm:text-sm font-medium mb-2">
                        Warning: This action cannot be undone!
                      </p>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300 list-disc list-inside">
                        <li>All league data will be permanently deleted</li>
                        <li>All fixtures and standings will be removed</li>
                        <li>Club registrations will be lost</li>
                        <li>
                          Currently {selectedLeague.divisions?.reduce((sum, div) => sum + div.clubIds.length, 0) || 0} club(s) registered
                        </li>
                        {selectedLeague.fixtures && selectedLeague.fixtures.length > 0 && (
                          <li>
                            {selectedLeague.fixtures.length} fixture(s) will be deleted
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      onClick={handleDeleteLeague}
                      isLoading={deletingLeague}
                      variant="primary"
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Delete League
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fixture Schedule Modal */}
          {showFixtureScheduleModal && selectedFixture && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Schedule Fixture</h2>
                  <button
                    onClick={() => setShowFixtureScheduleModal(false)}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Pitch
                    </label>
                    <select
                      value={selectedPitchId}
                      onChange={(e) => setSelectedPitchId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Select a pitch</option>
                      {availablePitches.map((pitch) => (
                        <option key={pitch.id} value={pitch.id}>
                          {pitch.name} - {pitch.city}, {pitch.state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Referee
                    </label>
                    {loadingReferees ? (
                      <div className="text-gray-400 text-sm">Loading referees...</div>
                    ) : (
                      <select
                        value={selectedRefereeId}
                        onChange={(e) => setSelectedRefereeId(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                      >
                        <option value="">Select a referee</option>
                        {availableReferees.map((referee) => (
                          <option key={referee.id} value={referee.id}>
                            {referee.name} ({referee.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowFixtureScheduleModal(false)}
                      className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      onClick={handleScheduleFixture}
                      isLoading={schedulingFixture}
                      variant="primary"
                      className="flex-1"
                    >
                      Save Schedule
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disqualify Club Modal */}
          {showDisqualifyModal && clubToDisqualify && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Disqualify Club</h2>
                  <button
                    onClick={() => setShowDisqualifyModal(false)}
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
                  <div>
                    <p className="text-gray-300 text-sm sm:text-base mb-3">
                      Are you sure you want to disqualify{" "}
                      <span className="font-semibold text-white">{clubToDisqualify.name}</span> from{" "}
                      <span className="font-semibold text-white">{selectedLeague?.name}</span>?
                    </p>
                    <div className="bg-red-500/10 border border-red-500/30 p-3 sm:p-4 rounded-lg space-y-2">
                      <p className="text-red-400 text-xs sm:text-sm font-medium mb-2">
                        Warning: This action cannot be undone!
                      </p>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300 list-disc list-inside">
                        <li>Club will be removed from the league</li>
                        <li>All fixtures involving this club will be cancelled</li>
                        <li>Club will be removed from standings</li>
                        <li>Club's currentLeagueId will be cleared</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={disqualifyReason}
                      onChange={(e) => setDisqualifyReason(e.target.value)}
                      placeholder="Enter reason for disqualification..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowDisqualifyModal(false)}
                      className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <LoadingButton
                      onClick={handleDisqualifyClub}
                      isLoading={disqualifyingClub}
                      variant="primary"
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Disqualify Club
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // League list view
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">League Management</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
          >
            Create New League
          </button>
        </div>

        {/* Create League Form */}
        {showCreateForm && (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Create New League</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
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

            <form onSubmit={handleCreateLeague} className="space-y-4">
              {/* League Image */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  League Image
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="league-image-create-input"
                    />
                    <label
                      htmlFor="league-image-create-input"
                      className="block w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white cursor-pointer hover:bg-dark-light transition-colors text-center text-sm"
                    >
                      {isUploadingImage ? "Uploading..." : image ? "Change Image" : "Upload Image"}
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="League preview"
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover border border-gray-700"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, max 5MB
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    League Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Season *
                  </label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="e.g., 2024/2025"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Registration Deadline *
                  </label>
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Minimum Clubs
                  </label>
                  <input
                    type="number"
                    value={minClubs}
                    onChange={(e) => setMinClubs(e.target.value)}
                    min="2"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Maximum Clubs
                  </label>
                  <input
                    type="number"
                    value={maxClubs}
                    onChange={(e) => setMaxClubs(e.target.value)}
                    min="2"
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireLegitimate"
                  checked={requireLegitimateClubs}
                  onChange={(e) => setRequireLegitimateClubs(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-dark text-primary focus:ring-primary"
                />
                <label htmlFor="requireLegitimate" className="text-sm text-gray-300">
                  Require legitimate clubs only
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={submitting}
                  variant="primary"
                  className="flex-1"
                >
                  Create League
                </LoadingButton>
              </div>
            </form>
          </div>
        )}

        {/* Leagues List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No leagues created yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
            >
              Create Your First League
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 hover:bg-dark-light transition-colors cursor-pointer"
                onClick={() => navigate(`/leagues/${league.id}/manage`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{league.name}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
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
                <p className="text-gray-400 text-sm mb-2">Season: {league.season}</p>
                <p className="text-gray-500 text-xs mb-4">
                  {league.divisions?.reduce((sum, div) => sum + div.clubIds.length, 0) || 0} clubs
                  • {league.fixtures.length} fixtures
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/leagues/${league.id}/manage`);
                  }}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueManagementPage;

