import { Gender } from "@/context/onboarding-context";

export interface Option {
  label: string;
  emoji: string;
  value: string;
}

export const INTEREST_OPTIONS: Option[] = [
  { label: "Music", emoji: "\uD83C\uDFB5", value: "music" },
  { label: "Gaming", emoji: "\uD83C\uDFAE", value: "gaming" },
  { label: "Anime", emoji: "\uD83C\uDF65", value: "anime" },
  { label: "Movies", emoji: "\uD83C\uDFAC", value: "movies" },
  { label: "Sports", emoji: "\uD83C\uDFC8", value: "sports" },
  { label: "Travel", emoji: "\u2708\uFE0F", value: "travel" },
  { label: "Food", emoji: "\uD83C\uDF55", value: "food" },
  { label: "Fitness", emoji: "\uD83C\uDFCB\uFE0F", value: "fitness" },
  { label: "Art", emoji: "\uD83C\uDFA8", value: "art" },
  { label: "Photography", emoji: "\uD83D\uDCF7", value: "photography" },
  { label: "Tech", emoji: "\uD83D\uDCBB", value: "tech" },
  { label: "Books", emoji: "\uD83D\uDCDA", value: "books" },
  { label: "Memes", emoji: "\uD83D\uDE02", value: "memes" },
  { label: "Nightlife", emoji: "\uD83C\uDF78", value: "nightlife" },
  { label: "Outdoors", emoji: "\uD83C\uDF32", value: "outdoors" },
  { label: "Fashion", emoji: "\uD83D\uDC57", value: "fashion" },
];

export const GENDER_OPTIONS: Array<{ label: string; value: Gender; emoji?: string }> = [
  { label: "I'm male.", value: "male", emoji: "\u2642\uFE0F" },
  { label: "I'm female.", value: "female", emoji: "\u2640\uFE0F" },
  { label: "I'm non-binary.", value: "other" },
];

export const STREAK_EMOJI_TIERS: Array<{ min: number; emoji: string }> = [
  { min: 0, emoji: "\uD83D\uDE36" },
  { min: 1, emoji: "\uD83D\uDE42" },
  { min: 20, emoji: "\uD83D\uDE0D" },
  { min: 50, emoji: "\uD83E\uDD70"},
  { min: 100, emoji: "\uD83D\uDD25" },
  { min: 150, emoji: "\uD83D\uDE18" },
  { min: 200, emoji: "\u2764\uFE0F" },
  { min: 300, emoji: "\u2764\uFE0F\u200D\uD83D\uDD25" },
  { min: 400, emoji: "\uD83D\uDC95"},
  { min: 500, emoji: "\uD83E\uDD81" },
  { min: 750, emoji: "\uD83E\uDD47" },
  { min: 1000, emoji: "\uD83D\uDC8E" },
];

export const getStreakEmoji = (count: number) => {
  const value = Number.isFinite(count) ? count : 0;
  for (let index = STREAK_EMOJI_TIERS.length - 1; index >= 0; index -= 1) {
    const tier = STREAK_EMOJI_TIERS[index];
    if (value >= tier.min) {
      return tier.emoji;
    }
  }
  return STREAK_EMOJI_TIERS[0]?.emoji ?? "\uD83D\uDCA4";
};

