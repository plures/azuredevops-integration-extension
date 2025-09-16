import { WorkItemTimerState, TimeEntry } from './types';

export interface TimerPersistPayload { state?: WorkItemTimerState; timeEntries?: TimeEntry[]; updateLastSave?: boolean; }
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
    this._lastActivity = this.now();
  }

  loadFromPersisted() {
    const { state, timeEntries } = this.restorePersisted() || {};
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

  snapshot() { return this._state ? { ...this._state } : undefined; }

  start(workItemId: number, workItemTitle: string) {
    if (this._state) { this.onWarn('Timer already running. Stop it first.'); return false; }
    this._state = { workItemId, workItemTitle, startTime: this.now(), elapsedSeconds: 0, isPaused: false, isPomodoro: this.pomodoroEnabled, pomodoroCount: 0 };
    this._persist();
    this._startLoops();
    this.onInfo(`Timer started for #${workItemId}: ${workItemTitle}`);
    this.onState(this.snapshot());
    return true;
  }

  pause(manual = true) {
    if (!this._state || this._state.isPaused) { this.onInfo('No active timer to pause'); return false; }
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
    if (!this._state || !this._state.isPaused) { this.onInfo('No paused timer to resume'); return false; }
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
    if (this._state && this._state.isPaused && anyState.pausedDueToInactivity && this.autoResumeOnActivity) {
      this.resume(true);
      this.onInfo('Timer resumed due to activity');
    }
  }

  stop(addTimeEntryCallback?: (workItemId: number, hoursDecimal: number) => Promise<any> | any) {
    if (!this._state) { this.onInfo('No timer running'); return null; }
    this._applyElapsed();
    const totalSec = this._state.elapsedSeconds;
    const hours = parseFloat((totalSec / 3600).toFixed(2));
    const entry: TimeEntry = { workItemId: this._state.workItemId, startTime: this._state.startTime, endTime: this.now(), duration: totalSec };
    this._timeEntries.push(entry);
    this._persist();
    const finishedId = this._state.workItemId;
    this._clearState();
    if (addTimeEntryCallback) Promise.resolve(addTimeEntryCallback(finishedId, hours)).catch(err => this.onError((err && err.message) || String(err)));
    this.onInfo(`Timer stopped. Total time: ${hours.toFixed(2)} hours.`);
    return { ...entry, hoursDecimal: hours };
  }

  getTimeEntries() { return [...this._timeEntries]; }

  timeReport(period: 'Today' | 'This Week' | 'This Month' | 'All Time') {
    const now = this.now();
    let from: number;
    switch (period) {
      case 'Today': from = new Date().setHours(0,0,0,0); break;
      case 'This Week': { const d = new Date(); d.setDate(d.getDate() - d.getDay()); from = d.setHours(0,0,0,0); break; }
      case 'This Month': from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(); break;
      case 'All Time': default: from = 0; break;
    }
    const filtered = this._timeEntries.filter(e => e.startTime >= from && e.startTime <= now);
    const map = new Map<number, { total: number; entries: TimeEntry[] }>();
    for (const e of filtered) {
      if (!map.has(e.workItemId)) map.set(e.workItemId, { total: 0, entries: [] });
      const bucket = map.get(e.workItemId)!;
      bucket.total += e.duration;
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
    if (this._ticker) { clearInterval(this._ticker); this._ticker = undefined; }
    if (this._inactivityTicker) { clearInterval(this._inactivityTicker); this._inactivityTicker = undefined; }
  }
  private _clearState() {
    this._stopLoops();
    this._state = undefined;
    this._persist();
    this.onState(undefined);
  }
  private _persist(updateLastSave = true) {
    try { this.persist({ state: this._state, timeEntries: this._timeEntries, updateLastSave }); } catch (e: any) { this.onError(e.message || e); }
  }
}

export default WorkItemTimer;
