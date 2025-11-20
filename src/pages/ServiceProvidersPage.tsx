// Phase 9: Service Providers Directory Page
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStateContext } from "../contexts/StateContext";
import { getAllListedServiceProviders } from "../services/serviceProviderService";
import { incrementProviderViews } from "../services/serviceProviderService";
import type { ServiceProvider } from "../types";

const ServiceProvidersPage: React.FC = () => {
  const { currentState } = useStateContext();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProviderType, setSelectedProviderType] = useState<ServiceProvider["providerType"] | "all">("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  const providerTypes: Array<ServiceProvider["providerType"] | "all"> = [
    "all",
    "referee",
    "coach",
    "trainer",
    "physiotherapist",
    "equipment_supplier",
    "other",
  ];

  useEffect(() => {
    if (currentState) {
      loadProviders();
    }
  }, [selectedProviderType, selectedCity, selectedState, minRating, currentState?.id]);

  useEffect(() => {
    // Apply search query filter
    if (!searchQuery.trim()) {
      setFilteredProviders(providers);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = providers.filter((provider) => {
      const nameMatch = provider.specialization?.toLowerCase().includes(query);
      const bioMatch = provider.bio?.toLowerCase().includes(query);
      const serviceMatch = provider.services.some((service) =>
        service.name.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query)
      );

      return nameMatch || bioMatch || serviceMatch;
    });

    setFilteredProviders(filtered);
  }, [searchQuery, providers]);

  const loadProviders = async () => {
    if (!currentState) {
      setError("Current state not available. Cannot load service providers.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedProviderType !== "all") {
        filters.providerType = selectedProviderType;
      }
      if (selectedCity) {
        filters.city = selectedCity;
      }
      if (selectedState) {
        filters.state = selectedState;
      }
      if (minRating !== undefined) {
        filters.minRating = minRating;
      }

      const allProviders = await getAllListedServiceProviders(currentState.id, filters);
      setProviders(allProviders);
      setFilteredProviders(allProviders);
      setError(null);
    } catch (error) {
      console.error("Error loading service providers:", error);
      setError("Failed to load service providers. Please try again.");
      window.toast?.error("Failed to load service providers");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderClick = async (providerId: string) => {
    if (!currentState) return;
    try {
      await incrementProviderViews(providerId, currentState.id);
    } catch (error) {
      // Don't show error - this is just analytics
    }
  };

  // Get unique cities and states for filters
  const uniqueStates = Array.from(
    new Set(providers.map((p) => p.serviceArea?.state).filter(Boolean))
  ).sort() as string[];

  const uniqueCities = Array.from(
    new Set(
      providers
        .filter((p) => !selectedState || p.serviceArea?.state === selectedState)
        .flatMap((p) => p.serviceArea?.cities || [])
    )
  ).sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Service Provider Hub</h1>
          <p className="text-gray-400">
            Find referees, coaches, trainers, and other football professionals
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by specialization, bio, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Provider Type Filter */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 flex-1">
              {providerTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedProviderType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedProviderType === type
                      ? "bg-primary text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {type === "all"
                    ? "All Types"
                    : type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                </button>
              ))}
            </div>

            {/* State Filter */}
            <div className="flex-shrink-0">
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity(""); // Reset city when state changes
                }}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-primary focus:outline-none min-w-[150px]"
              >
                <option value="">All States</option>
                {uniqueStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            {selectedState && (
              <div className="flex-shrink-0">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-primary focus:outline-none min-w-[150px]"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rating Filter */}
            <div className="flex-shrink-0">
              <select
                value={minRating || ""}
                onChange={(e) =>
                  setMinRating(e.target.value ? Number(e.target.value) : undefined)
                }
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-primary focus:outline-none min-w-[150px]"
              >
                <option value="">All Ratings</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Providers Grid */}
        {error ? null : filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No service providers found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Link
                key={provider.id}
                to={`/service-providers/${provider.id}`}
                onClick={() => handleProviderClick(provider.id)}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {provider.specialization || provider.providerType}
                    </h3>
                    <p className="text-gray-400 text-sm capitalize">
                      {provider.providerType.replace("_", " ")}
                    </p>
                  </div>
                  {provider.rating && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-5 h-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-white font-medium">
                        {provider.rating.toFixed(1)}
                      </span>
                      {provider.reviewCount && (
                        <span className="text-gray-400 text-sm">
                          ({provider.reviewCount})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {provider.bio && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {provider.bio}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  {provider.experienceYears && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {provider.experienceYears} years experience
                    </div>
                  )}

                  {provider.serviceArea && provider.serviceArea.cities && provider.serviceArea.cities.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                      {provider.serviceArea.cities.slice(0, 2).join(", ")}
                      {provider.serviceArea.cities.length > 2 && "..."}
                    </div>
                  )}

                  {provider.services && provider.services.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      {provider.services.length} service
                      {provider.services.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    {provider.hourlyRate && (
                      <span>₦{provider.hourlyRate.toLocaleString()}/hr</span>
                    )}
                    {provider.fixedRate && (
                      <span>₦{provider.fixedRate.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-primary font-medium text-sm">
                    View Profile →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProvidersPage;

