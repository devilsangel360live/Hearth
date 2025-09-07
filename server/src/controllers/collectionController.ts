import { Request, Response } from 'express';
import { prisma } from '../index';

export const collectionController = {
  async getAllCollections(req: Request, res: Response) {
    try {
      const collections = await prisma.collection.findMany({
        include: {
          recipes: {
            include: {
              recipe: {
                select: {
                  id: true,
                  title: true,
                  image: true,
                  readyInMinutes: true,
                  servings: true,
                }
              }
            }
          },
          _count: {
            select: {
              recipes: true
            }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      res.json(collections.map(collection => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        isDefault: collection.isDefault,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        recipeCount: collection._count.recipes,
        recipes: collection.recipes.slice(0, 4).map(rc => ({ // Show first 4 recipes as preview
          ...rc.recipe,
          addedAt: rc.addedAt
        }))
      })));
    } catch (error) {
      console.error('Error fetching collections:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  },

  async getCollectionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const skip = (page - 1) * limit;

      const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
          recipes: {
            skip,
            take: limit,
            include: {
              recipe: {
                include: {
                  ingredients: {
                    include: {
                      ingredient: true
                    }
                  },
                  instructions: {
                    orderBy: {
                      number: 'asc'
                    }
                  },
                  cuisines: {
                    include: {
                      cuisine: true
                    }
                  },
                  diets: {
                    include: {
                      diet: true
                    }
                  },
                  nutrition: true,
                  tags: {
                    include: {
                      tag: true
                    }
                  }
                }
              }
            },
            orderBy: {
              addedAt: 'desc'
            }
          },
          _count: {
            select: {
              recipes: true
            }
          }
        }
      });

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const totalRecipes = collection._count.recipes;
      const totalPages = Math.ceil(totalRecipes / limit);

      res.json({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        isDefault: collection.isDefault,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        recipes: collection.recipes.map(rc => ({
          ...transformRecipeForClient(rc.recipe),
          addedAt: rc.addedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalRecipes,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching collection:', error);
      res.status(500).json({ error: 'Failed to fetch collection' });
    }
  },

  async createCollection(req: Request, res: Response) {
    try {
      const { name, description, color } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Collection name is required' });
      }

      const collection = await prisma.collection.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          color: color,
          isDefault: false
        }
      });

      res.status(201).json(collection);
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({ error: 'Failed to create collection' });
    }
  },

  async updateCollection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;

      const collection = await prisma.collection.findUnique({ where: { id } });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      if (collection.isDefault) {
        return res.status(400).json({ error: 'Default collections cannot be modified' });
      }

      const updatedCollection = await prisma.collection.update({
        where: { id },
        data: {
          name: name?.trim() || collection.name,
          description: description?.trim(),
          color: color || collection.color,
        }
      });

      res.json(updatedCollection);
    } catch (error) {
      console.error('Error updating collection:', error);
      res.status(500).json({ error: 'Failed to update collection' });
    }
  },

  async deleteCollection(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const collection = await prisma.collection.findUnique({ where: { id } });
      
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      if (collection.isDefault) {
        return res.status(400).json({ error: 'Default collections cannot be deleted' });
      }

      await prisma.collection.delete({ where: { id } });

      res.json({ message: 'Collection deleted successfully' });
    } catch (error) {
      console.error('Error deleting collection:', error);
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  },

  async addRecipeToCollection(req: Request, res: Response) {
    try {
      const { id } = req.params; // collection id
      const { recipeId } = req.body;

      if (!recipeId || typeof recipeId !== 'string') {
        return res.status(400).json({ error: 'Recipe ID is required' });
      }

      // Check if collection and recipe exist
      const [collection, recipe] = await Promise.all([
        prisma.collection.findUnique({ where: { id } }),
        prisma.recipe.findUnique({ where: { id: recipeId } })
      ]);

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Check if recipe is already in collection
      const existingRelation = await prisma.recipeCollection.findUnique({
        where: {
          recipeId_collectionId: {
            recipeId,
            collectionId: id
          }
        }
      });

      if (existingRelation) {
        return res.status(400).json({ error: 'Recipe is already in this collection' });
      }

      // Add recipe to collection
      const recipeCollection = await prisma.recipeCollection.create({
        data: {
          recipeId,
          collectionId: id
        }
      });

      res.status(201).json({
        message: 'Recipe added to collection successfully',
        addedAt: recipeCollection.addedAt
      });
    } catch (error) {
      console.error('Error adding recipe to collection:', error);
      res.status(500).json({ error: 'Failed to add recipe to collection' });
    }
  },

  async removeRecipeFromCollection(req: Request, res: Response) {
    try {
      const { id, recipeId } = req.params;

      const recipeCollection = await prisma.recipeCollection.findUnique({
        where: {
          recipeId_collectionId: {
            recipeId,
            collectionId: id
          }
        }
      });

      if (!recipeCollection) {
        return res.status(404).json({ error: 'Recipe not found in collection' });
      }

      await prisma.recipeCollection.delete({
        where: {
          id: recipeCollection.id
        }
      });

      res.json({ message: 'Recipe removed from collection successfully' });
    } catch (error) {
      console.error('Error removing recipe from collection:', error);
      res.status(500).json({ error: 'Failed to remove recipe from collection' });
    }
  },

  async getRecipesInCollection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const skip = (page - 1) * limit;

      const collection = await prisma.collection.findUnique({
        where: { id }
      });

      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const [recipeCollections, totalCount] = await Promise.all([
        prisma.recipeCollection.findMany({
          where: { collectionId: id },
          skip,
          take: limit,
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true
                  }
                },
                instructions: {
                  orderBy: {
                    number: 'asc'
                  }
                },
                cuisines: {
                  include: {
                    cuisine: true
                  }
                },
                diets: {
                  include: {
                    diet: true
                  }
                },
                nutrition: true,
                tags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          },
          orderBy: {
            addedAt: 'desc'
          }
        }),
        prisma.recipeCollection.count({
          where: { collectionId: id }
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        recipes: recipeCollections.map(rc => ({
          ...transformRecipeForClient(rc.recipe),
          addedAt: rc.addedAt
        })),
        collection: {
          id: collection.id,
          name: collection.name,
          description: collection.description
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching recipes in collection:', error);
      res.status(500).json({ error: 'Failed to fetch recipes in collection' });
    }
  }
};

// Helper function to transform recipe data
function transformRecipeForClient(recipe: any) {
  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    summary: recipe.summary,
    sourceUrl: recipe.sourceUrl,
    sourceName: recipe.sourceName,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    healthScore: recipe.healthScore,
    vegetarian: recipe.vegetarian,
    vegan: recipe.vegan,
    glutenFree: recipe.glutenFree,
    dairyFree: recipe.dairyFree,
    sustainable: recipe.sustainable,
    spoonacularId: recipe.spoonacularId,
    isBookmarked: recipe.isBookmarked,
    isFavorite: recipe.isFavorite,
    personalRating: recipe.personalRating,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    scrapedAt: recipe.scrapedAt,
    ingredients: recipe.ingredients?.map((ri: any) => ({
      id: ri.ingredient.id,
      name: ri.ingredient.name,
      image: ri.ingredient.image,
      amount: ri.amount,
      unit: ri.unit,
      original: ri.original,
      consistency: ri.consistency,
      aisle: ri.aisle,
    })) || [],
    instructions: recipe.instructions?.map((inst: any) => ({
      number: inst.number,
      step: inst.step,
      length: inst.length,
    })) || [],
    cuisines: recipe.cuisines?.map((rc: any) => rc.cuisine.name) || [],
    diets: recipe.diets?.map((rd: any) => rd.diet.name) || [],
    tags: recipe.tags?.map((rt: any) => rt.tag.name) || [],
    nutrition: recipe.nutrition ? {
      calories: recipe.nutrition.calories,
      protein: recipe.nutrition.protein,
      fat: recipe.nutrition.fat,
      carbs: recipe.nutrition.carbs,
      fiber: recipe.nutrition.fiber,
      sugar: recipe.nutrition.sugar,
      sodium: recipe.nutrition.sodium,
      nutrients: recipe.nutrition.nutrients ? JSON.parse(recipe.nutrition.nutrients) : [],
    } : null,
  };
}