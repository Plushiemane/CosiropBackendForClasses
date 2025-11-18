import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import './styles/index.css';

const App: React.FC = () => {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('dark-theme');
    return saved ? saved === '1' : true;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('dark-theme', dark ? '1' : '0');
  }, [dark]);

  return (
    
    <div className="app-root">
      
      <Header dark={dark} setDark={setDark} />
      <Home />
    </div>
  );
};

export default App;