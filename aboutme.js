// MyServiceTime — "About you": name, picture, phone and email (both required: they are how the person is told when
// MyServiceTime has a problem, e.g. when the app is down), and (in the setup when the app opens)
// the account password typed twice, so the person shows they remember it: it is the key to their encrypted data.
// It is the first step of "Set up your profile"; afterwards Profile → "Edit profile" opens the same window
// (without the password). Loaded before app.js (functions only); app.js calls initAbout().

let aboutPhoto = null; // the picture chosen in this window (null = unchanged)

/** "About you" is done once the name, phone and email are there. */
function aboutComplete() {
  const p = loadProfile();
  // answered once ("Set up your profile" when the app first opens) = done: it is never asked again, not even after
  // creating an account or signing in (phone and email stay optional; they can be added in Profile → Edit profile)
  return !!p.aboutDone;
}

function openAboutModal(setupStep = false) {
  setupLook("aboutModal", setupStep ? "about" : null);
  const p = loadProfile();
  aboutPhoto = null;
  $("abName").value = store.user?.name || "";
  $("abPhone").value = p.phone || "";
  $("abEmail").value = p.contactEmail ?? (store.demo ? "" : store.user?.email || "");
  // the password is asked in the setup (typed twice, it must match); not in "Edit profile"
  const askPw = setupStep && !store.local; // no account: no password
  $("abPhone").required = $("abEmail").required = !store.local;
  $("abPwWrap").hidden = !askPw;
  $("abPw").required = $("abPwConfirm").required = askPw;
  $("abPw").value = $("abPwConfirm").value = "";
  $("aboutForm").dispatchEvent(new Event("reset")); // shown passwords are hidden again (the eye buttons listen for this)
  $("abMsg").textContent = "";
  $("abForgotMsg").textContent = "";
  paintPwMatch();
  paintAboutPhoto();
  $("aboutModal").hidden = false;
  setTimeout(() => $("abName").focus(), 60);
}

function paintAboutPhoto() {
  const photo = aboutPhoto ?? loadProfile().photo ?? "";
  $("abAvatar").innerHTML = avatarHtml($("abName").value.trim() || myName(), photo, "xl");
  $("abPhotoBtn").textContent = t(photo ? "aboutChangePhoto" : "aboutPhoto");
}

/** Under "Confirm password": ✓ they match / ✗ they don't match yet (as the person types). */
function paintPwMatch() {
  const a = $("abPw").value, b = $("abPwConfirm").value, el = $("abPwMatch");
  if (!b) { el.textContent = ""; el.className = "pw-match"; return; }
  const same = a === b;
  if (same && $("abMsg").textContent === t("pwMismatch")) $("abMsg").textContent = ""; // the old warning goes away
  el.textContent = same ? t("pwMatchOk") : t("pwMismatch");
  el.className = `pw-match ${same ? "ok" : "bad"}`;
  $("abPwConfirm").classList.toggle("bad", !same);
}

function aboutMsg(text, kind = "err") {
  $("abMsg").textContent = text;
  $("abMsg").className = `addr-msg ${kind}`;
}

async function saveAbout(e) {
  e.preventDefault();
  const name = $("abName").value.trim().slice(0, 60);
  if (!name) { aboutMsg(t("aboutNameNeeded")); return $("abName").focus(); }
  const phone = $("abPhone").value.trim().slice(0, 40);
  const email = $("abEmail").value.trim().slice(0, 120);
  const optional = !!store.local; // this device only: may be left empty
  if (!(optional && !phone) && (phone.match(/\d/g) || []).length < 7) { aboutMsg(t("aboutPhoneNeeded")); return $("abPhone").focus(); }
  if (!(optional && !email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { aboutMsg(t("badEmail")); return $("abEmail").focus(); }
  const askPw = !$("abPwWrap").hidden;
  aboutMsg(t("working"), "");
  try {
    if (askPw) {
      const pw = $("abPw").value;
      if (pw.length < 6) { aboutMsg(t("pwShort")); return $("abPw").focus(); }
      if (pw !== $("abPwConfirm").value) { aboutMsg(t("pwMismatch")); return $("abPwConfirm").focus(); }
      if (!store.demo) { // a real account: it must be this account's password (the one that opens the encrypted data)
        const row = await fetchVault(store.user.id);
        try { await unwrapDek(row, pw); } catch { aboutMsg(t("aboutPwWrong")); return $("abPw").focus(); }
      }
    }
    // name, phone and contact email are kept with the account itself (not encrypted), so the owner of
    // MyServiceTime can reach people when the app has a problem — see the Privacy Policy
    const old = loadProfile();
    if (name !== store.user.name || phone !== old.phone || email !== old.contactEmail || old.alertLang !== lang) {
      if (!store.demo && !store.local) {
        const { error } = await sb.auth.updateUser({ data: { name, phone, contact_email: email, lang } }); // lang: alerts come in their language
        if (error) throw error;
      }
      store.user.name = name;
      if (!store.demo) saveCache(); // this device remembers the new name too
    }
    const p = loadProfile();
    if (aboutPhoto !== null) { if (aboutPhoto) p.photo = aboutPhoto; else delete p.photo; }
    p.phone = phone;
    p.alertLang = lang;
    p.contactEmail = email;
    p.aboutDone = true;
    saveProfile(p);
    $("abPw").value = $("abPwConfirm").value = "";
    $("aboutModal").hidden = true;
    document.body.classList.remove("in-setup");
    renderProfileAvatar();
    if (typeof renderView === "function") renderView();
    if (typeof renderDrawer === "function") renderDrawer();
    nextOpeningStep(); // then the country, the publisher status, the tutorial
  } catch (err) {
    aboutMsg(friendlyError(err));
  }
}

/** "Forgot password?": a reset link goes to the account's sign-in email (the demo has no account). */
async function forgotFromAbout() {
  const msg = $("abForgotMsg");
  if (store.demo) { msg.textContent = t("aboutForgotDemo"); msg.className = "addr-msg"; return; }
  msg.textContent = t("working"); msg.className = "addr-msg";
  try {
    const { error } = await sb.auth.resetPasswordForEmail(store.user.email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
    msg.textContent = t("aboutForgotSent", { email: store.user.email });
    msg.className = "addr-msg ok";
  } catch (err) {
    msg.textContent = friendlyError(err);
    msg.className = "addr-msg err";
  }
}

function initAbout() {
  $("aboutForm").addEventListener("submit", saveAbout);
  $("abName").addEventListener("input", paintAboutPhoto);
  $("abPw").addEventListener("input", paintPwMatch);
  $("abPwConfirm").addEventListener("input", paintPwMatch);
  $("abPhotoBtn").addEventListener("click", () => {
    openPhotoPicker({
      title: t("profilePhoto"),
      name: $("abName").value.trim() || myName(),
      photo: aboutPhoto ?? loadProfile().photo,
      onSave: (photo) => { aboutPhoto = photo || ""; paintAboutPhoto(); },
    });
  });
  $("abAvatar").addEventListener("click", () => $("abPhotoBtn").click());
  $("abClose").addEventListener("click", () => { $("aboutModal").hidden = true; });
  $("abForgot").addEventListener("click", forgotFromAbout);
}
