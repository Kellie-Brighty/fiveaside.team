import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

interface Pitch {
  id: string;
  name: string;
  location?: string;
  city?: string;
  state?: string;
  boostData?: {
    isActive: boolean;
    boostType: string;
    startDate: Timestamp | Date | null;
    endDate: Timestamp | Date | null;
    transactionRef?: string;
    lastPaymentDate?: Timestamp | Date | null;
    content?: {
      text?: string;
      imageUrl?: string;
    };
    targetLocation?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
}

const BoostedPitchesPage: React.FC = () => {
  const [boostedPitches, setBoostedPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    pitchId: string;
    pitchName: string;
  }>({ show: false, pitchId: "", pitchName: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState(true);

  useEffect(() => {
    fetchBoostedPitches();
  }, []);

  const fetchBoostedPitches = async () => {
    setLoading(true);
    try {
      // Query pitches with active boosts
      const pitchesCollection = collection(db, "pitches");
      const pitchesSnapshot = await getDocs(pitchesCollection);

      const boostedPitchesList: Pitch[] = [];

      // Process each pitch to check for boost data
      const promises = pitchesSnapshot.docs.map(async (pitchDoc) => {
        const pitchData = pitchDoc.data() as Pitch;
        pitchData.id = pitchDoc.id;

        // If pitch has boost data
        if (pitchData.boostData) {
          // Get owner info
          if (pitchData.ownerId) {
            try {
              const userDoc = await getDocs(
                query(
                  collection(db, "users"),
                  where("id", "==", pitchData.ownerId)
                )
              );

              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                pitchData.ownerName = userData.name || "Unknown";
                pitchData.ownerEmail = userData.email || "No email";
              }
            } catch (error) {
              console.error("Error fetching owner data", error);
            }
          }

          boostedPitchesList.push(pitchData);
        }
      });

      await Promise.all(promises);

      // Sort by most recent boost
      boostedPitchesList.sort((a, b) => {
        const aDate = a.boostData?.startDate
          ? a.boostData.startDate instanceof Date
            ? a.boostData.startDate
            : a.boostData.startDate.toDate()
          : new Date(0);

        const bDate = b.boostData?.startDate
          ? b.boostData.startDate instanceof Date
            ? b.boostData.startDate
            : b.boostData.startDate.toDate()
          : new Date(0);

        return bDate.getTime() - aDate.getTime();
      });

      setBoostedPitches(boostedPitchesList);
    } catch (error) {
      console.error("Error fetching boosted pitches:", error);
      window.toast?.error("Failed to load boosted pitches");
    } finally {
      setLoading(false);
    }
  };

  const showDeleteConfirmation = (pitchId: string, pitchName: string) => {
    setConfirmModal({
      show: true,
      pitchId,
      pitchName,
    });
  };

  const cancelDelete = () => {
    setConfirmModal({
      show: false,
      pitchId: "",
      pitchName: "",
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.pitchId) return;

    try {
      const pitchRef = doc(db, "pitches", confirmModal.pitchId);

      // Instead of deleting the boost, we deactivate it
      await updateDoc(pitchRef, {
        "boostData.isActive": false,
      });

      // Update the local state
      setBoostedPitches((prevPitches) =>
        prevPitches.map((pitch) => {
          if (pitch.id === confirmModal.pitchId && pitch.boostData) {
            return {
              ...pitch,
              boostData: {
                ...pitch.boostData,
                isActive: false,
              },
            };
          }
          return pitch;
        })
      );

      window.toast?.success(
        `Successfully removed boost from ${confirmModal.pitchName}`
      );
    } catch (error) {
      console.error("Error removing boost:", error);
      window.toast?.error("Failed to remove boost");
    } finally {
      cancelDelete();
    }
  };

  // Filtering functions
  const getFilteredPitches = () => {
    return boostedPitches.filter((pitch) => {
      // Apply search filter
      const matchesSearch =
        pitch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pitch.city &&
          pitch.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pitch.ownerName &&
          pitch.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (pitch.ownerEmail &&
          pitch.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()));

      // Apply active/inactive filter
      const matchesActiveFilter = filterActive
        ? pitch.boostData?.isActive
        : !pitch.boostData?.isActive;

      return matchesSearch && matchesActiveFilter;
    });
  };

  // Format date helper
  const formatDate = (date: Date | Timestamp | null | undefined) => {
    if (!date) return "N/A";

    const dateObj = date instanceof Date ? date : date.toDate();

    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get boost type name and price
  const getBoostTypeDetails = (boostType: string) => {
    switch (boostType) {
      case "basic":
        return { name: "City Boost", price: 2000 };
      case "standard":
        return { name: "Regional Boost", price: 5000 };
      case "premium":
        return { name: "National Boost", price: 10000 };
      default:
        return { name: boostType, price: 0 };
    }
  };

  // Check if a boost is expired
  const isBoostExpired = (endDate: Date | Timestamp | null) => {
    if (!endDate) return true;

    const endDateTime = endDate instanceof Date ? endDate : endDate.toDate();

    return endDateTime < new Date();
  };

  // Calculate total revenue from all boosts
  const calculateTotalRevenue = () => {
    let totalRevenue = 0;

    boostedPitches.forEach((pitch) => {
      if (pitch.boostData?.boostType) {
        const { price } = getBoostTypeDetails(pitch.boostData.boostType);

        // Calculate days between start and end date
        if (pitch.boostData.startDate && pitch.boostData.endDate) {
          const startDate =
            pitch.boostData.startDate instanceof Date
              ? pitch.boostData.startDate
              : pitch.boostData.startDate.toDate();

          const endDate =
            pitch.boostData.endDate instanceof Date
              ? pitch.boostData.endDate
              : pitch.boostData.endDate.toDate();

          // Calculate days difference
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Add to total revenue (price per day * number of days)
          totalRevenue += price * Math.max(1, diffDays);
        } else {
          // If no dates available, assume at least 1 day
          totalRevenue += price;
        }
      }
    });

    return totalRevenue;
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        Manage Boosted Pitches
      </h1>

      {/* Revenue Stats Card */}
      <div className="bg-dark-lighter rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-300 mb-1">
              Total Revenue from Boosts
            </h2>
            <p className="text-sm text-gray-400 mb-2">
              All time earnings from pitch boosts
            </p>
          </div>
          <div className="mt-3 md:mt-0 bg-green-900/30 py-3 px-6 rounded-lg border border-green-800">
            <p className="text-3xl font-bold text-green-500">
              ₦{calculateTotalRevenue().toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-between text-xs text-gray-400">
          <p>Based on {boostedPitches.length} total boosts</p>
          <p>
            Active boosts:{" "}
            {
              boostedPitches.filter(
                (pitch) =>
                  pitch.boostData?.isActive &&
                  !isBoostExpired(pitch.boostData?.endDate || null)
              ).length
            }
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-dark-lighter rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search by name, city, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-dark rounded-lg border border-gray-700 text-white"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-400">Status:</label>
            <select
              value={filterActive ? "active" : "inactive"}
              onChange={(e) => setFilterActive(e.target.value === "active")}
              className="bg-dark rounded-lg border border-gray-700 px-3 py-2 text-white"
            >
              <option value="active">Active Boosts</option>
              <option value="inactive">Inactive Boosts</option>
            </select>
          </div>

          <button
            onClick={fetchBoostedPitches}
            className="bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white flex items-center justify-center hover:bg-dark-light"
          >
            <svg
              className="h-5 w-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center my-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      )}

      {/* No results */}
      {!loading && getFilteredPitches().length === 0 && (
        <div className="bg-dark-lighter rounded-lg p-8 text-center">
          <svg
            className="h-16 w-16 mx-auto text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">
            No Boosted Pitches Found
          </h3>
          <p className="text-gray-400">
            {searchQuery
              ? `No results match your search for "${searchQuery}"`
              : filterActive
              ? "No active boost promotions found"
              : "No inactive boost promotions found"}
          </p>
        </div>
      )}

      {/* Pitches list */}
      {!loading && getFilteredPitches().length > 0 && (
        <div className="bg-dark-lighter rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Pitch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Boost Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {getFilteredPitches().map((pitch) => {
                  const isExpired = isBoostExpired(
                    pitch.boostData?.endDate || null
                  );
                  const isActive = pitch.boostData?.isActive && !isExpired;

                  return (
                    <tr key={pitch.id} className="hover:bg-dark-light/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {pitch.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {pitch.city || pitch.location || "Unknown location"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {pitch.ownerName || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {pitch.ownerEmail || "No email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {
                          getBoostTypeDetails(pitch.boostData?.boostType || "")
                            .name
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(pitch.boostData?.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(pitch.boostData?.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isActive && (
                          <button
                            onClick={() =>
                              showDeleteConfirmation(pitch.id, pitch.name)
                            }
                            className="text-red-400 hover:text-red-500"
                          >
                            Delete Boost
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Confirm Boost Deletion
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove the boost from{" "}
              <strong>{confirmModal.pitchName}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-dark hover:bg-dark-light text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete Boost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoostedPitchesPage;
