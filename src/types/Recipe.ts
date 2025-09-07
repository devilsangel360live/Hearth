export interface Recipe {
  id: string;
  title: string;
  image?: string;
  summary?: string;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  diets: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition?: NutritionInfo;
  sourceUrl?: string;
  sourceName?: string;
  pricePerServing?: number;
  healthScore?: number;
  spoonacularScore?: number;
  cheap?: boolean;
  dairyFree?: boolean;
  glutenFree?: boolean;
  ketogenic?: boolean;
  lowFodmap?: boolean;
  sustainable?: boolean;
  vegan?: boolean;
  vegetarian?: boolean;
  veryHealthy?: boolean;
  veryPopular?: boolean;
  whole30?: boolean;
  tags?: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  original: string; // Original text from API
  originalName?: string;
  aisle?: string;
  consistency?: string;
  image?: string;
}

export interface Instruction {
  number: number;
  step: string;
  ingredients?: string[];
  equipment?: string[];
  length?: {
    number: number;
    unit: string;
  };
}

export interface NutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  nutrients?: Nutrient[];
}

export interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds: number;
}

export interface RecipeSearchFilters {
  query?: string;
  cuisine?: string[];
  diet?: string[];
  intolerances?: string[];
  includeIngredients?: string[];
  excludeIngredients?: string[];
  type?: string;
  minReadyTime?: number;
  maxReadyTime?: number;
  minServings?: number;
  maxServings?: number;
  minCalories?: number;
  maxCalories?: number;
  sort?: 'popularity' | 'healthiness' | 'price' | 'time' | 'random';
  sortDirection?: 'asc' | 'desc';
}

export interface RecipeSearchResponse {
  results: Recipe[];
  offset: number;
  number: number;
  totalResults: number;
}

export interface ApiError {
  code: number;
  message: string;
  status: string;
}