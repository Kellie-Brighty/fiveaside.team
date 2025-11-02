// Phase 4.1: Club Verification Page (for FA officials)
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllClubs,
  verifyClub,
  generateClubRegistrationNumber,
} from "../services/clubService";
import { hasPermission } from "../utils/permissions";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import LoadingButton from "../components/LoadingButton";
import { Link } from "react-router-dom";
import type { Club, User } from "../types";

const ClubVerificationPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<(Club & { manager?: User })[]>([]);
  const [filter, setFilter] = useState<"all" | "unverified" | "verified">("unverified");
  const [error, setError] = useState<string | null>(null);
  const [verifyingClubId, setVerifyingClubId] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  useEffect(() => {
    const loadClubs = async () => {
      if (!currentUser || isAuthLoading) return;

      // Check permissions
      const canVerify = hasPermission(currentUser.role, "register_clubs");

      if (!canVerify) {
        setError("You don't have permission to verify clubs");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load all clubs
        const allClubs = await getAllClubs();

        // Load manager data for each club
        const clubsWithManagers = await Promise.all(
          allClubs.map(async (club) => {
            try {
              const managerDoc = await getDoc(doc(db, "users", club.managerId));
              if (managerDoc.exists()) {
                const managerData = {
                  id: managerDoc.id,
                  ...managerDoc.data(),
                } as User;
                return { ...club, manager: managerData };
              }
              return { ...club };
            } catch (error) {
              console.error("Error loading manager:", error);
              return { ...club };
            }
          })
        );

        setClubs(clubsWithManagers);
      } catch (error) {
        console.error("Error loading clubs:", error);
        setError("Failed to load clubs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadClubs();
    }
  }, [currentUser, isAuthLoading, filter]);

  const handleVerifyClub = async () => {
    if (!selectedClub || !registrationNumber.trim()) {
      window.toast?.error("Registration number is required");
      return;
    }

    try {
      setVerifyingClubId(selectedClub.id);
      await verifyClub(selectedClub.id, registrationNumber.trim());

      // Reload clubs
      const allClubs = await getAllClubs();
      const clubsWithManagers = await Promise.all(
        allClubs.map(async (club) => {
          try {
            const managerDoc = await getDoc(doc(db, "users", club.managerId));
            if (managerDoc.exists()) {
              const managerData = {
                id: managerDoc.id,
                ...managerDoc.data(),
              } as User;
              return { ...club, manager: managerData };
            }
            return { ...club };
          } catch (error) {
            return { ...club };
          }
        })
      );

      setClubs(clubsWithManagers);
      setShowVerificationModal(false);
      setSelectedClub(null);
      setRegistrationNumber("");
      window.toast?.success("Club verified successfully!");
    } catch (error) {
      console.error("Error verifying club:", error);
      window.toast?.error(
        error instanceof Error ? error.message : "Failed to verify club. Please try again."
      );
    } finally {
      setVerifyingClubId(null);
    }
  };

  const openVerificationModal = async (club: Club) => {
    setSelectedClub(club);
    try {
      // Generate registration number automatically
      const generatedNumber = await generateClubRegistrationNumber();
      setRegistrationNumber(generatedNumber);
    } catch (error) {
      console.error("Error generating registration number:", error);
      window.toast?.error("Failed to generate registration number");
      return;
    }
    setShowVerificationModal(true);
  };

  const filteredClubs = clubs.filter((club) => {
    if (filter === "unverified") {
      return !club.registrationNumber;
    }
    if (filter === "verified") {
      return !!club.registrationNumber;
    }
    return true; // all
  });

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !hasPermission(currentUser?.role || "player", "register_clubs")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
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
        <h1 className="text-3xl font-bold text-white mb-2">Club Verification</h1>
        <p className="text-gray-400">
          Verify and assign registration numbers to clubs
        </p>
      </div>

      {/* Filters */}
      <div className="bg-dark-lighter rounded-xl shadow-xl p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "all"
                ? "bg-primary text-white"
                : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
            }`}
          >
            All Clubs ({clubs.length})
          </button>
          <button
            onClick={() => setFilter("unverified")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "unverified"
                ? "bg-primary text-white"
                : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
            }`}
          >
            Unverified ({clubs.filter((c) => !c.registrationNumber).length})
          </button>
          <button
            onClick={() => setFilter("verified")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "verified"
                ? "bg-primary text-white"
                : "bg-dark border border-gray-700 text-gray-300 hover:bg-dark-light"
            }`}
          >
            Verified ({clubs.filter((c) => !!c.registrationNumber).length})
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Clubs List */}
      {filteredClubs.length === 0 ? (
        <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
          <p className="text-gray-400">
            {filter === "unverified"
              ? "No unverified clubs found"
              : filter === "verified"
              ? "No verified clubs found"
              : "No clubs found"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <div
              key={club.id}
              className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden"
            >
              {/* Club Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                      <span className="text-2xl font-bold text-gray-500">
                        {club.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{club.name}</h3>
                    {club.shortName && (
                      <p className="text-gray-400 text-sm">({club.shortName})</p>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {club.registrationNumber ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/50">
                      Verified
                    </span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/50">
                      Pending Verification
                    </span>
                  )}
                  {club.isLegitimate ? (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/50">
                      Legitimate
                    </span>
                  ) : (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full border border-red-500/50">
                      Not Legitimate
                    </span>
                  )}
                </div>
              </div>

              {/* Club Details */}
              <div className="p-6 space-y-3">
                {club.manager && (
                  <div>
                    <p className="text-xs text-gray-400">Manager</p>
                    <p className="text-white text-sm font-medium">
                      {club.manager.name}
                    </p>
                  </div>
                )}
                {club.location && (
                  <div>
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-white text-sm">
                      {club.location.city}
                      {club.location.state && `, ${club.location.state}`}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Players</p>
                  <p className="text-white text-sm font-medium">
                    {club.playerIds.length} registered
                  </p>
                </div>
                {club.registrationNumber && (
                  <div>
                    <p className="text-xs text-gray-400">Registration Number</p>
                    <p className="text-white text-sm font-medium font-mono">
                      {club.registrationNumber}
                    </p>
                  </div>
                )}
                {club.legitimacyFeePaidUntil && (
                  <div>
                    <p className="text-xs text-gray-400">Legitimacy Valid Until</p>
                    <p className="text-white text-sm">
                      {new Date(club.legitimacyFeePaidUntil).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-700">
                  <Link
                    to={`/club/${club.id}`}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    View Club Profile →
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-700 bg-dark">
                {!club.registrationNumber ? (
                  <LoadingButton
                    onClick={() => openVerificationModal(club)}
                    variant="primary"
                    className="w-full"
                  >
                    Verify Club
                  </LoadingButton>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    Already Verified
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedClub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Verify Club</h2>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedClub(null);
                  setRegistrationNumber("");
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
                  Club Name
                </label>
                <p className="text-white font-medium">{selectedClub.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Generated Registration Number
                </label>
                <div className="w-full px-4 py-3 rounded-lg bg-dark border border-primary text-primary font-mono font-semibold text-center">
                  {registrationNumber || "Generating..."}
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  System-generated registration number. Review and verify to assign.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setSelectedClub(null);
                    setRegistrationNumber("");
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleVerifyClub}
                  isLoading={verifyingClubId === selectedClub.id}
                  variant="primary"
                  className="flex-1"
                >
                  {verifyingClubId === selectedClub.id
                    ? "Verifying..."
                    : "Verify Club"}
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubVerificationPage;

