/**
 * Module: src/timer.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
import { WorkItemTimerState, TimeEntry } from './types';

export interface TimerPersistPayload {
  state?: WorkItemTimerState;
  timeEntries?: TimeEntry[];
  updateLastSave?: boolean;
  defaultElapsedLimitHours?: number;
}
export interface TimerOptions {
  onState?: (_s: WorkItemTimerState | undefined) => void;
  onInfo?: (_m: string) => void;
  onWarn?: (_m: string) => void;
  onError?: (_m: string) => void;
  now?: () => number;
  persist?: (data: TimerPersistPayload) => void;
  restorePersisted?: () => { state?: WorkItemTimerState; timeEntries?: TimeEntry[] };
  autoResumeOnActivity?: boolean;
  inactivityTimeoutSec?: number;
  pomodoroEnabled?: boolean;
  breakPrompt?: (resumeCb: () => void) => void;
  inactivityCheckMs?: number; // optional: frequency for inactivity checks (testable)
  defaultElapsedLimitHours?: number; // cap elapsed time on stop if left running
}

export class WorkItemTimer {
  private onState: (_s: WorkItemTimerState | undefined) => void;
  private onInfo: (_m: string) => void;
  private onWarn: (_m: string) => void;
  private onError: (_m: string) => void;
  private now: () => number;
  private persist: (data: TimerPersistPayload) => void;
  private restorePersisted: () => { state?: WorkItemTimerState; timeEntries?: TimeEntry[] };
  private autoResumeOnActivity: boolean;
  private inactivityTimeoutSec: number;
  private pomodoroEnabled: boolean;
  private breakPrompt: (resumeCb: () => void) => void;

  private _tickIntervalMs = 1000;
  private _inactivityCheckMs = 10000;
  private defaultElapsedLimitHours = 3.5; // hours
  private _state: WorkItemTimerState | undefined;
  private _ticker: any;
  private _inactivityTicker: any;
  private _lastActivity: number;
  private _timeEntries: TimeEntry[] = [];

  constructor(options: TimerOptions = {}) {
    this.onState = options.onState || (() => {});
    this.onInfo = options.onInfo || (() => {});
    this.onWarn = options.onWarn || (() => {});
    this.onError = options.onError || (() => {});
    this.now = options.now || (() => Date.now());
    this.persist = options.persist || (() => {});
    this.restorePersisted = options.restorePersisted || (() => ({}));
    this.autoResumeOnActivity = options.autoResumeOnActivity ?? true;
    this.inactivityTimeoutSec = options.inactivityTimeoutSec ?? 300;
    // Allow tests to override how frequently inactivity is checked
    this._inactivityCheckMs = options.inactivityCheckMs ?? 10000;
    this.pomodoroEnabled = options.pomodoroEnabled ?? false;
    this.breakPrompt = options.breakPrompt || ((cb) => cb());
    this.defaultElapsedLimitHours = options.defaultElapsedLimitHours ?? 3.5;
    this._lastActivity = this.now();
  }

  loadFromPersisted() {
    const persisted = this.restorePersisted() || ({} as any);
    const state = persisted.state;
    const timeEntries = persisted.timeEntries;
    // If a cap value was persisted with the timer state, restore it so behavior is consistent across reloads
    const persistedCap =
      (persisted as any).defaultElapsedLimitHours ||
      (state && (state.__defaultElapsedLimitHours ?? undefined));
    if (typeof persistedCap === 'number') this.defaultElapsedLimitHours = persistedCap;
    if (state) {
      this._state = state;
      if (!this._state.isPaused) {
        const elapsedMs = this._state.elapsedSeconds * 1000;
        this._state.startTime = this.now() - elapsedMs;
      }
      this._timeEntries = timeEntries || [];
      this._startLoops();
      this.onInfo(`Restored timer for #${this._state.workItemId}: ${this._state.workItemTitle}`);
      this.onState(this.snapshot());
    }
  }

  snapshot() {
    return this._state ? { ...this._state } : undefined;
  }

  start(workItemId: number, workItemTitle: string) {
    if (this._state) {
      this.onWarn('Timer already running. Stop it first.');
      return false;
    }
    this._state = {
      workItemId,
      workItemTitle,
      startTime: this.now(),
      elapsedSeconds: 0,
      isPaused: false,
      isPomodoro: this.pomodoroEnabled,
      pomodoroCount: 0,
    };
    this._persist();
    this._startLoops();
    this.onInfo(`Timer started for #${workItemId}: ${workItemTitle}`);
    this.onState(this.snapshot());
    return true;
  }

  pause(manual = true) {
    if (!this._state || this._state.isPaused) {
      this.onInfo('No active timer to pause');
      return false;
    }
    this._applyElapsed();
    this._state.isPaused = true;
    (this._state as any).pausedTime = this.now();
    if (!manual) (this._state as any).pausedDueToInactivity = true;
    this._persist();
    this.onInfo('Timer paused');
    this.onState(this.snapshot());
    return true;
  }

  resume(fromActivity = false) {
    if (!this._state || !this._state.isPaused) {
      this.onInfo('No paused timer to resume');
      return false;
    }
    const anyState: any = this._state;
    if (anyState.pausedTime) {
      const pausedMs = Math.max(0, this.now() - anyState.pausedTime);
      const adj = Math.min(pausedMs, 24 * 60 * 60 * 1000);
      this._state.startTime += adj;
    }
    this._state.isPaused = false;
    delete anyState.pausedTime;
    if (fromActivity) delete anyState.pausedDueToInactivity;
    this._persist();
    this.onInfo('Timer resumed');
    this.onState(this.snapshot());
    return true;
  }

  activityPing() {
    this._lastActivity = this.now();
    const anyState: any = this._state;
    if (
      this._state &&
      this._state.isPaused &&
      anyState.pausedDueToInactivity &&
      this.autoResumeOnActivity
    ) {
      this.resume(true);
      this.onInfo('Timer resumed due to activity');
    }
  }

  stop(addTimeEntryCallback?: (workItemId: number, hoursDecimal: number) => Promise<any> | any) {
    if (!this._state) {
      this.onInfo('No timer running');
      return null;
    }
    this._applyElapsed();
    // Compute elapsed and enforce configured cap (for forgotten timers)
    const totalSecRaw = this._state.elapsedSeconds;
    const capSec = Math.max(0, Math.floor(this.defaultElapsedLimitHours * 3600));
    let usedSec = totalSecRaw;
    let capApplied = false;
    if (capSec > 0 && totalSecRaw > capSec) {
      usedSec = capSec;
      capApplied = true;
    }
    const hours = parseFloat((usedSec / 3600).toFixed(2));
    const entry: TimeEntry = {
      workItemId: this._state.workItemId,
      startTime: this._state.startTime,
      endTime: this._state.startTime + usedSec * 1000,
      duration: usedSec,
    };
    this._timeEntries.push(entry);
    this._persist();
    const finishedId = this._state.workItemId;
    this._clearState();
    if (addTimeEntryCallback)
      Promise.resolve(addTimeEntryCallback(finishedId, hours)).catch((err) =>
        this.onError((err && err.message) || String(err))
      );
    if (capApplied) {
      this.onWarn(
        `Timer stopped. Elapsed time exceeded configured cap; recorded ${hours.toFixed(
          2
        )} hours (cap: ${this.defaultElapsedLimitHours.toFixed(2)}h).`
      );
    } else {
      this.onInfo(`Timer stopped. Total time: ${hours.toFixed(2)} hours.`);
    }
    return {
      ...entry,
      hoursDecimal: hours,
      capApplied,
      capLimitHours: this.defaultElapsedLimitHours,
    } as any;
  }

  getTimeEntries() {
    return [...this._timeEntries];
  }

  timeReport(period: 'Today' | 'This Week' | 'This Month' | 'All Time') {
    // Base all calculations off the timer's notion of "now" for consistency and testability
    const now = this.now();
    const nowDate = new Date(now);
    let from: number;
    switch (period) {
      case 'Today': {
        const d = new Date(nowDate);
        d.setHours(0, 0, 0, 0);
        from = d.getTime();
        break;
      }
      case 'This Week': {
        const d = new Date(nowDate);
        // getDay(): 0 = Sunday ... 6 = Saturday
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        from = d.getTime();
        break;
      }
      case 'This Month': {
        const d = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        d.setHours(0, 0, 0, 0);
        from = d.getTime();
        break;
      }
      case 'All Time':
      default:
        from = 0;
        break;
    }

    // Include entries that overlap the [from, now] window, not only those that started within it.
    // When aggregating, only count the overlapping portion of each entry to avoid over-attributing
    // time for entries that span across the boundary (e.g., cross midnight).
    const map = new Map<number, { total: number; entries: TimeEntry[] }>();
    for (const e of this._timeEntries) {
      const entryStart = e.startTime;
      const entryEnd =
        typeof (e as any).endTime === 'number'
          ? (e as any).endTime
          : e.startTime + e.duration * 1000;
      const overlapStart = Math.max(entryStart, from);
      const overlapEnd = Math.min(entryEnd, now);
      const overlapMs = Math.max(0, overlapEnd - overlapStart);
      if (overlapMs <= 0) continue; // no overlap with the window

      if (!map.has(e.workItemId)) map.set(e.workItemId, { total: 0, entries: [] });
      const bucket = map.get(e.workItemId)!;
      bucket.total += overlapMs / 1000; // store in seconds to align with previous semantics
      bucket.entries.push(e);
    }
    return { period, from, to: now, buckets: map };
  }

  private _applyElapsed() {
    if (!this._state || this._state.isPaused) return;
    const deltaSec = Math.floor((this.now() - this._state.startTime) / 1000);
    this._state.elapsedSeconds = Math.max(0, Math.min(deltaSec, 86400));
  }

  private _tick() {
    if (this._state && !this._state.isPaused) {
      this._applyElapsed();
      if (this._state.isPomodoro) {
        const mins = this._state.elapsedSeconds / 60;
        if (mins >= 25 && Math.floor(mins) % 30 === 25) {
          this.breakPrompt(() => this.activityPing());
          (this._state as any).pomodoroCount += 1;
        }
      }
      this.onState(this.snapshot());
      this._persist(false);
    }
  }

  private _checkInactivity() {
    if (!this._state || this._state.isPaused) return;
    const idleSec = (this.now() - this._lastActivity) / 1000;
    if (idleSec >= this.inactivityTimeoutSec) {
      this.pause(false);
      this.onWarn(`Timer paused after ${this.inactivityTimeoutSec} seconds of inactivity.`);
    }
  }

  private _startLoops() {
    this._stopLoops();
    this._ticker = setInterval(() => this._tick(), this._tickIntervalMs);
    this._inactivityTicker = setInterval(() => this._checkInactivity(), this._inactivityCheckMs);
  }
  private _stopLoops() {
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = undefined;
    }
    if (this._inactivityTicker) {
      clearInterval(this._inactivityTicker);
      this._inactivityTicker = undefined;
    }
  }
  private _clearState() {
    this._stopLoops();
    this._state = undefined;
    this._persist();
    this.onState(undefined);
  }
  private _persist(updateLastSave = true) {
    try {
      this.persist({
        state: this._state,
        timeEntries: this._timeEntries,
        updateLastSave,
        defaultElapsedLimitHours: this.defaultElapsedLimitHours,
      });
    } catch (e: any) {
      this.onError(e.message || e);
    }
  }

  // Allow updating the cap at runtime when settings change
  setDefaultElapsedLimitHours(hours: number) {
    if (typeof hours === 'number' && Number.isFinite(hours) && hours >= 0) {
      this.defaultElapsedLimitHours = hours;
      this.onInfo(`Default elapsed limit updated to ${hours} hours.`);
    }
  }
}

export default WorkItemTimer;
