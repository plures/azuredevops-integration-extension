/* STAGED FOR DELETION - snapshot preserved in .delete/src.timerHarness.js.txt
   Reason: Development harness for the timer. It is not part of the extension runtime and should be converted to unit tests or moved to dev tooling.
   Action: Convert relevant flows into tests/timer.test.ts and remove this harness in a follow-up cleanup commit.
*/

// Simple harness to exercise WorkItemTimer logic stand-alone.
const WorkItemTimer = require('./timer');

const log = (...a) => console.log('[HARNESS]', ...a);

const memoryStore = { last: undefined };

const timer = new WorkItemTimer({
  onState: (s) => log('STATE', s),
  onInfo: (m) => log('INFO', m),
  onWarn: (m) => log('WARN', m),
  onError: (m) => log('ERROR', m),
  persist: ({ state, timeEntries }) => { memoryStore.last = { state, timeEntries, ts: Date.now() }; },
  restorePersisted: () => memoryStore.last || {},
  inactivityTimeoutSec: 5, // short for demo
  pomodoroEnabled: true,
  breakPrompt: (resumeCb) => { log('Pomodoro break suggested'); setTimeout(() => { log('Auto-resume after break simulation'); resumeCb(); }, 1000); }
});

(async () => {
  timer.start(123, 'Demo Work Item');
  setTimeout(() => { timer.activityPing(); }, 1500);
  setTimeout(() => { timer.pause(); }, 2500);
  setTimeout(() => { timer.resume(); }, 4000);
  setTimeout(() => { const result = timer.stop(); log('STOP RESULT', result); }, 7000);
})();
