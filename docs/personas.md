# Personas

Seven ways people log in Pixy. Check every idea against all seven.

- Users stick to one style. Each user writes notes, emotions, or tags on almost all entries or on none
- Test data: one fixture per persona, `persona-<name>` in [`src/dev/fixtures/personas.ts`](../src/dev/fixtures/personas.ts). Load from Settings > Test data or `<scheme>://dev/fixture?id=persona-lea`
- Keep the letters and names stable

## A Lea, Quick Tapper

- Mood only. Often 2 or more entries a day
- Wants: done in 2 seconds. Every extra screen is friction
- Fixture `persona-lea`: Mood step only

## B Jonas, Journaler

- Mood and note. Notes from 1 line to 5 paragraphs
- Wants: space for words. Text must never truncate where he wants to reread it
- Fixture `persona-jonas`: Mood and Note steps, one 1,700-character note a week

## C Sara, Emotion Labeler

- Mood and 3 to 6 emotions
- Wants: names for feelings. Many emotions must stay readable
- Fixture `persona-sara`: Mood and Emotions steps

## D Ben, Tag Tracker

- Mood and 3 to 6 tags from a stable set
- Wants: patterns over time. Same tags every day, so repetition must not look like noise
- Fixture `persona-ben`: Mood and Tags steps, 8 tags in use

## E Mia, Tryout

- A few entries, then gone
- Default steps, little content. First entries are often on hard days
- Wants: a reason to come back. Empty states and first-entry screens decide if she stays
- Fixture `persona-mia`: 3 entries, newest one a hard day

## F Paul, Multi-Logger

- Uses most steps: emotions, tags, short notes. People and photos on some days
- Wants: one place for the whole day. Every module must fit together
- Fixture `persona-paul`: every step, people and photos on some days

## G Nina, Max Load

- Not a segment. Realistic upper bound for layout
- 8 to 14 emotions, 8 to 12 tags, 3 to 5 people, 4 to 6 photos, notes of about 1,700 characters
- Use to find overflow, truncation, and scroll problems. For limits and scripts, use the `chaos` fixture
- Fixture `persona-nina`: every step filled heavily
