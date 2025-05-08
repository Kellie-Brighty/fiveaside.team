// Pitch type
export interface Pitch {
  id: string;
  name: string;
  location?: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  logo?: string;
  createdAt: Date;
  referees: string[]; // User IDs with referee role for this pitch
  customSettings?: PitchSettings;
  ownerId: string;
  availability?: {
    daysOpen: (
      | "monday"
      | "tuesday"
      | "wednesday"
      | "thursday"
      | "friday"
      | "saturday"
      | "sunday"
    )[];
    openingTime: string; // e.g. "09:00"
    closingTime: string; // e.g. "22:00"
  };
  pricePerPerson?: number; // Price per person in Naira
}

// Settings specific to a pitch
export interface PitchSettings {
  matchDuration: number; // in seconds
  maxGoals: number;
  allowDraws: boolean;
  maxPlayersPerTeam: number; // Maximum number of players allowed per team (max 5)
  customColors?: {
    primary: string;
    secondary: string;
  };
  pricePerPerson?: number; // Price per person in Naira
}

// Player type
export interface Player {
  id: string;
  name: string;
  createdAt: Date;
}

// Team/Set type
export interface Team {
  id: string;
  name: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  pitchId: string; // Which pitch this team belongs to
}

// Match type
export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  winner?: Team;
  startTime?: Date;
  endTime?: Date;
  isActive: boolean;
  pitchId: string; // Which pitch this match belongs to
  feePerPerson?: number; // Fee per person in Naira
}

// Match Session type
export interface MatchSession {
  id: string;
  date: Date;
  matches: Match[];
  currentMatch?: Match;
  waitingTeams: Team[];
  pitchId: string; // Which pitch this session belongs to
}

// Bet type
export interface Bet {
  id: string;
  userId: string;
  matchId: string;
  teamId: string;
  amount: number; // Amount in Naira
  odds: number;
  status: "placed" | "won" | "lost" | "cancelled";
  createdAt: Date;
  pitchId: string; // Which pitch this bet belongs to
  winnings?: number; // Winnings in Naira
  reward?: number; // Additional reward amount from the pool
  totalReturn?: number; // Total amount returned (stake + reward)
  potentialWin?: number; // Potential win at time of bet placement
}

// User type
export interface User {
  id: string;
  name: string;
  email: string;
  role: "player" | "referee" | "admin" | "pitch_owner" | "spectator";
  balance: number; // Balance in Naira
  bets: Bet[];
  createdAt: Date;
  memberOfPitches: string[]; // IDs of pitches this user belongs to
  ownedPitches?: string[]; // For pitch owners
  location?: {
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }; // User location in Nigeria
}

// Odds type
export interface Odds {
  matchId: string;
  teamAOdds: number;
  teamBOdds: number;
  drawOdds: number;
  pitchId: string; // Which pitch these odds belong to
  minimumBet?: number; // Minimum bet amount in Naira
  maximumBet?: number; // Maximum bet amount in Naira
}
