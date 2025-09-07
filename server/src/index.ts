import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '../../generated/prisma';
import { recipeRoutes } from './routes/recipes';
import { scrapingRoutes } from './routes/scraping';
import { collectionRoutes } from './routes/collections';
import { proxyRoutes } from './routes/proxy';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow iframe embedding for web scraping
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your production domain
    : [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:8081',
        'http://10.0.2.2:3002', // Android emulator host mapping
        'http://192.168.1.174:3002', // Mac local IP
        'http://127.0.0.1:3002', // Localhost
        '*' // Allow all origins in development for emulator testing
      ],
  credentials: true,
}));

// Rate limiting disabled for development
// const limiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 1000,
//   message: 'Too many requests from this IP, please try again later.',
// });
// app.use(limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/recipes', recipeRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/proxy', proxyRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📱 Android emulator: http://10.0.2.2:${PORT}/api/health`);
      console.log(`🌐 Network: http://192.168.1.174:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();