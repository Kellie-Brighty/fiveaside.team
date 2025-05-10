import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  increment,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";

interface FundRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
}

const FundRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [requestToProcess, setRequestToProcess] = useState<{
    request: FundRequest | null;
    action: "approved" | "rejected" | null;
  }>({ request: null, action: null });

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, "fundRequests");

      // Create query based on filter status
      let requestsQuery;
      if (filterStatus === "all") {
        requestsQuery = query(requestsRef, orderBy("createdAt", "desc"));
      } else {
        requestsQuery = query(
          requestsRef,
          where("status", "==", filterStatus),
          orderBy("createdAt", "desc")
        );
      }

      const querySnapshot = await getDocs(requestsQuery);

      const requestsList: FundRequest[] = [];
      for (const docSnap of querySnapshot.docs) {
        const requestData = docSnap.data();

        // Get user data
        let userName = "Unknown User";
        let userEmail = "";

        try {
          const userDocRef = doc(db, "users", requestData.userId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userName = userData.name || "Unnamed User";
            userEmail = userData.email || "";
          }
        } catch (err) {
          console.error(
            `Error fetching user data for request ${docSnap.id}:`,
            err
          );
        }

        requestsList.push({
          id: docSnap.id,
          userName,
          userEmail,
          ...requestData,
          createdAt: requestData.createdAt?.toDate() || new Date(),
          processedAt: requestData.processedAt?.toDate() || undefined,
        } as FundRequest);
      }

      setRequests(requestsList);
    } catch (err) {
      console.error("Error fetching fund requests:", err);
      setError("Failed to load fund requests. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const openConfirmationModal = (
    request: FundRequest,
    action: "approved" | "rejected"
  ) => {
    setRequestToProcess({ request, action });
    setConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(false);
    setRequestToProcess({ request: null, action: null });
  };

  const processRequest = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      setProcessingId(requestId);

      // Get the request
      const requestRef = doc(db, "fundRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error("Request not found");
      }

      const requestData = requestSnap.data();

      // Update request status
      await updateDoc(requestRef, {
        status,
        processedAt: new Date(),
      });

      // If approved, update user balance
      if (status === "approved") {
        const userRef = doc(db, "users", requestData.userId);
        await updateDoc(userRef, {
          balance: increment(requestData.amount),
        });
      }

      // Update the local state
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status, processedAt: new Date() }
            : req
        )
      );

      // Show success toast
      window.toast?.success(
        `Request ${
          status === "approved" ? "approved" : "rejected"
        } successfully`
      );
    } catch (err) {
      console.error(`Error ${status} request:`, err);
      window.toast?.error(`Failed to ${status} request. Please try again.`);
    } finally {
      setProcessingId(null);
      closeConfirmationModal();
    }
  };

  const handleConfirmAction = () => {
    if (!requestToProcess.request || !requestToProcess.action) return;
    processRequest(requestToProcess.request.id, requestToProcess.action);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Test Fund Requests</h1>
        <p className="text-gray-400">Manage test fund requests from users</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="admin-card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button
            onClick={() => fetchRequests()}
            className="w-full sm:w-auto px-4 py-2 bg-dark hover:bg-dark-light rounded-lg transition-colors flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 mr-2 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-1">
              No Fund Requests Found
            </h3>
            <p className="text-gray-400">
              {filterStatus !== "all"
                ? `There are no ${filterStatus} fund requests`
                : "There are no fund requests in the system yet"}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead className="bg-dark">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Requested At
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-dark">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">
                            {request.userName?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {request.userName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {request.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ₦{request.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(request.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : request.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {request.status === "pending" ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() =>
                              openConfirmationModal(request, "approved")
                            }
                            disabled={processingId === request.id}
                            className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {processingId === request.id ? (
                              <svg
                                className="animate-spin h-4 w-4 mr-1"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
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
                            ) : (
                              "Approve"
                            )}
                          </button>
                          <button
                            onClick={() =>
                              openConfirmationModal(request, "rejected")
                            }
                            disabled={processingId === request.id}
                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {request.processedAt
                            ? `Processed on ${new Date(
                                request.processedAt
                              ).toLocaleDateString()}`
                            : "Processed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && requestToProcess.request && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-dark-lighter rounded-lg p-6 max-w-md w-full">
            <div className="mb-4 text-center">
              <div
                className={`mx-auto w-12 h-12 ${
                  requestToProcess.action === "approved"
                    ? "bg-green-500/20"
                    : "bg-red-500/20"
                } rounded-full flex items-center justify-center mb-4`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${
                    requestToProcess.action === "approved"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {requestToProcess.action === "approved" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  )}
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">
                Confirm{" "}
                {requestToProcess.action === "approved"
                  ? "Approval"
                  : "Rejection"}
              </h3>
              <p className="text-gray-400">
                {requestToProcess.action === "approved"
                  ? `Are you sure you want to approve this fund request of ₦${requestToProcess.request.amount.toLocaleString()} for ${
                      requestToProcess.request.userName
                    }?`
                  : `Are you sure you want to reject this fund request of ₦${requestToProcess.request.amount.toLocaleString()} for ${
                      requestToProcess.request.userName
                    }?`}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmationModal}
                className="px-4 py-2 bg-dark text-white rounded-md hover:bg-dark-light"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={processingId !== null}
                className={`px-4 py-2 text-white rounded-md flex items-center ${
                  requestToProcess.action === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {processingId ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
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
                    Processing...
                  </>
                ) : (
                  `Confirm ${
                    requestToProcess.action === "approved"
                      ? "Approval"
                      : "Rejection"
                  }`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundRequestsPage;
