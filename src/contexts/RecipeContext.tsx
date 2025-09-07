import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Recipe, RecipeSearchFilters, LoadingState, SearchHistoryItem, ToastMessage } from '@/types';
import { localRecipeApi, LocalRecipeApiError } from '@/services/localRecipeApi';
import { generateId, saveToLocalStorage, getFromLocalStorage } from '@/utils/helpers';

interface RecipeState {
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  searchFilters: RecipeSearchFilters;
  loadingState: LoadingState;
  error: string | null;
  searchHistory: SearchHistoryItem[];
  toasts: ToastMessage[];
  randomRecipes: Recipe[];
  featuredRecipes: Recipe[];
  totalResults: number;
  currentPage: number;
  hasNextPage: boolean;
}

type RecipeAction =
  | { type: 'SET_LOADING'; payload: LoadingState }
  | { type: 'SET_RECIPES'; payload: { recipes: Recipe[]; totalResults: number; page: number; hasNextPage: boolean } }
  | { type: 'APPEND_RECIPES'; payload: { recipes: Recipe[]; hasNextPage: boolean } }
  | { type: 'SET_CURRENT_RECIPE'; payload: Recipe | null }
  | { type: 'SET_SEARCH_FILTERS'; payload: RecipeSearchFilters }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TO_SEARCH_HISTORY'; payload: SearchHistoryItem }
  | { type: 'CLEAR_SEARCH_HISTORY' }
  | { type: 'ADD_TOAST'; payload: ToastMessage }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_RANDOM_RECIPES'; payload: Recipe[] }
  | { type: 'SET_FEATURED_RECIPES'; payload: Recipe[] }
  | { type: 'RESET_SEARCH' };

const initialState: RecipeState = {
  recipes: [],
  currentRecipe: null,
  searchFilters: {},
  loadingState: 'idle',
  error: null,
  searchHistory: getFromLocalStorage<SearchHistoryItem[]>('hearth-search-history', []),
  toasts: [],
  randomRecipes: [],
  featuredRecipes: [],
  totalResults: 0,
  currentPage: 1,
  hasNextPage: false,
};

const recipeReducer = (state: RecipeState, action: RecipeAction): RecipeState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loadingState: action.payload, error: null };
    
    case 'SET_RECIPES':
      return {
        ...state,
        recipes: action.payload.recipes,
        totalResults: action.payload.totalResults,
        currentPage: action.payload.page,
        hasNextPage: action.payload.hasNextPage,
        loadingState: 'success',
        error: null,
      };
    
    case 'APPEND_RECIPES':
      return {
        ...state,
        recipes: [...state.recipes, ...action.payload.recipes],
        hasNextPage: action.payload.hasNextPage,
        currentPage: state.currentPage + 1,
        loadingState: 'success',
      };
    
    case 'SET_CURRENT_RECIPE':
      return { ...state, currentRecipe: action.payload };
    
    case 'SET_SEARCH_FILTERS':
      return { ...state, searchFilters: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loadingState: 'error' };
    
    case 'ADD_TO_SEARCH_HISTORY':
      const newHistory = [action.payload, ...state.searchHistory.slice(0, 9)]; // Keep last 10
      saveToLocalStorage('hearth-search-history', newHistory);
      return { ...state, searchHistory: newHistory };
    
    case 'CLEAR_SEARCH_HISTORY':
      saveToLocalStorage('hearth-search-history', []);
      return { ...state, searchHistory: [] };
    
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(toast => toast.id !== action.payload) };
    
    case 'SET_RANDOM_RECIPES':
      return { ...state, randomRecipes: action.payload };
    
    case 'SET_FEATURED_RECIPES':
      return { ...state, featuredRecipes: action.payload };
    
    case 'RESET_SEARCH':
      return {
        ...state,
        recipes: [],
        searchFilters: {},
        totalResults: 0,
        currentPage: 1,
        hasNextPage: false,
        error: null,
      };
    
    default:
      return state;
  }
};

interface RecipeContextType {
  state: RecipeState;
  searchRecipes: (filters: RecipeSearchFilters, append?: boolean) => Promise<void>;
  loadMoreRecipes: () => Promise<void>;
  getRecipeDetails: (id: string) => Promise<Recipe | null>;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  updateSearchFilters: (filters: RecipeSearchFilters) => void;
  loadRandomRecipes: (count?: number) => Promise<void>;
  loadFeaturedRecipes: () => Promise<void>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearSearchHistory: () => void;
  resetSearch: () => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipes = (): RecipeContextType => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};

interface RecipeProviderProps {
  children: ReactNode;
}

export const RecipeProvider: React.FC<RecipeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    const newToast: ToastMessage = { ...toast, id };
    
    dispatch({ type: 'ADD_TOAST', payload: newToast });
    
    const duration = toast.duration || 5000;
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, duration);
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const searchRecipes = async (filters: RecipeSearchFilters, append: boolean = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: 'loading' });
      
      if (!append) {
        dispatch({ type: 'SET_SEARCH_FILTERS', payload: filters });
      }

      const response = await localRecipeApi.searchLocalRecipes(filters.query || '', append ? state.currentPage + 1 : 1, 12);
      
      const page = append ? state.currentPage + 1 : 1;
      const hasNextPage = response.pagination.hasNextPage;
      
      if (append) {
        dispatch({ 
          type: 'APPEND_RECIPES', 
          payload: { recipes: response.recipes, hasNextPage } 
        });
      } else {
        dispatch({ 
          type: 'SET_RECIPES', 
          payload: { 
            recipes: response.recipes, 
            totalResults: response.pagination.totalCount, 
            page,
            hasNextPage 
          } 
        });

        // Add to search history if there's a query
        if (filters.query) {
          const historyItem: SearchHistoryItem = {
            id: generateId(),
            query: filters.query,
            timestamp: new Date(),
            filters,
          };
          dispatch({ type: 'ADD_TO_SEARCH_HISTORY', payload: historyItem });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      let errorMessage = 'Failed to search recipes';
      
      if (error instanceof LocalRecipeApiError) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      addToast({
        type: 'error',
        title: 'Search Failed',
        message: errorMessage,
      });
    }
  };

  const loadMoreRecipes = async () => {
    if (state.hasNextPage && state.loadingState !== 'loading') {
      await searchRecipes(state.searchFilters, true);
    }
  };

  const getRecipeDetails = async (id: string): Promise<Recipe | null> => {
    try {
      console.log('RecipeContext: Starting to fetch recipe details for ID:', id);
      dispatch({ type: 'SET_LOADING', payload: 'loading' });
      
      const recipe = await localRecipeApi.getLocalRecipe(id);
      console.log('RecipeContext: Recipe details received:', recipe);
      
      dispatch({ type: 'SET_CURRENT_RECIPE', payload: recipe });
      dispatch({ type: 'SET_LOADING', payload: 'success' });
      return recipe;
    } catch (error) {
      console.error('RecipeContext: Recipe details error:', error);
      let errorMessage = 'Failed to load recipe details';
      
      if (error instanceof LocalRecipeApiError) {
        errorMessage = error.message;
        console.log('LocalRecipeApiError details:', error.status);
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      addToast({
        type: 'error',
        title: 'Failed to Load Recipe',
        message: errorMessage,
      });
      return null;
    }
  };

  const setCurrentRecipe = (recipe: Recipe | null) => {
    dispatch({ type: 'SET_CURRENT_RECIPE', payload: recipe });
  };

  const updateSearchFilters = (filters: RecipeSearchFilters) => {
    dispatch({ type: 'SET_SEARCH_FILTERS', payload: filters });
  };

  const loadRandomRecipes = async (count: number = 12) => {
    try {
      const response = await localRecipeApi.getLocalRecipes({ limit: count, page: 1 });
      dispatch({ type: 'SET_RANDOM_RECIPES', payload: response.recipes });
    } catch (error) {
      console.error('Random recipes error:', error);
    }
  };

  const loadFeaturedRecipes = async () => {
    try {
      const response = await localRecipeApi.getLocalRecipes({ limit: 6, page: 1, favorite: true });
      dispatch({ type: 'SET_FEATURED_RECIPES', payload: response.recipes });
    } catch (error) {
      console.error('Featured recipes error:', error);
    }
  };

  const clearSearchHistory = () => {
    dispatch({ type: 'CLEAR_SEARCH_HISTORY' });
  };

  const resetSearch = () => {
    dispatch({ type: 'RESET_SEARCH' });
  };

  const value: RecipeContextType = {
    state,
    searchRecipes,
    loadMoreRecipes,
    getRecipeDetails,
    setCurrentRecipe,
    updateSearchFilters,
    loadRandomRecipes,
    loadFeaturedRecipes,
    addToast,
    removeToast,
    clearSearchHistory,
    resetSearch,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};