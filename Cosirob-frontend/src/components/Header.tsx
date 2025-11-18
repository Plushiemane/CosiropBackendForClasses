import React from 'react';
type Props = {
  dark: boolean;
  setDark: (v: boolean) => void;
};

const Header: React.FC<Props> = ({ dark, setDark }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>Cosirob Control</h1>
        <small>Robot steering frontend</small>
      </div>
      <div className="header-right">
        <label className="theme-toggle">
          <input
            type="checkbox"
            checked={dark}
            onChange={(e) => setDark(e.target.checked)}
          />
          <span>{dark ? 'Dark' : 'Light'}</span>
        </label>
      </div>
    </header>
  );
};

export default Header;