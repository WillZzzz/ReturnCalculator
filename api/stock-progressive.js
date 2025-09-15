import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  if (!/^[A-Z.]{1,6}$/.test(symbol.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }

  try {
    const symbolUpper = symbol.toUpperCase();
    console.log(`Progressive fetch for symbol: ${symbolUpper}`);

    // Check cache first
    const cachedData = await getCachedData(symbolUpper);
    if (cachedData) {
      return res.status(200).json(cachedData.data);
    }

    // If not cached, provide immediate basic response with quote only
    const API_KEY = process.env.ALPHA_VANTAGE_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API configuration error',
        message: 'Alpha Vantage API key not configured'
      });
    }

    // Fetch just the quote for immediate response
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbolUpper}&apikey=${API_KEY}`;
    
    const quoteResponse = await fetch(quoteUrl, {
      headers: { 'User-Agent': 'Portfolio-Analyzer/1.0' }
    });

    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      
      if (quoteData['Error Message'] || quoteData['Note']) {
        return res.status(429).json({ 
          error: 'API rate limit or error',
          message: quoteData['Error Message'] || quoteData['Note']
        });
      }

      const quote = quoteData['Global Quote'];
      if (quote && quote['01. symbol']) {
        // Return immediate basic data
        const basicData = {
          symbol: symbolUpper,
          quote: quoteData,
          analysis: {
            expectedReturn: 0.08, // Default fallback
            method: 'quote_only',
            confidence: 'low',
            calculatedAt: new Date().toISOString()
          },
          lastUpdated: new Date().toISOString(),
          dataQuality: {
            score: 1,
            maxScore: 4,
            percentage: 25,
            quality: 'basic'
          },
          isPartial: true // Flag to indicate this is partial data
        };

        // Trigger background comprehensive fetch (don't await)
        triggerBackgroundFetch(symbolUpper, API_KEY);

        return res.status(200).json(basicData);
      }
    }

    // If quote fails, return error
    return res.status(404).json({ 
      error: 'No data found for symbol',
      message: `No quote data available for ${symbolUpper}`
    });

  } catch (error) {
    console.error(`Error fetching progressive data for ${symbol}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch stock data',
      message: error.message 
    });
  }
}

// Trigger background comprehensive fetch (fire and forget)
async function triggerBackgroundFetch(symbol, apiKey) {
  try {
    console.log(`Starting background comprehensive fetch for ${symbol}`);
    
    // This would ideally be a separate endpoint or background job
    // For now, we'll just log that we would do this
    console.log(`Background fetch for ${symbol} would start comprehensive data collection`);
    
    // In a production system, you'd:
    // 1. Add to a queue (Redis, AWS SQS, etc.)
    // 2. Process in background workers
    // 3. Update cache when complete
    // 4. Optionally notify frontend via WebSocket
    
  } catch (error) {
    console.warn(`Background fetch failed for ${symbol}:`, error.message);
  }
}

// Helper function to get cached comprehensive data
async function getCachedData(symbol) {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
    const cacheFile = path.join(cacheDir, `${symbol}_comprehensive.json`);
    
    if (!fs.existsSync(cacheFile)) {
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const age = Date.now() - cacheData.timestamp;
    
    if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days max
      console.log(`Cache too old for ${symbol}, will refresh`);
      return null;
    }
    
    console.log(`Using cached comprehensive data for ${symbol}`);
    return cacheData;
  } catch (error) {
    console.warn(`Error reading cache for ${symbol}:`, error.message);
    return null;
  }
}