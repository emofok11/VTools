import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AuthGate from './components/AuthGate';
import Dashboard from './components/Dashboard';
import TemplateLibrary from './components/TemplateLibrary';
import UserSettings from './components/UserSettings';
import UserManagement from './components/UserManagement';

type AppView = 'dashboard' | 'ui-delivery-template' | 'user-settings' | 'user-management';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const handleEnterModule = (moduleId: string) => {
    if (moduleId === 'ui-delivery-template') {
      setCurrentView('ui-delivery-template');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleOpenSettings = () => {
    setCurrentView('user-settings');
  };

  const handleOpenUserManagement = () => {
    setCurrentView('user-management');
  };

  return (
    <AuthProvider>
      <AuthGate>
        {currentView === 'dashboard' && (
          <Dashboard onEnterModule={handleEnterModule} onOpenSettings={handleOpenSettings} onOpenUserManagement={handleOpenUserManagement} />
        )}
        {currentView === 'ui-delivery-template' && (
          <TemplateLibrary onBackToDashboard={handleBackToDashboard} />
        )}
        {currentView === 'user-settings' && (
          <UserSettings onBack={handleBackToDashboard} />
        )}
        {currentView === 'user-management' && (
          <UserManagement onBack={handleBackToDashboard} />
        )}
      </AuthGate>
    </AuthProvider>
  );
};

export default App;