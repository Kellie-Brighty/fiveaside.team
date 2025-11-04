// Phase 11: Player Messages Page - View messages from scouts
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getPlayerReceivedMessages,
  markMessageAsRead,
  replyToScoutMessage,
  getMessageReplies,
  type ScoutMessage,
} from "../services/scoutService";
import LoadingScreen from "../components/LoadingScreen";

const PlayerMessagesPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [messages, setMessages] = useState<(ScoutMessage & { scoutName?: string; scoutOrganization?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [messageReplies, setMessageReplies] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      loadMessages();
    }
  }, [currentUser, isAuthLoading]);

  const loadMessages = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const fetchedMessages = await getPlayerReceivedMessages(currentUser.id);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      window.toast?.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (messageId: string) => {
    if (selectedMessage === messageId) {
      setSelectedMessage(null);
      return;
    }

    setSelectedMessage(messageId);
    
    // Mark as read if not already
    const message = messages.find(m => m.id === messageId);
    if (message && message.status === "sent") {
      try {
        await markMessageAsRead(messageId);
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, status: "read" as const, readAt: new Date() } : m
        ));
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    }

    // Load replies
    try {
      const replies = await getMessageReplies(messageId);
      setMessageReplies(prev => ({ ...prev, [messageId]: replies }));
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  const handleReplyToMessage = async () => {
    if (!selectedMessage || !currentUser || !replyText.trim()) return;

    const message = messages.find(m => m.id === selectedMessage);
    if (!message) return;

    try {
      setSendingReply(true);
      await replyToScoutMessage(selectedMessage, currentUser.id, message.scoutId, replyText);
      
      // Update message status
      setMessages(prev => prev.map(m => 
        m.id === selectedMessage ? { ...m, status: "replied" as const, repliedAt: new Date() } : m
      ));
      
      // Reload replies
      const replies = await getMessageReplies(selectedMessage);
      setMessageReplies(prev => ({ ...prev, [selectedMessage]: replies }));
      
      setReplyText("");
      setShowReplyModal(false);
      window.toast?.success("Reply sent successfully");
    } catch (error) {
      console.error("Error sending reply:", error);
      window.toast?.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  if (isAuthLoading || loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400">Please login to view your messages.</p>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter(m => m.status === "sent").length;

  return (
    <div className="min-h-screen bg-dark p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Messages from Scouts
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            {unreadCount > 0 ? (
              <span className="text-primary">{unreadCount} unread {unreadCount === 1 ? "message" : "messages"}</span>
            ) : (
              "View and reply to messages from talent scouts"
            )}
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6 sm:p-8 text-center">
            <div className="text-6xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-white mb-2">No Messages Yet</h2>
            <p className="text-gray-400">
              When scouts reach out to you, their messages will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 border ${
                  message.status === "sent" ? "border-primary/50" : "border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {message.scoutName || "Unknown Scout"}
                      </h3>
                      {message.scoutOrganization && (
                        <span className="text-sm text-gray-400">
                          {message.scoutOrganization}
                        </span>
                      )}
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {message.type.replace("_", " ")}
                      </span>
                      {message.status === "sent" && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                          New
                        </span>
                      )}
                      {message.status === "replied" && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          Replied
                        </span>
                      )}
                    </div>
                    <h4 className="text-base sm:text-lg font-medium text-gray-300 mb-2">
                      {message.subject}
                    </h4>
                    <p className="text-gray-300 text-sm sm:text-base whitespace-pre-wrap mb-3">
                      {message.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500">
                      <span>
                        {message.createdAt instanceof Date
                          ? message.createdAt.toLocaleDateString()
                          : new Date(message.createdAt).toLocaleDateString()}
                      </span>
                      {message.readAt && (
                        <span>
                          Read: {message.readAt instanceof Date
                            ? message.readAt.toLocaleDateString()
                            : new Date(message.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedMessage === message.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-300 mb-3">Message Details:</h5>
                    
                    {/* Original Message */}
                    <div className="bg-dark p-4 rounded-lg mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">From: {message.scoutName || "Unknown Scout"}</span>
                        <span className="text-xs text-gray-500">
                          {message.createdAt instanceof Date
                            ? message.createdAt.toLocaleDateString()
                            : new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-300 mb-1">{message.subject}</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{message.message}</p>
                    </div>

                    {/* Replies Section */}
                    <h6 className="text-sm font-medium text-gray-300 mb-2">Your Replies:</h6>
                    {messageReplies[message.id] && messageReplies[message.id].length > 0 ? (
                      <div className="space-y-3">
                        {messageReplies[message.id].map((reply) => (
                          <div key={reply.id} className="bg-dark p-3 rounded-lg border-l-2 border-primary">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Your reply</span>
                              <span className="text-xs text-gray-500">
                                {reply.createdAt instanceof Date
                                  ? reply.createdAt.toLocaleDateString()
                                  : new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm">{reply.reply}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No replies yet</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleViewMessage(message.id)}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {selectedMessage === message.id ? "Hide Details" : "View Details"}
                  </button>
                  {message.status !== "replied" && (
                    <button
                      onClick={() => {
                        setSelectedMessage(message.id);
                        setShowReplyModal(true);
                      }}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Reply to Message</h2>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
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
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="w-full h-32 bg-dark border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyText("");
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplyToMessage}
                  disabled={!replyText.trim() || sendingReply}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerMessagesPage;

