import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Recipe } from '@/types';
import { localRecipeApi, LocalRecipeApiError } from '@/services/localRecipeApi';
import { generateId } from '@/utils/helpers';

interface LocalRecipeState {
  localRecipes: Recipe[];
  currentLocalRecipe: Recipe | null;
  collections: Array<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault: boolean;
    recipeCount: number;
    recipes: Recipe[];
  }>;
  scrapingJobs: Array<{
    id: string;
    url: string;
    status: 'processing' | 'success' | 'failed';
    scrapedAt: string;
    errorMessage?: string;
  }>;
  loadingState: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  isServerAvailable: boolean;
}

type LocalRecipeAction =
  | { type: 'SET_LOADING'; payload: 'idle' | 'loading' | 'success' | 'error' }
  | { type: 'SET_LOCAL_RECIPES'; payload: { recipes: Recipe[]; pagination: any } }
  | { type: 'ADD_LOCAL_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_LOCAL_RECIPE'; payload: Recipe }
  | { type: 'REMOVE_LOCAL_RECIPE'; payload: string }
  | { type: 'SET_CURRENT_LOCAL_RECIPE'; payload: Recipe | null }
  | { type: 'SET_COLLECTIONS'; payload: LocalRecipeState['collections'] }
  | { type: 'ADD_COLLECTION'; payload: LocalRecipeState['collections'][0] }
  | { type: 'UPDATE_COLLECTION'; payload: LocalRecipeState['collections'][0] }
  | { type: 'REMOVE_COLLECTION'; payload: string }
  | { type: 'SET_SCRAPING_JOBS'; payload: LocalRecipeState['scrapingJobs'] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SERVER_AVAILABILITY'; payload: boolean };

const initialState: LocalRecipeState = {
  localRecipes: [],
  currentLocalRecipe: null,
  collections: [],
  scrapingJobs: [],
  loadingState: 'idle',
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  isServerAvailable: false,
};

const localRecipeReducer = (state: LocalRecipeState, action: LocalRecipeAction): LocalRecipeState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loadingState: action.payload, error: null };
    
    case 'SET_LOCAL_RECIPES':
      return {
        ...state,
        localRecipes: action.payload.recipes,
        pagination: action.payload.pagination,
        loadingState: 'success',
        error: null,
      };
    
    case 'ADD_LOCAL_RECIPE':
      return {
        ...state,
        localRecipes: [action.payload, ...state.localRecipes],
      };
    
    case 'UPDATE_LOCAL_RECIPE':
      return {
        ...state,
        localRecipes: state.localRecipes.map(recipe =>
          recipe.id === action.payload.id ? action.payload : recipe
        ),
        currentLocalRecipe: state.currentLocalRecipe?.id === action.payload.id ? action.payload : state.currentLocalRecipe,
      };
    
    case 'REMOVE_LOCAL_RECIPE':
      return {
        ...state,
        localRecipes: state.localRecipes.filter(recipe => recipe.id !== action.payload),
        currentLocalRecipe: state.currentLocalRecipe?.id === action.payload ? null : state.currentLocalRecipe,
      };
    
    case 'SET_CURRENT_LOCAL_RECIPE':
      return { ...state, currentLocalRecipe: action.payload };
    
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.payload };
    
    case 'ADD_COLLECTION':
      return { ...state, collections: [...state.collections, action.payload] };
    
    case 'UPDATE_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(collection =>
          collection.id === action.payload.id ? action.payload : collection
        ),
      };
    
    case 'REMOVE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter(collection => collection.id !== action.payload),
      };
    
    case 'SET_SCRAPING_JOBS':
      return { ...state, scrapingJobs: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loadingState: 'error' };
    
    case 'SET_SERVER_AVAILABILITY':
      return { ...state, isServerAvailable: action.payload };
    
    default:
      return state;
  }
};

interface LocalRecipeContextType {
  state: LocalRecipeState;
  
  // Server connectivity
  checkServerHealth: () => Promise<void>;
  
  // Recipe management
  loadLocalRecipes: (filters?: { page?: number; limit?: number; cuisine?: string; diet?: string; bookmarked?: boolean; favorite?: boolean }) => Promise<void>;
  searchLocalRecipes: (query: string, page?: number) => Promise<void>;
  getLocalRecipe: (id: string) => Promise<Recipe | null>;
  createLocalRecipe: (recipeData: any) => Promise<Recipe | null>;
  updateLocalRecipe: (id: string, recipeData: any) => Promise<Recipe | null>;
  deleteLocalRecipe: (id: string) => Promise<void>;
  saveSpoonacularRecipe: (spoonacularRecipe: Recipe) => Promise<Recipe | null>;
  saveScrapedRecipe: (scrapedRecipe: Recipe) => Promise<Recipe | null>;
  
  // Recipe actions
  toggleLocalBookmark: (id: string) => Promise<void>;
  toggleLocalFavorite: (id: string) => Promise<void>;
  rateLocalRecipe: (id: string, rating: number) => Promise<void>;
  
  // Collections
  loadCollections: () => Promise<void>;
  createCollection: (name: string, description?: string, color?: string) => Promise<void>;
  updateCollection: (id: string, name?: string, description?: string, color?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addRecipeToCollection: (collectionId: string, recipeId: string) => Promise<void>;
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => Promise<void>;
  
  // Scraping
  importRecipeFromUrl: (url: string) => Promise<Recipe | null>;
  bulkImportRecipes: (urls: string[]) => Promise<void>;
  loadScrapingHistory: () => Promise<void>;
  retryScrapingJob: (jobId: string) => Promise<void>;
}

const LocalRecipeContext = createContext<LocalRecipeContextType | undefined>(undefined);

export const useLocalRecipes = (): LocalRecipeContextType => {
  const context = useContext(LocalRecipeContext);
  if (!context) {
    throw new Error('useLocalRecipes must be used within a LocalRecipeProvider');
  }
  return context;
};

interface LocalRecipeProviderProps {
  children: ReactNode;
}

export const LocalRecipeProvider: React.FC<LocalRecipeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(localRecipeReducer, initialState);
  const healthCheckTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const checkServerHealth = React.useCallback(async () => {
    // Prevent multiple concurrent health checks
    if (healthCheckTimeoutRef.current) {
      return;
    }
    
    healthCheckTimeoutRef.current = setTimeout(() => {
      healthCheckTimeoutRef.current = null;
    }, 1000); // Minimum 1 second between health checks
    
    try {
      await localRecipeApi.checkHealth();
      dispatch({ type: 'SET_SERVER_AVAILABILITY', payload: true });
    } catch (error) {
      console.warn('Local recipe server not available:', error);
      dispatch({ type: 'SET_SERVER_AVAILABILITY', payload: false });
    }
  }, []);

  const loadLocalRecipes = React.useCallback(async (filters = {}) => {
    if (!state.isServerAvailable || state.loadingState === 'loading') return;

    try {
      dispatch({ type: 'SET_LOADING', payload: 'loading' });
      const response = await localRecipeApi.getLocalRecipes(filters);
      dispatch({
        type: 'SET_LOCAL_RECIPES',
        payload: {
          recipes: response.recipes,
          pagination: response.pagination,
        },
      });
    } catch (error) {
      console.error('Error loading local recipes:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load local recipes' });
    }
  }, [state.isServerAvailable, state.loadingState]);

  const searchLocalRecipes = async (query: string, page = 1) => {
    console.log('searchLocalRecipes called with:', query, 'isServerAvailable:', state.isServerAvailable);
    if (!state.isServerAvailable) {
      console.error('Server not available for search');
      dispatch({ type: 'SET_ERROR', payload: 'Server not available' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: 'loading' });
      console.log('Making search API call...');
      const response = await localRecipeApi.searchLocalRecipes(query, page);
      console.log('Search response:', response);
      dispatch({
        type: 'SET_LOCAL_RECIPES',
        payload: {
          recipes: response.recipes,
          pagination: response.pagination,
        },
      });
      dispatch({ type: 'SET_LOADING', payload: 'success' });
    } catch (error) {
      console.error('Error searching local recipes:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to search local recipes' });
    }
  };

  const getLocalRecipe = async (id: string): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      const recipe = await localRecipeApi.getLocalRecipe(id);
      dispatch({ type: 'SET_CURRENT_LOCAL_RECIPE', payload: recipe });
      return recipe;
    } catch (error) {
      console.error('Error loading local recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load recipe' });
      return null;
    }
  };

  const createLocalRecipe = async (recipeData: any): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      const recipe = await localRecipeApi.createLocalRecipe(recipeData);
      dispatch({ type: 'ADD_LOCAL_RECIPE', payload: recipe });
      return recipe;
    } catch (error) {
      console.error('Error creating local recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create recipe' });
      return null;
    }
  };

  const updateLocalRecipe = async (id: string, recipeData: any): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      const recipe = await localRecipeApi.updateLocalRecipe(id, recipeData);
      dispatch({ type: 'UPDATE_LOCAL_RECIPE', payload: recipe });
      return recipe;
    } catch (error) {
      console.error('Error updating local recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update recipe' });
      return null;
    }
  };

  const deleteLocalRecipe = async (id: string) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.deleteLocalRecipe(id);
      dispatch({ type: 'REMOVE_LOCAL_RECIPE', payload: id });
    } catch (error) {
      console.error('Error deleting local recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete recipe' });
    }
  };

  const saveSpoonacularRecipe = async (spoonacularRecipe: Recipe): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      const recipeData = localRecipeApi.convertSpoonacularToLocal(spoonacularRecipe);
      const recipe = await localRecipeApi.createLocalRecipe(recipeData);
      dispatch({ type: 'ADD_LOCAL_RECIPE', payload: recipe });
      return recipe;
    } catch (error) {
      console.error('Error saving Spoonacular recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save recipe locally' });
      return null;
    }
  };

  const saveScrapedRecipe = async (scrapedRecipe: Recipe): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      // Convert scraped recipe format to local format
      const recipeData = localRecipeApi.convertScrapedToLocal(scrapedRecipe);
      const recipe = await localRecipeApi.createLocalRecipe(recipeData);
      dispatch({ type: 'ADD_LOCAL_RECIPE', payload: recipe });
      return recipe;
    } catch (error) {
      console.error('Error saving scraped recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save recipe locally' });
      return null;
    }
  };

  const toggleLocalBookmark = async (id: string) => {
    if (!state.isServerAvailable) return;

    try {
      const result = await localRecipeApi.toggleBookmark(id);
      // Update the recipe in state
      const recipe = state.localRecipes.find(r => r.id === id);
      if (recipe) {
        const updatedRecipe = { ...recipe, isBookmarked: result.isBookmarked };
        dispatch({ type: 'UPDATE_LOCAL_RECIPE', payload: updatedRecipe });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to toggle bookmark' });
    }
  };

  const toggleLocalFavorite = async (id: string) => {
    if (!state.isServerAvailable) return;

    try {
      const result = await localRecipeApi.toggleFavorite(id);
      // Update the recipe in state
      const recipe = state.localRecipes.find(r => r.id === id);
      if (recipe) {
        const updatedRecipe = { ...recipe, isFavorite: result.isFavorite };
        dispatch({ type: 'UPDATE_LOCAL_RECIPE', payload: updatedRecipe });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to toggle favorite' });
    }
  };

  const rateLocalRecipe = async (id: string, rating: number) => {
    if (!state.isServerAvailable) return;

    try {
      const result = await localRecipeApi.rateRecipe(id, rating);
      // Update the recipe in state
      const recipe = state.localRecipes.find(r => r.id === id);
      if (recipe) {
        const updatedRecipe = { ...recipe, personalRating: result.personalRating };
        dispatch({ type: 'UPDATE_LOCAL_RECIPE', payload: updatedRecipe });
      }
    } catch (error) {
      console.error('Error rating recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to rate recipe' });
    }
  };

  const loadCollections = async () => {
    if (!state.isServerAvailable) return;

    try {
      const collections = await localRecipeApi.getCollections();
      dispatch({ type: 'SET_COLLECTIONS', payload: collections });
    } catch (error) {
      console.error('Error loading collections:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load collections' });
    }
  };

  const createCollection = async (name: string, description?: string, color?: string) => {
    if (!state.isServerAvailable) return;

    try {
      const collection = await localRecipeApi.createCollection(name, description, color);
      dispatch({ type: 'ADD_COLLECTION', payload: { ...collection, recipeCount: 0, recipes: [] } });
    } catch (error) {
      console.error('Error creating collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create collection' });
    }
  };

  const updateCollection = async (id: string, name?: string, description?: string, color?: string) => {
    if (!state.isServerAvailable) return;

    try {
      const updatedCollection = await localRecipeApi.updateCollection(id, name, description, color);
      const existingCollection = state.collections.find(c => c.id === id);
      if (existingCollection) {
        dispatch({ 
          type: 'UPDATE_COLLECTION', 
          payload: { 
            ...updatedCollection, 
            recipeCount: existingCollection.recipeCount, 
            recipes: existingCollection.recipes 
          } 
        });
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update collection' });
    }
  };

  const deleteCollection = async (id: string) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.deleteCollection(id);
      dispatch({ type: 'REMOVE_COLLECTION', payload: id });
    } catch (error) {
      console.error('Error deleting collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete collection' });
    }
  };

  const addRecipeToCollection = async (collectionId: string, recipeId: string) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.addRecipeToCollection(collectionId, recipeId);
      // Refresh collections to update counts
      await loadCollections();
    } catch (error) {
      console.error('Error adding recipe to collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add recipe to collection' });
    }
  };

  const removeRecipeFromCollection = async (collectionId: string, recipeId: string) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.removeRecipeFromCollection(collectionId, recipeId);
      // Refresh collections to update counts
      await loadCollections();
    } catch (error) {
      console.error('Error removing recipe from collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove recipe from collection' });
    }
  };

  const importRecipeFromUrl = async (url: string): Promise<Recipe | null> => {
    if (!state.isServerAvailable) return null;

    try {
      const result = await localRecipeApi.scrapeRecipe(url);
      
      if (result.status === 'success' && result.recipe) {
        dispatch({ type: 'ADD_LOCAL_RECIPE', payload: result.recipe });
        return result.recipe;
      }
      
      // If processing, we'll need to poll for completion
      return null;
    } catch (error) {
      console.error('Error importing recipe:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import recipe' });
      return null;
    }
  };

  const bulkImportRecipes = async (urls: string[]) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.bulkScrapeRecipes(urls);
      // Note: Bulk imports run in background, no immediate recipe updates
    } catch (error) {
      console.error('Error bulk importing recipes:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start bulk import' });
    }
  };

  const loadScrapingHistory = async () => {
    if (!state.isServerAvailable) return;

    try {
      const response = await localRecipeApi.getScrapingHistory();
      dispatch({ type: 'SET_SCRAPING_JOBS', payload: response.jobs });
    } catch (error) {
      console.error('Error loading scraping history:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load scraping history' });
    }
  };

  const retryScrapingJob = async (jobId: string) => {
    if (!state.isServerAvailable) return;

    try {
      await localRecipeApi.retryScrapingJob(jobId);
      // Refresh scraping history
      await loadScrapingHistory();
    } catch (error) {
      console.error('Error retrying scraping job:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to retry scraping job' });
    }
  };

  const value: LocalRecipeContextType = {
    state,
    checkServerHealth,
    loadLocalRecipes,
    searchLocalRecipes,
    getLocalRecipe,
    createLocalRecipe,
    updateLocalRecipe,
    deleteLocalRecipe,
    saveSpoonacularRecipe,
    saveScrapedRecipe,
    toggleLocalBookmark,
    toggleLocalFavorite,
    rateLocalRecipe,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    importRecipeFromUrl,
    bulkImportRecipes,
    loadScrapingHistory,
    retryScrapingJob,
  };

  return (
    <LocalRecipeContext.Provider value={value}>
      {children}
    </LocalRecipeContext.Provider>
  );
};