import React, { useState } from 'react';
import { Recipe } from '@/types';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';

interface RecipePreviewProps {
  recipe: Recipe;
  onClose: () => void;
  onDownload?: () => void;
  className?: string;
}

export const RecipePreview: React.FC<RecipePreviewProps> = ({
  recipe,
  onClose,
  onDownload,
  className = ''
}) => {
  const { saveScrapedRecipe } = useLocalRecipes();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Save the recipe to the database
      await saveScrapedRecipe(recipe);
      
      // Call the onDownload callback to refresh the main view
      if (onDownload) {
        onDownload();
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Failed to download recipe:', error);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Preview Badge */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                🔍 Preview
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {recipe.title}
              </h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close preview"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          
          {/* Download Action */}
          <div className="mt-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                This is a preview of the scraped recipe. Click "Download Recipe" to save it to your collection.
              </p>
              {recipe.sourceName && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  From: {recipe.sourceName}
                </p>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download Recipe</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recipe Content */}
        <div className={`p-6 ${className}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Image and Info */}
            <div className="lg:col-span-1">
              {recipe.image && (
                <img 
                  src={recipe.image} 
                  alt={recipe.title}
                  className="w-full h-64 lg:h-80 object-cover rounded-lg shadow-lg mb-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}

              {/* Recipe Info */}
              <div className="space-y-4">
                {recipe.summary && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Description
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {recipe.summary}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {recipe.readyInMinutes && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">⏱️</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {recipe.readyInMinutes} min
                      </span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">👥</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {recipe.servings} servings
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {(recipe.cuisines?.length || recipe.diets?.length) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.cuisines?.map((cuisine, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                          {cuisine}
                        </span>
                      ))}
                      {recipe.diets?.map((diet, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                          {diet}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Ingredients and Instructions */}
            <div className="lg:col-span-2 space-y-8">
              {/* Ingredients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Ingredients
                  </h2>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {ingredient.original || `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Instructions
                  </h2>
                  <ol className="space-y-4">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex space-x-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {instruction.number || index + 1}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                          {instruction.step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Nutrition */}
              {recipe.nutrition && recipe.nutrition.nutrients && recipe.nutrition.nutrients.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Nutrition (per serving)
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.nutrition.nutrients.slice(0, 8).map((nutrient, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {Math.round(nutrient.amount)}{nutrient.unit}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {nutrient.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};