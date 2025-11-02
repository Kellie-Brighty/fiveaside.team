// Phase 2: Permission system for role-based access control
import type { UserRole } from "../types";

// Permission types
export type Permission =
  | "view_pitches"
  | "manage_pitches"
  | "create_teams"
  | "manage_teams"
  | "start_matches"
  | "place_bets"
  | "view_admin_dashboard"
  | "manage_users"
  | "manage_fund_requests"
  | "manage_boosted_pitches"
  | "create_clubs"
  | "manage_clubs"
  | "register_clubs"
  | "manage_leagues"
  | "view_talent_pool"
  | "scout_players"
  | "create_service_listing"
  | "book_services"
  | "manage_service_bookings"
  | "create_streams"
  | "purchase_tickets"
  | "manage_tickets"
  | "list_products"
  | "purchase_products"
  | "manage_orders"
  | "verify_official_roles"
  | "view_revenue_reports"
  | "manage_stadium";

// Permission matrix: Map each role to their permissions
const rolePermissions: Record<UserRole, Permission[]> = {
  player: [
    "view_pitches",
    "create_teams",
    "manage_teams",
    "place_bets",
    "scout_players",
    "book_services",
    "purchase_tickets",
    "purchase_products",
  ],
  referee: [
    "view_pitches",
    "start_matches",
    "place_bets",
    "scout_players",
    "book_services",
    "purchase_tickets",
    "purchase_products",
  ],
  admin: [
    "view_pitches",
    "manage_pitches",
    "create_teams",
    "manage_teams",
    "start_matches",
    "place_bets",
    "view_admin_dashboard",
    "manage_users",
    "manage_fund_requests",
    "manage_boosted_pitches",
    "create_clubs",
    "manage_clubs",
    "manage_leagues",
    "view_talent_pool",
    "scout_players",
    "create_service_listing",
    "book_services",
    "manage_service_bookings",
    "create_streams",
    "purchase_tickets",
    "manage_tickets",
    "list_products",
    "purchase_products",
    "manage_orders",
    "view_revenue_reports",
    "manage_stadium",
  ],
  pitch_owner: [
    "view_pitches",
    "manage_pitches",
    "create_teams",
    "manage_teams",
    "start_matches",
    "place_bets",
    "create_service_listing",
    "book_services",
    "purchase_tickets",
    "purchase_products",
  ],
  spectator: [
    "view_pitches",
    "place_bets",
    "purchase_tickets",
    "purchase_products",
  ],
  club_manager: [
    "view_pitches",
    "create_teams",
    "manage_teams",
    "create_clubs",
    "manage_clubs",
    "register_clubs",
    "view_talent_pool",
    "scout_players",
    "place_bets",
    "purchase_tickets",
    "list_products",
    "purchase_products",
    "manage_orders",
  ],
  scout: [
    "view_pitches",
    "view_talent_pool",
    "scout_players",
    "place_bets",
    "purchase_tickets",
    "purchase_products",
  ],
  service_provider: [
    "view_pitches",
    "create_service_listing",
    "manage_service_bookings",
    "place_bets",
    "purchase_tickets",
    "purchase_products",
  ],
  ministry_official: [
    "view_pitches",
    "view_talent_pool",
    "view_revenue_reports",
    "manage_leagues",
    "verify_official_roles",
    "manage_stadium",
    "purchase_tickets",
    "purchase_products",
  ],
  fa_official: [
    "view_pitches",
    "view_talent_pool",
    "manage_leagues",
    "register_clubs",
    "verify_official_roles",
    "view_revenue_reports",
    "purchase_tickets",
    "purchase_products",
  ],
  facility_manager: [
    "view_pitches",
    "manage_pitches",
    "manage_stadium",
    "manage_tickets",
    "purchase_products",
  ],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Check if a role requires verification (ministry/FA officials)
 */
export function requiresVerification(role: UserRole): boolean {
  return role === "ministry_official" || role === "fa_official";
}

/**
 * Get readable role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    player: "Player",
    referee: "Referee",
    admin: "Administrator",
    pitch_owner: "Pitch Owner",
    spectator: "Spectator",
    club_manager: "Club Manager",
    scout: "Scout",
    service_provider: "Service Provider",
    ministry_official: "Ministry Official",
    fa_official: "FA Official",
    facility_manager: "Facility Manager",
  };
  return roleNames[role] ?? role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    player: "Play football and manage your teams",
    referee: "Officiate matches and manage match sessions",
    admin: "Full system access and administration",
    pitch_owner: "Manage your football pitches",
    spectator: "Watch matches and place bets",
    club_manager: "Manage official football clubs and rosters",
    scout: "Discover and track talented players",
    service_provider: "Offer services like coaching or refereeing",
    ministry_official: "Sports Ministry official access",
    fa_official: "Football Association official access",
    facility_manager: "Manage stadium facilities and operations",
  };
  return descriptions[role] ?? "";
}

