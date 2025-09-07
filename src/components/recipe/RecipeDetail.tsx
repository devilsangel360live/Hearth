import React, { useState } from 'react';
import { Recipe } from '@/types';
import { formatCookingTime, formatServings, getRecipeImageUrl, stripHtmlTags, formatNutritionValue } from '@/utils/helpers';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose?: () => void;
  onDelete?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  className?: string;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onClose,
  onDelete,
  onEdit,
  className = '',
}) => {
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<'instructions' | 'nutrition'>('instructions');

  const adjustedServings = recipe.servings * servingMultiplier;

  const adjustIngredientAmount = (amount: number): number => {
    return amount * servingMultiplier;
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete(recipe);
    }
  };

  // Handle both HTML content and plain text
  const summary = recipe.summary ? (
    recipe.summary.includes('<') ? stripHtmlTags(recipe.summary) : recipe.summary
  ) : '';

  return (
    <div className={`max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header with navigation */}
      {onClose && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
            aria-label="Back to recipes"
          >
            <span className="text-xl">←</span>
            <span className="hidden sm:inline">Back to Recipes</span>
          </button>
          
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Recipe Details</h1>
          
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(recipe)}
                className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Edit recipe"
              >
                <span className="text-xl">✏️</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Delete recipe"
              >
                <span className="text-xl">🗑️</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close recipe details"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero image */}
      <div className="relative h-64 md:h-96">
        <img
          src={getRecipeImageUrl(recipe, 'large')}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay with basic info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{recipe.title}</h1>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <span className="mr-1">⏱️</span>
                {formatCookingTime(recipe.readyInMinutes)}
              </span>
              <span className="flex items-center">
                <span className="mr-1">👥</span>
                {formatServings(adjustedServings)}
              </span>
              {recipe.healthScore && (
                <span className="flex items-center">
                  <span className="mr-1">💚</span>
                  {recipe.healthScore}% Healthy
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary */}
        {summary && (
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {summary}
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {recipe.cuisines?.map((cuisine) => (
            <span
              key={cuisine}
              className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-full text-sm font-medium"
            >
              {cuisine}
            </span>
          ))}
          
          {recipe.diets?.map((diet) => (
            <span
              key={diet}
              className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full text-sm font-medium"
            >
              {diet}
            </span>
          ))}

          {/* Diet indicators */}
          {recipe.vegetarian && (
            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full text-sm font-medium">
              🌱 Vegetarian
            </span>
          )}
          {recipe.vegan && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded-full text-sm font-medium">
              🥬 Vegan
            </span>
          )}
          {recipe.glutenFree && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-sm font-medium">
              🌾 Gluten Free
            </span>
          )}

          {/* Custom Tags */}
          {recipe.tags?.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-sm font-medium"
            >
              🏷️ {tag}
            </span>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ingredients</h2>
              
              {/* Serving adjuster */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setServingMultiplier(Math.max(0.5, servingMultiplier - 0.5))}
                  className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  -
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                  {adjustedServings} servings
                </span>
                <button
                  onClick={() => setServingMultiplier(servingMultiplier + 0.5)}
                  className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={`${ingredient.id}-${index}`}
                    className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    {ingredient.image && (
                      <img
                        src={`https://spoonacular.com/cdn/ingredients_100x100/${ingredient.image}`}
                        alt={ingredient.name}
                        className="w-8 h-8 rounded-full mr-3 object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {adjustIngredientAmount(ingredient.amount).toFixed(ingredient.amount % 1 === 0 ? 0 : 1)} {ingredient.unit}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-2">
                        {ingredient.name}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No ingredients available for this recipe.</p>
                  <p className="text-sm mt-2">This might be a recipe from a backup source with limited data.</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions and Nutrition Tabs */}
          <div>
            <div className="flex space-x-4 mb-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('instructions')}
                className={`pb-2 px-1 font-medium transition-colors duration-200 ${
                  activeTab === 'instructions'
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Instructions
              </button>
              {recipe.nutrition && (
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={`pb-2 px-1 font-medium transition-colors duration-200 ${
                    activeTab === 'nutrition'
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Nutrition
                </button>
              )}
            </div>

            {/* Instructions */}
            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Instructions</h2>
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  <div className="space-y-4">
                    {recipe.instructions.map((instruction) => (
                      <div key={instruction.number} className="flex">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-4">
                          {instruction.number}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {instruction.step}
                          </p>
                          {instruction.length && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              ⏱️ {instruction.length.number} {instruction.length.unit}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No instructions available for this recipe.</p>
                    <p className="text-sm mt-2">This might be a recipe from a backup source with limited data.</p>
                    {recipe.sourceUrl && (
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                      >
                        View Original Recipe →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Nutrition */}
            {activeTab === 'nutrition' && recipe.nutrition && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nutrition Facts</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {recipe.nutrition.calories && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Calories</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNutritionValue(recipe.nutrition.calories)}
                      </div>
                    </div>
                  )}
                  
                  {recipe.nutrition.protein && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Protein</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNutritionValue(recipe.nutrition.protein)}g
                      </div>
                    </div>
                  )}
                  
                  {recipe.nutrition.carbs && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Carbs</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNutritionValue(recipe.nutrition.carbs)}g
                      </div>
                    </div>
                  )}
                  
                  {recipe.nutrition.fat && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Fat</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNutritionValue(recipe.nutrition.fat)}g
                      </div>
                    </div>
                  )}
                </div>

                {recipe.nutrition.nutrients && recipe.nutrition.nutrients.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Detailed Nutrients</h3>
                    <div className="space-y-2">
                      {recipe.nutrition.nutrients.slice(0, 8).map((nutrient, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-gray-700 dark:text-gray-300">{nutrient.name}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nutrient.amount.toFixed(1)} {nutrient.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Source attribution */}
        {(recipe.sourceUrl || recipe.sourceName) && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Recipe from: {recipe.sourceName || 'External source'}
              </span>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                >
                  View Original →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};