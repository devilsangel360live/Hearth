import { Request, Response } from 'express';
import { prisma } from '../index';
import { RecipeScrapingService } from '../services/RecipeScrapingService';
import { RecipeService } from '../services/RecipeService';

const scrapingService = new RecipeScrapingService();
const recipeService = new RecipeService();

export const scrapingController = {
  async scrapeRecipe(req: Request, res: Response) {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Valid URL is required' });
      }

      // Check if URL has already been scraped
      const existingScrapedUrl = await prisma.scrapedUrl.findUnique({
        where: { url }
      });

      if (existingScrapedUrl) {
        if (existingScrapedUrl.status === 'success' && existingScrapedUrl.recipeId) {
          // Return existing recipe
          const recipe = await prisma.recipe.findUnique({
            where: { id: existingScrapedUrl.recipeId },
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

          if (recipe) {
            return res.json({
              status: 'success',
              recipe: recipeService.transformRecipeForClient(recipe),
              cached: true
            });
          }
        } else if (existingScrapedUrl.status === 'processing') {
          return res.json({
            status: 'processing',
            jobId: existingScrapedUrl.id,
            message: 'Recipe is currently being scraped'
          });
        }
      }

      // Create or update scraping job
      const scrapingJob = await prisma.scrapedUrl.upsert({
        where: { url },
        update: {
          status: 'processing',
          updatedAt: new Date(),
          retryCount: { increment: 1 }
        },
        create: {
          url,
          status: 'processing'
        }
      });

      // Start scraping process
      scrapingService.scrapeRecipe(url, scrapingJob.id)
        .then(async (recipeData) => {
          if (recipeData) {
            const recipe = await recipeService.createRecipe(recipeData);
            await prisma.scrapedUrl.update({
              where: { id: scrapingJob.id },
              data: {
                status: 'success',
                recipeId: recipe?.id,
                updatedAt: new Date()
              }
            });
          } else {
            await prisma.scrapedUrl.update({
              where: { id: scrapingJob.id },
              data: {
                status: 'failed',
                errorMessage: 'Could not extract recipe data',
                updatedAt: new Date()
              }
            });
          }
        })
        .catch(async (error) => {
          console.error('Scraping failed:', error);
          await prisma.scrapedUrl.update({
            where: { id: scrapingJob.id },
            data: {
              status: 'failed',
              errorMessage: error.message,
              updatedAt: new Date()
            }
          });
        });

      res.json({
        status: 'processing',
        jobId: scrapingJob.id,
        message: 'Recipe scraping started. Check status endpoint for progress.'
      });
    } catch (error) {
      console.error('Error starting scrape:', error);
      res.status(500).json({ error: 'Failed to start scraping' });
    }
  },

  async getScrapingStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      
      const scrapingJob = await prisma.scrapedUrl.findUnique({
        where: { id: jobId }
      });

      if (!scrapingJob) {
        return res.status(404).json({ error: 'Scraping job not found' });
      }

      let recipe = null;
      if (scrapingJob.status === 'success' && scrapingJob.recipeId) {
        const fullRecipe = await prisma.recipe.findUnique({
          where: { id: scrapingJob.recipeId },
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
        
        if (fullRecipe) {
          recipe = recipeService.transformRecipeForClient(fullRecipe);
        }
      }

      res.json({
        jobId: scrapingJob.id,
        url: scrapingJob.url,
        status: scrapingJob.status,
        scrapedAt: scrapingJob.scrapedAt,
        updatedAt: scrapingJob.updatedAt,
        errorMessage: scrapingJob.errorMessage,
        retryCount: scrapingJob.retryCount,
        recipe
      });
    } catch (error) {
      console.error('Error fetching scraping status:', error);
      res.status(500).json({ error: 'Failed to fetch scraping status' });
    }
  },

  async getScrapingHistory(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [scrapingJobs, totalCount] = await Promise.all([
        prisma.scrapedUrl.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            scrapedAt: 'desc'
          }
        }),
        prisma.scrapedUrl.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        jobs: scrapingJobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching scraping history:', error);
      res.status(500).json({ error: 'Failed to fetch scraping history' });
    }
  },

  async retryScrapingJob(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      
      const scrapingJob = await prisma.scrapedUrl.findUnique({
        where: { id: jobId }
      });

      if (!scrapingJob) {
        return res.status(404).json({ error: 'Scraping job not found' });
      }

      if (scrapingJob.status === 'processing') {
        return res.status(400).json({ error: 'Job is already processing' });
      }

      // Update job status and start scraping
      await prisma.scrapedUrl.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          updatedAt: new Date(),
          retryCount: { increment: 1 }
        }
      });

      // Start scraping process (same as above)
      scrapingService.scrapeRecipe(scrapingJob.url, scrapingJob.id)
        .then(async (recipeData) => {
          if (recipeData) {
            const recipe = await recipeService.createRecipe(recipeData);
            await prisma.scrapedUrl.update({
              where: { id: scrapingJob.id },
              data: {
                status: 'success',
                recipeId: recipe?.id,
                updatedAt: new Date()
              }
            });
          } else {
            await prisma.scrapedUrl.update({
              where: { id: scrapingJob.id },
              data: {
                status: 'failed',
                errorMessage: 'Could not extract recipe data',
                updatedAt: new Date()
              }
            });
          }
        })
        .catch(async (error) => {
          console.error('Retry scraping failed:', error);
          await prisma.scrapedUrl.update({
            where: { id: scrapingJob.id },
            data: {
              status: 'failed',
              errorMessage: error.message,
              updatedAt: new Date()
            }
          });
        });

      res.json({
        status: 'processing',
        jobId: scrapingJob.id,
        message: 'Scraping retry started'
      });
    } catch (error) {
      console.error('Error retrying scraping job:', error);
      res.status(500).json({ error: 'Failed to retry scraping job' });
    }
  },

  async bulkScrapeRecipes(req: Request, res: Response) {
    try {
      const { urls } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Array of URLs is required' });
      }

      if (urls.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 URLs allowed per batch' });
      }

      const jobIds = [];
      
      for (const url of urls) {
        if (typeof url !== 'string') {
          continue;
        }

        const scrapingJob = await prisma.scrapedUrl.upsert({
          where: { url },
          update: {
            status: 'processing',
            updatedAt: new Date(),
            retryCount: { increment: 1 }
          },
          create: {
            url,
            status: 'processing'
          }
        });

        jobIds.push(scrapingJob.id);

        // Start scraping (fire and forget)
        scrapingService.scrapeRecipe(url, scrapingJob.id)
          .then(async (recipeData) => {
            if (recipeData) {
              const recipe = await recipeService.createRecipe(recipeData);
              await prisma.scrapedUrl.update({
                where: { id: scrapingJob.id },
                data: {
                  status: 'success',
                  recipeId: recipe?.id,
                  updatedAt: new Date()
                }
              });
            } else {
              await prisma.scrapedUrl.update({
                where: { id: scrapingJob.id },
                data: {
                  status: 'failed',
                  errorMessage: 'Could not extract recipe data',
                  updatedAt: new Date()
                }
              });
            }
          })
          .catch(async (error) => {
            console.error('Bulk scraping failed for', url, ':', error);
            await prisma.scrapedUrl.update({
              where: { id: scrapingJob.id },
              data: {
                status: 'failed',
                errorMessage: error.message,
                updatedAt: new Date()
              }
            });
          });
      }

      res.json({
        status: 'processing',
        jobIds,
        message: `Started scraping ${jobIds.length} recipes. Use the status endpoints to check progress.`
      });
    } catch (error) {
      console.error('Error starting bulk scrape:', error);
      res.status(500).json({ error: 'Failed to start bulk scraping' });
    }
  }
};