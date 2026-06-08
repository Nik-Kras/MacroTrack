import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type Tab = "nutrition" | "dishes" | "profile";

const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "nutrition", label: "Nutrition", icon: "restaurant-outline" },
  { key: "dishes", label: "Dishes", icon: "images-outline" },
  { key: "profile", label: "Profile", icon: "body-outline" }
];

export const TabBar = ({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) => (
  <View style={styles.wrap}>
    {tabs.map((tab) => {
      const selected = active === tab.key;
      return (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={[styles.item, selected && styles.selected]}>
          <Ionicons name={tab.icon} size={22} color={selected ? "#111827" : "#6B7280"} />
          <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E7E1D6",
    backgroundColor: "#FFFCF7",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12
  },
  item: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 7, borderRadius: 8 },
  selected: { backgroundColor: "#EDE7DA" },
  label: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  selectedLabel: { color: "#111827" }
});
