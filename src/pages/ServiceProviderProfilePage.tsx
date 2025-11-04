// Phase 9: Service Provider Profile Page
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getServiceProvider, incrementProviderViews } from "../services/serviceProviderService";
import { getProviderBookings } from "../services/serviceProviderService";
import type { ServiceProvider, ServiceBooking } from "../types";

const ServiceProviderProfilePage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [_bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [_selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    if (providerId) {
      loadProvider();
      loadBookings();
    }
  }, [providerId]);

  const loadProvider = async () => {
    try {
      setLoading(true);
      const providerData = await getServiceProvider(providerId!);
      if (!providerData) {
        window.toast?.error("Service provider not found");
        navigate("/service-providers");
        return;
      }
      setProvider(providerData);

      // Increment views
      try {
        await incrementProviderViews(providerId!);
      } catch (error) {
        // Don't show error - this is just analytics
      }
    } catch (error) {
      console.error("Error loading service provider:", error);
      window.toast?.error("Failed to load service provider");
      navigate("/service-providers");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!providerId || !isAuthenticated) return;
    try {
      const allBookings = await getProviderBookings(providerId);
      setBookings(allBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const handleBookService = (serviceId: string) => {
    if (!isAuthenticated) {
      window.toast?.error("Please login to book a service");
      navigate("/login");
      return;
    }
    setSelectedService(serviceId);
    navigate(`/service-providers/${providerId}/book?serviceId=${serviceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  const isOwnProfile = currentUser?.id === provider.userId;

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => navigate("/service-providers")}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 text-sm md:text-base"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Providers
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">
                {provider.specialization || provider.providerType}
              </h1>
              <p className="text-gray-400 capitalize text-sm md:text-lg">
                {provider.providerType.replace("_", " ")}
              </p>
            </div>
            {isOwnProfile && (
              <Link
                to="/service-providers/manage"
                className="w-full sm:w-auto text-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
              >
                Manage Profile
              </Link>
            )}
          </div>

          {provider.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(provider.rating!)
                        ? "text-yellow-400"
                        : "text-gray-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-white font-medium">
                {provider.rating.toFixed(1)}
              </span>
              {provider.reviewCount && (
                <span className="text-gray-400">
                  ({provider.reviewCount} review{provider.reviewCount !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Bio */}
            {provider.bio && (
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">About</h2>
                <p className="text-gray-300 whitespace-pre-line text-sm md:text-base">{provider.bio}</p>
              </div>
            )}

            {/* Services */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Services Offered</h2>
              <div className="space-y-4">
                {!provider.services || provider.services.length === 0 ? (
                  <p className="text-gray-400">No services listed yet.</p>
                ) : (
                  provider.services.map((service) => (
                    <div
                      key={service.id}
                      className="border border-gray-700 rounded-lg p-3 md:p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                        <div className="flex-1">
                          <h3 className="text-base md:text-lg font-bold text-white mb-1">
                            {service.name}
                          </h3>
                          {service.description && (
                            <p className="text-gray-300 text-xs md:text-sm mb-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
                            {service.duration && (
                              <span>Duration: {service.duration} minutes</span>
                            )}
                            <span className="capitalize">
                              Type: {service.serviceType.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <div className="ml-0 sm:ml-4">
                          <p className="text-lg md:text-xl font-bold text-primary">
                            ₦{service.price.toLocaleString()}
                          </p>
                          {service.serviceType === "hourly" && (
                            <p className="text-xs text-gray-400">per hour</p>
                          )}
                        </div>
                      </div>
                      {!isOwnProfile && (
                        <button
                          onClick={() => handleBookService(service.id)}
                          className="mt-3 w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                        >
                          Book Service
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Availability */}
            {provider.availability && (
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">Availability</h2>
                {provider.availability.isAvailable ? (
                  <div>
                    {provider.availability.days && provider.availability.days.length > 0 && (
                      <div className="mb-4">
                        <p className="text-gray-300 mb-2 text-sm md:text-base">Available Days:</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.availability.days.map((day) => (
                            <span
                              key={day}
                              className="px-2 py-1 md:px-3 md:py-1 bg-primary/20 text-primary rounded-full text-xs md:text-sm"
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {provider.availability.timeSlots && provider.availability.timeSlots.length > 0 && (
                      <div>
                        <p className="text-gray-300 mb-2 text-sm md:text-base">Time Slots:</p>
                        <div className="space-y-2">
                          {provider.availability.timeSlots.map((slot, index) => (
                            <div
                              key={index}
                              className="text-gray-300 text-xs md:text-sm"
                            >
                              {slot.start} - {slot.end}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Currently unavailable</p>
                )}
              </div>
            )}

            {/* Service Area */}
            {provider.serviceArea && (
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold mb-4">Service Area</h2>
                <div className="space-y-2 text-gray-300 text-sm md:text-base">
                  <p>
                    <span className="font-medium">State:</span> {provider.serviceArea.state}
                  </p>
                  {provider.serviceArea.cities && provider.serviceArea.cities.length > 0 && (
                    <div>
                      <span className="font-medium">Cities:</span>{" "}
                      {provider.serviceArea.cities.join(", ")}
                    </div>
                  )}
                  {provider.serviceArea.radius && (
                    <p>
                      <span className="font-medium">Service Radius:</span>{" "}
                      {provider.serviceArea.radius} km
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Quick Info */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold mb-4">Quick Info</h3>
              <div className="space-y-3">
                {provider.experienceYears && (
                  <div>
                    <p className="text-gray-400 text-sm">Experience</p>
                    <p className="text-white font-medium">
                      {provider.experienceYears} years
                    </p>
                  </div>
                )}
                {provider.hourlyRate && (
                  <div>
                    <p className="text-gray-400 text-sm">Hourly Rate</p>
                    <p className="text-white font-medium">
                      ₦{provider.hourlyRate.toLocaleString()}/hr
                    </p>
                  </div>
                )}
                {provider.fixedRate && (
                  <div>
                    <p className="text-gray-400 text-sm">Fixed Rate</p>
                    <p className="text-white font-medium">
                      ₦{provider.fixedRate.toLocaleString()}
                    </p>
                  </div>
                )}
                {provider.views !== undefined && (
                  <div>
                    <p className="text-gray-400 text-sm">Profile Views</p>
                    <p className="text-white font-medium">{provider.views}</p>
                  </div>
                )}
                {provider.bookings !== undefined && (
                  <div>
                    <p className="text-gray-400 text-sm">Total Bookings</p>
                    <p className="text-white font-medium">{provider.bookings}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact/Booking */}
            {!isOwnProfile && isAuthenticated && (
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold mb-4">Book a Service</h3>
                <p className="text-gray-300 text-xs md:text-sm mb-4">
                  Select a service from the list to book
                </p>
                {provider.services && provider.services.length > 0 && (
                  <button
                    onClick={() => navigate(`/service-providers/${providerId}/book`)}
                    className="w-full px-4 py-2 md:py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                  >
                    View All Services
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderProfilePage;

