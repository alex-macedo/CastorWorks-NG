export type Priority = "high" | "medium" | "low";

export type ProjectStatus = "not-started" | "in-progress" | "completed";

export interface Project {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  priority: Priority;
  status: ProjectStatus;
  assignedUsers: string[];
  color: string;
  // Phase-specific properties
  projectName?: string;
  phaseName?: string;
  progress?: number;
  projectId?: string;
}

export interface ProjectWithClipping extends Project {
  // Visual indicators for clipped portions
  clippedBefore: boolean; // Project started before current week
  clippedAfter: boolean;  // Project ends after current week
  actualStartDate?: Date; // Original start date when clipped before
  actualEndDate?: Date;   // Original end date when clipped after
}

export const PROJECT_COLORS = [
  "blue",
  "orange",
  "yellow",
  "purple",
  "red",
  "green",
  "teal",
  "indigo",
  "cyan",
] as const;

export type ProjectColor = typeof PROJECT_COLORS[number];
