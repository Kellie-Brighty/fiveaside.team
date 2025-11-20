// Phase 11: Player Recruitment Page - View recruitment records from scouts
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  getPlayerRecruitmentRecords,
  type RecruitmentRecord,
} from "../services/scoutService";
import LoadingScreen from "../components/LoadingScreen";

const PlayerRecruitmentPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { currentState } = useStateContext();
  const [records, setRecords] = useState<(RecruitmentRecord & { scoutName?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && !isAuthLoading && currentState) {
      loadRecruitmentRecords();
    }
  }, [currentUser, isAuthLoading, currentState?.id]);

  const loadRecruitmentRecords = async () => {
    if (!currentUser || !currentState) return;

    try {
      setLoading(true);
      const fetchedRecords = await getPlayerRecruitmentRecords(currentUser.id, currentState.id);
      setRecords(fetchedRecords);
    } catch (error) {
      console.error("Error loading recruitment records:", error);
      window.toast?.error("Failed to load recruitment records");
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "signed":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "offer_extended":
        return "bg-primary/20 text-primary border-primary/50";
      case "offer_accepted":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "trial_scheduled":
      case "trial_completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "contacted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getStageLabel = (stage: string) => {
    return stage.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (date: Date | any): string => {
    if (!date) return "Invalid Date";
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString();
    }
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return "Invalid Date";
      return parsedDate.toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  if (isAuthLoading || loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400">Please login to view your recruitment status.</p>
        </div>
      </div>
    );
  }

  const activeRecords = records.filter(r => r.stage !== "closed");
  const closedRecords = records.filter(r => r.stage === "closed");

  return (
    <div className="min-h-screen bg-dark p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Recruitment Status
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Track your recruitment progress with different scouts and organizations
          </p>
        </div>

        {records.length === 0 ? (
          <div className="bg-dark-lighter rounded-xl shadow-xl p-6 sm:p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-white mb-2">No Active Recruitment</h2>
            <p className="text-gray-400">
              When scouts express interest in recruiting you, their recruitment processes will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Records */}
            {activeRecords.length > 0 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                  Active Recruitment ({activeRecords.length})
                </h2>
                <div className="space-y-4">
                  {activeRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-3">
                            <h3 className="text-lg sm:text-xl font-bold text-white">
                              {record.scoutName || "Unknown Scout"}
                            </h3>
                            <span className={`text-xs sm:text-sm px-3 py-1 rounded-full border ${getStageColor(record.stage)}`}>
                              {getStageLabel(record.stage)}
                            </span>
                          </div>
                          
                          {record.notes && (
                            <div className="bg-dark p-3 rounded-lg mb-3">
                              <p className="text-gray-300 text-sm sm:text-base whitespace-pre-wrap">
                                {record.notes}
                              </p>
                            </div>
                          )}

                          {record.offerDetails && (
                            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg mb-3">
                              <h4 className="text-sm font-medium text-primary mb-2">Offer Details</h4>
                              <div className="space-y-2">
                                {record.offerDetails.salary && (
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-gray-400">Salary:</span> {record.offerDetails.salary}
                                  </p>
                                )}
                                {record.offerDetails.duration && (
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-gray-400">Duration:</span> {record.offerDetails.duration}
                                  </p>
                                )}
                                {record.offerDetails.benefits && (
                                  <p className="text-gray-300 text-sm">
                                    <span className="text-gray-400">Benefits:</span> {record.offerDetails.benefits}
                                  </p>
                                )}
                                {record.offerDetails.expirationDate && (
                                  <p className="text-gray-400 text-xs mt-2">
                                    Offer expires: {formatDate(record.offerDetails.expirationDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {record.stageHistory && record.stageHistory.length > 0 && (
                            <div className="mt-4">
                              <button
                                onClick={() => setSelectedRecord(selectedRecord === record.id ? null : record.id)}
                                className="text-sm text-primary hover:text-primary/80 transition-colors"
                              >
                                {selectedRecord === record.id ? "Hide" : "View"} Timeline
                              </button>
                              
                              {selectedRecord === record.id && (
                                <div className="mt-3 space-y-2">
                                  {record.stageHistory.map((history, index) => (
                                    <div key={index} className="bg-dark p-3 rounded-lg border-l-2 border-primary">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-300">
                                          {getStageLabel(history.stage)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(history.changedAt)}
                                        </span>
                                      </div>
                                      {history.notes && (
                                        <p className="text-xs text-gray-400 mt-1">{history.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 mt-4">
                            <span>
                              Started: {formatDate(record.createdAt)}
                            </span>
                            <span>
                              Last updated: {formatDate(record.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Closed Records */}
            {closedRecords.length > 0 && (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                  Closed Recruitment ({closedRecords.length})
                </h2>
                <div className="space-y-4">
                  {closedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 border border-gray-700 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="text-base sm:text-lg font-bold text-white">
                              {record.scoutName || "Unknown Scout"}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full border ${getStageColor(record.stage)}`}>
                              {getStageLabel(record.stage)}
                            </span>
                          </div>
                          {record.notes && (
                            <p className="text-gray-400 text-sm mb-2 whitespace-pre-wrap">
                              {record.notes}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">
                            Closed: {formatDate(record.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerRecruitmentPage;

