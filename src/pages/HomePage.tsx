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

      {/* Professional Landing Page Sections */}
      
      {/* Features Showcase - Hero Style */}
      <section className="relative py-20 overflow-hidden mb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
        <div className="relative z-10 container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 sport-gradient-text">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              A comprehensive platform connecting players, clubs, scouts, and fans in one unified ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Club Management Feature */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-dark-lighter/80 backdrop-blur-sm border border-primary/30 rounded-2xl p-8 hover:border-primary/50 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Official Club Registry</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Register and manage official clubs with comprehensive rosters, transfer systems, and legitimacy verification. 
                  Build your club's reputation and compete in official leagues.
                </p>
                <Link to="/clubs" className="inline-flex items-center text-primary font-semibold hover:text-primary/80 transition-colors">
                  Explore Clubs
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Talent Scouting Feature */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-dark-lighter/80 backdrop-blur-sm border border-secondary/30 rounded-2xl p-8 hover:border-secondary/50 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary to-secondary/60 rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Advanced Talent Scouting</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Discover and track players with advanced search filters, watchlists, comparison tools, and recruitment pipeline management. 
                  Connect directly with players and manage your scouting network.
                </p>
                <Link to="/talent-pool" className="inline-flex items-center text-secondary font-semibold hover:text-secondary/80 transition-colors">
                  Discover Talent
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Secondary Features Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-lighter/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-2 text-white">League Management</h4>
              <p className="text-gray-400 text-sm mb-4">Automatic fixtures, standings, and comprehensive match tracking</p>
              <Link to="/leagues" className="text-green-400 text-sm font-medium hover:underline">Browse Leagues →</Link>
            </div>

            <div className="bg-dark-lighter/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-2 text-white">i-Sale E-commerce</h4>
              <p className="text-gray-400 text-sm mb-4">Shop official club merchandise, kits, and football gear</p>
              <Link to="/products" className="text-yellow-400 text-sm font-medium hover:underline">Shop Now →</Link>
            </div>

            <div className="bg-dark-lighter/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-2 text-white">Service Providers</h4>
              <p className="text-gray-400 text-sm mb-4">Find coaches, referees, and book professional services</p>
              <Link to="/service-providers" className="text-blue-400 text-sm font-medium hover:underline">Find Services →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats & Social Proof Section */}
      <section className="relative py-16 mb-20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10"></div>
        <div className="relative z-10 container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                {stats.totalClubs}+
              </div>
              <div className="text-gray-400 font-medium">Official Clubs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-2">
                {stats.totalPlayers}+
              </div>
              <div className="text-gray-400 font-medium">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">
                {stats.legitimateClubs}+
              </div>
              <div className="text-gray-400 font-medium">Legitimate Clubs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">
                {stats.verifiedClubs}+
              </div>
              <div className="text-gray-400 font-medium">Verified Clubs</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative py-20 mb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Transform Your Football Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of players, clubs, and scouts building the future of grassroots and professional football
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/clubs"
                  className="px-8 py-4 bg-dark-lighter border-2 border-primary/50 text-white font-semibold rounded-lg hover:border-primary hover:bg-primary/10 transition-all duration-300"
                >
                  Explore Platform
                </Link>
              </>
            ) : (
              <Link
                to="/clubs"
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105"
              >
                Start Exploring
              </Link>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
