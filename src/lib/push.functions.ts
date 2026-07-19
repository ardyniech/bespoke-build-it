import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const notifySosPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kejadianId: string; title?: string; body?: string; url?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ApplicationServerKeys, buildPushPayload } = await import(
      "@block65/webcrypto-web-push"
    );

    const publicKey = process.env.VAPID_PUBLIC_KEY!;
    const privateKey = process.env.VAPID_PRIVATE_KEY!;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@drg.app";

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key, user_id");
    if (error) throw error;
    if (!subs?.length) return { sent: 0, failed: 0 };

    // Ambil user_id yang aktifkan notif_sos
    const userIds = [...new Set(subs.map((s) => s.user_id))];
    const { data: prefs } = await supabaseAdmin
      .from("profiles")
      .select("id, notif_sos")
      .in("id", userIds);
    const allow = new Set((prefs ?? []).filter((p) => p.notif_sos).map((p) => p.id));

    // Reporter tidak perlu notif ke diri sendiri
    const targets = subs.filter((s) => allow.has(s.user_id) && s.user_id !== context.userId);

    const keys = await ApplicationServerKeys.fromJSON({
      publicKey,
      privateKey,
    });

    const payload = JSON.stringify({
      title: data.title ?? "🚨 SOS DRG",
      body: data.body ?? "Rekan butuh bantuan sekarang.",
      url: data.url ?? `/kejadian`,
      tag: `sos-${data.kejadianId}`,
    });

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];

    await Promise.all(
      targets.map(async (s) => {
        try {
          const req = await buildPushPayload(
            {
              data: payload,
              options: { ttl: 60, urgency: "high" },
            },
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth_key },
            },
            keys,
          );
          const res = await fetch(req);
          if (res.ok || res.status === 201) sent++;
          else if (res.status === 404 || res.status === 410) {
            stale.push(s.endpoint);
            failed++;
          } else failed++;
        } catch (err) {
          console.error("push send failed", err);
          failed++;
        }
      }),
    );

    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }

    return { sent, failed };
  });