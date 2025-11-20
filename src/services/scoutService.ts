// Phase 11: Scout Service for Firestore operations
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getStateCollection, getStateDocument, COLLECTION_NAMES } from "../utils/stateService";
import { getPlayerProfile } from "./playerProfileService";
import type { User, PlayerProfile } from "../types";

/**
 * Helper to convert Firestore Timestamp to Date
 */
const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value.seconds) {
    return new Date(value.seconds * 1000);
  }

  return new Date(value);
};

/**
 * Helper to remove undefined values from objects
 */
const removeUndefined = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value.toDate && typeof value.toDate === "function")) {
        cleaned[key] = removeUndefined(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// ==================== Watchlist Operations ====================

/**
 * Add player to scout's watchlist
 */
export const addToWatchlist = async (
  scoutId: string,
  playerId: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", scoutId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data() as User;
    const currentWatchlist = userData.watchlists || [];

    if (currentWatchlist.includes(playerId)) {
      return; // Already in watchlist
    }

    await updateDoc(userRef, {
      watchlists: [...currentWatchlist, playerId],
    });
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw error;
  }
};

/**
 * Remove player from scout's watchlist
 */
export const removeFromWatchlist = async (
  scoutId: string,
  playerId: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", scoutId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data() as User;
    const currentWatchlist = userData.watchlists || [];

    await updateDoc(userRef, {
      watchlists: currentWatchlist.filter((id) => id !== playerId),
    });
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw error;
  }
};

/**
 * Get scout's watchlist with player profiles
 * @param scoutId - The scout user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getWatchlist = async (
  scoutId: string,
  stateId: string
): Promise<(PlayerProfile & { userId: string; user: User })[]> => {
  try {
    const userRef = doc(db, "users", scoutId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as User;
    const watchlistIds = userData.watchlists || [];

    if (watchlistIds.length === 0) {
      return [];
    }

    // Load player profiles and user data
    const watchlistItems = await Promise.all(
      watchlistIds.map(async (playerId) => {
        try {
          const playerUserDoc = await getDoc(doc(db, "users", playerId));
          if (!playerUserDoc.exists()) {
            return null;
          }

          const playerUser = { id: playerUserDoc.id, ...playerUserDoc.data() } as User;
          
          // Get player profile using state-specific service
          const profile = await getPlayerProfile(playerId, stateId);
          
          if (!profile) {
            return null;
          }

          return {
            ...profile,
            userId: playerId,
            user: playerUser,
          } as PlayerProfile & { userId: string; user: User };
        } catch (error) {
          console.error(`Error loading player ${playerId}:`, error);
          return null;
        }
      })
    );

    return watchlistItems.filter((item) => item !== null) as (PlayerProfile & {
      userId: string;
      user: User;
    })[];
  } catch (error) {
    console.error("Error getting watchlist:", error);
    throw error;
  }
};

/**
 * Check if player is in scout's watchlist
 */
export const isInWatchlist = async (
  scoutId: string,
  playerId: string
): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", scoutId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data() as User;
    const watchlist = userData.watchlists || [];
    return watchlist.includes(playerId);
  } catch (error) {
    console.error("Error checking watchlist:", error);
    return false;
  }
};

// ==================== Saved Search Operations ====================

export interface SavedSearch {
  id: string;
  scoutId: string;
  name: string;
  filters: {
    position?: string;
    state?: string;
    city?: string;
    minGoals?: number;
    minAssists?: number;
    minMatches?: number;
  };
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Create a saved search
 * @param scoutId - The scout user ID
 * @param name - Search name
 * @param filters - Search filters
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const createSavedSearch = async (
  scoutId: string,
  name: string,
  filters: SavedSearch["filters"],
  stateId: string
): Promise<string> => {
  try {
    const searchRef = getStateDocument(COLLECTION_NAMES.SAVED_SEARCHES, stateId);
    await setDoc(searchRef, {
      scoutId,
      name,
      filters,
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp(),
    });
    return searchRef.id;
  } catch (error) {
    console.error("Error creating saved search:", error);
    throw error;
  }
};

/**
 * Get all saved searches for a scout
 * @param scoutId - The scout user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getSavedSearches = async (
  scoutId: string,
  stateId: string
): Promise<SavedSearch[]> => {
  try {
    const q = query(
      getStateCollection(COLLECTION_NAMES.SAVED_SEARCHES, stateId),
      where("scoutId", "==", scoutId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        lastUsed: data.lastUsed ? toDate(data.lastUsed) : undefined,
      } as SavedSearch;
    });
  } catch (error) {
    console.error("Error getting saved searches:", error);
    throw error;
  }
};

/**
 * Update saved search last used timestamp
 * @param savedSearchId - The saved search ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateSavedSearchLastUsed = async (
  savedSearchId: string,
  stateId: string
): Promise<void> => {
  try {
    const savedSearchRef = getStateDocument(COLLECTION_NAMES.SAVED_SEARCHES, stateId, savedSearchId);
    await updateDoc(savedSearchRef, {
      lastUsed: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating saved search:", error);
    throw error;
  }
};

/**
 * Delete a saved search
 * @param savedSearchId - The saved search ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const deleteSavedSearch = async (
  savedSearchId: string,
  stateId: string
): Promise<void> => {
  try {
    await deleteDoc(getStateDocument(COLLECTION_NAMES.SAVED_SEARCHES, stateId, savedSearchId));
  } catch (error) {
    console.error("Error deleting saved search:", error);
    throw error;
  }
};

// ==================== Player Notes Operations ====================

export interface PlayerNote {
  id: string;
  scoutId: string;
  playerId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update a note for a player
 * @param scoutId - The scout user ID
 * @param playerId - The player user ID
 * @param note - Note text
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const savePlayerNote = async (
  scoutId: string,
  playerId: string,
  note: string,
  stateId: string
): Promise<string> => {
  try {
    // Check if note exists
    const notesQuery = query(
      getStateCollection(COLLECTION_NAMES.PLAYER_NOTES, stateId),
      where("scoutId", "==", scoutId),
      where("playerId", "==", playerId)
    );
    const notesSnapshot = await getDocs(notesQuery);

    if (!notesSnapshot.empty) {
      // Update existing note
      const noteDoc = notesSnapshot.docs[0];
      await updateDoc(getStateDocument(COLLECTION_NAMES.PLAYER_NOTES, stateId, noteDoc.id), {
        note,
        updatedAt: serverTimestamp(),
      });
      return noteDoc.id;
    } else {
      // Create new note
      const noteRef = getStateDocument(COLLECTION_NAMES.PLAYER_NOTES, stateId);
      await setDoc(noteRef, {
        scoutId,
        playerId,
        note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return noteRef.id;
    }
  } catch (error) {
    console.error("Error saving player note:", error);
    throw error;
  }
};

/**
 * Get note for a player by a scout
 * @param scoutId - The scout user ID
 * @param playerId - The player user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getPlayerNote = async (
  scoutId: string,
  playerId: string,
  stateId: string
): Promise<PlayerNote | null> => {
  try {
    const notesQuery = query(
      getStateCollection(COLLECTION_NAMES.PLAYER_NOTES, stateId),
      where("scoutId", "==", scoutId),
      where("playerId", "==", playerId)
    );
    const notesSnapshot = await getDocs(notesQuery);

    if (notesSnapshot.empty) {
      return null;
    }

    const noteData = notesSnapshot.docs[0].data();
    return {
      id: notesSnapshot.docs[0].id,
      ...noteData,
      createdAt: toDate(noteData.createdAt),
      updatedAt: toDate(noteData.updatedAt),
    } as PlayerNote;
  } catch (error) {
    console.error("Error getting player note:", error);
    throw error;
  }
};

/**
 * Get all notes for a scout
 * @param scoutId - The scout user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getScoutNotes = async (
  scoutId: string,
  stateId: string
): Promise<PlayerNote[]> => {
  try {
    const notesQuery = query(
      getStateCollection(COLLECTION_NAMES.PLAYER_NOTES, stateId),
      where("scoutId", "==", scoutId),
      orderBy("updatedAt", "desc")
    );
    const notesSnapshot = await getDocs(notesQuery);

    return notesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as PlayerNote;
    });
  } catch (error) {
    console.error("Error getting scout notes:", error);
    throw error;
  }
};

/**
 * Delete a player note
 * @param noteId - The note ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const deletePlayerNote = async (noteId: string, stateId: string): Promise<void> => {
  try {
    await deleteDoc(getStateDocument(COLLECTION_NAMES.PLAYER_NOTES, stateId, noteId));
  } catch (error) {
    console.error("Error deleting player note:", error);
    throw error;
  }
};

/**
 * Get count of scouts who have this player in their watchlist
 * (Used for player analytics - shows how many scouts are tracking them)
 */
export const getPlayerWatchlistCount = async (
  playerId: string
): Promise<number> => {
  try {
    // Query all users who have this player in their watchlist
    const usersQuery = query(
      collection(db, "users"),
      where("watchlists", "array-contains", playerId)
    );
    const querySnapshot = await getDocs(usersQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting player watchlist count:", error);
    return 0; // Return 0 on error rather than throwing
  }
};

// ==================== Scout-Player Communication ====================

export interface ScoutMessage {
  id: string;
  scoutId: string;
  playerId: string;
  subject: string;
  message: string;
  type: "initial_contact" | "follow_up" | "offer" | "general";
  status: "sent" | "read" | "replied";
  createdAt: Date;
  readAt?: Date;
  repliedAt?: Date;
}

export interface PlayerReply {
  id: string;
  messageId: string;
  playerId: string;
  scoutId: string;
  reply: string;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Send a message from scout to player
 * @param scoutId - The scout user ID
 * @param playerId - The player user ID
 * @param subject - Message subject
 * @param message - Message text
 * @param type - Message type
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const sendScoutMessage = async (
  scoutId: string,
  playerId: string,
  subject: string,
  message: string,
  stateId: string,
  type: ScoutMessage["type"] = "general"
): Promise<string> => {
  try {
    const messageRef = getStateDocument(COLLECTION_NAMES.SCOUT_MESSAGES, stateId);
    await setDoc(messageRef, {
      scoutId,
      playerId,
      subject,
      message,
      type,
      status: "sent",
      createdAt: serverTimestamp(),
    });
    return messageRef.id;
  } catch (error) {
    console.error("Error sending scout message:", error);
    throw error;
  }
};

/**
 * Get messages sent by a scout to players
 * @param scoutId - The scout user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getScoutSentMessages = async (
  scoutId: string,
  stateId: string
): Promise<(ScoutMessage & { playerName?: string })[]> => {
  try {
    // First query without orderBy to avoid index requirement
    const q = query(
      getStateCollection(COLLECTION_NAMES.SCOUT_MESSAGES, stateId),
      where("scoutId", "==", scoutId)
    );
    const querySnapshot = await getDocs(q);
    
    const messages = await Promise.all(
      querySnapshot.docs.map(async (messageDoc) => {
        const data = messageDoc.data();
        try {
          const playerDoc = await getDoc(doc(db, "users", data.playerId));
          const playerName = playerDoc.exists() ? (playerDoc.data() as User).name : "Unknown Player";
          return {
            id: messageDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            readAt: data.readAt ? toDate(data.readAt) : undefined,
            repliedAt: data.repliedAt ? toDate(data.repliedAt) : undefined,
            playerName,
          } as ScoutMessage & { playerName?: string };
        } catch (error) {
          console.error(`Error loading player for message ${messageDoc.id}:`, error);
          return {
            id: messageDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            readAt: data.readAt ? toDate(data.readAt) : undefined,
            repliedAt: data.repliedAt ? toDate(data.repliedAt) : undefined,
            playerName: "Unknown Player",
          } as ScoutMessage & { playerName?: string };
        }
      })
    );
    
    // Sort by createdAt descending (client-side)
    return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Error getting scout sent messages:", error);
    throw error;
  }
};

/**
 * Get messages received by a player from scouts
 * @param playerId - The player user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getPlayerReceivedMessages = async (
  playerId: string,
  stateId: string
): Promise<(ScoutMessage & { scoutName?: string; scoutOrganization?: string })[]> => {
  try {
    // Query without orderBy to avoid index requirement
    const q = query(
      getStateCollection(COLLECTION_NAMES.SCOUT_MESSAGES, stateId),
      where("playerId", "==", playerId)
    );
    const querySnapshot = await getDocs(q);
    
    const messages = await Promise.all(
      querySnapshot.docs.map(async (messageDoc) => {
        const data = messageDoc.data();
        try {
          const scoutDoc = await getDoc(doc(db, "users", data.scoutId));
          if (scoutDoc.exists()) {
            const scoutData = scoutDoc.data() as User;
            return {
              id: messageDoc.id,
              ...data,
              createdAt: toDate(data.createdAt),
              readAt: data.readAt ? toDate(data.readAt) : undefined,
              repliedAt: data.repliedAt ? toDate(data.repliedAt) : undefined,
              scoutName: scoutData.name,
              scoutOrganization: scoutData.bio || "Independent Scout",
            } as ScoutMessage & { scoutName?: string; scoutOrganization?: string };
          }
        } catch (error) {
          console.error("Error loading scout data:", error);
        }
        return {
          id: messageDoc.id,
          ...data,
          createdAt: toDate(data.createdAt),
          readAt: data.readAt ? toDate(data.readAt) : undefined,
          repliedAt: data.repliedAt ? toDate(data.repliedAt) : undefined,
          scoutName: "Unknown Scout",
        } as ScoutMessage & { scoutName?: string; scoutOrganization?: string };
      })
    );
    
    // Sort by createdAt descending (client-side)
    return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Error getting player received messages:", error);
    throw error;
  }
};

/**
 * Mark message as read
 * @param messageId - The message ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const markMessageAsRead = async (messageId: string, stateId: string): Promise<void> => {
  try {
    await updateDoc(getStateDocument(COLLECTION_NAMES.SCOUT_MESSAGES, stateId, messageId), {
      status: "read",
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

/**
 * Reply to a scout message
 * @param messageId - The message ID
 * @param playerId - The player user ID
 * @param scoutId - The scout user ID
 * @param reply - Reply text
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const replyToScoutMessage = async (
  messageId: string,
  playerId: string,
  scoutId: string,
  reply: string,
  stateId: string
): Promise<string> => {
  try {
    // Create reply document (using scoutMessages collection for replies - same state)
    const replyRef = getStateDocument(COLLECTION_NAMES.SCOUT_MESSAGES, stateId);
    await setDoc(replyRef, {
      messageId,
      playerId,
      scoutId,
      reply,
      createdAt: serverTimestamp(),
      isReply: true,
    });

    // Update original message status
    await updateDoc(getStateDocument(COLLECTION_NAMES.SCOUT_MESSAGES, stateId, messageId), {
      status: "replied",
      repliedAt: serverTimestamp(),
    });

    return replyRef.id;
  } catch (error) {
    console.error("Error replying to scout message:", error);
    throw error;
  }
};

/**
 * Get replies to a message
 * @param messageId - The message ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getMessageReplies = async (
  messageId: string,
  stateId: string
): Promise<PlayerReply[]> => {
  try {
    // Replies are stored in the same scoutMessages collection with isReply flag
    const q = query(
      getStateCollection(COLLECTION_NAMES.SCOUT_MESSAGES, stateId),
      where("messageId", "==", messageId),
      where("isReply", "==", true),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((replyDoc) => {
      const data = replyDoc.data();
      return {
        id: replyDoc.id,
        messageId: data.messageId,
        playerId: data.playerId,
        scoutId: data.scoutId,
        reply: data.reply,
        createdAt: toDate(data.createdAt),
        readAt: data.readAt ? toDate(data.readAt) : undefined,
      } as PlayerReply;
    });
  } catch (error) {
    console.error("Error getting message replies:", error);
    throw error;
  }
};

// ==================== Recruitment Workflow ====================

export type RecruitmentStage = 
  | "interested" 
  | "contacted" 
  | "trial_scheduled" 
  | "trial_completed" 
  | "offer_extended" 
  | "offer_accepted" 
  | "offer_declined" 
  | "signed" 
  | "closed";

export interface RecruitmentRecord {
  id: string;
  scoutId: string;
  playerId: string;
  stage: RecruitmentStage;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  stageHistory: {
    stage: RecruitmentStage;
    changedAt: Date;
    notes?: string;
  }[];
  offerDetails?: {
    position: string;
    salary?: number;
    duration?: string;
    benefits?: string;
    expirationDate?: Date;
  };
}

/**
 * Create or update a recruitment record
 * @param scoutId - The scout user ID
 * @param playerId - The player user ID
 * @param stage - Recruitment stage
 * @param stateId - The state ID (e.g., "kaduna")
 * @param notes - Optional notes
 * @param offerDetails - Optional offer details
 */
export const upsertRecruitmentRecord = async (
  scoutId: string,
  playerId: string,
  stage: RecruitmentStage,
  stateId: string,
  notes?: string,
  offerDetails?: RecruitmentRecord["offerDetails"]
): Promise<string> => {
  try {
    // Check if record exists
    const recordsQuery = query(
      getStateCollection(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId),
      where("scoutId", "==", scoutId),
      where("playerId", "==", playerId)
    );
    const recordsSnapshot = await getDocs(recordsQuery);

    if (!recordsSnapshot.empty) {
      // Update existing record
      const recordDoc = recordsSnapshot.docs[0];
      const existingData = recordDoc.data();
      const stageHistory = existingData.stageHistory || [];
      
      // Add to history if stage changed
      if (existingData.stage !== stage) {
        stageHistory.push({
          stage,
          changedAt: Timestamp.now(),
          notes: notes || undefined,
        });
      }

      const updateData = removeUndefined({
        stage,
        notes: notes !== undefined ? notes : existingData.notes,
        offerDetails: offerDetails !== undefined ? offerDetails : existingData.offerDetails,
        updatedAt: serverTimestamp(),
        stageHistory,
      });
      await updateDoc(getStateDocument(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId, recordDoc.id), updateData);
      return recordDoc.id;
    } else {
      // Create new record
      const recordRef = getStateDocument(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId);
      const recordData = removeUndefined({
        scoutId,
        playerId,
        stage,
        notes,
        offerDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stageHistory: [
          {
            stage,
            changedAt: Timestamp.now(),
            notes: notes || undefined,
          },
        ],
      });
      await setDoc(recordRef, recordData);
      return recordRef.id;
    }
  } catch (error) {
    console.error("Error upserting recruitment record:", error);
    throw error;
  }
};

/**
 * Get recruitment record for a scout-player pair
 * @param scoutId - The scout user ID
 * @param playerId - The player user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getRecruitmentRecord = async (
  scoutId: string,
  playerId: string,
  stateId: string
): Promise<RecruitmentRecord | null> => {
  try {
    const recordsQuery = query(
      getStateCollection(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId),
      where("scoutId", "==", scoutId),
      where("playerId", "==", playerId)
    );
    const recordsSnapshot = await getDocs(recordsQuery);

    if (recordsSnapshot.empty) {
      return null;
    }

    const data = recordsSnapshot.docs[0].data();
    return {
      id: recordsSnapshot.docs[0].id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      stageHistory: (data.stageHistory || []).map((h: any) => ({
        ...h,
        changedAt: toDate(h.changedAt),
      })),
      offerDetails: data.offerDetails
        ? {
            ...data.offerDetails,
            expirationDate: data.offerDetails.expirationDate
              ? toDate(data.offerDetails.expirationDate)
              : undefined,
          }
        : undefined,
    } as RecruitmentRecord;
  } catch (error) {
    console.error("Error getting recruitment record:", error);
    throw error;
  }
};

/**
 * Get all recruitment records for a player (from all scouts)
 * @param playerId - The player user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getPlayerRecruitmentRecords = async (
  playerId: string,
  stateId: string
): Promise<(RecruitmentRecord & { scoutName?: string })[]> => {
  try {
    // Query without orderBy to avoid index requirement
    const q = query(
      getStateCollection(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId),
      where("playerId", "==", playerId)
    );
    const querySnapshot = await getDocs(q);
    
    const records = await Promise.all(
      querySnapshot.docs.map(async (recordDoc) => {
        const data = recordDoc.data();
        try {
          const scoutDoc = await getDoc(doc(db, "users", data.scoutId));
          const scoutName = scoutDoc.exists() ? (scoutDoc.data() as User).name : "Unknown Scout";
          return {
            id: recordDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            stageHistory: (data.stageHistory || []).map((h: any) => ({
              ...h,
              changedAt: toDate(h.changedAt),
            })),
            offerDetails: data.offerDetails
              ? {
                  ...data.offerDetails,
                  expirationDate: data.offerDetails.expirationDate
                    ? toDate(data.offerDetails.expirationDate)
                    : undefined,
                }
              : undefined,
            scoutName,
          } as RecruitmentRecord & { scoutName?: string };
        } catch (error) {
          return {
            id: recordDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            stageHistory: (data.stageHistory || []).map((h: any) => ({
              ...h,
              changedAt: toDate(h.changedAt),
            })),
            offerDetails: data.offerDetails
              ? {
                  ...data.offerDetails,
                  expirationDate: data.offerDetails.expirationDate
                    ? toDate(data.offerDetails.expirationDate)
                    : undefined,
                }
              : undefined,
            scoutName: "Unknown Scout",
          } as RecruitmentRecord & { scoutName?: string };
        }
      })
    );
    
    // Sort by updatedAt descending (client-side)
    return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error("Error getting player recruitment records:", error);
    throw error;
  }
};

/**
 * Get all recruitment records for a scout
 * @param scoutId - The scout user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getScoutRecruitmentRecords = async (
  scoutId: string,
  stateId: string
): Promise<(RecruitmentRecord & { playerName?: string })[]> => {
  try {
    // First query without orderBy to avoid index requirement
    const q = query(
      getStateCollection(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId),
      where("scoutId", "==", scoutId)
    );
    const querySnapshot = await getDocs(q);
    
    const records = await Promise.all(
      querySnapshot.docs.map(async (recordDoc) => {
        const data = recordDoc.data();
        try {
          const playerDoc = await getDoc(doc(db, "users", data.playerId));
          const playerName = playerDoc.exists() ? (playerDoc.data() as User).name : "Unknown Player";
          return {
            id: recordDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            stageHistory: (data.stageHistory || []).map((h: any) => ({
              ...h,
              changedAt: toDate(h.changedAt),
            })),
            offerDetails: data.offerDetails
              ? {
                  ...data.offerDetails,
                  expirationDate: data.offerDetails.expirationDate
                    ? toDate(data.offerDetails.expirationDate)
                    : undefined,
                }
              : undefined,
            playerName,
          } as RecruitmentRecord & { playerName?: string };
        } catch (error) {
          return {
            id: recordDoc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            stageHistory: (data.stageHistory || []).map((h: any) => ({
              ...h,
              changedAt: toDate(h.changedAt),
            })),
            offerDetails: data.offerDetails
              ? {
                  ...data.offerDetails,
                  expirationDate: data.offerDetails.expirationDate
                    ? toDate(data.offerDetails.expirationDate)
                    : undefined,
                }
              : undefined,
            playerName: "Unknown Player",
          } as RecruitmentRecord & { playerName?: string };
        }
      })
    );
    
    // Sort by updatedAt descending (client-side)
    return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error("Error getting scout recruitment records:", error);
    throw error;
  }
};

/**
 * Update recruitment stage
 * @param recordId - The recruitment record ID
 * @param newStage - New recruitment stage
 * @param stateId - The state ID (e.g., "kaduna")
 * @param notes - Optional notes
 */
export const updateRecruitmentStage = async (
  recordId: string,
  newStage: RecruitmentStage,
  stateId: string,
  notes?: string
): Promise<void> => {
  try {
    const recordDoc = await getDoc(getStateDocument(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId, recordId));
    if (!recordDoc.exists()) {
      throw new Error("Recruitment record not found");
    }

    const existingData = recordDoc.data();
    const stageHistory = existingData.stageHistory || [];
    
    // Add to history if stage changed
    if (existingData.stage !== newStage) {
      stageHistory.push({
        stage: newStage,
        changedAt: Timestamp.now(),
        notes,
      });
    }

    await updateDoc(getStateDocument(COLLECTION_NAMES.RECRUITMENT_RECORDS, stateId, recordId), {
      stage: newStage,
      notes: notes || existingData.notes,
      updatedAt: serverTimestamp(),
      stageHistory,
    });
  } catch (error) {
    console.error("Error updating recruitment stage:", error);
    throw error;
  }
};
