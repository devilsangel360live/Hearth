import { Recipe, RecipeSearchFilters } from '@/types';

const API_BASE_URL = '/api';

interface CreateLocalRecipeData {
  title: string;
  image?: string;
  summary?: string;
  sourceUrl?: string;
  sourceName?: string;
  readyInMinutes?: number;
  servings?: number;
  healthScore?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  sustainable?: boolean;
  spoonacularId?: number;
  externalId?: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit?: string;
    original?: string;
    image?: string;
    consistency?: string;
    aisle?: string;
  }>;
  instructions: Array<{
    number: number;
    step: string;
    length?: number;
  }>;
  cuisines?: string[];
  diets?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    nutrients?: Array<{
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds?: number;
    }>;
  };
  tags?: string[];
}

class LocalRecipeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LocalRecipeApiError';
  }
}

class LocalRecipeApi {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          errorData: errorData
        });
        throw new LocalRecipeApiError(
          response.status,
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof LocalRecipeApiError) {
        throw error;
      }
      console.error('Network error details:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        url: url,
        options: options
      });
      throw new LocalRecipeApiError(0, `Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Recipe Management
  async getLocalRecipes(filters: {
    page?: number;
    limit?: number;
    cuisine?: string;
    diet?: string;
    bookmarked?: boolean;
    favorite?: boolean;
  } = {}): Promise<{
    recipes: Recipe[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.cuisine) params.append('cuisine', filters.cuisine);
    if (filters.diet) params.append('diet', filters.diet);
    if (filters.bookmarked) params.append('bookmarked', 'true');
    if (filters.favorite) params.append('favorite', 'true');

    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/recipes?${params}`);
  }

  async getLocalRecipe(id: string): Promise<Recipe> {
    return this.fetchWithErrorHandling<Recipe>(`${API_BASE_URL}/recipes/${id}`);
  }

  async searchLocalRecipes(query: string, page = 1, limit = 12): Promise<{
    recipes: Recipe[];
    query: string;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const url = `${API_BASE_URL}/recipes/search/${encodeURIComponent(query)}?page=${page}&limit=${limit}`;
    console.log('Search API URL:', url);
    try {
      const result = await this.fetchWithErrorHandling<any>(url);
      console.log('Search API result:', result);
      return result;
    } catch (error) {
      console.error('Search API error:', error);
      throw error;
    }
  }

  async createLocalRecipe(recipeData: CreateLocalRecipeData): Promise<Recipe> {
    return this.fetchWithErrorHandling<Recipe>(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      body: JSON.stringify(recipeData),
    });
  }

  async updateLocalRecipe(id: string, recipeData: Partial<CreateLocalRecipeData>): Promise<Recipe> {
    return this.fetchWithErrorHandling<Recipe>(`${API_BASE_URL}/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipeData),
    });
  }

  async deleteLocalRecipe(id: string): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>(`${API_BASE_URL}/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  // Recipe Actions
  async toggleBookmark(id: string): Promise<{ isBookmarked: boolean }> {
    return this.fetchWithErrorHandling<{ isBookmarked: boolean }>(`${API_BASE_URL}/recipes/${id}/bookmark`, {
      method: 'PATCH',
    });
  }

  async toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
    return this.fetchWithErrorHandling<{ isFavorite: boolean }>(`${API_BASE_URL}/recipes/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  async rateRecipe(id: string, rating: number): Promise<{ personalRating: number }> {
    return this.fetchWithErrorHandling<{ personalRating: number }>(`${API_BASE_URL}/recipes/${id}/rating`, {
      method: 'PATCH',
      body: JSON.stringify({ rating }),
    });
  }

  async getSimilarRecipes(id: string, limit = 6): Promise<Recipe[]> {
    return this.fetchWithErrorHandling<Recipe[]>(`${API_BASE_URL}/recipes/${id}/similar?limit=${limit}`);
  }

  // Collections
  async getCollections(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault: boolean;
    recipeCount: number;
    recipes: Recipe[];
  }>> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/collections`);
  }

  async getCollection(id: string, page = 1, limit = 12): Promise<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault: boolean;
    recipes: Recipe[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/collections/${id}?page=${page}&limit=${limit}`);
  }

  async createCollection(name: string, description?: string, color?: string): Promise<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault: boolean;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/collections`, {
      method: 'POST',
      body: JSON.stringify({ name, description, color }),
    });
  }

  async updateCollection(id: string, name?: string, description?: string, color?: string): Promise<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    isDefault: boolean;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, color }),
    });
  }

  async deleteCollection(id: string): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>(`${API_BASE_URL}/collections/${id}`, {
      method: 'DELETE',
    });
  }

  async addRecipeToCollection(collectionId: string, recipeId: string): Promise<{ message: string; addedAt: string }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/collections/${collectionId}/recipes`, {
      method: 'POST',
      body: JSON.stringify({ recipeId }),
    });
  }

  async removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<{ message: string }> {
    return this.fetchWithErrorHandling<{ message: string }>(`${API_BASE_URL}/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  }

  // Recipe Scraping
  async scrapeRecipe(url: string): Promise<{
    status: 'processing' | 'success';
    jobId?: string;
    recipe?: Recipe;
    message: string;
    cached?: boolean;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/scraping/scrape`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getScrapingStatus(jobId: string): Promise<{
    jobId: string;
    url: string;
    status: 'processing' | 'success' | 'failed';
    scrapedAt: string;
    updatedAt: string;
    errorMessage?: string;
    retryCount: number;
    recipe?: Recipe;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/scraping/status/${jobId}`);
  }

  async getScrapingHistory(page = 1, limit = 20, status?: 'processing' | 'success' | 'failed'): Promise<{
    jobs: Array<{
      id: string;
      url: string;
      status: 'processing' | 'success' | 'failed';
      scrapedAt: string;
      updatedAt: string;
      errorMessage?: string;
      retryCount: number;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/scraping/history?${params}`);
  }

  async retryScrapingJob(jobId: string): Promise<{
    status: 'processing';
    jobId: string;
    message: string;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/scraping/retry/${jobId}`, {
      method: 'POST',
    });
  }

  async bulkScrapeRecipes(urls: string[]): Promise<{
    status: 'processing';
    jobIds: string[];
    message: string;
  }> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/scraping/bulk-scrape`, {
      method: 'POST',
      body: JSON.stringify({ urls }),
    });
  }

  // Health Check
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.fetchWithErrorHandling<{ status: string; timestamp: string }>(`${API_BASE_URL}/health`);
  }

  // Convert Spoonacular Recipe to Local Format
  convertSpoonacularToLocal(spoonacularRecipe: Recipe): CreateLocalRecipeData {
    return {
      title: spoonacularRecipe.title,
      image: spoonacularRecipe.image,
      summary: spoonacularRecipe.summary,
      sourceUrl: spoonacularRecipe.sourceUrl,
      sourceName: spoonacularRecipe.sourceName || 'Spoonacular',
      readyInMinutes: spoonacularRecipe.readyInMinutes,
      servings: spoonacularRecipe.servings,
      healthScore: spoonacularRecipe.healthScore,
      vegetarian: spoonacularRecipe.vegetarian,
      vegan: spoonacularRecipe.vegan,
      glutenFree: spoonacularRecipe.glutenFree,
      dairyFree: spoonacularRecipe.dairyFree,
      spoonacularId: typeof spoonacularRecipe.id === 'string' ? parseInt(spoonacularRecipe.id) : spoonacularRecipe.id,
      ingredients: spoonacularRecipe.ingredients?.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        original: ing.original,
        image: ing.image
      })) || [],
      instructions: spoonacularRecipe.instructions?.map(inst => ({
        number: inst.number,
        step: inst.step,
        length: inst.length?.number
      })) || [],
      cuisines: spoonacularRecipe.cuisines || [],
      diets: spoonacularRecipe.diets || [],
      nutrition: spoonacularRecipe.nutrition ? {
        calories: spoonacularRecipe.nutrition.calories ? parseFloat(spoonacularRecipe.nutrition.calories) : undefined,
        protein: spoonacularRecipe.nutrition.protein ? parseFloat(spoonacularRecipe.nutrition.protein) : undefined,
        fat: spoonacularRecipe.nutrition.fat ? parseFloat(spoonacularRecipe.nutrition.fat) : undefined,
        carbs: spoonacularRecipe.nutrition.carbs ? parseFloat(spoonacularRecipe.nutrition.carbs) : undefined,
        fiber: spoonacularRecipe.nutrition.fiber ? parseFloat(spoonacularRecipe.nutrition.fiber) : undefined,
        sugar: spoonacularRecipe.nutrition.sugar ? parseFloat(spoonacularRecipe.nutrition.sugar) : undefined,
        sodium: spoonacularRecipe.nutrition.sodium ? parseFloat(spoonacularRecipe.nutrition.sodium) : undefined,
        nutrients: spoonacularRecipe.nutrition.nutrients
      } : undefined
    };
  }

  // Convert Scraped Recipe to Local Format
  convertScrapedToLocal(scrapedRecipe: any): CreateLocalRecipeData {
    return {
      title: scrapedRecipe.title,
      image: scrapedRecipe.image,
      summary: scrapedRecipe.summary,
      sourceUrl: scrapedRecipe.sourceUrl,
      sourceName: scrapedRecipe.sourceName,
      readyInMinutes: scrapedRecipe.readyInMinutes,
      servings: scrapedRecipe.servings,
      healthScore: scrapedRecipe.healthScore,
      vegetarian: scrapedRecipe.vegetarian,
      vegan: scrapedRecipe.vegan,
      glutenFree: scrapedRecipe.glutenFree,
      dairyFree: scrapedRecipe.dairyFree,
      externalId: scrapedRecipe.id?.toString(),
      ingredients: (scrapedRecipe.extendedIngredients || scrapedRecipe.ingredients || []).map((ing: any) => ({
        name: ing.name || ing.nameClean || '',
        amount: ing.amount || 0,
        unit: ing.unit || ing.unitShort || ing.unitLong || '',
        original: ing.original || '',
        image: ing.image,
        consistency: ing.consistency,
        aisle: ing.aisle
      })),
      instructions: (scrapedRecipe.analyzedInstructions?.[0]?.steps || scrapedRecipe.instructions || []).map((step: any) => ({
        number: step.number,
        step: step.step,
        length: step.length
      })),
      cuisines: scrapedRecipe.cuisines || [],
      diets: scrapedRecipe.diets || [],
      nutrition: scrapedRecipe.nutrition ? {
        calories: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Calories')?.amount,
        protein: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Protein')?.amount,
        fat: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Fat')?.amount,
        carbs: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount,
        fiber: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Fiber')?.amount,
        sugar: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Sugar')?.amount,
        sodium: scrapedRecipe.nutrition.nutrients?.find((n: any) => n.name === 'Sodium')?.amount,
        nutrients: scrapedRecipe.nutrition.nutrients
      } : undefined,
      tags: scrapedRecipe.tags || []
    };
  }
}

export const localRecipeApi = new LocalRecipeApi();
export { LocalRecipeApiError };