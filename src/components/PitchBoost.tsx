import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface BoostOption {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  coverage: "local" | "regional" | "national";
}

interface PitchBoostProps {
  email: string;
  onSuccess: (reference: string, boostOption: BoostOption) => void;
  onClose: () => void;
  disabled?: boolean;
  selectedBoost: BoostOption;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

// Get Paystack public key from environment variable
// Fall back to test key if environment variable is not defined
const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
  "pk_test_5531fec931676c977678d80186788589b8c54dfe";

// Pre-defined boost options
export const BOOST_OPTIONS: BoostOption[] = [
  {
    id: "basic",
    name: "City Boost",
    description: "Increase visibility within your city for 7 days",
    price: 2000, // ₦2,000
    durationDays: 7,
    coverage: "local",
  },
  {
    id: "standard",
    name: "Regional Boost",
    description: "Show your pitch to users in nearby cities for 14 days",
    price: 5000, // ₦5,000
    durationDays: 14,
    coverage: "regional",
  },
  {
    id: "premium",
    name: "National Boost",
    description: "Maximum visibility across the entire country for 30 days",
    price: 10000, // ₦10,000
    durationDays: 30,
    coverage: "national",
  },
];

const PitchBoost: React.FC<PitchBoostProps> = ({
  email,
  onSuccess,
  onClose,
  disabled = false,
  selectedBoost,
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const handlePayment = () => {
    if (!window.PaystackPop) {
      window.toast?.error(
        "Payment service not available. Please try again later."
      );
      return;
    }

    setIsInitializing(true);

    // Show initializing state for at least 500ms to avoid flash
    setTimeout(() => {
      try {
        setIsLoading(true);

        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY, // Use environment variable
          email: email,
          amount: selectedBoost.price * 100, // Amount in kobo
          currency: "NGN",
          ref: `pitch_boost_${selectedBoost.id}_${Date.now()}_${Math.floor(
            Math.random() * 1000000
          )}`,
          label: currentUser?.name || "Pitch Owner",
          metadata: {
            custom_fields: [
              {
                display_name: "Boost Type",
                variable_name: "boost_type",
                value: selectedBoost.id,
              },
              {
                display_name: "Duration (Days)",
                variable_name: "duration_days",
                value: selectedBoost.durationDays.toString(),
              },
              {
                display_name: "User ID",
                variable_name: "user_id",
                value: currentUser?.id || "",
              },
            ],
          },
          onClose: () => {
            setIsLoading(false);
            setIsInitializing(false);
            onClose();
          },
          callback: (response: { reference: string }) => {
            setIsLoading(false);
            setIsInitializing(false);
            onSuccess(response.reference, selectedBoost);
          },
        });

        handler.openIframe();
      } catch (error) {
        console.error("Error initializing Paystack:", error);
        window.toast?.error("Failed to initialize payment. Please try again.");
        setIsLoading(false);
        setIsInitializing(false);
      }
    }, 500);
  };

  return (
    <div>
      {isInitializing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter rounded-lg p-6 flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-green-500 mb-4"
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
            <p className="text-white text-lg font-medium">
              Initializing Payment...
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Please wait while we connect to Paystack
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={disabled || isLoading || isInitializing}
        className={`w-full py-3 rounded-lg font-medium text-white ${
          disabled || isLoading || isInitializing
            ? "bg-gray-700 opacity-60 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 active:bg-green-800"
        } transition-all flex items-center justify-center`}
      >
        {isLoading ? (
          <>
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
            Processing...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.31 11.14C10.54 10.69 9.97 10.2 9.97 9.47C9.97 8.63 10.76 8.04 12.07 8.04C13.45 8.04 13.97 8.7 14.01 9.68H15.72C15.67 8.34 14.85 7.11 13.23 6.71V5H10.9V6.69C9.39 7.01 8.18 7.99 8.18 9.5C8.18 11.29 9.67 12.19 11.84 12.71C13.79 13.17 14.18 13.86 14.18 14.58C14.18 15.11 13.79 15.97 12.08 15.97C10.48 15.97 9.85 15.25 9.76 14.33H8.04C8.14 16.03 9.4 16.99 10.9 17.3V19H13.24V17.33C14.76 17.04 15.96 16.17 15.97 14.56C15.96 12.36 14.07 11.6 12.31 11.14Z"
                fill="currentColor"
              />
            </svg>
            Pay ₦{selectedBoost.price.toLocaleString()} for {selectedBoost.name}
          </>
        )}
      </button>
    </div>
  );
};

export default PitchBoost;
