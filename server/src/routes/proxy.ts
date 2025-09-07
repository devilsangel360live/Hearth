import { Router } from 'express';

const router = Router();

// Simple health check endpoint - proxy system removed
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy service removed - use direct URL scraping instead' });
});

export { router as proxyRoutes };