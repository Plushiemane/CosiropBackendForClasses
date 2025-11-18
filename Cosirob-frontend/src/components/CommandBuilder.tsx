import React, { useState } from 'react';
import commandsData from '../lib/cosirobcommands.json';
import { type CommandsData, type CosirobCommands } from '../types/commands';

interface CommandBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCommand: (command: string) => void;
}

const CommandBuilder: React.FC<CommandBuilderProps> = ({ isOpen, onClose, onAddCommand }) => {
  const [selectedCommand, setSelectedCommand] = useState<keyof CosirobCommands | ''>('');
  const [channel, setChannel] = useState<string>('00');
  const [params, setParams] = useState<string[]>([]);

  const commands = (commandsData as CommandsData).CosirobCommands;
  const commandList = Object.entries(commands) as [keyof CosirobCommands, typeof commands[keyof CosirobCommands]][];

  const getParamCount = (syntax: string): number => {
    return (syntax.match(/<[^>]+>/g) || []).length - 1; // -1 to exclude channel
  };

  const handleCommandSelect = (cmdKey: keyof CosirobCommands) => {
    setSelectedCommand(cmdKey);
    setParams(Array(getParamCount(commands[cmdKey].syntax)).fill(''));
  };

  const handleParamChange = (index: number, value: string) => {
    const newParams = [...params];
    newParams[index] = value;
    setParams(newParams);
  };

  const handleAddCommand = () => {
    if (!selectedCommand) return;
    
    const fullCommand = `${channel} ${selectedCommand} ${params.join(' ')}`.trim();
    onAddCommand(fullCommand);
    
    // Reset form
    setSelectedCommand('');
    setParams([]);
  };

  if (!isOpen) return null;

  return (
    <div className="command-builder-overlay">
      <div className="command-builder-card">
        <div className="command-builder-header">
          <h3>Add Command</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="command-builder-body">
          <div className="command-select">
            <label>Command:</label>
            <select 
              value={selectedCommand} 
              onChange={(e) => handleCommandSelect(e.target.value as keyof CosirobCommands)}
            >
              <option value="">Select command...</option>
              {commandList.map(([key, cmd]) => (
                <option key={key} value={key}>
                  {key} - {cmd.description}
                </option>
              ))}
            </select>
          </div>

          {selectedCommand && (
            <>
              <div className="command-params">
                <div className="param-group">
                  <label>Channel:</label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="00"
                  />
                </div>

                {params.map((param, index) => {
                  const syntax = (commands[selectedCommand].syntax);
                  const paramNames = syntax.match(/<[^>]+>/g) || [];
                  const paramName = paramNames[index + 1]?.replace(/[<>]/g, '') || '';

                  return (
                    <div key={index} className="param-group">
                      <label>{paramName}:</label>
                      <input
                        type="text"
                        value={param}
                        onChange={(e) => handleParamChange(index, e.target.value)}
                        placeholder={paramName}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="command-example">
                <small>Example: {commands[selectedCommand].example}</small>
              </div>
            </>
          )}
        </div>

        <div className="command-builder-footer">
          <button onClick={onClose}>Cancel</button>
          <button 
            onClick={handleAddCommand}
            disabled={!selectedCommand || params.some(p => !p)}
          >
            Add Command
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommandBuilder;