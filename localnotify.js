// MyServiceTime — phone notifications in the App Store / Google Play app (Capacitor "Local Notifications").
// Reminders are scheduled ON THE PHONE ITSELF, so they arrive whether MyServiceTime is open or closed, even with no
// internet and no account — and the details never leave the phone. In the store app, reminders show as phone
// notifications instead of the ringing window. On the website this file does nothing.
// Loaded before app.js (functions only).

const NativeNotify = (() => {
  const LN = window.Capacitor?.isNativePlatform?.() ? window.Capacitor?.Plugins?.LocalNotifications : null;
  const MAX = 60;             // the next 60 reminders are scheduled (more are added as time goes on)
  const AHEAD = 45 * 864e5;   // up to 45 days ahead
  let timer = null;
  let scheduled = new Set(); // reminders the phone will show by itself

  /** A whole number id for a reminder (the same reminder always gets the same id, so it never shows twice). */
  const idFor = (tag) => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (Math.imul(31, h) + tag.charCodeAt(i)) | 0;
    return Math.abs(h) % 2000000000 + 1;
  };

  /** Every upcoming reminder with its title and text (the same words as the in-app alerts). */
  function upcoming() {
    const now = Date.now(), until = now + AHEAD, list = [];
    const add = (tag, at, title, body) => { if (at > now && at < until) list.push({ tag, at, title, body }); };
    for (const a of appts) for (const p of reminderPoints(a)) {
      if ((a.fired || {})[p.key]) continue;
      const when = whenOf(a), person = contactById(a.contactId);
      add(`${a.id}-${p.key}`, p.at, `${t(p.label)}: ${a.title}`,
        [`${typeLabel(a.type)} — ${fmtDate(when)} ${fmtTime(when)}`, person && `👤 ${person.name}`, a.address].filter(Boolean).join(" — "));
    }
    for (const x of tasks) for (const p of taskReminderPoints(x)) {
      if ((x.fired || {})[p.key]) continue;
      add(`task-${x.id}-${p.key}`, p.at, `${t(p.label)}: ${x.title}`, `${fmtDate(dueOf(x))}${x.dueTime ? " " + fmtTime(dueOf(x)) : ""}`);
    }
    for (const x of todos) for (const p of todoReminderPoints(x)) {
      if ((x.fired || {})[p.key]) continue;
      add(`todo-${x.id}-${p.key}`, p.at, `${t(p.label)}: ${x.text}`, `${fmtDate(p.at)} ${fmtTime(p.at)}`);
    }
    for (const ev of events) for (const p of eventReminderPoints(ev)) {
      if ((ev.fired || {})[p.key]) continue;
      const o = p.o || nextOccurrence(ev);
      add(`event-${ev.id}-${p.key}`, p.at, `${t(p.label)}: ${eventIconText(ev.kind)} ${eventTitle(ev)}`,
        [o && dateRangeText(ev, o), ev.address].filter(Boolean).join(" — "));
    }
    for (const r of myReminders) for (const p of myReminderPoints(r)) {
      if ((r.fired || {})[p.key]) continue;
      add(`rem-${r.id}-${p.key}`, p.at, `🔔 ${r.text}`, [`${fmtDate(p.at)} ${fmtTime(p.at)}`, repeatLabel(r)].filter(Boolean).join(" — "));
    }
    return list.sort((a, b) => a.at - b.at).slice(0, MAX);
  }

  async function cancelAll() {
    const { notifications } = await LN.getPending();
    if (notifications.length) await LN.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
  }

  // Reminders use their own "channel": top priority, so they pop up on the screen (also over other apps and
  // on the lock screen) with MyServiceTime's tone (about 2.6 s) and a vibration. Android keeps a channel's
  // settings once it exists, so a new id is used whenever these change.
  const CHANNEL = "mst_reminders_v1";
  let channelReady = false;
  async function ensureChannel() {
    if (channelReady) return;
    await LN.createChannel({
      id: CHANNEL, name: t("remTitle") || "Reminders", description: "MyServiceTime",
      importance: 5, visibility: 1, sound: "mst_reminder.wav", vibration: true, lights: true, lightColor: "#5B4BF0",
    });
    channelReady = true;
  }
  const look = { smallIcon: "ic_stat_mst", iconColor: "#5B4BF0", channelId: CHANNEL, sound: "mst_reminder.wav" };

  /** Re-schedules the phone's notifications to match what is saved now. */
  async function sync() {
    if (!LN) return;
    try {
      await ensureChannel();
      await cancelAll();
      scheduled = new Set();
      if (!started) return; // reminders switched off
      const perm = await LN.checkPermissions();
      if (perm.display !== "granted") return;
      const list = upcoming();
      if (!list.length) return;
      scheduled = new Set(list.map((n) => n.tag));
      await LN.schedule({
        notifications: list.map((n) => ({
          id: idFor(n.tag), title: n.title, body: n.body, largeBody: n.body,
          schedule: { at: new Date(n.at), allowWhileIdle: true },
          ...look,
        })),
      });
    } catch (e) { console.warn("phone notifications", e); }
  }

  return {
    available: !!LN,
    /** a moment after any change (several changes in a row count once) */
    syncSoon(delay = 800) { if (!LN) return; clearTimeout(timer); timer = setTimeout(sync, delay); },
    /** "Start Reminders" / the first reminder: asks the phone once, then schedules. Returns true when allowed. */
    async enable() {
      if (!LN) return false;
      try {
        let perm = await LN.checkPermissions();
        if (perm.display !== "granted") perm = await LN.requestPermissions();
        if (perm.display !== "granted") { showNotifyHint("notifyDenied", "warn"); return false; }
        await sync();
        return true;
      } catch { return false; }
    },
    /** A reminder that is due right now (the app is open): shown as a phone notification, no ringing window. */
    showNow({ title, text, tag }) {
      if (!LN || scheduled.has(tag)) return; // already on its way from the phone
      ensureChannel()
        .then(() => LN.schedule({ notifications: [{ id: idFor(tag), title, body: text, largeBody: text, ...look }] }))
        .catch(() => {});
    },
  };
})();
