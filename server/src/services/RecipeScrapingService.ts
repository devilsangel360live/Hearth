import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import { JSDOM } from 'jsdom';
import { CreateRecipeData } from './RecipeService';
import { SimpleScrapingService } from './SimpleScrapingService';

interface ScrapingResult {
  title?: string;
  image?: string;
  summary?: string;
  sourceUrl: string;
  sourceName?: string;
  readyInMinutes?: number;
  servings?: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit?: string;
    original?: string;
  }>;
  instructions: Array<{
    number: number;
    step: string;
  }>;
  cuisines?: string[];
  diets?: string[];
  tags?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

export class RecipeScrapingService {
  private browser: Browser | null = null;
  private simpleScrapingService = new SimpleScrapingService();

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeRecipe(url: string, jobId: string): Promise<CreateRecipeData | null> {
    try {
      console.log(`Starting scrape for URL: ${url}`);
      
      // Layer 0: Try simple HTTP-based scraping first (faster, more reliable)
      let result = await this.simpleScrapingService.scrapeWithFetch(url);
      if (result) {
        console.log('Successfully extracted via simple HTTP scraping');
        return result;
      }

      // Layer 1: Try JSON-LD structured data with Puppeteer
      let puppeteerResult = await this.tryJsonLdScraping(url);
      if (puppeteerResult && this.isValidRecipe(puppeteerResult)) {
        console.log('Successfully extracted via JSON-LD');
        return this.formatRecipeData(puppeteerResult, url);
      }

      // Layer 2: Try microdata with Puppeteer
      puppeteerResult = await this.tryMicrodataScraping(url);
      if (puppeteerResult && this.isValidRecipe(puppeteerResult)) {
        console.log('Successfully extracted via microdata');
        return this.formatRecipeData(puppeteerResult, url);
      }

      // Layer 3: Try common recipe selectors with Puppeteer
      puppeteerResult = await this.tryPatternMatching(url);
      if (puppeteerResult && this.isValidRecipe(puppeteerResult)) {
        console.log('Successfully extracted via pattern matching');
        return this.formatRecipeData(puppeteerResult, url);
      }

      // Layer 4: Try site-specific scrapers
      puppeteerResult = await this.trySiteSpecificScraping(url);
      if (puppeteerResult && this.isValidRecipe(puppeteerResult)) {
        console.log('Successfully extracted via site-specific scraper');
        return this.formatRecipeData(puppeteerResult, url);
      }

      // Layer 5: AI/ML fallback (simplified pattern recognition)
      puppeteerResult = await this.tryIntelligentScraping(url);
      if (puppeteerResult && this.isValidRecipe(puppeteerResult)) {
        console.log('Successfully extracted via intelligent scraping');
        return this.formatRecipeData(puppeteerResult, url);
      }

      console.log('All scraping methods failed for URL:', url);
      return null;
    } catch (error) {
      console.error('Error scraping recipe:', error);
      throw error;
    }
  }

  private async tryJsonLdScraping(url: string): Promise<ScrapingResult | null> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const jsonLdData = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const recipes = [];
        
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            
            // Handle array of structured data
            const items = Array.isArray(data) ? data : [data];
            
            for (const item of items) {
              if (item['@type'] === 'Recipe' || 
                  (item['@graph'] && item['@graph'].find((g: any) => g['@type'] === 'Recipe'))) {
                
                const recipe = item['@type'] === 'Recipe' ? item : 
                              item['@graph'].find((g: any) => g['@type'] === 'Recipe');
                
                if (recipe) {
                  recipes.push(recipe);
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON-LD
          }
        }
        
        return recipes.length > 0 ? recipes[0] : null;
      });

      await page.close();

      if (jsonLdData) {
        return this.parseJsonLdRecipe(jsonLdData, url);
      }

      return null;
    } catch (error) {
      console.error('JSON-LD scraping failed:', error);
      return null;
    }
  }

  private parseJsonLdRecipe(data: any, url: string): ScrapingResult {
    const ingredients = (data.recipeIngredient || []).map((ingredient: string, index: number) => {
      const parsed = this.parseIngredient(ingredient);
      return {
        name: parsed.name || ingredient,
        amount: parsed.amount || 1,
        unit: parsed.unit,
        original: ingredient
      };
    });

    const instructions = (data.recipeInstructions || []).map((instruction: any, index: number) => {
      const text = typeof instruction === 'string' ? instruction : 
                   instruction.text || instruction.name || '';
      return {
        number: index + 1,
        step: text.trim()
      };
    });

    return {
      title: data.name,
      image: this.extractImageUrl(data.image),
      summary: data.description,
      sourceUrl: url,
      sourceName: this.extractDomain(url),
      readyInMinutes: this.parseTime(data.totalTime || data.cookTime || data.prepTime),
      servings: this.parseServings(data.recipeYield),
      ingredients,
      instructions,
      cuisines: data.recipeCuisine ? (Array.isArray(data.recipeCuisine) ? data.recipeCuisine : [data.recipeCuisine]) : [],
      diets: data.suitableForDiet ? (Array.isArray(data.suitableForDiet) ? data.suitableForDiet : [data.suitableForDiet]) : [],
      tags: data.keywords ? (Array.isArray(data.keywords) ? data.keywords : data.keywords.split(',').map((k: string) => k.trim())) : [],
      nutrition: this.parseNutrition(data.nutrition)
    };
  }

  private async tryMicrodataScraping(url: string): Promise<ScrapingResult | null> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const html = await page.content();
      await page.close();

      const $ = cheerio.load(html);
      
      // Look for microdata recipe
      const recipeElement = $('[itemscope][itemtype*="Recipe"], .recipe, .hrecipe').first();
      if (recipeElement.length === 0) {
        return null;
      }

      const title = recipeElement.find('[itemprop="name"], .recipe-title, .entry-title, h1').first().text().trim();
      const image = this.extractImageUrl(recipeElement.find('[itemprop="image"], .recipe-image img, .wp-post-image').first().attr('src') || '');
      const summary = recipeElement.find('[itemprop="description"], .recipe-summary, .recipe-description').first().text().trim();
      
      const ingredients: any[] = [];
      recipeElement.find('[itemprop="recipeIngredient"], .recipe-ingredient, .ingredient').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          const parsed = this.parseIngredient(text);
          ingredients.push({
            name: parsed.name || text,
            amount: parsed.amount || 1,
            unit: parsed.unit,
            original: text
          });
        }
      });

      const instructions: any[] = [];
      recipeElement.find('[itemprop="recipeInstructions"], .recipe-instruction, .instruction, .directions li, .method li').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          instructions.push({
            number: i + 1,
            step: text
          });
        }
      });

      if (ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title || '',
        image,
        summary,
        sourceUrl: url,
        sourceName: this.extractDomain(url),
        readyInMinutes: this.parseTimeFromText(recipeElement.find('[itemprop="totalTime"], .cook-time, .prep-time').first().text()),
        servings: this.parseServingsFromText(recipeElement.find('[itemprop="recipeYield"], .servings, .serves').first().text()),
        ingredients,
        instructions
      };
    } catch (error) {
      console.error('Microdata scraping failed:', error);
      return null;
    }
  }

  private async tryPatternMatching(url: string): Promise<ScrapingResult | null> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const html = await page.content();
      await page.close();

      const $ = cheerio.load(html);

      // Common recipe selectors
      const titleSelectors = [
        'h1.recipe-title', 'h1.entry-title', 'h2.recipe-title', '.recipe-name', 
        '.recipe-header h1', '.post-title', 'h1[class*="title"]', 'h1[class*="recipe"]'
      ];
      
      const ingredientSelectors = [
        '.ingredients li', '.recipe-ingredients li', '.ingredient-list li',
        '.ingredients ul li', '.recipe-ingredient', '[class*="ingredient"]'
      ];
      
      const instructionSelectors = [
        '.instructions li', '.directions li', '.method li', '.recipe-instructions li',
        '.instructions ol li', '.recipe-method li', '[class*="instruction"]', '[class*="direction"]'
      ];

      let title = '';
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          title = element.text().trim();
          break;
        }
      }

      const ingredients: any[] = [];
      for (const selector of ingredientSelectors) {
        $(selector).each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 2) {
            const parsed = this.parseIngredient(text);
            ingredients.push({
              name: parsed.name || text,
              amount: parsed.amount || 1,
              unit: parsed.unit,
              original: text
            });
          }
        });
        if (ingredients.length > 0) break;
      }

      const instructions: any[] = [];
      for (const selector of instructionSelectors) {
        $(selector).each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            instructions.push({
              number: i + 1,
              step: text
            });
          }
        });
        if (instructions.length > 0) break;
      }

      if (!title && ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title || 'Scraped Recipe',
        sourceUrl: url,
        sourceName: this.extractDomain(url),
        ingredients,
        instructions
      };
    } catch (error) {
      console.error('Pattern matching failed:', error);
      return null;
    }
  }

  private async trySiteSpecificScraping(url: string): Promise<ScrapingResult | null> {
    const domain = this.extractDomain(url);
    
    switch (domain) {
      case 'allrecipes.com':
        return this.scrapeAllRecipes(url);
      case 'food.com':
        return this.scrapeFoodCom(url);
      case 'epicurious.com':
        return this.scrapeEpicurious(url);
      default:
        return null;
    }
  }

  private async scrapeAllRecipes(url: string): Promise<ScrapingResult | null> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const html = await page.content();
      await page.close();
      
      const $ = cheerio.load(html);
      
      const title = $('.recipe-summary__h1').text().trim();
      const ingredients: any[] = [];
      
      $('.recipe-ingred_txt').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          const parsed = this.parseIngredient(text);
          ingredients.push({
            name: parsed.name || text,
            amount: parsed.amount || 1,
            unit: parsed.unit,
            original: text
          });
        }
      });

      const instructions: any[] = [];
      $('.recipe-directions__list--item').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          instructions.push({
            number: i + 1,
            step: text
          });
        }
      });

      return {
        title,
        sourceUrl: url,
        sourceName: 'AllRecipes',
        ingredients,
        instructions
      };
    } catch (error) {
      console.error('AllRecipes scraping failed:', error);
      return null;
    }
  }

  private async scrapeFoodCom(url: string): Promise<ScrapingResult | null> {
    // Site-specific implementation for Food.com
    return null;
  }

  private async scrapeEpicurious(url: string): Promise<ScrapingResult | null> {
    // Site-specific implementation for Epicurious
    return null;
  }

  private async tryIntelligentScraping(url: string): Promise<ScrapingResult | null> {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const html = await page.content();
      await page.close();
      
      const $ = cheerio.load(html);
      
      // Use AI-like pattern recognition for title
      let title = '';
      const potentialTitles = $('h1, h2, h3').toArray()
        .map(el => $(el).text().trim())
        .filter(text => text.length > 0 && text.length < 100)
        .sort((a, b) => this.scoreTitle(b) - this.scoreTitle(a));
      
      if (potentialTitles.length > 0) {
        title = potentialTitles[0];
      }

      // Intelligent ingredient detection
      const ingredients: any[] = [];
      const allText = $('*').contents()
        .filter((i, el) => el.nodeType === 3) // Text nodes only
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(text => text.length > 5 && this.looksLikeIngredient(text));

      allText.slice(0, 20).forEach((text, index) => {
        const parsed = this.parseIngredient(text);
        ingredients.push({
          name: parsed.name || text,
          amount: parsed.amount || 1,
          unit: parsed.unit,
          original: text
        });
      });

      // Intelligent instruction detection
      const instructions: any[] = [];
      const potentialInstructions = $('p, li, div').toArray()
        .map(el => $(el).text().trim())
        .filter(text => this.looksLikeInstruction(text))
        .slice(0, 15);

      potentialInstructions.forEach((text, index) => {
        instructions.push({
          number: index + 1,
          step: text
        });
      });

      if (ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title || 'Recipe',
        sourceUrl: url,
        sourceName: this.extractDomain(url),
        ingredients,
        instructions
      };
    } catch (error) {
      console.error('Intelligent scraping failed:', error);
      return null;
    }
  }

  private scoreTitle(text: string): number {
    let score = 0;
    
    // Recipe-related keywords
    const recipeKeywords = ['recipe', 'how to make', 'easy', 'best', 'homemade'];
    recipeKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) score += 2;
    });
    
    // Length score (prefer medium length titles)
    if (text.length > 10 && text.length < 60) score += 3;
    
    // Avoid navigation/generic text
    const badKeywords = ['home', 'about', 'contact', 'menu', 'subscribe'];
    badKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) score -= 5;
    });
    
    return score;
  }

  private looksLikeIngredient(text: string): boolean {
    // Simple heuristics for ingredient detection
    const ingredientPatterns = [
      /^\d+.*(?:cup|tbsp|tsp|lb|oz|g|kg|ml|l|pound|ounce|tablespoon|teaspoon)/i,
      /^\d+\/\d+/,
      /(?:cup|tbsp|tsp|lb|oz|g|kg|ml|l|pound|ounce|tablespoon|teaspoon)/i
    ];
    
    return ingredientPatterns.some(pattern => pattern.test(text)) && text.length < 200;
  }

  private looksLikeInstruction(text: string): boolean {
    // Simple heuristics for instruction detection
    const instructionKeywords = [
      'heat', 'cook', 'bake', 'mix', 'stir', 'add', 'combine', 'place', 'remove',
      'preheat', 'season', 'serve', 'garnish', 'chop', 'slice', 'dice', 'mince'
    ];
    
    const hasInstructionKeyword = instructionKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    return hasInstructionKeyword && 
           text.length > 20 && 
           text.length < 500 && 
           !text.toLowerCase().includes('subscribe') &&
           !text.toLowerCase().includes('advertisement');
  }

  private parseIngredient(text: string): { name: string; amount: number; unit?: string } {
    // Simple ingredient parsing
    const match = text.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
    
    if (match) {
      return {
        name: match[3].trim(),
        amount: this.parseFraction(match[1]),
        unit: match[2]
      };
    }
    
    return { name: text, amount: 1 };
  }

  private parseFraction(str: string): number {
    if (str.includes('/')) {
      const [num, den] = str.split('/');
      return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(str) || 1;
  }

  private parseTime(timeString: string | undefined): number | undefined {
    if (!timeString) return undefined;
    
    // Parse ISO 8601 duration (PT15M, PT1H30M)
    if (timeString.startsWith('PT')) {
      const match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        return hours * 60 + minutes;
      }
    }
    
    return this.parseTimeFromText(timeString);
  }

  private parseTimeFromText(text: string): number | undefined {
    if (!text) return undefined;
    
    const hourMatch = text.match(/(\d+)\s*h(?:our|r)?/i);
    const minuteMatch = text.match(/(\d+)\s*m(?:in|inute)?/i);
    
    let minutes = 0;
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) minutes += parseInt(minuteMatch[1]);
    
    return minutes || undefined;
  }

  private parseServings(servings: any): number | undefined {
    if (!servings) return undefined;
    
    if (typeof servings === 'number') return servings;
    if (typeof servings === 'string') {
      return this.parseServingsFromText(servings);
    }
    if (Array.isArray(servings)) {
      return this.parseServingsFromText(servings[0]);
    }
    
    return undefined;
  }

  private parseServingsFromText(text: string): number | undefined {
    if (!text) return undefined;
    
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  private parseNutrition(nutrition: any): any {
    if (!nutrition) return undefined;
    
    return {
      calories: this.parseNutritionValue(nutrition.calories),
      protein: this.parseNutritionValue(nutrition.proteinContent),
      fat: this.parseNutritionValue(nutrition.fatContent),
      carbs: this.parseNutritionValue(nutrition.carbohydrateContent),
      fiber: this.parseNutritionValue(nutrition.fiberContent),
      sugar: this.parseNutritionValue(nutrition.sugarContent),
      sodium: this.parseNutritionValue(nutrition.sodiumContent)
    };
  }

  private parseNutritionValue(value: any): number | undefined {
    if (!value) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : undefined;
    }
    return undefined;
  }

  private extractImageUrl(image: any): string | undefined {
    if (!image) return undefined;
    
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0];
    if (typeof image === 'object' && image.url) return image.url;
    
    return undefined;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  private isValidRecipe(result: ScrapingResult): boolean {
    return !!(result.title || (result.ingredients.length > 0 && result.instructions.length > 0));
  }

  private formatRecipeData(result: ScrapingResult, url: string): CreateRecipeData {
    return {
      title: result.title || 'Scraped Recipe',
      image: result.image,
      summary: result.summary,
      sourceUrl: url,
      sourceName: result.sourceName || this.extractDomain(url),
      readyInMinutes: result.readyInMinutes,
      servings: result.servings,
      ingredients: result.ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        original: ing.original
      })),
      instructions: result.instructions,
      cuisines: result.cuisines || [],
      diets: result.diets || [],
      tags: result.tags || [],
      nutrition: result.nutrition
    };
  }
}
