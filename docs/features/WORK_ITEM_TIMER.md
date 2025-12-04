# Feature: Work Item Timer

**Status**: Draft
**Created**: 2025-11-30
**Designer**: GitHub Copilot
**Reviewers**: User

---

## 1. Feature Overview

The Work Item Timer allows developers to track time spent on Azure DevOps work items directly from VS Code. It uses an **event-sourced model** where the timer's state is derived from a history of timestamped actions (Start, Pause, Stop), ensuring accuracy and resilience.

### Value Proposition

- **Accuracy**: Eliminates "guesstimation" of time spent.
- **Resilience**: Event-sourced data survives crashes or restarts without losing "accumulated" time.
- **Simplicity**: Logic engine remains pure; "ticking" is a UI concern, not a business logic concern.

---

## 2. Problem Statement

### Current State

Developers manually estimate time spent on tasks, often logging it days later. This leads to inaccurate data and administrative burden.

### Desired State

A developer opens a Work Item, clicks "Start", and works. The system records the timestamp. When they take a break, they click "Pause". When finished, "Stop". The system calculates the total duration based on these timestamps.

---

## 3. Data Model (The "Facts")

We avoid storing `AccumulatedTime` as a mutable counter. Instead, we store the **History of Events**.

### `TimerEntry`

A single record of a timer action.

```typescript
type TimerActionType = 'start' | 'pause' | 'stop';

interface TimerEntry {
  timestamp: number; // UTC Seconds
  type: TimerActionType;
  workItemId: number;
}
```

### `TimerHistory` (Fact)

The source of truth for the timer.

```typescript
interface TimerHistory {
  entries: TimerEntry[];
}
```

### Derived State (Calculated, not Stored)

The "Total Duration" is calculated on-demand by iterating through `TimerHistory`.

**Algorithm:**

1. Sort entries by timestamp (if not already ordered).
2. Iterate through entries:
   - If `start`: Store `currentStartTime`.
   - If `pause` or `stop`: Add `(entry.timestamp - currentStartTime)` to `totalDuration`. Clear `currentStartTime`.
   - If end of list and `currentStartTime` is set (Timer is Running): Add `(now() - currentStartTime)` to `totalDuration`.

---

## 4. Events (Triggers)

These are the external inputs that append to the `TimerHistory`.

| Event Name   | Payload                  | Description                                                         |
| :----------- | :----------------------- | :------------------------------------------------------------------ |
| `StartTimer` | `{ workItemId: number }` | Appends a `start` entry. Valid only if currently Stopped or Paused. |
| `PauseTimer` | `{ workItemId: number }` | Appends a `pause` entry. Valid only if currently Running.           |
| `StopTimer`  | `{ workItemId: number }` | Appends a `stop` entry. Valid only if currently Running or Paused.  |

---

## 5. Logic Rules (Praxis)

The logic engine is responsible for **validating** transitions and **appending** to history. It does **not** run a clock.

**Rule: Start Timer**

- **Given**: `TimerHistory`
- **When**: `StartTimer` event
- **Then**:
  - Check if already running for this Work Item (last entry was `start`).
  - If not running, append `{ type: 'start', timestamp: now(), workItemId }` to `TimerHistory`.

**Rule: Pause Timer**

- **Given**: `TimerHistory`
- **When**: `PauseTimer` event
- **Then**:
  - Check if currently running (last entry was `start`).
  - If running, append `{ type: 'pause', timestamp: now(), workItemId }` to `TimerHistory`.

---

## 6. UI/UX Strategy

The UI is responsible for the visual "ticking".

1. **Sync**: UI receives the full `TimerHistory` (or a computed "Current State" object containing `isRunning`, `startTime`, and `previouslyAccumulatedTime`).
2. **Render**:
   - If `isRunning`: UI starts a local `setInterval` (1s).
   - On tick: `DisplayTime = previouslyAccumulatedTime + (now() - startTime)`.
   - If `!isRunning`: `DisplayTime = previouslyAccumulatedTime`.
3. **Benefit**: The Extension Host (Node.js) does not wake up every second. The Webview (UI) handles the animation.

---

## 7. Goals & Success Metrics (MoSCoW)

| Priority   | Goal                                               | Metric                  | Target   |
| :--------- | :------------------------------------------------- | :---------------------- | :------- |
| **Must**   | Track duration via Start/Pause/Stop                | Calculation accuracy    | +/- 1s   |
| **Must**   | Persist state across VS Code restarts              | Data loss incidents     | 0        |
| **Should** | Support multiple work items (one active at a time) | Context switch handling | Seamless |
