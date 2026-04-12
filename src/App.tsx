import React from 'react';
import SupplementAnalyzer from './components/SupplementAnalyzer';
import { DarkModeProvider } from './contexts/DarkModeContext';

function App(): JSX.Element {
  return (
    <DarkModeProvider>
      <SupplementAnalyzer />
    </DarkModeProvider>
  );
}

export default App;
