import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '@/types';

interface InAppBrowserProps {
  onRecipeScraped: (recipe: Recipe) => void;
  onClose: () => void;
  onShowImporter?: () => void;
  initialUrl?: string;
}

interface ScrapingJob {
  jobId: string;
  status: 'processing' | 'success' | 'failed';
  url: string;
  recipe?: Recipe;
  errorMessage?: string;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({
  onRecipeScraped,
  onClose,
  onShowImporter,
  initialUrl = 'data:text/html,<html><body style="font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><div style="text-align: center;"><h1>🍳 Recipe Browser</h1><p>Enter a recipe website URL above and click Go</p><p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">Try: taste.com.au, recipetineats.com, or other recipe sites</p></div></body></html>'
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingJob, setScrapingJob] = useState<ScrapingJob | null>(null);
  const [canGoBack] = useState(false);
  const [canGoForward] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cleanup timeout on unmount and listen for messages from proxied content
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SCRAPE_RECIPE') {
        handleScrapeRecipe(event.data.url);
      } else if (event.data && event.data.type === 'URL_UPDATE') {
        setCurrentUrl(event.data.url);
        setUrlInput(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [loadTimeout]);

  const handleScrapeRecipe = async (url: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/scraping/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.recipe) {
        onRecipeScraped(data.recipe);
      } else if (data.status === 'processing') {
        setScrapingJob({
          jobId: data.jobId,
          status: 'processing',
          url
        });
        pollScrapingStatus(data.jobId);
      } else {
        const errorMsg = data.error || 'Unknown error';
        if (errorMsg.includes('No recipe found') || errorMsg.includes('recipe') || data.status === 'failed') {
          alert(`🤔 No recipe found on this page!\n\nThis might not be a recipe website, or the recipe data isn't in a format we can extract. Try browsing to:\n• AllRecipes.com\n• Food.com\n• BBC Good Food\n• Other popular recipe sites`);
        } else {
          alert('Failed to start scraping: ' + errorMsg);
        }
      }
    } catch (error) {
      console.error('Error scraping recipe:', error);
      alert('Error scraping recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = urlInput.trim();
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setCurrentUrl(url);
    setIsLoading(true);
    setLoadError(null);
    
    // Clear any existing timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    
    // Set a timeout to detect if the iframe fails to load
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setLoadError('This website is taking too long to load or may not allow embedding. Try a different recipe site or use the "Import from URL" option instead.');
    }, 15000); // 15 second timeout
    
    setLoadTimeout(timeout);
  };

  const handleIframeLoad = () => {
    // Clear the timeout since the iframe loaded successfully
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    
    setIsLoading(false);
    setLoadError(null);
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const iframeUrl = iframe.contentWindow.location.href;
        if (iframeUrl !== 'about:blank') {
          setCurrentUrl(iframeUrl);
          setUrlInput(iframeUrl);
        }
      }
    } catch (error) {
      // Cross-origin restrictions prevent accessing iframe URL
      console.log('Cannot access iframe URL due to CORS');
    }
  };

  const handleIframeError = () => {
    // Clear the timeout since we got an explicit error
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    
    setIsLoading(false);
    setLoadError('This website cannot be displayed in our browser due to security restrictions. Try a different recipe site or use the "Import from URL" option instead.');
  };

  const handleGoBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    }
  };

  const handleGoForward = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIsLoading(true);
    }
  };

  const handleScrapeCurrentPage = async () => {
    if (!currentUrl) {
      alert('No URL to scrape');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/scraping/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: currentUrl }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.recipe) {
        // Recipe was scraped immediately (cached)
        onRecipeScraped(data.recipe);
      } else if (data.status === 'processing') {
        // Start polling for job completion
        setScrapingJob({
          jobId: data.jobId,
          status: 'processing',
          url: currentUrl
        });
        pollScrapingStatus(data.jobId);
      } else {
        // Show a more user-friendly message for sites without recipes
        const errorMsg = data.error || 'Unknown error';
        if (errorMsg.includes('No recipe found') || errorMsg.includes('recipe') || data.status === 'failed') {
          alert(`🤔 No recipe found on this page!\n\nThis might not be a recipe website, or the recipe data isn't in a format we can extract. Try browsing to:\n• AllRecipes.com\n• Food.com\n• BBC Good Food\n• Other popular recipe sites`);
        } else {
          alert('Failed to start scraping: ' + errorMsg);
        }
      }
    } catch (error) {
      console.error('Error scraping recipe:', error);
      alert('Error scraping recipe. Please try again.');
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
            alert(`🤔 No recipe found on this page!\n\nThis might not be a recipe website, or the recipe data isn't in a format we can extract. Try browsing to:\n• AllRecipes.com\n• Food.com\n• BBC Good Food\n• Other popular recipe sites`);
          } else {
            alert('Scraping failed: ' + errorMsg);
          }
          setScrapingJob(null);
          return;
        } else if (data.status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            alert('Scraping is taking too long. Please check the status later.');
          }
        }
      } catch (error) {
        console.error('Error polling scraping status:', error);
        alert('Error checking scraping status.');
      }
    };

    poll();
  };

  const getScrapingStatusMessage = () => {
    if (!scrapingJob) return null;

    switch (scrapingJob.status) {
      case 'processing':
        return (
          <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Scraping recipe data...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
            <span className="text-xl">✓</span>
            <span className="text-sm">Recipe scraped successfully!</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg">
            <span className="text-xl">✗</span>
            <span className="text-sm">Failed to scrape recipe: {scrapingJob.errorMessage}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recipe Browser & Scraper
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close browser"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            title="Go back"
          >
            ←
          </button>
          <button
            onClick={handleGoForward}
            disabled={!canGoForward}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            title="Go forward"
          >
            →
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
            title="Refresh"
          >
            ↻
          </button>
        </div>

        {/* URL Bar and Scrape Button */}
        <div className="flex items-center space-x-2">
          <form onSubmit={handleUrlSubmit} className="flex-1 flex">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL to browse..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Go
            </button>
          </form>
          
          <button
            onClick={handleScrapeCurrentPage}
            disabled={isLoading || !currentUrl || scrapingJob?.status === 'processing'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
          >
            <span>🥄</span>
            <span>Scrape Recipe</span>
          </button>
        </div>

        {/* Scraping Status */}
        {getScrapingStatusMessage() && (
          <div className="mt-3">
            {getScrapingStatusMessage()}
          </div>
        )}
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading page...</p>
            </div>
          </div>
        )}
        
        {loadError ? (
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Cannot Load Website
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {loadError}
              </p>
              <div className="space-y-3">
                {onShowImporter && (
                  <button
                    onClick={onShowImporter}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                  >
                    Use URL Import Instead
                  </button>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Or try these recipe-friendly sites:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'taste.com.au',
                      'recipetineats.com',
                      'delish.com',
                      'food52.com'
                    ].map((site) => (
                      <button
                        key={site}
                        onClick={() => {
                          const url = site === 'taste.com.au' ? `https://www.${site}` : `https://www.${site}`;
                          setUrlInput(url);
                          setCurrentUrl(url);
                          setIsLoading(true);
                          setLoadError(null);
                          
                          // Clear any existing timeout
                          if (loadTimeout) {
                            clearTimeout(loadTimeout);
                          }
                          
                          // Set a timeout to detect if the iframe fails to load
                          const timeout = setTimeout(() => {
                            setIsLoading(false);
                            setLoadError('This website is taking too long to load or may not allow embedding. Try a different recipe site or use the "Import from URL" option instead.');
                          }, 15000);
                          
                          setLoadTimeout(timeout);
                        }}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={currentUrl.startsWith('http') && !currentUrl.includes('/api/proxy/browse') ? `/api/proxy/browse?url=${encodeURIComponent(currentUrl)}` : currentUrl}
            className="w-full h-full border-none"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-modals allow-popups-to-escape-sandbox"
            title="Recipe Browser"
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Enter a recipe website URL above. When the page loads, click the "🥄 Scrape Recipe" button that appears.</p>
          <p className="mt-1">
            <strong>New:</strong> Pages are now served through our proxy server to bypass most restrictions. This should work with many more sites!
          </p>
        </div>
      </div>
    </div>
  );
};
