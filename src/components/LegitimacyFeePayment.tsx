// Phase 4: Legitimacy Fee Payment Component
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface LegitimacyFeePaymentProps {
  clubId: string;
  clubName: string;
  onSuccess: (reference: string, amount: number, validUntil: Date) => void;
  onClose: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

// Get Paystack public key from environment variable
const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
  "pk_test_5531fec931676c977678d80186788589b8c54dfe";

// Annual legitimacy fee amount (in Naira) - can be configured
const LEGITIMACY_FEE_AMOUNT = 50000; // ₦50,000 per year

const LegitimacyFeePayment: React.FC<LegitimacyFeePaymentProps> = ({
  clubId,
  clubName,
  onSuccess,
  onClose,
  disabled = false,
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

    // Calculate expiry date (1 year from now)
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    setTimeout(() => {
      try {
        setIsLoading(true);

        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: currentUser?.email || "",
          amount: LEGITIMACY_FEE_AMOUNT * 100, // Amount in kobo
          currency: "NGN",
          ref: `club_legitimacy_${clubId}_${Date.now()}_${Math.floor(
            Math.random() * 1000000
          )}`,
          label: currentUser?.name || "Club Manager",
          metadata: {
            custom_fields: [
              {
                display_name: "Club ID",
                variable_name: "club_id",
                value: clubId,
              },
              {
                display_name: "Club Name",
                variable_name: "club_name",
                value: clubName,
              },
              {
                display_name: "Payment Type",
                variable_name: "payment_type",
                value: "legitimacy_fee",
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
            onSuccess(response.reference, LEGITIMACY_FEE_AMOUNT, validUntil);
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
              className="animate-spin h-10 w-10 text-primary mb-4"
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

      <div className="bg-dark-lighter rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            Annual Legitimacy Fee
          </h3>
          <p className="text-gray-400 text-sm">
            Pay the annual legitimacy fee to register your club officially. This
            fee is required for participation in official leagues.
          </p>
        </div>

        <div className="bg-dark p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Club Name</span>
            <span className="text-white font-medium">{clubName}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Fee Amount</span>
            <span className="text-2xl font-bold text-primary">
              ₦{LEGITIMACY_FEE_AMOUNT.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Valid Until</span>
            <span className="text-white font-medium">
              {new Date(
                new Date().setFullYear(new Date().getFullYear() + 1)
              ).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={disabled || isLoading || isInitializing}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || isInitializing
            ? "Processing Payment..."
            : `Pay ₦${LEGITIMACY_FEE_AMOUNT.toLocaleString()}`}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By proceeding, you agree to pay the annual legitimacy fee. Payment
          is processed securely through Paystack.
        </p>
      </div>
    </div>
  );
};

export default LegitimacyFeePayment;

