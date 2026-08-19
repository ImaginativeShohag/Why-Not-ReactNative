import { Href } from "expo-router";

export type Project = {
  emoji: string;
  title: string;
  subtitle: string;
  available: boolean;
  route: Href;
};

export const PROJECTS: Project[] = [
  {
    emoji: "🛍",
    title: "Store",
    subtitle: "Commerce app · Project 03",
    available: true,
    route: "/projects/store/splash",
  },
  {
    emoji: "📓",
    title: "Offline Journal",
    subtitle: "SQLite · Project 01",
    available: false,
    route: "/projects/offline-journal",
  },
  {
    emoji: "📷",
    title: "Camera & Social",
    subtitle: "Media pipeline · Project 02",
    available: false,
    route: "/projects/camera-social",
  },
  {
    emoji: "🏃",
    title: "Fitness Tracker",
    subtitle: "Background loc · Project 04",
    available: false,
    route: "/projects/fitness-tracker",
  },
  {
    emoji: "🎧",
    title: "Podcast Player",
    subtitle: "Audio + EAS · Project 05",
    available: false,
    route: "/projects/podcast-player",
  },
  {
    emoji: "🎮",
    title: "Tic-Tac-Toe",
    subtitle: "Zustand · Project 06",
    available: true,
    route: "/projects/tic-tac-toe",
  },
];
