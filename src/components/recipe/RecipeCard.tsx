import React from 'react';
import { Recipe } from '@/types';
import { formatCookingTime, formatServings, getRecipeImageUrl, stripHtmlTags, truncateText } from '@/utils/helpers';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onClick,
  onDelete,
  className = '',
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(recipe);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onDelete && confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete(recipe);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const summary = recipe.summary ? stripHtmlTags(recipe.summary) : '';
  const truncatedSummary = truncateText(summary, 120);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View recipe for ${recipe.title}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={getRecipeImageUrl(recipe, 'medium')}
          alt={recipe.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Health Score Badge */}
        {recipe.healthScore && recipe.healthScore > 70 && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            {recipe.healthScore}% Healthy
          </div>
        )}

        {/* Delete button - only show if onDelete is provided */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            title="Delete recipe"
          >
            <span className="text-sm">🗑️</span>
          </button>
        )}

        {/* Quick indicators */}
        <div className="absolute top-3 left-3 flex space-x-1">
          {recipe.vegetarian && (
            <div className="bg-green-500 text-white p-1 rounded-full" title="Vegetarian">
              <span className="text-xs">🌱</span>
            </div>
          )}
          {recipe.glutenFree && (
            <div className="bg-blue-500 text-white p-1 rounded-full" title="Gluten Free">
              <span className="text-xs">🌾</span>
            </div>
          )}
          {recipe.vegan && (
            <div className="bg-purple-500 text-white p-1 rounded-full" title="Vegan">
              <span className="text-xs">🥬</span>
            </div>
          )}
        </div>

        {/* Cooking time overlay */}
        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-medium">
          {formatCookingTime(recipe.readyInMinutes)}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 line-clamp-2">
            {recipe.title}
          </h3>
        </div>

        {truncatedSummary && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
            {truncatedSummary}
          </p>
        )}

        {/* Recipe stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center">
            <span className="mr-1">👥</span>
            {formatServings(recipe.servings)}
          </span>
          
          {recipe.pricePerServing && (
            <span className="flex items-center">
              <span className="mr-1">💰</span>
              ${(recipe.pricePerServing / 100).toFixed(2)}/serving
            </span>
          )}
        </div>

        {/* Diet tags */}
        <div className="flex flex-wrap gap-1">
          {recipe.cuisines?.slice(0, 2).map((cuisine) => (
            <span
              key={cuisine}
              className="px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-full text-xs font-medium"
            >
              {cuisine}
            </span>
          ))}
          
          {recipe.diets?.slice(0, 1).map((diet) => (
            <span
              key={diet}
              className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full text-xs font-medium"
            >
              {diet}
            </span>
          ))}

          {(recipe.cuisines?.length || 0) + (recipe.diets?.length || 0) > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
              +{(recipe.cuisines?.length || 0) + (recipe.diets?.length || 0) - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};