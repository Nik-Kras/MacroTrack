import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "@/theme";

type IP = { size?: number; color?: string; fill?: string };

export const LeafIcon = ({ size = 23, color = colors.muted, fill = "none" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3c0 4-5 5-5 9a5 5 0 0 0 10 0c0-1.6-.8-2.8-1.6-3.8-.3 1.2-1 1.8-1.7 1.8 1-3-1.7-5-1.7-7Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
      fill={fill}
    />
  </Svg>
);

export const DishIcon = ({ size = 23, color = colors.muted, fill = "none" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 11h16a8 8 0 0 1-16 0Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={fill} />
    <Path d="M4 11c0-3.3 3.6-6 8-6s8 2.7 8 6M12 18v2M9 22h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const ProfileIcon = ({ size = 23, color = colors.muted, fill = "none" }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.8} fill={fill} />
    <Path d="M5.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = colors.bg, width = 2.6 }: IP & { width?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={width} strokeLinecap="round" />
  </Svg>
);

export const CalendarIcon = ({ size = 13, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={5} width={18} height={16} rx={3} stroke={color} strokeWidth={2} />
    <Path d="M3 9h18M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SearchIcon = ({ size = 17, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="m20 20-3.5-3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const EditIcon = ({ size = 14, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M13.5 7.5l3 3" stroke={color} strokeWidth={1.8} />
  </Svg>
);

export const TrashIcon = ({ size = 18, color = colors.danger }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const StatsIcon = ({ size = 17, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19V5M4 19h16M8 16v-4M13 16V8M18 16v-7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CameraIcon = ({ size = 20, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Circle cx={12} cy={12.5} r={3.4} stroke={color} strokeWidth={1.8} />
  </Svg>
);

export const GalleryIcon = ({ size = 20, color = colors.muted }: IP) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={14} rx={2.5} stroke={color} strokeWidth={1.8} />
    <Circle cx={9} cy={10} r={1.6} stroke={color} strokeWidth={1.6} />
    <Path d="m5 17 4.5-4.5 3 3 2.5-2.5L19 17" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
);
