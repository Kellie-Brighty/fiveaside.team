import React, { useState } from "react";
import PitchBoost, { type BoostOption, BOOST_OPTIONS } from "./PitchBoost";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

// Define the Pitch interface with boost data instead of subscription
interface Pitch {
  id: string;
  name: string;
  boostData?: {
    isActive: boolean;
    boostType: string;
    startDate: Date | Timestamp | null;
    endDate: Date | Timestamp | null;
    transactionRef?: string;
    lastPaymentDate?: Date | Timestamp | null;
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

  const handlePaymentSuccess = async (
    reference: string,
    boostOption: BoostOption
  ) => {
    // Calculate new end date (now + duration days)
    const currentDate = new Date();
    const newEndDate = new Date(currentDate);
    newEndDate.setDate(newEndDate.getDate() + boostOption.durationDays);

    try {
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
        },
      };

      await updateDoc(pitchRef, update);

      // Call the callback to refresh data
      onBoostUpdate();

      // Provide feedback to the user
      window.toast?.success(
        isActive
          ? `Your pitch has been boosted with ${boostOption.name}!`
          : `Your pitch is now boosted with ${boostOption.name}!`
      );
    } catch (error) {
      console.error("Error updating boost:", error);
      window.toast?.error("Failed to apply boost. Please contact support.");
    }
  };

  const handlePaymentClose = () => {
    console.log("Payment closed without completion");
  };

  // Function to show action button text
  // const getActionButtonText = () => {
  //   if (!isActive || isExpired) {
  //     return "Boost Now";
  //   } else {
  //     return "Upgrade Boost";
  //   }
  // };

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

        {/* Boost Options */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          {BOOST_OPTIONS.map((boost) => (
            <div
              key={boost.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedBoost.id === boost.id
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => setSelectedBoost(boost)}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-medium">{boost.name}</h4>
                <span className="font-bold text-green-500">
                  ₦{boost.price.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-1">{boost.description}</p>
              <p className="text-xs text-gray-500">
                Duration: {boost.durationDays} days
              </p>
            </div>
          ))}
        </div>

        <PitchBoost
          email={userEmail}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
          selectedBoost={selectedBoost}
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
