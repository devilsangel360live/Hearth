export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  filters?: Record<string, any>;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Common filter options
export const CUISINE_TYPES = [
  'African', 'Asian', 'American', 'British', 'Cajun', 'Caribbean', 'Chinese',
  'Eastern European', 'European', 'French', 'German', 'Greek', 'Indian',
  'Irish', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Latin American',
  'Mediterranean', 'Mexican', 'Middle Eastern', 'Nordic', 'Southern',
  'Spanish', 'Thai', 'Vietnamese'
] as const;

export const DIET_TYPES = [
  'Gluten Free', 'Ketogenic', 'Vegetarian', 'Lacto-Vegetarian', 'Ovo-Vegetarian',
  'Vegan', 'Pescetarian', 'Paleo', 'Primal', 'Low FODMAP', 'Whole30'
] as const;

export const MEAL_TYPES = [
  'main course', 'side dish', 'dessert', 'appetizer', 'salad', 'bread',
  'breakfast', 'soup', 'beverage', 'sauce', 'marinade', 'fingerfood',
  'snack', 'drink'
] as const;

export const INTOLERANCES = [
  'Dairy', 'Egg', 'Gluten', 'Grain', 'Peanut', 'Seafood', 'Sesame',
  'Shellfish', 'Soy', 'Sulfite', 'Tree Nut', 'Wheat'
] as const;

export type CuisineType = typeof CUISINE_TYPES[number];
export type DietType = typeof DIET_TYPES[number];
export type MealType = typeof MEAL_TYPES[number];
export type IntoleranceType = typeof INTOLERANCES[number];