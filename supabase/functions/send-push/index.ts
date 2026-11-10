import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
// Testing switch: set to 'true' so you also get pinged for your own posts
const NOTIFY_AUTHOR = Deno.env.get("NOTIFY_AUTHOR") === "true";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const SUBJECT_LABEL: Record<string, string> = {
  AML: "AML",
  ADM: "ADM",
  IPR: "IPR",
  MAT: "MAT",
  CC: "CC",
  PR: "PR",
  LAB: "Lab",
  OTHER: "Class",
};

const TITLES: Record<string, string[]> = {
  series: [
    "😱 {s} series exam spotted!",
    "📚 {s} series is coming. Breathe.",
    "🫠 {s} series alert",
  ],
  sem_exam: [
    "💀 {s} sem exam dropped",
    "😬 {s} sem exam. Deep breaths.",
    "🚨 {s} sem exam alert",
  ],
  lab_exam: ["🧪 {s} lab exam incoming", "💻 {s} lab exam spotted"],
  assignment: [
    "📝 New {s} assignment",
    "✍️ {s} assignment just landed",
    "📬 {s} assignment alert",
  ],
  report: ["📄 {s} report due soon", "🖨️ {s} report time!"],
  project: ["🛠️ {s} project update", "🚀 {s} project news"],
  seminar: ["🎤 {s} seminar scheduled", "🎙️ {s} seminar is on the calendar"],
  event: [
    "🎉 Plot twist: a class event!",
    "🎈 Something fun is happening",
    "🥳 New class plan!",
  ],
  info: ["📢 {a} has news", "👀 New on the class wall", "🔔 Heads-up from {a}"],
};

function whenLabel(dateStr?: string | null) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000); // class lives in IST
  const todayUTC = Date.UTC(
    ist.getUTCFullYear(),
    ist.getUTCMonth(),
    ist.getUTCDate(),
  );
  const target = Date.UTC(y, m - 1, d);
  const days = Math.round((target - todayUTC) / 86400000);
  const pretty = new Date(target).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const rel =
    days === 0
      ? "today!"
      : days === 1
        ? "tomorrow"
        : days > 1
          ? `in ${days} days`
          : "";
  return rel ? `${pretty} (${rel})` : pretty;
}

function buildMessage(record: any, authorName: string) {
  const s = SUBJECT_LABEL[record.subject] ?? record.subject;
  const title = pick(TITLES[record.type] ?? TITLES.info)
    .replace("{s}", s)
    .replace("{a}", authorName);
  const when = whenLabel(record.event_date);
  const body = `${record.title}${when ? ` · ${when}` : ""}${record.type === "info" ? "" : ` (by ${authorName})`}`;
  return { title, body, url: "/", tag: record.id };
}

async function sendTo(subs: any[], payload: unknown) {
  const text = JSON.stringify(payload);
  const dead: string[] = [];
  const failed: { status?: number; body?: string }[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          text,
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          dead.push(s.endpoint);
        } else {
          console.error(
            "push failed",
            err?.statusCode,
            err?.body ?? err?.message,
          );
          failed.push({
            status: err?.statusCode,
            body: String(err?.body ?? err?.message ?? "").slice(0, 120),
          });
        }
      }
    }),
  );

  if (dead.length)
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, removed: dead.length, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // Mode 1: database webhook (new heads-up)
    if (
      WEBHOOK_SECRET &&
      req.headers.get("x-webhook-secret") === WEBHOOK_SECRET
    ) {
      const payload = await req.json();
      if (payload.type !== "INSERT" || payload.table !== "heads_ups") {
        return json({ skipped: true });
      }
      const record = payload.record;

      const { data: author } = await admin
        .from("profiles")
        .select("name")
        .eq("id", record.created_by)
        .single();

      let query = admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth");
      if (!NOTIFY_AUTHOR) query = query.neq("user_id", record.created_by);
      const { data: subs } = await query;

      const result = await sendTo(
        subs ?? [],
        buildMessage(record, author?.name ?? "Someone"),
      );
      return json(result);
    }

    // Mode 2: logged-in user sends a test push to their own devices
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    if (!body?.test) return json({ error: "bad request" }, 400);

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user.id);

    const result = await sendTo(subs ?? [], {
      title: "🎉 It works!",
      body: "Push notifications are live on this device. Cute, right?",
      url: "/",
      tag: "test",
    });
    return json(result);
  } catch (err) {
    console.error(err);
    return json({ error: "server error" }, 500);
  }
});
