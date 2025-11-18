import React from 'react';
import RobotView from '../components/RobotView';
import ProgramEditor from '../components/ProgramEditor';
import ParamsTree from '../components/ParamsTree';
import PositionsList from '../components/PositionsList';
import CommMonitor from '../components/CommMonitor';
import ControlPanel from '../components/ControlPanel';

const Home: React.FC = () => {
  return (
    <main className="workspace">
      <div className="left-column">
        <RobotView />
        <ControlPanel />
      </div>

      <div className="right-column">
        <ProgramEditor />
        <ParamsTree />
        <PositionsList />
        <CommMonitor />
      </div>
    </main>
  );
};

export default Home;