// Phase 3: Player Profile Service for Firestore operations
import {
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getStateCollection, getStateDocument, COLLECTION_NAMES } from "../utils/stateService";
import type { PlayerProfile, Achievement } from "../types";

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date || obj instanceof Array) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value)) {
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
 * Get player profile by user ID
 * @param userId - The user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const getPlayerProfile = async (
  userId: string,
  stateId: string
): Promise<PlayerProfile | null> => {
  try {
    const profileQuery = query(
      getStateCollection(COLLECTION_NAMES.PLAYERS, stateId),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(profileQuery);

    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0].data();
      return {
        id: querySnapshot.docs[0].id,
        ...docData,
        // Convert Firestore timestamps to Dates
        lastUpdated: docData.lastUpdated?.toDate?.() || docData.lastUpdated,
        createdAt: docData.createdAt?.toDate?.() || docData.createdAt,
        achievements: docData.achievements?.map((ach: any) => ({
          ...ach,
          date: ach.date?.toDate?.() || ach.date,
        })),
        clubHistory: docData.clubHistory?.map((ch: any) => ({
          ...ch,
          joinedDate: ch.joinedDate?.toDate?.() || ch.joinedDate,
          leftDate: ch.leftDate?.toDate?.() || ch.leftDate,
        })),
      } as PlayerProfile;
    }

    return null;
  } catch (error) {
    console.error("Error getting player profile:", error);
    throw error;
  }
};

/**
 * Create or update player profile
 * @param userId - The user ID
 * @param profileData - Profile data to save
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const savePlayerProfile = async (
  userId: string,
  profileData: Partial<PlayerProfile>,
  stateId: string
): Promise<PlayerProfile> => {
  try {
    // Check if profile exists
    const existingProfile = await getPlayerProfile(userId, stateId);

    const profileToSave = {
      ...profileData,
      userId,
      lastUpdated: serverTimestamp(),
      ...(existingProfile
        ? {}
        : {
            createdAt: serverTimestamp(),
            stats: {
              goals: 0,
              assists: 0,
              matchesPlayed: 0,
              matchesWon: 0,
              matchesLost: 0,
              matchesDrawn: 0,
              yellowCards: 0,
              redCards: 0,
            },
            isPublic: false,
            profileViews: 0,
            highlightVideos: [],
            images: [],
            achievements: [],
            clubHistory: [],
          }),
    };

    if (existingProfile) {
      // Update existing profile
      const profileQuery = query(
        getStateCollection(COLLECTION_NAMES.PLAYERS, stateId),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(profileQuery);

      if (!querySnapshot.empty) {
        const profileRef = getStateDocument(COLLECTION_NAMES.PLAYERS, stateId, querySnapshot.docs[0].id);
        // Remove undefined values before updating (Firestore doesn't allow undefined)
        const cleanedProfileToSave = removeUndefined(profileToSave);
        await updateDoc(profileRef, cleanedProfileToSave);

        return {
          ...existingProfile,
          ...profileData,
          id: querySnapshot.docs[0].id,
          lastUpdated: new Date(),
        } as PlayerProfile;
      }
    }

    // Create new profile
    const newProfileRef = getStateDocument(COLLECTION_NAMES.PLAYERS, stateId);
    // Remove undefined values before creating (Firestore doesn't allow undefined)
    const cleanedProfileToSave = removeUndefined(profileToSave);
    await setDoc(newProfileRef, {
      ...cleanedProfileToSave,
      id: newProfileRef.id,
    });

    return {
      ...profileToSave,
      id: newProfileRef.id,
      userId,
      lastUpdated: new Date(),
      createdAt: new Date(),
      stats: profileToSave.stats || {
        goals: 0,
        assists: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesDrawn: 0,
        yellowCards: 0,
        redCards: 0,
      },
      isPublic: profileToSave.isPublic ?? false,
      profileViews: 0,
      highlightVideos: [],
      images: [],
      achievements: [],
      clubHistory: [],
    } as PlayerProfile;
  } catch (error) {
    console.error("Error saving player profile:", error);
    throw error;
  }
};

/**
 * Add achievement to player profile
 * @param userId - The user ID
 * @param achievement - Achievement data
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const addAchievement = async (
  userId: string,
  achievement: Omit<Achievement, "id">,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const newAchievement: Achievement = {
      id: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...achievement,
    };

    const updatedAchievements = [...(profile.achievements || []), newAchievement];

    await savePlayerProfile(userId, {
      achievements: updatedAchievements,
    }, stateId);
  } catch (error) {
    console.error("Error adding achievement:", error);
    throw error;
  }
};

/**
 * Update achievement in player profile
 * @param userId - The user ID
 * @param achievementId - The achievement ID
 * @param achievementData - Achievement data to update
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const updateAchievement = async (
  userId: string,
  achievementId: string,
  achievementData: Partial<Achievement>,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedAchievements = (profile.achievements || []).map((ach) =>
      ach.id === achievementId ? { ...ach, ...achievementData } : ach
    );

    await savePlayerProfile(userId, {
      achievements: updatedAchievements,
    }, stateId);
  } catch (error) {
    console.error("Error updating achievement:", error);
    throw error;
  }
};

/**
 * Delete achievement from player profile
 * @param userId - The user ID
 * @param achievementId - The achievement ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const deleteAchievement = async (
  userId: string,
  achievementId: string,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedAchievements = (profile.achievements || []).filter(
      (ach) => ach.id !== achievementId
    );

    await savePlayerProfile(userId, {
      achievements: updatedAchievements,
    }, stateId);
  } catch (error) {
    console.error("Error deleting achievement:", error);
    throw error;
  }
};

/**
 * Add video to player profile
 * @param userId - The user ID
 * @param videoUrl - Video URL to add
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const addVideoToProfile = async (
  userId: string,
  videoUrl: string,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedVideos = [...(profile.highlightVideos || []), videoUrl];

    await savePlayerProfile(userId, {
      highlightVideos: updatedVideos,
    }, stateId);
  } catch (error) {
    console.error("Error adding video:", error);
    throw error;
  }
};

/**
 * Remove video from player profile
 * @param userId - The user ID
 * @param videoUrl - Video URL to remove
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const removeVideoFromProfile = async (
  userId: string,
  videoUrl: string,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedVideos = (profile.highlightVideos || []).filter(
      (url) => url !== videoUrl
    );

    await savePlayerProfile(userId, {
      highlightVideos: updatedVideos,
    }, stateId);
  } catch (error) {
    console.error("Error removing video:", error);
    throw error;
  }
};

/**
 * Add image to player profile
 * @param userId - The user ID
 * @param imageUrl - Image URL to add
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const addImageToProfile = async (
  userId: string,
  imageUrl: string,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedImages = [...(profile.images || []), imageUrl];

    await savePlayerProfile(userId, {
      images: updatedImages,
    }, stateId);
  } catch (error) {
    console.error("Error adding image:", error);
    throw error;
  }
};

/**
 * Remove image from player profile
 * @param userId - The user ID
 * @param imageUrl - Image URL to remove
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const removeImageFromProfile = async (
  userId: string,
  imageUrl: string,
  stateId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedImages = (profile.images || []).filter((url) => url !== imageUrl);

    await savePlayerProfile(userId, {
      images: updatedImages,
    }, stateId);
  } catch (error) {
    console.error("Error removing image:", error);
    throw error;
  }
};

/**
 * Increment profile views (for analytics)
 * @param userId - The user ID
 * @param stateId - The state ID (e.g., "kaduna")
 */
export const incrementProfileViews = async (userId: string, stateId: string): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId, stateId);
    if (!profile) {
      return; // Profile doesn't exist, skip
    }

    await savePlayerProfile(userId, {
      profileViews: (profile.profileViews || 0) + 1,
    }, stateId);
  } catch (error) {
    console.error("Error incrementing profile views:", error);
    // Don't throw - this is just analytics
  }
};

/**
 * Search player profiles (for scouts)
 * @param stateId - The state ID (e.g., "kaduna")
 * @param filters - Search filters
 */
export const searchPlayerProfiles = async (
  stateId: string,
  filters: {
    position?: string;
    minAge?: number;
    maxAge?: number;
    city?: string;
    minGoals?: number;
    isPublic?: boolean;
  }
): Promise<PlayerProfile[]> => {
  try {
    let profileQuery = query(getStateCollection(COLLECTION_NAMES.PLAYERS, stateId));

    // Apply filters
    if (filters.isPublic !== undefined) {
      profileQuery = query(
        profileQuery,
        where("isPublic", "==", filters.isPublic)
      );
    }
    if (filters.position) {
      profileQuery = query(
        profileQuery,
        where("position", "==", filters.position)
      );
    }

    const querySnapshot = await getDocs(profileQuery);
    const profiles: PlayerProfile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      profiles.push({
        id: doc.id,
        ...data,
        lastUpdated: data.lastUpdated?.toDate?.() || data.lastUpdated,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      } as PlayerProfile);
    });

    console.log(`[searchPlayerProfiles] Found ${profiles.length} profiles in state ${stateId} with isPublic=${filters.isPublic}`);

    // Apply client-side filters (age, goals, etc.)
    // Note: Firestore has limitations on complex queries, so we filter in-memory for some criteria
    return profiles.filter((profile) => {
      if (filters.minGoals && (profile.stats?.goals || 0) < filters.minGoals) {
        return false;
      }
      // Age filtering would require birthDate in profile, which we don't have yet
      return true;
    });
  } catch (error) {
    console.error("Error searching player profiles:", error);
    throw error;
  }
};

