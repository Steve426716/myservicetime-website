// MyServiceTime — profile pictures (yours, and your contacts').
// Loaded before contacts.js and app.js (functions only); app.js calls initAvatars().
// Pictures are cropped to a square, shrunk to a small JPEG, and stored in the signed-in person's
// private, encrypted data like everything else.

const PROFILE_KEY = "dailytime.profile";
const AVATAR_SIZE = 256;            // pixels (shown at most ~64px, so this stays sharp on any screen)
const AVATAR_QUALITY = 0.82;

const loadProfile = () => { try { return JSON.parse(store.getItem(PROFILE_KEY)) || {}; } catch { return {}; } };
const saveProfile = (p) => store.setItem(PROFILE_KEY, JSON.stringify(p));

/** Only our own small JPEG/PNG pictures are allowed as image sources. */
const safePhoto = (src) => (typeof src === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : "");

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return chars.map((p) => [...p][0] || "").join("").toUpperCase() || "?";
}
/** A stable colour per name, so each person's circle always looks the same. */
function avatarHue(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

/** HTML for a round picture, or initials on a coloured circle when there's no picture. */
function avatarHtml(name, photo, size = "md") {
  const src = safePhoto(photo);
  if (src) return `<img class="avatar ${size}" src="${src}" alt="" />`;
  const h = avatarHue(name);
  return `<span class="avatar ${size} initials" style="--h:${h}" aria-hidden="true">${esc(initials(name))}</span>`;
}

/** Turns a chosen/taken photo into a small square JPEG. */
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || "image/")) return reject(new Error("not an image"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;   // centre crop
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_QUALITY));
      } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable image")); };
    img.src = url;
  });
}

// ---------- the picture window (used for your profile and for contacts) ----------
let picker = { name: "", photo: "", onSave: null };

function showPickerPreview() {
  $("avPreview").innerHTML = avatarHtml(picker.name, picker.photo, "xl");
  $("avRemove").hidden = !picker.photo;
}

/** Opens the window. onSave(photoOrEmpty) is called when the person taps Save. */
function openPhotoPicker({ title, name, photo, onSave }) {
  picker = { name, photo: safePhoto(photo), onSave };
  $("avTitle").textContent = title;
  $("avMsg").textContent = "";
  $("avCamera").value = "";
  $("avFile").value = "";
  showPickerPreview();
  $("avatarModal").hidden = false;
}
const closePhotoPicker = () => { $("avatarModal").hidden = true; };

async function pickerFileChosen(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  $("avMsg").textContent = t("working");
  $("avMsg").className = "addr-msg";
  try {
    picker.photo = await shrinkPhoto(file);
    $("avMsg").textContent = "";
    showPickerPreview();
  } catch {
    $("avMsg").textContent = t("photoError");
    $("avMsg").className = "addr-msg err";
  }
}

// ---------- your own profile picture ----------
function myName() { return store.user?.name || store.user?.email || ""; }

/** The button at the top right: your picture (or initials) and your name. */
function renderProfileAvatar() {
  const el = $("acctName");
  if (!el) return;
  el.innerHTML = `${avatarHtml(myName(), loadProfile().photo, "sm")}<span class="acct-label">${esc(myName())}</span>`;
}

function editMyPhoto() {
  openPhotoPicker({
    title: t("profilePhoto"),
    name: myName(),
    photo: loadProfile().photo,
    onSave: (photo) => {
      const p = loadProfile();
      if (photo) p.photo = photo; else delete p.photo;
      saveProfile(p);
      renderProfileAvatar();
      renderView(); // the Profile / Dashboard pages show the picture too
    },
  });
}

function initAvatars() {
  // the camera button only makes sense on phones/tablets
  $("avCameraBtn").hidden = !matchMedia("(pointer: coarse)").matches;
  $("avCamera").addEventListener("change", pickerFileChosen);
  $("avFile").addEventListener("change", pickerFileChosen);
  $("avRemove").addEventListener("click", () => { picker.photo = ""; showPickerPreview(); });
  $("avCancel").addEventListener("click", closePhotoPicker);
  $("avSave").addEventListener("click", () => { const cb = picker.onSave; closePhotoPicker(); cb?.(picker.photo); });
  $("avatarModal").addEventListener("mousedown", (e) => { if (e.target === $("avatarModal")) closePhotoPicker(); });
  $("acctPhoto").addEventListener("click", editMyPhoto);
  renderProfileAvatar();
}
