// Phase 9: Provider Earnings Tracking Dashboard
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStateContext } from "../contexts/StateContext";
import {
  getServiceProviderByUserId,
  getProviderBookings,
} from "../services/serviceProviderService";
import type { ServiceProvider, ServiceBooking } from "../types";

const ProviderEarningsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentState } = useStateContext();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"all" | "today" | "thisWeek" | "thisMonth" | "thisYear">("all");

  useEffect(() => {
    if (!currentUser || !currentState) return;
    loadData();
  }, [currentUser, dateRange, currentState?.id]);

  const loadData = async () => {
    if (!currentUser?.id || !currentState) return;

    try {
      setLoading(true);
      const providerData = await getServiceProviderByUserId(currentUser.id, currentState.id);
      if (!providerData) {
        window.toast?.error("You don't have a service provider profile");
        navigate("/service-providers/manage");
        return;
      }

      setProvider(providerData);

      // Load all bookings for this provider
      const allBookings = await getProviderBookings(providerData.id, currentState.id);
      setBookings(allBookings);
    } catch (error) {
      console.error("Error loading earnings data:", error);
      window.toast?.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings by date range
  const getFilteredBookings = () => {
    if (dateRange === "all") return bookings;

    const now = new Date();
    const filtered: ServiceBooking[] = [];

    bookings.forEach((booking) => {
      const bookingDate = booking.createdAt instanceof Date && !isNaN(booking.createdAt.getTime())
        ? booking.createdAt
        : new Date(booking.createdAt);

      switch (dateRange) {
        case "today":
          if (
            bookingDate.getDate() === now.getDate() &&
            bookingDate.getMonth() === now.getMonth() &&
            bookingDate.getFullYear() === now.getFullYear()
          ) {
            filtered.push(booking);
          }
          break;
        case "thisWeek":
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (bookingDate >= weekAgo) {
            filtered.push(booking);
          }
          break;
        case "thisMonth":
          if (
            bookingDate.getMonth() === now.getMonth() &&
            bookingDate.getFullYear() === now.getFullYear()
          ) {
            filtered.push(booking);
          }
          break;
        case "thisYear":
          if (bookingDate.getFullYear() === now.getFullYear()) {
            filtered.push(booking);
          }
          break;
      }
    });

    return filtered;
  };

  // Calculate earnings statistics
  const calculateStats = () => {
    const filteredBookings = getFilteredBookings();
    
    // Only count paid and completed bookings
    const completedPaidBookings = filteredBookings.filter(
      (b) => b.status === "completed" && b.paymentStatus === "paid"
    );

    const totalEarnings = completedPaidBookings.reduce(
      (sum, booking) => sum + booking.price,
      0
    );

    const totalBookings = completedPaidBookings.length;
    const averageBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    // Pending earnings (confirmed but not yet completed)
    const pendingBookings = filteredBookings.filter(
      (b) => (b.status === "confirmed" || b.status === "in-progress") && b.paymentStatus === "paid"
    );
    const pendingEarnings = pendingBookings.reduce((sum, booking) => sum + booking.price, 0);

    // Cancelled bookings count
    const cancelledBookings = filteredBookings.filter((b) => b.status === "cancelled").length;

    return {
      totalEarnings,
      totalBookings,
      averageBookingValue,
      pendingEarnings,
      pendingBookingsCount: pendingBookings.length,
      cancelledBookings,
    };
  };

  const stats = calculateStats();
  const filteredBookings = getFilteredBookings();

  // Group earnings by date for chart
  const getEarningsByDate = () => {
    const completedPaidBookings = filteredBookings.filter(
      (b) => b.status === "completed" && b.paymentStatus === "paid"
    );

    const earningsByDate: { [key: string]: number } = {};

    completedPaidBookings.forEach((booking) => {
      const date = booking.createdAt instanceof Date && !isNaN(booking.createdAt.getTime())
        ? booking.createdAt
        : new Date(booking.createdAt);
      const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      if (!earningsByDate[dateKey]) {
        earningsByDate[dateKey] = 0;
      }
      earningsByDate[dateKey] += booking.price;
    });

    // Get last 7 days of earnings
    const now = new Date();
    const last7Days: Array<[string, number]> = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      last7Days.push([dateKey, earningsByDate[dateKey] || 0]);
    }

    return last7Days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  const earningsByDate = getEarningsByDate();
  const maxEarnings = Math.max(...earningsByDate.map(([, value]) => value), 1);

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Earnings Dashboard</h1>
          <p className="text-gray-400 text-sm md:text-base">
            Track your earnings from service bookings
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {(["all", "today", "thisWeek", "thisMonth", "thisYear"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
                  dateRange === range
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {range === "all"
                  ? "All Time"
                  : range === "today"
                  ? "Today"
                  : range === "thisWeek"
                  ? "This Week"
                  : range === "thisMonth"
                  ? "This Month"
                  : "This Year"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Earnings */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-2">Total Earnings</p>
            <p className="text-white font-bold text-2xl md:text-3xl">
              ₦{stats.totalEarnings.toLocaleString()}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {stats.totalBookings} completed booking{stats.totalBookings !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Average Booking Value */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-2">Average Booking</p>
            <p className="text-white font-bold text-2xl md:text-3xl">
              ₦{Math.round(stats.averageBookingValue).toLocaleString()}
            </p>
            <p className="text-gray-400 text-xs mt-1">Per booking</p>
          </div>

          {/* Pending Earnings */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-2">Pending Earnings</p>
            <p className="text-white font-bold text-2xl md:text-3xl">
              ₦{stats.pendingEarnings.toLocaleString()}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {stats.pendingBookingsCount} booking{stats.pendingBookingsCount !== 1 ? "s" : ""} in progress
            </p>
          </div>

          {/* Total Bookings */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-2">Total Bookings</p>
            <p className="text-white font-bold text-2xl md:text-3xl">
              {filteredBookings.length}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {stats.cancelledBookings} cancelled
            </p>
          </div>
        </div>

        {/* Earnings Chart (Last 7 Days) */}
        {earningsByDate.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
            <h2 className="text-lg md:text-xl font-bold mb-4">Earnings Trend (Last 7 Days)</h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {earningsByDate.map(([date, earnings]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-700 rounded-t-lg relative h-full min-h-[120px]">
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all"
                      style={{
                        height: `${(earnings / maxEarnings) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-white font-medium text-xs">
                      ₦{earnings >= 1000 ? `${(earnings / 1000).toFixed(1)}k` : earnings.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 whitespace-nowrap">{date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold mb-4">Recent Bookings</h2>
          {filteredBookings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No bookings found for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-xs md:text-sm font-medium">
                      Booking ID
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-xs md:text-sm font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-xs md:text-sm font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-xs md:text-sm font-medium">
                      Payment
                    </th>
                    <th className="text-right py-3 px-2 md:px-4 text-gray-400 text-xs md:text-sm font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings
                    .sort((a, b) => {
                      const dateA = a.createdAt instanceof Date && !isNaN(a.createdAt.getTime())
                        ? a.createdAt
                        : new Date(a.createdAt);
                      const dateB = b.createdAt instanceof Date && !isNaN(b.createdAt.getTime())
                        ? b.createdAt
                        : new Date(b.createdAt);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 20)
                    .map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/service-providers/bookings/${booking.id}`)}
                      >
                        <td className="py-3 px-2 md:px-4 text-white text-xs md:text-sm font-medium">
                          #{booking.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-2 md:px-4 text-gray-300 text-xs md:text-sm">
                          {booking.createdAt instanceof Date && !isNaN(booking.createdAt.getTime())
                            ? booking.createdAt.toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              booking.status === "completed"
                                ? "bg-green-600 text-white"
                                : booking.status === "confirmed" || booking.status === "in-progress"
                                ? "bg-blue-600 text-white"
                                : booking.status === "pending"
                                ? "bg-yellow-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 md:px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              booking.paymentStatus === "paid"
                                ? "bg-green-600 text-white"
                                : booking.paymentStatus === "pending"
                                ? "bg-yellow-600 text-white"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {booking.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-2 md:px-4 text-right text-white font-medium text-xs md:text-sm">
                          ₦{booking.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderEarningsPage;

