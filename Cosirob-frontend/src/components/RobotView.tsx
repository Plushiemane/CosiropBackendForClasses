import React from 'react';
import RobotModel from './RobotModel';

const RobotView: React.FC = () => {
  return (
    <section className="panel robot-view">
      <div className="panel-header">
        1 — Robot Visualization
      </div>
      <div className="panel-body">
        <RobotModel />
      </div>
    </section>
  );
};

export default RobotView;