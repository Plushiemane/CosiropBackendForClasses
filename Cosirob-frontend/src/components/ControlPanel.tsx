import React, { useState } from 'react';
import commandsData from '../lib/cosirobcommands.json';
import { addLog } from '../lib/commLogger';
import "./EmergencyStop.css";

const ControlPanel: React.FC = () => {
  // Local tracked Cartesian position (used for building absolute mv commands)
  const [pos, setPos] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [stepSize, setStepSize] = useState<number>(5);
  const [status, setStatus] = useState<string>('');

  const [channel, setChannel] = useState<string>('00');
  const [readSlot, setReadSlot] = useState<number>(1);
  const [autoReadAfterMove, setAutoReadAfterMove] = useState<boolean>(true);

  const EmergencyStop = () => {
    const estopCmd = `${channel} ST`;
    setStatus('EMERGENCY STOP SENT!');
    sendCommand(estopCmd);
  };
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
      <button className='emergency-stop-button' onClick={EmergencyStop}>
        Emergency Stop
      </button>
      <div className="panel-header">Manual Controls</div>
      <div className="panel-body">
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: '16px', fontWeight: '600' }}>Channel:</label>
          <select 
            value={channel} 
            onChange={(e) => setChannel(e.target.value)}
            style={{ fontSize: '16px', padding: '8px', borderRadius: '4px' }}
          >
            <option value="00">00 - System</option>
            <option value="10">10 - Motion</option>
            <option value="20">20 - Motion</option>
            <option value="30">30 - I/O</option>
            <option value="40">40 - Gripper</option>
            <option value="50">50 - Position</option>
          </select>
        </div>

        <div className="quick-actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => doStep('x', stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step +X</button>
            <button onClick={() => doStep('x', -stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step -X</button>
            <button onClick={() => doStep('y', stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step +Y</button>
            <button onClick={() => doStep('y', -stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step -Y</button>
            <button onClick={() => doStep('z', stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step +Z</button>
            <button onClick={() => doStep('z', -stepSize)} style={{ fontSize: '16px', padding: '10px 16px' }}>Step -Z</button>
            <button onClick={goHome} style={{ fontSize: '16px', padding: '10px 16px' }}>Home</button>
          </div>
        </div>

        <div className="speed-slab">
          <label style={{ fontSize: '16px', fontWeight: '600' }}>Step size (mm)</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value) || 1)}
            style={{ fontSize: '16px', padding: '8px' }}
          />
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '16px', fontWeight: '600' }}>Speed</label>
            <input type="range" min={1} max={100} defaultValue={50} style={{ height: '8px' }} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '18px', color: 'var(--muted)', fontWeight: '600', marginBottom: '12px' }}>
            Position: X={pos.x} Y={pos.y} Z={pos.z}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: '16px', fontWeight: '600' }}>Read slot:</label>
            <input type="number" min={0} value={readSlot} onChange={(e) => setReadSlot(Number(e.target.value) || 0)} style={{ width: 100, fontSize: '16px', padding: '8px' }} />
            <button onClick={() => readPosition(readSlot)} style={{ fontSize: '16px', padding: '8px 16px' }}>Read</button>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={autoReadAfterMove} onChange={(e) => setAutoReadAfterMove(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              <span style={{ fontSize: '16px' }}>Auto-read after move</span>
            </label>
          </div>
          <div style={{ fontSize: '16px', marginTop: 12, fontWeight: '500' }}>{status}</div>
        </div>
      </div>
      
      
    </section>
  );
};

export default ControlPanel;