// Phase 4.1: Club Management Dashboard (for club managers)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  getClub,
  updateClub,
  recordLegitimacyPayment,
  addPlayerToRoster,
  removePlayerFromRoster,

} from "../services/clubService";
import {
  getTransferRequestsByClub,
  approveTransferRequest,
  rejectTransferRequest,
} from "../services/transferService";
import { uploadImageToImgBB } from "../utils/imgUpload";
import { hasPermission } from "../utils/permissions";
import LegitimacyFeePayment from "../components/LegitimacyFeePayment";
import LoadingButton from "../components/LoadingButton";
import type { Club, TransferRequest, User } from "../types";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const ClubManagementPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Roster management state
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState("");
  const [selectedPlayerPosition, setSelectedPlayerPosition] = useState("");
  const [selectedPlayerJerseyNumber, setSelectedPlayerJerseyNumber] = useState("");

  // Phase 4.3: Transfer requests state
  const [transferRequests, setTransferRequests] = useState<Array<TransferRequest & { player?: User }>>([]);
  const [transferRequestsLoading, setTransferRequestsLoading] = useState(false);
  const [transferRequestFilter, setTransferRequestFilter] = useState<"pending" | "all">("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<(TransferRequest & { player?: User }) | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<string | null>(null);
  const [approvalPosition, setApprovalPosition] = useState("");
  const [approvalJerseyNumber, setApprovalJerseyNumber] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const loadClub = async () => {
      if (!clubId || !currentUser || !currentState) return;

      try {
        setLoading(true);
        setError(null);

        const clubData = await getClub(clubId, currentState.id);

        if (!clubData) {
          setError("Club not found");
          setLoading(false);
          return;
        }

        // Check if user is the manager
        if (clubData.managerId !== currentUser.id && !hasPermission(currentUser.role, "manage_clubs")) {
          setError("You don't have permission to manage this club");
          setLoading(false);
          return;
        }

        setClub(clubData);
        setName(clubData.name);
        setShortName(clubData.shortName || "");
        setDescription(clubData.description || "");
        setContactEmail(clubData.contactEmail || "");
        setContactPhone(clubData.contactPhone || "");
        setWebsite(clubData.website || "");
        setLogoPreview(clubData.logo || null);

        // Phase 4.3: Load transfer requests
        await loadTransferRequests(clubId);
      } catch (error) {
        console.error("Error loading club:", error);
        setError("Failed to load club. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading && currentUser) {
      loadClub();
    }
  }, [clubId, currentUser, isAuthLoading, currentState?.id]);

  // Phase 4.3: Load transfer requests
  const loadTransferRequests = async (clubId: string) => {
    if (!currentState) return;
    try {
      setTransferRequestsLoading(true);
      const requests = await getTransferRequestsByClub(
        clubId,
        currentState.id,
        transferRequestFilter === "pending" ? "pending" : undefined
      );
      
      // Load player data for each request
      const requestsWithPlayers: Array<TransferRequest & { player?: User }> = await Promise.all(
        requests.map(async (request) => {
          try {
            const playerDoc = await getDoc(doc(db, "users", request.playerId));
            if (playerDoc.exists()) {
              return {
                ...request,
                player: {
                  id: playerDoc.id,
                  ...playerDoc.data(),
                } as User,
              };
            }
            return request;
          } catch (error) {
            console.error("Error loading player:", error);
            return request;
          }
        })
      );
      
      setTransferRequests(requestsWithPlayers);
    } catch (error) {
      console.error("Error loading transfer requests:", error);
    } finally {
      setTransferRequestsLoading(false);
    }
  };

  // Reload transfer requests when filter changes
  useEffect(() => {
    if (clubId && club) {
      loadTransferRequests(clubId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferRequestFilter, clubId, currentState?.id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        window.toast?.error("Logo size should be less than 5MB");
        return;
      }

      setLogo(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveClubInfo = async () => {
    if (!club || !currentUser || !currentState) return;

    try {
      setIsSaving(true);

      let logoUrl = club.logo;

      if (logo) {
        setIsUploadingLogo(true);
        try {
          logoUrl = await uploadImageToImgBB(logo);
          window.toast?.success("Logo uploaded successfully!");
        } catch (error) {
          console.error("Error uploading logo:", error);
          window.toast?.error("Failed to upload logo. Please try again.");
          setIsUploadingLogo(false);
          return;
        } finally {
          setIsUploadingLogo(false);
        }
      }

      await updateClub(club.id, {
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        description: description.trim() || undefined,
        logo: logoUrl,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
      }, currentState.id);

      // Reload club data
      const updatedClub = await getClub(club.id, currentState.id);
      if (updatedClub) {
        setClub(updatedClub);
      }

      window.toast?.success("Club information updated successfully!");
    } catch (error) {
      console.error("Error saving club info:", error);
      window.toast?.error("Failed to update club. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLegitimacyPaymentSuccess = async (
    reference: string,
    amount: number,
    validUntil: Date
  ) => {
    if (!club || !currentState) return;

    try {
      await recordLegitimacyPayment(club.id, {
        amount,
        transactionRef: reference,
        validUntil,
      }, currentState.id);

      // Reload club data
      const updatedClub = await getClub(club.id, currentState.id);
      if (updatedClub) {
        setClub(updatedClub);
      }

      setShowPaymentModal(false);
      window.toast?.success("Legitimacy fee payment successful!");
    } catch (error) {
      console.error("Error recording payment:", error);
      window.toast?.error("Payment successful but failed to update club status. Please contact support.");
    }
  };

  const handleAddPlayerToRoster = async () => {
    if (!club || !currentState || !selectedPlayerEmail || !selectedPlayerPosition) {
      if (!currentState) {
        window.toast?.error("State not available");
      } else {
        window.toast?.error("Please fill in all required fields");
      }
      return;
    }

    try {
      // Find user by email
      const usersQuery = await getDocs(
        query(collection(db, "users"), where("email", "==", selectedPlayerEmail))
      );

      if (usersQuery.empty) {
        window.toast?.error("Player not found with that email");
        return;
      }

      const userDoc = usersQuery.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() } as User;

      if (userData.role !== "player") {
        window.toast?.error("User is not a player");
        return;
      }

      if (club.playerIds.includes(userData.id)) {
        window.toast?.error("Player is already in the roster");
        return;
      }

      await addPlayerToRoster(club.id, {
        userId: userData.id,
        playerName: userData.name,
        position: selectedPlayerPosition,
        jerseyNumber: selectedPlayerJerseyNumber ? parseInt(selectedPlayerJerseyNumber) : undefined,
      }, currentState.id);

      // Reload club data
      const updatedClub = await getClub(club.id, currentState.id);
      if (updatedClub) {
        setClub(updatedClub);
      }

      setSelectedPlayerEmail("");
      setSelectedPlayerPosition("");
      setSelectedPlayerJerseyNumber("");
      setShowRosterModal(false);
      window.toast?.success("Player added to roster successfully!");
      
      // Reload transfer requests in case any were pending
      await loadTransferRequests(club.id);
    } catch (error) {
      console.error("Error adding player to roster:", error);
      window.toast?.error(
        error instanceof Error ? error.message : "Failed to add player. Please try again."
      );
    }
  };

  const handleRemovePlayer = async (userId: string) => {
    if (!club || !currentState) return;

    if (!confirm("Are you sure you want to remove this player from the roster?")) {
      return;
    }

    try {
      await removePlayerFromRoster(club.id, userId, currentState.id);

      // Reload club data
      const updatedClub = await getClub(club.id, currentState.id);
      if (updatedClub) {
        setClub(updatedClub);
      }

      window.toast?.success("Player removed from roster successfully!");
    } catch (error) {
      console.error("Error removing player:", error);
      window.toast?.error("Failed to remove player. Please try again.");
    }
  };

  // Phase 4.3: Handle approve transfer request
  const handleApproveRequest = async (request: TransferRequest & { player?: User }) => {
    if (!currentUser || !club || !currentState || !request.player) return;

    if (!approvalPosition.trim()) {
      window.toast?.error("Please enter a position");
      return;
    }

    try {
      setApprovingRequest(request.id);
      await approveTransferRequest(request.id, currentUser.id, currentState.id, {
        position: approvalPosition.trim(),
        jerseyNumber: approvalJerseyNumber.trim()
          ? parseInt(approvalJerseyNumber)
          : undefined,
      });

      window.toast?.success(`${request.player.name} has been added to the roster!`);
      
      // Reload club and transfer requests
      const updatedClub = await getClub(club.id, currentState.id);
      if (updatedClub) {
        setClub(updatedClub);
      }
      await loadTransferRequests(club.id);

      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalPosition("");
      setApprovalJerseyNumber("");
    } catch (error: any) {
      console.error("Error approving request:", error);
      window.toast?.error(
        error?.message || "Failed to approve request. Please try again."
      );
    } finally {
      setApprovingRequest(null);
    }
  };

  // Phase 4.3: Handle reject transfer request
  const handleRejectRequest = async (request: TransferRequest) => {
    if (!currentUser || !club || !currentState) return;

    try {
      setRejectingRequest(request.id);
      await rejectTransferRequest(request.id, currentUser.id, currentState.id, rejectionReason.trim() || undefined);

      window.toast?.success("Request rejected");
      
      // Reload transfer requests
      await loadTransferRequests(club.id);

      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      window.toast?.error(
        error?.message || "Failed to reject request. Please try again."
      );
    } finally {
      setRejectingRequest(null);
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            {error || "Club not found"}
          </h2>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg mt-4"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 text-sm sm:text-base"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {club.logo && (
              <img
                src={club.logo}
                alt={club.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 truncate">{club.name}</h1>
              <p className="text-gray-400 text-sm sm:text-base">Club Management</p>
            </div>
          </div>
          <Link
            to={`/club/${club.id}`}
            className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm sm:text-base text-center sm:text-left"
          >
            View Public Profile
          </Link>
        </div>
      </div>

      {/* Phase 4.2: Fee Renewal Warning Banner */}
      {club.isLegitimate &&
        club.legitimacyFeePaidUntil &&
        new Date(club.legitimacyFeePaidUntil) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5"
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
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-yellow-400 mb-1">
                    Legitimacy Fee Expiring Soon
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300">
                    Your legitimacy fee will expire on{" "}
                    <span className="font-semibold text-yellow-400">
                      {club.legitimacyFeePaidUntil instanceof Date
                        ? club.legitimacyFeePaidUntil.toLocaleDateString()
                        : new Date(club.legitimacyFeePaidUntil).toLocaleDateString()}
                    </span>
                    . Please renew to maintain your club's legitimate status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm sm:text-base flex-shrink-0 w-full sm:w-auto"
              >
                Renew Now
              </button>
            </div>
          </div>
        )}

      {/* Legitimacy Status Banner */}
      <div
        className={`rounded-xl p-4 sm:p-6 mb-6 ${
          club.isLegitimate
            ? "bg-green-500/20 border border-green-500/50"
            : "bg-red-500/20 border border-red-500/50"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
              Legitimacy Status
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              {club.isLegitimate ? (
                <>
                  Your club is legitimate and can participate in official leagues.
                  {club.legitimacyFeePaidUntil && (
                    <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                      Valid until:{" "}
                      {club.legitimacyFeePaidUntil instanceof Date
                        ? club.legitimacyFeePaidUntil.toLocaleDateString()
                        : new Date(club.legitimacyFeePaidUntil).toLocaleDateString()}
                    </span>
                  )}
                </>
              ) : (
                "Your club needs to pay the legitimacy fee to participate in official leagues."
              )}
            </p>
          </div>
          <div className="flex-shrink-0">
            {!club.isLegitimate && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm sm:text-base"
              >
                Pay Fee
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Club Information */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Club Information</h2>
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Club Logo
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="club-logo-upload"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                    <label
                      htmlFor="club-logo-upload"
                      className={`inline-block px-4 py-2 bg-dark border border-gray-700 rounded-lg text-gray-300 hover:bg-dark-light cursor-pointer transition-colors text-sm ${
                        isUploadingLogo ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Club Name *
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
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
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
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <LoadingButton
                onClick={handleSaveClubInfo}
                isLoading={isSaving || isUploadingLogo}
                variant="primary"
                className="w-full"
              >
                {isSaving || isUploadingLogo ? "Saving..." : "Save Changes"}
              </LoadingButton>
            </div>
          </div>

          {/* Roster Management */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Team Roster</h2>
              <button
                onClick={() => setShowRosterModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm w-full sm:w-auto"
              >
                Add Player
              </button>
            </div>

            {club.roster && club.roster.length > 0 ? (
              <div className="space-y-3">
                {club.roster.map((player) => (
                  <div
                    key={player.userId}
                    className="bg-dark p-3 sm:p-4 rounded-lg border border-gray-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                        {player.jerseyNumber || "#"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm sm:text-base truncate">{player.playerName}</h4>
                        <p className="text-gray-400 text-xs sm:text-sm">{player.position}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player.userId)}
                      className="text-red-400 hover:text-red-300 flex-shrink-0 p-1"
                      aria-label="Remove player"
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
              <p className="text-gray-400 text-center py-8 text-sm sm:text-base">No players in roster yet</p>
            )}
          </div>

          {/* Phase 4.3: Transfer Requests Management */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Transfer Requests
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransferRequestFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
                    transferRequestFilter === "pending"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setTransferRequestFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
                    transferRequestFilter === "all"
                      ? "bg-primary text-white"
                      : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {transferRequestsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : transferRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm sm:text-base">
                No transfer requests {transferRequestFilter === "pending" ? "pending" : "found"}
              </p>
            ) : (
              <div className="space-y-3">
                {transferRequests.map((request: TransferRequest & { player?: User }) => (
                  <div
                    key={request.id}
                    className="bg-dark p-3 sm:p-4 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {request.player && (
                            <>
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                                {request.player.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium text-sm sm:text-base truncate">
                                  {request.player.name}
                                </h4>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">
                                  {request.player.email}
                                </p>
                              </div>
                            </>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                              request.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                : request.status === "approved"
                                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                : request.status === "rejected"
                                ? "bg-red-500/20 text-red-400 border border-red-500/50"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>
                        <div className="space-y-1 mt-2">
                          {request.position && (
                            <p className="text-gray-400 text-xs sm:text-sm">
                              Position: <span className="text-white">{request.position}</span>
                            </p>
                          )}
                          {request.jerseyNumber && (
                            <p className="text-gray-400 text-xs sm:text-sm">
                              Jersey: <span className="text-white">#{request.jerseyNumber}</span>
                            </p>
                          )}
                          {request.message && (
                            <p className="text-gray-400 text-xs sm:text-sm">
                              Message: <span className="text-white">{request.message}</span>
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">
                            Requested:{" "}
                            {request.requestedAt instanceof Date
                              ? request.requestedAt.toLocaleDateString()
                              : new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                          {request.rejectionReason && (
                            <p className="text-red-400 text-xs mt-1">
                              Rejection reason: {request.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setApprovalPosition(request.position || "");
                              setApprovalJerseyNumber(request.jerseyNumber?.toString() || "");
                              setShowApprovalModal(true);
                            }}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs sm:text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request)}
                            disabled={rejectingRequest === request.id}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm disabled:opacity-50"
                          >
                            {rejectingRequest === request.id ? "Rejecting..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Registration Status */}
          {club.registrationNumber && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                Registration Status
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Registration Number</p>
                  <p className="text-white font-medium text-sm sm:text-base break-all">{club.registrationNumber}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs sm:text-sm text-green-400">Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {club.stats && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3">Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Matches</p>
                  <p className="text-xl font-bold text-white">
                    {club.stats.matchesPlayed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Wins</p>
                  <p className="text-xl font-bold text-green-400">
                    {club.stats.matchesWon}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Losses</p>
                  <p className="text-xl font-bold text-red-400">
                    {club.stats.matchesLost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Draws</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {club.stats.matchesDrawn}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {club.legitimacyPaymentHistory &&
            club.legitimacyPaymentHistory.length > 0 && (
              <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                  Payment History
                </h3>
                <div className="space-y-2">
                  {club.legitimacyPaymentHistory
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((payment, index) => (
                      <div
                        key={index}
                        className="bg-dark p-3 rounded-lg border border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-1">
                          <span className="text-white font-medium text-sm sm:text-base">
                            ₦{payment.amount.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {payment.paymentDate instanceof Date
                              ? payment.paymentDate.toLocaleDateString()
                              : new Date(payment.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Valid until:{" "}
                          {payment.validUntil instanceof Date
                            ? payment.validUntil.toLocaleDateString()
                            : new Date(payment.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Legitimacy Fee Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Pay Legitimacy Fee
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
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
            <LegitimacyFeePayment
              clubId={club.id}
              clubName={club.name}
              onSuccess={handleLegitimacyPaymentSuccess}
              onClose={() => setShowPaymentModal(false)}
            />
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add Player to Roster</h2>
              <button
                onClick={() => setShowRosterModal(false)}
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
                  Player Email *
                </label>
                <input
                  type="email"
                  value={selectedPlayerEmail}
                  onChange={(e) => setSelectedPlayerEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="player@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Position *
                </label>
                <select
                  value={selectedPlayerPosition}
                  onChange={(e) => setSelectedPlayerPosition(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  required
                >
                  <option value="">Select position</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                  <option value="Winger">Winger</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Jersey Number
                </label>
                <input
                  type="number"
                  value={selectedPlayerJerseyNumber}
                  onChange={(e) => setSelectedPlayerJerseyNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="e.g., 7"
                  min="1"
                  max="99"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRosterModal(false)}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleAddPlayerToRoster}
                  variant="primary"
                  className="flex-1"
                >
                  Add Player
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4.3: Approve Transfer Request Modal */}
      {showApprovalModal && selectedRequest && selectedRequest.player && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Approve Request</h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setApprovalPosition("");
                  setApprovalJerseyNumber("");
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Player Name
                </label>
                <p className="text-white font-medium">{selectedRequest.player.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  value={approvalPosition}
                  onChange={(e) => setApprovalPosition(e.target.value)}
                  placeholder="e.g., Forward, Midfielder"
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Jersey Number (Optional)
                </label>
                <input
                  type="number"
                  value={approvalJerseyNumber}
                  onChange={(e) => setApprovalJerseyNumber(e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                  max="99"
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              {selectedRequest.message && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Player Message
                  </label>
                  <p className="text-gray-300 text-sm bg-dark p-3 rounded-lg border border-gray-700">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setApprovalPosition("");
                    setApprovalJerseyNumber("");
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={() => handleApproveRequest(selectedRequest)}
                  isLoading={approvingRequest === selectedRequest.id}
                  variant="primary"
                  className="flex-1"
                >
                  Approve & Add to Roster
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubManagementPage;

