import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  isOpen: true,
  isCollapsed: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen, isCollapsed: !s.isCollapsed })),
  collapse: () => set({ isOpen: false, isCollapsed: true }),
  expand: () => set({ isOpen: true, isCollapsed: false }),
}));
