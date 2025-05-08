import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import type { Pitch } from "../types";

const RefereeOverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [assignedPitches, setAssignedPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignedPitches = async () => {
      if (!currentUser || currentUser.role !== "referee") {
        setError("You must be logged in as a referee to view this page");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const pitchesQuery = query(
          collection(db, "pitches"),
          where("referees", "array-contains", currentUser.id)
        );

        const querySnapshot = await getDocs(pitchesQuery);
        const pitches: Pitch[] = [];

        querySnapshot.forEach((doc) => {
          const pitchData = doc.data();
          pitches.push({
            id: doc.id,
            name: pitchData.name,
            city: pitchData.city,
            country: pitchData.country,
            referees: pitchData.referees || [],
            ownerId: pitchData.ownerId,
            createdAt: pitchData.createdAt.toDate(),
            location: pitchData.location,
            address: pitchData.address,
            state: pitchData.state,
            coordinates: pitchData.coordinates,
            description: pitchData.description,
            logo: pitchData.logo,
            customSettings: pitchData.customSettings,
            availability: pitchData.availability,
            pricePerPerson: pitchData.pricePerPerson,
          });
        });

        setAssignedPitches(pitches);
      } catch (err) {
        console.error("Error fetching assigned pitches:", err);
        setError(
          "Failed to load your assigned pitches. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedPitches();
  }, [currentUser]);

  const handleViewMatches = (pitchId: string) => {
    // Navigate to MatchesPage with the selected pitch
    navigate("/matches", { state: { pitchId } });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 mt-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-gray-700 rounded mb-4 mx-auto"></div>
          <div className="h-64 w-full max-w-md bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 mt-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        My Assigned Pitches
      </h1>

      {assignedPitches.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-4">
            You don't have any pitches assigned to you yet.
          </p>
          <p className="text-gray-400 text-sm">
            Pitch owners will assign you to their pitches when they need a
            referee.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedPitches.map((pitch) => (
            <div
              key={pitch.id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  {pitch.name}
                </h2>
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">Location:</span>{" "}
                  {pitch.address || pitch.location}
                </p>
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">City:</span> {pitch.city},{" "}
                  {pitch.state || pitch.country}
                </p>

                {pitch.description && (
                  <p className="text-gray-400 mt-3 text-sm">
                    {pitch.description}
                  </p>
                )}

                {pitch.customSettings && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-md font-semibold text-white mb-2">
                      Pitch Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-300">
                        <span className="text-gray-400">Match Duration:</span>{" "}
                        {Math.floor(pitch.customSettings.matchDuration / 60)}{" "}
                        minutes
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Max Goals:</span>{" "}
                        {pitch.customSettings.maxGoals}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Players Per Team:</span>{" "}
                        {pitch.customSettings.maxPlayersPerTeam}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Draws Allowed:</span>{" "}
                        {pitch.customSettings.allowDraws ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                )}

                {pitch.availability && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-md font-semibold text-white mb-2">
                      Operating Hours
                    </h3>
                    <p className="text-gray-300 text-sm">
                      <span className="text-gray-400">Open:</span>{" "}
                      {pitch.availability.openingTime} -{" "}
                      {pitch.availability.closingTime}
                    </p>
                    <p className="text-gray-300 text-sm">
                      <span className="text-gray-400">Days:</span>{" "}
                      {pitch.availability.daysOpen
                        .map(
                          (day) => day.charAt(0).toUpperCase() + day.slice(1)
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => handleViewMatches(pitch.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 transition-colors text-white font-medium rounded-lg flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    View Today's Matches
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RefereeOverviewPage;
