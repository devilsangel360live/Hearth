import { Request, Response } from 'express';
import { prisma } from '../index';
import { RecipeService } from '../services/RecipeService';

const recipeService = new RecipeService();

export const recipeController = {
  async getAllRecipes(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const cuisine = req.query.cuisine as string;
      const diet = req.query.diet as string;
      const isBookmarked = req.query.bookmarked === 'true';
      const isFavorite = req.query.favorite === 'true';
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (cuisine) {
        where.cuisines = {
          some: {
            cuisine: {
              name: {
                contains: cuisine,
                mode: 'insensitive'
              }
            }
          }
        };
      }
      
      if (diet) {
        where.diets = {
          some: {
            diet: {
              name: {
                contains: diet,
                mode: 'insensitive'
              }
            }
          }
        };
      }
      
      if (isBookmarked) {
        where.isBookmarked = true;
      }
      
      if (isFavorite) {
        where.isFavorite = true;
      }

      const [recipes, totalCount] = await Promise.all([
        prisma.recipe.findMany({
          where,
          skip,
          take: limit,
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.recipe.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      res.json({
        recipes: recipes.map(recipeService.transformRecipeForClient),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage
        }
      });
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  },

  async getRecipeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const recipe = await prisma.recipe.findUnique({
        where: { id },
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
          },
          collections: {
            include: {
              collection: true
            }
          }
        }
      });

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json(recipeService.transformRecipeForClient(recipe));
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  },

  async searchRecipes(req: Request, res: Response) {
    try {
      const { query } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const skip = (page - 1) * limit;

      const [recipes, totalCount] = await Promise.all([
        prisma.recipe.findMany({
          where: {
            OR: [
              {
                title: {
                  contains: query
                }
              },
              {
                summary: {
                  contains: query
                }
              },
              {
                ingredients: {
                  some: {
                    ingredient: {
                      name: {
                        contains: query
                      }
                    }
                  }
                }
              },
              {
                tags: {
                  some: {
                    tag: {
                      name: {
                        contains: query
                      }
                    }
                  }
                }
              }
            ]
          },
          skip,
          take: limit,
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.recipe.count({
          where: {
            OR: [
              {
                title: {
                  contains: query
                }
              },
              {
                summary: {
                  contains: query
                }
              },
              {
                ingredients: {
                  some: {
                    ingredient: {
                      name: {
                        contains: query
                      }
                    }
                  }
                }
              },
              {
                tags: {
                  some: {
                    tag: {
                      name: {
                        contains: query
                      }
                    }
                  }
                }
              }
            ]
          }
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        recipes: recipes.map(recipeService.transformRecipeForClient),
        query,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error searching recipes:', error);
      res.status(500).json({ error: 'Failed to search recipes' });
    }
  },

  async createRecipe(req: Request, res: Response) {
    try {
      const recipeData = req.body;
      const recipe = await recipeService.createRecipe(recipeData);
      res.status(201).json(recipeService.transformRecipeForClient(recipe));
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  },

  async updateRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const recipe = await recipeService.updateRecipe(id, updateData);
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      res.json(recipeService.transformRecipeForClient(recipe));
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  },

  async deleteRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const recipe = await prisma.recipe.findUnique({ where: { id } });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      await prisma.recipe.delete({ where: { id } });
      
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  },

  async getRecipeNutrition(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const nutrition = await prisma.nutrition.findUnique({
        where: { recipeId: id }
      });
      
      if (!nutrition) {
        return res.status(404).json({ error: 'Nutrition info not found' });
      }
      
      res.json(nutrition);
    } catch (error) {
      console.error('Error fetching nutrition:', error);
      res.status(500).json({ error: 'Failed to fetch nutrition info' });
    }
  },

  async toggleBookmark(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const recipe = await prisma.recipe.findUnique({ where: { id } });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: { isBookmarked: !recipe.isBookmarked }
      });
      
      res.json({ isBookmarked: updatedRecipe.isBookmarked });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
  },

  async toggleFavorite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const recipe = await prisma.recipe.findUnique({ where: { id } });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: { isFavorite: !recipe.isFavorite }
      });
      
      res.json({ isFavorite: updatedRecipe.isFavorite });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  },

  async rateRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 0 and 5' });
      }
      
      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: { personalRating: rating }
      });
      
      res.json({ personalRating: updatedRecipe.personalRating });
    } catch (error) {
      console.error('Error rating recipe:', error);
      res.status(500).json({ error: 'Failed to rate recipe' });
    }
  },

  async getSimilarRecipes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;
      
      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
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
          tags: {
            include: {
              tag: true
            }
          }
        }
      });
      
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      const cuisineNames = recipe.cuisines.map(c => c.cuisine.name);
      const dietNames = recipe.diets.map(d => d.diet.name);
      const tagNames = recipe.tags.map(t => t.tag.name);
      
      const similarRecipes = await prisma.recipe.findMany({
        where: {
          id: { not: id }, // Exclude the current recipe
          OR: [
            {
              cuisines: {
                some: {
                  cuisine: {
                    name: { in: cuisineNames }
                  }
                }
              }
            },
            {
              diets: {
                some: {
                  diet: {
                    name: { in: dietNames }
                  }
                }
              }
            },
            {
              tags: {
                some: {
                  tag: {
                    name: { in: tagNames }
                  }
                }
              }
            }
          ]
        },
        take: limit,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      res.json(similarRecipes.map(recipeService.transformRecipeForClient));
    } catch (error) {
      console.error('Error fetching similar recipes:', error);
      res.status(500).json({ error: 'Failed to fetch similar recipes' });
    }
  }
};