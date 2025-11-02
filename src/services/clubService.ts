// Phase 4: Club Service for Firestore operations
import {
  collection,
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
import type { Club } from "../types";

/**
 * Helper function to remove undefined values from object (Firestore doesn't accept undefined)
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
 * Get club by ID
 */
export const getClub = async (clubId: string): Promise<Club | null> => {
  try {
    const clubDoc = await getDoc(doc(db, "clubs", clubId));

    if (!clubDoc.exists()) {
      return null;
    }

    const data = clubDoc.data();
    
    // Helper to safely convert Firestore timestamp to Date
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

    return {
      id: clubDoc.id,
      ...data,
      // Convert Firestore timestamps to Dates
      createdAt: toDate(data.createdAt) || new Date(), // Fallback to current date if missing
      updatedAt: toDate(data.updatedAt) || new Date(),
      legitimacyFeePaidUntil: toDate(data.legitimacyFeePaidUntil),
      lastLegitimacyPaymentDate: toDate(data.lastLegitimacyPaymentDate),
      legitimacyPaymentHistory: data.legitimacyPaymentHistory?.map((payment: any) => {
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
        return {
          ...payment,
          paymentDate: toDate(payment.paymentDate) || new Date(),
          validUntil: toDate(payment.validUntil) || new Date(),
        };
      }),
      roster: data.roster?.map((player: any) => {
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
        return {
          ...player,
          joinedDate: toDate(player.joinedDate) || new Date(),
        };
      }),
      leagueHistory: data.leagueHistory?.map((league: any) => ({
        ...league,
      })),
    } as Club;
  } catch (error) {
    console.error("Error getting club:", error);
    throw error;
  }
};

/**
 * Get clubs by manager ID
 */
export const getClubsByManager = async (managerId: string): Promise<Club[]> => {
  try {
    const clubsQuery = query(
      collection(db, "clubs"),
      where("managerId", "==", managerId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(clubsQuery);
    const clubs: Club[] = [];

    // Helper to safely convert Firestore timestamp to Date
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

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      clubs.push({
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
        legitimacyFeePaidUntil: toDate(data.legitimacyFeePaidUntil),
        lastLegitimacyPaymentDate: toDate(data.lastLegitimacyPaymentDate),
        legitimacyPaymentHistory: data.legitimacyPaymentHistory?.map((payment: any) => ({
          ...payment,
          paymentDate: toDate(payment.paymentDate) || new Date(),
          validUntil: toDate(payment.validUntil) || new Date(),
        })),
        roster: data.roster?.map((player: any) => ({
          ...player,
          joinedDate: toDate(player.joinedDate) || new Date(),
        })),
        leagueHistory: data.leagueHistory?.map((league: any) => ({
          ...league,
        })),
      } as Club);
    });

    return clubs;
  } catch (error) {
    console.error("Error getting clubs by manager:", error);
    throw error;
  }
};

/**
 * Get all clubs (with optional filters)
 */
export const getAllClubs = async (filters?: {
  isLegitimate?: boolean;
  state?: string;
  city?: string;
  verified?: boolean;
}): Promise<Club[]> => {
  try {
    let clubsQuery = query(collection(db, "clubs"), orderBy("createdAt", "desc"));

    // Apply filters
    if (filters?.isLegitimate !== undefined) {
      clubsQuery = query(clubsQuery, where("isLegitimate", "==", filters.isLegitimate));
    }

    const querySnapshot = await getDocs(clubsQuery);
    const clubs: Club[] = [];

    // Helper to safely convert Firestore timestamp to Date
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

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Client-side filters
      if (filters?.state && data.location?.state !== filters.state) {
        return;
      }
      if (filters?.city && data.location?.city !== filters.city) {
        return;
      }
      if (filters?.verified !== undefined) {
        const isVerified = !!data.registrationNumber;
        if (isVerified !== filters.verified) {
          return;
        }
      }

      clubs.push({
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
        legitimacyFeePaidUntil: toDate(data.legitimacyFeePaidUntil),
        lastLegitimacyPaymentDate: toDate(data.lastLegitimacyPaymentDate),
        legitimacyPaymentHistory: data.legitimacyPaymentHistory?.map((payment: any) => ({
          ...payment,
          paymentDate: toDate(payment.paymentDate) || new Date(),
          validUntil: toDate(payment.validUntil) || new Date(),
        })),
        roster: data.roster?.map((player: any) => ({
          ...player,
          joinedDate: toDate(player.joinedDate) || new Date(),
        })),
        leagueHistory: data.leagueHistory?.map((league: any) => ({
          ...league,
        })),
      } as Club);
    });

    return clubs;
  } catch (error) {
    console.error("Error getting all clubs:", error);
    throw error;
  }
};

/**
 * Create a new club
 */
export const createClub = async (
  clubData: Omit<Club, "id" | "createdAt" | "updatedAt" | "playerIds" | "roster" | "isLegitimate" | "legitimacyFeeStatus">
): Promise<Club> => {
  try {
    const newClubRef = doc(collection(db, "clubs"));

    const clubToCreate = {
      ...clubData,
      id: newClubRef.id,
      isLegitimate: false,
      legitimacyFeeStatus: "unpaid",
      playerIds: [],
      roster: [],
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesDrawn: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove undefined values before saving to Firestore
    const cleanedClubData = removeUndefined(clubToCreate);

    await setDoc(newClubRef, cleanedClubData);

    return {
      ...clubToCreate,
      id: newClubRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Club;
  } catch (error) {
    console.error("Error creating club:", error);
    throw error;
  }
};

/**
 * Update club information
 */
export const updateClub = async (
  clubId: string,
  updates: Partial<Club>
): Promise<void> => {
  try {
    const clubRef = doc(db, "clubs", clubId);

    // Convert Date objects to Firestore timestamps if needed
    const updateData: any = { ...updates, updatedAt: serverTimestamp() };

    // Handle nested date fields
    if (updateData.legitimacyFeePaidUntil instanceof Date) {
      updateData.legitimacyFeePaidUntil = Timestamp.fromDate(updateData.legitimacyFeePaidUntil);
    }
    if (updateData.lastLegitimacyPaymentDate instanceof Date) {
      updateData.lastLegitimacyPaymentDate = Timestamp.fromDate(updateData.lastLegitimacyPaymentDate);
    }

    // Remove undefined values before saving to Firestore
    const cleanedUpdateData = removeUndefined(updateData);

    await updateDoc(clubRef, cleanedUpdateData);
  } catch (error) {
    console.error("Error updating club:", error);
    throw error;
  }
};

/**
 * Generate a unique club registration number
 * Format: CLB-YYYY-XXX (e.g., CLB-2024-001)
 */
export const generateClubRegistrationNumber = async (): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `CLB-${currentYear}-`;
    
    // Get all existing clubs to find the next sequence number
    const allClubs = await getAllClubs();
    
    // Filter clubs with registration numbers for current year
    const currentYearClubs = allClubs.filter((club) => {
      if (!club.registrationNumber) return false;
      return club.registrationNumber.startsWith(prefix);
    });
    
    // Extract sequence numbers and find the highest
    let maxSequence = 0;
    currentYearClubs.forEach((club) => {
      if (club.registrationNumber) {
        const sequenceStr = club.registrationNumber.replace(prefix, "");
        const sequence = parseInt(sequenceStr, 10);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });
    
    // Generate next sequence number (padded to 3 digits)
    const nextSequence = maxSequence + 1;
    const sequenceStr = nextSequence.toString().padStart(3, "0");
    
    return `${prefix}${sequenceStr}`;
  } catch (error) {
    console.error("Error generating registration number:", error);
    // Fallback to timestamp-based number if generation fails
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `CLB-${year}-${timestamp}`;
  }
};

/**
 * Verify club (assign registration number) - for FA officials
 */
export const verifyClub = async (
  clubId: string,
  registrationNumber: string
): Promise<void> => {
  try {
    await updateClub(clubId, {
      registrationNumber,
      // Additional verification fields can be added here
    });
  } catch (error) {
    console.error("Error verifying club:", error);
    throw error;
  }
};

/**
 * Record legitimacy fee payment
 */
export const recordLegitimacyPayment = async (
  clubId: string,
  paymentData: {
    amount: number;
    transactionRef: string;
    validUntil: Date;
  }
): Promise<void> => {
  try {
    const club = await getClub(clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const paymentHistory = club.legitimacyPaymentHistory || [];
    
    const newPayment = {
      paymentDate: new Date(),
      amount: paymentData.amount,
      transactionRef: paymentData.transactionRef,
      validUntil: paymentData.validUntil,
    };

    const updatedHistory = [...paymentHistory, newPayment];

    await updateClub(clubId, {
      isLegitimate: true,
      legitimacyFeeStatus: "paid",
      legitimacyFeePaidUntil: paymentData.validUntil,
      lastLegitimacyPaymentDate: new Date(),
      legitimacyPaymentHistory: updatedHistory,
    });
  } catch (error) {
    console.error("Error recording legitimacy payment:", error);
    throw error;
  }
};

/**
 * Add player to club roster
 */
export const addPlayerToRoster = async (
  clubId: string,
  playerData: {
    userId: string;
    playerName: string;
    position: string;
    jerseyNumber?: number;
  }
): Promise<void> => {
  try {
    const club = await getClub(clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    // Check if player is already in roster
    if (club.playerIds.includes(playerData.userId)) {
      throw new Error("Player is already in the club roster");
    }

    const roster = club.roster || [];
    const newRosterEntry = removeUndefined({
      ...playerData,
      joinedDate: new Date(),
    });

    const updatedRoster = [...roster, newRosterEntry];
    const updatedPlayerIds = [...club.playerIds, playerData.userId];

    await updateClub(clubId, {
      roster: updatedRoster,
      playerIds: updatedPlayerIds,
    });
  } catch (error) {
    console.error("Error adding player to roster:", error);
    throw error;
  }
};

/**
 * Remove player from club roster
 */
export const removePlayerFromRoster = async (
  clubId: string,
  userId: string
): Promise<void> => {
  try {
    const club = await getClub(clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const updatedRoster = (club.roster || []).filter(
      (player) => player.userId !== userId
    );
    const updatedPlayerIds = club.playerIds.filter((id) => id !== userId);

    await updateClub(clubId, {
      roster: updatedRoster,
      playerIds: updatedPlayerIds,
    });
  } catch (error) {
    console.error("Error removing player from roster:", error);
    throw error;
  }
};

/**
 * Update player in roster (e.g., position, jersey number)
 */
export const updatePlayerInRoster = async (
  clubId: string,
  userId: string,
  updates: {
    position?: string;
    jerseyNumber?: number;
    playerName?: string;
  }
): Promise<void> => {
  try {
    const club = await getClub(clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const updatedRoster = (club.roster || []).map((player) =>
      player.userId === userId
        ? { ...player, ...updates }
        : player
    );

    await updateClub(clubId, {
      roster: updatedRoster,
    });
  } catch (error) {
    console.error("Error updating player in roster:", error);
    throw error;
  }
};

/**
 * Get clubs that need legitimacy fee renewal (expired or expiring soon)
 */
export const getClubsNeedingRenewal = async (
  daysBeforeExpiry?: number
): Promise<Club[]> => {
  try {
    const allClubs = await getAllClubs({ isLegitimate: true });
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + (daysBeforeExpiry || 30));

    return allClubs.filter((club) => {
      if (!club.legitimacyFeePaidUntil) {
        return true;
      }
      
      const expiryDate = club.legitimacyFeePaidUntil instanceof Date
        ? club.legitimacyFeePaidUntil
        : new Date(club.legitimacyFeePaidUntil);

      // Check if expired or expiring soon
      return expiryDate <= thresholdDate;
    });
  } catch (error) {
    console.error("Error getting clubs needing renewal:", error);
    throw error;
  }
};

