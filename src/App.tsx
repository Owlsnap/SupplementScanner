import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SupplementAnalyzer from './components/SupplementAnalyzer';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { AuthProvider } from './contexts/AuthContext';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <AuthProvider>
          <SupplementAnalyzer />
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
