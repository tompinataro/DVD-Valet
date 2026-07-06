# App Store Connect Handoff — DVD Valet (iOS)

## ASC Snapshot

- App: `DVD Valet`
- App Store Connect status: `Rejected`
- iOS version: `1.0`
- Attached build: `1.0.0 (12)`
- Submission ID: `40bfb331-736b-4568-a03b-073dba20c917`
- Latest Apple review date: `2026-03-31`
- Review device: `iPad Air 11-inch (M3)`

## Apple Rejection Items

### 1. Guideline 2.3.3 — Performance — Accurate Metadata

Apple message:

> The 6.5-inch iPhone screenshots do not show the actual app in use in the majority of the screenshots. Specifically, two of four screenshots show login and splash screens that are not considered sufficient to highlight apps' core functionality.

Apple next step:

> Upload new screenshots that resolve the issues identified above and accurately reflect the app in use on each of the supported devices.

What needs to change:

- Replace the weak screenshot set, especially the `6.5-inch iPhone` set.
- Use screenshots that show core functionality, not mostly splash/login.
- Make sure each required supported size reflects the app in use.

Repo clues:

- Current ready-to-upload screenshots are in `/Users/tompinataro/My Projects/DVD-Valet/docs/release/SCREENSHOTS/ASC_READY`
- Present on disk now:
  - `iphone-6.1/01-splash.png`
  - `iphone-6.1/02-login.png`
  - `iphone-6.1/03-library.png`
  - `iphone-6.1/04-scan.png`
  - `ipad-13/ipad-13-library.png`
- There is no obvious `iphone-6.5` folder in `ASC_READY` right now.
- Raw screenshot sources are in `/Users/tompinataro/My Projects/DVD-Valet/docs/release/SCREENSHOTS/raw`

Likely root cause:

- The uploaded screenshot set over-indexed on startup/login states and did not include a compliant `6.5-inch` functional set.

### 2. Guideline 5.1.1(iv) — Legal — Privacy — Data Collection and Storage

Apple message:

> The app encourages or directs users to allow the app to access the camera. Specifically, the app directs the user to grant permission in the following way(s): A custom message appears before the permission request, and to proceed users press a “Enable” button. Use words like “Continue” or “Next” on the button instead.

Apple next step:

> Revise the permission request process in the app to not display messages before the permission request with inappropriate words on buttons.

What needs to change:

- Update the pre-permission camera UI so the CTA does not say `Enable`.
- Use `Continue` or `Next` instead.
- Keep the pre-permission explanation if useful, but make the button wording Apple-safe.

Repo clues:

- Current scan permission screen is in `/Users/tompinataro/My Projects/DVD-Valet/mobile/app/(tabs)/scan.tsx`
- Current button label found in code:
  - `Enable Camera`

Likely root cause:

- The pre-permission CTA language is explicitly what Apple flagged.

### 3. Guideline 5.1.1(ii) — Legal — Privacy — Data Collection and Storage

Apple message:

> One or more purpose strings in the app do not sufficiently explain the use of protected resources.

Apple next step:

> Update the camera purpose string to explain how the app will use the requested information and provide a specific example of how the data will be used.

What needs to change:

- Add or update `NSCameraUsageDescription` with a concrete explanation and example.
- The copy should explain that camera access is used to scan DVD UPC barcodes to add titles to the user’s queue/library.

Repo clues:

- Expo app config is `/Users/tompinataro/My Projects/DVD-Valet/mobile/app.json`
- Current `ios.infoPlist` only contains:
  - `ITSAppUsesNonExemptEncryption`
- No camera usage description was found in `mobile/app.json` during this handoff pass.

Likely root cause:

- The camera purpose string is missing or too generic in the built app config.

### 4. Guideline 1.5 — Safety

Apple message:

> The Support URL provided in App Store Connect, https://tompinataro.github.io/DVD-Valet/support, is currently not functional and/or displays an error.

Apple next step:

> Update the specified Support URL to direct users to a functional webpage with support information.

What needs to change:

- Confirm the support page loads publicly at the exact ASC URL.
- If GitHub Pages is not publishing that path correctly, either fix the deployment or replace the ASC Support URL with a working support page.

Repo clues:

- Local source files exist:
  - `/Users/tompinataro/My Projects/DVD-Valet/docs/support.md`
  - `/Users/tompinataro/My Projects/DVD-Valet/docs/support/index.html`
- Privacy page files also exist:
  - `/Users/tompinataro/My Projects/DVD-Valet/docs/privacy.md`
  - `/Users/tompinataro/My Projects/DVD-Valet/docs/privacy/index.html`

Likely root cause:

- The support content exists locally, but the live public URL in ASC was not serving correctly at review time.

## Recommended Fix Plan

1. Update the scan permission pre-prompt CTA in `scan.tsx` from `Enable Camera` to `Continue` or `Next`.
2. Add a compliant `NSCameraUsageDescription` in `mobile/app.json`.
3. Generate a replacement App Store screenshot set with real in-app flows, especially `6.5-inch iPhone`.
4. Verify the public support URL loads in a clean browser and shows real support info.
5. Review App Privacy answers in App Store Connect so they match the actual app behavior and published privacy policy.
6. Keep build `12` attached unless code changes require a new build. If app code changes, bump the build and replace the attached build in ASC.
7. Save the version form, then use `Update Review` after all flagged items are corrected.

## Suggested Output From Codex

Please return:

- A short root-cause summary for each of the four rejection items.
- Exact code/doc changes made, with file paths.
- A list of updated screenshot assets and which device sizes they cover.
- Confirmation of the final camera permission flow text.
- The final `NSCameraUsageDescription` string.
- Confirmation that the support URL works publicly.
- Whether build `12` remained valid or a replacement build was needed.

## Repo State Notes

- The DVD Valet worktree is already dirty. Do not revert unrelated edits.
- Current `git status` includes modified and untracked files in app code, docs, and release artifacts.
- Treat existing local changes as user work unless clearly generated by this fix.
