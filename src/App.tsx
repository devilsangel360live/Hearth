import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, RecipeProvider } from '@/contexts';
import { LocalRecipeProvider, useLocalRecipes } from '@/contexts/LocalRecipeContext';
import { SimpleHomePage } from '@/components/home/SimpleHomePage';

const AppContent: React.FC = () => {
  const { checkServerHealth } = useLocalRecipes();

  useEffect(() => {
    // Check if local recipe server is available on app start
    checkServerHealth();
  }, [checkServerHealth]);

  return (
    <div className="min-h-screen">
      <SimpleHomePage />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <RecipeProvider>
        <LocalRecipeProvider>
          <Router>
            <AppContent />
          </Router>
        </LocalRecipeProvider>
      </RecipeProvider>
    </ThemeProvider>
  );
};

export default App;