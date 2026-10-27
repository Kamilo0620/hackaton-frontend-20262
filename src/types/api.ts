export interface User { id: string; name: string; email: string }
export interface Team { code: string; name: string }

export interface AuthResponse {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: User;
  team: Team;
}

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

// ---------- Crews ----------
export interface Crew {
  id: string;
  name: string;
  shipName: string;
  jollyRogerColor: string;
  memberCount: number;
  totalBounty: number;
}

// ---------- Wanted ----------
export type WantedStatus = "AT_LARGE" | "CAPTURED" | "MISSING";
export type FruitType = "PARAMECIA" | "ZOAN" | "LOGIA" | "NONE";
export type WantedSort = "bounty,desc" | "name,asc" | "updatedAt,desc";
export type WantedSize = 10 | 20 | 50;

export type CrewRole =
  | "CAPTAIN"
  | "FIRST_MATE"
  | "NAVIGATOR"
  | "SNIPER"
  | "COOK"
  | "DOCTOR"
  | "SHIPWRIGHT"
  | "MUSICIAN"
  | "ARCHAEOLOGIST"
  | "HELMSMAN"
  | "FIGHTER";

export interface WantedSummary {
  id: string;
  name: string;
  epithet: string;
  bounty: number;
  status: WantedStatus;
  crew: { id: string; name: string } | null;
  role: CrewRole | string;
  devilFruit: { name: string; type: Exclude<FruitType, "NONE"> } | null;
  threatLevel: number;
  lastSeenIsland: string;
  updatedAt: string;
}

export interface WantedDetail extends WantedSummary {
  age: number;
  heightCm: number;
  bio: string;
  lastSeen: {
    island: string;
    seenAt: string;
  };
  bountyHistory: {
    amount: number;
    issuedAt: string;
  }[];
}

export interface WantedPage {
  content: WantedSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface WantedQueryParams {
  page?: number;
  size?: WantedSize;
  status?: WantedStatus;
  crewId?: string;
  fruit?: FruitType;
  q?: string;
  sort?: WantedSort;
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
    mostWanted: Crew | null;
  };
  topBounties: WantedSummary[];
  generatedAt: string;
}

// ---------- News ----------
export type NewsStatus = "RUMOR" | "CONFIRMED" | "DEBUNKED";

export interface NewsItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: NewsStatus;
  summary?: string;
  body?: string;
  publishedAt?: string;
}

export interface NewsFeed {
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NewsFilters {
  type: string;
  priority: string;
  status: NewsStatus | "";
}

// ---------- Sagas (CP5 · Poneglyph) ----------
export interface Palette {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
}

export interface SagaSummary {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  synopsis: string;
  stageCount: number;
  totalDistanceNm: number;
  firstIsland: string;
  lastIsland: string;
  palette: Palette;
}

export type StageMetricKey =
  | "distanceNm"
  | "crewMorale"
  | "bountyPool"
  | "marineThreat";

export interface StageMetric {
  key: StageMetricKey;
  label: string;
  value: number;
  unit: string;
}

export interface SagaIsland {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface SagaStage {
  id: string;
  order: number;
  slug: string;
  title: string;
  narrative: string[];
  island: SagaIsland;
  palette: Palette;
  metrics: StageMetric[];
}

export interface SagaStory {
  saga: SagaSummary & {
    intro: string;
  };
  map: {
    width: number;
    height: number;
  };
  stages: SagaStage[];
}
