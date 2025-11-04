// Pitch type - extended for Phase 1 (stadium complex features)
export interface Pitch {
  id: string;
  name: string;
  location?: string;
  address?: string;
  city?: string;
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
    daysOpen: string[];
    openingTime: string; // e.g. "09:00"
    closingTime: string; // e.g. "22:00"
  };
  pricePerPerson?: number; // Price per person in Naira
  boostData?: {
    isActive: boolean;
    boostType: string;
    startDate: Date;
    endDate: Date;
    transactionRef?: string;
    lastPaymentDate?: Date;
    content?: {
      text?: string;
      imageUrl?: string;
    };
    targetLocation?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  vests?: {
    hasVests: boolean;
    colors: string[]; // Array of vest colors available at the pitch
  };
  // Stadium complex extensions (Phase 1)
  isStadiumComplex?: boolean; // Whether this is the Ondo State stadium complex
  seatingCapacity?: number; // Stadium seating capacity
  ticketSalesEnabled?: boolean; // Whether ticketing is available
  facilities?: string[]; // e.g., ["Parking", "Concessions", "VIP Lounge"]
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

// Player type (basic - used in teams)
export interface Player {
  id: string;
  name: string;
  createdAt: Date;
}

// Certification type for service providers (Phase 1)
export interface Certification {
  id: string;
  name: string;
  issuer: string; // Organization that issued the certification
  issueDate: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  documentUrl?: string; // URL to certification document
}

// PlayerProfile type - extended player information (Phase 1)
export interface PlayerProfile {
  id: string;
  userId: string; // Link to User
  // Physical attributes
  height?: number; // in cm
  weight?: number; // in kg
  position?: string; // e.g., "Forward", "Midfielder", "Defender", "Goalkeeper"
  preferredFoot?: "left" | "right" | "both";
  // Statistics
  stats?: {
    goals: number;
    assists: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
    yellowCards: number;
    redCards: number;
    cleanSheets?: number; // For goalkeepers
    saves?: number; // For goalkeepers
  };
  // Media
  highlightVideos?: string[]; // Array of video URLs
  images?: string[]; // Array of image URLs
  // Achievements
  achievements?: Achievement[];
  // Club association
  clubId?: string; // Current club ID
  clubHistory?: {
    clubId: string;
    clubName: string;
    joinedDate: Date;
    leftDate?: Date;
    position: string;
  }[];
  // Visibility settings
  isPublic: boolean; // Whether profile is visible to scouts
  profileViews?: number; // Analytics: number of profile views
  lastUpdated: Date;
  createdAt: Date;
}

// Achievement type for player profiles (Phase 1)
export interface Achievement {
  id: string;
  title: string;
  description?: string;
  date: Date;
  category: "award" | "championship" | "personal_best" | "certification" | "other";
  imageUrl?: string;
}

// Team/Set type - extended for Phase 1
export interface Team {
  id: string;
  name: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  pitchId: string; // Which pitch this team belongs to
  createdForDate?: string; // Date in YYYY-MM-DD format
  createdBy?: string; // User ID who created the team
  maxPlayers?: number; // Maximum number of players allowed in this team (3, 4, or 5-a-side)
  // Club association (Phase 1)
  clubId?: string; // Link to official club if this team belongs to one
}

// Match type - extended for Phase 1 (league matches)
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
  vestColors?: {
    teamA: string;
    teamB: string;
  };
  // League match extensions (Phase 1)
  leagueId?: string; // If this is a league match
  seasonId?: string; // Season identifier
  fixtureRound?: number; // Round number in the league
  matchType?: "friendly" | "league" | "cup" | "tournament";
  refereeId?: string; // Assigned referee user ID
  verifiedBy?: string; // User ID who verified the result
  verifiedAt?: Date; // When result was verified
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

// Bet type - extended for Phase 1 (Boardman escrow)
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
  // Boardman escrow extensions (Phase 1)
  isBoardmanWager?: boolean; // Whether this is a peer-to-peer wager
  escrowId?: string; // Escrow account ID if using Boardman
  wagerType?: "traditional" | "boardman_p2p"; // Betting type
}

// BoardmanWager type - peer-to-peer wagering with escrow (Phase 1)
export interface BoardmanWager {
  id: string;
  matchId: string;
  creatorId: string; // User who created the wager
  acceptorId?: string; // User who accepted the wager (if matched)
  amount: number; // Wager amount in Naira
  selectedOption: "teamA" | "teamB" | "draw"; // What the creator is betting on
  status: "open" | "matched" | "locked" | "settled" | "disputed" | "cancelled";
  // Escrow information
  escrowAccountId: string;
  creatorAmountHeld: number; // Amount held from creator
  acceptorAmountHeld?: number; // Amount held from acceptor (if matched)
  escrowFee: number; // Fee collected by platform
  ministryLevy?: number; // Sports development levy for Ministry
  // Matching information
  counterWagerId?: string; // ID of matching counter-wager
  createdAt: Date;
  matchedAt?: Date;
  lockedAt?: Date; // When wager is locked (match starts)
  settledAt?: Date;
  settlementDetails?: {
    winnerId: string; // User ID who won
    payout: number; // Amount paid out
    feeBreakdown: {
      platform: number;
      ministry: number;
    };
  };
}

// User role type - extended with new roles from Phase 1
export type UserRole =
  | "player"
  | "referee"
  | "admin"
  | "pitch_owner"
  | "spectator"
  | "club_manager"
  | "scout"
  | "service_provider"
  | "ministry_official"
  | "fa_official"
  | "facility_manager";

// User type - extended for Phase 1
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  balance: number; // Balance in Naira
  monkeyCoins?: number; // MonkeyCoins credit balance (Phase 1)
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
  activeSession?: {
    id: string;
    lastActive: Date;
    device: string;
  } | null; // Current active session data
  // Profile extensions (Phase 1)
  profileImage?: string; // Profile image URL
  bio?: string; // User bio/description
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  // Certifications for service providers (Phase 1)
  certifications?: Certification[];
  // Club association for club managers (Phase 1)
  managedClubs?: string[]; // Club IDs managed by this user
  // Scout specific fields (Phase 1)
  scoutOrganization?: string; // Organization the scout belongs to
  watchlists?: string[]; // Player IDs in scout's watchlist
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

// ==================== Phase 1: New Entity Types ====================

// Club type - official football club (Phase 1)
export interface Club {
  id: string;
  name: string;
  shortName?: string; // Abbreviation or short name
  founded?: number; // Year founded
  // Official registration
  registrationNumber?: string; // Official registration number from FA
  isLegitimate: boolean; // Whether club has paid legitimacy fee
  legitimacyFeeStatus: "unpaid" | "pending" | "paid" | "expired";
  legitimacyFeePaidUntil?: Date; // When legitimacy fee expires
  lastLegitimacyPaymentDate?: Date;
  legitimacyPaymentHistory?: {
    paymentDate: Date;
    amount: number;
    transactionRef: string;
    validUntil: Date;
  }[];
  // Management
  managerId: string; // User ID of club manager
  ownerId?: string; // User ID of club owner (if different from manager)
  // Club details
  logo?: string;
  description?: string;
  location: {
    city: string;
    state: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  // Contact information
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  // Roster
  playerIds: string[]; // User IDs of registered players
  roster?: {
    userId: string;
    playerName: string;
    position: string;
    jerseyNumber?: number;
    joinedDate: Date;
  }[];
  // Statistics
  stats?: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  // League participation
  currentLeagueId?: string; // Current league the club is registered in
  leagueHistory?: {
    leagueId: string;
    leagueName: string;
    season: string;
    position?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Phase 4.3: Player Transfer/Registration Request
export interface TransferRequest {
  id: string;
  playerId: string; // User ID of player requesting transfer
  clubId: string; // Club ID player wants to join
  status: "pending" | "approved" | "rejected" | "cancelled";
  position?: string; // Preferred position
  jerseyNumber?: number; // Preferred jersey number
  message?: string; // Optional message from player
  // Metadata
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // User ID of club manager who reviewed
  rejectionReason?: string;
  // Transfer history tracking
  previousClubId?: string; // If player is transferring from another club
}

// League type - grassroots league structure (Phase 1)
export interface League {
  id: string;
  name: string;
  description?: string;
  image?: string; // League image/banner URL
  // League organization
  organizerId: string; // User ID (FA official or ministry official)
  organizerType: "fa" | "ministry" | "admin";
  // League structure
  season: string; // e.g., "2024/2025"
  startDate: Date;
  endDate: Date;
  status: "draft" | "registration" | "registration_closed" | "active" | "completed" | "cancelled";
  registrationClosed: boolean; // Whether registration has been manually closed
  // Participation rules
  minClubs?: number;
  maxClubs?: number;
  requireLegitimateClubs: boolean; // Only legitimate clubs can participate
  registrationDeadline: Date;
  // Divisions/Groups
  divisions?: Division[];
  // Fixtures
  fixtures: Fixture[];
  // Standings
  standings?: StandingsEntry[];
  // Settings
  pointsSystem?: {
    win: number;
    draw: number;
    loss: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Division type for leagues (Phase 1)
export interface Division {
  id: string;
  leagueId: string;
  name: string;
  order: number; // Display order (e.g., 1 = top division)
  clubIds: string[]; // Club IDs in this division
}

// Player match statistics for a fixture
export interface PlayerMatchStats {
  userId: string; // Player user ID
  clubId: string; // Club ID (teamAId or teamBId)
  goals: number; // Goals scored in this match
  assists: number; // Assists in this match
  yellowCards: number; // Yellow cards received (usually 0 or 1)
  redCard: boolean; // Whether player received red card
}

// Fixture type for league matches (Phase 1)
export interface Fixture {
  id: string;
  leagueId: string;
  round: number; // Round number
  matchId?: string; // Link to actual Match if created
  teamAId: string; // Club ID
  teamBId: string; // Club ID
  scheduledDate: Date;
  scheduledTime?: string; // e.g., "15:00"
  pitchId?: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "postponed";
  result?: {
    scoreA: number;
    scoreB: number;
    winnerId?: string; // Club ID of winner
  };
  refereeId?: string;
  playerStats?: PlayerMatchStats[]; // Individual player statistics for this match
}

// StandingsEntry type for league standings (Phase 1)
export interface StandingsEntry {
  clubId: string;
  clubName: string;
  position: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// Ticket type - electronic ticketing (Phase 1)
export interface Ticket {
  id: string;
  ticketNumber: string; // Unique ticket number
  matchId: string;
  userId?: string; // Purchaser user ID (optional for guest purchases)
  purchaserEmail: string;
  purchaserName: string;
  purchaserPhone?: string;
  // Ticket details
  ticketType: "general" | "vip" | "premium" | "student" | "child";
  price: number; // Price in Naira
  seatNumber?: string; // If applicable
  section?: string; // Stadium section
  // Payment information
  paymentStatus: "pending" | "paid" | "refunded" | "cancelled";
  paymentRef?: string; // Payment transaction reference
  // Validation
  qrCode: string; // QR code data
  isValid: boolean;
  validatedAt?: Date; // When ticket was scanned/validated
  validatedBy?: string; // User ID of validator
  // Timestamps
  purchasedAt: Date;
  createdAt: Date;
}

// Product type - e-commerce (Phase 1)
export interface Product {
  id: string;
  name: string;
  description?: string;
  // Product details
  category: "kit" | "jersey" | "boots" | "equipment" | "merchandise" | "other";
  clubId?: string; // If this is club-specific merchandise
  // Pricing
  price: number; // Price in Naira
  discountPrice?: number; // Discounted price if on sale
  isOnSale: boolean;
  // Inventory
  inStock: boolean;
  stockQuantity?: number;
  // Media
  images: string[]; // Array of image URLs
  // Variations
  variations?: ProductVariation[]; // e.g., sizes, colors
  // Seller information
  sellerId: string; // User ID (club manager or admin)
  sellerType: "club" | "admin" | "vendor";
  // Analytics
  views?: number;
  sales?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ProductVariation type for e-commerce (Phase 1)
export interface ProductVariation {
  id: string;
  name: string; // e.g., "Size", "Color"
  options: {
    value: string; // e.g., "Large", "Red"
    priceModifier?: number; // Price adjustment for this option
    inStock: boolean;
    stockQuantity?: number;
  }[];
}

// Order type for e-commerce (Phase 1)
export interface Order {
  id: string;
  orderNumber: string; // Unique order number
  userId?: string; // Purchaser user ID
  purchaserEmail: string;
  purchaserName: string;
  purchaserPhone?: string;
  // Order items
  items: OrderItem[];
  // Pricing
  subtotal: number;
  shipping: number;
  total: number;
  // Shipping address
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  // Status
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  paymentRef?: string;
  // Timestamps
  createdAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

// OrderItem type for e-commerce (Phase 1)
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Price at time of purchase
  variations?: {
    [key: string]: string; // e.g., { "Size": "Large", "Color": "Red" }
  };
}

// ServiceProvider type - referees, coaches, professionals (Phase 1)
export interface ServiceProvider {
  id: string;
  userId: string; // Link to User
  providerType: "referee" | "coach" | "trainer" | "physiotherapist" | "equipment_supplier" | "other";
  // Professional details
  specialization?: string; // e.g., "Youth Development", "Fitness Training"
  experienceYears?: number;
  bio?: string;
  // Certifications (linked to User.certifications)
  certificationIds: string[];
  // Services offered
  services: Service[];
  // Availability
  availability?: {
    days: string[]; // Days of week available
    timeSlots?: {
      start: string;
      end: string;
    }[];
    isAvailable: boolean;
  };
  // Pricing
  hourlyRate?: number;
  fixedRate?: number;
  // Location
  serviceArea?: {
    cities: string[];
    state: string;
    radius?: number; // Service radius in km
  };
  // Ratings
  rating?: number; // Average rating (1-5)
  reviewCount?: number;
  // Listing
  isListed: boolean; // Whether provider is visible in directory
  listingExpiry?: Date; // When listing expires (if paid listing)
  monkeyCoinsListingFee?: number; // Fee paid for listing
  // Analytics
  views?: number;
  bookings?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Service type for service providers (Phase 1)
export interface Service {
  id: string;
  name: string;
  description?: string;
  duration?: number; // Duration in minutes
  price: number; // Price in Naira
  serviceType: "hourly" | "fixed" | "per_session";
}

// ServiceBooking type for service provider bookings (Phase 1)
export interface ServiceBooking {
  id: string;
  serviceProviderId: string;
  serviceId: string;
  clientId: string; // User ID of client
  status: "pending" | "confirmed" | "in-progress" | "completed" | "cancelled";
  scheduledDate: Date;
  scheduledTime: string; // e.g., "14:00"
  duration?: number; // Duration in minutes
  location?: string; // Where service will be provided
  price: number;
  paymentStatus: "pending" | "paid" | "refunded";
  paymentRef?: string;
  // Review
  rating?: number;
  review?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Stream type - live streaming (Phase 1)
export interface Stream {
  id: string;
  matchId: string;
  streamerId: string; // User ID of person streaming
  // Stream details
  title?: string;
  description?: string;
  // Stream provider information
  provider: "twilio" | "agora" | "custom"; // Streaming service used
  streamKey?: string;
  streamUrl?: string;
  rtmpUrl?: string;
  // Status
  status: "scheduled" | "live" | "ended" | "cancelled";
  startTime?: Date;
  endTime?: Date;
  // Viewership
  viewerCount?: number;
  peakViewers?: number;
  totalViews?: number;
  // Recording
  isRecording: boolean;
  recordingUrl?: string; // URL to recorded stream
  // Chat
  chatEnabled: boolean;
  // Quality
  quality?: "low" | "medium" | "high" | "ultra";
  // Monetization
  isPaid: boolean;
  price?: number; // Price to watch stream
  createdAt: Date;
}

// StreamViewer type for tracking stream viewers (Phase 1)
export interface StreamViewer {
  id: string;
  streamId: string;
  userId?: string; // Optional - guest viewers may not have account
  viewerName: string;
  joinedAt: Date;
  leftAt?: Date;
  watchDuration?: number; // Duration watched in seconds
}

// Add global Window interface
declare global {
  interface Window {
    toast?: {
      success: (message: string, duration?: number) => void;
      error: (message: string, duration?: number) => void;
      warning: (message: string, duration?: number) => void;
      info: (message: string, duration?: number) => void;
    };
  }
}
