import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { User } from "../../types";

interface DailyStats {
  newUsers: number;
  matchesPlayed: number;
  betsMade: number;
  teamsToday: {
    total: number;
    threeASide: number;
    fourASide: number;
    fiveASide: number;
  };
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    newUsers: 0,
    matchesPlayed: 0,
    betsMade: 0,
    teamsToday: {
      total: 0,
      threeASide: 0,
      fourASide: 0,
      fiveASide: 0,
    },
  });
  const usersPerPage = 8;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(query(usersRef));

      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
        } as User);
      });

      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDailyStats();
  }, []);

  // Fetch statistics data
  const fetchDailyStats = async () => {
    try {
      setStatsLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get new users registered today
      const usersRef = collection(db, "users");
      const newUsersQuery = query(usersRef, where("createdAt", ">=", today));
      const newUsersSnapshot = await getDocs(newUsersQuery);
      const newUsersCount = newUsersSnapshot.size;

      // Get matches played today
      const matchesRef = collection(db, "matches");
      const matchesQuery = query(matchesRef, where("createdAt", ">=", today));
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchesCount = matchesSnapshot.size;

      // Get bets made today
      const betsRef = collection(db, "bets");
      const betsQuery = query(betsRef, where("createdAt", ">=", today));
      const betsSnapshot = await getDocs(betsQuery);
      const betsCount = betsSnapshot.size;

      // Get teams created today and their sizes
      const teamsRef = collection(db, "teams");
      const teamsQuery = query(teamsRef, where("createdAt", ">=", today));
      const teamsSnapshot = await getDocs(teamsQuery);

      // Count teams by size
      let totalTeams = 0;
      let threeASideCount = 0;
      let fourASideCount = 0;
      let fiveASideCount = 0;

      teamsSnapshot.forEach((teamDoc) => {
        totalTeams++;
        const teamData = teamDoc.data();

        // Log the team data to understand its structure
        console.log("Team data for size determination:", {
          id: teamDoc.id,
          maxPlayers: teamData.maxPlayers,
          customSettings: teamData.customSettings,
        });

        // Determine maxPlayers with proper type handling
        let maxPlayers: number;

        // Handle string values by converting them to numbers
        if (typeof teamData.maxPlayers === "string") {
          maxPlayers = parseInt(teamData.maxPlayers);
        } else if (typeof teamData.maxPlayers === "number") {
          // Use direct number value
          maxPlayers = teamData.maxPlayers;
        } else if (teamData.customSettings?.maxPlayersPerTeam) {
          // Handle string or number in customSettings
          const settingsValue = teamData.customSettings.maxPlayersPerTeam;
          maxPlayers =
            typeof settingsValue === "string"
              ? parseInt(settingsValue)
              : settingsValue;
        } else {
          // Default to 5 if no valid value exists
          maxPlayers = 5;
        }

        // Ensure we have a valid number after conversions
        if (isNaN(maxPlayers)) {
          maxPlayers = 5; // Default if parsing failed
        }

        console.log(`Team ${teamDoc.id} classified as ${maxPlayers}-a-side`);

        // Categorize the team based on its size
        if (maxPlayers === 3) {
          threeASideCount++;
        } else if (maxPlayers === 4) {
          fourASideCount++;
        } else if (maxPlayers === 5) {
          fiveASideCount++;
        }
      });

      setDailyStats({
        newUsers: newUsersCount,
        matchesPlayed: matchesCount,
        betsMade: betsCount,
        teamsToday: {
          total: totalTeams,
          threeASide: threeASideCount,
          fourASide: fourASideCount,
          fiveASide: fiveASideCount,
        },
      });
    } catch (err) {
      console.error("Error fetching statistics:", err);
      // Don't set an error message, just leave the stats at 0
    } finally {
      setStatsLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, "users", userToDelete.id));

      // Remove user from local state
      setUsers(users.filter((user) => user.id !== userToDelete.id));

      window.toast?.success(`User ${userToDelete.name} deleted successfully`);
    } catch (err) {
      console.error("Error deleting user:", err);
      window.toast?.error("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
      setConfirmationModal(false);
    }
  };

  const openDeleteConfirmation = (user: User) => {
    setUserToDelete(user);
    setConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setConfirmationModal(false);
    setUserToDelete(null);
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchDailyStats();
  };

  // Filter users based on search term and role filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole ? user.role === filterRole : true;

    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Users Management</h1>
        <p className="text-gray-400">
          View and manage all users of the platform
        </p>
      </div>

      {/* Statistics Section - Add grid layout wrapper for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users Card */}
        <div className="admin-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {statsLoading ? "..." : users.length}
              </h2>
            </div>
            <div className="bg-primary/10 p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
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
            </div>
          </div>
        </div>

        {/* New Users Today Card */}
        <div className="admin-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">New Users Today</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {statsLoading ? (
                  <div className="h-8 w-8 animate-pulse bg-gray-700 rounded"></div>
                ) : (
                  dailyStats.newUsers
                )}
              </h2>
            </div>
            <div className="bg-green-500/10 p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Matches Today Card */}
        <div className="admin-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Matches Today</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {statsLoading ? (
                  <div className="h-8 w-8 animate-pulse bg-gray-700 rounded"></div>
                ) : (
                  dailyStats.matchesPlayed
                )}
              </h2>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Bets Today Card */}
        <div className="admin-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Bets Today</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {statsLoading ? (
                  <div className="h-8 w-8 animate-pulse bg-gray-700 rounded"></div>
                ) : (
                  dailyStats.betsMade
                )}
              </h2>
            </div>
            <div className="bg-purple-500/10 p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Statistics */}
      <div className="admin-card mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-gray-400 text-sm">Teams Created Today</p>
            <h2 className="text-2xl font-bold text-white mt-1">
              {statsLoading ? (
                <div className="h-8 w-8 animate-pulse bg-gray-700 rounded"></div>
              ) : (
                dailyStats.teamsToday.total
              )}
            </h2>
          </div>
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>

        {/* Team size breakdown */}
        {!statsLoading && dailyStats.teamsToday.total > 0 ? (
          <div className="mt-2">
            <p className="text-gray-400 text-xs mb-2">Teams by size:</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark p-2 rounded-lg">
                <p className="text-xs text-gray-400">3-a-side</p>
                <p className="text-lg font-semibold text-white">
                  {dailyStats.teamsToday.threeASide}
                </p>
                <div
                  className="h-1 bg-yellow-500/30 mt-1 rounded-full overflow-hidden"
                  style={{ width: "100%" }}
                >
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${
                        (dailyStats.teamsToday.threeASide /
                          dailyStats.teamsToday.total) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-dark p-2 rounded-lg">
                <p className="text-xs text-gray-400">4-a-side</p>
                <p className="text-lg font-semibold text-white">
                  {dailyStats.teamsToday.fourASide}
                </p>
                <div
                  className="h-1 bg-blue-500/30 mt-1 rounded-full overflow-hidden"
                  style={{ width: "100%" }}
                >
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${
                        (dailyStats.teamsToday.fourASide /
                          dailyStats.teamsToday.total) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-dark p-2 rounded-lg">
                <p className="text-xs text-gray-400">5-a-side</p>
                <p className="text-lg font-semibold text-white">
                  {dailyStats.teamsToday.fiveASide}
                </p>
                <div
                  className="h-1 bg-green-500/30 mt-1 rounded-full overflow-hidden"
                  style={{ width: "100%" }}
                >
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        (dailyStats.teamsToday.fiveASide /
                          dailyStats.teamsToday.total) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ) : statsLoading ? (
          <div className="flex items-center justify-center py-2">
            <div className="animate-pulse h-4 w-3/4 bg-gray-700 rounded"></div>
          </div>
        ) : (
          <p className="text-gray-500 text-xs mt-1">No teams created today</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="admin-card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              className="pl-10 pr-4 py-2 bg-dark border border-gray-700 rounded-lg w-full text-white focus:outline-none focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-shrink-0 w-full sm:w-auto">
              <select
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="player">Players</option>
                <option value="referee">Referees</option>
                <option value="pitch_owner">Pitch Owners</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="w-full sm:w-auto flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 mr-1 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-1">
              No Users Found
            </h3>
            <p className="text-gray-400">
              {searchTerm || filterRole
                ? "Try adjusting your search or filter criteria"
                : "There are no users in the system yet"}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead className="bg-dark">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Balance
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Joined
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-dark">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "referee"
                              ? "bg-green-100 text-green-800"
                              : user.role === "pitch_owner"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.role === "pitch_owner"
                            ? "Pitch Owner"
                            : user.role === "player"
                            ? "Player"
                            : user.role === "referee"
                            ? "Referee"
                            : user.role === "admin"
                            ? "Administrator"
                            : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        ₦{user.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.activeSession
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.activeSession ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => openDeleteConfirmation(user)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col md:flex-row md:justify-between md:items-center pt-4 mt-4 border-t border-gray-700 gap-4">
                <div className="text-sm text-gray-400">
                  Showing {indexOfFirstUser + 1} to{" "}
                  {Math.min(indexOfLastUser, filteredUsers.length)} of{" "}
                  {filteredUsers.length} users
                </div>
                <div className="flex flex-wrap gap-1 justify-center md:justify-end">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-dark hover:bg-dark-light disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === number
                            ? "bg-primary text-white"
                            : "bg-dark hover:bg-dark-light"
                        }`}
                      >
                        {number}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      paginate(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-dark hover:bg-dark-light disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && userToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-dark-lighter rounded-lg p-6 max-w-md w-full">
            <div className="mb-4 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Confirm User Deletion</h3>
              <p className="text-gray-400">
                Are you sure you want to delete the user{" "}
                <span className="text-white font-medium">
                  {userToDelete.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmationModal}
                className="px-4 py-2 bg-dark text-white rounded-md hover:bg-dark-light"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
