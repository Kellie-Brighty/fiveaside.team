// Phase 4.1: Public Club Profile Page
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getClub } from "../services/clubService";
import { getPlayerProfile } from "../services/playerProfileService";
import { getAllProducts } from "../services/productService";
import { incrementProductViews } from "../services/productService";
import {
  createTransferRequest,
  getTransferRequestByPlayerAndClub,
  cancelTransferRequest,
} from "../services/transferService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Club, User, PlayerProfile, TransferRequest, Product } from "../types";
import { hasPermission } from "../utils/permissions";
import LoadingButton from "../components/LoadingButton";

const ClubProfilePage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [manager, setManager] = useState<User | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<
    Array<{
      user: User;
      playerProfile?: PlayerProfile;
      rosterData: {
        position: string;
        jerseyNumber?: number;
        joinedDate: Date;
      };
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [transferRequest, setTransferRequest] = useState<TransferRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [position, setPosition] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [message, setMessage] = useState("");
  const [clubProducts, setClubProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const loadClubProfile = async () => {
      if (!clubId) {
        setError("Invalid club ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load club data
        const clubData = await getClub(clubId);
        if (!clubData) {
          setError("Club not found");
          setLoading(false);
          return;
        }

        setClub(clubData);

        // Load manager data
        if (clubData.managerId) {
          try {
            const managerDoc = await getDoc(doc(db, "users", clubData.managerId));
            if (managerDoc.exists()) {
              const managerData = {
                id: managerDoc.id,
                ...managerDoc.data(),
              } as User;
              setManager(managerData);
            }
          } catch (error) {
            console.error("Error loading manager:", error);
          }
        }

        // Load roster players data
        if (clubData.roster && clubData.roster.length > 0) {
          try {
            const playersData = await Promise.all(
              clubData.roster.map(async (rosterPlayer) => {
                try {
                  const userDoc = await getDoc(doc(db, "users", rosterPlayer.userId));
                  if (userDoc.exists()) {
                    const userData = {
                      id: userDoc.id,
                      ...userDoc.data(),
                    } as User;

                    // Try to load player profile
                    let playerProfile: PlayerProfile | undefined;
                    try {
                      const profile = await getPlayerProfile(rosterPlayer.userId);
                      playerProfile = profile || undefined;
                    } catch (error) {
                      // Player profile might not exist, that's okay
                      console.log("Player profile not found for", rosterPlayer.userId);
                    }

                    return {
                      user: userData,
                      playerProfile,
                      rosterData: {
                        position: rosterPlayer.position,
                        jerseyNumber: rosterPlayer.jerseyNumber,
                        joinedDate: rosterPlayer.joinedDate,
                      },
                    };
                  }
                  return null;
                } catch (error) {
                  console.error("Error loading player:", error);
                  return null;
                }
              })
            );

            setRosterPlayers(
              playersData.filter((p) => p !== null) as typeof rosterPlayers
            );
          } catch (error) {
            console.error("Error loading roster:", error);
          }
        }
      } catch (error) {
        console.error("Error loading club profile:", error);
        setError("Failed to load club profile");
      } finally {
        setLoading(false);
      }
    };

    loadClubProfile();
  }, [clubId]);

  // Load club products when clubId is available
  useEffect(() => {
    if (clubId) {
      const loadClubProducts = async () => {
        try {
          setLoadingProducts(true);
          const products = await getAllProducts({ clubId, inStock: true });
          setClubProducts(products);
        } catch (error) {
          console.error("Error loading club products:", error);
        } finally {
          setLoadingProducts(false);
        }
      };
      loadClubProducts();
    }
  }, [clubId]);

  if (loading) {
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
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Club Not Available
          </h2>
          <p className="text-gray-400 mb-4">
            {error || "Club profile not found"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isManager = currentUser && currentUser.id === club.managerId;
  const canManage = isManager || (currentUser && hasPermission(currentUser.role, "manage_clubs"));
  const isPlayer = currentUser?.role === "player";
  const isInClub = currentUser && club.playerIds.includes(currentUser.id);
  const hasPendingRequest = transferRequest?.status === "pending";

  const handleRequestToJoin = async () => {
    if (!currentUser || !clubId) return;

    setRequesting(true);
    try {
      await createTransferRequest(currentUser.id, clubId, {
        position: position.trim() || undefined,
        jerseyNumber: jerseyNumber.trim() ? parseInt(jerseyNumber) : undefined,
        message: message.trim() || undefined,
      });

      window.toast?.success("Request sent! The club manager will review it.");
      setShowRequestModal(false);
      setPosition("");
      setJerseyNumber("");
      setMessage("");

      // Reload transfer request
      const request = await getTransferRequestByPlayerAndClub(
        currentUser.id,
        clubId
      );
      setTransferRequest(request);
    } catch (error: any) {
      console.error("Error creating transfer request:", error);
      window.toast?.error(
        error?.message || "Failed to send request. Please try again."
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = () => {
    setShowCancelConfirmModal(true);
  };

  const confirmCancelRequest = async () => {
    if (!transferRequest) return;

    setRequesting(true);
    try {
      await cancelTransferRequest(transferRequest.id);
      window.toast?.success("Request cancelled");
      setTransferRequest(null);
      setShowCancelConfirmModal(false);
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      window.toast?.error(
        error?.message || "Failed to cancel request. Please try again."
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            {club.logo ? (
              <img
                src={club.logo}
                alt={club.name}
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-gray-500">
                  {club.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{club.name}</h1>
                {club.shortName && (
                  <span className="text-gray-400 text-sm sm:text-base lg:text-lg">({club.shortName})</span>
                )}
                {club.isLegitimate && (
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/50 whitespace-nowrap">
                    Legitimate
                  </span>
                )}
                {club.registrationNumber && (
                  <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full border border-primary/50 whitespace-nowrap">
                    Verified
                  </span>
                )}
              </div>
              {club.founded && (
                <p className="text-gray-400 text-sm sm:text-base">Founded {club.founded}</p>
              )}
              {club.location && (
                <p className="text-gray-500 text-xs sm:text-sm">
                  {club.location.city}
                  {club.location.state && `, ${club.location.state}`}
                </p>
              )}
              {manager && (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Manager: {manager.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {canManage && (
              <Link
                to={`/club/${club.id}/manage`}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm sm:text-base text-center sm:text-left w-full sm:w-auto"
              >
                Manage Club
              </Link>
            )}
            {isPlayer && !canManage && !isInClub && (
              <>
                {!hasPendingRequest ? (
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm sm:text-base text-center w-full sm:w-auto"
                  >
                    Request to Join
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      disabled
                      className="px-4 py-2 bg-yellow-500/50 text-yellow-400 rounded-lg text-sm sm:text-base text-center cursor-not-allowed"
                    >
                      Pending Request
                    </button>
                    <button
                      onClick={handleCancelRequest}
                      disabled={requesting}
                      className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm sm:text-base text-center"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
            {isPlayer && isInClub && (
              <div className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm sm:text-base text-center border border-blue-500/50">
                You're in this club
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Description */}
          {club.description && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3">About</h2>
              <p className="text-gray-300 text-sm sm:text-base">{club.description}</p>
            </div>
          )}

          {/* Statistics */}
          {club.stats && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Statistics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Matches</p>
                  <p className="text-2xl font-bold text-white">
                    {club.stats.matchesPlayed || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-2xl font-bold text-green-400">
                    {club.stats.matchesWon || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Losses</p>
                  <p className="text-2xl font-bold text-red-400">
                    {club.stats.matchesLost || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Draws</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {club.stats.matchesDrawn || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Goals For</p>
                  <p className="text-xl font-bold text-white">
                    {club.stats.goalsFor || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Goals Against</p>
                  <p className="text-xl font-bold text-white">
                    {club.stats.goalsAgainst || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Roster */}
          {rosterPlayers.length > 0 && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Team Roster</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {rosterPlayers.map(({ user, playerProfile, rosterData }) => (
                  <div
                    key={user.id}
                    className="bg-dark p-3 sm:p-4 rounded-lg border border-gray-700 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => {
                      if (playerProfile?.isPublic) {
                        navigate(`/player/${user.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={
                            user.profileImage ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.name
                            )}&background=6366f1&color=fff&size=64`
                          }
                          alt={user.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-700"
                        />
                        {rosterData.jerseyNumber && (
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-primary text-white text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ">
                            {rosterData.jerseyNumber}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm sm:text-base truncate">{user.name}</h4>
                        <p className="text-gray-400 text-xs sm:text-sm">{rosterData.position}</p>
                        {playerProfile?.stats && (
                          <div className="flex gap-2 sm:gap-3 mt-1 sm:mt-2 text-xs text-gray-500">
                            <span>{playerProfile.stats.goals || 0} goals</span>
                            <span>{playerProfile.stats.assists || 0} assists</span>
                          </div>
                        )}
                      </div>
                      {playerProfile?.isPublic && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merchandise Section - Phase 8 */}
          {clubProducts.length > 0 && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white">Official Merchandise</h2>
                <Link
                  to={`/products?club=${club.id}`}
                  className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                >
                  View All
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {clubProducts.slice(0, 4).map((product) => {
                    const displayPrice =
                      product.isOnSale && product.discountPrice
                        ? product.discountPrice
                        : product.price;
                    const originalPrice =
                      product.isOnSale && product.discountPrice ? product.price : null;

                    return (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        onClick={() => incrementProductViews(product.id)}
                        className="bg-dark rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                      >
                        <div className="relative aspect-square bg-gray-900 overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-12 w-12 text-gray-600"
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
                          {product.isOnSale && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                              Sale
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-bold text-sm">
                              ₦{displayPrice.toLocaleString()}
                            </span>
                            {originalPrice && (
                              <span className="text-gray-500 text-xs line-through">
                                ₦{originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Contact Information */}
          {(club.contactEmail || club.contactPhone || club.website) && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3">Contact</h3>
              <div className="space-y-2">
                {club.contactEmail && (
                  <a
                    href={`mailto:${club.contactEmail}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {club.contactEmail}
                  </a>
                )}
                {club.contactPhone && (
                  <a
                    href={`tel:${club.contactPhone}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {club.contactPhone}
                  </a>
                )}
                {club.website && (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Social Media */}
          {club.socialMedia &&
            (club.socialMedia.twitter ||
              club.socialMedia.instagram ||
              club.socialMedia.facebook) && (
              <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Social Media</h3>
                <div className="space-y-2">
                  {club.socialMedia.twitter && (
                    <a
                      href={`https://twitter.com/${club.socialMedia.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                      {club.socialMedia.twitter}
                    </a>
                  )}
                  {club.socialMedia.instagram && (
                    <a
                      href={`https://instagram.com/${club.socialMedia.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                      </svg>
                      {club.socialMedia.instagram}
                    </a>
                  )}
                  {club.socialMedia.facebook && (
                    <a
                      href={`https://facebook.com/${club.socialMedia.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary text-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      {club.socialMedia.facebook}
                    </a>
                  )}
                </div>
              </div>
            )}

          {/* Club Info */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Club Info</h3>
            <div className="space-y-2 text-sm">
              {club.registrationNumber && (
                <div>
                  <p className="text-gray-400">Registration #</p>
                  <p className="text-white font-medium">{club.registrationNumber}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400">Players</p>
                <p className="text-white font-medium">
                  {club.playerIds.length} registered
                </p>
              </div>
              <div>
                <p className="text-gray-400">Created</p>
                <p className="text-white font-medium">
                  {club.createdAt instanceof Date
                    ? club.createdAt.toLocaleDateString()
                    : club.createdAt
                    ? new Date(club.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              {club.isLegitimate && club.legitimacyFeePaidUntil && (
                <div>
                  <p className="text-gray-400">Legitimacy Valid Until</p>
                  <p className="text-white font-medium">
                    {club.legitimacyFeePaidUntil instanceof Date
                      ? club.legitimacyFeePaidUntil.toLocaleDateString()
                      : club.legitimacyFeePaidUntil
                      ? new Date(club.legitimacyFeePaidUntil).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 4.3: Request to Join Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Request to Join Club</h2>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setPosition("");
                  setJerseyNumber("");
                  setMessage("");
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
                <p className="text-white font-medium">{club.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Preferred Position (Optional)
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Forward, Midfielder"
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Preferred Jersey Number (Optional)
                </label>
                <input
                  type="number"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                  max="99"
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the club manager why you'd like to join..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setPosition("");
                    setJerseyNumber("");
                    setMessage("");
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleRequestToJoin}
                  isLoading={requesting}
                  variant="primary"
                  className="flex-1"
                >
                  Send Request
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4.3: Cancel Request Confirmation Modal */}
      {showCancelConfirmModal && transferRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Cancel Request</h2>
              <button
                onClick={() => setShowCancelConfirmModal(false)}
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
              <p className="text-gray-300 text-sm sm:text-base">
                Are you sure you want to cancel your request to join{" "}
                <span className="font-semibold text-white">{club?.name}</span>?
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">
                This action cannot be undone. You can always send a new request later if you change your mind.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCancelConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Keep Request
                </button>
                <button
                  onClick={confirmCancelRequest}
                  disabled={requesting}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requesting ? "Cancelling..." : "Cancel Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubProfilePage;

