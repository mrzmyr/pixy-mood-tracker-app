# Vision

Pixy is the privacy-aware companion for your wellbeing. It helps you understand why you felt the way you did.

It provides a privacy-aware data layer on device and the right visual presentation to enable reflection. Over time it suggests interventions based on the data, e.g. breathing exercises or talking to a friend.

It uses the [Open Wellbeing Log Format (OWLF)](https://github.com/mrzmyr/OWLF).

## Main message

**Understand what makes you feel this way.**

Every surface leads with this: App Store, Google Play, screenshots, website, README, outreach. Supporting messages, in this order:

1. **Patterns**: Pixy shows what goes with your good and bad days. Patterns come from tag categories, pre-filled or your own, plus people, sleep, and places.
2. **Switch in minutes**: bring your history from 21 mood and journal apps, or any CSV, with [Pixy Switch](https://pixy-switch.vercel.app). Always feature it.
3. **Private by design**: no account, entries on your device, open source.

## Messaging rules

- Lead with the "why". Never lead with pixels or with a single feature.
- Feature switching from other apps on every surface. It is a huge benefit: no one starts from zero.
- Show statistics and Year in Pixels as proof. They are not the headline.
- Claim only features with status `available` in [`docs/app-facts.json`](docs/app-facts.json).
- Name no other apps or logos in store metadata and screenshots. The app list lives on Pixy Switch.

## Phase out over time

Messaging we move away from. The features stay.

- **Pixel framing as the identity.** "One pixel a day" and "Year in Pixels" stay as a view and a search term, not the main framing.
- **Statistics as the primary feature.** Statistics stay in screenshots as support. The primary value becomes pattern recognition.
- **"Minimalistic mood tracker".** Pixy stays simple to use, but it is a wellbeing companion, not a minimal tracker.

## Focus: modules we feature and improve most

1. **Recaps and insights**: month story, pattern cards, yearly report, mood x tag category and mood x people patterns.
2. **People**: who you connected with, and how your days went with them.
3. **Fast check-in**: quick check-in on the Lock Screen and Android notification, widgets, voice check-in.
4. **Interventions and auto-ingest**: suggestions based on your data (breathing, reaching out to a friend), Apple Health ingest.
5. **Pixy Switch**: keep the importer list growing and tested against fixtures.

## Steps

- Get data
  - Get notifications right
  - Quick check-in
  - Check-in formats (voice)
  - Auto ingest data (e.g. Apple Health)
- Allow reflection by the best visual representation
  - Weekly / Monthly / Yearly recaps
  - Patterns from tag categories, people, sleep, places
  - Statistics
- Suggest interventions based on data
  - e.g. breathing exercise, talking to that friend
