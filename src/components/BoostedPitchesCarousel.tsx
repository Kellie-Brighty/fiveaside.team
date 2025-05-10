import React, { useEffect, useState } from "react";
import type { Pitch } from "../types";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface BoostedPitchesCarouselProps {
  boostedPitches: Pitch[];
}

const BoostedPitchesCarousel: React.FC<BoostedPitchesCarouselProps> = ({
  boostedPitches,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );
  const { currentUser, setSelectedPitchId, joinPitch } = useAuth();

  // Filter boosted pitches to show relevant ones based on user location
  const filteredPitches = boostedPitches.filter((pitch) => {
    // Without user location data, display all featured pitches
    if (!currentUser?.location?.city) return true;

    // Check if pitch's target location matches user's city
    const targetCity = pitch.boostData?.targetLocation?.city?.toLowerCase();
    const userCity = currentUser.location.city.toLowerCase();

    // Show globally boosted pitches to everyone
    if (!targetCity) return true;

    // Display only if target city matches user's location
    return targetCity === userCity;
  });

  // Don't render anything if no pitches to display
  if (filteredPitches.length === 0) {
    return null;
  }

  // Handle automatic rotation of carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideDirection("left");
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === filteredPitches.length - 1 ? 0 : prevIndex + 1
        );
        setIsTransitioning(false);
      }, 500); // Transition duration
    }, 8000); // Rotation interval

    return () => clearInterval(interval);
  }, [filteredPitches.length]);

  // Listen for custom events to show pitch details
  useEffect(() => {
    const handleShowPitchDetails = () => {
      // This will be caught by the PitchesPage component
    };

    window.addEventListener("showPitchDetails", handleShowPitchDetails);

    return () => {
      window.removeEventListener("showPitchDetails", handleShowPitchDetails);
    };
  }, []);

  // Navigate to a specific slide
  const goToSlide = (index: number) => {
    // Determine animation direction based on target slide
    if (
      index > currentIndex ||
      (currentIndex === filteredPitches.length - 1 && index === 0)
    ) {
      setSlideDirection("left");
    } else {
      setSlideDirection("right");
    }

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 500);
  };

  // Navigate to previous slide
  const goToPrevious = () => {
    setSlideDirection("right");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? filteredPitches.length - 1 : prevIndex - 1
      );
      setIsTransitioning(false);
    }, 500);
  };

  // Navigate to next slide
  const goToNext = () => {
    setSlideDirection("left");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === filteredPitches.length - 1 ? 0 : prevIndex + 1
      );
      setIsTransitioning(false);
    }, 500);
  };

  // Handle click to view pitch details and prepare for team access
  const handlePitchSelect = (pitchId: string) => {
    // Set the selected pitch ID in auth context
    setSelectedPitchId(pitchId);

    // Store in localStorage as backup
    localStorage.setItem("selectedPitchId", pitchId);

    // Store current pitch data for reference in other pages
    const selectedPitchObj = filteredPitches.find((p) => p.id === pitchId);
    if (selectedPitchObj) {
      // Ensure customSettings exists with appropriate fallbacks for individual properties
      const customSettings = {
        matchDuration: selectedPitchObj.customSettings?.matchDuration ?? 900,
        maxGoals: selectedPitchObj.customSettings?.maxGoals ?? 7,
        allowDraws: selectedPitchObj.customSettings?.allowDraws ?? false,
        maxPlayersPerTeam:
          selectedPitchObj.customSettings?.maxPlayersPerTeam ?? 5,
      };

      const pitchData = {
        id: pitchId,
        name: selectedPitchObj.name,
        location: selectedPitchObj.location || "",
        // Include customSettings to ensure maxPlayersPerTeam is available
        customSettings,
      };
      localStorage.setItem("selectedPitchData", JSON.stringify(pitchData));
    }

    // Add user to pitch members if needed
    joinPitch(pitchId);
  };

  const currentPitch = filteredPitches[currentIndex];
  if (!currentPitch) return null;

  return (
    <div className="mb-8 relative">
      {/* Football field top gradient */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-green-600 to-green-500 rounded-t-xl z-0"></div>

      {/* Field markings */}
      <div className="absolute top-0 left-0 right-0 bottom-0 z-0 overflow-hidden rounded-xl">
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/30 transform -translate-x-1/2"></div>
        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/30 transform -translate-y-1/2"></div>
        <div className="absolute left-0 right-0 top-0 bottom-0 border-[3px] border-white/30 rounded-xl"></div>
        <div className="absolute left-1/2 top-1/2 w-24 h-24 border-[2px] border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Animated footballs */}
      <div className="absolute w-8 h-8 top-4 right-12 z-0 animate-bounce-slow opacity-30">
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[radial-gradient(black_2px,transparent_0)] bg-[size:3px_3px]"></div>
        </div>
      </div>

      <div className="absolute w-6 h-6 bottom-6 left-10 z-0 animate-ping-slow opacity-20">
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[radial-gradient(black_2px,transparent_0)] bg-[size:3px_3px]"></div>
        </div>
      </div>

      {/* Main container with futuristic styling */}
      <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,255,0,0.15)] border border-green-500/20 z-10">
        {/* Accent lighting effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-green-300 to-green-500 animate-gradient-x"></div>

        <div className="relative h-auto min-h-[350px] md:h-[320px] rounded-lg overflow-hidden">
          {/* Featured badge - positioned to not overlap content */}
          <div className="absolute top-3 left-0 bg-black/60 backdrop-blur-sm border-r border-t border-b border-green-500/40 text-white text-xs font-bold pl-3 pr-6 py-2 rounded-r-full z-10 flex items-center">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-mono tracking-wider mr-1">
              FEATURED
            </span>
            <span className="text-xs opacity-80 font-light">PITCH</span>
          </div>

          {/* Content with transition effects */}
          <div
            className={`w-full h-full transition-all duration-500 ${
              isTransitioning
                ? slideDirection === "left"
                  ? "opacity-0 translate-x-8"
                  : "opacity-0 -translate-x-8"
                : "opacity-100 translate-x-0"
            }`}
          >
            {/* Background image with improved overlay for text visibility */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[5s] ease-in-out transform hover:scale-105"
              style={{
                backgroundImage: currentPitch.boostData?.content?.imageUrl
                  ? `url(${currentPitch.boostData.content.imageUrl})`
                  : `linear-gradient(to bottom right, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.9))`,
              }}
            >
              {/* Improved overlay for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 mix-blend-normal"></div>
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[size:4px_4px] pointer-events-none opacity-20"></div>
              <div className="absolute inset-0 bg-green-900/10 mix-blend-overlay"></div>
            </div>

            {/* Main content with improved layout */}
            <div className="relative h-full flex flex-col z-10 p-6">
              {/* Responsive layout */}
              <div className="flex flex-col sm:flex-row w-full h-full">
                {/* Image section with hexagonal frame */}
                <div className="w-full sm:w-1/2 flex justify-center items-center mb-6 sm:mb-0">
                  <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 group">
                    {/* Hexagonal design elements */}
                    <div className="absolute inset-0 rounded-xl overflow-hidden transform rotate-45 border-2 border-green-500/40 shadow-[0_0_15px_rgba(0,255,0,0.2)] bg-gray-900/60 backdrop-blur-sm"></div>
                    <div className="absolute inset-0 rounded-xl overflow-hidden transform -rotate-45 border-2 border-green-500/40 shadow-[0_0_15px_rgba(0,255,0,0.2)] bg-gray-900/60 backdrop-blur-sm"></div>

                    {/* Image container */}
                    <div className="absolute inset-2 overflow-hidden rounded-lg shadow-inner transform transition-transform duration-700 group-hover:scale-110">
                      {currentPitch.boostData?.content?.imageUrl ? (
                        <img
                          src={currentPitch.boostData.content.imageUrl}
                          alt={currentPitch.name}
                          className="w-full h-full object-cover"
                        />
                      ) : currentPitch.logo ? (
                        <img
                          src={currentPitch.logo}
                          alt={currentPitch.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 text-4xl font-bold">
                          {currentPitch.name.charAt(0)}
                        </div>
                      )}

                      {/* Image overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-900/30 to-transparent mix-blend-overlay"></div>
                    </div>
                  </div>
                </div>

                {/* Text content section - with improved contrast */}
                <div className="w-full sm:w-1/2 flex flex-col justify-center text-white px-3">
                  {/* Pitch name with accent */}
                  <div className="relative mb-2">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                      {currentPitch.name}
                    </h3>
                    <span className="absolute -bottom-1 left-0 h-[2px] w-16 bg-green-500 animate-pulse-slow"></span>
                  </div>

                  {/* Location indicator */}
                  <div className="flex items-center text-sm mb-3 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 w-fit">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-xs sm:text-sm font-mono tracking-wide truncate text-green-300">
                      {currentPitch.city},{" "}
                      {currentPitch.state || currentPitch.country}
                    </span>
                  </div>

                  {/* Description with improved background for readability */}
                  <div className="mb-4 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/40 scrollbar-track-transparent pr-1 bg-black/50 backdrop-blur-sm rounded-md p-2 border-l-2 border-green-500/40">
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {currentPitch.boostData?.content?.text ||
                        currentPitch.description ||
                        "Experience premium football at this exceptional venue!"}
                    </p>
                  </div>

                  {/* Action buttons - properly routed and positioned */}
                  <div className="mt-auto pt-2 z-20 relative flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Main button to view pitch details */}
                    <button
                      onClick={() => {
                        handlePitchSelect(currentPitch.id);
                        // Display modal with selected pitch details
                        const pitchDetailsEvent = new CustomEvent(
                          "showPitchDetails",
                          {
                            detail: {
                              pitchId: currentPitch.id,
                              showModal: true,
                            },
                          }
                        );
                        window.dispatchEvent(pitchDetailsEvent);
                      }}
                      className="relative w-full sm:w-auto flex-1 bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white font-medium py-2 sm:py-3 px-6 rounded-md transition-all duration-300 flex items-center justify-center group overflow-hidden"
                    >
                      {/* Button effects */}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-500/10 to-transparent"></span>
                      <span className="absolute top-0 left-0 right-0 h-[1px] bg-green-400/60"></span>
                      <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-green-400/30"></span>

                      <span className="relative z-10 flex items-center">
                        <span className="mr-2">View Details</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </span>
                    </button>

                    {/* Direct link to team page */}
                    <Link
                      to="/teams"
                      onClick={() => handlePitchSelect(currentPitch.id)}
                      className="relative w-full sm:w-auto flex-1 bg-purple-700 hover:bg-purple-600 text-white font-medium py-2 sm:py-3 px-6 rounded-md transition-all duration-300 flex items-center justify-center"
                    >
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        Play Here
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation controls - improved for touch targets */}
          {filteredPitches.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-green-900/80 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all z-20 backdrop-blur-sm border border-green-500/30"
                aria-label="Previous pitch"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-green-900/80 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all z-20 backdrop-blur-sm border border-green-500/30"
                aria-label="Next pitch"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Slide indicators */}
          {filteredPitches.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 z-20">
              {filteredPitches.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentIndex === index
                      ? "bg-green-400 w-8 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                      : "bg-white/40 hover:bg-white/60 w-2"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Field bottom gradient - positioned not to overlap with content */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-600 to-green-500 rounded-b-xl opacity-90 z-0"></div>
        </div>
      </div>
    </div>
  );
};

export default BoostedPitchesCarousel;
