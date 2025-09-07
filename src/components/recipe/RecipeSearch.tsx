import React, { useState, useCallback } from 'react';
import { RecipeSearchFilters, CUISINE_TYPES, DIET_TYPES, MEAL_TYPES } from '@/types';
import { useRecipes } from '@/contexts';
import { debounce } from '@/utils/helpers';

interface RecipeSearchProps {
  onSearch?: (filters: RecipeSearchFilters) => void;
  className?: string;
}

export const RecipeSearch: React.FC<RecipeSearchProps> = ({
  onSearch,
  className = '',
}) => {
  const { searchRecipes, state } = useRecipes();
  const [filters, setFilters] = useState<RecipeSearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedSearch = useCallback(
    debounce((searchFilters: RecipeSearchFilters) => {
      if (onSearch) {
        onSearch(searchFilters);
      } else {
        searchRecipes(searchFilters);
      }
    }, 500),
    [onSearch, searchRecipes]
  );

  const handleFilterChange = (key: keyof RecipeSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-search when query changes
    if (key === 'query' && typeof value === 'string') {
      debouncedSearch(newFilters);
    }
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(filters);
    } else {
      searchRecipes(filters);
    }
  };

  const handleClear = () => {
    setFilters({});
    if (onSearch) {
      onSearch({});
    } else {
      searchRecipes({});
    }
  };

  const toggleArrayFilter = (key: keyof RecipeSearchFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 ${className}`}>
      {/* Main search input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400 text-xl">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search for recipes, ingredients, or cuisines..."
          value={filters.query || ''}
          onChange={(e) => handleFilterChange('query', e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors duration-200"
        />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-full text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors duration-200"
        >
          {showAdvanced ? 'Simple' : 'Advanced'} Search
        </button>
        
        <button
          onClick={() => handleFilterChange('diet', ['vegetarian'])}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            filters.diet?.includes('vegetarian')
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🌱 Vegetarian
        </button>
        
        <button
          onClick={() => handleFilterChange('diet', ['gluten free'])}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            filters.diet?.includes('gluten free')
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🌾 Gluten Free
        </button>
        
        <button
          onClick={() => handleFilterChange('maxReadyTime', 30)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            filters.maxReadyTime === 30
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ⏱️ Quick (30 min)
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {/* Cuisine types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cuisines
            </label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.slice(0, 8).map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => toggleArrayFilter('cuisine', cuisine)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                    filters.cuisine?.includes(cuisine)
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Diet types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dietary Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {DIET_TYPES.slice(0, 6).map((diet) => (
                <button
                  key={diet}
                  onClick={() => toggleArrayFilter('diet', diet)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                    filters.diet?.includes(diet)
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          {/* Meal types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meal Type
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Any meal type</option>
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Time and serving filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Cooking Time (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                step="5"
                value={filters.maxReadyTime || ''}
                onChange={(e) => handleFilterChange('maxReadyTime', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="60"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Servings
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={filters.minServings || ''}
                onChange={(e) => handleFilterChange('minServings', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="4"
              />
            </div>
          </div>

          {/* Sort options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort by
            </label>
            <select
              value={filters.sort || ''}
              onChange={(e) => handleFilterChange('sort', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Relevance</option>
              <option value="popularity">Popularity</option>
              <option value="healthiness">Healthiness</option>
              <option value="price">Price</option>
              <option value="time">Cooking Time</option>
              <option value="random">Random</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSearch}
              disabled={state.loadingState === 'loading'}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {state.loadingState === 'loading' ? 'Searching...' : 'Search'}
            </button>
            
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search history */}
      {!showAdvanced && state.searchHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {state.searchHistory.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setFilters({ query: item.query, ...item.filters });
                  handleFilterChange('query', item.query);
                }}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};