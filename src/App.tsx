import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SupplementAnalyzer from './components/SupplementAnalyzer';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StackProvider } from './contexts/StackContext';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <AuthProvider>
          <StackProvider>
            <SupplementAnalyzer />
          </StackProvider>
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
