// Phase 4.2: Revenue Reporting Dashboard for Ministry/FA Officials
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAllClubs } from "../services/clubService";
import { hasPermission } from "../utils/permissions";
import type { Club } from "../types";

const RevenueReportingPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [dateRange, setDateRange] = useState<"all" | "thisMonth" | "thisYear">(
    "all"
  );

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || isAuthLoading) return;

      // Check permissions
      const canViewRevenue = hasPermission(
        currentUser.role,
        "view_revenue_reports"
      );

      if (!canViewRevenue) {
        setError("You don't have permission to view revenue reports");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const allClubs = await getAllClubs();
        setClubs(allClubs);
      } catch (error) {
        console.error("Error loading revenue data:", error);
        setError("Failed to load revenue data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadData();
    }
  }, [currentUser, isAuthLoading]);

  // Calculate revenue statistics
  const calculateStats = () => {
    const allPayments: Array<{
      date: Date;
      amount: number;
      clubName: string;
      transactionRef: string;
    }> = [];

    clubs.forEach((club) => {
      if (club.legitimacyPaymentHistory) {
        club.legitimacyPaymentHistory.forEach((payment) => {
          allPayments.push({
            date: payment.paymentDate instanceof Date 
              ? payment.paymentDate 
              : new Date(payment.paymentDate),
            amount: payment.amount,
            clubName: club.name,
            transactionRef: payment.transactionRef,
          });
        });
      }
    });

    // Filter by date range
    let filteredPayments = allPayments;
    if (dateRange === "thisMonth") {
      const now = new Date();
      filteredPayments = allPayments.filter(
        (p) =>
          p.date.getMonth() === now.getMonth() &&
          p.date.getFullYear() === now.getFullYear()
      );
    } else if (dateRange === "thisYear") {
      const now = new Date();
      filteredPayments = allPayments.filter(
        (p) => p.date.getFullYear() === now.getFullYear()
      );
    }

    // Filter by payment status
    let displayedPayments = filteredPayments;
    if (filter === "paid") {
      displayedPayments = filteredPayments;
    } else if (filter === "unpaid") {
      // Clubs without legitimacy fees
      const unpaidClubs = clubs.filter((c) => !c.isLegitimate);
      displayedPayments = [];
      unpaidClubs.forEach((club) => {
        displayedPayments.push({
          date: club.createdAt instanceof Date 
            ? club.createdAt 
            : new Date(club.createdAt),
          amount: 0,
          clubName: club.name,
          transactionRef: "N/A",
        });
      });
    }

    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalTransactions = filteredPayments.length;
    const legitimateClubs = clubs.filter((c) => c.isLegitimate).length;
    const unpaidClubs = clubs.filter((c) => !c.isLegitimate).length;

    return {
      totalRevenue,
      totalTransactions,
      legitimateClubs,
      unpaidClubs,
      payments: displayedPayments.sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !hasPermission(currentUser?.role || "player", "view_revenue_reports")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-lighter rounded-xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Revenue Reporting
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          View legitimacy fee payments and revenue statistics
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-400 mb-2">Total Revenue</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            ₦{stats.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-400 mb-2">Total Transactions</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {stats.totalTransactions}
          </p>
        </div>
        <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-400 mb-2">Legitimate Clubs</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-400">
            {stats.legitimateClubs}
          </p>
        </div>
        <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-400 mb-2">Unpaid Clubs</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">
            {stats.unpaidClubs}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-lighter rounded-xl shadow-xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Range Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as "all" | "thisMonth" | "thisYear")
              }
              className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filter
            </label>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | "paid" | "unpaid")
              }
              className="w-full px-4 py-2 rounded-lg bg-dark border border-gray-700 text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid Clubs</option>
              <option value="unpaid">Unpaid Clubs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-dark-lighter rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Payment History
          </h2>
        </div>
        <div className="overflow-x-auto">
          {stats.payments.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-gray-400">No payments found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-dark border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-400">
                    Club Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-400">
                    Transaction Ref
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.payments.map((payment, index) => (
                  <tr key={index} className="hover:bg-dark transition-colors">
                    <td className="px-4 py-3 text-xs sm:text-sm text-white">
                      {payment.date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-white">
                      {payment.clubName}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm font-medium">
                      {payment.amount > 0 ? (
                        <span className="text-green-400">
                          ₦{payment.amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-red-400">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-400 font-mono">
                      {payment.transactionRef}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueReportingPage;

