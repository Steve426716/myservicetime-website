// MyServiceTime — online sync settings.
// Fill these in from your Supabase project: Dashboard → Project Settings → API.
// (See SETUP.md.) The "anon public" key is meant to be in app code: Row Level Security in
// supabase/setup.sql is what keeps each person's data private.

window.DAILYTIME_CONFIG = {
  supabaseUrl: "https://dnvyzgxofmzkpkaijivl.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudnl6Z3hvZm16a3BrYWlqaXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNTk3MDYsImV4cCI6MjEwOTgzNTcwNn0.C7MFEslL1F22PTIVUkobOZJOIiqFIds5Ybr-B-19vBc",  // the long "anon public" key
  vapidPublicKey: "BA12nTMB25O08iZzue7ipJ3MG68VO273VuYRVLBqUC-xFhYTOatKDmIkgrPDoeIeOHJGEgayA60KN1L4TLxb6Pw",   // filled in by: node tools/make-push-keys.js (for reminder notifications)

  // The public address of the website (e.g. "https://myservicetime.com"). Used for the "Share MyServiceTime"
  // QR code. Empty: the website shares its own address; the phone apps hide the QR until this is filled in.
  siteUrl: "https://myservicetime.app",

  // Paying inside the phone apps outside the US (Google Play / App Store), through RevenueCat — see STORE-PAYMENTS.md.
  // These are RevenueCat's PUBLIC app keys (they start with "goog_" and "appl_"); empty = the phone apps sell nothing
  // outside the US. (In the US the phone apps send people to the website to pay, which needs siteUrl above.)
  // The store pages, once the apps are published (for "Rate MyServiceTime" on the website, and "Update").
  playStoreUrl: "",     // e.g. "https://play.google.com/store/apps/details?id=com.myservicetime.app"
  appStoreId: "",       // the number in the App Store link, e.g. "6501234567"

  revenuecatAndroidKey: "",
  revenuecatIosKey: "",

  // Shown to customers: in the app's "Support" link and on the Privacy Policy / Terms pages.
  supportEmail: "myservicetimesupport@gmail.com",     // e.g. "support@yourdomain.com"
  ownerName: "Steeve Dieubon",        // your name or your business name
  ownerCountry: "the United States",     // the country whose laws apply to the Terms (where you live / your business is)
};
