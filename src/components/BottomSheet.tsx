import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";

import { colors } from "@/theme";

/**
 * Track the on-screen keyboard height. Inside a React Native <Modal> the Android
 * window-resize (`adjustResize`) does not apply, so we reserve the keyboard's
 * space manually — the reliable, dependency-free approach for modal sheets.
 */
function useKeyboardHeight() {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setKb(e?.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return kb;
}

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
  fill = false,
  zHint,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeightPct?: number;
  handle?: boolean;
  padded?: boolean;
  /** Make the sheet a fixed-height flex column (for search lists that fill the space). */
  fill?: boolean;
  zHint?: number;
}) {
  const { height } = useWindowDimensions();
  const kb = useKeyboardHeight();
  const translate = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  // Cap the sheet to the space ABOVE the keyboard and lift it by the keyboard height.
  const sheetMax = maxHeightPct * (height - kb);

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
            // `fill` sheets take a fixed height so an inner flex:1 list fills the
            // space deterministically; others size to content up to the cap.
            ...(fill ? { height: sheetMax } : { maxHeight: sheetMax }),
            marginBottom: kb,
            overflow: "hidden",
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
            <View style={[fill ? { flex: 1 } : null, padded ? PAD : null]}>
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
