import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SupplementAnalyzer from './components/SupplementAnalyzer';
import { DarkModeProvider } from './contexts/DarkModeContext';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <SupplementAnalyzer />
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
