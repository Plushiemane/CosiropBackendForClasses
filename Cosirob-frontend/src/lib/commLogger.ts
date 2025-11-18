export type LogType = 'info' | 'tx' | 'rx' | 'error' | 'warning';

export interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
}

const subscribers: Array<(e: LogEntry) => void> = [];
const history: LogEntry[] = [];
const MAX_HISTORY = 1000;

function now() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export function subscribe(cb: (e: LogEntry) => void) {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

export function addLog(type: LogType, message: string) {
  const entry: LogEntry = { timestamp: now(), type, message };
  history.push(entry);
  if (history.length > MAX_HISTORY) history.shift();
  subscribers.slice().forEach(s => s(entry));
}

export function getHistory() {
  return history.slice();
}

export function clearHistory() {
  history.length = 0;
  subscribers.slice().forEach(s => s({ timestamp: now(), type: 'info', message: 'Log cleared' }));
}