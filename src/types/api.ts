export interface User { id: string; name: string; email: string }
export interface Team { code: string; name: string }

export interface AuthResponse {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: User;
  team: Team;
}

// Revisa en Swagger qué devuelve GET /auth/me y ajusta si es distinto
export interface MeResponse { user: User; team: Team; expiresAt: string }

export type LogPoseStatus = "LOCKED" | "UNLOCKED";

export interface LogPose {
  status: LogPoseStatus;
  grandLineUnlocked: boolean;
  unlockedAt: string | null;
  message: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  traceId: string;
  details?: { field: string; message: string }[];
}

// ---------- Wanted ----------
export type WantedStatus = "AT_LARGE" | "CAPTURED" | "MISSING";
export type FruitType = "PARAMECIA" | "ZOAN" | "LOGIA" | "NONE";

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: { id: string; name: string } | null;
  role: string;
  devilFruit: { name: string; type: FruitType } | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

// ---------- Dashboard ----------
export interface DashboardSummary {
  team: Team;
  wanted: {
    total: number;
    totalBounty: number;
    averageBounty: number;
    byStatus: Record<WantedStatus, number>;
    byFruit: Record<FruitType, number>;
  };
  crews: {
    total: number;
    mostWanted: {
      id: string;
      name: string;
      shipName: string;
      jollyRogerColor: string;
      memberCount: number;
      totalBounty: number;
    } | null;
  };
  topBounties: WantedSummary[];
  generatedAt: string;
}
