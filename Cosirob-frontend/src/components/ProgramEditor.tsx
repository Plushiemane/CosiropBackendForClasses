import React, { useState } from 'react';
import CommandBuilder from './CommandBuilder';
import { addLog } from '../lib/commLogger';

const ProgramEditor: React.FC = () => {
  const [program, setProgram] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showCommandBuilder, setShowCommandBuilder] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('http://localhost:8080/api/program');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProgram(data.program || '');
      setStatus('Loaded program');
      addLog('info', 'Loaded program from backend');
    } catch {
      setStatus('Load failed: ');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('http://localhost:8080/api/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Program saved');
      addLog('info', 'Program saved to backend');
    } catch {
      setStatus('Save failed: ');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setStatus('');
    try {
      // Send raw program text (backend extracts and sends to serial)
      addLog('tx', program);
      const res = await fetch('http://localhost:8080/api/program/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program }), // backend decodes JSON and writes only p.Program to COM
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.serial_reply) addLog('rx', data.serial_reply);
      setStatus(`Sent ${data.serial_written || data.length} bytes to ${data.serial_port || 'robot'}` + 
                (data.serial_reply ? ` | Reply: ${data.serial_reply}` : ''));
    } catch {
      setStatus('Send failed: ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommand = (command: string) => {
    setProgram(prev => {
      if (prev) {
        return prev + '\n' + command;
      }
      return command;
    });
    setShowCommandBuilder(false);
  };

  return (
    <section className="panel program-editor">
      <div className="panel-header">
        2 — Program Listing / Editor
        <button 
          onClick={() => setShowCommandBuilder(true)}
          style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '0.85rem' }}
        >
          Add Command
        </button>
      </div>
      <div className="panel-body">
        <textarea
          className="program-textarea"
          placeholder="Write program here..."
          value={program}
          onChange={(e) => setProgram(e.target.value)}
        />
        <div className="panel-actions">
          <button onClick={handleLoad} disabled={loading}>
            Load
          </button>
          <button onClick={handleSave} disabled={loading}>
            Save
          </button>
          <button onClick={handleSend} disabled={loading}>
            Send to Robot
          </button>
        </div>
        {status && <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>{status}</div>}
      </div>

      <CommandBuilder 
        isOpen={showCommandBuilder}
        onClose={() => setShowCommandBuilder(false)}
        onAddCommand={handleAddCommand}
      />
    </section>
  );
};

export default ProgramEditor;