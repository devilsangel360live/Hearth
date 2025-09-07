import React, { useState, useCallback } from 'react';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';
import { debounce } from '@/utils/helpers';

interface LocalRecipeSearchProps {
  className?: string;
}

export const LocalRecipeSearch: React.FC<LocalRecipeSearchProps> = ({
  className = '',
}) => {
  const { searchLocalRecipes, loadLocalRecipes, state } = useLocalRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    cuisine?: string;
    diet?: string;
    bookmarked?: boolean;
    favorite?: boolean;
  }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim()) {
        console.log('Searching for:', query.trim());
        try {
          await searchLocalRecipes(query.trim());
          console.log('Search completed successfully');
        } catch (error) {
          console.error('Search failed:', error);
        }
      } else {
        handleClear();
      }
    }, 500),
    [searchLocalRecipes]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...selectedFilters, [key]: value };
    setSelectedFilters(newFilters);
    
    // Apply filters
    const filters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v !== undefined && v !== '' && v !== false)
    );
    
    if (Object.keys(filters).length > 0) {
      loadLocalRecipes(filters);
    } else if (!searchQuery.trim()) {
      loadLocalRecipes();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedFilters({});
    setShowAdvanced(false);
    loadLocalRecipes(); // Load all recipes
  };

  const toggleFilter = (key: string, value: any) => {
    const currentValue = selectedFilters[key as keyof typeof selectedFilters];
    const newValue = currentValue === value ? undefined : value;
    handleFilterChange(key, newValue);
  };

  // Common cuisines from the database (you can expand this list)
  const commonCuisines = ['Italian', 'Mexican', 'Asian', 'American', 'Indian', 'Mediterranean', 'Thai', 'Chinese'];
  const commonDiets = ['vegetarian', 'vegan', 'gluten free', 'dairy free', 'ketogenic'];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 ${className}`}>
      {/* Main search input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400 text-xl">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search your recipes, ingredients, or tags..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
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
          onClick={() => toggleFilter('bookmarked', true)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            selectedFilters.bookmarked
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ⭐ Bookmarked
        </button>
        
        <button
          onClick={() => toggleFilter('favorite', true)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            selectedFilters.favorite
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ❤️ Favorites
        </button>
        
        <button
          onClick={() => toggleFilter('diet', 'vegetarian')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
            selectedFilters.diet === 'vegetarian'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          🌱 Vegetarian
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {/* Cuisine filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cuisine
            </label>
            <div className="flex flex-wrap gap-2">
              {commonCuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => toggleFilter('cuisine', cuisine.toLowerCase())}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedFilters.cuisine === cuisine.toLowerCase()
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Diet filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dietary Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {commonDiets.map((diet) => (
                <button
                  key={diet}
                  onClick={() => toggleFilter('diet', diet)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedFilters.diet === diet
                      ? 'bg-green-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          {/* Clear button */}
          <div className="pt-2">
            <button
              onClick={handleClear}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Search status and results count */}
      {state.loadingState === 'loading' && (
        <div className="text-center py-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Searching...</span>
        </div>
      )}

      {state.loadingState === 'success' && (searchQuery.trim() || Object.keys(selectedFilters).some(k => selectedFilters[k as keyof typeof selectedFilters])) && (
        <div className="text-center py-2">
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            {state.pagination.totalCount} recipe{state.pagination.totalCount !== 1 ? 's' : ''} found
            {searchQuery.trim() && ` for "${searchQuery}"`}
          </span>
        </div>
      )}
      
      {state.error && (
        <div className="text-center py-2">
          <span className="text-red-500 text-sm">{state.error}</span>
        </div>
      )}
    </div>
  );
};