import { Router } from 'express';
import { collectionController } from '../controllers/collectionController';

const router = Router();

// Get all collections
router.get('/', collectionController.getAllCollections);

// Get a specific collection by ID
router.get('/:id', collectionController.getCollectionById);

// Create a new collection
router.post('/', collectionController.createCollection);

// Update a collection
router.put('/:id', collectionController.updateCollection);

// Delete a collection
router.delete('/:id', collectionController.deleteCollection);

// Add recipe to collection
router.post('/:id/recipes', collectionController.addRecipeToCollection);

// Remove recipe from collection
router.delete('/:id/recipes/:recipeId', collectionController.removeRecipeFromCollection);

// Get recipes in a collection
router.get('/:id/recipes', collectionController.getRecipesInCollection);

export { router as collectionRoutes };