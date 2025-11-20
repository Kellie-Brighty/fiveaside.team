// Phase 11: Scout Dashboard - Enhanced talent scouting interface
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { hasPermission } from "../utils/permissions";
import {
  getWatchlist,
  getSavedSearches,
  deleteSavedSearch,
  getScoutNotes,
  deletePlayerNote,
  sendScoutMessage,
  getScoutSentMessages,
  getScoutRecruitmentRecords,
  upsertRecruitmentRecord,
  updateRecruitmentStage,
  type SavedSearch,
  type PlayerNote,
  type ScoutMessage,
  type RecruitmentRecord,
  type RecruitmentStage,
} from "../services/scoutService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { PlayerProfile, User } from "../types";

const ScoutDashboardPage: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"watchlist" | "saved-searches" | "notes" | "reports" | "messages" | "recruitment">("watchlist");
  const [watchlist, setWatchlist] = useState<(PlayerProfile & { userId: string; user: User })[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [playerNotes, setPlayerNotes] = useState<(PlayerNote & { playerName?: string; playerId?: string })[]>([]);
  const [sentMessages, setSentMessages] = useState<(ScoutMessage & { playerName?: string })[]>([]);
  const [recruitmentRecords, setRecruitmentRecords] = useState<(RecruitmentRecord & { playerName?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<ScoutMessage["type"]>("general");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showRecruitmentModal, setShowRecruitmentModal] = useState(false);
  const [selectedRecruitmentPlayerId, setSelectedRecruitmentPlayerId] = useState<string | null>(null);
  const [recruitmentStage, setRecruitmentStage] = useState<RecruitmentStage>("interested");
  const [recruitmentNotes, setRecruitmentNotes] = useState("");
  const [savingRecruitment, setSavingRecruitment] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      const canView = hasPermission(currentUser.role, "scout_players");
      if (!canView) {
        setError("You don't have permission to access the scout dashboard");
      } else {
        loadData();
      }
    } else if (!isLoading && !isAuthenticated) {
      setError("Please login to access the scout dashboard");
    }
  }, [currentUser, isAuthenticated, isLoading, currentState?.id]);

  const loadData = async () => {
    if (!currentUser || !currentState) return;

    try {
      setLoading(true);
      setError(null);

      // Load watchlist
      const watchlistProfiles = await getWatchlist(currentUser.id, currentState.id);
      
      // Load user data for each profile
      const watchlistWithUsers = await Promise.all(
        watchlistProfiles.map(async (profile) => {
          try {
            const userDoc = await getDoc(doc(db, "users", profile.userId));
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              return { ...profile, user: userData };
            }
            return null;
          } catch (error) {
            console.error(`Error loading user for profile ${profile.id}:`, error);
            return null;
          }
        })
      );

      setWatchlist(
        watchlistWithUsers.filter((p) => p !== null) as (PlayerProfile & {
          userId: string;
          user: User;
        })[]
      );

      // Load saved searches
      const searches = await getSavedSearches(currentUser.id, currentState.id);
      setSavedSearches(searches);

      // Load player notes
      const notes = await getScoutNotes(currentUser.id, currentState.id);
      
      // Load player names for notes
      const notesWithPlayerNames = await Promise.all(
        notes.map(async (note) => {
          try {
            const userDoc = await getDoc(doc(db, "users", note.playerId));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              return { ...note, playerName: userData.name };
            }
            return { ...note, playerName: "Unknown Player" };
          } catch (error) {
            console.error(`Error loading player for note ${note.id}:`, error);
            return { ...note, playerName: "Unknown Player" };
          }
        })
      );
      setPlayerNotes(notesWithPlayerNames);

      // Load sent messages
      try {
        const messages = await getScoutSentMessages(currentUser.id, currentState.id);
        setSentMessages(messages);
      } catch (error) {
        console.error("Error loading sent messages:", error);
        setSentMessages([]);
      }

      // Load recruitment records
      try {
        const records = await getScoutRecruitmentRecords(currentUser.id, currentState.id);
        setRecruitmentRecords(records);
      } catch (error) {
        console.error("Error loading recruitment records:", error);
        setRecruitmentRecords([]);
      }
    } catch (error) {
      console.error("Error loading scout data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (!currentState) {
      window.toast?.error("State not available");
      return;
    }
    try {
      await deleteSavedSearch(searchId, currentState.id);
      setSavedSearches(savedSearches.filter((s) => s.id !== searchId));
      if (window.toast) {
        window.toast.success("Saved search deleted");
      }
    } catch (error) {
      console.error("Error deleting saved search:", error);
      if (window.toast) {
        window.toast.error("Failed to delete saved search");
      }
    }
  };

  const handleRunSavedSearch = async (search: SavedSearch) => {
    try {
      // Navigate to talent pool with search filters
      const params = new URLSearchParams();
      if (search.filters.position) params.append("position", search.filters.position);
      if (search.filters.state) params.append("state", search.filters.state);
      if (search.filters.city) params.append("city", search.filters.city);
      if (search.filters.minGoals) params.append("minGoals", search.filters.minGoals.toString());
      if (search.filters.minAssists) params.append("minAssists", search.filters.minAssists.toString());
      if (search.filters.minMatches) params.append("minMatches", search.filters.minMatches.toString());
      
      navigate(`/talent-pool?${params.toString()}`);
    } catch (error) {
      console.error("Error running saved search:", error);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">{error}</p>
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Scout Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Manage your watchlist, saved searches, and generate talent reports
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-dark-lighter rounded-xl shadow-xl p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-1 sm:gap-2 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "watchlist"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab("saved-searches")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "saved-searches"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Saved ({savedSearches.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "notes"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Notes ({playerNotes.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "messages"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Messages ({sentMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("recruitment")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "recruitment"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Recruitment ({recruitmentRecords.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-2 py-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "reports"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* Watchlist Tab */}
      {activeTab === "watchlist" && (
        <div className="space-y-6">
          {watchlist.length === 0 ? (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
              <p className="text-gray-400 mb-4">Your watchlist is empty</p>
              <p className="text-gray-500 text-sm mb-4">
                Start adding players to your watchlist from the Talent Pool
              </p>
              <button
                onClick={() => navigate("/talent-pool")}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                Browse Talent Pool
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {watchlist.map((player) => (
                  <div
                    key={player.id}
                    className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
                    onClick={() => navigate(`/player/${player.userId}`)}
                  >
                    {/* Player Image */}
                    <div className="aspect-video bg-gray-800 relative">
                      <img
                        src={
                          player.user.profileImage ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            player.user.name
                          )}&background=6366f1&color=fff&size=256`
                        }
                        alt={player.user.name}
                        className="w-full h-full object-cover"
                      />
                      {player.position && (
                        <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-medium">
                          {player.position}
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {player.user.name}
                      </h3>
                      {player.user.location && (
                        <p className="text-gray-400 text-sm mb-3">
                          {player.user.location.city}
                          {player.user.location.state &&
                            `, ${player.user.location.state}`}
                        </p>
                      )}

                      {/* Stats Preview */}
                      {player.stats && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-dark p-2 rounded text-center">
                            <p className="text-xs text-gray-400">Goals</p>
                            <p className="text-lg font-bold text-white">
                              {player.stats.goals || 0}
                            </p>
                          </div>
                          <div className="bg-dark p-2 rounded text-center">
                            <p className="text-xs text-gray-400">Assists</p>
                            <p className="text-lg font-bold text-white">
                              {player.stats.assists || 0}
                            </p>
                          </div>
                          <div className="bg-dark p-2 rounded text-center">
                            <p className="text-xs text-gray-400">Matches</p>
                            <p className="text-lg font-bold text-white">
                              {player.stats.matchesPlayed || 0}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* View Profile Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/player/${player.userId}`);
                        }}
                        className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Saved Searches Tab */}
      {activeTab === "saved-searches" && (
        <div className="space-y-4">
          {savedSearches.length === 0 ? (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
              <p className="text-gray-400 mb-4">No saved searches</p>
              <p className="text-gray-500 text-sm mb-4">
                Save search filters from the Talent Pool for quick access
              </p>
              <button
                onClick={() => navigate("/talent-pool")}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                Browse Talent Pool
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="bg-dark-lighter rounded-xl shadow-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {search.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                        {search.filters.position && (
                          <span className="bg-dark px-2 py-1 rounded">
                            Position: {search.filters.position}
                          </span>
                        )}
                        {search.filters.state && (
                          <span className="bg-dark px-2 py-1 rounded">
                            State: {search.filters.state}
                          </span>
                        )}
                        {search.filters.city && (
                          <span className="bg-dark px-2 py-1 rounded">
                            City: {search.filters.city}
                          </span>
                        )}
                        {search.filters.minGoals && (
                          <span className="bg-dark px-2 py-1 rounded">
                            Min Goals: {search.filters.minGoals}
                          </span>
                        )}
                        {search.filters.minAssists && (
                          <span className="bg-dark px-2 py-1 rounded">
                            Min Assists: {search.filters.minAssists}
                          </span>
                        )}
                        {search.filters.minMatches && (
                          <span className="bg-dark px-2 py-1 rounded">
                            Min Matches: {search.filters.minMatches}
                          </span>
                        )}
                      </div>
                      {search.lastUsed && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last used: {search.lastUsed.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunSavedSearch(search)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                      >
                        Run Search
                      </button>
                      <button
                        onClick={() => handleDeleteSavedSearch(search.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {playerNotes.length === 0 ? (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
              <p className="text-gray-400 mb-4">No notes yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Add notes about players from their profile pages
              </p>
              <button
                onClick={() => navigate("/talent-pool")}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                Browse Talent Pool
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {playerNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-dark-lighter rounded-xl shadow-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {note.playerName || "Unknown Player"}
                      </h3>
                      <div className="text-sm text-gray-400 mb-2">
                        <p>Updated: {note.updatedAt.toLocaleDateString()}</p>
                        {note.createdAt.getTime() !== note.updatedAt.getTime() && (
                          <p className="text-xs">Created: {note.createdAt.toLocaleDateString()}</p>
                        )}
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{note.note}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/player/${note.playerId}`)}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={async () => {
                          if (!currentState) {
                            window.toast?.error("State not available");
                            return;
                          }
                          if (confirm("Are you sure you want to delete this note?")) {
                            try {
                              await deletePlayerNote(note.id, currentState.id);
                              setPlayerNotes(playerNotes.filter((n) => n.id !== note.id));
                              if (window.toast) {
                                window.toast.success("Note deleted");
                              }
                            } catch (error) {
                              console.error("Error deleting note:", error);
                              if (window.toast) {
                                window.toast.error("Failed to delete note");
                              }
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Sent Messages</h2>
            <button
              onClick={() => {
                setSelectedPlayerId(null);
                setMessageSubject("");
                setMessageText("");
                setMessageType("general");
                setShowMessageModal(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
            >
              New Message
            </button>
          </div>
          {sentMessages.length === 0 ? (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
              <p className="text-gray-400 mb-4">No messages sent yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Start communicating with players from your watchlist
              </p>
              <button
                onClick={() => {
                  setSelectedPlayerId(null);
                  setMessageSubject("");
                  setMessageText("");
                  setMessageType("general");
                  setShowMessageModal(true);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                Send First Message
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sentMessages.map((message) => (
                <div
                  key={message.id}
                  className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {message.playerName || "Unknown Player"}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">{message.subject}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          message.type === "offer" ? "bg-green-600 text-white" :
                          message.type === "initial_contact" ? "bg-blue-600 text-white" :
                          "bg-gray-600 text-white"
                        }`}>
                          {message.type.replace("_", " ")}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          message.status === "read" ? "bg-green-600 text-white" :
                          message.status === "replied" ? "bg-primary text-white" :
                          "bg-gray-600 text-white"
                        }`}>
                          {message.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{message.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Sent: {message.createdAt.toLocaleDateString()}
                        {message.readAt && ` • Read: ${message.readAt.toLocaleDateString()}`}
                        {message.repliedAt && ` • Replied: ${message.repliedAt.toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/player/${message.playerId}`)}
                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm whitespace-nowrap"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recruitment Tab */}
      {activeTab === "recruitment" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Recruitment Pipeline</h2>
            <button
              onClick={() => {
                setSelectedRecruitmentPlayerId(null);
                setRecruitmentStage("interested");
                setRecruitmentNotes("");
                setShowRecruitmentModal(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
            >
              Add Player
            </button>
          </div>
          {recruitmentRecords.length === 0 ? (
            <div className="bg-dark-lighter rounded-xl shadow-xl p-12 text-center">
              <p className="text-gray-400 mb-4">No recruitment records yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Start tracking players through your recruitment process
              </p>
              <button
                onClick={() => {
                  setSelectedRecruitmentPlayerId(null);
                  setRecruitmentStage("interested");
                  setRecruitmentNotes("");
                  setShowRecruitmentModal(true);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
              >
                Start Recruitment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recruitmentRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">
                        {record.playerName || "Unknown Player"}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          record.stage === "signed" ? "bg-green-600 text-white" :
                          record.stage === "offer_accepted" ? "bg-green-500 text-white" :
                          record.stage === "offer_declined" || record.stage === "closed" ? "bg-red-600 text-white" :
                          record.stage === "offer_extended" ? "bg-yellow-600 text-white" :
                          "bg-primary text-white"
                        }`}>
                          {record.stage.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap">{record.notes}</p>
                      )}
                      {record.offerDetails && (
                        <div className="bg-dark rounded-lg p-3 mb-2">
                          <p className="text-sm text-gray-400 mb-1">Offer Details:</p>
                          <p className="text-white text-sm">Position: {record.offerDetails.position}</p>
                          {record.offerDetails.salary && (
                            <p className="text-white text-sm">Salary: ₦{record.offerDetails.salary.toLocaleString()}</p>
                          )}
                          {record.offerDetails.duration && (
                            <p className="text-white text-sm">Duration: {record.offerDetails.duration}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Updated: {record.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigate(`/player/${record.playerId}`)}
                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm whitespace-nowrap"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRecruitmentPlayerId(record.playerId);
                          setRecruitmentStage(record.stage);
                          setRecruitmentNotes(record.notes || "");
                          setShowRecruitmentModal(true);
                        }}
                        className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm whitespace-nowrap"
                      >
                        Update Stage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Talent Reports</h2>
            <p className="text-gray-400 mb-4">
              Generate comprehensive reports on players in your watchlist
            </p>
            <div className="space-y-4">
              <div className="bg-dark rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Watchlist Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Players</p>
                    <p className="text-2xl font-bold text-white">{watchlist.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">By Position</p>
                    <p className="text-2xl font-bold text-white">
                      {new Set(watchlist.map((p) => p.position).filter(Boolean)).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Goals</p>
                    <p className="text-2xl font-bold text-white">
                      {watchlist.length > 0
                        ? Math.round(
                            watchlist.reduce(
                              (sum, p) => sum + (p.stats?.goals || 0),
                              0
                            ) / watchlist.length
                          )
                        : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Assists</p>
                    <p className="text-2xl font-bold text-white">
                      {watchlist.length > 0
                        ? Math.round(
                            watchlist.reduce(
                              (sum, p) => sum + (p.stats?.assists || 0),
                              0
                            ) / watchlist.length
                          )
                        : 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-dark rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Top Performers
                </h3>
                <div className="space-y-2">
                  {watchlist
                    .sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
                    .slice(0, 5)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-2 bg-dark-lighter rounded-lg"
                      >
                        <span className="text-white">
                          {index + 1}. {player.user.name}
                        </span>
                        <span className="text-gray-400">
                          {player.stats?.goals || 0} goals
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 11: Export functionality */}
      {activeTab === "reports" && watchlist.length > 0 && (
        <div className="mt-6 bg-dark-lighter rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Export Data</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => {
                // Export watchlist as CSV
                const csv = [
                  ["Name", "Position", "Goals", "Assists", "Matches", "Location"].join(","),
                  ...watchlist.map((p) =>
                    [
                      `"${p.user.name}"`,
                      `"${p.position || ""}"`,
                      p.stats?.goals || 0,
                      p.stats?.assists || 0,
                      p.stats?.matchesPlayed || 0,
                      `"${p.user.location?.city || ""}, ${p.user.location?.state || ""}"`,
                    ].join(",")
                  ),
                ].join("\n");

                const blob = new Blob([csv], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `watchlist-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                if (window.toast) {
                  window.toast.success("Watchlist exported successfully");
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              Export Watchlist (CSV)
            </button>
            <button
              onClick={() => {
                // Export report as JSON
                const report = {
                  generatedAt: new Date().toISOString(),
                  totalPlayers: watchlist.length,
                  summary: {
                    totalGoals: watchlist.reduce((sum, p) => sum + (p.stats?.goals || 0), 0),
                    totalAssists: watchlist.reduce((sum, p) => sum + (p.stats?.assists || 0), 0),
                    totalMatches: watchlist.reduce((sum, p) => sum + (p.stats?.matchesPlayed || 0), 0),
                    positions: watchlist.reduce((acc, p) => {
                      const pos = p.position || "Unknown";
                      acc[pos] = (acc[pos] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  },
                  players: watchlist.map((p) => ({
                    name: p.user.name,
                    position: p.position,
                    stats: p.stats,
                    location: p.user.location,
                  })),
                };

                const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `scout-report-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                window.URL.revokeObjectURL(url);
                if (window.toast) {
                  window.toast.success("Report exported successfully");
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Export Report (JSON)
            </button>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Send Message to Player</h2>
            <div className="space-y-4">
              {!selectedPlayerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Player
                  </label>
                  <select
                    value={selectedPlayerId || ""}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a player from watchlist</option>
                    {watchlist.map((player) => (
                      <option key={player.userId} value={player.userId}>
                        {player.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as ScoutMessage["type"])}
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
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
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
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
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary min-h-[200px]"
                  placeholder="Enter your message..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  if (!selectedPlayerId || !messageSubject || !messageText || !currentUser || !currentState) {
                    if (window.toast) {
                      window.toast.error("Please fill in all fields");
                    }
                    return;
                  }
                  try {
                    setSendingMessage(true);
                    await sendScoutMessage(
                      currentUser.id,
                      selectedPlayerId,
                      messageSubject,
                      messageText,
                      currentState.id,
                      messageType
                    );
                    setShowMessageModal(false);
                    setSelectedPlayerId(null);
                    setMessageSubject("");
                    setMessageText("");
                    setMessageType("general");
                    // Reload messages
                    const messages = await getScoutSentMessages(currentUser.id, currentState.id);
                    setSentMessages(messages);
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
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50"
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedPlayerId(null);
                  setMessageSubject("");
                  setMessageText("");
                  setMessageType("general");
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recruitment Modal */}
      {showRecruitmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedRecruitmentPlayerId ? "Update Recruitment" : "Add Player to Recruitment"}
            </h2>
            <div className="space-y-4">
              {!selectedRecruitmentPlayerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Player
                  </label>
                  <select
                    value={selectedRecruitmentPlayerId || ""}
                    onChange={(e) => setSelectedRecruitmentPlayerId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a player from watchlist</option>
                    {watchlist.map((player) => (
                      <option key={player.userId} value={player.userId}>
                        {player.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stage
                </label>
                <select
                  value={recruitmentStage}
                  onChange={(e) => setRecruitmentStage(e.target.value as RecruitmentStage)}
                  className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
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
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary min-h-[150px]"
                  placeholder="Add notes about this recruitment..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  if (!selectedRecruitmentPlayerId || !currentUser || !currentState) {
                    if (window.toast) {
                      window.toast.error("Please select a player");
                    }
                    return;
                  }
                  try {
                    setSavingRecruitment(true);
                    if (selectedRecruitmentPlayerId) {
                      // Check if record exists
                      const existingRecord = recruitmentRecords.find(
                        (r) => r.playerId === selectedRecruitmentPlayerId
                      );
                      if (existingRecord) {
                        await updateRecruitmentStage(
                          existingRecord.id,
                          recruitmentStage,
                          recruitmentNotes,
                          currentState.id
                        );
                      } else {
                        await upsertRecruitmentRecord(
                          currentUser.id,
                          selectedRecruitmentPlayerId,
                          recruitmentStage,
                          recruitmentNotes,
                          currentState.id
                        );
                      }
                      setShowRecruitmentModal(false);
                      setSelectedRecruitmentPlayerId(null);
                      setRecruitmentStage("interested");
                      setRecruitmentNotes("");
                      // Reload records
                      const records = await getScoutRecruitmentRecords(currentUser.id, currentState.id);
                      setRecruitmentRecords(records);
                      if (window.toast) {
                        window.toast.success("Recruitment record saved");
                      }
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
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50"
              >
                {savingRecruitment ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowRecruitmentModal(false);
                  setSelectedRecruitmentPlayerId(null);
                  setRecruitmentStage("interested");
                  setRecruitmentNotes("");
                }}
                className="px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
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

export default ScoutDashboardPage;

