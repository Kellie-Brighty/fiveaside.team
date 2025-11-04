// Phase 9: Service Booking Page - Create a booking
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getServiceProvider,
  createServiceBooking,
} from "../services/serviceProviderService";
import type { ServiceProvider, Service, ServiceBooking } from "../types";
import LoadingButton from "../components/LoadingButton";

// @ts-ignore - Paystack is loaded via script tag
declare const PaystackPop: any;

const ServiceBookingPage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Booking form state
  const [bookingData, setBookingData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    location: "",
    duration: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      window.toast?.error("Please login to book a service");
      navigate("/login");
      return;
    }

    if (providerId) {
      loadProvider();
    }
  }, [providerId, isAuthenticated]);

  useEffect(() => {
    // If serviceId is in URL params, select that service
    const serviceId = searchParams.get("serviceId");
    if (serviceId && provider?.services) {
      const service = provider.services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        if (service.duration) {
          setBookingData((prev) => ({ ...prev, duration: service.duration!.toString() }));
        }
      }
    }
  }, [searchParams, provider]);

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
    } catch (error) {
      console.error("Error loading provider:", error);
      window.toast?.error("Failed to load service provider");
      navigate("/service-providers");
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!selectedService) return 0;
    if (selectedService.serviceType === "hourly" && bookingData.duration) {
      const hours = Number(bookingData.duration) / 60;
      return selectedService.price * hours;
    }
    return selectedService.price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedService || !currentUser) return;

    if (!bookingData.scheduledDate || !bookingData.scheduledTime) {
      window.toast?.error("Please select a date and time");
      return;
    }

    try {
      setProcessing(true);

      const scheduledDate = new Date(`${bookingData.scheduledDate}T${bookingData.scheduledTime}`);
      const price = calculatePrice();
      const duration = bookingData.duration ? Number(bookingData.duration) : selectedService.duration;

      const bookingDataToCreate: Omit<ServiceBooking, "id" | "createdAt" | "updatedAt"> = {
        serviceProviderId: provider.id,
        serviceId: selectedService.id,
        clientId: currentUser.id,
        status: "pending",
        scheduledDate,
        scheduledTime: bookingData.scheduledTime,
        duration,
        location: bookingData.location.trim() || undefined,
        price,
        paymentStatus: "pending",
      };

      // Initialize payment with Paystack
      const handler = PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
        email: currentUser.email,
        amount: price * 100, // Convert to kobo
        currency: "NGN",
        metadata: {
          custom_fields: [
            {
              display_name: "Service",
              variable_name: "service_name",
              value: selectedService.name,
            },
            {
              display_name: "Provider",
              variable_name: "provider_id",
              value: provider.id,
            },
          ],
        },
        callback: (response: any) => {
          // Handle async operations inside the callback
          (async () => {
            try {
              const bookingId = await createServiceBooking({
                ...bookingDataToCreate,
                paymentStatus: "paid",
                paymentRef: response.reference,
              });

              window.toast?.success("Booking created successfully!");
              navigate(`/service-bookings/${bookingId}`);
            } catch (error: any) {
              console.error("Error creating booking:", error);
              window.toast?.error(error.message || "Failed to create booking");
            } finally {
              setProcessing(false);
            }
          })();
        },
        onClose: () => {
          setProcessing(false);
          window.toast?.info("Payment cancelled");
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error("Error processing booking:", error);
      window.toast?.error(error.message || "Failed to process booking");
      setProcessing(false);
    }
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

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 mb-4">Please login to book a service.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/service-providers/${providerId}`)}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
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
            Back to Provider
          </button>
          <h1 className="text-4xl font-bold mb-2">Book a Service</h1>
          <p className="text-gray-400">
            Book a service with {provider.specialization || provider.providerType}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Service <span className="text-red-400">*</span>
                </label>
                {!provider.services || provider.services.length === 0 ? (
                  <p className="text-gray-400">No services available</p>
                ) : (
                  <div className="space-y-2">
                    {provider.services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setSelectedService(service);
                          if (service.duration) {
                            setBookingData((prev) => ({ ...prev, duration: service.duration!.toString() }));
                          }
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          selectedService?.id === service.id
                            ? "border-primary bg-primary/10"
                            : "border-gray-700 bg-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                            {service.description && (
                              <p className="text-gray-300 text-sm mb-2">{service.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              {service.duration && <span>{service.duration} minutes</span>}
                              <span className="capitalize">{service.serviceType.replace("_", " ")}</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <p className="text-xl font-bold text-primary">
                              ₦{service.price.toLocaleString()}
                            </p>
                            {service.serviceType === "hourly" && (
                              <p className="text-xs text-gray-400">per hour</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedService && (
                <>
                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={bookingData.scheduledDate}
                        onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={bookingData.scheduledTime}
                        onChange={(e) => setBookingData({ ...bookingData, scheduledTime: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Duration (for hourly services) */}
                  {selectedService.serviceType === "hourly" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bookingData.duration}
                        onChange={(e) => setBookingData({ ...bookingData, duration: e.target.value })}
                        placeholder="e.g., 60"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={bookingData.location}
                      onChange={(e) => setBookingData({ ...bookingData, location: e.target.value })}
                      placeholder="Where will the service be provided?"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Submit */}
                  <div className="pt-4">
                    <LoadingButton
                      type="submit"
                      isLoading={processing}
                      className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
                    >
                      Book Service - ₦{calculatePrice().toLocaleString()}
                    </LoadingButton>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Booking Summary</h3>
              {selectedService ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Service</p>
                    <p className="text-white font-medium">{selectedService.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Provider</p>
                    <p className="text-white font-medium">
                      {provider.specialization || provider.providerType}
                    </p>
                  </div>
                  {bookingData.scheduledDate && (
                    <div>
                      <p className="text-gray-400 text-sm">Date</p>
                      <p className="text-white font-medium">
                        {new Date(bookingData.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {bookingData.scheduledTime && (
                    <div>
                      <p className="text-gray-400 text-sm">Time</p>
                      <p className="text-white font-medium">{bookingData.scheduledTime}</p>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 text-sm">Total</p>
                      <p className="text-white font-bold text-xl">
                        ₦{calculatePrice().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Select a service to continue</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceBookingPage;

