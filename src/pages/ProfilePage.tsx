// Phase 2: User Profile Management Page
// Phase 3: Extended with Player Profile features
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import { uploadImageToImgBB } from "../utils/imgUpload";
import { uploadVideoToCloudinary } from "../utils/videoUpload"; // Phase 3
import LoadingButton from "../components/LoadingButton";
import { getRoleDisplayName } from "../utils/permissions";
import {
  getPlayerProfile,
  savePlayerProfile,
  addVideoToProfile,
  removeVideoFromProfile,
  addImageToProfile,
  removeImageFromProfile,
  addAchievement,
  deleteAchievement,
} from "../services/playerProfileService"; // Phase 3
import {
  getTransferRequestsByPlayer,
  cancelTransferRequest,
} from "../services/transferService"; // Phase 4.3
import { getClub } from "../services/clubService"; // Phase 4.3
import { getPlayerWatchlistCount } from "../services/scoutService"; // Phase 11
import type { PlayerProfile, Achievement, TransferRequest, Club } from "../types";

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, isLoading } = useAuth();
  const { currentState } = useStateContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingPlayerProfile, setIsLoadingPlayerProfile] = useState(false); // Phase 3: Used for loading state in future
  
  // Phase 4.3: Transfer history state
  const [transferRequests, setTransferRequests] = useState<Array<TransferRequest & { club?: Club }>>([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // Phase 3: Player Profile state
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState<"left" | "right" | "both">("right");
  const [isPublic, setIsPublic] = useState(false);
  const [highlightVideos, setHighlightVideos] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  // Phase 11: Scout analytics
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);
  
  // Achievement form state
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementDescription, setAchievementDescription] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [achievementCategory, setAchievementCategory] = useState<Achievement["category"]>("award");

  const isPlayer = currentUser?.role === "player";

  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setBio(currentUser.bio || "");
      setCity(currentUser.location?.city || "");
      setState(currentUser.location?.state || "");
      setWebsite(currentUser.socialLinks?.website || "");
      setTwitter(currentUser.socialLinks?.twitter || "");
      setInstagram(currentUser.socialLinks?.instagram || "");
      setFacebook(currentUser.socialLinks?.facebook || "");
      setProfileImagePreview(currentUser.profileImage || null);
    }
  }, [currentUser]);

  // Phase 3: Load player profile data if user is a player
  useEffect(() => {
    if (currentUser && isPlayer && currentState) {
      const loadPlayerProfile = async () => {
        try {
          setIsLoadingPlayerProfile(true);
          const profile = await getPlayerProfile(currentUser.id, currentState.id);
          if (profile) {
            setPlayerProfile(profile);
            setHeight(profile.height?.toString() || "");
            setWeight(profile.weight?.toString() || "");
            setPosition(profile.position || "");
            setPreferredFoot(profile.preferredFoot || "right");
            setIsPublic(profile.isPublic);
            setHighlightVideos(profile.highlightVideos || []);
            setImages(profile.images || []);
            setAchievements(profile.achievements || []);

            // Phase 11: Load watchlist count if profile is public
            if (profile.isPublic) {
              try {
                const count = await getPlayerWatchlistCount(currentUser.id);
                setWatchlistCount(count);
              } catch (error) {
                console.error("Error loading watchlist count:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error loading player profile:", error);
        } finally {
          setIsLoadingPlayerProfile(false);
        }
      };

      loadPlayerProfile();
    }
  }, [currentUser, isPlayer, currentState?.id]);

  // Phase 4.3: Load transfer history for players
  useEffect(() => {
    if (currentUser && isPlayer && currentState) {
      const loadTransferHistory = async () => {
        try {
          setTransferHistoryLoading(true);
          const requests = await getTransferRequestsByPlayer(currentUser.id, currentState.id);
          
          // Load club data for each request
          const requestsWithClubs = await Promise.all(
            requests.map(async (request) => {
              try {
                const club = await getClub(request.clubId, currentState.id);
                return {
                  ...request,
                  club: club || undefined,
                };
              } catch (error) {
                console.error("Error loading club:", error);
                return request;
              }
            })
          );
          
          setTransferRequests(requestsWithClubs);
        } catch (error) {
          console.error("Error loading transfer history:", error);
        } finally {
          setTransferHistoryLoading(false);
        }
      };

      loadTransferHistory();
    }
  }, [currentUser, isPlayer, currentState?.id]);

  // Phase 4.3: Handle cancel transfer request - show confirmation first
  const handleCancelTransferRequest = (requestId: string) => {
    setRequestToCancel(requestId);
    setShowCancelConfirmModal(true);
  };

  // Phase 4.3: Confirm cancel transfer request
  const confirmCancelTransferRequest = async () => {
    if (!requestToCancel || !currentUser || !currentState) return;

    try {
      setCancellingRequest(true);
      await cancelTransferRequest(requestToCancel, currentState.id);
      window.toast?.success("Request cancelled");
      
      // Reload transfer history
      const requests = await getTransferRequestsByPlayer(currentUser.id, currentState.id);
      const requestsWithClubs = await Promise.all(
        requests.map(async (request) => {
          try {
            const club = await getClub(request.clubId, currentState.id);
            return {
              ...request,
              club: club || undefined,
            };
          } catch (error) {
            console.error("Error loading club:", error);
            return request;
          }
        })
      );
      setTransferRequests(requestsWithClubs);
      
      setShowCancelConfirmModal(false);
      setRequestToCancel(null);
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      window.toast?.error(
        error?.message || "Failed to cancel request. Please try again."
      );
    } finally {
      setCancellingRequest(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        window.toast?.error("Image size should be less than 5MB");
        return;
      }

      setProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Phase 3: Video upload handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !currentState || !e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    try {
      setIsUploadingVideo(true);
      setVideoUploadProgress(0);

      const videoUrl = await uploadVideoToCloudinary(file, (progress) => {
        setVideoUploadProgress(progress);
      });

      await addVideoToProfile(currentUser.id, videoUrl, currentState.id);
      setHighlightVideos((prev) => [...prev, videoUrl]);
      window.toast?.success("Video uploaded successfully!");
    } catch (error) {
      console.error("Error uploading video:", error);
      window.toast?.error(
        error instanceof Error
          ? error.message
          : "Failed to upload video. Please try again."
      );
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
      e.target.value = ""; // Reset input
    }
  };

  // Phase 3: Remove video handler
  const handleRemoveVideo = async (videoUrl: string) => {
    if (!currentUser || !currentState) return;

    try {
      await removeVideoFromProfile(currentUser.id, videoUrl, currentState.id);
      setHighlightVideos((prev) => prev.filter((url) => url !== videoUrl));
      window.toast?.success("Video removed successfully!");
    } catch (error) {
      console.error("Error removing video:", error);
      window.toast?.error("Failed to remove video. Please try again.");
    }
  };

  // Phase 3: Image gallery upload handler
  const handleGalleryImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!currentUser || !currentState || !e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      window.toast?.error("Image size should be less than 5MB");
      return;
    }

    try {
      setIsUploadingImage(true);
      const imageUrl = await uploadImageToImgBB(file);
      await addImageToProfile(currentUser.id, imageUrl, currentState.id);
      setImages((prev) => [...prev, imageUrl]);
      window.toast?.success("Image added to gallery!");
    } catch (error) {
      console.error("Error uploading image:", error);
      window.toast?.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = ""; // Reset input
    }
  };

  // Phase 3: Remove image from gallery
  const handleRemoveImage = async (imageUrl: string) => {
    if (!currentUser || !currentState) return;

    try {
      await removeImageFromProfile(currentUser.id, imageUrl, currentState.id);
      setImages((prev) => prev.filter((url) => url !== imageUrl));
      window.toast?.success("Image removed successfully!");
    } catch (error) {
      console.error("Error removing image:", error);
      window.toast?.error("Failed to remove image. Please try again.");
    }
  };

  // Phase 3: Add achievement handler
  const handleAddAchievement = async () => {
    if (!currentUser || !currentState || !achievementTitle || !achievementDate) {
      if (!currentState) {
        window.toast?.error("State not available");
      } else {
        window.toast?.error("Please fill in all required fields");
      }
      return;
    }

    try {
      await addAchievement(currentUser.id, {
        title: achievementTitle,
        description: achievementDescription || undefined,
        date: new Date(achievementDate),
        category: achievementCategory,
      }, currentState.id);

      const newAchievement: Achievement = {
        id: `ach_${Date.now()}`,
        title: achievementTitle,
        description: achievementDescription || undefined,
        date: new Date(achievementDate),
        category: achievementCategory,
      };

      setAchievements((prev) => [...prev, newAchievement]);
      setAchievementTitle("");
      setAchievementDescription("");
      setAchievementDate("");
      setAchievementCategory("award");
      setShowAchievementForm(false);
      window.toast?.success("Achievement added successfully!");
    } catch (error) {
      console.error("Error adding achievement:", error);
      window.toast?.error("Failed to add achievement. Please try again.");
    }
  };

  // Phase 3: Delete achievement handler
  const handleDeleteAchievement = async (achievementId: string) => {
    if (!currentUser || !currentState) return;

    try {
      await deleteAchievement(currentUser.id, achievementId, currentState.id);
      setAchievements((prev) =>
        prev.filter((ach) => ach.id !== achievementId)
      );
      window.toast?.success("Achievement removed successfully!");
    } catch (error) {
      console.error("Error deleting achievement:", error);
      window.toast?.error("Failed to remove achievement. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setIsSaving(true);

      let imageUrl = currentUser.profileImage || undefined;

      // Upload image if new one is selected
      if (profileImage) {
        setIsUploadingImage(true);
        try {
          imageUrl = await uploadImageToImgBB(profileImage);
          window.toast?.success("Profile image uploaded successfully!");
        } catch (error) {
          console.error("Error uploading image:", error);
          window.toast?.error("Failed to upload profile image. Please try again.");
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Build update object
      const updateData: Partial<typeof currentUser> = {
        name: name.trim() || currentUser.name,
        bio: bio.trim() || undefined,
        ...(imageUrl && { profileImage: imageUrl }),
        location: {
          city: city.trim() || "",
          state: state.trim() || "",
          ...(currentUser.location?.coordinates && {
            coordinates: currentUser.location.coordinates,
          }),
        },
        socialLinks: {
          ...(website.trim() && { website: website.trim() }),
          ...(twitter.trim() && { twitter: twitter.trim() }),
          ...(instagram.trim() && { instagram: instagram.trim() }),
          ...(facebook.trim() && { facebook: facebook.trim() }),
        },
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key as keyof typeof updateData] === undefined ||
          updateData[key as keyof typeof updateData] === ""
        ) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      await updateUserProfile(updateData);

      // Phase 3: Save player profile data if user is a player
      if (isPlayer && currentState) {
        try {
          await savePlayerProfile(currentUser.id, {
            height: height ? parseFloat(height) : undefined,
            weight: weight ? parseFloat(weight) : undefined,
            position: position || undefined,
            preferredFoot,
            isPublic,
            highlightVideos,
            images,
            achievements,
            // Stats are managed separately, not through form
            stats: playerProfile?.stats,
          }, currentState.id);
        } catch (error) {
          console.error("Error saving player profile:", error);
          window.toast?.error("User profile saved, but player profile failed to save.");
        }
      }

      window.toast?.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      window.toast?.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !currentUser || (isPlayer && isLoadingPlayerProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-gray-400">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="bg-dark-lighter rounded-xl shadow-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Profile Image
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={
                    profileImagePreview ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name || currentUser.email
                    )}&background=6366f1&color=fff&size=128`
                  }
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="profile-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="profile-image"
                  className="inline-block px-4 py-2 bg-dark border border-gray-700 rounded-lg text-gray-300 hover:bg-dark-light cursor-pointer transition-colors"
                >
                  {profileImagePreview ? "Change Image" : "Upload Image"}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Max 5MB. JPG, PNG, or GIF
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role
            </label>
            <input
              type="text"
              value={getRoleDisplayName(currentUser.role)}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="Enter your city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                placeholder="Enter your state"
              />
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Twitter
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          {/* Phase 3: Player Profile Sections - Only show if user is a player */}
          {isPlayer && (
            <>
              {/* Physical Attributes */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Physical Attributes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                      placeholder="e.g., 175"
                      min="100"
                      max="250"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                      placeholder="e.g., 75"
                      min="30"
                      max="150"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    >
                      <option value="">Select position</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                      <option value="Defender">Defender</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Forward">Forward</option>
                      <option value="Winger">Winger</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Preferred Foot
                    </label>
                    <select
                      value={preferredFoot}
                      onChange={(e) =>
                        setPreferredFoot(
                          e.target.value as "left" | "right" | "both"
                        )
                      }
                      className="w-full px-4 py-3 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Statistics Display (Read-only) */}
              {playerProfile?.stats && (
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-dark p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Goals</p>
                      <p className="text-2xl font-bold text-white">
                        {playerProfile.stats.goals || 0}
                      </p>
                    </div>
                    <div className="bg-dark p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Assists</p>
                      <p className="text-2xl font-bold text-white">
                        {playerProfile.stats.assists || 0}
                      </p>
                    </div>
                    <div className="bg-dark p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Matches</p>
                      <p className="text-2xl font-bold text-white">
                        {playerProfile.stats.matchesPlayed || 0}
                      </p>
                    </div>
                    <div className="bg-dark p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Win Rate</p>
                      <p className="text-2xl font-bold text-white">
                        {playerProfile.stats.matchesPlayed
                          ? Math.round(
                              ((playerProfile.stats.matchesWon || 0) /
                                playerProfile.stats.matchesPlayed) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Highlights */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Highlight Videos
                </h3>
                <div className="space-y-4">
                  {/* Video Upload */}
                  <div>
                    <input
                      type="file"
                      id="video-upload"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={isUploadingVideo}
                    />
                    <label
                      htmlFor="video-upload"
                      className={`inline-block px-4 py-2 bg-dark border border-gray-700 rounded-lg text-gray-300 hover:bg-dark-light cursor-pointer transition-colors ${
                        isUploadingVideo ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingVideo
                        ? `Uploading... ${videoUploadProgress}%`
                        : "Upload Video"}
                    </label>
                    {isUploadingVideo && (
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${videoUploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Max 100MB. MP4, MOV, AVI, or WebM
                    </p>
                  </div>

                  {/* Video List */}
                  {highlightVideos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {highlightVideos.map((videoUrl, index) => (
                        <div
                          key={index}
                          className="bg-dark p-4 rounded-lg border border-gray-700"
                        >
                          <div className="aspect-video bg-gray-800 rounded mb-2 overflow-hidden">
                            <video
                              src={videoUrl}
                              controls
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideo(videoUrl)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove Video
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Gallery */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Image Gallery
                </h3>
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <input
                      type="file"
                      id="gallery-image-upload"
                      accept="image/*"
                      onChange={handleGalleryImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                    <label
                      htmlFor="gallery-image-upload"
                      className={`inline-block px-4 py-2 bg-dark border border-gray-700 rounded-lg text-gray-300 hover:bg-dark-light cursor-pointer transition-colors ${
                        isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingImage ? "Uploading..." : "Add Image"}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB. JPG, PNG, or GIF
                    </p>
                  </div>

                  {/* Image Grid */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden"
                        >
                          <img
                            src={imageUrl}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(imageUrl)}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Achievements */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    Achievements
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAchievementForm(!showAchievementForm)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm"
                  >
                    {showAchievementForm ? "Cancel" : "Add Achievement"}
                  </button>
                </div>

                {/* Achievement Form */}
                {showAchievementForm && (
                  <div className="bg-dark p-4 rounded-lg mb-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={achievementTitle}
                        onChange={(e) => setAchievementTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-dark-lighter border border-gray-700 text-white focus:outline-none focus:border-primary"
                        placeholder="e.g., Best Player Award"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={achievementDescription}
                        onChange={(e) =>
                          setAchievementDescription(e.target.value)
                        }
                        rows={2}
                        className="w-full px-4 py-3 rounded-lg bg-dark-lighter border border-gray-700 text-white focus:outline-none focus:border-primary resize-none"
                        placeholder="Brief description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={achievementDate}
                          onChange={(e) => setAchievementDate(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg bg-dark-lighter border border-gray-700 text-white focus:outline-none focus:border-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Category *
                        </label>
                        <select
                          value={achievementCategory}
                          onChange={(e) =>
                            setAchievementCategory(
                              e.target.value as Achievement["category"]
                            )
                          }
                          className="w-full px-4 py-3 rounded-lg bg-dark-lighter border border-gray-700 text-white focus:outline-none focus:border-primary"
                        >
                          <option value="award">Award</option>
                          <option value="championship">Championship</option>
                          <option value="personal_best">Personal Best</option>
                          <option value="certification">Certification</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAchievement}
                      className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
                    >
                      Add Achievement
                    </button>
                  </div>
                )}

                {/* Achievements List */}
                {achievements.length > 0 && (
                  <div className="space-y-3">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="bg-dark p-4 rounded-lg border border-gray-700 flex items-start justify-between"
                      >
                        <div>
                          <h4 className="text-white font-medium">
                            {achievement.title}
                          </h4>
                          {achievement.description && (
                            <p className="text-gray-400 text-sm mt-1">
                              {achievement.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              {achievement.category.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(achievement.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteAchievement(achievement.id)
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Phase 4.3: Transfer History */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Transfer History
                </h3>
                
                {transferHistoryLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : transferRequests.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-sm">
                    No transfer requests yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transferRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-dark p-3 sm:p-4 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {request.club && (
                                <>
                                  {request.club.logo ? (
                                    <img
                                      src={request.club.logo}
                                      alt={request.club.name}
                                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-700 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 flex-shrink-0">
                                      <span className="text-xs sm:text-sm font-bold text-gray-500">
                                        {request.club.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium text-sm sm:text-base truncate">
                                      {request.club.name}
                                    </h4>
                                    {request.club.location && (
                                      <p className="text-gray-400 text-xs sm:text-sm truncate">
                                        {request.club.location.city}
                                        {request.club.location.state && `, ${request.club.location.state}`}
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                              <span
                                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                  request.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                    : request.status === "approved"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                    : request.status === "rejected"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/50"
                                    : "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                                }`}
                              >
                                {request.status}
                              </span>
                            </div>
                            <div className="space-y-1 mt-2">
                              {request.position && (
                                <p className="text-gray-400 text-xs sm:text-sm">
                                  Position: <span className="text-white">{request.position}</span>
                                </p>
                              )}
                              {request.jerseyNumber && (
                                <p className="text-gray-400 text-xs sm:text-sm">
                                  Jersey: <span className="text-white">#{request.jerseyNumber}</span>
                                </p>
                              )}
                              <p className="text-gray-500 text-xs">
                                Requested:{" "}
                                {request.requestedAt instanceof Date
                                  ? request.requestedAt.toLocaleDateString()
                                  : new Date(request.requestedAt).toLocaleDateString()}
                              </p>
                              {request.reviewedAt && (
                                <p className="text-gray-500 text-xs">
                                  {request.status === "approved" ? "Approved" : request.status === "rejected" ? "Rejected" : "Cancelled"}:{" "}
                                  {request.reviewedAt instanceof Date
                                    ? request.reviewedAt.toLocaleDateString()
                                    : new Date(request.reviewedAt).toLocaleDateString()}
                                </p>
                              )}
                              {request.rejectionReason && (
                                <p className="text-red-400 text-xs mt-1">
                                  Reason: {request.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleCancelTransferRequest(request.id)}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility Settings */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">
                  Profile Visibility
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="is-public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-5 h-5 text-primary bg-dark border-gray-700 rounded focus:ring-primary"
                  />
                  <label
                    htmlFor="is-public"
                    className="text-gray-300 cursor-pointer"
                  >
                    Make my profile visible to scouts and clubs
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  When enabled, scouts and club managers can discover and view
                  your profile through the talent search.
                </p>
                {/* Phase 11: Show watchlist count if profile is public */}
                {isPublic && watchlistCount !== null && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      🎯 {watchlistCount} {watchlistCount === 1 ? "scout has" : "scouts have"} added you to their watchlist!
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Keep your profile updated to stay on their radar.
                    </p>
                  </div>
                )}

                {/* Public Profile Link */}
                <div className="bg-dark p-4 rounded-lg border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Public Profile Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/player/${currentUser.id}`}
                      className="flex-1 px-4 py-2 rounded-lg bg-dark-lighter border border-gray-700 text-white text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/player/${currentUser.id}`;
                        navigator.clipboard.writeText(link);
                        window.toast?.success("Link copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm whitespace-nowrap"
                    >
                      Copy Link
                    </button>
                    <a
                      href={`/player/${currentUser.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-dark-light hover:bg-dark-light/80 text-white rounded-lg text-sm whitespace-nowrap border border-gray-700"
                    >
                      View Profile
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Share this link with scouts, clubs, or anyone you want to view
                    your profile.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Account Stats */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-white mb-3">
              Account Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Balance</p>
                <p className="text-xl font-bold text-white">
                  ₦{currentUser.balance.toLocaleString()}
                </p>
              </div>
              {currentUser.monkeyCoins !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">MonkeyCoins</p>
                  <p className="text-xl font-bold text-white">
                    {currentUser.monkeyCoins.toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-sm text-white">
                  {new Date(currentUser.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Pitches</p>
                <p className="text-sm text-white">
                  {currentUser.memberOfPitches.length}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <LoadingButton
              type="submit"
              variant="primary"
              isLoading={isSaving || isUploadingImage}
              className="px-8 py-3"
            >
              {isSaving || isUploadingImage
                ? "Saving..."
                : "Save Changes"}
            </LoadingButton>
          </div>
        </form>
      </div>

      {/* Phase 4.3: Cancel Request Confirmation Modal */}
      {showCancelConfirmModal && requestToCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Cancel Request</h2>
              <button
                onClick={() => {
                  setShowCancelConfirmModal(false);
                  setRequestToCancel(null);
                }}
                className="text-gray-400 hover:text-white"
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
              {requestToCancel && (() => {
                const request = transferRequests.find((r) => r.id === requestToCancel);
                return request?.club ? (
                  <>
                    <p className="text-gray-300 text-sm sm:text-base">
                      Are you sure you want to cancel your request to join{" "}
                      <span className="font-semibold text-white">{request.club.name}</span>?
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      This action cannot be undone. You can always send a new request later if you change your mind.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 text-sm sm:text-base">
                      Are you sure you want to cancel this transfer request?
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      This action cannot be undone. You can always send a new request later if you change your mind.
                    </p>
                  </>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCancelConfirmModal(false);
                    setRequestToCancel(null);
                  }}
                  className="flex-1 px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
                >
                  Keep Request
                </button>
                <button
                  onClick={confirmCancelTransferRequest}
                  disabled={cancellingRequest}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRequest ? "Cancelling..." : "Cancel Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

