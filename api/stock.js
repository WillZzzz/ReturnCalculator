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
  
    if (!/^[A-Z]{1,5}$/.test(symbol.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
  
    try {
      const symbolUpper = symbol.toUpperCase();
      console.log(`Fetching data for symbol: ${symbolUpper}`);

      // Check cache first
      const cachedData = await getCachedData(symbolUpper);
      if (cachedData) {
        console.log(`Using cached data for ${symbolUpper} (age: ${Math.round((Date.now() - cachedData.timestamp) / 1000 / 60)} minutes)`);
        return res.status(200).json(cachedData.data);
      }

      console.log(`No valid cache found for ${symbolUpper}, fetching from API...`);
  
      const API_KEY = process.env.ALPHA_VANTAGE_KEY;
      
      if (!API_KEY) {
        console.error('ALPHA_VANTAGE_KEY environment variable not set');
        return res.status(500).json({ 
          error: 'API configuration error',
          message: 'Alpha Vantage API key not configured'
        });
      }
  
      const apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbolUpper}&apikey=${API_KEY}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Portfolio-Analyzer/1.0'
        }
      });
  
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json();
  
      if (data['Error Message']) {
        return res.status(400).json({ 
          error: 'Invalid symbol or API error',
          message: data['Error Message']
        });
      }
  
      if (data['Note']) {
        return res.status(429).json({ 
          error: 'API rate limit exceeded',
          message: data['Note']
        });
      }
  
      const quote = data['Global Quote'];
      if (!quote || !quote['01. symbol']) {
        return res.status(404).json({ 
          error: 'No data found for symbol',
          message: `No quote data available for ${symbol}`
        });
      }
  
      console.log(`Successfully fetched data for ${symbolUpper}: $${quote['05. price']}`);
      
      // Cache the successful response
      await cacheData(symbolUpper, data);
      console.log(`Cached data for ${symbolUpper}`);
      
      res.status(200).json(data);
  
    } catch (error) {
      console.error(`Error fetching stock data for ${symbolUpper}:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch stock data',
        message: error.message 
      });
    }
  }

// Helper function to get cached data
async function getCachedData(symbol) {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
    const cacheFile = path.join(cacheDir, `${symbol}.json`);
    
    if (!fs.existsSync(cacheFile)) {
      return null;
    }
    
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Cache is now persistent - only manual refresh removes it
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (for reference)
    const age = Date.now() - cacheData.timestamp;
    const isStale = age > CACHE_DURATION;
    
    if (isStale) {
      console.log(`Cache is stale for ${symbol} (${Math.round(age / (1000 * 60 * 60))}h old), but using cached data to preserve API quota`);
    } else {
      console.log(`Using fresh cache for ${symbol} (${Math.round(age / (1000 * 60))}m old)`);
    }
    
    return cacheData;
  } catch (error) {
    console.warn(`Error reading cache for ${symbol}:`, error.message);
    return null;
  }
}

// Helper function to cache data
async function cacheData(symbol, data) {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
    
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheData = {
      symbol,
      timestamp: Date.now(),
      data: data
    };
    
    const cacheFile = path.join(cacheDir, `${symbol}.json`);
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    
    return true;
  } catch (error) {
    console.warn(`Error caching data for ${symbol}:`, error.message);
    return false;
  }
}