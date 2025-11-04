// Phase 3: Public Player Profile View Page
// Phase 11: Enhanced with scout features (watchlist, notes, comparison)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerProfile, incrementProfileViews } from "../services/playerProfileService";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  savePlayerNote,
  getPlayerNote,
  getPlayerWatchlistCount,
  sendScoutMessage,
  upsertRecruitmentRecord,
} from "../services/scoutService";
import type { PlayerProfile, User } from "../types";
import { getRoleDisplayName, hasPermission } from "../utils/permissions";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

const PlayerProfileViewPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Phase 11: Scout features
  const [inWatchlist, setInWatchlist] = useState(false);
  const [checkingWatchlist, setCheckingWatchlist] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [playerNote, setPlayerNote] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showRecruitmentModal, setShowRecruitmentModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"general" | "initial_contact" | "follow_up" | "offer">("general");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recruitmentStage, setRecruitmentStage] = useState<"interested" | "contacted" | "trial_scheduled" | "trial_completed" | "offer_extended" | "offer_accepted" | "offer_declined" | "signed" | "closed">("interested");
  const [recruitmentNotes, setRecruitmentNotes] = useState("");
  const [savingRecruitment, setSavingRecruitment] = useState(false);
  // Phase 11: Player analytics
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load user data
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
          setError("Player not found");
          setLoading(false);
          return;
        }

        const userData = { id: userDoc.id, ...userDoc.data() } as User;
        setUser(userData);

        // Check if user is a player
        if (userData.role !== "player") {
          setError("This user is not a player");
          setLoading(false);
          return;
        }

        // Load player profile
        const profile = await getPlayerProfile(userId);
        if (!profile) {
          setError("Player profile not found");
          setLoading(false);
          return;
        }

        // Check if profile is public
        if (!profile.isPublic) {
          setError("This player profile is private");
          setLoading(false);
          return;
        }

        // Phase 3: Check if current user has permission to view player profiles
        // Allow access if:
        // 1. User is viewing their own profile (player viewing their own - always allowed)
        // 2. User is authenticated AND has scout_players or view_talent_pool permission
        const isOwnProfile = currentUser && currentUser.id === userId;
        
        if (!isOwnProfile) {
          // Not viewing own profile - check permissions
          if (!currentUser) {
            setAccessDenied(true);
            setError("Please login to view player profiles");
            setLoading(false);
            return;
          }

          const hasScoutPermission = hasPermission(
            currentUser.role,
            "scout_players"
          );
          const hasTalentPoolPermission = hasPermission(
            currentUser.role,
            "view_talent_pool"
          );

          if (!hasScoutPermission && !hasTalentPoolPermission) {
            setAccessDenied(true);
            setError(
              "You need to be a scout, club manager, ministry official, FA official, or admin to view player profiles"
            );
            setLoading(false);
            return;
          }
        }

        setPlayerProfile(profile);

        // Increment profile views (analytics) - only if not viewing own profile
        if (!isOwnProfile) {
          incrementProfileViews(userId);
        }

        // Phase 11: Load watchlist count for player (if profile is public)
        if (profile.isPublic && userId) {
          try {
            const count = await getPlayerWatchlistCount(userId);
            setWatchlistCount(count);
          } catch (error) {
            console.error("Error loading watchlist count:", error);
          }
        }
      } catch (error) {
        console.error("Error loading player profile:", error);
        setError("Failed to load player profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, currentUser]);

  // Phase 11: Check watchlist status and load notes for scouts
  useEffect(() => {
    const loadScoutData = async () => {
      if (currentUser && userId && currentUser.role === "scout" && currentUser.id !== userId) {
        try {
          setCheckingWatchlist(true);
          const [inList, note] = await Promise.all([
            isInWatchlist(currentUser.id, userId),
            getPlayerNote(currentUser.id, userId),
          ]);
          setInWatchlist(inList);
          if (note) {
            setPlayerNote(note.note);
          }
        } catch (error) {
          console.error("Error loading scout data:", error);
        } finally {
          setCheckingWatchlist(false);
        }
      }
    };

    if (currentUser && userId && playerProfile) {
      loadScoutData();
    }
  }, [currentUser, userId, playerProfile]);

  // Phase 11: Save player note
  const handleSaveNote = async () => {
    if (!currentUser || !userId || currentUser.role !== "scout") return;

    try {
      setLoadingNote(true);
      await savePlayerNote(currentUser.id, userId, playerNote.trim());
      setShowNotesModal(false);
      if (window.toast) {
        window.toast.success("Note saved successfully");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      if (window.toast) {
        window.toast.error("Failed to save note");
      }
    } finally {
      setLoadingNote(false);
    }
  };

  // Phase 11: Toggle watchlist
  const handleToggleWatchlist = async () => {
    if (!currentUser || !userId || currentUser.role !== "scout") return;

    try {
      if (inWatchlist) {
        await removeFromWatchlist(currentUser.id, userId);
        setInWatchlist(false);
        if (window.toast) {
          window.toast.success("Removed from watchlist");
        }
      } else {
        await addToWatchlist(currentUser.id, userId);
        setInWatchlist(true);
        if (window.toast) {
          window.toast.success("Added to watchlist");
        }
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      if (window.toast) {
        window.toast.error("Failed to update watchlist");
      }
    }
  };

  // Phase 11: Quick comparison - navigate to comparison page
  const handleComparePlayers = () => {
    if (!currentUser || currentUser.role !== "scout" || !userId) return;
    
    // Get watchlist IDs and add current player
    const watchlistIds = currentUser.watchlists || [];
    const allPlayerIds = [...watchlistIds, userId].filter((id, index, arr) => arr.indexOf(id) === index);
    
    if (allPlayerIds.length < 2) {
      if (window.toast) {
        window.toast.warning("Add at least one more player to your watchlist to compare");
      }
      return;
    }

    // Limit to 5 players for comparison
    const playersToCompare = allPlayerIds.slice(0, 5);
    navigate(`/player-comparison?players=${playersToCompare.join(",")}`);
  };

  if (isAuthLoading || loading) {
    return <LoadingScreen />;
  }

  if (error || !user || !playerProfile) {
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
            {accessDenied ? "Access Denied" : "Profile Not Available"}
          </h2>
          <p className="text-gray-400 mb-4">
            {error || "Player profile not found"}
          </p>
          {accessDenied && (
            <p className="text-gray-500 text-sm mb-4">
              Player profiles are accessible to scouts, club managers, ministry
              officials, FA officials, and other players.
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
            >
              Go Home
            </button>
            {accessDenied && (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
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
        <div className="flex items-start gap-6">
          <img
            src={
              user.profileImage ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.name
              )}&background=6366f1&color=fff&size=128`
            }
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
            <p className="text-gray-400">{getRoleDisplayName(user.role)}</p>
            {playerProfile.position && (
              <p className="text-primary font-medium mt-1">
                {playerProfile.position}
              </p>
            )}
            {user.location && (
              <p className="text-gray-500 text-sm mt-1">
                {user.location.city}
                {user.location.state && `, ${user.location.state}`}
              </p>
            )}
          </div>
          {/* Phase 11: Scout Actions */}
          {currentUser && currentUser.role === "scout" && currentUser.id !== userId && (
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <button
                onClick={handleToggleWatchlist}
                disabled={checkingWatchlist}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  inWatchlist
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-yellow-600 hover:bg-yellow-700 text-white"
                } disabled:opacity-50`}
                title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              >
                {checkingWatchlist ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 sm:gap-2">
                    {inWatchlist ? "★ Watchlist" : "☆ Add"}
                  </span>
                )}
              </button>
              <button
                onClick={handleComparePlayers}
                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium"
                title="Compare with other players in your watchlist"
              >
                Compare
              </button>
              <button
                onClick={() => setShowNotesModal(true)}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium"
                title="Add notes about this player"
              >
                {playerNote ? "📝 Edit Note" : "📝 Note"}
              </button>
              <button
                onClick={() => {
                  // Open message modal (we'll need to add this state)
                  setShowMessageModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium"
                title="Send message to this player"
              >
                💬 Message
              </button>
              <button
                onClick={() => {
                  // Open recruitment modal
                  setShowRecruitmentModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium"
                title="Add to recruitment pipeline"
              >
                🎯 Recruit
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {user.bio && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-3">About</h2>
              <p className="text-gray-300">{user.bio}</p>
            </div>
          )}

          {/* Physical Attributes */}
          {(playerProfile.height ||
            playerProfile.weight ||
            playerProfile.preferredFoot) && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Physical Attributes
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {playerProfile.height && (
                  <div>
                    <p className="text-sm text-gray-400">Height</p>
                    <p className="text-lg font-semibold text-white">
                      {playerProfile.height} cm
                    </p>
                  </div>
                )}
                {playerProfile.weight && (
                  <div>
                    <p className="text-sm text-gray-400">Weight</p>
                    <p className="text-lg font-semibold text-white">
                      {playerProfile.weight} kg
                    </p>
                  </div>
                )}
                {playerProfile.preferredFoot && (
                  <div>
                    <p className="text-sm text-gray-400">Preferred Foot</p>
                    <p className="text-lg font-semibold text-white capitalize">
                      {playerProfile.preferredFoot}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          {playerProfile.stats && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Goals</p>
                  <p className="text-2xl font-bold text-white">
                    {playerProfile.stats.goals || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Assists</p>
                  <p className="text-2xl font-bold text-white">
                    {playerProfile.stats.assists || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Matches</p>
                  <p className="text-2xl font-bold text-white">
                    {playerProfile.stats.matchesPlayed || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {playerProfile.stats.matchesPlayed
                      ? Math.round(
                          ((playerProfile.stats.matchesWon || 0) /
                            playerProfile.stats.matchesPlayed) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-xl font-bold text-white">
                    {playerProfile.stats.matchesWon || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Losses</p>
                  <p className="text-xl font-bold text-white">
                    {playerProfile.stats.matchesLost || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Draws</p>
                  <p className="text-xl font-bold text-white">
                    {playerProfile.stats.matchesDrawn || 0}
                  </p>
                </div>
                {playerProfile.stats.cleanSheets !== undefined && (
                  <div className="bg-dark p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Clean Sheets</p>
                    <p className="text-xl font-bold text-white">
                      {playerProfile.stats.cleanSheets}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Highlights */}
          {playerProfile.highlightVideos &&
            playerProfile.highlightVideos.length > 0 && (
              <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Highlight Videos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerProfile.highlightVideos.map((videoUrl, index) => (
                    <div
                      key={index}
                      className="bg-dark rounded-lg overflow-hidden"
                    >
                      <div className="aspect-video">
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Image Gallery */}
          {playerProfile.images && playerProfile.images.length > 0 && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Image Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {playerProfile.images.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="aspect-square bg-gray-800 rounded-lg overflow-hidden"
                  >
                    <img
                      src={imageUrl}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {playerProfile.achievements &&
            playerProfile.achievements.length > 0 && (
              <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Achievements
                </h2>
                <div className="space-y-3">
                  {playerProfile.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-dark p-4 rounded-lg border border-gray-700"
                    >
                      <h4 className="text-white font-medium">
                        {achievement.title}
                      </h4>
                      {achievement.description && (
                        <p className="text-gray-400 text-sm mt-1">
                          {achievement.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          {achievement.category.replace("_", " ")}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(achievement.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact/Social Links */}
          {user.socialLinks &&
            (user.socialLinks.website ||
              user.socialLinks.twitter ||
              user.socialLinks.instagram ||
              user.socialLinks.facebook) && (
              <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Contact & Social
                </h3>
                <div className="space-y-2">
                  {user.socialLinks.website && (
                    <a
                      href={user.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary"
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
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      Website
                    </a>
                  )}
                  {user.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${user.socialLinks.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                      {user.socialLinks.twitter}
                    </a>
                  )}
                  {user.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${user.socialLinks.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-300 hover:text-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                      </svg>
                      {user.socialLinks.instagram}
                    </a>
                  )}
                </div>
              </div>
            )}

          {/* Profile Info */}
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Profile Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-400">Profile Views</p>
                <p className="text-white font-medium">
                  {playerProfile.profileViews || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Member Since</p>
                <p className="text-white font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Phase 11: Player Analytics - Show watchlist count and profile views */}
          {currentUser && currentUser.id === userId && (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Profile Analytics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Profile Views</p>
                  <p className="text-2xl font-bold text-white">
                    {playerProfile.profileViews || 0}
                  </p>
                </div>
                <div className="bg-dark p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Scout Watchlists</p>
                  <p className="text-2xl font-bold text-primary">
                    {watchlistCount !== null ? watchlistCount : "..."}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {watchlistCount === 1
                      ? "scout is tracking you"
                      : watchlistCount !== null && watchlistCount > 1
                      ? "scouts are tracking you"
                      : watchlistCount === 0
                      ? "No scouts yet"
                      : ""}
                  </p>
                </div>
              </div>
              {watchlistCount !== null && watchlistCount > 0 && (
                <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    🎯 Great! {watchlistCount} {watchlistCount === 1 ? "scout has" : "scouts have"} added you to their watchlist!
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Keep your profile updated and stats current to stay on their radar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Phase 11: Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Player Notes</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Notes
              </label>
              <textarea
                value={playerNote}
                onChange={(e) => setPlayerNote(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary min-h-[200px]"
                placeholder="Add your observations, strengths, areas for improvement, or any notes about this player..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSaveNote}
                disabled={loadingNote}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 text-sm sm:text-base"
              >
                {loadingNote ? "Saving..." : "Save Note"}
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 11: Message Modal */}
      {showMessageModal && currentUser && userId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Send Message to {user.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as typeof messageType)}
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary text-sm sm:text-base"
                >
                  <option value="general">General</option>
                  <option value="initial_contact">Initial Contact</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="offer">Offer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary text-sm sm:text-base"
                  placeholder="Message subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary min-h-[150px] text-sm sm:text-base"
                  placeholder="Enter your message..."
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={async () => {
                  if (!messageSubject || !messageText) {
                    if (window.toast) {
                      window.toast.error("Please fill in all fields");
                    }
                    return;
                  }
                  try {
                    setSendingMessage(true);
                    await sendScoutMessage(
                      currentUser.id,
                      userId,
                      messageSubject,
                      messageText,
                      messageType
                    );
                    setShowMessageModal(false);
                    setMessageSubject("");
                    setMessageText("");
                    setMessageType("general");
                    if (window.toast) {
                      window.toast.success("Message sent successfully");
                    }
                  } catch (error) {
                    console.error("Error sending message:", error);
                    if (window.toast) {
                      window.toast.error("Failed to send message");
                    }
                  } finally {
                    setSendingMessage(false);
                  }
                }}
                disabled={sendingMessage}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 text-sm sm:text-base"
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageSubject("");
                  setMessageText("");
                  setMessageType("general");
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 11: Recruitment Modal */}
      {showRecruitmentModal && currentUser && userId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Add {user.name} to Recruitment Pipeline</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stage
                </label>
                <select
                  value={recruitmentStage}
                  onChange={(e) => setRecruitmentStage(e.target.value as typeof recruitmentStage)}
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary text-sm sm:text-base"
                >
                  <option value="interested">Interested</option>
                  <option value="contacted">Contacted</option>
                  <option value="trial_scheduled">Trial Scheduled</option>
                  <option value="trial_completed">Trial Completed</option>
                  <option value="offer_extended">Offer Extended</option>
                  <option value="offer_accepted">Offer Accepted</option>
                  <option value="offer_declined">Offer Declined</option>
                  <option value="signed">Signed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={recruitmentNotes}
                  onChange={(e) => setRecruitmentNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary min-h-[150px] text-sm sm:text-base"
                  placeholder="Add notes about this recruitment..."
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={async () => {
                  if (!currentUser || !userId) return;
                  try {
                    setSavingRecruitment(true);
                    await upsertRecruitmentRecord(
                      currentUser.id,
                      userId,
                      recruitmentStage,
                      recruitmentNotes
                    );
                    setShowRecruitmentModal(false);
                    setRecruitmentStage("interested");
                    setRecruitmentNotes("");
                    if (window.toast) {
                      window.toast.success("Player added to recruitment pipeline");
                    }
                  } catch (error) {
                    console.error("Error saving recruitment:", error);
                    if (window.toast) {
                      window.toast.error("Failed to save recruitment record");
                    }
                  } finally {
                    setSavingRecruitment(false);
                  }
                }}
                disabled={savingRecruitment}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 text-sm sm:text-base"
              >
                {savingRecruitment ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowRecruitmentModal(false);
                  setRecruitmentStage("interested");
                  setRecruitmentNotes("");
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfileViewPage;

