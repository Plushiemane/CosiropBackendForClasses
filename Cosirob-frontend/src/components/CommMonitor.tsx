import React, { useState, useEffect, useRef } from 'react';
import { subscribe, getHistory, addLog, clearHistory } from '../lib/commLogger';
import type { LogEntry } from '../lib/commLogger';

const CommMonitor: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(() => getHistory());
  const [command, setCommand] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [portName, setPortName] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Subscribe to shared logger
  useEffect(() => {
    const unsub = subscribe(e => setLogs(prev => [...prev, e]));
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!command.trim() || loading) return;

    const cmdToSend = command.trim();
    setCommand('');
    setLoading(true);

    // Log outgoing
    addLog('tx', cmdToSend);

    // Warn if command looks like it lacks a channel prefix (e.g. "00 ")
    if (!/^\d{2}\s/.test(cmdToSend)) {
      addLog('warning', 'Command does not start with a two-digit channel prefix (e.g. "00 ")');
    }

    try {
      const res = await fetch('http://localhost:8080/api/program/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: cmdToSend }),
      });

      if (!res.ok) {
        const errText = await res.text();
        addLog('error', `Send failed: ${errText}`);
        setConnected(false);
        setLoading(false);
        return;
      }

      // Try parse JSON, fallback to text
      let data: any = undefined;
      try {
        data = await res.json();
      } catch (e) {
        const txt = await res.text();
        addLog('info', `Backend response: ${txt}`);
      }

      if (data) {
        // Update connection status
        if (data.serial_port) {
          setPortName(data.serial_port);
          setConnected(true);
          addLog('info', `Connected to ${data.serial_port}`);
        }

        // Log bytes written
        if (data.serial_written) {
          addLog('info', `Sent ${data.serial_written} bytes`);
        }

        // Log serial reply
        if (data.serial_reply) {
          addLog('rx', data.serial_reply.trim());
        }
      }

    } catch (err: any) {
      addLog('error', `Network error: ${err?.message || err}`);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // handleKeyDown is used directly in JSX

  const getLogClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'tx': return 'log-line log-tx';
      case 'rx': return 'log-line log-rx';
      case 'error': return 'log-line log-error';
      default: return 'log-line log-info';
    }
  };

  const getLogPrefix = (type: LogEntry['type']) => {
    switch (type) {
      case 'tx': return 'TX';
      case 'rx': return 'RX';
      case 'error': return 'ERR';
      default: return 'INFO';
    }
  };

  const clearLogs = () => {
    clearHistory();
    setLogs([]);
  };

  return (
    <section className="panel comm-monitor">
      <div className="panel-header">
        5 — Communication Monitor
        {connected && portName && (
          <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: '0.85rem' }}>
            ● {portName}
          </span>
        )}
      </div>
      <div className="panel-body">
        <div className="monitor-log">
          {logs.length === 0 && (
            <div className="log-line log-info">[INFO] Waiting for commands...</div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className={getLogClass(log.type)}>
              <span className="log-time">{log.timestamp}</span>
              <span className="log-type">[{getLogPrefix(log.type)}]</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
        <div className="monitor-controls">
          <button onClick={clearLogs} className="btn-clear">Clear</button>
        </div>
        <div className="monitor-input">
          <input
            placeholder="Send raw command..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </section>
  );
};

export default CommMonitor;