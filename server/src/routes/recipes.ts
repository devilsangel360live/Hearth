import { Router } from 'express';
import { recipeController } from '../controllers/recipeController';

const router = Router();

// Get all recipes with filtering and pagination
router.get('/', recipeController.getAllRecipes);

// Get a specific recipe by ID
router.get('/:id', recipeController.getRecipeById);

// Search recipes
router.get('/search/:query', recipeController.searchRecipes);

// Create a new recipe (from scraping or manual entry)
router.post('/', recipeController.createRecipe);

// Update a recipe
router.put('/:id', recipeController.updateRecipe);

// Delete a recipe
router.delete('/:id', recipeController.deleteRecipe);

// Get recipe nutrition info
router.get('/:id/nutrition', recipeController.getRecipeNutrition);

// Toggle bookmark status
router.patch('/:id/bookmark', recipeController.toggleBookmark);

// Toggle favorite status
router.patch('/:id/favorite', recipeController.toggleFavorite);

// Rate a recipe
router.patch('/:id/rating', recipeController.rateRecipe);

// Get similar recipes
router.get('/:id/similar', recipeController.getSimilarRecipes);

export { router as recipeRoutes };