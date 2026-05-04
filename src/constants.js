import { Sun, Focus, Lightbulb, Utensils, Maximize, Image as ImageIcon, Grid, Droplets } from 'lucide-react';

export const APP_LANGUAGES = ["EN", "MS", "ZH"];

// FIX: Added textEN and textMS to support full localization toggling
export const PRO_TIPS = [
    { id: 1, icon: Sun, textEN: "Find the Light: Shoot near a window!", textMS: "Cari Cahaya: Rakam berhampiran tingkap!" },
    { id: 2, icon: Focus, textEN: "Focus: Tap your screen to lock focus.", textMS: "Fokus: Sentuh skrin untuk kunci fokus." },
    { id: 3, icon: Lightbulb, textEN: "Avoid Shadows: Don't block the light.", textMS: "Elak Bayang: Jangan halang cahaya." },
    { id: 4, icon: Utensils, textEN: "Plate nicely: Wipe the edges clean.", textMS: "Hias pinggan: Lap tepi pinggan supaya bersih." }
];

// FIX: Removed unused POSTER_TIPS to eliminate dead code