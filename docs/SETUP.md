# Setup guide for the owner

Plain steps with exact clicks. Do them in order. Sections 1–3 are one-time.

## 1. Make the repository public
1. Open https://github.com/jonathanskim96-ctrl/Sheet_Music_101
2. Click **Settings** (top row of tabs) → **General** → scroll to the bottom, "Danger Zone".
3. Click **Change visibility** → **Make public** → confirm.

Why this is safe: the repository holds only the app's code. There is no personal data and no
secrets. Your progress lives only on your phone.

## 2. Turn on GitHub Pages
1. Settings → **Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**. Nothing else.

## 3. Protect `main`
1. Settings → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**.
2. Name: `Protect main`. Enforcement status: **Active**.
3. Target branches → **Add target** → **Include default branch**.
4. Tick **Restrict deletions**, **Block force pushes** and **Require status checks to pass**.
5. Under the status checks, click **Add checks** and add `verify`.
6. Click **Create**.

(The check named `verify` only appears in the list after CI has run once, so do this after
the first pull request has been checked.)

## 4. Merging a pull request (how each milestone ships)
1. Open the pull request link Claude gives you.
2. Wait for the green check ("All checks have passed").
3. Click **Merge pull request** → **Confirm merge**.
4. Open the **Actions** tab. Wait for "CI and deploy" to finish with a green check on **both**
   jobs (not "cancelled" or "skipped").

## 5. Open the app
https://jonathanskim96-ctrl.github.io/Sheet_Music_101/

You should see "Sheet Music 101 · Coming soon" and a version line.

## 6. Install on iPhone
1. Open the link in **Safari** (not Chrome).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.

Why it matters: iPhone deletes the saved data of websites you haven't used for 7 days, but not
the data of apps installed on the Home Screen.

## 7. Install on Android
Open the link in Chrome → menu ⋮ → **Install app** (or use the in-app Install button).

## 8. Backups
In the app: **Settings → Save a backup** now and then. On a new phone use **Restore from
backup**. (These screens arrive in a later milestone.)
