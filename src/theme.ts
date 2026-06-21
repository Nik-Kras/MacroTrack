// Design tokens ported verbatim from the MacroTrack prototype (MacroTrack.dc.html).

export const colors = {
  bg: "#0E1116",
  text: "#F2F4F7",
  muted: "#8A93A2",
  subtle: "#C4CCD6",
  dim: "#566070",
  dimmer: "#5A626E",

  // surfaces
  card: "#15191F",
  card2: "#171B22",
  sheet: "#13171D",
  inset: "#10141A",
  chip: "#1B212A",

  // borders
  border: "#20262F",
  border2: "#262C36",
  border3: "#22282F",
  border4: "#1C222A",
  border5: "#2A313B",

  track: "#252B34",
  grid: "#2A313B",

  // brand / accent (overridable per build)
  accent: "#39E08A",

  // macros
  protein: "#5B8DEF",
  carbs: "#F5B544",
  fat: "#F2698F",

  // categories
  lowCal: "#39E08A",
  highCal: "#C98BFF",

  // semantic
  over: "#F2698F",
  danger: "#F2698F",
} as const;

// Font families registered by expo-google-fonts (see App.tsx useFonts).
export const font = {
  // Manrope — body / UI
  r: "Manrope_400Regular",
  m: "Manrope_500Medium",
  sb: "Manrope_600SemiBold",
  b: "Manrope_700Bold",
  xb: "Manrope_800ExtraBold",
  // Space Grotesk — display / numerals
  dM: "SpaceGrotesk_500Medium",
  dSb: "SpaceGrotesk_600SemiBold",
  dB: "SpaceGrotesk_700Bold",
} as const;

export type MacroColor = typeof colors.protein;
