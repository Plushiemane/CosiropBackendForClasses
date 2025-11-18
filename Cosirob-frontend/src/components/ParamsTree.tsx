import React, { useState, useEffect } from 'react';
import { addLog } from '../lib/commLogger';

interface SerialConfig {
  port_name: string;
  baud_rate: number;
  data_bits: number;
  parity: string;
  stop_bits: number;
  flow_control: string;
}

const ParamsTree: React.FC = () => {
  const [config, setConfig] = useState<SerialConfig>({
    port_name: '/dev/ttyUSB0', // Default Linux port
    baud_rate: 9600,
    data_bits: 8,
    parity: 'none',
    stop_bits: 1,
    flow_control: 'none',
  });
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [osType, setOsType] = useState<'linux' | 'windows'>('linux');

  useEffect(() => {
    loadConfig();
    detectOS();
    loadAvailablePorts();
  }, []);

  const detectOS = async () => {
    try {
      addLog('info', 'Requesting OS type');
      const res = await fetch('http://localhost:8080/api/system/os');
      if (res.ok) {
        const data = await res.json();
        setOsType(data.os);
      }
    } catch (err) {
      console.error('Failed to detect OS:', err);
      addLog('error', `Failed to detect OS: ${err}`);
    }
  };

  const loadAvailablePorts = async () => {
    try {
      addLog('info', 'Requesting available serial ports');
      const res = await fetch('http://localhost:8080/api/serial/ports');
      if (res.ok) {
        const data = await res.json();
        setAvailablePorts(data.ports);
      }
    } catch (err) {
      console.error('Failed to load available ports:', err);
      addLog('error', `Failed to load available ports: ${err}`);
    }
  };

  const getDefaultPorts = () => {
    if (osType === 'linux') {
      return [
        '/dev/ttyUSB0',
        '/dev/ttyUSB1',
        '/dev/ttyACM0',
        '/dev/ttyACM1',
        '/dev/pts/3',
        '/dev/pts/4'
      ];
    }
    return ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6'];
  };

  const loadConfig = async () => {
    try {
      addLog('info', 'Requesting config');
      const res = await fetch('http://localhost:8080/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      addLog('error', `Failed to load config: ${err}`);
    }
  };

  const handleSave = async () => {
    setStatus('');
    try {
      addLog('tx', `Save config ${JSON.stringify(config)}`);
      const res = await fetch('http://localhost:8080/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Configuration saved');
      setEditing(false);
      await loadConfig();
      addLog('info', 'Configuration saved');
    } catch {
      setStatus('Save failed: ');
      addLog('error', 'Save failed');
    }
  };

  return (
    <section className="panel params-tree">
      <div className="panel-header">
        3 — Robot Parameters ({osType === 'linux' ? 'Linux' : 'Windows'})
        <button
          onClick={() => setEditing(!editing)}
          style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div className="panel-body">
        <div className="params-form">
          <div className="param-group">
            <label>Port:</label>
            {editing ? (
              <select
                value={config.port_name}
                onChange={(e) => setConfig({ ...config, port_name: e.target.value })}
              >
                {availablePorts.length > 0 ? (
                  availablePorts.map(port => (
                    <option key={port} value={port}>{port}</option>
                  ))
                ) : (
                  getDefaultPorts().map(port => (
                    <option key={port} value={port}>{port}</option>
                  ))
                )}
              </select>
            ) : (
              <span>{config.port_name}</span>
            )}
          </div>

          <div className="param-group">
            <label>Baud Rate:</label>
            {editing ? (
              <select
                value={config.baud_rate}
                onChange={(e) => setConfig({ ...config, baud_rate: parseInt(e.target.value) })}
              >
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="57600">57600</option>
                <option value="115200">115200</option>
              </select>
            ) : (
              <span>{config.baud_rate}</span>
            )}
          </div>

          <div className="param-group">
            <label>Data Bits:</label>
            {editing ? (
              <select
                value={config.data_bits}
                onChange={(e) => setConfig({ ...config, data_bits: parseInt(e.target.value) })}
              >
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            ) : (
              <span>{config.data_bits}</span>
            )}
          </div>

          <div className="param-group">
            <label>Parity:</label>
            {editing ? (
              <select
                value={config.parity}
                onChange={(e) => setConfig({ ...config, parity: e.target.value })}
              >
                <option value="none">None</option>
                <option value="even">Even</option>
                <option value="odd">Odd</option>
              </select>
            ) : (
              <span>{config.parity}</span>
            )}
          </div>

          <div className="param-group">
            <label>Stop Bits:</label>
            {editing ? (
              <select
                value={config.stop_bits}
                onChange={(e) => setConfig({ ...config, stop_bits: parseInt(e.target.value) })}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            ) : (
              <span>{config.stop_bits}</span>
            )}
          </div>

          <div className="param-group">
            <label>Flow Control:</label>
            {editing ? (
              <select
                value={config.flow_control}
                onChange={(e) => setConfig({ ...config, flow_control: e.target.value })}
              >
                <option value="none">None</option>
                <option value="rts_cts">RTS/CTS</option>
                <option value="xon_xoff">XON/XOFF</option>
              </select>
            ) : (
              <span>{config.flow_control}</span>
            )}
          </div>

          {editing && (
            <button onClick={handleSave} className="btn-save">
              Save Configuration
            </button>
          )}
          {status && <div className="param-status">{status}</div>}
        </div>
      </div>
    </section>
  );
};

export default ParamsTree;