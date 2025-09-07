import React, { useState, useEffect } from 'react';
import { Recipe } from '@/types';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RecipeLibraryGrid } from '@/components/recipe/RecipeLibraryGrid';
import { RecipeDetail } from '@/components/recipe/RecipeDetail';
import { RecipeEdit } from '@/components/recipe/RecipeEdit';
import { LocalRecipeSearch } from '@/components/recipe/LocalRecipeSearch';
import { RecipeImporter } from '@/components/scraping/RecipeImporter';
import { SimpleRecipeImporter } from '@/components/scraping/SimpleRecipeImporter';
import { RecipePreview } from '@/components/recipe/RecipePreview';

// Detect if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
};

export const SimpleHomePage: React.FC = () => {
  const { checkServerHealth, deleteLocalRecipe, loadLocalRecipes, updateLocalRecipe } = useLocalRecipes();
  const [activeSection, setActiveSection] = useState<'recipes' | 'import'>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showSimpleImporter, setShowSimpleImporter] = useState(false);
  const [view, setView] = useState<'library' | 'detail' | 'edit' | 'preview'>('library');
  const [scrapedRecipe, setScrapedRecipe] = useState<Recipe | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  
  useEffect(() => {
    // Check server health once when the main app loads
    checkServerHealth();
  }, []);

  const handleSectionChange = (section: 'recipes' | 'import') => {
    setActiveSection(section);
    if (section === 'import') {
      setShowSimpleImporter(true);
    } else {
      setShowImporter(false);
      setShowSimpleImporter(false);
      setView('library');
      setSelectedRecipe(null);
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('detail');
  };

  const handleBackToLibrary = () => {
    setSelectedRecipe(null);
    setScrapedRecipe(null);
    setView('library');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('edit');
  };

  const handleEditSave = async (updatedRecipe: Partial<Recipe>) => {
    if (!selectedRecipe) return;

    console.log('handleEditSave called with:', updatedRecipe);
    console.log('Recipe ID being updated:', selectedRecipe.id);

    setIsEditLoading(true);
    try {
      const result = await updateLocalRecipe(selectedRecipe.id, updatedRecipe);
      console.log('updateLocalRecipe result:', result);
      
      if (result) {
        setSelectedRecipe(result);
        setView('detail');
        await loadLocalRecipes(); // Refresh the library
      } else {
        console.error('updateLocalRecipe returned null/undefined');
        alert('Failed to update recipe. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update recipe:', error);
      alert('Failed to update recipe. Please try again.');
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setView('detail');
  };

  const handlePreviewClose = async () => {
    // If the user closes the preview, delete the auto-saved recipe
    if (scrapedRecipe?.id) {
      try {
        await deleteLocalRecipe(scrapedRecipe.id);
      } catch (error) {
        console.error('Failed to delete auto-saved recipe:', error);
      }
    }
    // Close the preview without any refresh
    setScrapedRecipe(null);
    setView('library');
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await deleteLocalRecipe(recipe.id);
      // Go back to library after deletion
      handleBackToLibrary();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  const handleRecipeImported = async (recipe: Recipe) => {
    setShowImporter(false);
    setShowSimpleImporter(false);
    setActiveSection('recipes');
    
    // Show the scraped recipe in preview mode
    setScrapedRecipe(recipe);
    setView('preview');
  };

  const handleRecipeDownload = async () => {
    // This will be called when user clicks "Download Recipe" from preview
    // Reload local recipes to refresh the UI
    await loadLocalRecipes();
    setView('library');
  };

  const handleImporterClose = () => {
    setShowImporter(false);
    setActiveSection('recipes');
  };

  const handleSimpleImporterClose = () => {
    setShowSimpleImporter(false);
    setActiveSection('recipes');
  };

  const renderMainContent = () => {

    if (view === 'detail' && selectedRecipe) {
      return (
        <div className="h-full overflow-y-auto">
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={handleBackToLibrary}
            onDelete={handleDeleteRecipe}
            onEdit={handleEditRecipe}
            className="m-6"
          />
        </div>
      );
    }

    if (view === 'edit' && selectedRecipe) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="m-6">
            <RecipeEdit
              recipe={selectedRecipe}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
              isLoading={isEditLoading}
            />
          </div>
        </div>
      );
    }

    if (activeSection === 'recipes') {
      return (
        <div className="h-full overflow-y-auto">
          {/* Search Section */}
          <div className="p-6 pb-4">
            <LocalRecipeSearch />
          </div>
          
          {/* Recipe Grid */}
          <div className="px-6 pb-6">
            <RecipeLibraryGrid 
              onRecipeClick={handleRecipeClick}
            />
          </div>
        </div>
      );
    }

    // Import section - show a placeholder when no browser is open
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Browse & Import Recipes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            Import recipes from any recipe website using our built-in extractor. Works with AllRecipes, Food.com, BBC Good Food, and hundreds more sites.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowSimpleImporter(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg"
            >
              🥄 Import Recipe from URL
            </button>
            <button
              onClick={() => setShowImporter(true)}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-lg"
            >
              📥 Import from Spoonacular
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Direct URL scraping works with most recipe websites
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-25 via-amber-25 to-orange-50">
      {/* Header */}
      <Header />
      
      <div className="flex h-[calc(100vh-6rem)]">
        {/* Sidebar */}
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 h-full overflow-hidden">
          {renderMainContent()}
        </div>
      </div>

      {/* Simple Recipe Importer */}
      {showSimpleImporter && (
        <SimpleRecipeImporter
          onRecipeScraped={handleRecipeImported}
          onClose={handleSimpleImporterClose}
        />
      )}

      {/* Recipe Preview Modal */}
      {view === 'preview' && scrapedRecipe && (
        <RecipePreview
          recipe={scrapedRecipe}
          onClose={handlePreviewClose}
          onDownload={handleRecipeDownload}
        />
      )}

      {/* Import Modal */}
      {showImporter && (
        <RecipeImporter
          onRecipeImported={handleRecipeImported}
          onClose={handleImporterClose}
        />
      )}
    </div>
  );
};