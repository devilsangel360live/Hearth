import React, { useEffect } from 'react';
import { Recipe } from '@/types';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';
import { RecipeCard } from './RecipeCard';
import { RecipeCardSkeleton } from '@/components/common/LoadingSkeleton';

interface RecipeLibraryGridProps {
  onRecipeClick: (recipe: Recipe) => void;
  className?: string;
}

export const RecipeLibraryGrid: React.FC<RecipeLibraryGridProps> = ({
  onRecipeClick,
  className = '',
}) => {
  const { state, loadLocalRecipes, deleteLocalRecipe } = useLocalRecipes();

  // Remove health check from this component - it's now done in SimpleHomePage

  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await deleteLocalRecipe(recipe.id);
      // Recipe will be automatically removed from state by the context
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  useEffect(() => {
    if (state.isServerAvailable && state.localRecipes.length === 0 && state.loadingState === 'idle') {
      loadLocalRecipes();
    }
  }, [state.isServerAvailable, state.loadingState]); // Simplified dependencies

  if (!state.isServerAvailable) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-6xl mb-6 opacity-60">🔌</div>
        <h3 className="text-2xl font-semibold text-amber-900 mb-3">
          Server Connection Required
        </h3>
        <p className="text-amber-700 mb-8 text-center max-w-md leading-relaxed">
          The local recipe server is not available. Please ensure it's running to access your recipe library.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (state.loadingState === 'loading') {
    return (
      <div className={`${className} bg-white/50 backdrop-blur-sm rounded-xl p-6`}>
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-48 bg-orange-200 rounded-lg animate-pulse"></div>
          <div className="h-6 w-32 bg-amber-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-6xl mb-6 opacity-60">😞</div>
        <h3 className="text-2xl font-semibold text-amber-900 mb-3">
          Failed to Load Recipes
        </h3>
        <p className="text-amber-700 mb-8 text-center max-w-md leading-relaxed">
          {state.error}
        </p>
        <button
          onClick={() => loadLocalRecipes()}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state.localRecipes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-6xl mb-6 opacity-60">📖</div>
        <h3 className="text-2xl font-semibold text-amber-900 mb-3">
          No Recipes Yet
        </h3>
        <p className="text-amber-700 mb-8 text-center max-w-md leading-relaxed">
          Your recipe library is empty. Start by importing recipes from URLs to build your collection.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} bg-white/50 backdrop-blur-sm rounded-xl p-8 shadow-sm`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-amber-900 tracking-tight">
          Recipe Library
        </h2>
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-2 rounded-full">
          <span className="text-amber-800 font-medium text-sm">
            {state.pagination.totalCount > 0 
              ? `${state.pagination.totalCount.toLocaleString()} recipes`
              : `${state.localRecipes.length} recipes`
            }
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {state.localRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={onRecipeClick}
            onDelete={handleDeleteRecipe}
            className="animate-fade-in hover:transform hover:scale-105 transition-all duration-300"
          />
        ))}
      </div>

      {/* Load More Button */}
      {state.pagination.hasNextPage && (
        <div className="text-center mt-12">
          <button
            onClick={() => loadLocalRecipes({ 
              page: state.pagination.currentPage + 1,
              limit: 12 
            })}
            disabled={state.loadingState === 'loading' as any}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
          >
            {(state.loadingState as any) === 'loading' ? 'Loading More...' : 'Load More Recipes'}
          </button>
        </div>
      )}
    </div>
  );
};