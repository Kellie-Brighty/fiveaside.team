// Phase 4.3: Transfer Service for player transfer/registration workflow
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { getStateCollection, getStateDocument, COLLECTION_NAMES } from "../utils/stateService";
import type { TransferRequest, User } from "../types";
import { getClub, addPlayerToRoster } from "./clubService";

/**
 * Helper to safely convert Firestore timestamp to Date
 */
const toDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return undefined;
};

/**
 * Helper to remove undefined values from object (Firestore doesn't accept undefined)
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date || obj instanceof Timestamp || obj instanceof Array) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof Timestamp) &&
        !(value instanceof Array)
      ) {
        const cleanedNested = removeUndefined(value);
        // Only include nested object if it has properties
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

/**
 * Create a transfer request (player requests to join club)
 */
export const createTransferRequest = async (
  playerId: string,
  clubId: string,
  stateId: string,
  data?: {
    position?: string;
    jerseyNumber?: number;
    message?: string;
  }
): Promise<TransferRequest> => {
  try {
    // Check if player is already in the club
    const club = await getClub(clubId, stateId);
    if (!club) {
      throw new Error("Club not found");
    }

    if (club.playerIds.includes(playerId)) {
      throw new Error("Player is already in this club");
    }

    // Check if there's already a pending request
    const existingRequest = await getTransferRequestByPlayerAndClub(
      playerId,
      clubId,
      stateId
    );
    if (existingRequest && existingRequest.status === "pending") {
      throw new Error("You already have a pending request for this club");
    }

    const newRequestRef = getStateDocument(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId);

    const request: TransferRequest = {
      id: newRequestRef.id,
      playerId,
      clubId,
      status: "pending",
      position: data?.position,
      jerseyNumber: data?.jerseyNumber,
      message: data?.message,
      requestedAt: new Date(),
    };

    await setDoc(newRequestRef, {
      ...request,
      requestedAt: serverTimestamp(),
    });

    return request;
  } catch (error) {
    console.error("Error creating transfer request:", error);
    throw error;
  }
};

/**
 * Get transfer request by ID
 */
export const getTransferRequest = async (
  requestId: string,
  stateId: string
): Promise<TransferRequest | null> => {
  try {
    const requestDoc = await getDoc(getStateDocument(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId, requestId));

    if (!requestDoc.exists()) {
      return null;
    }

    const data = requestDoc.data();
    return {
      id: requestDoc.id,
      ...data,
      requestedAt: toDate(data.requestedAt) || new Date(),
      reviewedAt: toDate(data.reviewedAt),
    } as TransferRequest;
  } catch (error) {
    console.error("Error getting transfer request:", error);
    throw error;
  }
};

/**
 * Get transfer request by player and club
 */
export const getTransferRequestByPlayerAndClub = async (
  playerId: string,
  clubId: string,
  stateId: string
): Promise<TransferRequest | null> => {
  try {
    const requestsQuery = query(
      getStateCollection(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId),
      where("playerId", "==", playerId),
      where("clubId", "==", clubId),
      orderBy("requestedAt", "desc")
    );

    const querySnapshot = await getDocs(requestsQuery);
    if (querySnapshot.empty) {
      return null;
    }

    const requestDoc = querySnapshot.docs[0];
    const data = requestDoc.data();
    return {
      id: requestDoc.id,
      ...data,
      requestedAt: toDate(data.requestedAt) || new Date(),
      reviewedAt: toDate(data.reviewedAt),
    } as TransferRequest;
  } catch (error) {
    console.error("Error getting transfer request:", error);
    throw error;
  }
};

/**
 * Get all transfer requests for a club
 */
export const getTransferRequestsByClub = async (
  clubId: string,
  stateId: string,
  status?: "pending" | "approved" | "rejected" | "cancelled"
): Promise<TransferRequest[]> => {
  try {
    let requestsQuery = query(
      getStateCollection(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId),
      where("clubId", "==", clubId),
      orderBy("requestedAt", "desc")
    );

    if (status) {
      requestsQuery = query(
        getStateCollection(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId),
        where("clubId", "==", clubId),
        where("status", "==", status),
        orderBy("requestedAt", "desc")
      );
    }

    const querySnapshot = await getDocs(requestsQuery);
    const requests: TransferRequest[] = [];

    querySnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      requests.push({
        id: requestDoc.id,
        ...data,
        requestedAt: toDate(data.requestedAt) || new Date(),
        reviewedAt: toDate(data.reviewedAt),
      } as TransferRequest);
    });

    return requests;
  } catch (error) {
    console.error("Error getting transfer requests:", error);
    throw error;
  }
};

/**
 * Get all transfer requests by a player
 */
export const getTransferRequestsByPlayer = async (
  playerId: string,
  stateId: string
): Promise<TransferRequest[]> => {
  try {
    const requestsQuery = query(
      getStateCollection(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId),
      where("playerId", "==", playerId),
      orderBy("requestedAt", "desc")
    );

    const querySnapshot = await getDocs(requestsQuery);
    const requests: TransferRequest[] = [];

    querySnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      requests.push({
        id: requestDoc.id,
        ...data,
        requestedAt: toDate(data.requestedAt) || new Date(),
        reviewedAt: toDate(data.reviewedAt),
      } as TransferRequest);
    });

    return requests;
  } catch (error) {
    console.error("Error getting transfer requests:", error);
    throw error;
  }
};

/**
 * Approve transfer request
 */
export const approveTransferRequest = async (
  requestId: string,
  reviewerId: string,
  stateId: string,
  rosterData: {
    position: string;
    jerseyNumber?: number;
  }
): Promise<void> => {
  try {
    const request = await getTransferRequest(requestId, stateId);
    if (!request) {
      throw new Error("Transfer request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Fetch player data to get player name (users collection is global)
    const playerDoc = await getDoc(doc(db, "users", request.playerId));
    if (!playerDoc.exists()) {
      throw new Error("Player not found");
    }
    const playerData = playerDoc.data() as User;
    const playerName = playerData.name || "Unknown Player";

    // Add player to club roster
    await addPlayerToRoster(request.clubId, {
      userId: request.playerId,
      playerName,
      position: rosterData.position,
      jerseyNumber: rosterData.jerseyNumber,
    }, stateId);

    // Update request status (remove undefined values)
    const updateData = removeUndefined({
      status: "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
      position: rosterData.position,
      jerseyNumber: rosterData.jerseyNumber,
    });

    await updateDoc(getStateDocument(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId, requestId), updateData);
  } catch (error) {
    console.error("Error approving transfer request:", error);
    throw error;
  }
};

/**
 * Reject transfer request
 */
export const rejectTransferRequest = async (
  requestId: string,
  reviewerId: string,
  stateId: string,
  reason?: string
): Promise<void> => {
  try {
    const request = await getTransferRequest(requestId, stateId);
    if (!request) {
      throw new Error("Transfer request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Update request status (remove undefined values)
    const updateData = removeUndefined({
      status: "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
      rejectionReason: reason,
    });

    await updateDoc(getStateDocument(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId, requestId), updateData);
  } catch (error) {
    console.error("Error rejecting transfer request:", error);
    throw error;
  }
};

/**
 * Cancel transfer request (by player)
 */
export const cancelTransferRequest = async (
  requestId: string,
  stateId: string
): Promise<void> => {
  try {
    const request = await getTransferRequest(requestId, stateId);
    if (!request) {
      throw new Error("Transfer request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled");
    }

    await updateDoc(getStateDocument(COLLECTION_NAMES.TRANSFER_REQUESTS, stateId, requestId), {
      status: "cancelled",
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error cancelling transfer request:", error);
    throw error;
  }
};

