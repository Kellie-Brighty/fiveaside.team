// Phase 9: Provider Bookings Page - Provider view of bookings
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getProviderBookings,
  getServiceBooking,
  getServiceProviderByUserId,
  updateServiceBookingStatus,
  getServiceProvider,
} from "../services/serviceProviderService";
import type { ServiceBooking, ServiceProvider, Service } from "../types";

const ProviderBookingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { bookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ServiceBooking["status"]>("pending");
  const [filterStatus, setFilterStatus] = useState<ServiceBooking["status"] | "all">("all");

  useEffect(() => {
    if (!currentUser) return;

    loadProvider();
    if (bookingId) {
      loadSingleBooking(bookingId);
    } else {
      loadBookings();
    }
  }, [currentUser, bookingId, filterStatus]);

  const loadProvider = async () => {
    if (!currentUser?.id) return;
    try {
      const providerData = await getServiceProviderByUserId(currentUser.id);
      if (providerData) {
        setProvider(providerData);
      }
    } catch (error) {
      console.error("Error loading provider:", error);
    }
  };

  const loadBookings = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      const providerBookings = await getProviderBookings(
        provider.id,
        filterStatus !== "all" ? filterStatus : undefined
      );
      setBookings(providerBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
      window.toast?.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const loadSingleBooking = async (id: string) => {
    try {
      setLoading(true);
      const booking = await getServiceBooking(id);
      if (booking) {
        // Verify this booking belongs to the provider
        if (booking.serviceProviderId !== provider?.id) {
          window.toast?.error("Booking not found or doesn't belong to you");
          navigate("/service-providers/bookings");
          return;
        }
        setSelectedBooking(booking);
        // Load service
        const providerData = await getServiceProvider(booking.serviceProviderId);
        if (providerData) {
          const serviceData = providerData.services?.find((s) => s.id === booking.serviceId);
          if (serviceData) {
            setService(serviceData);
          }
        }
      } else {
        window.toast?.error("Booking not found");
        navigate("/service-providers/bookings");
      }
    } catch (error) {
      console.error("Error loading booking:", error);
      window.toast?.error("Failed to load booking");
      navigate("/service-providers/bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider) {
      if (bookingId) {
        loadSingleBooking(bookingId);
      } else {
        loadBookings();
      }
    }
  }, [provider]);

  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;

    try {
      setUpdatingStatus(true);
      await updateServiceBookingStatus(selectedBooking.id, selectedStatus);
      window.toast?.success("Booking status updated successfully!");
      setShowStatusModal(false);
      await loadBookings();

      // Reload selected booking if it's the same one
      if (selectedBooking) {
        const updatedBooking = await getServiceBooking(selectedBooking.id);
        if (updatedBooking) {
          setSelectedBooking(updatedBooking);
        }
      }
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      window.toast?.error(error.message || "Failed to update booking status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: ServiceBooking["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-600";
      case "confirmed":
        return "bg-blue-600";
      case "in-progress":
        return "bg-purple-600";
      case "completed":
        return "bg-green-600";
      case "cancelled":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const getPaymentStatusColor = (status: ServiceBooking["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "bg-green-600";
      case "pending":
        return "bg-yellow-600";
      case "refunded":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  if (loading || !provider) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Single booking view
  if (selectedBooking) {
    return (
      <div className="min-h-screen bg-dark text-white">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="mb-4 md:mb-6">
            <button
              onClick={() => navigate("/service-providers/bookings")}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Bookings
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Booking Details</h1>
                <p className="text-gray-400 text-sm md:text-base">
                  Received on{" "}
                  {selectedBooking.createdAt instanceof Date && !isNaN(selectedBooking.createdAt.getTime())
                    ? selectedBooking.createdAt.toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white text-xs md:text-sm font-medium ${getStatusColor(
                    selectedBooking.status
                  )}`}
                >
                  {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                </span>
                <span
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white text-xs md:text-sm font-medium ${getPaymentStatusColor(
                    selectedBooking.paymentStatus
                  )}`}
                >
                  Payment: {selectedBooking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Booking Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-bold mb-4">Service Information</h3>
                <div className="space-y-3">
                  {service && (
                    <>
                      <div>
                        <p className="text-gray-400 text-sm">Service</p>
                        <p className="text-white font-medium">{service.name}</p>
                      </div>
                      {service.description && (
                        <div>
                          <p className="text-gray-400 text-sm">Description</p>
                          <p className="text-white font-medium">{service.description}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Booking Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Scheduled Date</p>
                    <p className="text-white font-medium">
                      {selectedBooking.scheduledDate instanceof Date &&
                      !isNaN(selectedBooking.scheduledDate.getTime())
                        ? selectedBooking.scheduledDate.toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Scheduled Time</p>
                    <p className="text-white font-medium">{selectedBooking.scheduledTime}</p>
                  </div>
                  {selectedBooking.duration && (
                    <div>
                      <p className="text-gray-400 text-sm">Duration</p>
                      <p className="text-white font-medium">{selectedBooking.duration} minutes</p>
                    </div>
                  )}
                  {selectedBooking.location && (
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="text-white font-medium">{selectedBooking.location}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Amount</span>
                <span className="text-white font-bold text-2xl">
                  ₦{selectedBooking.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Review Section */}
            {selectedBooking.rating && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold mb-3">Client Review</h3>
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < selectedBooking.rating! ? "text-yellow-400" : "text-gray-600"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {selectedBooking.review && (
                  <p className="text-gray-300">{selectedBooking.review}</p>
                )}
              </div>
            )}

            {/* Update Status Button */}
            {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
              <button
                onClick={() => {
                  setSelectedStatus(selectedBooking.status);
                  setShowStatusModal(true);
                }}
                className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
              >
                Update Status
              </button>
            )}
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Update Booking Status</h3>
              <p className="text-gray-300 mb-4">
                Current Status:{" "}
                <span className={`font-medium ${getStatusColor(selectedBooking.status)} px-2 py-1 rounded-full text-xs`}>
                  {selectedBooking.status}
                </span>
              </p>
              <div className="mb-4">
                <label htmlFor="status-select" className="block text-sm font-medium text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ServiceBooking["status"])}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                >
                  {["pending", "confirmed", "in-progress", "completed", "cancelled"].map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bookings list view
  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Service Bookings</h1>
          <p className="text-gray-400">Manage bookings for your services</p>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ServiceBooking["status"] | "all")}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => navigate(`/service-providers/bookings/${booking.id}`)}
                className="w-full text-left bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">Booking #{booking.id.slice(0, 8)}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      Scheduled:{" "}
                      {booking.scheduledDate instanceof Date &&
                      !isNaN(booking.scheduledDate.getTime())
                        ? booking.scheduledDate.toLocaleDateString()
                        : "N/A"}{" "}
                      at {booking.scheduledTime}
                    </p>
                    <p className="text-white font-medium">
                      ₦{booking.price.toLocaleString()}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderBookingsPage;

