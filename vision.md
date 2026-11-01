This document describes the vision of the Pixy app, what direction it will be developed and that success means for the user.

Every surface should follow it: App Store, Google Play, screenshots, website, README, outreach.

# Vision

Pixy is the privacy-aware companion for your wellbeing. 
Pixy did the best job when the user understood why they acted that way and was able to change their behaviour for the better.
Framing: "Understand what makes you feel this way"

## Privacy

Pixy collects product usage data to improve the app. It is linked to a random ID, never to a name, email, or account.
Usage data never contains what users log: no moods, emotions, sleep, notes, tags, or people. Only counts and yes/no values.
Pixy never shares text written in the app with anyone, including AI services, and never will.
If users prefer to not share, they can disable it in the settings or fork the project.

## Concept

A mood or emotion get's _shaped by_ things.

Signal
- Mood: primary
- Emotions: detail to mood

Shaped by
- Tag
- Tag Category
- People
- Location
- Sleep

Tags can be all kinds of behavior or experiences like drinking / eating, med taken, physical conditions, playing an instrument, emotional state.
Photos help the user to reflect, being able to get back into the feeling or situation.

## Journey

- Track
  - Get notifications right
  - Quick check-in
  - Check-in formats (voice)
  - Auto ingest data (e.g. Apple Health)
- Reflect
  - Allow reflection by the best visual representation
  - Weekly / Monthly / Yearly recaps
  - Patterns from tag categories, people, sleep, places
  - Statistics
- Act
  - Suggest interventions based on data
  - e.g. breathing exercise, talking to that friend

## Features

- **Switch**: We want to make it extremly easy to switch from competitor apps to Pixy. This is why we build switch.pixy.app which allows bringing your history from many mood and journal apps, or any CSV to Pixy.
- **Statistics**: It's good to see raw data, users should be able to see trends over time (e.g. mood over time, year summary)
- **Recaps**: Recaps give you an overview of patterns: mood x people or tags x moods, recaps are a collection of patterns bound to a cadence.
- **Stories**: Looking at statistics is not very engaging. It should be fun to reflect, this is why we build stories to have a review on a certain cadence. 
- **Emotions**: For me it was important to understand what emotions mean, this is why we added a description to each of the emotions. It can help users understand what is means to feel that way.
- **Voice**: Tracking should be fast, voice mode is one of the fastest ways to do it.
- **Quick Check-in**: Having a UI framed as mood, emotion + shaped by is crucial for fast check-in creation. This enables the user to create multiple entries over the day they can refelect on.
- **Ingest**: If users already track certain data like sleep via Apple Watch, they should not need to add this data but the app should support auti ingest for it.
- **Interventions**: We are not allowed and do not want to diagnose the user, but we can make suggestions on simple patterns like when feeling anxious, we can suggest a breathing exercise.

## Messaging rules

- Lead with the "why". Never lead with pixels or with a single feature.
- Show statistics and Year in Pixels as proof. They are not the headline.
- Claim only features with status `available` in [`docs/app-facts.json`](docs/app-facts.json).
- Name no other apps or logos in store metadata and screenshots. The app list lives on Pixy Switch.

## Phase out over time

Messaging we move away from.

- **Pixel framing as the identity.** "One pixel a day" and "Year in Pixels" stay as a view and a search term, not the main framing.
- **Statistics as the primary feature.** Statistics stay in screenshots as support. The primary value becomes pattern recognition.
- **"Minimalistic mood tracker".** Pixy stays simple to use, but it is a wellbeing companion, more than a minimal tracker.
