import React, { useState } from 'react';
import commandsData from '../lib/cosirobcommands.json';
import { addLog } from '../lib/commLogger';

const ControlPanel: React.FC = () => {
  // Local tracked Cartesian position (used for building absolute mv commands)
  const [pos, setPos] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [stepSize, setStepSize] = useState<number>(5);
  const [status, setStatus] = useState<string>('');

  const channel = '00';
  const [readSlot, setReadSlot] = useState<number>(1);
  const [autoReadAfterMove, setAutoReadAfterMove] = useState<boolean>(true);

  const sendCommand = async (cmd: string) => {
    setStatus(`TX: ${cmd}`);
    addLog('tx', cmd);
    try {
      const res = await fetch('http://localhost:8080/api/program/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: cmd }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setStatus(`Send failed: ${txt}`);
        return;
      }
      const data = await res.json();
  const reply: string = data.serial_reply || '';
  if (reply) addLog('rx', reply.trim());

      // If the device replies with position numbers, update local pose automatically
      const nums = reply.match(/-?\d+\.?\d*/g)?.map(n => parseFloat(n));
      if (nums && nums.length >= 3) {
        const [x, y, z] = nums;
        setPos({ x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3) });
        setStatus(prev => `${prev} | OK: ${data.serial_written || data.length || ''} | Reply: ${reply.trim()}`);
      } else {
        setStatus(prev => `${prev} | OK: ${data.serial_written || data.length || ''}` + (reply ? ` | Reply: ${reply.trim()}` : ''));
      }
    } catch (err: any) {
      setStatus(`Network error: ${err?.message || err}`);
    }
  };

  const readPosition = async (slot: number) => {
    const rdCmd = `00 rd ${slot}`;
    setStatus(`RD ${slot} -> requesting`);
    addLog('tx', rdCmd);
    try {
      const res = await fetch('http://localhost:8080/api/position/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setStatus(`Read failed: ${txt}`);
        return;
      }
      const data = await res.json();
  const reply: string = data.serial_reply || '';
  if (reply) addLog('rx', reply.trim());

      // Try to extract three numbers from reply (tolerant parser)
      const nums = reply.match(/-?\d+\.?\d*/g)?.map(n => parseFloat(n));
      if (nums && nums.length >= 3) {
        const [x, y, z] = nums;
        setPos({ x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3) });
        setStatus(`RD ${slot} OK | reply: ${reply.trim()}`);
      } else {
        setStatus(`RD ${slot} reply: ${reply.trim()}`);
      }
    } catch (err: any) {
      setStatus(`Network error: ${err?.message || err}`);
    }
  };

  const doStep = (axis: 'x' | 'y' | 'z', delta: number) => {
    // compute new absolute
    const newPos = { ...pos, [axis]: +(pos[axis] + delta).toFixed(3) };
    setPos(newPos);

    // Build mv command using mv syntax from JSON (mv expects: <channel> mv <x> <y> <z> <rx> <ry> <rz>)
    const mvCmd = `${channel} mv ${newPos.x} ${newPos.y} ${newPos.z} 0 0 0`;
    sendCommand(mvCmd).then(() => {
      // after move, optionally auto-read the configured slot
      if (autoReadAfterMove) {
        // fire-and-forget read
        void readPosition(readSlot);
      }
    });
  };

  const goHome = () => {
    // Use 'ho' if available (home all axes), otherwise move to 0,0,0
    const cmds = (commandsData as any).CosirobCommands;
    if (cmds.ho) {
      sendCommand(`${channel} ho`);
      setPos({ x: 0, y: 0, z: 0 });
    } else {
      doStep('x', -pos.x);
      doStep('y', -pos.y);
      doStep('z', -pos.z);
    }
  };

  return (
    <section className="panel control-panel">
      <div className="panel-header">Manual Controls</div>
      <div className="panel-body control-grid">
        <div className="joystick">
          <div className="joystick-pad">Joystick</div>
        </div>
        <div className="quick-actions">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => doStep('x', stepSize)}>Step +X</button>
            <button onClick={() => doStep('x', -stepSize)}>Step -X</button>
            <button onClick={() => doStep('y', stepSize)}>Step +Y</button>
            <button onClick={() => doStep('y', -stepSize)}>Step -Y</button>
            <button onClick={() => doStep('z', stepSize)}>Step +Z</button>
            <button onClick={() => doStep('z', -stepSize)}>Step -Z</button>
            <button onClick={goHome}>Home</button>
          </div>
        </div>

        <div className="speed-slab">
          <label>Step size (mm)</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value) || 1)}
          />
          <div style={{ marginTop: 8 }}>
            <label>Speed</label>
            <input type="range" min={1} max={100} defaultValue={50} />
          </div>
        </div>

        <div style={{ marginTop: 12, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            Position: X={pos.x} Y={pos.y} Z={pos.z}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ marginRight: 8 }}>Read slot:</label>
            <input type="number" min={0} value={readSlot} onChange={(e) => setReadSlot(Number(e.target.value) || 0)} style={{ width: 80 }} />
            <button onClick={() => readPosition(readSlot)} style={{ marginLeft: 8 }}>Read</button>

            <label style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={autoReadAfterMove} onChange={(e) => setAutoReadAfterMove(e.target.checked)} />
              <span style={{ fontSize: '0.85rem' }}>Auto-read after move</span>
            </label>
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: 6 }}>{status}</div>
        </div>
      </div>
    </section>
  );
};

export default ControlPanel;