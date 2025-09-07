import React, { useState } from 'react';
import { Recipe } from '@/types';

interface SimpleRecipeImporterProps {
  onRecipeScraped: (recipe: Recipe) => void;
  onClose: () => void;
}

interface ScrapingJob {
  jobId: string;
  status: 'processing' | 'success' | 'failed';
  url: string;
  recipe?: Recipe;
  errorMessage?: string;
}

export const SimpleRecipeImporter: React.FC<SimpleRecipeImporterProps> = ({
  onRecipeScraped,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingJob, setScrapingJob] = useState<ScrapingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = urlInput.trim();
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    if (!url.match(/^https?:\/\/.+/)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScrapingJob(null);

    try {
      const response = await fetch('/api/scraping/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.recipe) {
        // Recipe was scraped immediately (from cache)
        onRecipeScraped(data.recipe);
      } else if (data.status === 'processing') {
        // Start polling for job completion
        setScrapingJob({
          jobId: data.jobId,
          status: 'processing',
          url
        });
        pollScrapingStatus(data.jobId);
      } else {
        setError(data.error || 'Failed to start scraping');
      }
    } catch (error) {
      console.error('Error scraping recipe:', error);
      setError('Failed to scrape recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pollScrapingStatus = async (jobId: string) => {
    const maxAttempts = 30; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/scraping/status/${jobId}`);
        const data = await response.json();

        setScrapingJob(data);

        if (data.status === 'success' && data.recipe) {
          onRecipeScraped(data.recipe);
          return;
        } else if (data.status === 'failed') {
          const errorMsg = data.errorMessage || 'Unknown error';
          if (errorMsg.includes('No recipe found') || errorMsg.includes('recipe')) {
            setError('🤔 No recipe found on this page! This might not be a recipe website, or the recipe data isn\'t in a format we can extract. Please try a different recipe URL.');
          } else {
            setError(`Scraping failed: ${errorMsg}`);
          }
          setScrapingJob(null);
          return;
        } else if (data.status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            setError('Scraping is taking too long. Please try again or contact support.');
            setScrapingJob(null);
          }
        }
      } catch (error) {
        console.error('Error polling scraping status:', error);
        setError('Error checking scraping status.');
        setScrapingJob(null);
      }
    };

    poll();
  };

  const getScrapingStatusMessage = () => {
    if (!scrapingJob) return null;

    switch (scrapingJob.status) {
      case 'processing':
        return (
          <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-medium">Extracting recipe data...</div>
              <div className="text-sm opacity-75">This may take up to 30 seconds</div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center space-x-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
            <span className="text-xl">✓</span>
            <span className="font-medium">Recipe extracted successfully!</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            <span className="text-xl">✗</span>
            <div>
              <div className="font-medium">Failed to extract recipe</div>
              <div className="text-sm opacity-75">{scrapingJob.errorMessage}</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import Recipe from URL
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter a URL from a recipe website to automatically extract the recipe data.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipe URL
              </label>
              <input
                id="recipe-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/recipe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Extracting Recipe...</span>
                </>
              ) : (
                <>
                  <span>🥄</span>
                  <span>Extract Recipe</span>
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
              <div className="flex">
                <span className="text-xl mr-2">⚠️</span>
                <div>
                  <div className="font-medium">Error</div>
                  <div className="text-sm mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {getScrapingStatusMessage() && (
            <div className="mt-4">
              {getScrapingStatusMessage()}
            </div>
          )}

          {/* Supported Sites Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Works best with these sites:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div>• AllRecipes.com</div>
              <div>• Food.com</div>
              <div>• BBC Good Food</div>
              <div>• Taste.com.au</div>
              <div>• RecipeTin Eats</div>
              <div>• Epicurious.com</div>
              <div>• Many others with structured data</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Our scraper looks for structured recipe data (JSON-LD, microdata) and falls back to intelligent pattern matching for most recipe websites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};