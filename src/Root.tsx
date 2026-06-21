import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DishIcon, LeafIcon, PlusIcon, ProfileIcon } from "@/components/icons";
import { Txt } from "@/components/ui";
import { AddFoodSheet } from "@/overlays/AddFoodSheet";
import { CalendarSheet } from "@/overlays/CalendarSheet";
import { DishBuilderSheet } from "@/overlays/DishBuilderSheet";
import { DishSheet } from "@/overlays/DishSheet";
import { FoodEditorSheet } from "@/overlays/FoodEditorSheet";
import { GramsSheet } from "@/overlays/GramsSheet";
import { MeasureSheet } from "@/overlays/MeasureSheet";
import { OnboardingSheet } from "@/overlays/OnboardingSheet";
import { DishesScreen } from "@/screens/DishesScreen";
import { NutritionScreen } from "@/screens/NutritionScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { StatsScreen } from "@/screens/StatsScreen";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

function TabBar() {
  const { state, patch } = useStore();
  const insets = useSafeAreaInsets();
  const acc = colors.accent;
  const dim = colors.dimmer;

  const tabs = [
    { key: "nutrition", label: "Nutrition", Icon: LeafIcon },
    { key: "dishes", label: "Dishes", Icon: DishIcon },
    { key: "profile", label: "Profile", Icon: ProfileIcon },
  ] as const;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderColor: colors.border4,
        paddingTop: 8,
        paddingHorizontal: 10,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const on = state.screen === key || (key === "nutrition" && state.screen === "stats");
        const color = on ? acc : dim;
        return (
          <Pressable key={key} onPress={() => patch({ screen: key })} style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}>
            <Icon size={23} color={color} fill={on ? acc + "22" : "none"} />
            <Txt style={{ fontSize: 10.5, fontFamily: font.b, color }}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fab() {
  const { open } = useStore();
  const acc = colors.accent;
  return (
    <Pressable
      onPress={() => open("addFood", { addCat: "all", addSearch: "", searchMode: "log" })}
      style={{
        position: "absolute",
        bottom: 24,
        right: 18,
        width: 58,
        height: 58,
        borderRadius: 99,
        backgroundColor: acc,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: acc,
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <PlusIcon size={24} color={colors.bg} width={2.6} />
    </Pressable>
  );
}

function Overlays() {
  const { state } = useStore();
  switch (state.ov) {
    case "calendar": return <CalendarSheet />;
    case "addFood": return <AddFoodSheet />;
    case "grams": return <GramsSheet />;
    case "dish": return <DishSheet />;
    case "onb": return <OnboardingSheet />;
    case "measure": return <MeasureSheet />;
    case "foodEdit": return <FoodEditorSheet />;
    case "dishEdit": return <DishBuilderSheet />;
    default: return null;
  }
}

export function Root() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();

  let Screen = NutritionScreen;
  if (state.screen === "dishes") Screen = DishesScreen;
  else if (state.screen === "profile") Screen = ProfileScreen;
  else if (state.screen === "stats") Screen = StatsScreen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Screen />
        {state.screen === "nutrition" && <Fab />}
      </View>
      <TabBar />
      <Overlays />
    </View>
  );
}
