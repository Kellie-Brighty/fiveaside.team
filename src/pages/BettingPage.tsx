import React, { useState, useEffect, useMemo } from "react";
import type { Match, Bet } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";

// Remove mock data definitions
// const mockTeams: Team[] = [
//   {
//     id: "1",
//     name: "Lightning Warriors",
//     players: [],
//     wins: 5,
//     losses: 2,
//     draws: 1,
//     createdAt: new Date(),
//     pitchId: "pitch1",
//   },
//   {
//     id: "2",
//     name: "Royal Eagles",
//     players: [],
//     wins: 3,
//     losses: 4,
//     draws: 2,
//     createdAt: new Date(),
//     pitchId: "pitch1",
//   },
// ];

// const mockMatches: Match[] = [
//   {
//     id: "1",
//     teamA: mockTeams[0],
//     teamB: mockTeams[1],
//     scoreA: 0,
//     scoreB: 0,
//     status: "in-progress",
//     startTime: new Date(),
//     isActive: true,
//     pitchId: "pitch1",
//   },
// ];

const BettingPage: React.FC = () => {
  const { currentUser, selectedPitchId } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [userBalance, setUserBalance] = useState<number>(1000);
  const [selectedBetOption, setSelectedBetOption] = useState<
    "teamA" | "teamB" | "draw" | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayString, setTodayString] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // State for test funds request
  const [showFundsRequestModal, setShowFundsRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState<number>(5000);
  const [isRequestingFunds, setIsRequestingFunds] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Quick bet amounts
  const quickBetAmounts = [100, 500, 1000, 2000];

  // Pool sizes for current match
  const [poolSizes, setPoolSizes] = useState({
    teamA: 0,
    teamB: 0,
    draw: 0,
    total: 0,
  });

  // Add state for tracking settled bets
  const [settledBetIds, setSettledBetIds] = useState<string[]>([]);
  const [processingRewards, setProcessingRewards] = useState(false);

  useEffect(() => {
    // Set today's date in YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    setTodayString(dateString);

    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Check if user has a pending fund request
  useEffect(() => {
    const checkPendingRequests = async () => {
      if (!currentUser) return;

      try {
        const requestsRef = collection(db, "fundRequests");
        const q = query(
          requestsRef,
          where("userId", "==", currentUser.id),
          where("status", "==", "pending")
        );
        const querySnapshot = await getDocs(q);

        setHasPendingRequest(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking pending fund requests:", error);
      }
    };

    checkPendingRequests();
  }, [currentUser, requestSuccess]);

  // Handle submitting a request for test funds
  const requestFunds = async () => {
    if (!currentUser) return;

    try {
      setIsRequestingFunds(true);

      // Create a new fund request document
      await addDoc(collection(db, "fundRequests"), {
        userId: currentUser.id,
        amount: requestAmount,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Close modal and reset amount
      setShowFundsRequestModal(false);
      setRequestAmount(0);

      // Show success message
      window.toast?.success(
        "Fund request submitted successfully. Your wallet will be credited within 24 hours."
      );
    } catch (error) {
      console.error("Error requesting funds:", error);
      window.toast?.error("Failed to submit fund request. Please try again.");
    } finally {
      setIsRequestingFunds(false);
    }
  };

  // Fetch live matches and match history
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        // Use the selectedPitchId from AuthContext if available
        const pitchId = selectedPitchId;

        if (!pitchId) {
          console.log("No pitch selected");
          setMatches([]);
          setIsLoading(false);
          return;
        }

        console.log(
          "Fetching matches for pitch:",
          pitchId,
          "date:",
          todayString
        );

        // Query for matches for this pitch and today's date
        const matchesRef = collection(db, "matches");
        const q = query(
          matchesRef,
          where("pitchId", "==", pitchId),
          where("matchDate", "==", todayString)
        );

        // Set up real-time listener for matches
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            if (!querySnapshot.empty) {
              const matchesData: Match[] = [];

              querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Convert Firestore timestamps to Date objects
                const startTime = data.startTime?.toDate
                  ? data.startTime.toDate()
                  : data.startTime
                  ? new Date(data.startTime)
                  : new Date();

                // Handle end time for completed matches
                const endTime = data.endTime?.toDate
                  ? data.endTime.toDate()
                  : data.endTime
                  ? new Date(data.endTime)
                  : data.status === "completed"
                  ? new Date() // Fallback for completed matches without endTime
                  : null;

                matchesData.push({
                  id: doc.id,
                  teamA: data.teamA,
                  teamB: data.teamB,
                  scoreA: data.scoreA || 0,
                  scoreB: data.scoreB || 0,
                  status: data.status,
                  startTime: startTime,
                  endTime: endTime,
                  isActive: data.status === "in-progress",
                  pitchId: data.pitchId,
                  winner: data.winner || null,
                });
              });

              // Sort matches: in-progress first, then scheduled, then completed
              matchesData.sort((a, b) => {
                // In-progress matches first
                if (a.status === "in-progress" && b.status !== "in-progress")
                  return -1;
                if (a.status !== "in-progress" && b.status === "in-progress")
                  return 1;

                // Then scheduled matches
                if (a.status === "scheduled" && b.status !== "scheduled")
                  return -1;
                if (a.status !== "scheduled" && b.status === "scheduled")
                  return 1;

                // For matches with same status, sort by time
                if (a.status === "completed" && b.status === "completed") {
                  return (
                    (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0)
                  );
                }

                return (
                  (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
                );
              });

              console.log("Matches data after sorting:", matchesData);
              console.log(
                "In-progress matches:",
                matchesData.filter((m) => m.status === "in-progress").length
              );
              console.log(
                "Scheduled matches:",
                matchesData.filter((m) => m.status === "scheduled").length
              );
              console.log(
                "Completed matches:",
                matchesData.filter((m) => m.status === "completed").length
              );

              setMatches(matchesData);
            } else {
              console.log("No matches found");
              setMatches([]);
            }
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching matches:", error);
            setMatches([]);
            setIsLoading(false);
          }
        );

        // Clean up listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up matches listener:", error);
        setMatches([]);
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [selectedPitchId, todayString]);

  // Fetch user bets when user or matches change
  useEffect(() => {
    const fetchUserBets = async () => {
      if (!currentUser) {
        console.log("No user logged in, skipping bet fetch");
        return;
      }

      try {
        // Query for user's bets from today only
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const betsRef = collection(db, "bets");
        const q = query(
          betsRef,
          where("userId", "==", currentUser.id),
          where("createdAt", ">=", today)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userBets: Bet[] = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Convert timestamp to Date
            const createdAt = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date();

            userBets.push({
              id: doc.id,
              userId: data.userId,
              matchId: data.matchId,
              teamId: data.teamId,
              amount: data.amount,
              odds: data.odds || 1, // Add default odds value
              status: data.status,
              createdAt: createdAt,
              pitchId: data.pitchId,
            });
          });

          console.log("User bets (today only):", userBets);
          setBets(userBets);
        } else {
          console.log("No bets found for user today");
          setBets([]);
        }
      } catch (error) {
        console.error("Error fetching user bets:", error);
      }
    };

    fetchUserBets();
  }, [currentUser, matches, todayString]);

  // Get current active match - update to take the first in-progress match after sorting
  const currentMatch = useMemo(() => {
    return matches.find((match) => match.status === "in-progress");
  }, [matches]);

  // Check if there are scheduled matches
  const hasScheduledMatches = useMemo(() => {
    return matches.some((match) => match.status === "scheduled");
  }, [matches]);

  const nextScheduledMatch = useMemo(() => {
    if (!hasScheduledMatches) return null;
    return matches.find((match) => match.status === "scheduled");
  }, [matches, hasScheduledMatches]);

  // Fetch betting pool data for current match
  useEffect(() => {
    const fetchBettingPools = async () => {
      if (!currentMatch) return;

      try {
        // Query for all bets for this match
        const betsRef = collection(db, "bets");
        const q = query(betsRef, where("matchId", "==", currentMatch.id));

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          let teamAPool = 0;
          let teamBPool = 0;
          let drawPool = 0;

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const amount = data.amount || 0;

            if (data.teamId === currentMatch.teamA.id) {
              teamAPool += amount;
            } else if (data.teamId === currentMatch.teamB.id) {
              teamBPool += amount;
            } else if (data.teamId === "draw") {
              drawPool += amount;
            }
          });

          const totalPool = teamAPool + teamBPool + drawPool;

          setPoolSizes({
            teamA: teamAPool,
            teamB: teamBPool,
            draw: drawPool,
            total: totalPool || 1, // Avoid division by zero
          });

          console.log("Betting pools:", {
            teamAPool,
            teamBPool,
            drawPool,
            totalPool,
          });
        } else {
          // No bets yet, set default values
          setPoolSizes({
            teamA: 0,
            teamB: 0,
            draw: 0,
            total: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching betting pools:", error);
      }
    };

    fetchBettingPools();
  }, [currentMatch]);

  // Place a bet
  const placeBet = async () => {
    if (
      !currentMatch ||
      !selectedBetOption ||
      betAmount <= 0 ||
      betAmount > userBalance ||
      !currentUser
    ) {
      return;
    }

    // Determine selected team ID
    let teamId: string;

    if (selectedBetOption === "teamA") {
      teamId = currentMatch.teamA.id;
    } else if (selectedBetOption === "teamB") {
      teamId = currentMatch.teamB.id;
    } else {
      teamId = "draw";
    }

    try {
      // Calculate potential winning based on current pool sizes
      const potentialWin = calculatePotentialWinnings(
        selectedBetOption,
        betAmount
      );
      // Calculate effective odds (potential win / stake)
      const effectiveOdds = potentialWin / betAmount;

      // Create new bet in Firestore
      const betData = {
        userId: currentUser.id,
        userName: currentUser.name || "Anonymous",
        matchId: currentMatch.id,
        teamId,
        amount: betAmount,
        odds: effectiveOdds, // Store calculated odds
        potentialWin: potentialWin, // Store potential win at time of bet
        status: "placed",
        createdAt: serverTimestamp(),
        pitchId: currentMatch.pitchId,
        teamAName: currentMatch.teamA.name,
        teamBName: currentMatch.teamB.name,
      };

      const docRef = await addDoc(collection(db, "bets"), betData);
      console.log("Bet placed with ID:", docRef.id);

      // Create new bet object for local state
      const newBet: Bet = {
        id: docRef.id,
        userId: currentUser.id,
        matchId: currentMatch.id,
        teamId,
        amount: betAmount,
        odds: effectiveOdds,
        status: "placed",
        createdAt: new Date(),
        pitchId: currentMatch.pitchId,
      };

      // Deduct bet amount from user balance in Firestore
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        balance: increment(-betAmount),
      });

      // Update user balance locally
      setUserBalance((prevBalance) => prevBalance - betAmount);

      // Add bet to list
      setBets([...bets, newBet]);

      // Update pool sizes locally for immediate feedback
      setPoolSizes((prevSizes) => {
        const newSizes = { ...prevSizes };
        if (selectedBetOption === "teamA") {
          newSizes.teamA += betAmount;
        } else if (selectedBetOption === "teamB") {
          newSizes.teamB += betAmount;
        } else {
          newSizes.draw += betAmount;
        }
        newSizes.total += betAmount;
        return newSizes;
      });

      // Reset selection
      setSelectedBetOption(null);
      setBetAmount(100);
    } catch (error) {
      console.error("Error placing bet:", error);
      alert("Failed to place bet. Please try again.");
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate potential winnings based on bet pool
  const calculatePotentialWinnings = (
    betOption: "teamA" | "teamB" | "draw",
    amount: number
  ): number => {
    if (!amount) return 0;

    // If no bets have been placed yet, return stake as potential win (1:1 odds)
    if (poolSizes.total === 0) return amount;

    // Calculate proportional share of the losing pools
    let rawWinnings = 0;
    switch (betOption) {
      case "teamA":
        // If Team A wins, get proportional share of Team B and Draw pools based on stake
        if (poolSizes.teamA === 0) return amount; // If first bet on Team A, just return stake
        rawWinnings =
          amount +
          Math.floor(
            (amount / poolSizes.teamA) * (poolSizes.teamB + poolSizes.draw)
          );
        break;
      case "teamB":
        // If Team B wins, get proportional share of Team A and Draw pools based on stake
        if (poolSizes.teamB === 0) return amount; // If first bet on Team B, just return stake
        rawWinnings =
          amount +
          Math.floor(
            (amount / poolSizes.teamB) * (poolSizes.teamA + poolSizes.draw)
          );
        break;
      case "draw":
        // If Draw, get proportional share of Team A and Team B pools based on stake
        if (poolSizes.draw === 0) return amount; // If first bet on Draw, just return stake
        rawWinnings =
          amount +
          Math.floor(
            (amount / poolSizes.draw) * (poolSizes.teamA + poolSizes.teamB)
          );
        break;
      default:
        return 0;
    }

    // Apply 20% platform fee on winnings (not on the original stake)
    const winningsOnly = Math.max(0, rawWinnings - amount);
    const platformFee = Math.floor(winningsOnly * 0.2);
    const finalWinnings = rawWinnings - platformFee;

    return finalWinnings;
  };

  // Get option color based on selected bet
  const getOptionColor = (option: "teamA" | "teamB" | "draw") => {
    switch (option) {
      case "teamA":
        return {
          bg: "bg-blue-500",
          text: "text-blue-400",
          border: "border-blue-500",
        };
      case "teamB":
        return {
          bg: "bg-green-500",
          text: "text-green-400",
          border: "border-green-500",
        };
      case "draw":
        return {
          bg: "bg-yellow-500",
          text: "text-yellow-400",
          border: "border-yellow-500",
        };
    }
  };

  // Memoized potential winnings for currently selected option and amount
  const potentialWinnings = useMemo(() => {
    if (!selectedBetOption || betAmount <= 0) return 0;
    return calculatePotentialWinnings(selectedBetOption, betAmount);
  }, [selectedBetOption, betAmount, poolSizes]);

  // Handle refresh button click
  const handleRefresh = () => {
    setIsLoading(true);
    // Re-fetch matches by updating today's string (forcing the useEffect to run)
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    setTodayString(dateString);
  };

  // New useEffect to handle match completion and bet settlements
  useEffect(() => {
    const handleMatchCompletionAndSettleBets = async () => {
      // Find completed matches that need bet settlement
      const completedMatches = matches.filter(
        (match) => match.status === "completed" && match.winner
      );

      if (completedMatches.length === 0) return;

      for (const match of completedMatches) {
        // Check if we've already settled bets for this match to avoid duplicate processing
        const matchBets = bets.filter((bet) => bet.matchId === match.id);
        const unsettledBets = matchBets.filter(
          (bet) => bet.status === "placed" && !settledBetIds.includes(bet.id)
        );

        if (unsettledBets.length === 0) continue;

        setProcessingRewards(true);

        try {
          console.log(`Settling bets for completed match: ${match.id}`);

          // Query all bets for this match
          const betsRef = collection(db, "bets");
          const q = query(betsRef, where("matchId", "==", match.id));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.log("No bets found for this match");
            continue;
          }

          // Separate bets by winner and loser
          let winningBets: any[] = [];
          let losingBets: any[] = [];

          querySnapshot.forEach((doc) => {
            const betData = doc.data();
            // If the bet was placed on the winning team
            if (betData.teamId === match.winner?.id) {
              winningBets.push({
                id: doc.id,
                ...betData,
                docRef: doc.ref,
              });
            } else {
              losingBets.push({
                id: doc.id,
                ...betData,
                docRef: doc.ref,
              });
            }
          });

          // Calculate total winning and losing pools
          const totalWinningBetAmount = winningBets.reduce(
            (sum, bet) => sum + (bet.amount || 0),
            0
          );
          const totalLosingBetAmount = losingBets.reduce(
            (sum, bet) => sum + (bet.amount || 0),
            0
          );

          console.log(`Total winning pool: ${totalWinningBetAmount}`);
          console.log(`Total losing pool: ${totalLosingBetAmount}`);

          // If there's a non-zero winning pool
          if (totalWinningBetAmount > 0) {
            // Use a batch for atomic updates
            const batch = writeBatch(db);

            // Special case: if there are no losing bets, return original stake to winners
            if (totalLosingBetAmount === 0) {
              for (const bet of winningBets) {
                // Just return original stake
                const totalReturn = bet.amount;

                console.log(
                  `User ${bet.userId} gets stake back: ${totalReturn} (no losers)`
                );

                // Update bet status
                batch.update(bet.docRef, {
                  status: "won",
                  reward: 0,
                  totalReturn: totalReturn,
                  settledAt: serverTimestamp(),
                });

                // Update user balance - just return their stake
                if (bet.userId) {
                  const userRef = doc(db, "users", bet.userId);
                  batch.update(userRef, {
                    balance: increment(totalReturn),
                    betWins: increment(1),
                    totalWinnings: increment(0),
                  });
                }

                // Track settled bet IDs
                setSettledBetIds((prev) => [...prev, bet.id]);
              }
            } else {
              // Normal case: distribute losing pool among winners
              for (const bet of winningBets) {
                // Calculate proportional share of the losing pool
                const proportion = bet.amount / totalWinningBetAmount;
                const rawReward = Math.floor(proportion * totalLosingBetAmount);

                // Apply 20% platform fee on winnings (not on the original stake)
                const platformFee = Math.floor(rawReward * 0.2);
                const reward = rawReward - platformFee;
                const totalReturn = bet.amount + reward;

                console.log(
                  `User ${bet.userId} wins: stake ${bet.amount} + reward ${reward} (after 20% fee: ${platformFee}) = ${totalReturn}`
                );

                // Update bet status
                batch.update(bet.docRef, {
                  status: "won",
                  reward: reward,
                  platformFee: platformFee,
                  totalReturn: totalReturn,
                  settledAt: serverTimestamp(),
                });

                // Update user balance - add total return (stake + winnings)
                if (bet.userId) {
                  const userRef = doc(db, "users", bet.userId);
                  batch.update(userRef, {
                    balance: increment(totalReturn),
                    betWins: increment(1),
                    totalWinnings: increment(reward),
                  });
                }

                // Track settled bet IDs
                setSettledBetIds((prev) => [...prev, bet.id]);
              }
            }

            // Update losing bets' status - no need to deduct balance as it was already deducted when placing the bet
            for (const bet of losingBets) {
              batch.update(bet.docRef, {
                status: "lost",
                reward: 0,
                totalReturn: 0,
                settledAt: serverTimestamp(),
              });

              // Just update the user stats for losers (no balance change)
              if (bet.userId) {
                const userRef = doc(db, "users", bet.userId);
                batch.update(userRef, {
                  betLosses: increment(1),
                });
              }

              // Track settled bet IDs
              setSettledBetIds((prev) => [...prev, bet.id]);
            }

            // Commit all the updates
            await batch.commit();
            console.log(`Successfully settled all bets for match ${match.id}`);

            // Force an immediate balance update from the database
            if (currentUser) {
              try {
                const userRef = doc(db, "users", currentUser.id);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  if (userData.balance !== undefined) {
                    console.log(
                      "Updated user balance after settlement:",
                      userData.balance
                    );
                    setUserBalance(userData.balance);
                  }
                }
              } catch (error) {
                console.error("Error fetching updated user balance:", error);
              }
            }

            // Update local state for current user
            if (currentUser) {
              // DO NOT update local balance here - we'll rely on the next user balance fetch
              // The Firestore update is already handling the balance update correctly

              // Only update the bet status in local state
              setBets((prev) =>
                prev.map((b) => {
                  const matchingWinBet = winningBets.find(
                    (wb) => wb.id === b.id
                  );
                  if (matchingWinBet) {
                    let reward = 0;
                    if (totalLosingBetAmount > 0) {
                      const proportion = b.amount / totalWinningBetAmount;
                      reward = Math.floor(proportion * totalLosingBetAmount);
                    }
                    return {
                      ...b,
                      status: "won",
                      reward: reward,
                    };
                  }

                  const matchingLoseBet = losingBets.find(
                    (lb) => lb.id === b.id
                  );
                  if (matchingLoseBet) {
                    return { ...b, status: "lost" };
                  }

                  return b;
                })
              );
            }
          }
        } catch (error) {
          console.error("Error settling bets:", error);
        }
      }

      setProcessingRewards(false);
    };

    // Only run if we have match data and user bets
    if (matches.length > 0 && !isLoading && currentUser) {
      handleMatchCompletionAndSettleBets();
    }
  }, [matches, bets, currentUser, isLoading, settledBetIds]);

  // Also fetch user balance on mount and when bets are settled
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.balance !== undefined) {
            setUserBalance(userData.balance);
            console.log(
              "Updated user balance from Firestore:",
              userData.balance
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user balance:", error);
      }
    };

    fetchUserBalance();
  }, [currentUser, settledBetIds]);

  return (
    <div className="pb-4 px-2 sm:px-0">
      {/* Test feature banner */}
      <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold text-yellow-500 mb-1">Test Feature</h3>
            <p className="text-gray-300 text-sm mb-2">
              The betting feature is currently in test mode. You can bet on real
              matches, but no real money is involved.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setShowFundsRequestModal(true)}
                disabled={hasPendingRequest}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  hasPendingRequest
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                }`}
              >
                {hasPendingRequest ? "Request Pending" : "Request Test Funds"}
              </button>
              <div className="text-sm text-white bg-dark-lighter rounded-lg px-3 py-2 flex items-center">
                <span className="text-gray-400 mr-1">Balance:</span>
                <span className="font-bold">{formatCurrency(userBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl"></div>
        <div className="relative p-4 flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Betting Pool
          </h2>
          <div className="flex items-center bg-dark-lighter rounded-lg px-3 py-1.5">
            <span className="text-gray-400 text-xs whitespace-nowrap">
              Balance:
            </span>
            <span className="font-bold text-primary ml-2 truncate max-w-[100px]">
              {formatCurrency(userBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Request Test Funds Modal */}
      {showFundsRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-lighter rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowFundsRequestModal(false);
                setRequestSuccess(false);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              disabled={isRequestingFunds}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {requestSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Request Submitted
                </h3>
                <p className="text-gray-400">
                  Your test funds request has been submitted. Your wallet will
                  be credited within 24 hours.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-4">
                  Request Test Funds
                </h3>
                <p className="text-gray-400 mb-6">
                  Request virtual funds to test the betting features. These are
                  not real currency and can only be used within this
                  application.
                </p>

                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    Amount to Request
                  </label>
                  <div className="flex items-center bg-dark rounded-lg">
                    <div className="px-3 py-2 text-gray-500">₦</div>
                    <input
                      type="text"
                      value={requestAmount}
                      onChange={(e) => {
                        // Only allow numeric input
                        const value = e.target.value.replace(/\D/g, "");
                        if (value === "") {
                          setRequestAmount(0);
                        } else {
                          const numValue = parseInt(value);
                          // Only enforce the max limit of 10,000
                          setRequestAmount(Math.min(10000, numValue));
                        }
                      }}
                      className="bg-transparent flex-1 px-2 py-2 text-white border-none focus:outline-none"
                      placeholder="Enter amount"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex justify-between">
                    <span>Enter any amount</span>
                    <span>Max: ₦10,000</span>
                  </div>
                </div>

                <div className="mb-6 bg-dark/50 p-3 rounded-lg text-sm text-gray-400">
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      Your test funds will be processed and added to your
                      account within 24 hours. You'll be able to use these funds
                      to place bets in the app.
                    </div>
                  </div>
                </div>

                <button
                  onClick={requestFunds}
                  disabled={isRequestingFunds}
                  className={`w-full py-3 rounded-lg font-medium text-white ${
                    isRequestingFunds
                      ? "bg-primary/50 cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {isRequestingFunds ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
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
                      Processing...
                    </span>
                  ) : (
                    "Request Funds"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isLoading || processingRewards ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          {processingRewards && (
            <p className="ml-4 text-gray-400">Processing rewards...</p>
          )}
        </div>
      ) : currentMatch ? (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
          {/* Match card */}
          <div className="card bg-gradient-to-b from-dark-lighter to-dark p-4 rounded-xl shadow-lg overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-gray-400">
                Live Match
              </div>
              <div className="flex items-center">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-1.5"></span>
                <span className="text-xs text-red-400">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold">
                    {currentMatch.teamA.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-md font-bold text-white mb-1 px-1 truncate">
                  {currentMatch.teamA.name}
                </h3>
                <div className="text-xs text-gray-400 inline-flex gap-1 justify-center">
                  <span className="text-green-400">
                    {currentMatch.teamA.wins}W
                  </span>
                  <span>-</span>
                  <span className="text-red-400">
                    {currentMatch.teamA.losses}L
                  </span>
                  <span>-</span>
                  <span className="text-yellow-400">
                    {currentMatch.teamA.draws}D
                  </span>
                </div>
              </div>

              <div className="col-span-1 text-center">
                <div className="text-2xl font-bold bg-dark-lighter py-3 px-4 rounded-lg">
                  {currentMatch.scoreA} - {currentMatch.scoreB}
                </div>
              </div>

              <div className="col-span-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold">
                    {currentMatch.teamB.name.charAt(0)}
                  </span>
                </div>
                <h3 className="text-md font-bold text-white mb-1 px-1 truncate">
                  {currentMatch.teamB.name}
                </h3>
                <div className="text-xs text-gray-400 inline-flex gap-1 justify-center">
                  <span className="text-green-400">
                    {currentMatch.teamB.wins}W
                  </span>
                  <span>-</span>
                  <span className="text-red-400">
                    {currentMatch.teamB.losses}L
                  </span>
                  <span>-</span>
                  <span className="text-yellow-400">
                    {currentMatch.teamB.draws}D
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Betting pool visualization */}
          <div className="card rounded-xl overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-bold mb-3">Current Betting Pool</h3>

              {poolSizes.total > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-400">Total Pool:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(poolSizes.total)}
                    </span>
                  </div>

                  {/* Platform fee information */}
                  <div className="bg-dark-lighter p-2 rounded-lg mb-3 text-xs">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-gray-300">
                        20% platform fee applies to all winnings (original stake
                        is not charged)
                      </span>
                    </div>
                  </div>

                  <div className="h-3 bg-dark rounded-full overflow-hidden mb-4">
                    <div className="flex h-full">
                      <div
                        className="bg-blue-500 h-full"
                        style={{
                          width: `${
                            (poolSizes.teamA / poolSizes.total) * 100
                          }%`,
                        }}
                      ></div>
                      <div
                        className="bg-yellow-500 h-full"
                        style={{
                          width: `${(poolSizes.draw / poolSizes.total) * 100}%`,
                        }}
                      ></div>
                      <div
                        className="bg-green-500 h-full"
                        style={{
                          width: `${
                            (poolSizes.teamB / poolSizes.total) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-dark rounded-lg p-2 text-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400 mb-1 truncate max-w-full">
                        {currentMatch.teamA.name}
                      </div>
                      <div className="font-medium text-blue-400">
                        {formatCurrency(poolSizes.teamA)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {poolSizes.total > 0
                          ? `${(
                              (poolSizes.teamA / poolSizes.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%"}
                      </div>
                    </div>

                    <div className="bg-dark rounded-lg p-2 text-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400 mb-1">Draw</div>
                      <div className="font-medium text-yellow-400">
                        {formatCurrency(poolSizes.draw)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {poolSizes.total > 0
                          ? `${(
                              (poolSizes.draw / poolSizes.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%"}
                      </div>
                    </div>

                    <div className="bg-dark rounded-lg p-2 text-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs text-gray-400 mb-1 truncate max-w-full">
                        {currentMatch.teamB.name}
                      </div>
                      <div className="font-medium text-green-400">
                        {formatCurrency(poolSizes.teamB)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {poolSizes.total > 0
                          ? `${(
                              (poolSizes.teamB / poolSizes.total) *
                              100
                            ).toFixed(1)}%`
                          : "0%"}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center bg-dark rounded-lg">
                  <div className="mb-2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mx-auto mb-2 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    No bets have been placed yet
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Be the first to place a bet on this match!
                  </p>
                  <div className="mt-3 bg-dark-lighter p-2 rounded-lg text-xs inline-flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-yellow-400 mr-1.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-gray-300">
                      20% platform fee applies to winnings
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Betting options section */}
          <div className="card rounded-xl">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-lg font-bold mb-4">Place Your Bet</h3>
            </div>

            {/* Bet selection buttons */}
            <div className="px-4 mb-6">
              <div className="grid grid-cols-3 gap-3">
                {/* Team A Option */}
                <button
                  className={`flex flex-col items-center justify-center py-4 px-2 rounded-lg ${
                    selectedBetOption === "teamA"
                      ? "bg-blue-500/20 border-2 border-blue-500"
                      : "bg-dark border-2 border-dark-light hover:border-blue-500/30"
                  } transition-all`}
                  onClick={() => setSelectedBetOption("teamA")}
                >
                  <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center mb-2">
                    <span className="font-bold text-blue-400">
                      {currentMatch.teamA.name.charAt(0)}
                    </span>
                  </div>
                  <div className="font-medium mb-1 truncate text-sm w-full px-1">
                    {currentMatch.teamA.name}
                  </div>
                  <div className="text-xs text-blue-400 font-medium">Win</div>
                </button>

                {/* Draw Option */}
                <button
                  className={`flex flex-col items-center justify-center py-4 px-2 rounded-lg ${
                    selectedBetOption === "draw"
                      ? "bg-yellow-500/20 border-2 border-yellow-500"
                      : "bg-dark border-2 border-dark-light hover:border-yellow-500/30"
                  } transition-all`}
                  onClick={() => setSelectedBetOption("draw")}
                >
                  <div className="w-8 h-8 bg-yellow-500/30 rounded-full flex items-center justify-center mb-2">
                    <span className="font-bold text-yellow-400">=</span>
                  </div>
                  <div className="font-medium mb-1 text-sm">Draw</div>
                  <div className="text-xs text-yellow-400 font-medium">
                    Even
                  </div>
                </button>

                {/* Team B Option */}
                <button
                  className={`flex flex-col items-center justify-center py-4 px-2 rounded-lg ${
                    selectedBetOption === "teamB"
                      ? "bg-green-500/20 border-2 border-green-500"
                      : "bg-dark border-2 border-dark-light hover:border-green-500/30"
                  } transition-all`}
                  onClick={() => setSelectedBetOption("teamB")}
                >
                  <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center mb-2">
                    <span className="font-bold text-green-400">
                      {currentMatch.teamB.name.charAt(0)}
                    </span>
                  </div>
                  <div className="font-medium mb-1 truncate text-sm w-full px-1">
                    {currentMatch.teamB.name}
                  </div>
                  <div className="text-xs text-green-400 font-medium">Win</div>
                </button>
              </div>
            </div>

            {/* Bet amount controls */}
            <div className="px-4 pb-4">
              {selectedBetOption && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-dark border border-dark-light/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-400">
                      Potential Win:
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        getOptionColor(selectedBetOption).text
                      } truncate max-w-[50%]`}
                    >
                      {formatCurrency(potentialWinnings)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-right mb-2">
                    After 20% platform fee
                  </div>
                  <div className="h-1 w-full bg-dark-light rounded-full"></div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-400">Bet Amount:</label>
                  <span className="text-white text-lg font-bold truncate max-w-[50%]">
                    {formatCurrency(betAmount)}
                  </span>
                </div>

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {quickBetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className={`py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors
                        ${
                          betAmount === amount
                            ? "bg-primary text-white"
                            : "bg-dark text-gray-300 hover:bg-dark-light"
                        }`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>

                {/* Custom amount range input */}
                <input
                  type="range"
                  min="10"
                  max={userBalance}
                  step="10"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value))}
                  className="w-full h-4 rounded-lg appearance-none cursor-pointer bg-dark-light touch-manipulation"
                  style={{
                    backgroundImage: `linear-gradient(to right, #00ccff 0%, #00ccff ${
                      (betAmount / userBalance) * 100
                    }%, #303040 ${(betAmount / userBalance) * 100}%)`,
                  }}
                />
              </div>

              <button
                className={`w-full py-4 rounded-lg font-medium text-white transition-all text-base
                  ${
                    !selectedBetOption ||
                    betAmount <= 0 ||
                    betAmount > userBalance
                      ? "bg-gray-700 opacity-60 cursor-not-allowed"
                      : selectedBetOption === "teamA"
                      ? "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                      : selectedBetOption === "teamB"
                      ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
                      : "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700"
                  }`}
                disabled={
                  !selectedBetOption ||
                  betAmount <= 0 ||
                  betAmount > userBalance
                }
                onClick={placeBet}
              >
                {!selectedBetOption
                  ? "Select an outcome"
                  : betAmount <= 0
                  ? "Enter bet amount"
                  : betAmount > userBalance
                  ? "Insufficient balance"
                  : `Place ${formatCurrency(betAmount)} Bet`}
              </button>
            </div>
          </div>

          {/* Betting history section */}
          <div className="card rounded-xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex justify-between items-center">
              <h3 className="text-lg font-bold">Today's Bets</h3>
              <span className="text-xs px-2 py-1 bg-dark rounded-full text-gray-400 ml-2">
                {bets.length} total
              </span>
            </div>

            {bets.length > 0 ? (
              <div className="divide-y divide-dark-light">
                {bets.map((bet) => {
                  const match = matches.find((m) => m.id === bet.matchId);
                  let team = { name: "Unknown" };
                  let teamColor = "text-primary";
                  let bgColor = "bg-primary/10";

                  if (bet.teamId === "draw") {
                    team = { name: "Draw" };
                    teamColor = "text-yellow-400";
                    bgColor = "bg-yellow-500/20";
                  } else if (match?.teamA.id === bet.teamId) {
                    team = match.teamA;
                    teamColor = "text-blue-400";
                    bgColor = "bg-blue-500/20";
                  } else if (match?.teamB.id === bet.teamId) {
                    team = match.teamB;
                    teamColor = "text-green-400";
                    bgColor = "bg-green-500/20";
                  }

                  // Calculate potential winnings based on current pool
                  const betOption =
                    bet.teamId === "draw"
                      ? "draw"
                      : match?.teamA.id === bet.teamId
                      ? "teamA"
                      : "teamB";

                  return (
                    <div key={bet.id} className="p-4 hover:bg-dark/50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center overflow-hidden">
                          <div
                            className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center mr-2 flex-shrink-0`}
                          >
                            <span className={`font-bold ${teamColor}`}>
                              {team.name === "Draw" ? "=" : team.name.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className={`font-bold ${teamColor} truncate`}>
                              {team.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {bet.createdAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full ${
                            bet.status === "won"
                              ? "bg-green-500/20 text-green-400"
                              : bet.status === "lost"
                              ? "bg-red-500/20 text-red-400"
                              : bgColor
                          } flex-shrink-0 ml-2`}
                        >
                          <span
                            className={
                              bet.status === "won"
                                ? "text-green-400"
                                : bet.status === "lost"
                                ? "text-red-400"
                                : teamColor
                            }
                          >
                            {match?.status === "completed"
                              ? bet.status === "won"
                                ? "Won"
                                : "Lost"
                              : "Active"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm flex-wrap">
                        <div className="mr-4 mb-1">
                          <span className="text-gray-400">Stake: </span>
                          <span className="font-medium">
                            {formatCurrency(bet.amount)}
                          </span>
                        </div>
                        {bet.status === "won" ? (
                          <div>
                            <span className="text-gray-400">Won: </span>
                            <span className="font-bold text-green-400">
                              {formatCurrency(bet.amount + (bet.reward || 0))}
                            </span>
                            {bet.reward !== undefined && bet.reward > 0 && (
                              <span className="text-xs text-green-400 ml-1">
                                (+{formatCurrency(bet.reward)})
                              </span>
                            )}
                          </div>
                        ) : bet.status === "lost" ? (
                          <div>
                            <span className="text-gray-400">Lost: </span>
                            <span className="font-bold text-red-400">
                              {formatCurrency(bet.amount)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-gray-400">Potential: </span>
                            <span className={`font-bold ${teamColor}`}>
                              {formatCurrency(
                                calculatePotentialWinnings(
                                  betOption as "teamA" | "teamB" | "draw",
                                  bet.amount
                                )
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto bg-dark rounded-full flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 mb-1">No bets placed today</p>
                <p className="text-xs text-gray-500">
                  Your bets for today will appear here
                </p>
              </div>
            )}
          </div>

          {/* How it works section */}
          <div className="bg-dark/50 rounded-xl p-4 text-sm text-gray-400 overflow-hidden">
            <h4 className="font-medium text-white mb-3 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              How The Pool Works
            </h4>
            <div className="space-y-2">
              <div className="flex">
                <span className=" w-5 h-5 rounded-full bg-dark-light mr-2 flex-shrink-0 text-xs text-gray-300 flex items-center justify-center">
                  1
                </span>
                <p className="flex-1">
                  Bettors place stakes on one of three outcomes: Team A wins,
                  Draw, or Team B wins.
                </p>
              </div>
              <div className="flex">
                <span className=" w-5 h-5 rounded-full bg-dark-light mr-2 flex-shrink-0 text-xs text-gray-300 flex items-center justify-center">
                  2
                </span>
                <p className="flex-1">
                  All bets go into a combined pool for the match.
                </p>
              </div>
              <div className="flex">
                <span className=" w-5 h-5 rounded-full bg-dark-light mr-2 flex-shrink-0 text-xs text-gray-300 flex items-center justify-center">
                  3
                </span>
                <p className="flex-1">
                  When the match ends, winning bettors share the entire pot from
                  losing bets.
                </p>
              </div>
              <div className="flex">
                <span className=" w-5 h-5 rounded-full bg-dark-light mr-2 flex-shrink-0 text-xs text-gray-300 flex items-center justify-center">
                  4
                </span>
                <p className="flex-1">
                  Your potential winnings are based on your proportion of the
                  winning side's total bets.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : hasScheduledMatches && nextScheduledMatch ? (
        <div className="card rounded-xl py-12 text-center">
          <div className="w-20 h-20 mx-auto bg-dark rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Match Scheduled</h3>
          <p className="text-gray-400 mb-6 max-w-xs mx-auto">
            A match between {nextScheduledMatch.teamA.name} and{" "}
            {nextScheduledMatch.teamB.name} is scheduled. Betting will open when
            the match starts.
            {nextScheduledMatch.startTime && (
              <span className="block mt-2 text-sm text-primary">
                Starting at{" "}
                {nextScheduledMatch.startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>

          <div className="mb-6 bg-dark p-4 rounded-lg max-w-xs mx-auto">
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-blue-400">
                    {nextScheduledMatch.teamA.name.charAt(0)}
                  </span>
                </div>
                <div className="text-sm truncate max-w-[80px] mx-auto">
                  {nextScheduledMatch.teamA.name}
                </div>
              </div>
              <div className="text-sm text-gray-400">vs</div>
              <div className="text-center">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-green-400">
                    {nextScheduledMatch.teamB.name.charAt(0)}
                  </span>
                </div>
                <div className="text-sm truncate max-w-[80px] mx-auto">
                  {nextScheduledMatch.teamB.name}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="bg-primary/20 text-primary hover:bg-primary/30 px-6 py-3 rounded-lg mx-auto flex items-center justify-center active:bg-primary/40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
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
            Refresh Matches
          </button>
        </div>
      ) : (
        <div className="card rounded-xl py-12 text-center">
          <div className="w-20 h-20 mx-auto bg-dark rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">No Active Matches</h3>
          <p className="text-gray-400 mb-6 max-w-xs mx-auto">
            There are no live matches to bet on right now. Check back soon for
            upcoming matches.
          </p>

          <button
            onClick={handleRefresh}
            className="bg-primary/20 text-primary hover:bg-primary/30 px-6 py-3 rounded-lg mx-auto flex items-center justify-center active:bg-primary/40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
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
            Refresh Matches
          </button>
        </div>
      )}
    </div>
  );
};

export default BettingPage;
