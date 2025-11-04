// Coming Soon Page - Placeholder for upcoming features
import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const ComingSoonPage: React.FC = () => {
  const { feature } = useParams<{ feature: string }>();
  const navigate = useNavigate();

  const getFeatureInfo = (featureName?: string) => {
    switch (featureName) {
      case "ticketing":
        return {
          title: "Electronic Ticketing",
          description: "Purchase tickets for matches at the Ondo State Stadium Complex. QR codes, seat selection, and instant validation coming soon!",
          icon: "🎫",
        };
      case "betting":
        return {
          title: "Betting System",
          description: "Place bets on matches with secure escrow system. Boardman peer-to-peer wagering and traditional betting coming soon!",
          icon: "🎲",
        };
      default:
        return {
          title: "Coming Soon",
          description: "This feature is under development and will be available soon.",
          icon: "🚧",
        };
    }
  };

  const featureInfo = getFeatureInfo(feature);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">{featureInfo.icon}</div>
        <h1 className="text-3xl font-bold text-white mb-4">{featureInfo.title}</h1>
        <p className="text-gray-400 mb-6">{featureInfo.description}</p>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/")}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-dark border border-gray-700 hover:bg-dark-light text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

