import { create } from "zustand";
import { startOfWeek, startOfMonth, startOfYear } from "date-fns";

type ViewType = "weekly" | "monthly" | "yearly";
type ModeType = "single" | "multi";

interface ActivityCalendarState {
  viewType: ViewType;
  modeType: ModeType;
  currentDate: Date;
  selectedProjectId: string | null;
  searchQuery: string;
  statusFilter: string | null;

  // View type setters
  setViewType: (view: ViewType) => void;
  setModeType: (mode: ModeType) => void;

  // Navigation
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;

  // Filtering
  setSelectedProject: (projectId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string | null) => void;
}

export const useActivityCalendarStore = create<ActivityCalendarState>(
  (set, get) => ({
    viewType: "monthly",
    modeType: "multi",
    currentDate: new Date(),
    selectedProjectId: null,
    searchQuery: "",
    statusFilter: null,

    setViewType: (view) => set({ viewType: view }),

    setModeType: (mode) => set({ modeType: mode }),

    goToNextPeriod: () => {
      const { currentDate, viewType } = get();
      const next = new Date(currentDate);

      switch (viewType) {
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          break;
      }

      set({ currentDate: next });
    },

    goToPreviousPeriod: () => {
      const { currentDate, viewType } = get();
      const prev = new Date(currentDate);

      switch (viewType) {
        case "weekly":
          prev.setDate(prev.getDate() - 7);
          break;
        case "monthly":
          prev.setMonth(prev.getMonth() - 1);
          break;
        case "yearly":
          prev.setFullYear(prev.getFullYear() - 1);
          break;
      }

      set({ currentDate: prev });
    },

    goToToday: () => {
      set({ currentDate: new Date() });
    },

    goToDate: (date: Date) => {
      set({ currentDate: new Date(date) });
    },

    setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setStatusFilter: (status) => set({ statusFilter: status }),
  })
);
