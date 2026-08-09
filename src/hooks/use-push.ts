import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

export type PushState = "unsupported" | "denied" | "granted" | "prompt";

export function usePush() {
  const [state, setState] = useState<PushState>("prompt");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as PushState);
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const r = reg ?? (await navigator.serviceWorker.register("/sw.js"));
      const sub = await r.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (state === "unsupported") return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm as PushState);
      if (perm !== "granted") return;
      const reg = (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      });
      const json = sub.toJSON();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: u.user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth_key: json.keys?.auth ?? "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      setSubscribed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan tidak dikenal.";
      toast.error("Gagal mengaktifkan notifikasi", { description: message });
    } finally {
      setBusy(false);
    }
  }, [state]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, subscribed, busy, subscribe, unsubscribe };
}