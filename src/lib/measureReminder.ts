import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { METRICS, latestMetric, metricMeta } from "@/lib/body";
import type { Measurement, MetricKey } from "@/types";

/** A metric is overdue when its latest entry is this many days old (or missing). */
export const STALE_DAYS = 6;

const REMINDER_ID = "measure-reminder";
const REMINDER_HOUR = 9;

// Show reminders as banners even if the app happens to be in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function daysSince(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** Metrics never logged or last logged ≥ STALE_DAYS days ago, in display order. */
export function staleMetrics(measurements: Measurement[]): MetricKey[] {
  return METRICS.filter((m) => {
    const last = latestMetric(measurements, m.key);
    return !last || daysSince(last.date) >= STALE_DAYS;
  }).map((m) => m.key);
}

/**
 * Keep the daily 9:00 reminder in sync with measurement staleness: scheduled
 * while anything is overdue, cancelled once every metric is fresh again.
 * Never throws — notification failures must not break the app.
 */
export async function syncMeasureReminder(measurements: Measurement[]): Promise<void> {
  try {
    const stale = staleMetrics(measurements);
    if (stale.length === 0) {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
      return;
    }

    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Measurement reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const labels = stale.map((k) => metricMeta(k).label).join(", ");
    // Re-schedule (same identifier replaces the old one) so the body always
    // lists the currently overdue metrics.
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Time for your weekly measurements 📏",
        body: `Overdue: ${labels}. Log them to keep your trends accurate.`,
        ...(Platform.OS === "android" ? { channelId: "reminders" } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: 0,
      },
    });
    console.log(`[MacroTrack] measurement reminder scheduled (overdue: ${labels})`);
  } catch (e) {
    console.warn("[MacroTrack] reminder sync failed:", e);
  }
}
