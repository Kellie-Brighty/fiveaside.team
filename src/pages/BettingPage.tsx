import React, { useState, useEffect } from "react";
import type { Match, Team, Bet, Odds } from "../types";

// Mock data
const mockTeams: Team[] = [
  {
    id: "1",
    name: "Lightning Warriors",
    players: [],
    wins: 5,
    losses: 2,
    draws: 1,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
  {
    id: "2",
    name: "Royal Eagles",
    players: [],
    wins: 3,
    losses: 4,
    draws: 2,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
];

const mockMatches: Match[] = [
  {
    id: "1",
    teamA: mockTeams[0],
    teamB: mockTeams[1],
    scoreA: 0,
    scoreB: 0,
    status: "in-progress",
    startTime: new Date(),
    isActive: true,
    pitchId: "pitch1",
  },
];

// Calculate odds based on team performances
const calculateOdds = (teamA: Team, teamB: Team): Odds => {
  const totalMatchesA = teamA.wins + teamA.losses + teamA.draws;
  const totalMatchesB = teamB.wins + teamB.losses + teamB.draws;

  // Win rate calculation
  const winRateA = totalMatchesA > 0 ? teamA.wins / totalMatchesA : 0.5;
  const winRateB = totalMatchesB > 0 ? teamB.wins / totalMatchesB : 0.5;

  // Simple odds calculation (lower win rate = higher odds)
  const baseOddsA = 1 / (winRateA || 0.1);
  const baseOddsB = 1 / (winRateB || 0.1);

  // Normalize and add some variance
  const teamAOdds = parseFloat((1.5 + baseOddsA / 2).toFixed(2));
  const teamBOdds = parseFloat((1.5 + baseOddsB / 2).toFixed(2));
  const drawOdds = parseFloat(((teamAOdds * teamBOdds) / 2).toFixed(2));

  return {
    matchId: "1", // Mock match ID
    teamAOdds,
    teamBOdds,
    drawOdds,
    pitchId: "pitch1",
  };
};

const BettingPage: React.FC = () => {
  const [matches] = useState<Match[]>(mockMatches);
  const [bets, setBets] = useState<Bet[]>([]);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [userBalance, setUserBalance] = useState<number>(1000);
  const [selectedBetOption, setSelectedBetOption] = useState<
    "teamA" | "teamB" | "draw" | null
  >(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Get current active match
  const currentMatch = matches.find((match) => match.status === "in-progress");

  // Calculate odds for current match
  const matchOdds = currentMatch
    ? calculateOdds(currentMatch.teamA, currentMatch.teamB)
    : null;

  // Place a bet
  const placeBet = () => {
    if (
      !currentMatch ||
      !matchOdds ||
      !selectedBetOption ||
      betAmount <= 0 ||
      betAmount > userBalance
    ) {
      return;
    }

    // Determine selected team ID and odds
    let teamId: string;
    let odds: number;

    if (selectedBetOption === "teamA") {
      teamId = currentMatch.teamA.id;
      odds = matchOdds.teamAOdds;
    } else if (selectedBetOption === "teamB") {
      teamId = currentMatch.teamB.id;
      odds = matchOdds.teamBOdds;
    } else {
      teamId = "draw";
      odds = matchOdds.drawOdds;
    }

    // Create new bet
    const newBet: Bet = {
      id: (bets.length + 1).toString(),
      userId: "user1", // Mock user ID
      matchId: currentMatch.id,
      teamId,
      amount: betAmount,
      odds,
      status: "placed",
      createdAt: new Date(),
      pitchId: currentMatch.pitchId,
    };

    // Update user balance
    setUserBalance((prevBalance) => prevBalance - betAmount);

    // Add bet to list
    setBets([...bets, newBet]);

    // Reset selection
    setSelectedBetOption(null);
    setBetAmount(100);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate potential winnings
  const getPotentialWinnings = (): number => {
    if (!matchOdds || !selectedBetOption) return 0;

    const relevantOdds =
      selectedBetOption === "teamA"
        ? matchOdds.teamAOdds
        : selectedBetOption === "teamB"
        ? matchOdds.teamBOdds
        : matchOdds.drawOdds;

    return betAmount * relevantOdds;
  };

  return (
    <div>
      <h2 className="text-3xl font-bold sport-gradient-text mb-8">Betting</h2>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column - current match and betting panel */}
        <div className="w-full lg:w-2/3">
          {currentMatch ? (
            <div className="card mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">
                  Current Match
                </h3>
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                  Live
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <div className="text-center w-5/12">
                  <h4 className="font-bold mb-1">{currentMatch.teamA.name}</h4>
                  <div className="text-xs text-gray-400">
                    {currentMatch.teamA.wins}W - {currentMatch.teamA.losses}L -{" "}
                    {currentMatch.teamA.draws}D
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-bold mb-1">VS</div>
                  <div className="text-3xl font-bold">
                    {currentMatch.scoreA} - {currentMatch.scoreB}
                  </div>
                </div>

                <div className="text-center w-5/12">
                  <h4 className="font-bold mb-1">{currentMatch.teamB.name}</h4>
                  <div className="text-xs text-gray-400">
                    {currentMatch.teamB.wins}W - {currentMatch.teamB.losses}L -{" "}
                    {currentMatch.teamB.draws}D
                  </div>
                </div>
              </div>

              {matchOdds && (
                <div className="bg-dark-light p-4 rounded mb-6">
                  <h4 className="font-semibold mb-4 text-center">
                    Place Your Bet
                  </h4>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      className={`p-4 rounded border-2 ${
                        selectedBetOption === "teamA"
                          ? "border-primary bg-primary/10"
                          : "border-dark-light hover:border-primary/30"
                      } transition-all`}
                      onClick={() => setSelectedBetOption("teamA")}
                    >
                      <div className="font-bold mb-1">
                        {currentMatch.teamA.name}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {matchOdds.teamAOdds}x
                      </div>
                    </button>

                    <button
                      className={`p-4 rounded border-2 ${
                        selectedBetOption === "draw"
                          ? "border-primary bg-primary/10"
                          : "border-dark-light hover:border-primary/30"
                      } transition-all`}
                      onClick={() => setSelectedBetOption("draw")}
                    >
                      <div className="font-bold mb-1">Draw</div>
                      <div className="text-2xl font-bold text-primary">
                        {matchOdds.drawOdds}x
                      </div>
                    </button>

                    <button
                      className={`p-4 rounded border-2 ${
                        selectedBetOption === "teamB"
                          ? "border-primary bg-primary/10"
                          : "border-dark-light hover:border-primary/30"
                      } transition-all`}
                      onClick={() => setSelectedBetOption("teamB")}
                    >
                      <div className="font-bold mb-1">
                        {currentMatch.teamB.name}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {matchOdds.teamBOdds}x
                      </div>
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2 text-sm text-gray-300">
                      Bet Amount:
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        min="10"
                        max={userBalance}
                        value={betAmount}
                        onChange={(e) =>
                          setBetAmount(parseInt(e.target.value) || 0)
                        }
                        className="bg-dark rounded px-4 py-2 flex-grow mr-2"
                      />
                      <button
                        className="btn-secondary"
                        disabled={
                          !selectedBetOption ||
                          betAmount <= 0 ||
                          betAmount > userBalance
                        }
                        onClick={placeBet}
                      >
                        Place Bet
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <div>
                      Your Balance:{" "}
                      <span className="text-gray-300">
                        {formatCurrency(userBalance)}
                      </span>
                    </div>
                    {selectedBetOption && (
                      <div>
                        Potential Win:{" "}
                        <span className="text-primary font-bold">
                          {formatCurrency(getPotentialWinnings())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card mb-8 py-10 text-center">
              <p className="text-gray-400 mb-4">
                No active matches to bet on right now
              </p>
            </div>
          )}
        </div>

        {/* Right column - betting history */}
        <div className="w-full lg:w-1/3">
          <div className="card">
            <h3 className="text-xl font-bold text-primary mb-4">Your Bets</h3>

            {bets.length > 0 ? (
              <div className="divide-y divide-dark-light">
                {bets.map((bet) => {
                  const match = matches.find((m) => m.id === bet.matchId);
                  const team =
                    bet.teamId === "draw"
                      ? { name: "Draw" }
                      : match?.teamA.id === bet.teamId
                      ? match.teamA
                      : match?.teamB;

                  return (
                    <div key={bet.id} className="py-3">
                      <div className="flex justify-between">
                        <div className="font-bold">{team?.name}</div>
                        <div>
                          <span className="px-2 py-1 text-xs rounded bg-dark-light">
                            {bet.odds}x
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2 text-sm">
                        <div className="text-gray-400">
                          {bet.createdAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          <span className="text-gray-400">Stake: </span>
                          <span>{formatCurrency(bet.amount)}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-gray-400">Potential Win: </span>
                        <span className="text-primary">
                          {formatCurrency(bet.amount * bet.odds)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-6">
                No bets placed yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingPage;
