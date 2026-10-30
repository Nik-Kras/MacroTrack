import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, View } from "react-native";

import { LiteRtLm, type ModelDownloadStatus } from "../../modules/litert-lm";
import { Txt } from "@/components/ui";
import { downloadShare, gb, MODEL_BYTES, MODEL_PARTS, MODEL_SHA256 } from "@/lib/ai/modelFiles";
import { colors, font } from "@/theme";

const POLL_MS = 1500;

/**
 * Download the photo model once (3.7 GB): Android's DownloadManager fetches it on
 * Wi-Fi (progress notification, carries on with the app closed), then the app joins
 * the parts and checks the SHA-256. Ported from MamaKcal's ModelCard.
 */
export function ModelDownloadCard({ onReady }: { onReady: () => void }) {
  const native = LiteRtLm;
  const [status, setStatus] = useState<ModelDownloadStatus | null>(null);
  const [needBytes, setNeedBytes] = useState(0);
  const [starting, setStarting] = useState(false);
  const finishing = useRef(false);

  const poll = useCallback(async () => {
    if (!native) return;
    try {
      const s = await native.modelDownloadStatus();
      setStatus(s);
      if (s.state === "downloaded" && !finishing.current) {
        finishing.current = true;
        setStatus({ ...s, state: "assembling" });
        try {
          await native.finishModelDownload();
        } finally {
          finishing.current = false;
        }
        setStatus(await native.modelDownloadStatus());
      }
    } catch (e) {
      console.warn("[MacroTrack] model download status", e);
    }
  }, [native]);

  useEffect(() => {
    void poll();
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => void poll(), POLL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (timer) clearInterval(timer);
      timer = s === "active" ? setInterval(() => void poll(), POLL_MS) : null;
      if (s === "active") void poll();
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [poll]);

  useEffect(() => {
    if (status?.state === "done") onReady();
  }, [status?.state, onReady]);

  const start = async () => {
    if (!native || starting) return;
    setStarting(true);
    setNeedBytes(0);
    try {
      setNeedBytes(await native.startModelDownload(MODEL_PARTS, MODEL_SHA256));
      await poll();
    } catch (e) {
      console.warn("[MacroTrack] model download start", e);
      setStatus({ state: "failed", done: 0, total: MODEL_BYTES, reason: "start" });
    } finally {
      setStarting(false);
    }
  };

  if (!native) {
    return <Txt style={{ color: colors.muted, fontSize: 13 }}>Photo recognition needs the installed app (not Expo Go).</Txt>;
  }
  if (!status) return <ActivityIndicator color={colors.accent} />;

  const state = status.state;
  const total = status.total || MODEL_BYTES;
  const progress = state === "running" || state === "waiting" || state === "downloaded" || state === "assembling";
  const pct = Math.round(downloadShare(status.done, total) * 100);

  return (
    <View style={{ gap: 12 }}>
      <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>Photo recognition model</Txt>
      {progress ? (
        <>
          <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${pct}%`, borderRadius: 99, backgroundColor: colors.accent }} />
          </View>
          {state === "downloaded" || state === "assembling" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.accent} />
              <Txt style={{ fontSize: 13.5, fontFamily: font.sb }}>Checking the file… up to a minute.</Txt>
            </View>
          ) : (
            <>
              <Txt style={{ fontSize: 14, fontFamily: font.b }}>
                {state === "waiting" ? "Waiting for Wi‑Fi" : "Downloading"} · {gb(status.done)} of {gb(total)}{" "}GB
              </Txt>
              <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb }}>
                {state === "waiting" ? "Connect to Wi‑Fi and it carries on by itself." : "You can close the app; the download carries on."}
              </Txt>
            </>
          )}
        </>
      ) : (
        <>
          <Txt style={{ fontSize: 13.5, color: state === "failed" || needBytes > 0 ? colors.text : colors.muted, fontFamily: font.sb, lineHeight: 19 }}>
            {needBytes > 0
              ? `Not enough free space: free up another ${gb(needBytes)} GB and try again.`
              : state === "failed"
                ? status.reason === "corrupt"
                  ? "The file was damaged on the way. Try again."
                  : "The download failed. Check the Wi‑Fi and try again."
                : `Recognising food in a photo runs on your phone. Download the model once: ${gb(MODEL_BYTES)} GB, Wi‑Fi only.`}
          </Txt>
          <Pressable
            onPress={() => void start()}
            disabled={starting}
            style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center", opacity: starting ? 0.6 : 1 }}
          >
            <Txt style={{ fontFamily: font.xb, fontSize: 15, color: colors.bg }}>{state === "failed" || needBytes > 0 ? "Try again" : "Download"}</Txt>
          </Pressable>
          <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.sb }}>Gemma model by Google. Terms: ai.google.dev/gemma/terms</Txt>
        </>
      )}
    </View>
  );
}
