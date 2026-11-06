import { Href } from "expo-router";

export type Project = {
  slug: string;
  emoji: string;
  title: string;
  subtitle: string;
  route: Href;
  /** A single route (projects/<slug>/index) instead of a project stack. */
  singleScreen?: boolean;
};

// Keep in project-number order: the launcher renders this array as-is.
export const PROJECTS: Project[] = [
  {
    slug: "offline-journal",
    emoji: "📓",
    title: "Offline Journal",
    subtitle: "SQLite · Project 01",
    route: "/projects/offline-journal",
  },
  {
    slug: "camera-social",
    emoji: "📷",
    title: "Camera & Social",
    subtitle: "Media pipeline · Project 02",
    route: "/projects/camera-social",
  },
  {
    slug: "store",
    emoji: "🛍",
    title: "Store",
    subtitle: "Commerce app · Project 03",
    route: "/projects/store",
  },
  {
    slug: "fitness-tracker",
    emoji: "🏃",
    title: "Fitness Tracker",
    subtitle: "Background loc · Project 04",
    route: "/projects/fitness-tracker",
  },
  {
    slug: "podcast-player",
    emoji: "🎧",
    title: "Podcast Player",
    subtitle: "Audio + EAS · Project 05",
    route: "/projects/podcast-player",
  },
  {
    slug: "tic-tac-toe",
    emoji: "🎮",
    title: "Tic-Tac-Toe",
    subtitle: "Zustand + Reanimated · Project 06",
    route: "/projects/tic-tac-toe",
    singleScreen: true,
  },
];
