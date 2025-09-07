import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '@/types';

interface ElectronBrowserProps {
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

// Detect if running in Electron
const isElectron = () => {
  const w = (typeof window !== 'undefined' ? (window as any) : undefined);
  return !!(w && w.process && (w.process.type === 'renderer' || (w.process.versions && w.process.versions.electron)));
};

export const ElectronBrowser: React.FC<ElectronBrowserProps> = ({
  onRecipeScraped,
  onClose,
  initialUrl = 'https://www.allrecipes.com'
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingJob, setScrapingJob] = useState<ScrapingJob | null>(null);
  const webviewRef = useRef<any>(null);

  useEffect(() => {
    // Only inject script if in Electron
    if (isElectron() && webviewRef.current) {
      const webview = webviewRef.current;
      
      const handleDomReady = () => {
        // Inject our recipe scraping button
        const injectScript = `
          (function() {
            // Remove any existing button
            const existing = document.getElementById('hearth-scrape-btn');
            if (existing) existing.remove();
            
            // Create scrape button
            const btn = document.createElement('button');
            btn.id = 'hearth-scrape-btn';
            btn.innerHTML = '🥄 Scrape Recipe from This Page';
            btn.style.cssText = \`
              position: fixed !important;
              top: 20px !important;
              right: 20px !important;
              z-index: 999999 !important;
              background: #10b981 !important;
              color: white !important;
              border: none !important;
              padding: 12px 16px !important;
              border-radius: 8px !important;
              font-size: 14px !important;
              font-weight: bold !important;
              cursor: pointer !important;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            \`;
            
            btn.addEventListener('click', () => {
              // Send message back to parent
              window.postMessage({
                type: 'SCRAPE_RECIPE_REQUEST',
                url: window.location.href
              }, '*');
            });
            
            document.body.appendChild(btn);
            
            // Also create a subtle indicator
            const indicator = document.createElement('div');
            indicator.innerHTML = '🍳 Hearth Recipe Browser';
            indicator.style.cssText = \`
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              z-index: 999998 !important;
              background: linear-gradient(90deg, #667eea, #764ba2) !important;
              color: white !important;
              padding: 8px !important;
              text-align: center !important;
              font-size: 13px !important;
              font-weight: 500 !important;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            \`;
            
            document.body.appendChild(indicator);
          })();
        `;
        
        webview.executeJavaScript(injectScript);
      };

      webview.addEventListener('dom-ready', handleDomReady);
      
      // Handle navigation
      webview.addEventListener('did-navigate', () => {
        setCurrentUrl(webview.getURL());
        setUrlInput(webview.getURL());
        setIsLoading(false);
      });
      
      webview.addEventListener('did-start-loading', () => {
        setIsLoading(true);
      });
      
      webview.addEventListener('did-stop-loading', () => {
        setIsLoading(false);
      });

      // Listen for messages from injected script
      webview.addEventListener('ipc-message', (event: any) => {
        if (event.channel === 'SCRAPE_RECIPE_REQUEST') {
          handleScrapeRecipe(event.args[0]);
        }
      });

      return () => {
        webview.removeEventListener('dom-ready', handleDomReady);
      };
    }
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = urlInput.trim();
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setCurrentUrl(url);
    setIsLoading(true);
    
    if (webviewRef.current) {
      webviewRef.current.loadURL(url);
    }
  };

  const handleGoBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
      setIsLoading(true);
    }
  };

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

  const pollScrapingStatus = async (jobId: string) => {
    const maxAttempts = 30;
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
            alert(`🤔 No recipe found on this page!\n\nThis might not be a recipe website, or the recipe data isn't in a format we can extract.`);
          } else {
            alert('Scraping failed: ' + errorMsg);
          }
          setScrapingJob(null);
          return;
        } else if (data.status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000);
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

  // Fallback to regular iframe if not in Electron
  if (!isElectron()) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 text-center">
          <strong>Note:</strong> For best experience, use the desktop app. This web version has limitations.
        </div>
        {/* Regular iframe implementation as fallback */}
        <iframe 
          src={currentUrl}
          className="flex-1 w-full border-none"
          title="Browser"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            🍳 Hearth Recipe Browser (Desktop)
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
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
            title="Go back"
          >
            ←
          </button>
          <button
            onClick={handleGoForward}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200"
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

        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex">
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
        
        <webview
          ref={webviewRef}
          src={currentUrl}
          className="w-full h-full"
          webpreferences="webSecurity=no"
          allowpopups
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>✨ <strong>Desktop App Benefits:</strong> No website restrictions • Full browsing • One-click recipe extraction</p>
        </div>
      </div>
    </div>
  );
};
