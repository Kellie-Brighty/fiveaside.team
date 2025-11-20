/**
 * State Data Service
 * Fetches state-specific data from Firestore
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface StateData {
  id: string;
  name: string;
  createdAt?: Date;
  initializedAt?: Date;
  // Statistics (can be updated periodically or calculated on-demand)
  stats?: {
    totalClubs: number;
    totalPlayers: number;
    legitimateClubs: number;
    verifiedClubs: number;
  };
  // Metadata
  metadata?: {
    description?: string;
    lastUpdated?: Date;
  };
}

/**
 * Get state data from Firestore
 * @param stateId - The state ID (e.g., "kaduna", "ondo")
 */
export const getStateData = async (stateId: string): Promise<StateData | null> => {
  try {
    const stateDocRef = doc(db, "states", stateId);
    const stateDoc = await getDoc(stateDocRef);

    if (!stateDoc.exists()) {
      console.warn(`State document not found: ${stateId}`);
      return null;
    }

    const data = stateDoc.data();
    
    // Convert Firestore timestamps to Dates
    const toDate = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      if (timestamp.toDate && typeof timestamp.toDate === "function") {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      return undefined;
    };

    return {
      id: stateDoc.id,
      name: data.name || stateId,
      createdAt: toDate(data.createdAt),
      initializedAt: toDate(data.initializedAt),
      stats: data.stats || undefined,
      metadata: data.metadata ? {
        ...data.metadata,
        lastUpdated: toDate(data.metadata.lastUpdated),
      } : undefined,
    } as StateData;
  } catch (error) {
    console.error(`Error fetching state data for ${stateId}:`, error);
    throw error;
  }
};

