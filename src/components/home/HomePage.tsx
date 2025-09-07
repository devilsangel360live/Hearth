import React, { useEffect, useState } from 'react';
import { Recipe } from '@/types';
import { useRecipes } from '@/contexts';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';
import { RecipeSearch } from '@/components/recipe/RecipeSearch';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { RecipeDetail } from '@/components/recipe/RecipeDetail';
import { RecipeCardSkeleton, RecipeDetailSkeleton } from '@/components/common/LoadingSkeleton';
import { RecipeImporter } from '@/components/scraping/RecipeImporter';
import { SimpleRecipeImporter } from '@/components/scraping/SimpleRecipeImporter';
import { RecipePreview } from '@/components/recipe/RecipePreview';

export const HomePage: React.FC = () => {
  const { state, searchRecipes, loadMoreRecipes, loadFeaturedRecipes, loadRandomRecipes } = useRecipes();
  const { state: localState, loadLocalRecipes } = useLocalRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [view, setView] = useState<'search' | 'detail' | 'preview'>('search');
  const [detailLoading, setDetailLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showSimpleImporter, setShowSimpleImporter] = useState(false);
  const [scrapedRecipe, setScrapedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    // Load initial data
    if (state.recipes.length === 0) {
      loadFeaturedRecipes();
      loadRandomRecipes();
    }
  }, []);

  const handleRecipeClick = async (recipe: Recipe) => {
    console.log('Recipe clicked:', recipe.id, recipe.title);
    console.log('Full recipe object:', recipe);
    
    setDetailLoading(true);
    setView('detail');
    
    // Immediate fallback - set the basic recipe first
    setSelectedRecipe(recipe);
    setDetailLoading(false);
    
    // Uncomment this part once basic navigation works
    /*
    try {
      console.log('Fetching recipe details for ID:', recipe.id);
      // Fetch full recipe details
      const fullRecipe = await getRecipeDetails(recipe.id);
      console.log('Full recipe fetched:', fullRecipe);
      
      if (fullRecipe) {
        setSelectedRecipe(fullRecipe);
      }
    } catch (error) {
      console.error('Failed to load recipe details:', error);
    } finally {
      setDetailLoading(false);
    }
    */
  };

  const handleBackToSearch = () => {
    setSelectedRecipe(null);
    setScrapedRecipe(null);
    setView('search');
  };

  const handlePreviewClose = async () => {
    // If the user closes the preview, delete the auto-saved recipe
    if (scrapedRecipe?.id && localState.isServerAvailable) {
      try {
        // Delete using local recipe API since it was saved as a local recipe
        const response = await fetch(`/api/recipes/${scrapedRecipe.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          console.error('Failed to delete auto-saved recipe');
        }
      } catch (error) {
        console.error('Failed to delete auto-saved recipe:', error);
      }
    }
    // Close the preview without any refresh
    setScrapedRecipe(null);
    setView('search');
  };

  const handleRecipeImported = async (recipe: Recipe) => {
    console.log('Recipe imported successfully:', recipe);
    // Optionally add to Spoonacular recipes list
    setShowImporter(false);
    
    // Show a success message or refresh recipes
    alert(`Recipe "${recipe.title}" imported successfully!`);
  };

  const handleRecipeScraped = async (recipe: Recipe) => {
    console.log('Recipe scraped successfully:', recipe);
    setShowSimpleImporter(false);
    
    // Show the scraped recipe in preview mode
    setScrapedRecipe(recipe);
    setView('preview');
  };

  const handleRecipeDownload = async () => {
    // This will be called when user clicks "Download Recipe" from preview
    // Reload local recipes to refresh the UI
    if (localState.isServerAvailable) {
      await loadLocalRecipes();
    }
    setView('search');
  };

  const handleLoadMore = () => {
    if (state.hasNextPage && state.loadingState !== 'loading') {
      loadMoreRecipes();
    }
  };


  // Detail view
  if (view === 'detail') {
    // Show loading state
    if (detailLoading) {
      return (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToSearch}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
            >
              <span className="text-xl">←</span>
              <span>Back to Recipes</span>
            </button>
            <div className="text-gray-500">Loading recipe...</div>
          </div>
          <RecipeDetailSkeleton />
        </div>
      );
    }

    // Show recipe detail if we have a recipe
    if (selectedRecipe) {
      return (
        <div className="animate-fade-in">
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={handleBackToSearch}
          />
        </div>
      );
    }

    // Error state - no recipe loaded
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToSearch}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
          >
            <span className="text-xl">←</span>
            <span>Back to Recipes</span>
          </button>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😞</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Recipe not found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't load this recipe. Please try again.
          </p>
          <button
            onClick={handleBackToSearch}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to <span className="text-primary-600 dark:text-primary-400">Hearth</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          Discover delicious recipes, manage your favorites, and bring your family together around great food.
        </p>
        
        {/* Import Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setShowSimpleImporter(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg"
          >
            <span>🥄</span>
            <span>Import Recipe from URL</span>
          </button>
          
          <button
            onClick={() => setShowImporter(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg"
          >
            <span>📥</span>
            <span>Import from Spoonacular</span>
          </button>
          
          <div className="flex items-center space-x-2 text-sm">
            {localState.isServerAvailable ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-600 dark:text-green-400">Local server connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span className="text-orange-600 dark:text-orange-400">Connecting to local server...</span>
              </>
            )}
          </div>
          
          {/* Debug Info */}
          <div className="text-xs text-gray-500">
            Server status: {localState.isServerAvailable ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <RecipeSearch />

      {/* Results Section */}
      <div>
        {state.loadingState === 'loading' && state.recipes.length === 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <RecipeCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Search Results */}
            {state.recipes.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {state.searchHistory.length > 0 ? 'Search Results' : 'Recipes'}
                  </h2>
                  <span className="text-gray-600 dark:text-gray-400">
                    {state.totalResults > 0 
                      ? `${state.totalResults.toLocaleString()} recipes found`
                      : `${state.recipes.length} recipes`
                    }
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={handleRecipeClick}
                      className="animate-fade-in"
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {state.hasNextPage && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={state.loadingState === 'loading'}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {state.loadingState === 'loading' ? 'Loading...' : 'Load More Recipes'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Featured Recipes */}
            {state.featuredRecipes.length > 0 && state.recipes.length === 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Featured Recipes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {state.featuredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={handleRecipeClick}
                      className="animate-fade-in"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Random Recipes */}
            {state.randomRecipes.length > 0 && state.recipes.length === 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Discover Something New
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.randomRecipes.slice(0, 8).map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={handleRecipeClick}
                      className="animate-fade-in"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {state.recipes.length === 0 && 
             state.featuredRecipes.length === 0 && 
             state.randomRecipes.length === 0 && 
             state.loadingState !== 'loading' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No recipes found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your search terms or browse our featured recipes above.
                </p>
                <button
                  onClick={() => searchRecipes({})}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  Browse All Recipes
                </button>
              </div>
            )}

            {/* Error State */}
            {state.error && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😞</div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Oops! Something went wrong
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {state.error}
                </p>
                <button
                  onClick={() => searchRecipes({})}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recipe Import Modal */}
      {showImporter && (
        <RecipeImporter
          onRecipeImported={handleRecipeImported}
          onClose={() => setShowImporter(false)}
        />
      )}

      {/* Simple Recipe Importer Modal */}
      {showSimpleImporter && (
        <SimpleRecipeImporter
          onRecipeScraped={handleRecipeScraped}
          onClose={() => setShowSimpleImporter(false)}
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
    </div>
  );
};
