import React, { useState } from "react";
import PitchBoost, { type BoostOption, BOOST_OPTIONS } from "./PitchBoost";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { uploadImageToImgBB } from "../utils/imgUpload";

// Define the Pitch interface with boost data instead of subscription
interface Pitch {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  boostData?: {
    isActive: boolean;
    boostType: string;
    startDate: Date | Timestamp | null;
    endDate: Date | Timestamp | null;
    transactionRef?: string;
    lastPaymentDate?: Date | Timestamp | null;
    content?: {
      text?: string;
      imageUrl?: string;
    };
    targetLocation?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
}

interface BoostInfoProps {
  pitch: Pitch;
  userEmail: string;
  onBoostUpdate: () => void;
}

const BoostInfo: React.FC<BoostInfoProps> = ({
  pitch,
  userEmail,
  onBoostUpdate,
}) => {
  const [selectedBoost, setSelectedBoost] = useState<BoostOption>(
    BOOST_OPTIONS[0]
  );
  const [boostContent, setBoostContent] = useState<string>(
    pitch.boostData?.content?.text || ""
  );
  const [boostImage, setBoostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    pitch.boostData?.content?.imageUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [numDays, setNumDays] = useState<number>(1);
  const [targetLocation, setTargetLocation] = useState<{
    city?: string;
    state?: string;
    country?: string;
  }>({
    city: pitch.city || pitch.boostData?.targetLocation?.city || "",
    state: pitch.state || pitch.boostData?.targetLocation?.state || "",
    country:
      pitch.country || pitch.boostData?.targetLocation?.country || "Nigeria",
  });

  // Calculate if boost is active and days remaining
  const isActive = pitch.boostData?.isActive || false;

  // Handle Firebase Timestamp conversion for end date
  const endDate = (() => {
    if (!pitch.boostData?.endDate) return null;

    const expiry = pitch.boostData.endDate;

    // If it's already a Date object
    if (expiry instanceof Date) return expiry;

    // If it's a Firebase Timestamp
    if (typeof expiry === "object" && expiry !== null && "toDate" in expiry) {
      return expiry.toDate();
    }

    // Fall back to treating it as a date string/number
    return new Date(expiry as any);
  })();

  const isExpired = endDate ? endDate < new Date() : true;
  const daysRemaining =
    endDate && !isExpired
      ? Math.max(
          0,
          Math.ceil(
            (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Get current boost type if active
  const currentBoostType = pitch.boostData?.boostType || "";
  const currentBoost = BOOST_OPTIONS.find(
    (boost) => boost.id === currentBoostType
  );

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        window.toast?.error("Image size should be less than 5MB");
        return;
      }

      setBoostImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to ImgBB
  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      const imageUrl = await uploadImageToImgBB(file);
      return imageUrl;
    } finally {
      setIsUploading(false);
    }
  };

  // Update boost content
  const updateBoostContent = async () => {
    if (!pitch.boostData?.isActive) {
      window.toast?.warning("Activate a boost plan first!");
      return;
    }

    try {
      setIsUploading(true);
      const pitchRef = doc(db, "pitches", pitch.id);

      let imageUrl = pitch.boostData?.content?.imageUrl || null;

      // Upload new image if selected
      if (boostImage) {
        imageUrl = await uploadImage(boostImage);
      }

      // Update boost data with new content
      await updateDoc(pitchRef, {
        "boostData.content": {
          text: boostContent,
          imageUrl: imageUrl,
        },
        "boostData.targetLocation": targetLocation,
      });

      window.toast?.success("Boost content updated successfully!");
      onBoostUpdate();
    } catch (error) {
      console.error("Error updating boost content:", error);
      window.toast?.error("Failed to update boost content. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentSuccess = async (
    reference: string,
    boostOption: BoostOption,
    days: number
  ) => {
    // Calculate new end date (now + selected number of days)
    const currentDate = new Date();
    const newEndDate = new Date(currentDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    try {
      // Upload image if available
      let imageUrl = pitch.boostData?.content?.imageUrl || null;
      if (boostImage) {
        imageUrl = await uploadImage(boostImage);
      }

      // Update the pitch boost data in Firestore
      const pitchRef = doc(db, "pitches", pitch.id);

      // Create update object with boost data
      const update: any = {
        boostData: {
          isActive: true,
          boostType: boostOption.id,
          startDate: currentDate,
          endDate: newEndDate,
          transactionRef: reference,
          lastPaymentDate: currentDate,
          content: {
            text: boostContent,
            imageUrl: imageUrl,
          },
          targetLocation: targetLocation,
        },
      };

      await updateDoc(pitchRef, update);

      // Call the callback to refresh data
      onBoostUpdate();

      // Provide feedback to the user
      window.toast?.success(
        isActive
          ? `Your pitch has been boosted with ${
              boostOption.name
            } for ${days} day${days > 1 ? "s" : ""}!`
          : `Your pitch is now boosted with ${
              boostOption.name
            } for ${days} day${days > 1 ? "s" : ""}!`
      );
    } catch (error) {
      console.error("Error updating boost:", error);
      window.toast?.error("Failed to apply boost. Please contact support.");
    }
  };

  const handlePaymentClose = () => {
    console.log("Payment closed without completion");
  };

  // Calculate total price based on selected boost and number of days
  const totalPrice = selectedBoost.price * numDays;

  // Handle days input change
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setNumDays(1);
    } else if (value > 30) {
      setNumDays(30);
    } else {
      setNumDays(value);
    }
  };

  // Increment days
  const incrementDays = () => {
    if (numDays < 30) {
      setNumDays(numDays + 1);
    }
  };

  // Decrement days
  const decrementDays = () => {
    if (numDays > 1) {
      setNumDays(numDays - 1);
    }
  };

  return (
    <div className="bg-dark-lighter rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-2">Pitch Boost</h3>

      <div className="mb-6">
        <p className="text-sm text-gray-300 mb-3">
          Boost your pitch to increase visibility and attract more players to
          your venue.
        </p>

        {/* Boost Status */}
        {isActive && !isExpired && (
          <div className="mb-6 p-4 bg-dark rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Current Boost:</span>
              <span className="text-sm font-medium text-green-500">
                {currentBoost?.name || "Custom Boost"}
              </span>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Status:</span>
              <span className="text-sm font-medium text-green-500">
                Active ({daysRemaining} days left)
              </span>
            </div>

            {endDate && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Expires:</span>
                <span className="text-sm font-medium">
                  {endDate.toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="h-2 bg-dark-light rounded-full overflow-hidden mt-3 mb-1">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${Math.min(
                    100,
                    (daysRemaining / (currentBoost?.durationDays || 30)) * 100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Boost Content Section */}
        <div className="mb-6 p-4 bg-dark rounded-lg">
          <h4 className="font-medium mb-3">Boost Content</h4>

          {/* Target Location */}
          <div className="mb-4">
            <label
              htmlFor="target-city"
              className="block text-sm font-medium text-gray-400 mb-1"
            >
              Target City
            </label>
            <input
              type="text"
              id="target-city"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={targetLocation.city}
              onChange={(e) =>
                setTargetLocation({ ...targetLocation, city: e.target.value })
              }
              placeholder="e.g. Lagos"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your ad will be shown to users in this city
            </p>
          </div>

          {/* Ad Text */}
          <div className="mb-4">
            <label
              htmlFor="boost-text"
              className="block text-sm font-medium text-gray-400 mb-1"
            >
              Ad Text
            </label>
            <textarea
              id="boost-text"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={boostContent}
              onChange={(e) => setBoostContent(e.target.value)}
              rows={3}
              placeholder="Enter compelling text about your pitch..."
            ></textarea>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label
              htmlFor="boost-image"
              className="block text-sm font-medium text-gray-400 mb-1"
            >
              Ad Image
            </label>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-4 mb-3">
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Boost preview"
                    className="w-full h-48 object-cover rounded-md mb-2"
                  />
                  <button
                    onClick={() => {
                      setBoostImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
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
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-gray-500 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    Upload an image to make your ad stand out
                  </p>
                </>
              )}
              <input
                type="file"
                id="boost-image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                onClick={() => document.getElementById("boost-image")?.click()}
                className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                type="button"
              >
                {imagePreview ? "Change Image" : "Select Image"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Max file size: 5MB. Recommended size: 1200×628 pixels
            </p>
          </div>

          {/* Save Content Button */}
          <button
            onClick={updateBoostContent}
            disabled={isUploading || !isActive}
            className={`w-full py-2 rounded-md text-white ${
              isUploading || !isActive
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Uploading...
              </span>
            ) : !isActive ? (
              "Activate a boost first"
            ) : (
              "Save Ad Content"
            )}
          </button>
        </div>

        {/* Boost Options */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {BOOST_OPTIONS.map((boost) => (
            <div
              key={boost.id}
              className={`border rounded-lg p-5 cursor-pointer transition-all ${
                selectedBoost.id === boost.id
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => setSelectedBoost(boost)}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <h4 className="font-medium text-lg">{boost.name}</h4>
                <span className="font-bold text-green-500 text-lg">
                  ₦{boost.price.toLocaleString()}/day
                </span>
              </div>
              <p className="text-sm text-gray-400">{boost.description}</p>
            </div>
          ))}
        </div>

        {/* Days Selection */}
        <div className="mb-8">
          <label
            htmlFor="days"
            className="block text-base font-medium text-gray-300 mb-3"
          >
            Number of Days
          </label>
          <div className="flex items-center max-w-xs mx-auto sm:mx-0">
            <button
              type="button"
              onClick={decrementDays}
              disabled={numDays <= 1}
              className={`flex-none w-12 h-12 flex items-center justify-center rounded-l-lg ${
                numDays <= 1
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-dark text-white hover:bg-gray-700"
              }`}
              aria-label="Decrease days"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <input
              type="number"
              id="days"
              value={numDays}
              onChange={handleDaysChange}
              min="1"
              max="30"
              className="flex-grow text-center py-3 h-12 bg-dark border-y border-gray-700 text-white text-xl font-medium focus:outline-none"
            />
            <button
              type="button"
              onClick={incrementDays}
              disabled={numDays >= 30}
              className={`flex-none w-12 h-12 flex items-center justify-center rounded-r-lg ${
                numDays >= 30
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-dark text-white hover:bg-gray-700"
              }`}
              aria-label="Increase days"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <p className="text-sm text-gray-400 mb-2 sm:mb-0">
              Select between 1-30 days
            </p>
            <p className="text-lg font-bold text-green-500 bg-green-500/10 py-2 px-4 rounded-lg">
              Total: ₦{totalPrice.toLocaleString()}
            </p>
          </div>
        </div>

        <PitchBoost
          email={userEmail}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
          selectedBoost={selectedBoost}
          numDays={numDays}
        />

        <div className="text-xs text-gray-500 mt-3">
          By boosting your pitch, you increase its visibility on the platform
          and attract more players.
        </div>
      </div>
    </div>
  );
};

export default BoostInfo;
