import * as cheerio from 'cheerio';
import { CreateRecipeData } from './RecipeService';

interface SimpleScrapingResult {
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
}

export class SimpleScrapingService {
  async scrapeWithFetch(url: string): Promise<CreateRecipeData | null> {
    try {
      console.log(`Simple scraping for URL: ${url}`);
      
      // Fetch HTML with proper headers
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Check if we got an error page
      if (this.isErrorPage(html)) {
        console.log('Detected error/redirect page, aborting');
        return null;
      }

      const $ = cheerio.load(html);
      
      // Try JSON-LD first
      let result = this.tryJsonLdExtraction($);
      if (result && this.isValidResult(result)) {
        console.log('Successfully extracted via JSON-LD');
        return this.formatRecipeData(result, url);
      }

      // Try microdata
      result = this.tryMicrodataExtraction($);
      if (result && this.isValidResult(result)) {
        console.log('Successfully extracted via microdata');
        return this.formatRecipeData(result, url);
      }

      // Try pattern matching
      result = this.tryPatternMatching($);
      if (result && this.isValidResult(result)) {
        console.log('Successfully extracted via pattern matching');
        return this.formatRecipeData(result, url);
      }

      console.log('Simple scraping failed - no valid recipe data found');
      return null;

    } catch (error) {
      console.error('Simple scraping error:', error);
      return null;
    }
  }

  private isErrorPage(html: string): boolean {
    const errorIndicators = [
      'page not found',
      '404',
      'error',
      'not available',
      'access denied',
      'blocked',
      'redirected',
      'please enable javascript',
      'robot or human'
    ];

    const lowerHtml = html.toLowerCase();
    return errorIndicators.some(indicator => lowerHtml.includes(indicator)) &&
           !lowerHtml.includes('recipe') &&
           !lowerHtml.includes('ingredients');
  }

  private tryJsonLdExtraction($: cheerio.CheerioAPI): SimpleScrapingResult | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      
      for (const script of scripts.toArray()) {
        try {
          const data = JSON.parse($(script).html() || '');
          
          // Handle array of structured data
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            if (item['@type'] === 'Recipe' || 
                (item['@graph'] && item['@graph'].find((g: any) => g['@type'] === 'Recipe'))) {
              
              const recipe = item['@type'] === 'Recipe' ? item : 
                            item['@graph'].find((g: any) => g['@type'] === 'Recipe');
              
              if (recipe) {
                return this.parseJsonLdRecipe(recipe);
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON-LD
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private parseJsonLdRecipe(data: any): SimpleScrapingResult {
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
      sourceUrl: '',
      sourceName: '',
      readyInMinutes: this.parseTime(data.totalTime || data.cookTime || data.prepTime),
      servings: this.parseServings(data.recipeYield),
      ingredients,
      instructions,
      cuisines: data.recipeCuisine ? (Array.isArray(data.recipeCuisine) ? data.recipeCuisine : [data.recipeCuisine]) : [],
      diets: data.suitableForDiet ? (Array.isArray(data.suitableForDiet) ? data.suitableForDiet : [data.suitableForDiet]) : [],
      tags: data.keywords ? (Array.isArray(data.keywords) ? data.keywords : data.keywords.split(',').map((k: string) => k.trim())) : [],
    };
  }

  private tryMicrodataExtraction($: cheerio.CheerioAPI): SimpleScrapingResult | null {
    try {
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

      const instructions: any[] = [];
      recipeElement.find('[itemprop="recipeInstructions"], .recipe-instruction, .instruction, .directions li, .method li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          instructions.push({
            number: i + 1,
            step: text
          });
        }
      });

      if (!title && ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title || 'Scraped Recipe',
        image,
        summary,
        sourceUrl: '',
        sourceName: '',
        readyInMinutes: this.parseTimeFromText(recipeElement.find('[itemprop="totalTime"], .cook-time, .prep-time').first().text()),
        servings: this.parseServingsFromText(recipeElement.find('[itemprop="recipeYield"], .servings, .serves').first().text()),
        ingredients,
        instructions
      };
    } catch (error) {
      return null;
    }
  }

  private tryPatternMatching($: cheerio.CheerioAPI): SimpleScrapingResult | null {
    try {
      // Common recipe selectors
      const titleSelectors = [
        'h1.recipe-title', 'h1.entry-title', 'h2.recipe-title', '.recipe-name', 
        '.recipe-header h1', '.post-title', 'h1[class*="title"]', 'h1[class*="recipe"]'
      ];
      
      const ingredientSelectors = [
        '.ingredients li', '.recipe-ingredients li', '.ingredient-list li',
        '.ingredients ul li', '.recipe-ingredient', '[class*="ingredient"]',
        '.wp-block-recipe-card-ingredients li',
        // Bongeats.com specific selectors
        '.recipe-ingredients p', '.recipe-ingredients > p'
      ];
      
      const instructionSelectors = [
        // Bongeats.com specific selectors - try first for best parsing
        '.recipe-process-wrapper .recipe-process', '.recipe-process-wrapper p',
        '[class*="recipe-process"]', '[class*="process"]',
        '.recipe-process', '.process-wrapper p', '.recipe-method p',
        // Standard recipe selectors
        '.instructions li', '.directions li', '.method li', '.recipe-instructions li',
        '.instructions ol li', '.recipe-method li',
        '.wp-block-recipe-card-instructions li',
        '[data-process]', '.step', '.recipe-step', '.cooking-step',
        // Generic selectors - these may capture large blocks
        '[class*="instruction"]', '[class*="direction"]',
        // More general selectors for dynamic content - last resort
        'p[class*="recipe"]', 'div[class*="recipe"] p', '.recipe-content p',
        'p[class*="step"]', 'div[class*="step"]', '[class*="preparation"]'
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
          if (text && text.length > 2 && !this.isNavigationText(text)) {
            const parsed = this.parseIngredient(text);
            ingredients.push({
              name: parsed.name || text,
              amount: parsed.amount || 1,
              unit: parsed.unit,
              original: text
            });
          }
        });
        if (ingredients.length > 2) break; // Found some ingredients
      }

      const instructions: any[] = [];
      for (const selector of instructionSelectors) {
        console.log(`Trying instruction selector: ${selector}`);
        const elements = $(selector);
        console.log(`Found ${elements.length} elements for selector ${selector}`);
        
        const tempInstructions: any[] = [];
        elements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`Element ${i} text: "${text.substring(0, 100)}..."`);
          console.log(`  Length: ${text.length}, isNavigation: ${this.isNavigationText(text, true)}`);
          if (text && text.length > 15 && !this.isNavigationText(text, true)) {
            // For bongeats.com, clean and parse the large instruction block
            const cleanedInstructions = this.parseInstructionBlock(text, selector);
            tempInstructions.push(...cleanedInstructions);
            console.log(`Added ${cleanedInstructions.length} cleaned instructions from block`);
          } else {
            console.log(`  Skipped: too short (${text.length <= 15}) or navigation (${this.isNavigationText(text, true)})`);
          }
        });
        
        // If we found valid instructions, add them and stop trying other selectors
        if (tempInstructions.length > 0) {
          instructions.push(...tempInstructions);
          console.log(`Found ${tempInstructions.length} valid instructions with selector: ${selector}`);
          break;
        }
      }
      console.log(`Total instructions found: ${instructions.length}`);

      // Extract additional recipe metadata
      let image: string | undefined;
      let readyInMinutes: number | undefined;
      let servings: number | undefined;

      // Try to find recipe image
      const imageSelectors = [
        '.recipe-image img', '.recipe-photo img', '.recipe-img img',
        '.wp-post-image', '.attachment-post-thumbnail',
        '.post-thumbnail img', 'img[class*="recipe"]', 
        '.recipe-header img', '.recipe-content img'
      ];
      
      for (const selector of imageSelectors) {
        const img = $(selector).first();
        if (img.length) {
          const src = img.attr('src') || img.attr('data-src');
          if (src && !this.isIconImage(src)) {
            image = this.extractImageUrl(src);
            console.log(`Found image with selector ${selector}: ${image}`);
            break;
          } else if (src) {
            console.log(`Skipped icon image: ${src}`);
          }
        }
      }

      // Try to find cooking time - look for time patterns
      const timeSelectors = [
        '.recipe-time', '.cook-time', '.prep-time', '.total-time',
        '[class*="time"]', '.recipe-meta', '.recipe-info',
        // More specific text searches
        ':contains("min")', ':contains("minutes")', ':contains("hours")'
      ];
      
      for (const selector of timeSelectors) {
        $(selector).each((i, el) => {
          const text = $(el).text().trim();
          const time = this.parseTimeFromText(text);
          if (time) {
            readyInMinutes = time;
            console.log(`Found time with selector ${selector}: ${time} minutes from "${text}"`);
            return false; // break
          }
        });
        if (readyInMinutes) break;
      }

      // Try to find servings
      const servingSelectors = [
        '.recipe-servings', '.servings', '.serves', '.yield',
        '[class*="serving"]', '[class*="yield"]', '.recipe-meta',
        // More specific text searches  
        ':contains("serves")', ':contains("servings")', ':contains("portions")'
      ];
      
      for (const selector of servingSelectors) {
        $(selector).each((i, el) => {
          const text = $(el).text().trim();
          const serving = this.parseServingsFromText(text);
          if (serving) {
            servings = serving;
            console.log(`Found servings with selector ${selector}: ${serving} from "${text}"`);
            return false; // break
          }
        });
        if (servings) break;
      }

      if (!title && ingredients.length === 0 && instructions.length === 0) {
        return null;
      }

      return {
        title: title || 'Recipe',
        image,
        sourceUrl: '',
        sourceName: '',
        readyInMinutes,
        servings,
        ingredients,
        instructions
      };
    } catch (error) {
      return null;
    }
  }

  private isNavigationText(text: string, isInstructionContext: boolean = false): boolean {
    const lowerText = text.toLowerCase();
    
    // More specific navigation patterns to avoid false positives
    const navPatterns = [
      /\blog in\b/, /\bsign up\b/, /\bmenu\b/, /\bhome\b/, /\babout us\b/, /\bcontact\b/, 
      /\bsearch\b/, /\bsubscribe\b/, /\bnewsletter\b/, /\bmy account\b/, /\bsettings\b/, 
      /\bhelp\b/, /\bprivacy\b/, /\bterms\b/, /\bcookies\b/, /\baccept all cookies\b/, 
      /\badvertisement\b/, /\bfollow us\b/, /\bsocial media\b/
    ];
    
    const foundPattern = navPatterns.find(pattern => pattern.test(lowerText));
    const hasNavKeywords = !!foundPattern;
    
    console.log(`    Navigation check - hasKeywords: ${hasNavKeywords} (found: "${foundPattern?.source}"), length: ${text.length}, isInstruction: ${isInstructionContext}`);
    
    // Check for recipe description patterns that should be filtered out
    const isRecipeDescription = this.isRecipeDescription(text);
    console.log(`    Recipe description check: ${isRecipeDescription}`);
    
    if (isInstructionContext) {
      // For instructions, be very lenient - only filter if it has nav keywords or is clearly a short description
      return hasNavKeywords || isRecipeDescription;
    } else {
      // For other content, keep the more restrictive limit
      return hasNavKeywords || text.length > 500;
    }
  }

  private isRecipeDescription(text: string): boolean {
    // These patterns indicate recipe descriptions rather than cooking instructions
    const descriptionPatterns = [
      /^[^.]{10,100}$/, // Short single sentences without periods (descriptions)
      /cooked in.*sauce$/, // Ends with "cooked in ... sauce"
      /style.*recipe$/, // Ends with "style ... recipe"
      /^.*—.*recipe\.?$/i, // Contains em dash before "recipe"
    ];
    
    return descriptionPatterns.some(pattern => pattern.test(text.trim()));
  }

  private parseInstructionBlock(text: string, selector: string): Array<{ number: number; step: string }> {
    // Check if this is a bongeats.com style instruction block that needs special parsing
    if (selector.includes('recipe-process') && text.length > 1000) {
      console.log('Triggering BongEats parsing for selector:', selector);
      return this.parseBongEatsInstructionBlock(text);
    }
    
    // For other selectors, return as single instruction
    return [{
      number: 1,
      step: text
    }];
  }

  private parseBongEatsInstructionBlock(text: string): Array<{ number: number; step: string }> {
    console.log('Parsing BongEats block, length:', text.length);
    
    // Remove ingredients section (everything before "Method" if present)
    let methodText = text;
    if (text.includes('Method')) {
      methodText = text.substring(text.indexOf('Method') + 6);
      console.log('After removing ingredients section, length:', methodText.length);
    } else {
      console.log('No Method section found, using full text');
    }
    
    // Remove lorem ipsum and serving suggestions at the end
    methodText = methodText.replace(/Lorem ipsum dolor.*?(?:Doodh Cha|Filter Coffee|$)/s, '');
    methodText = methodText.replace(/Serve with.*$/s, '');
    console.log('After removing lorem ipsum, length:', methodText.length);
    
    // Split into sentences, treating each as a step
    const sentences = methodText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && !s.toLowerCase().includes('lorem ipsum'));
    
    console.log(`Found ${sentences.length} sentences`);
    
    // Group related sentences into logical steps
    const steps: string[] = [];
    let currentStep = '';
    
    for (const sentence of sentences) {
      // Start new step if sentence begins with action words or timing indicators
      const startsNewStep = /^(Spatchcock|Chop|Next|Place|After|Meanwhile|Heat|Add|Cook|Fish|Drain|Clean|Serve)/.test(sentence);
      
      if (startsNewStep && currentStep.length > 0) {
        steps.push(currentStep.trim());
        currentStep = sentence;
      } else {
        currentStep = currentStep ? `${currentStep} ${sentence}` : sentence;
      }
    }
    
    if (currentStep.trim()) {
      steps.push(currentStep.trim());
    }
    
    console.log(`Created ${steps.length} steps`);
    
    // Convert to instruction objects
    const result = steps
      .filter(step => step.length > 30) // Filter out very short steps
      .map((step, index) => ({
        number: index + 1,
        step: step
      }));
    
    console.log(`Final result: ${result.length} instructions`);
    return result;
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

  private extractImageUrl(image: any): string | undefined {
    if (!image) return undefined;
    
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0];
    if (typeof image === 'object' && image.url) return image.url;
    
    return undefined;
  }

  private isValidResult(result: SimpleScrapingResult): boolean {
    // Must have either a title with ingredients/instructions, or just ingredients+instructions
    return !!(
      (result.title && (result.ingredients.length > 0 || result.instructions.length > 0)) ||
      (result.ingredients.length > 0 && result.instructions.length > 0)
    );
  }

  private formatRecipeData(result: SimpleScrapingResult, url: string): CreateRecipeData {
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
      tags: result.tags || []
    };
  }

  private isIconImage(src: string): boolean {
    const iconPatterns = [
      /clock.*\.svg/i, /icon.*\.svg/i, /\.svg$/i,
      /clock.*\.png/i, /icon.*\.png/i,
      /time.*\.svg/i, /time.*\.png/i,
      /solid\.svg/i, /regular\.svg/i
    ];
    
    return iconPatterns.some(pattern => pattern.test(src));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }
}