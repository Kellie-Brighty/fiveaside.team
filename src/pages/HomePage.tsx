import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const HomePage: React.FC = () => {
  const { isAuthenticated, isPitchOwner } = useAuth();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      {/* Hero Section with Animation */}
      <div className="relative overflow-hidden rounded-xl mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 backdrop-blur-sm rounded-xl"></div>
        <div className="relative z-10 text-center py-10 px-4">
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-dark text-xs font-medium rounded-full mb-3">
              Five-a-side Football
            </span>
          </div>
          <h1 className="text-5xl font-bold sport-gradient-text mb-4 tracking-tight">
            MonkeyPost
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            Create your team, find a pitch, and play football today! Join the
            action with daily matches at your favorite venues.
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center gap-4">
              <Link
                to="/login"
                className="relative overflow-hidden group text-white px-8 py-3.5 rounded-lg text-lg font-medium bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    ></path>
                  </svg>
                  Sign Up to Play
                </span>
                <div className="absolute top-0 left-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
              </Link>
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
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
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/pitches"
                className="btn-primary inline-block px-6 py-2"
              >
                Find Pitches
              </Link>
              <Link
                to="/teams"
                className="btn-secondary inline-block px-6 py-2"
              >
                Join Today's Teams
              </Link>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[-5%] right-[-5%] w-40 h-40 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-40 h-40 bg-secondary/20 rounded-full blur-xl"></div>
      </div>

      {/* Player-focused section */}
      <section className="card p-6 bg-gradient-to-br from-dark-lighter to-dark-lighter/50 border border-primary/30 mb-12 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 text-primary">
            Ready to Play Today?
          </h3>
          <p className="text-gray-300 mb-6 max-w-3xl">
            Find a pitch near you, create your team or join an existing one, and
            play daily five-a-side matches with friends or new teammates!
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/pitches"
              className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-md shadow-lg shadow-primary/20"
            >
              Find a Pitch Near You
            </Link>
          </div>
        </div>
      </section>

      {isPitchOwner ? (
        <section className="card p-6 bg-gradient-to-br from-dark-lighter to-dark-lighter/50 border border-green-500/30 mb-12 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4 text-green-400">
              Pitch Owner Dashboard
            </h3>
            <p className="text-gray-300 mb-6 max-w-3xl">
              Welcome back! Manage your pitches, customize settings, and track
              bookings all in one place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/pitches"
                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-md shadow-lg shadow-green-500/20"
              >
                Manage Your Pitches
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="team-card glow-effect">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full"></div>
          <div className="relative">
            <h3 className="text-xl font-bold mb-3 text-primary flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Find Pitches
            </h3>
            <p className="text-gray-300 mb-4">
              Discover the best five-a-side pitches near you. Browse by
              location, availability, and facilities to find your perfect match.
            </p>
            <Link to="/pitches" className="btn-primary inline-block">
              Browse Pitches
            </Link>
          </div>
        </div>

        <div className="team-card glow-effect">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full"></div>
          <div className="relative">
            <h3 className="text-xl font-bold mb-3 text-primary flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              Create Teams
            </h3>
            <p className="text-gray-300 mb-4">
              Form your dream team! Create a new team or join an existing one
              for today's matches. Teams reset each day so you can play with
              different groups.
            </p>
            <Link to="/teams" className="btn-primary inline-block">
              Today's Teams
            </Link>
          </div>
        </div>

        <div className="team-card glow-effect">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full"></div>
          <div className="relative">
            <h3 className="text-xl font-bold mb-3 text-primary flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              Play Matches
            </h3>
            <p className="text-gray-300 mb-4">
              Join the action with our winner-stays-on system. Compete against
              other teams and stay on the pitch by winning matches!
            </p>
            <Link to="/matches" className="btn-primary inline-block">
              Today's Matches
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold sport-gradient-text mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-medium mb-2">Find A Pitch</h3>
            <p className="text-gray-400">
              Browse pitches near you and select one for today's games. Check
              availability and facilities.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-medium mb-2">Create Your Team</h3>
            <p className="text-gray-400">
              Form your squad for the day. Invite friends or join an existing
              team that needs players.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-medium mb-2">Play & Win</h3>
            <p className="text-gray-400">
              Compete in matches with our winner-stays-on system. Win to keep
              playing, build your reputation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-10">
        <h2 className="text-3xl font-bold mb-4">Ready to play today?</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          {isPitchOwner
            ? "Manage your pitches and start hosting amazing matches today."
            : "Join a pitch near you and create your team for today's five-a-side action!"}
        </p>
        {!isAuthenticated ? (
          <Link
            to="/login"
            className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
          >
            Get Started Today
          </Link>
        ) : isPitchOwner ? (
          <Link
            to="/pitches"
            className="bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-3 rounded-md shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300"
          >
            Manage Your Pitches
          </Link>
        ) : (
          <Link
            to="/pitches"
            className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-md shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
          >
            Find a Pitch & Play
          </Link>
        )}
      </section>
    </div>
  );
};

export default HomePage;
