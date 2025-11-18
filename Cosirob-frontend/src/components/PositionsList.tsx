import React from 'react';
import { addLog } from '../lib/commLogger';

type Position = { id: string; name: string; x: number; y: number; z: number };

const STORAGE_KEY = 'cosirob_positions_v1';

const defaultPositions: Position[] = [
  { id: 'home', name: 'Home', x: 0, y: 0, z: 0 },
  { id: 'pick', name: 'Pick', x: 120, y: 45, z: -10 },
];

const PositionsList: React.FC = () => {
  const [positions, setPositions] = React.useState<Position[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Position[];
    } catch (e) {
      // ignore
    }
    return defaultPositions;
  });

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Position | null>(null);

  const saveToStorage = (items: Position[]) => {
    setPositions(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
  };

  const sendMv = async (pos: { x: number; y: number; z: number }) => {
    const cmd = `00 mv ${pos.x} ${pos.y} ${pos.z} 0 0 0`;
    try { addLog('tx', cmd); } catch {};
    try {
      const res = await fetch('http://localhost:8080/api/program/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: cmd }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
        console.log('Move sent, reply:', data.serial_reply || data);
        try { if (data.serial_reply) addLog('rx', data.serial_reply); } catch {}
    } catch (err) {
      console.error('sendMv error', err);
      try { addLog('error', `sendMv error: ${(err as any).toString()}`); } catch {}
      alert('Failed to send move: ' + (err as any).toString());
    }
  };

  const goToPosition = (pos: Position) => {
    // send absolute mv to backend
    sendMv({ x: pos.x, y: pos.y, z: pos.z });
  };

  const handleAdd = () => {
    setEditing({ id: Date.now().toString(), name: '', x: 0, y: 0, z: 0 });
    setIsModalOpen(true);
  };

  const handleEdit = (p: Position) => {
    setEditing(p);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete position?')) return;
    saveToStorage(positions.filter(p => p.id !== id));
  };

  const handleModalSave = (p: Position) => {
    const exists = positions.findIndex(x => x.id === p.id);
    let next: Position[];
    if (exists >= 0) {
      next = positions.slice();
      next[exists] = p;
    } else {
      next = [...positions, p];
    }
    saveToStorage(next);
    setIsModalOpen(false);
    setEditing(null);
  };

  return (
    <section className="panel positions-list">
      <div className="panel-header">
        4 — Positions List
        <button onClick={handleAdd} style={{ marginLeft: 8 }}>Add</button>
      </div>
      <div className="panel-body">
        <table className="positions-table">
          <thead>
            <tr><th>Name</th><th>X</th><th>Y</th><th>Z</th><th>Action</th></tr>
          </thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.x}</td>
                <td>{p.y}</td>
                <td>{p.z}</td>
                <td>
                  <button onClick={() => goToPosition(p)}>Go</button>
                  <button onClick={() => handleEdit(p)} style={{ marginLeft: 6 }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ marginLeft: 6 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editing && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{positions.find(x => x.id === editing.id) ? 'Edit' : 'Add'} Position</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Name:</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <label>X:</label>
              <input type="number" value={editing.x} onChange={(e) => setEditing({ ...editing, x: Number(e.target.value) })} />
              <label>Y:</label>
              <input type="number" value={editing.y} onChange={(e) => setEditing({ ...editing, y: Number(e.target.value) })} />
              <label>Z:</label>
              <input type="number" value={editing.z} onChange={(e) => setEditing({ ...editing, z: Number(e.target.value) })} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => handleModalSave(editing)}>Save</button>
              <button onClick={() => { setIsModalOpen(false); setEditing(null); }} style={{ marginLeft: 8 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PositionsList;
