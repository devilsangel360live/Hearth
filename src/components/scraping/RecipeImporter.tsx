import React, { useState } from 'react';
import { Recipe } from '@/types';
import { RecipeDetail } from '@/components/recipe/RecipeDetail';
import { useLocalRecipes } from '@/contexts/LocalRecipeContext';

interface RecipeImporterProps {
  onRecipeImported: (recipe: Recipe) => void;
  onClose: () => void;
}

interface ImportJob {
  jobId: string;
  status: 'processing' | 'success' | 'failed';
  url: string;
  recipe?: Recipe;
  errorMessage?: string;
}

export const RecipeImporter: React.FC<RecipeImporterProps> = ({
  onRecipeImported,
  onClose
}) => {
  const { deleteLocalRecipe } = useLocalRecipes();
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [bulkUrls, setBulkUrls] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [previewRecipeId, setPreviewRecipeId] = useState<string | null>(null); // Track recipe ID for cleanup

  const handleDownloadRecipe = async () => {
    if (!url.trim()) {
      setShowError('Please enter a URL');
      return;
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      setIsImporting(true);
      setImportJob(null);
      setShowError(null);

      const response = await fetch('/api/scraping/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.recipe) {
        // Recipe was scraped immediately (cached) - show full preview
        setPreviewRecipe(data.recipe);
        setPreviewRecipeId(data.recipe.id); // Track recipe ID for potential cleanup
        setImportJob(null);
      } else if (data.status === 'processing') {
        // Start polling for job completion
        setImportJob({
          jobId: data.jobId,
          status: 'processing',
          url: cleanUrl
        });
        pollImportStatus(data.jobId);
      } else {
        setShowError('No recipe found on this page. Please try a different URL with a recipe.');
      }
    } catch (error) {
      console.error('Error importing recipe:', error);
      setShowError('Error importing recipe. Please check the URL and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .map(url => {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return 'https://' + url;
        }
        return url;
      });

    if (urls.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    if (urls.length > 10) {
      alert('Maximum 10 URLs allowed per batch');
      return;
    }

    try {
      setIsImporting(true);

      const response = await fetch('/api/scraping/bulk-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();

      if (data.status === 'processing') {
        alert(`Started importing ${data.jobIds.length} recipes. Check the scraping history to monitor progress.`);
        setBulkUrls('');
        onClose(); // Close after starting bulk import
      } else {
        alert('Failed to start bulk import: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error bulk importing recipes:', error);
      alert('Error bulk importing recipes. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const pollImportStatus = async (jobId: string) => {
    const maxAttempts = 30; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/scraping/status/${jobId}`);
        const data = await response.json();

        setImportJob(data);

        if (data.status === 'success' && data.recipe) {
          // Show full preview instead of auto-importing
          setPreviewRecipe(data.recipe);
          setPreviewRecipeId(data.recipe.id); // Track recipe ID for potential cleanup
          setImportJob(null);
          return;
        } else if (data.status === 'failed') {
          alert('Import failed: ' + (data.errorMessage || 'Unknown error'));
          return;
        } else if (data.status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          } else {
            alert('Import is taking too long. Please check the status later.');
          }
        }
      } catch (error) {
        console.error('Error polling import status:', error);
        alert('Error checking import status.');
      }
    };

    poll();
  };

  const getStatusMessage = () => {
    if (!importJob) return null;

    switch (importJob.status) {
      case 'processing':
        return (
          <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-3 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-medium">Importing recipe...</div>
              <div className="text-sm opacity-80">{importJob.url}</div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-3 rounded-lg">
            <span className="text-xl">✓</span>
            <div>
              <div className="font-medium">Recipe preview loaded successfully!</div>
              <div className="text-sm opacity-80">{importJob.recipe?.title}</div>
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-3 rounded-lg">
            <span className="text-xl">✗</span>
            <div>
              <div className="font-medium">Import failed</div>
              <div className="text-sm opacity-80">{importJob.errorMessage}</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handlePreviewDownload = () => {
    if (previewRecipe) {
      console.log('User clicked Download Recipe - importing:', previewRecipe.title);
      onRecipeImported(previewRecipe);
      setPreviewRecipe(null);
      setPreviewRecipeId(null); // Clear tracking since recipe is being kept
      setUrl('');
    }
  };

  const handlePreviewClose = async () => {
    console.log('User clicked Cancel on preview - NOT importing recipe');
    
    // If we have a preview recipe ID, delete it from the database since user cancelled
    if (previewRecipeId) {
      try {
        console.log('Deleting preview recipe from database:', previewRecipeId);
        await deleteLocalRecipe(previewRecipeId);
        console.log('Preview recipe deleted successfully');
      } catch (error) {
        console.error('Failed to delete preview recipe:', error);
      }
    }
    
    setPreviewRecipe(null);
    setPreviewRecipeId(null);
    // Don't clear URL - let user try again or modify URL
    // setUrl(''); - Removed this to allow user to modify URL and try again
  };

  return (
    <>
      {/* Recipe Preview Modal - shows full recipe detail */}
      {previewRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <RecipeDetail
              recipe={previewRecipe}
              onClose={handlePreviewClose}
              className=""
            />
            {/* Download Recipe Button at bottom */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <div className="flex space-x-3">
                <button
                  onClick={handlePreviewDownload}
                  className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
                >
                  Download Recipe
                </button>
                <button
                  onClick={handlePreviewClose}
                  className="py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal - only show when not previewing */}
      {!previewRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Import Recipe
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close importer"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div className="p-6">
            {/* Mode Toggle */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
              <button
                onClick={() => setIsBulkMode(false)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                  !isBulkMode
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Single URL
              </button>
              <button
                onClick={() => setIsBulkMode(true)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isBulkMode
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Bulk Import
              </button>
            </div>

            {/* Status Message */}
            {getStatusMessage() && (
              <div className="mb-6">
                {getStatusMessage()}
              </div>
            )}

            {/* Single Import Mode */}
            {!isBulkMode && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipe URL
                  </label>
                  <input
                    type="url"
                    id="recipe-url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (showError) setShowError(null); // Clear error when user starts typing
                    }}
                    placeholder="https://example.com/recipe-page"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={isImporting}
                  />
                </div>

                {/* Error Message */}
                {showError && (
                  <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-3 rounded-lg">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <div className="font-medium">Import Error</div>
                      <div className="text-sm opacity-80">{showError}</div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    How it works:
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Automatically extracts recipe data from most cooking websites</li>
                    <li>• Supports structured data (JSON-LD), microdata, and pattern matching</li>
                    <li>• Works best with popular sites like AllRecipes, Food.com, etc.</li>
                    <li>• Saves ingredients, instructions, nutrition info, and more</li>
                  </ul>
                </div>

                <button
                  onClick={handleDownloadRecipe}
                  disabled={isImporting || !url.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Loading Preview...</span>
                    </>
                  ) : (
                    <span>Preview Recipe</span>
                  )}
                </button>
              </div>
            )}

            {/* Bulk Import Mode */}
            {isBulkMode && (
              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <label htmlFor="bulk-urls" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipe URLs (one per line, max 10)
                  </label>
                  <textarea
                    id="bulk-urls"
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder={`https://example.com/recipe1\nhttps://example.com/recipe2\nhttps://example.com/recipe3`}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={isImporting}
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <div>
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Bulk Import Note
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Bulk imports run in the background. You can close this dialog and check 
                        the scraping history to monitor progress. Large batches may take several minutes.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isImporting || !bulkUrls.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Starting Bulk Import...</span>
                    </>
                  ) : (
                    <>
                      <span>📦</span>
                      <span>Start Bulk Import</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Popular Sites Examples */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Works great with these sites:
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'AllRecipes.com',
                  'Food.com',
                  'Epicurious.com',
                  'Taste.com.au',
                  'BBC Good Food',
                  'Serious Eats',
                  'Food Network'
                ].map((site) => (
                  <span
                    key={site}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                  >
                    {site}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
};