import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SupplementAnalyzer from './components/SupplementAnalyzer';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { AuthProvider } from './contexts/AuthContext';
import { StackProvider } from './contexts/StackContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './i18n';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <DarkModeProvider>
          <AuthProvider>
            <StackProvider>
              <SupplementAnalyzer />
            </StackProvider>
          </AuthProvider>
        </DarkModeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
