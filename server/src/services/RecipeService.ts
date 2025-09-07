import { prisma } from '../index';
import { Recipe, Ingredient, Nutrition } from '../../../generated/prisma';

export interface CreateRecipeData {
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

export class RecipeService {
  // Transform database recipe to client format
  transformRecipeForClient(recipe: any) {
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
      collections: recipe.collections?.map((rc: any) => ({
        id: rc.collection.id,
        name: rc.collection.name,
        addedAt: rc.addedAt,
      })) || [],
    };
  }

  async createRecipe(data: CreateRecipeData) {
    const recipe = await prisma.$transaction(async (tx) => {
      // Create the recipe first
      const newRecipe = await tx.recipe.create({
        data: {
          title: data.title,
          image: data.image,
          summary: data.summary,
          sourceUrl: data.sourceUrl,
          sourceName: data.sourceName,
          readyInMinutes: data.readyInMinutes,
          servings: data.servings,
          healthScore: data.healthScore,
          vegetarian: data.vegetarian || false,
          vegan: data.vegan || false,
          glutenFree: data.glutenFree || false,
          dairyFree: data.dairyFree || false,
          sustainable: data.sustainable || false,
          spoonacularId: data.spoonacularId,
          externalId: data.externalId,
          scrapedAt: new Date(),
        },
      });

      // Create ingredients and recipe-ingredient relationships
      const processedIngredients = new Set<string>();
      
      for (const ingredientData of data.ingredients) {
        // Skip duplicate ingredients (based on name)
        const ingredientKey = ingredientData.name.toLowerCase();
        if (processedIngredients.has(ingredientKey)) {
          continue;
        }
        processedIngredients.add(ingredientKey);

        // Find or create ingredient
        let ingredient = await tx.ingredient.findUnique({
          where: { name: ingredientKey }
        });

        if (!ingredient) {
          ingredient = await tx.ingredient.create({
            data: {
              name: ingredientKey,
              image: ingredientData.image,
            },
          });
        }

        // Create recipe-ingredient relationship with upsert to handle duplicates
        await tx.recipeIngredient.upsert({
          where: {
            recipeId_ingredientId: {
              recipeId: newRecipe.id,
              ingredientId: ingredient.id,
            },
          },
          update: {
            amount: ingredientData.amount,
            unit: ingredientData.unit,
            original: ingredientData.original,
            consistency: ingredientData.consistency,
            aisle: ingredientData.aisle,
          },
          create: {
            recipeId: newRecipe.id,
            ingredientId: ingredient.id,
            amount: ingredientData.amount,
            unit: ingredientData.unit,
            original: ingredientData.original,
            consistency: ingredientData.consistency,
            aisle: ingredientData.aisle,
          },
        });
      }

      // Create instructions
      for (const instructionData of data.instructions) {
        await tx.instruction.create({
          data: {
            recipeId: newRecipe.id,
            number: instructionData.number,
            step: instructionData.step,
            length: instructionData.length,
          },
        });
      }

      // Create cuisines
      if (data.cuisines && data.cuisines.length > 0) {
        for (const cuisineName of data.cuisines) {
          let cuisine = await tx.cuisine.findUnique({
            where: { name: cuisineName.toLowerCase() }
          });

          if (!cuisine) {
            cuisine = await tx.cuisine.create({
              data: { name: cuisineName.toLowerCase() },
            });
          }

          await tx.recipeCuisine.create({
            data: {
              recipeId: newRecipe.id,
              cuisineId: cuisine.id,
            },
          });
        }
      }

      // Create diets
      if (data.diets && data.diets.length > 0) {
        for (const dietName of data.diets) {
          let diet = await tx.diet.findUnique({
            where: { name: dietName.toLowerCase() }
          });

          if (!diet) {
            diet = await tx.diet.create({
              data: { name: dietName.toLowerCase() },
            });
          }

          await tx.recipeDiet.create({
            data: {
              recipeId: newRecipe.id,
              dietId: diet.id,
            },
          });
        }
      }

      // Create nutrition info
      if (data.nutrition) {
        await tx.nutrition.create({
          data: {
            recipeId: newRecipe.id,
            calories: data.nutrition.calories,
            protein: data.nutrition.protein,
            fat: data.nutrition.fat,
            carbs: data.nutrition.carbs,
            fiber: data.nutrition.fiber,
            sugar: data.nutrition.sugar,
            sodium: data.nutrition.sodium,
            nutrients: data.nutrition.nutrients ? JSON.stringify(data.nutrition.nutrients) : null,
          },
        });
      }

      // Create tags
      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
          let tag = await tx.tag.findUnique({
            where: { name: tagName.toLowerCase() }
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: { name: tagName.toLowerCase() },
            });
          }

          await tx.recipeTag.create({
            data: {
              recipeId: newRecipe.id,
              tagId: tag.id,
            },
          });
        }
      }

      // Return the complete recipe with all relationships
      return await tx.recipe.findUnique({
        where: { id: newRecipe.id },
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
      });
    });

    return recipe;
  }

  async updateRecipe(id: string, data: Partial<CreateRecipeData>) {
    const updatedRecipe = await prisma.$transaction(async (prisma) => {
      // First, update the basic recipe fields
      await prisma.recipe.update({
        where: { id },
        data: {
          title: data.title,
          image: data.image,
          summary: data.summary,
          sourceUrl: data.sourceUrl,
          sourceName: data.sourceName,
          readyInMinutes: data.readyInMinutes,
          servings: data.servings,
          healthScore: data.healthScore,
          vegetarian: data.vegetarian,
          vegan: data.vegan,
          glutenFree: data.glutenFree,
          dairyFree: data.dairyFree,
          sustainable: data.sustainable,
          updatedAt: new Date(),
        }
      });

      // Update ingredients if provided
      if (data.ingredients) {
        // Delete existing recipe ingredients
        await prisma.recipeIngredient.deleteMany({
          where: { recipeId: id }
        });

        // Add new ingredients
        for (const ingredientData of data.ingredients) {
          // Find or create ingredient
          let ingredient = await prisma.ingredient.findFirst({
            where: { name: ingredientData.name }
          });

          if (!ingredient) {
            ingredient = await prisma.ingredient.create({
              data: {
                name: ingredientData.name,
                image: ingredientData.image,
                category: ingredientData.aisle, // Map aisle to category
              }
            });
          }

          // Create recipe ingredient relationship
          await prisma.recipeIngredient.create({
            data: {
              recipeId: id,
              ingredientId: ingredient.id,
              amount: ingredientData.amount,
              unit: ingredientData.unit || '',
              original: ingredientData.original || '',
              consistency: ingredientData.consistency,
              aisle: ingredientData.aisle,
            }
          });
        }
      }

      // Update instructions if provided
      if (data.instructions) {
        // Delete existing instructions
        await prisma.instruction.deleteMany({
          where: { recipeId: id }
        });

        // Add new instructions
        for (const instructionData of data.instructions) {
          await prisma.instruction.create({
            data: {
              recipeId: id,
              number: instructionData.number,
              step: instructionData.step,
              length: instructionData.length,
            }
          });
        }
      }

      // Update tags if provided
      if (data.tags) {
        // Delete existing recipe tags
        await prisma.recipeTag.deleteMany({
          where: { recipeId: id }
        });

        // Add new tags
        for (const tagName of data.tags) {
          let tag = await prisma.tag.findUnique({
            where: { name: tagName.toLowerCase() }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: { name: tagName.toLowerCase() }
            });
          }

          await prisma.recipeTag.create({
            data: {
              recipeId: id,
              tagId: tag.id,
            }
          });
        }
      }

      // Return the updated recipe with all relationships
      return await prisma.recipe.findUnique({
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
          }
        }
      });
    });

    return updatedRecipe;
  }

  async findRecipeByUrl(url: string) {
    return await prisma.recipe.findFirst({
      where: { sourceUrl: url },
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
    });
  }

  async findRecipeBySpoonacularId(spoonacularId: number) {
    return await prisma.recipe.findUnique({
      where: { spoonacularId },
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
    });
  }
}