import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";

import { colors } from "@/theme";

/**
 * Bottom sheet matching the prototype overlays: dimmed backdrop + sheet that
 * slides up from the bottom, rounded top corners, optional grab handle.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  scroll = true,
  maxHeightPct = 0.92,
  handle = true,
  padded = true,
  zHint,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeightPct?: number;
  handle?: boolean;
  padded?: boolean;
  zHint?: number;
}) {
  const { height } = useWindowDimensions();
  const translate = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translate.setValue(height);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(translate, {
          toValue: 0,
          duration: 260,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, height, translate, fade]);

  const Handle = () => (
    <View
      style={{
        width: 38,
        height: 4,
        borderRadius: 99,
        backgroundColor: "#333b46",
        alignSelf: "center",
        marginBottom: 16,
      }}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[StyleSheetAbsolute, { backgroundColor: "rgba(6,8,11,.6)", opacity: fade }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={{
            maxHeight: `${maxHeightPct * 100}%`,
            backgroundColor: colors.sheet,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 1,
            borderColor: colors.border2,
            transform: [{ translateY: translate }],
          }}
        >
          {scroll ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={padded ? PAD : undefined}
            >
              {handle && <Handle />}
              {children}
            </ScrollView>
          ) : (
            <View style={padded ? PAD : undefined}>
              {handle && <Handle />}
              {children}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const PAD: ViewStyle = { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 };

const StyleSheetAbsolute: StyleProp<ViewStyle> = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
