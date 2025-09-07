import { Recipe } from '@/types';

export const formatCookingTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatServings = (servings: number): string => {
  if (servings === 1) {
    return '1 serving';
  }
  return `${servings} servings`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + '...';
};

export const stripHtmlTags = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

export const generateRecipeSlug = (title: string, id: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  return `${slug}-${id}`;
};

export const getRecipeImageUrl = (recipe: Recipe, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  if (!recipe.image) {
    return getPlaceholderImageUrl(size);
  }
  
  // Handle Spoonacular image URLs with size parameters
  if (recipe.image.includes('spoonacular.com')) {
    const sizeMap = {
      small: '240x150',
      medium: '480x360',
      large: '636x393',
    };
    
    // Replace size in URL if it exists, otherwise append
    const hasSize = /\d+x\d+/.test(recipe.image);
    if (hasSize) {
      return recipe.image.replace(/\d+x\d+/, sizeMap[size]);
    }
    return `${recipe.image}?size=${sizeMap[size]}`;
  }
  
  return recipe.image;
};

export const getPlaceholderImageUrl = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const sizeMap = {
    small: '240x150',
    medium: '480x360',
    large: '636x393',
  };
  
  return `https://via.placeholder.com/${sizeMap[size]}/f97316/ffffff?text=Recipe`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const formatNutritionValue = (value: string | number | undefined): string => {
  if (!value) return 'N/A';
  
  if (typeof value === 'string') {
    // Try to extract number from string like "123.45g"
    const match = value.match(/^[\d.]+/);
    if (match) {
      const num = parseFloat(match[0]);
      return !isNaN(num) ? Math.round(num).toString() : value;
    }
    return value;
  }
  
  return Math.round(value).toString();
};

export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to get from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove from localStorage:', error);
  }
};