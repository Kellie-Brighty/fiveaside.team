/**
 * Utility function to upload images to ImgBB
 */

/**
 * Uploads an image to ImgBB
 * @param file The image file to upload
 * @returns The URL of the uploaded image
 */
export const uploadImageToImgBB = async (file: File): Promise<string> => {
  try {
    const API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

    if (!API_KEY) {
      throw new Error(
        "ImgBB API key not found. Please add VITE_IMGBB_API_KEY to your .env file."
      );
    }

    // Create form data
    const formData = new FormData();
    formData.append("image", file);
    formData.append("key", API_KEY);

    // Upload to ImgBB
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ImgBB upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      // Return the direct image URL
      return data.data.url;
    } else {
      throw new Error("ImgBB upload failed");
    }
  } catch (error) {
    console.error("Error uploading image to ImgBB:", error);
    throw error;
  }
};
