/**
 * Utility function to upload videos to Cloudinary
 * Phase 3: Video upload for player profiles
 */

/**
 * Uploads a video to Cloudinary
 * @param file The video file to upload
 * @param onProgress Optional progress callback
 * @returns The URL of the uploaded video
 */
export const uploadVideoToCloudinary = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary credentials not found. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error("Video file size must be less than 100MB");
    }

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Invalid video format. Supported formats: MP4, MPEG, MOV, AVI, WebM"
      );
    }

    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "video");
    formData.append("folder", "monkeypost/videos"); // Organize videos in a folder

    // Upload to Cloudinary using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.secure_url) {
              resolve(response.secure_url);
            } else {
              reject(new Error("Upload failed: No URL in response"));
            }
          } catch (error) {
            reject(
              new Error(
                `Failed to parse response: ${error instanceof Error ? error.message : "Unknown error"}`
              )
            );
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(
              new Error(
                errorResponse.error?.message || `Upload failed with status ${xhr.status}`
              )
            );
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was cancelled"));
      });

      // Start upload
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
      );
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error uploading video to Cloudinary:", error);
    throw error;
  }
};

/**
 * Get video thumbnail URL from Cloudinary video URL
 * @param videoUrl The Cloudinary video URL
 * @returns The thumbnail URL
 */
export const getVideoThumbnail = (videoUrl: string): string => {
  // Cloudinary automatically generates thumbnails
  // Replace /upload/ with /upload/so_0,w_300,h_200,c_fill/
  if (videoUrl.includes("cloudinary.com")) {
    return videoUrl.replace(
      "/upload/",
      "/upload/so_0,w_300,h_200,c_fill/"
    );
  }
  return videoUrl;
};

