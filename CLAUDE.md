# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A 7-day vertical jump training PWA built in vanilla HTML/CSS/JS, distributed as a Capacitor native app (iOS + Android). There is no build step, no bundler, and no package manager in this directory — the source files are static and Capacitor wraps them externally.

## Architecture

**Single shared module:** `main.js` is imported as a JS module by every page (`index.html`, `menu.html`, `workouts/day1–7.html`). All logic — AdMob, music player, rest timer, exercise dropdowns — lives there. Each page activates only the features whose DOM elements are present.

**Exercise image lazy-loading:** Workout pages declare `.exercise-dropdown` elements with a `data-exercise="slug"` attribute (e.g. `data-exercise="squat-jump"`). When a user taps the card, `main.js` looks up that slug in `exerciseData.js` and injects the SVG `<img>` tags on first open. Adding a new exercise requires: adding images to `assets/images/`, adding an entry to `exerciseData.js`, and adding the card HTML to the relevant day file with the matching `data-exercise` slug.

**Rest timer:** The `#restPill` button in workout pages drives an alternating REST (30 s) → WORKOUT (60 s) loop. Constants `REST_SECONDS` / `WORKOUT_SECONDS` are at the top of `main.js`. The whistle cue uses Web Audio API (not `HTMLAudioElement`) because on iOS, audio buffer sources triggered from timers fire reliably once the `AudioContext` is unlocked by a user gesture.

**AdMob:** Only initializes inside `window.Capacitor?.isNativePlatform()`. The interstitial gate uses a click counter, a per-session cap, and a cooldown. On Android, `prepareInterstitial()` resolves when the *request* is sent — not when the ad is ready — so `AdState.isAdReady` is set only via the `InterstitialAdPluginEvents.Loaded` listener, which must be attached before calling `prepareInterstitial()`. The ad unit IDs in the repo are Google's public test IDs; swap in production IDs at release time (keep them out of the repo).

**Music:** `HTMLAudioElement` playlist of MP3s imported as URLs. Track names are kept in a parallel `trackNames` array in `main.js` that must stay index-aligned with the `playlist` array.
