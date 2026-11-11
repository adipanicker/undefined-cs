import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const NOTIFY_AUTHOR = Deno.env.get("NOTIFY_AUTHOR") === "true";
const EMAIL_DAILY_BUDGET = 80; // Resend free plan = 100/day, shared with PIN-recovery emails

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

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
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

function buildEmail(
  record: any,
  authorName: string,
  headline: string,
  siteUrl: string,
) {
  const subject = SUBJECT_LABEL[record.subject] ?? record.subject;
  const when = whenLabel(record.event_date);
  const desc = record.description
    ? String(record.description).slice(0, 500)
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#FFF8E7;font-family:'Trebuchet MS',Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:3px solid #1A1A1A;border-radius:20px;box-shadow:5px 5px 0 #1A1A1A;overflow:hidden;">
    <div style="background:#FFD966;padding:18px 20px;border-bottom:3px solid #1A1A1A;">
      <div style="font-size:20px;font-weight:bold;">${esc(headline)}</div>
    </div>
    <div style="padding:20px;">
      <span style="display:inline-block;background:#C4B8FF;border:2px solid #1A1A1A;border-radius:999px;padding:3px 12px;font-size:13px;font-weight:bold;">${esc(subject)}</span>
      <div style="font-size:20px;font-weight:bold;margin:14px 0 4px;">${esc(String(record.title))}</div>
      ${when ? `<div style="font-size:14px;color:#6B6B6B;font-weight:bold;">📅 ${esc(when)}</div>` : ""}
      ${desc ? `<p style="font-size:15px;line-height:1.5;margin:14px 0 0;">${esc(desc).replace(/\n/g, "<br>")}</p>` : ""}
      <p style="font-size:13px;color:#6B6B6B;margin:14px 0 0;">Posted by ${esc(authorName)}</p>
      ${siteUrl ? `<a href="${esc(siteUrl)}" style="display:inline-block;margin-top:18px;background:#FFD966;color:#1A1A1A;text-decoration:none;font-weight:bold;border:3px solid #1A1A1A;border-radius:14px;padding:12px 20px;box-shadow:3px 3px 0 #1A1A1A;">Open undefined.cs →</a>` : ""}
    </div>
  </div>
  <p style="max-width:480px;margin:14px auto 0;font-size:12px;color:#6B6B6B;text-align:center;">
    You're getting this because you're in the undefined.cs class.<br>
    Don't want emails? Open the app → Profile → Notifications → turn off emails.
  </p>
</body></html>`;

  const text = [
    headline,
    "",
    String(record.title),
    when,
    desc,
    "",
    `Posted by ${authorName}`,
    siteUrl ? `Open: ${siteUrl}` : "",
    "",
    "Don't want emails? App → Profile → Notifications → turn off emails.",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return { html, text };
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

async function sendEmails(record: any, authorName: string, headline: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  if (!apiKey || !from) return { skipped: "email not configured" };

  const { data: profs } = await admin
    .from("profiles")
    .select("id, email_notify");
  const wanted = new Set(
    (profs ?? [])
      .filter(
        (p) => p.email_notify && (NOTIFY_AUTHOR || p.id !== record.created_by),
      )
      .map((p) => p.id),
  );

  const { data: usersData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const emails = (usersData?.users ?? [])
    .filter((u) => wanted.has(u.id) && u.email)
    .map((u) => u.email as string);

  if (!emails.length) return { sent: 0 };

  const { data: allowed } = await admin.rpc("take_email_budget", {
    p_count: emails.length,
    p_max: EMAIL_DAILY_BUDGET,
  });
  if (!allowed) {
    console.warn("email budget reached, skipping emails for", record.id);
    return { skipped: "daily email budget reached" };
  }

  const { html, text } = buildEmail(record, authorName, headline, siteUrl);
  const batch = emails.map((to) => ({
    from,
    to: [to],
    subject: headline,
    html,
    text,
  }));

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    console.error(
      "resend failed",
      res.status,
      (await res.text()).slice(0, 300),
    );
    return { failed: res.status };
  }
  return { sent: emails.length };
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
      const authorName = author?.name ?? "Someone";
      const message = buildMessage(record, authorName);

      let query = admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth");
      if (!NOTIFY_AUTHOR) query = query.neq("user_id", record.created_by);
      const { data: subs } = await query;

      // Emails only for real posts (a fake author, like in curl tests, skips them)
      const [push, email] = await Promise.all([
        sendTo(subs ?? [], message),
        author
          ? sendEmails(record, authorName, message.title)
          : Promise.resolve({ skipped: "unknown author" }),
      ]);

      console.log(
        "webhook ok:",
        record.id,
        "push:",
        JSON.stringify(push),
        "email:",
        JSON.stringify(email),
      );
      return json({ ...push, email });
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
