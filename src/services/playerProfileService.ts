// Phase 3: Player Profile Service for Firestore operations
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PlayerProfile, Achievement } from "../types";

/**
 * Get player profile by user ID
 */
export const getPlayerProfile = async (
  userId: string
): Promise<PlayerProfile | null> => {
  try {
    const profileQuery = query(
      collection(db, "playerProfiles"),
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
 */
export const savePlayerProfile = async (
  userId: string,
  profileData: Partial<PlayerProfile>
): Promise<PlayerProfile> => {
  try {
    // Check if profile exists
    const existingProfile = await getPlayerProfile(userId);

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
        collection(db, "playerProfiles"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(profileQuery);

      if (!querySnapshot.empty) {
        const profileRef = doc(db, "playerProfiles", querySnapshot.docs[0].id);
        await updateDoc(profileRef, profileToSave);

        return {
          ...existingProfile,
          ...profileData,
          id: querySnapshot.docs[0].id,
          lastUpdated: new Date(),
        } as PlayerProfile;
      }
    }

    // Create new profile
    const newProfileRef = doc(collection(db, "playerProfiles"));
    await setDoc(newProfileRef, {
      ...profileToSave,
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
 */
export const addAchievement = async (
  userId: string,
  achievement: Omit<Achievement, "id">
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
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
    });
  } catch (error) {
    console.error("Error adding achievement:", error);
    throw error;
  }
};

/**
 * Update achievement in player profile
 */
export const updateAchievement = async (
  userId: string,
  achievementId: string,
  achievementData: Partial<Achievement>
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedAchievements = (profile.achievements || []).map((ach) =>
      ach.id === achievementId ? { ...ach, ...achievementData } : ach
    );

    await savePlayerProfile(userId, {
      achievements: updatedAchievements,
    });
  } catch (error) {
    console.error("Error updating achievement:", error);
    throw error;
  }
};

/**
 * Delete achievement from player profile
 */
export const deleteAchievement = async (
  userId: string,
  achievementId: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedAchievements = (profile.achievements || []).filter(
      (ach) => ach.id !== achievementId
    );

    await savePlayerProfile(userId, {
      achievements: updatedAchievements,
    });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    throw error;
  }
};

/**
 * Add video to player profile
 */
export const addVideoToProfile = async (
  userId: string,
  videoUrl: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedVideos = [...(profile.highlightVideos || []), videoUrl];

    await savePlayerProfile(userId, {
      highlightVideos: updatedVideos,
    });
  } catch (error) {
    console.error("Error adding video:", error);
    throw error;
  }
};

/**
 * Remove video from player profile
 */
export const removeVideoFromProfile = async (
  userId: string,
  videoUrl: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedVideos = (profile.highlightVideos || []).filter(
      (url) => url !== videoUrl
    );

    await savePlayerProfile(userId, {
      highlightVideos: updatedVideos,
    });
  } catch (error) {
    console.error("Error removing video:", error);
    throw error;
  }
};

/**
 * Add image to player profile
 */
export const addImageToProfile = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedImages = [...(profile.images || []), imageUrl];

    await savePlayerProfile(userId, {
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error adding image:", error);
    throw error;
  }
};

/**
 * Remove image from player profile
 */
export const removeImageFromProfile = async (
  userId: string,
  imageUrl: string
): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      throw new Error("Player profile not found");
    }

    const updatedImages = (profile.images || []).filter((url) => url !== imageUrl);

    await savePlayerProfile(userId, {
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error removing image:", error);
    throw error;
  }
};

/**
 * Increment profile views (for analytics)
 */
export const incrementProfileViews = async (userId: string): Promise<void> => {
  try {
    const profile = await getPlayerProfile(userId);
    if (!profile) {
      return; // Profile doesn't exist, skip
    }

    await savePlayerProfile(userId, {
      profileViews: (profile.profileViews || 0) + 1,
    });
  } catch (error) {
    console.error("Error incrementing profile views:", error);
    // Don't throw - this is just analytics
  }
};

/**
 * Search player profiles (for scouts)
 */
export const searchPlayerProfiles = async (filters: {
  position?: string;
  minAge?: number;
  maxAge?: number;
  state?: string;
  city?: string;
  minGoals?: number;
  isPublic?: boolean;
}): Promise<PlayerProfile[]> => {
  try {
    let profileQuery = query(collection(db, "playerProfiles"));

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
    if (filters.state) {
      // Note: This requires a compound index in Firestore
      profileQuery = query(profileQuery, where("state", "==", filters.state));
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

