import { Router } from 'express';
import { scrapingController } from '../controllers/scrapingController';

const router = Router();

// Scrape a recipe from URL
router.post('/scrape', scrapingController.scrapeRecipe);

// Get scraping status
router.get('/status/:jobId', scrapingController.getScrapingStatus);

// Get scraping history
router.get('/history', scrapingController.getScrapingHistory);

// Retry failed scraping job
router.post('/retry/:jobId', scrapingController.retryScrapingJob);

// Bulk scrape multiple URLs
router.post('/bulk-scrape', scrapingController.bulkScrapeRecipes);

export { router as scrapingRoutes };