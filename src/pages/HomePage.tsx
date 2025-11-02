import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getAllClubs } from "../services/clubService";
import { searchPlayerProfiles } from "../services/playerProfileService";
import shortLogo from "../assets/short-logo.png";


const HomePage: React.FC = () => {
  const {
    isAuthenticated,
    isPitchOwner,
    isClubManager,
    isScout,
    isMinistryOfficial,
    currentUser,
  } = useAuth();
  const [stats, setStats] = useState({
    totalClubs: 0,
    totalPlayers: 0,
    legitimateClubs: 0,
    verifiedClubs: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    // Load statistics
    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [allClubs, publicPlayers] = await Promise.all([
          getAllClubs(),
          searchPlayerProfiles({ isPublic: true }),
        ]);

        const legitimateClubs = allClubs.filter((c) => c.isLegitimate).length;
        const verifiedClubs = allClubs.filter(
          (c) => c.registrationNumber
        ).length;

        setStats({
          totalClubs: allClubs.length,
          totalPlayers: publicPlayers.length,
          legitimateClubs,
          verifiedClubs,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div>
      {/* Hero Section - Prioritize Clubs/Talent */}
      <div className="relative overflow-hidden rounded-xl mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 backdrop-blur-sm rounded-xl"></div>
        <div className="relative z-10 text-center py-12 px-4 sm:py-16">
          <div className="mb-4 flex justify-center">
            <img
              src={shortLogo}
              alt="MonkeyPost"
              className="h-16 sm:h-20 w-auto mb-4"
            />
          </div>
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-dark text-xs font-medium rounded-full mb-3">
              Comprehensive Football Platform
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold sport-gradient-text mb-4 tracking-tight">
            Connect, Play & Grow
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join official clubs, discover talent, and build your football career.
            From grassroots play to professional development - your journey starts
            here.
          </p>

          {/* Hero CTAs - Role-aware */}
          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="relative overflow-hidden group text-white px-8 py-3.5 rounded-lg text-base sm:text-lg font-medium bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    ></path>
                  </svg>
                  Get Started
                </span>
                <div className="absolute top-0 left-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
              </Link>
              <Link
                to="/clubs"
                className="text-white px-6 py-3 rounded-lg text-base sm:text-lg font-medium bg-dark-lighter border border-primary/50 hover:bg-dark-lighter/80 hover:border-primary transition-all duration-300"
              >
                Browse Clubs
              </Link>
            </div>
          ) : isClubManager ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/my-clubs"
                className="btn-primary inline-block px-6 py-2"
              >
                My Clubs
              </Link>
              <Link
                to="/club/register"
                className="btn-secondary inline-block px-6 py-2"
              >
                Register New Club
              </Link>
              <Link
                to="/talent-pool"
                className="btn-secondary inline-block px-6 py-2"
              >
                Discover Talent
              </Link>
            </div>
          ) : isScout ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/talent-pool"
                className="btn-primary inline-block px-6 py-2"
              >
                Explore Talent Pool
              </Link>
              <Link
                to="/clubs"
                className="btn-secondary inline-block px-6 py-2"
              >
                Browse Clubs
              </Link>
            </div>
          ) : isPitchOwner ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/pitches"
                className="btn-primary inline-block px-6 py-2"
              >
                Manage Your Pitches
              </Link>
            </div>
          ) : currentUser?.role === "player" ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/clubs"
                className="btn-primary inline-block px-6 py-2"
              >
                Browse Clubs
              </Link>
              <Link
                to="/talent-pool"
                className="btn-secondary inline-block px-6 py-2"
              >
                Join Talent Pool
              </Link>
              <Link
                to="/pitches"
                className="btn-secondary inline-block px-6 py-2"
              >
                Find Pitches
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/clubs"
                className="btn-primary inline-block px-6 py-2"
              >
                Browse Clubs
              </Link>
              <Link
                to="/pitches"
                className="btn-secondary inline-block px-6 py-2"
              >
                Find Pitches
              </Link>
            </div>
          )}

          {/* Stats Preview */}
          {!loadingStats && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                  {stats.totalClubs}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Clubs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-secondary mb-1">
                  {stats.totalPlayers}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Players</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">
                  {stats.legitimateClubs}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Legitimate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">
                  {stats.verifiedClubs}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Verified</div>
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[-5%] right-[-5%] w-40 h-40 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-40 h-40 bg-secondary/20 rounded-full blur-xl"></div>
      </div>

      {/* Primary Features Section - Clubs/Talent First */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold sport-gradient-text mb-8 text-center">
          Core Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Discover & Join Clubs */}
          <div className="team-card glow-effect">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full"></div>
            <div className="relative">
              <h3 className="text-xl font-bold mb-3 text-primary flex items-center">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Discover & Join Clubs
              </h3>
              <p className="text-gray-300 mb-4">
                Browse official football clubs, view rosters, and request to join.
                Connect with clubs that match your playing style and career goals.
              </p>
              <Link to="/clubs" className="btn-primary inline-block">
                Browse Clubs
              </Link>
            </div>
          </div>

          {/* Talent Discovery */}
          <div className="team-card glow-effect">
            <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/10 rounded-bl-full"></div>
            <div className="relative">
              <h3 className="text-xl font-bold mb-3 text-secondary flex items-center">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Talent Discovery
              </h3>
              <p className="text-gray-300 mb-4">
                Showcase your skills and get discovered. Scouts and club managers
                can find you through comprehensive player profiles and statistics.
              </p>
              <Link to="/talent-pool" className="btn-secondary inline-block">
                Explore Talent Pool
              </Link>
            </div>
          </div>

          {/* Club Registry & Management */}
          <div className="team-card glow-effect">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full"></div>
            <div className="relative">
              <h3 className="text-xl font-bold mb-3 text-green-400 flex items-center">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Club Registry
              </h3>
              <p className="text-gray-300 mb-4">
                Register your official club, manage rosters, and recruit players.
                Official legitimacy system for professional club operations.
              </p>
              {isClubManager || currentUser?.role === "admin" ? (
                <Link
                  to="/my-clubs"
                  className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-2 rounded-md inline-block"
                >
                  My Clubs
                </Link>
              ) : (
                <Link to="/club/register" className="btn-primary inline-block">
                  Register Club
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Features - Pitch/Matches (Grassroots) */}
      <section className="card p-6 bg-gradient-to-br from-dark-lighter to-dark-lighter/50 border border-primary/30 mb-12 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 text-primary">
            Play Today - Grassroots Football
          </h3>
          <p className="text-gray-300 mb-6 max-w-3xl">
            Not ready for club football? No problem! Find a pitch near you,
            create your team or join an existing one, and play daily five-a-side
            matches with friends or new teammates. Winner-stays-on system keeps
            the action going!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/pitches"
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-md shadow-lg shadow-primary/20 text-center"
            >
              Find a Pitch
            </Link>
            <Link
              to="/teams"
              className="bg-dark border border-primary/50 text-primary px-6 py-3 rounded-md hover:bg-dark-lighter text-center transition-colors"
            >
              Join Teams
            </Link>
            <Link
              to="/matches"
              className="bg-dark border border-primary/50 text-primary px-6 py-3 rounded-md hover:bg-dark-lighter text-center transition-colors"
            >
              Play Matches
            </Link>
          </div>
        </div>
      </section>

      {/* Role-Specific Benefits */}
      {isAuthenticated && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold sport-gradient-text mb-8 text-center">
            Your Platform Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentUser?.role === "player" && (
              <>
                <div className="card p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
                  <h3 className="text-lg font-bold mb-2 text-primary">
                    Player Profile
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Showcase your skills, stats, and achievements. Make your
                    profile visible to scouts and clubs.
                  </p>
                  <Link
                    to="/profile"
                    className="text-primary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Update Profile →
                  </Link>
                </div>
                <div className="card p-6 bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/30">
                  <h3 className="text-lg font-bold mb-2 text-secondary">
                    Transfer Requests
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Request to join clubs and track your transfer history. Build
                    your career one move at a time.
                  </p>
                  <Link
                    to="/profile"
                    className="text-secondary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    View Transfers →
                  </Link>
                </div>
                <div className="card p-6 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30">
                  <h3 className="text-lg font-bold mb-2 text-green-400">
                    Club Opportunities
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Browse official clubs, see available positions, and connect
                    with managers. Your next opportunity awaits.
                  </p>
                  <Link
                    to="/clubs"
                    className="text-green-400 text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Browse Clubs →
                  </Link>
                </div>
              </>
            )}

            {isClubManager && (
              <>
                <div className="card p-6 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30">
                  <h3 className="text-lg font-bold mb-2 text-green-400">
                    Club Management
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Register and manage official clubs, build your roster, and
                    track player transfers.
                  </p>
                  <Link
                    to="/my-clubs"
                    className="text-green-400 text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Manage Clubs →
                  </Link>
                </div>
                <div className="card p-6 bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/30">
                  <h3 className="text-lg font-bold mb-2 text-secondary">
                    Talent Recruitment
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Discover talented players, review transfer requests, and build
                    a winning team.
                  </p>
                  <Link
                    to="/talent-pool"
                    className="text-secondary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Discover Talent →
                  </Link>
                </div>
                <div className="card p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
                  <h3 className="text-lg font-bold mb-2 text-primary">
                    Legitimacy Status
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Maintain your club's official status with legitimacy fees.
                    Verified clubs get priority in league participation.
                  </p>
                  <Link
                    to="/my-clubs"
                    className="text-primary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Check Status →
                  </Link>
                </div>
              </>
            )}

            {isScout && (
              <>
                <div className="card p-6 bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/30">
                  <h3 className="text-lg font-bold mb-2 text-secondary">
                    Talent Pool Access
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Browse comprehensive player profiles, filter by position and
                    skills, and track promising talent.
                  </p>
                  <Link
                    to="/talent-pool"
                    className="text-secondary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Explore Talent →
                  </Link>
                </div>
                <div className="card p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
                  <h3 className="text-lg font-bold mb-2 text-primary">
                    Player Tracking
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Add players to your watchlist, track their progress, and build
                    your scouting network.
                  </p>
                  <Link
                    to="/talent-pool"
                    className="text-primary text-sm font-medium hover:underline mt-3 inline-block"
                  >
                    Start Scouting →
                  </Link>
                </div>
              </>
            )}

            {isPitchOwner && (
              <div className="card p-6 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30">
                <h3 className="text-lg font-bold mb-2 text-green-400">
                  Pitch Management
                </h3>
                <p className="text-gray-300 text-sm">
                  Manage your pitches, track bookings, and host amazing matches
                  for the community.
                </p>
                <Link
                  to="/pitches"
                  className="text-green-400 text-sm font-medium hover:underline mt-3 inline-block"
                >
                  Manage Pitches →
                </Link>
              </div>
            )}

            {isMinistryOfficial && (
              <div className="card p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30">
                <h3 className="text-lg font-bold mb-2 text-blue-400">
                  Revenue Oversight
                </h3>
                <p className="text-gray-300 text-sm">
                  View legitimacy fee payments, track revenue, and monitor club
                  financial compliance.
                </p>
                <Link
                  to="/revenue"
                  className="text-blue-400 text-sm font-medium hover:underline mt-3 inline-block"
                >
                  View Reports →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How It Works Section - Updated for new direction */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold sport-gradient-text mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">1</span>
            </div>
            <h3 className="text-lg sm:text-xl font-medium mb-2">Join</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Sign up as a player, club manager, or scout. Choose your path in
              the football ecosystem.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">2</span>
            </div>
            <h3 className="text-lg sm:text-xl font-medium mb-2">Discover</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Browse clubs or explore the talent pool. Find your perfect match
              or discover your next signing.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">3</span>
            </div>
            <h3 className="text-lg sm:text-xl font-medium mb-2">Connect</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Request transfers, recruit players, or track talent. Build
              relationships that drive your career forward.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">4</span>
            </div>
            <h3 className="text-lg sm:text-xl font-medium mb-2">Play</h3>
            <p className="text-gray-400 text-sm sm:text-base">
              Join matches, compete in leagues (coming soon), and grow your
              skills through regular play.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section - Role-aware */}
      <section className="text-center py-10">
        <h2 className="text-3xl font-bold mb-4">
          {!isAuthenticated
            ? "Ready to Start Your Football Journey?"
            : currentUser?.role === "player"
            ? "Ready to Join a Club?"
            : isClubManager
            ? "Ready to Manage Your Clubs?"
            : isScout
            ? "Ready to Discover Talent?"
            : "Ready to Get Started?"}
        </h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          {!isAuthenticated
            ? "Join thousands of players, clubs, and scouts building the future of grassroots and professional football."
            : currentUser?.role === "player"
            ? "Browse official clubs, request transfers, and take the next step in your football career."
            : isClubManager
            ? "Manage your clubs, recruit players, and build winning teams."
            : isScout
            ? "Discover talented players and track their progress through comprehensive profiles."
            : "Explore all features and find what works for you."}
        </p>
        {!isAuthenticated ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
            >
              Get Started Today
            </Link>
            <Link
              to="/clubs"
              className="text-white px-8 py-3 rounded-md border border-primary/50 hover:bg-primary/10 transition-all duration-300"
            >
              Browse Clubs First
            </Link>
          </div>
        ) : currentUser?.role === "player" ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/clubs"
              className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
            >
              Browse Clubs
            </Link>
            <Link
              to="/profile"
              className="text-white px-8 py-3 rounded-md border border-primary/50 hover:bg-primary/10 transition-all duration-300"
            >
              Update Profile
            </Link>
          </div>
        ) : isClubManager ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/my-clubs"
              className="bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-3 rounded-md shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300"
            >
              Manage Clubs
            </Link>
            <Link
              to="/talent-pool"
              className="text-white px-8 py-3 rounded-md border border-secondary/50 hover:bg-secondary/10 transition-all duration-300"
            >
              Discover Talent
            </Link>
          </div>
        ) : isScout ? (
          <Link
            to="/talent-pool"
            className="bg-gradient-to-r from-secondary to-primary text-white px-8 py-3 rounded-md shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/40 transition-all duration-300"
          >
            Explore Talent Pool
          </Link>
        ) : (
          <Link
            to="/clubs"
            className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
          >
            Browse Clubs
          </Link>
        )}
      </section>
    </div>
  );
};

export default HomePage;
