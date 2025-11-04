// Phase 5: League Service for Firestore operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { League, Division, Fixture, StandingsEntry } from "../types";

/**
 * Helper to safely convert Firestore timestamp to Date
 */
const toDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return undefined;
};

/**
 * Helper to remove undefined values from object (Firestore doesn't accept undefined)
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date || obj instanceof Timestamp || obj instanceof Array) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof Timestamp) &&
        !(value instanceof Array)
      ) {
        const cleanedNested = removeUndefined(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

/**
 * Create a new league
 */
export const createLeague = async (
  leagueData: Omit<
    League,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "fixtures"
    | "standings"
    | "divisions"
    | "pointsSystem"
  >
): Promise<League> => {
  try {
    const newLeagueRef = doc(collection(db, "leagues"));

    const leagueToCreate = {
      ...leagueData,
      id: newLeagueRef.id,
      divisions: [],
      fixtures: [],
      standings: [],
      registrationClosed: false,
      pointsSystem: {
        win: 3,
        draw: 1,
        loss: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove undefined values before saving
    const cleanedLeagueData = removeUndefined(leagueToCreate);

    await setDoc(newLeagueRef, cleanedLeagueData);

    return {
      ...leagueToCreate,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as League;
  } catch (error) {
    console.error("Error creating league:", error);
    throw error;
  }
};

/**
 * Get league by ID
 */
export const getLeague = async (leagueId: string): Promise<League | null> => {
  try {
    const leagueDoc = await getDoc(doc(db, "leagues", leagueId));

    if (!leagueDoc.exists()) {
      return null;
    }

    const data = leagueDoc.data();

    return {
      id: leagueDoc.id,
      ...data,
      startDate: toDate(data.startDate) || new Date(),
      endDate: toDate(data.endDate) || new Date(),
      registrationDeadline: toDate(data.registrationDeadline) || new Date(),
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
      divisions: (data.divisions || []).map((div: any) => ({
        ...div,
      })),
      fixtures: (data.fixtures || []).map((fixture: any) => ({
        ...fixture,
        scheduledDate: toDate(fixture.scheduledDate),
      })),
      standings: (data.standings || []).map((standing: any) => ({
        ...standing,
      })),
    } as League;
  } catch (error) {
    console.error("Error getting league:", error);
    throw error;
  }
};

/**
 * Get all leagues (with optional filters)
 */
export const getAllLeagues = async (filters?: {
  status?: League["status"];
  organizerId?: string;
  season?: string;
}): Promise<League[]> => {
  try {
    let leaguesQuery = query(
      collection(db, "leagues"),
      orderBy("createdAt", "desc")
    );

    if (filters?.status) {
      leaguesQuery = query(leaguesQuery, where("status", "==", filters.status));
    }

    if (filters?.organizerId) {
      leaguesQuery = query(
        leaguesQuery,
        where("organizerId", "==", filters.organizerId)
      );
    }

    const querySnapshot = await getDocs(leaguesQuery);
    const leagues: League[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Client-side filters
      if (filters?.season && data.season !== filters.season) {
        return;
      }

      leagues.push({
        id: doc.id,
        ...data,
        startDate: toDate(data.startDate) || new Date(),
        endDate: toDate(data.endDate) || new Date(),
        registrationDeadline: toDate(data.registrationDeadline) || new Date(),
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
        divisions: (data.divisions || []).map((div: any) => ({
          ...div,
        })),
        fixtures: (data.fixtures || []).map((fixture: any) => ({
          ...fixture,
          scheduledDate: toDate(fixture.scheduledDate),
        })),
        standings: (data.standings || []).map((standing: any) => ({
          ...standing,
        })),
      } as League);
    });

    return leagues;
  } catch (error) {
    console.error("Error getting all leagues:", error);
    throw error;
  }
};

/**
 * Update league
 */
export const updateLeague = async (
  leagueId: string,
  updates: Partial<League>
): Promise<void> => {
  try {
    const leagueRef = doc(db, "leagues", leagueId);

    // Convert Date objects to Firestore timestamps if needed
    const updateData: any = { ...updates, updatedAt: serverTimestamp() };

    // Handle date fields
    if (updateData.startDate instanceof Date) {
      updateData.startDate = Timestamp.fromDate(updateData.startDate);
    }
    if (updateData.endDate instanceof Date) {
      updateData.endDate = Timestamp.fromDate(updateData.endDate);
    }
    if (updateData.registrationDeadline instanceof Date) {
      updateData.registrationDeadline = Timestamp.fromDate(
        updateData.registrationDeadline
      );
    }

    // Handle fixtures dates
    if (updateData.fixtures) {
      updateData.fixtures = updateData.fixtures.map((fixture: Fixture) => ({
        ...fixture,
        scheduledDate:
          fixture.scheduledDate instanceof Date
            ? Timestamp.fromDate(fixture.scheduledDate)
            : fixture.scheduledDate,
      }));
    }

    // Remove undefined values
    const cleanedUpdateData = removeUndefined(updateData);

    await updateDoc(leagueRef, cleanedUpdateData);
  } catch (error) {
    console.error("Error updating league:", error);
    throw error;
  }
};

/**
 * Register club for a league
 */
export const registerClubForLeague = async (
  leagueId: string,
  clubId: string
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    // Check league status and registration closure
    if (league.status !== "registration" || league.registrationClosed) {
      throw new Error("League is not accepting registrations");
    }

    // Check registration deadline
    if (new Date() > league.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Check if club is already registered
    const allClubIds = league.divisions?.flatMap((div) => div.clubIds) || [];
    if (allClubIds.includes(clubId)) {
      throw new Error("Club is already registered for this league");
    }

    // Add club to first division (or create division if none exists)
    const divisions = league.divisions || [];
    let updatedDivisions: Division[];

    if (divisions.length === 0) {
      // Create first division
      updatedDivisions = [
        {
          id: `div_${Date.now()}`,
          leagueId,
          name: "Division 1",
          order: 1,
          clubIds: [clubId],
        },
      ];
    } else {
      // Add to first division
      updatedDivisions = divisions.map((div, index) => {
        if (index === 0) {
          return {
            ...div,
            clubIds: [...div.clubIds, clubId],
          };
        }
        return div;
      });
    }

    await updateLeague(leagueId, {
      divisions: updatedDivisions,
    });

    // Update club's currentLeagueId
    const { updateClub } = await import("./clubService");
    await updateClub(clubId, {
      currentLeagueId: leagueId,
    });
  } catch (error) {
    console.error("Error registering club for league:", error);
    throw error;
  }
};

/**
 * Generate fixtures for a league (round-robin)
 */
export const generateFixtures = async (leagueId: string): Promise<Fixture[]> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const allClubIds =
      league.divisions?.flatMap((div) => div.clubIds) || [];

    if (allClubIds.length < 2) {
      throw new Error("League needs at least 2 clubs to generate fixtures");
    }

    const fixtures: Fixture[] = [];
    const clubs = allClubIds;

    // Generate round-robin fixtures (each team plays every other team twice: home and away)
    for (let round = 0; round < clubs.length - 1; round++) {
      for (let i = 0; i < clubs.length / 2; i++) {
        const homeTeam = clubs[i];
        const awayTeam = clubs[clubs.length - 1 - i];

        if (homeTeam && awayTeam) {
      // First leg fixture
      fixtures.push({
        id: `fixture_${leagueId}_${round}_${i}_leg1`,
        leagueId,
        round: round + 1,
        teamAId: homeTeam,
        teamBId: awayTeam,
        scheduledDate: new Date(), // Will be scheduled properly
        status: "scheduled",
      });

      // Second leg fixture (reverse)
      fixtures.push({
        id: `fixture_${leagueId}_${round}_${i}_leg2`,
        leagueId,
        round: round + 1 + (clubs.length - 1),
        teamAId: awayTeam,
        teamBId: homeTeam,
        scheduledDate: new Date(), // Will be scheduled properly
        status: "scheduled",
      });
        }
      }

      // Rotate clubs (move last club to second position)
      clubs.splice(1, 0, clubs.pop()!);
    }

    // Update league with fixtures (don't change status to active automatically)
    await updateLeague(leagueId, {
      fixtures,
      status: "registration_closed", // Registration closed, fixtures generated, but not active yet
    });

    return fixtures;
  } catch (error) {
    console.error("Error generating fixtures:", error);
    throw error;
  }
};

/**
 * Calculate and update standings for a league
 */
export const calculateStandings = async (
  leagueId: string
): Promise<StandingsEntry[]> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const allClubIds =
      league.divisions?.flatMap((div) => div.clubIds) || [];
    const standingsMap = new Map<string, StandingsEntry>();

    // Get club names for standings
    const { getClub } = await import("./clubService");
    const clubPromises = allClubIds.map((clubId) => getClub(clubId));
    const clubs = await Promise.all(clubPromises);

    // Initialize standings for all clubs
    allClubIds.forEach((clubId) => {
      const club = clubs.find((c) => c?.id === clubId);
      standingsMap.set(clubId, {
        clubId,
        clubName: club?.name || "Unknown Club",
        position: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });

    // Calculate from completed fixtures
    const completedFixtures = league.fixtures.filter(
      (f) => f.status === "completed" && f.result?.scoreA !== undefined
    );

    completedFixtures.forEach((fixture) => {
      if (
        fixture.result?.scoreA === undefined ||
        fixture.result?.scoreB === undefined
      ) {
        return;
      }

      const teamAStanding = standingsMap.get(fixture.teamAId);
      const teamBStanding = standingsMap.get(fixture.teamBId);

      if (!teamAStanding || !teamBStanding) return;

      // Update matches played
      teamAStanding.matchesPlayed++;
      teamBStanding.matchesPlayed++;

      // Update goals
      teamAStanding.goalsFor += fixture.result.scoreA;
      teamAStanding.goalsAgainst += fixture.result.scoreB;
      teamBStanding.goalsFor += fixture.result.scoreB;
      teamBStanding.goalsAgainst += fixture.result.scoreA;

      // Determine result and update points
      const pointsSystem = league.pointsSystem || { win: 3, draw: 1, loss: 0 };

      if (fixture.result.scoreA > fixture.result.scoreB) {
        teamAStanding.matchesWon++;
        teamBStanding.matchesLost++;
        teamAStanding.points += pointsSystem.win;
        teamBStanding.points += pointsSystem.loss;
      } else if (fixture.result.scoreA < fixture.result.scoreB) {
        teamAStanding.matchesLost++;
        teamBStanding.matchesWon++;
        teamAStanding.points += pointsSystem.loss;
        teamBStanding.points += pointsSystem.win;
      } else {
        teamAStanding.matchesDrawn++;
        teamBStanding.matchesDrawn++;
        teamAStanding.points += pointsSystem.draw;
        teamBStanding.points += pointsSystem.draw;
      }
    });

    // Calculate goal difference and update position
    standingsMap.forEach((standing) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });

    // Convert to array and sort by points, then goal difference
    const standings = Array.from(standingsMap.values()).sort((a, b) => {
      // Sort by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Then by goal difference (descending)
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      // Then by goals for (descending)
      return b.goalsFor - a.goalsFor;
    });

    // Assign positions
    standings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    // Update league standings
    await updateLeague(leagueId, {
      standings,
    });

    return standings;
  } catch (error) {
    console.error("Error calculating standings:", error);
    throw error;
  }
}

/**
 * Delete a league
 */
export const deleteLeague = async (leagueId: string): Promise<void> => {
  try {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueRef);

    if (!leagueDoc.exists()) {
      throw new Error("League not found");
    }

    await deleteDoc(leagueRef);
  } catch (error) {
    console.error("Error deleting league:", error);
    throw error;
  }
};

/**
 * Update fixture scores during match (live score updates)
 */
export const updateFixtureScores = async (
  leagueId: string,
  fixtureId: string,
  scores: {
    scoreA: number; // Score for teamAId
    scoreB: number; // Score for teamBId
  }
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (fixture.status !== "in-progress") {
      throw new Error("Fixture must be in-progress to update scores");
    }

    if (scores.scoreA < 0 || scores.scoreB < 0) {
      throw new Error("Scores cannot be negative");
    }

    // Update fixture with scores (but keep status as in-progress)
    const updatedFixtures = league.fixtures.map((f) => {
      if (f.id === fixtureId) {
        const winnerId =
          scores.scoreA > scores.scoreB
            ? fixture.teamAId
            : scores.scoreA < scores.scoreB
            ? fixture.teamBId
            : undefined;

        return {
          ...f,
          result: {
            scoreA: scores.scoreA,
            scoreB: scores.scoreB,
            winnerId,
          },
        };
      }
      return f;
    });

    await updateLeague(leagueId, {
      fixtures: updatedFixtures,
    });
  } catch (error) {
    console.error("Error updating fixture scores:", error);
    throw error;
  }
};

/**
 * Complete a fixture (mark as completed and finalize results)
 */
export const completeFixture = async (
  leagueId: string,
  fixtureId: string
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (fixture.status !== "in-progress") {
      throw new Error("Fixture must be in-progress to complete");
    }

    if (!fixture.result || fixture.result.scoreA === undefined || fixture.result.scoreB === undefined) {
      throw new Error("Fixture must have scores recorded before completion");
    }

    // Update fixture status to completed
    const updatedFixtures = league.fixtures.map((f) => {
      if (f.id === fixtureId) {
        return {
          ...f,
          status: "completed" as const,
        };
      }
      return f;
    });

    await updateLeague(leagueId, {
      fixtures: updatedFixtures,
    });

    // Recalculate standings
    await calculateStandings(leagueId);

    // Update player profiles with stats from this match
    if (fixture.playerStats && fixture.playerStats.length > 0) {
      try {
        await updatePlayerStatsFromFixture(fixtureId, leagueId);
      } catch (error) {
        console.error("Error updating player stats:", error);
        // Don't throw - stats update is secondary to result recording
      }
    }
  } catch (error) {
    console.error("Error completing fixture:", error);
    throw error;
  }
};

/**
 * Record match result for a fixture (legacy - kept for backwards compatibility)
 * @deprecated Use updateFixtureScores and completeFixture instead
 */
export const recordFixtureResult = async (
  leagueId: string,
  fixtureId: string,
  result: {
    scoreA: number; // Score for teamAId
    scoreB: number; // Score for teamBId
  }
): Promise<void> => {
  // First update scores
  await updateFixtureScores(leagueId, fixtureId, result);
  // Then complete the match
  await completeFixture(leagueId, fixtureId);
};

/**
 * Update fixture scheduling (date, time, pitch, referee)
 */
export const updateFixtureSchedule = async (
  leagueId: string,
  fixtureId: string,
  schedule: {
    scheduledDate?: Date;
    scheduledTime?: string;
    pitchId?: string;
    refereeId?: string;
  }
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    const updatedFixtures = league.fixtures.map((f) => {
      if (f.id === fixtureId) {
        return {
          ...f,
          scheduledDate: schedule.scheduledDate || f.scheduledDate,
          scheduledTime: schedule.scheduledTime ?? f.scheduledTime,
          pitchId: schedule.pitchId ?? f.pitchId,
          refereeId: schedule.refereeId ?? f.refereeId,
        };
      }
      return f;
    });

    await updateLeague(leagueId, {
      fixtures: updatedFixtures,
    });
  } catch (error) {
    console.error("Error updating fixture schedule:", error);
    throw error;
  }
};

/**
 * Update fixture status to in-progress
 */
export const startFixture = async (
  leagueId: string,
  fixtureId: string
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (fixture.status !== "scheduled") {
      throw new Error("Fixture must be scheduled to start");
    }

    const updatedFixtures = league.fixtures.map((f) => {
      if (f.id === fixtureId) {
        return {
          ...f,
          status: "in-progress" as const,
        };
      }
      return f;
    });

    await updateLeague(leagueId, {
      fixtures: updatedFixtures,
    });
  } catch (error) {
    console.error("Error starting fixture:", error);
    throw error;
  }
};

/**
 * Auto-update fixture status based on scheduled time
 * Checks if match time has arrived and updates status to "in-progress"
 */
export const autoUpdateFixtureStatus = async (
  leagueId: string
): Promise<{ updated: number }> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const now = new Date();
    let updatedCount = 0;

    const updatedFixtures = league.fixtures.map((fixture) => {
      // Only update scheduled fixtures
      if (fixture.status !== "scheduled") {
        return fixture;
      }

      // Check if match time has arrived
      const scheduledDate = fixture.scheduledDate instanceof Date
        ? fixture.scheduledDate
        : new Date(fixture.scheduledDate);

      // If scheduled time is provided, check both date and time
      if (fixture.scheduledTime) {
        const [hours, minutes] = fixture.scheduledTime.split(":").map(Number);
        const matchDateTime = new Date(scheduledDate);
        matchDateTime.setHours(hours, minutes || 0, 0, 0);

        // Update if match time has arrived (within last 2 hours to allow late starts)
        if (now >= matchDateTime && now <= new Date(matchDateTime.getTime() + 2 * 60 * 60 * 1000)) {
          updatedCount++;
          return {
            ...fixture,
            status: "in-progress" as const,
          };
        }
      } else {
        // If no time specified, check if scheduled date is today
        const scheduledDateOnly = new Date(scheduledDate);
        scheduledDateOnly.setHours(0, 0, 0, 0);
        const todayOnly = new Date(now);
        todayOnly.setHours(0, 0, 0, 0);

        if (scheduledDateOnly.getTime() === todayOnly.getTime() && now >= scheduledDateOnly) {
          updatedCount++;
          return {
            ...fixture,
            status: "in-progress" as const,
          };
        }
      }

      return fixture;
    });

    if (updatedCount > 0) {
      await updateLeague(leagueId, {
        fixtures: updatedFixtures,
      });
    }

    return { updated: updatedCount };
  } catch (error) {
    console.error("Error auto-updating fixture status:", error);
    throw error;
  }
};

/**
 * Record player statistics for a fixture
 */
export const recordFixturePlayerStats = async (
  leagueId: string,
  fixtureId: string,
  playerStats: Array<{
    userId: string;
    clubId: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCard: boolean;
  }>
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (fixture.status === "completed") {
      throw new Error("Cannot record stats for completed fixture. Stats should be recorded before completion.");
    }

    // Validate that all players belong to the fixture's teams
    const validClubIds = [fixture.teamAId, fixture.teamBId];
    for (const stat of playerStats) {
      if (!validClubIds.includes(stat.clubId)) {
        throw new Error(`Player ${stat.userId} does not belong to a team in this fixture`);
      }
    }

    const updatedFixtures = league.fixtures.map((f) => {
      if (f.id === fixtureId) {
        return {
          ...f,
          playerStats: playerStats.map((s) => ({
            userId: s.userId,
            clubId: s.clubId,
            goals: s.goals,
            assists: s.assists,
            yellowCards: s.yellowCards,
            redCard: s.redCard,
          })),
        };
      }
      return f;
    });

    await updateLeague(leagueId, {
      fixtures: updatedFixtures,
    });
  } catch (error) {
    console.error("Error recording player stats:", error);
    throw error;
  }
};

/**
 * Update player profiles with match statistics
 * This should be called after a fixture is completed
 */
export const updatePlayerStatsFromFixture = async (
  fixtureId: string,
  leagueId: string
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const fixture = league.fixtures.find((f) => f.id === fixtureId);
    if (!fixture) {
      throw new Error("Fixture not found");
    }

    if (fixture.status !== "completed") {
      throw new Error("Fixture must be completed to update player stats");
    }

    if (!fixture.playerStats || fixture.playerStats.length === 0) {
      return; // No stats to update
    }

    // Import here to avoid circular dependency
    const { getPlayerProfile, savePlayerProfile } = await import("./playerProfileService");

    // Determine match result for each team
    const isWinForTeamA = fixture.result && fixture.result.scoreA > fixture.result.scoreB;
    const isWinForTeamB = fixture.result && fixture.result.scoreB > fixture.result.scoreA;
    const isDraw = fixture.result && fixture.result.scoreA === fixture.result.scoreB;

    // Update stats for each player
    for (const playerStat of fixture.playerStats) {
      try {
        let profile = await getPlayerProfile(playerStat.userId);

        if (!profile) {
          // Create profile if it doesn't exist
          profile = await savePlayerProfile(playerStat.userId, {
            stats: {
              goals: 0,
              assists: 0,
              matchesPlayed: 0,
              matchesWon: 0,
              matchesLost: 0,
              matchesDrawn: 0,
              yellowCards: 0,
              redCards: 0,
            },
            isPublic: false,
          });
        }

        const currentStats = profile.stats || {
          goals: 0,
          assists: 0,
          matchesPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          matchesDrawn: 0,
          yellowCards: 0,
          redCards: 0,
        };

        // Update stats
        const updatedStats = {
          goals: currentStats.goals + playerStat.goals,
          assists: currentStats.assists + playerStat.assists,
          matchesPlayed: currentStats.matchesPlayed + 1,
          matchesWon:
            currentStats.matchesWon +
            (playerStat.clubId === fixture.teamAId
              ? (isWinForTeamA ? 1 : 0)
              : isWinForTeamB
              ? 1
              : 0),
          matchesLost:
            currentStats.matchesLost +
            (playerStat.clubId === fixture.teamAId
              ? isWinForTeamB
                ? 1
                : 0
              : isWinForTeamA
              ? 1
              : 0),
          matchesDrawn: currentStats.matchesDrawn + (isDraw ? 1 : 0),
          yellowCards: currentStats.yellowCards + playerStat.yellowCards,
          redCards: currentStats.redCards + (playerStat.redCard ? 1 : 0),
        };

        await savePlayerProfile(playerStat.userId, {
          stats: updatedStats,
        });
      } catch (error) {
        console.error(`Error updating stats for player ${playerStat.userId}:`, error);
        // Continue with other players even if one fails
      }
    }
  } catch (error) {
    console.error("Error updating player stats from fixture:", error);
    throw error;
  }
};

/**
 * Disqualify a club from a league
 */
export const disqualifyClubFromLeague = async (
  leagueId: string,
  clubId: string,
): Promise<void> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    // Remove club from divisions
    const updatedDivisions = league.divisions?.map((div) => ({
      ...div,
      clubIds: div.clubIds.filter((id) => id !== clubId),
    })) || [];

    // Cancel or remove fixtures involving this club
    const updatedFixtures = league.fixtures.map((fixture) => {
      if (fixture.teamAId === clubId || fixture.teamBId === clubId) {
        return {
          ...fixture,
          status: "cancelled" as const,
        };
      }
      return fixture;
    });

    // Remove club from standings
    const updatedStandings = league.standings?.filter(
      (standing) => standing.clubId !== clubId
    ) || [];

    await updateLeague(leagueId, {
      divisions: updatedDivisions,
      fixtures: updatedFixtures,
      standings: updatedStandings,
    });

    // Update club's currentLeagueId
    const { updateClub } = await import("./clubService");
    await updateClub(clubId, {
      currentLeagueId: undefined,
    });
  } catch (error) {
    console.error("Error disqualifying club from league:", error);
    throw error;
  }
};

/**
 * Check player eligibility for league matches
 */
export const checkPlayerEligibility = async (
  leagueId: string,
  playerId: string
): Promise<{
  eligible: boolean;
  reasons: string[];
}> => {
  try {
    const league = await getLeague(leagueId);
    if (!league) {
      return { eligible: false, reasons: ["League not found"] };
    }

    const reasons: string[] = [];

    // Get player profile
    const { getPlayerProfile } = await import("./playerProfileService");
    const playerProfile = await getPlayerProfile(playerId);

    if (!playerProfile) {
      return { eligible: false, reasons: ["Player profile not found"] };
    }

    // Check if player has age restrictions (if league has age requirements)
    // This is a placeholder - you can add age checking if leagues have age requirements

    // Check if player is suspended or banned
    // This is a placeholder - you can add suspension checking if implemented

    // Check if player is registered with a club in the league
    const { getClub } = await import("./clubService");
    const allClubIds = league.divisions?.flatMap((div) => div.clubIds) || [];
    
    let isInLeagueClub = false;
    for (const clubId of allClubIds) {
      const club = await getClub(clubId);
      if (club?.playerIds?.includes(playerId)) {
        isInLeagueClub = true;
        break;
      }
    }

    if (!isInLeagueClub) {
      reasons.push("Player is not registered with any club in this league");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  } catch (error) {
    console.error("Error checking player eligibility:", error);
    return { eligible: false, reasons: ["Error checking eligibility"] };
  }
};

