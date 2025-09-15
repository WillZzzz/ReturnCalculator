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
    console.log(`Fetching comprehensive data for symbol: ${symbolUpper}`);

    // Check cache first
    const cachedData = await getCachedData(symbolUpper);
    if (cachedData) {
      return res.status(200).json(cachedData.data);
    }

    console.log(`No valid comprehensive cache found for ${symbolUpper}, fetching from API...`);

    const API_KEY = process.env.ALPHA_VANTAGE_KEY;
    
    if (!API_KEY) {
      console.error('ALPHA_VANTAGE_KEY environment variable not set');
      return res.status(500).json({ 
        error: 'API configuration error',
        message: 'Alpha Vantage API key not configured'
      });
    }

    // Batch fetch all required data
    const comprehensiveData = await fetchComprehensiveData(symbolUpper, API_KEY);

    // Calculate expected return from the comprehensive data
    const analysis = calculateExpectedReturn(comprehensiveData);
    
    // Combine all data
    const unifiedData = {
      symbol: symbolUpper,
      quote: comprehensiveData.quote,
      overview: comprehensiveData.overview,
      earnings: comprehensiveData.earnings,
      historical: comprehensiveData.historical,
      analysis: analysis,
      lastUpdated: new Date().toISOString(),
      dataQuality: assessDataQuality(comprehensiveData)
    };

    // Cache the comprehensive data
    await cacheData(symbolUpper, unifiedData);
    console.log(`Cached comprehensive data for ${symbolUpper}`);

    res.status(200).json(unifiedData);

  } catch (error) {
    console.error(`Error fetching comprehensive data for ${symbol}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch comprehensive stock data',
      message: error.message 
    });
  }
}

// Fetch all required data from Alpha Vantage
async function fetchComprehensiveData(symbol, apiKey) {
  const data = {
    quote: null,
    overview: null,
    earnings: null,
    historical: null
  };

  // API endpoints - prioritize most important data first
  const endpoints = {
    quote: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
    overview: `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`,
    // Only fetch earnings and historical if we have enough API quota
    earnings: `https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${apiKey}`,
    historical: `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${apiKey}`
  };

  // Fetch all data with delays to respect rate limits
  for (const [key, url] of Object.entries(endpoints)) {
    try {
      console.log(`Fetching ${key} data for ${symbol}...`);
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Portfolio-Analyzer/1.0' }
      });

      if (response.ok) {
        const apiData = await response.json();
        
        // Check for API errors
        if (apiData['Error Message'] || apiData['Note']) {
          console.warn(`API issue for ${key}:`, apiData['Error Message'] || apiData['Note']);
          continue;
        }
        
        data[key] = apiData;
        console.log(`✓ Successfully fetched ${key} data for ${symbol}`);
      } else {
        console.warn(`Failed to fetch ${key} data:`, response.status);
      }

      // Smart rate limiting - reduce delays for essential data
      if (key === 'quote') {
        await new Promise(resolve => setTimeout(resolve, 8000)); // 8 second delay
      } else if (key === 'overview') {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay  
      } else if (key !== 'historical') {
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay for non-essential
      }

    } catch (error) {
      console.warn(`Error fetching ${key} data:`, error.message);
    }
  }

  return data;
}

// Calculate expected return from comprehensive data
function calculateExpectedReturn(data) {
  let expectedReturn = 0.08; // Default fallback
  let method = 'default';
  let confidence = 'low';
  let components = {};

  try {
    // Method 1: Blended approach (analyst target + multi-year trends)
    if (data.overview && data.overview['AnalystTargetPrice'] && data.quote) {
      const currentPrice = parseFloat(data.quote['Global Quote']['05. price']);
      const targetPrice = parseFloat(data.overview['AnalystTargetPrice']);
      
      if (currentPrice > 0 && targetPrice > 0) {
        const analystReturn = (targetPrice / currentPrice) - 1;
        
        // Sanity check analyst return: cap between -50% and +100%
        if (analystReturn >= -0.5 && analystReturn <= 1.0) {
          components.analyst = analystReturn;
          
          // Try to get multi-year EPS trend for blending
          let epsReturn = null;
          if (data.earnings && data.earnings.annualEarnings && data.earnings.annualEarnings.length >= 3) {
            const earnings = data.earnings.annualEarnings;
            const recent = parseFloat(earnings[0].reportedEPS);
            const threeYearAgo = parseFloat(earnings[2].reportedEPS);
            
            if (recent > 0 && threeYearAgo > 0) {
              // Calculate 3-year CAGR for EPS
              const epsCAGR = Math.pow(recent / threeYearAgo, 1/3) - 1;
              if (epsCAGR >= -0.3 && epsCAGR <= 0.5) { // Reasonable bounds
                epsReturn = epsCAGR * 0.8; // Conservative discount
                components.eps3year = epsReturn;
              }
            }
          }
          
          // Try to get 3-year historical return for blending
          let historicalReturn = null;
          if (data.historical && data.historical['Monthly Time Series']) {
            const monthlyData = data.historical['Monthly Time Series'];
            const dates = Object.keys(monthlyData).sort().reverse();
            
            if (dates.length >= 36) { // Need at least 3 years
              const recentPrice = parseFloat(monthlyData[dates[0]]['4. close']);
              const threeYearAgoPrice = parseFloat(monthlyData[dates[35]]['4. close']);
              
              if (recentPrice > 0 && threeYearAgoPrice > 0) {
                const historicalCAGR = Math.pow(recentPrice / threeYearAgoPrice, 1/3) - 1;
                if (historicalCAGR >= -0.5 && historicalCAGR <= 1.0) {
                  historicalReturn = historicalCAGR;
                  components.historical3year = historicalReturn;
                }
              }
            }
          }
          
          // Blend the returns (weighted average)
          let blendedReturn = analystReturn;
          let weights = { analyst: 1.0 };
          
          if (epsReturn !== null && historicalReturn !== null) {
            // All three available: 50% analyst, 25% EPS, 25% historical
            blendedReturn = (analystReturn * 0.5) + (epsReturn * 0.25) + (historicalReturn * 0.25);
            weights = { analyst: 0.5, eps: 0.25, historical: 0.25 };
            method = 'blended_all';
            confidence = 'high';
          } else if (epsReturn !== null) {
            // Analyst + EPS: 60% analyst, 40% EPS
            blendedReturn = (analystReturn * 0.6) + (epsReturn * 0.4);
            weights = { analyst: 0.6, eps: 0.4 };
            method = 'blended_analyst_eps';
            confidence = 'high';
          } else if (historicalReturn !== null) {
            // Analyst + Historical: 60% analyst, 40% historical
            blendedReturn = (analystReturn * 0.6) + (historicalReturn * 0.4);
            weights = { analyst: 0.6, historical: 0.4 };
            method = 'blended_analyst_historical';
            confidence = 'high';
          } else {
            // Only analyst available
            method = 'analyst_target';
            confidence = 'medium';
          }
          
          expectedReturn = blendedReturn;
          components.weights = weights;
        }
      }
    }

    // Method 2: Earnings Growth (if analyst target not available)
    if (method === 'default' && data.earnings && data.earnings.annualEarnings) {
      const earnings = data.earnings.annualEarnings;
      if (earnings.length >= 2) {
        const recentEPS = parseFloat(earnings[0].reportedEPS);
        const priorEPS = parseFloat(earnings[1].reportedEPS);
        
        if (recentEPS > 0 && priorEPS > 0) {
          const epsGrowth = (recentEPS / priorEPS) - 1;
          
          // Cap EPS growth between -50% and +50% for return estimate
          if (epsGrowth >= -0.5 && epsGrowth <= 0.5) {
            expectedReturn = epsGrowth * 0.8; // Discount factor for conservatism
            method = 'eps_growth';
            confidence = 'medium';
          }
        }
      }
    }

    // Method 3: Historical Return (if earnings not available)
    if (method === 'default' && data.historical && data.historical['Monthly Time Series']) {
      const monthlyData = data.historical['Monthly Time Series'];
      const dates = Object.keys(monthlyData).sort().reverse();
      
      if (dates.length >= 12) { // Need at least 1 year of data
        const recentPrice = parseFloat(monthlyData[dates[0]]['4. close']);
        const yearAgoPrice = parseFloat(monthlyData[dates[11]]['4. close']);
        
        if (recentPrice > 0 && yearAgoPrice > 0) {
          const historicalReturn = (recentPrice / yearAgoPrice) - 1;
          
          // Cap between -75% and +150%
          if (historicalReturn >= -0.75 && historicalReturn <= 1.5) {
            expectedReturn = historicalReturn;
            method = 'historical_1year';
            confidence = 'medium';
          }
        }
      }
    }

    // Method 4: Sector-based estimate (if all else fails)
    if (method === 'default' && data.overview && data.overview.Sector) {
      const sectorReturns = {
        'Technology': 0.12,
        'Healthcare': 0.10,
        'Consumer Cyclical': 0.11,
        'Consumer Defensive': 0.07,
        'Financial Services': 0.08,
        'Communication Services': 0.09,
        'Utilities': 0.06,
        'Energy': 0.09,
        'Industrials': 0.09,
        'Real Estate': 0.08,
        'Materials': 0.08
      };
      
      const sector = data.overview.Sector;
      if (sectorReturns[sector]) {
        expectedReturn = sectorReturns[sector];
        method = 'sector_based';
        confidence = 'medium';
      }
    }

  } catch (error) {
    console.warn('Error calculating expected return:', error.message);
  }

  return {
    expectedReturn: Math.round(expectedReturn * 10000) / 10000, // Round to 4 decimal places
    method: method,
    confidence: confidence,
    components: components,
    calculatedAt: new Date().toISOString(),
    userOverride: null
  };
}

// Assess overall data quality
function assessDataQuality(data) {
  let score = 0;
  let maxScore = 4;
  
  if (data.quote && data.quote['Global Quote']) score++;
  if (data.overview && data.overview.Symbol) score++;
  if (data.earnings && data.earnings.annualEarnings) score++;
  if (data.historical && data.historical['Monthly Time Series']) score++;
  
  const percentage = Math.round((score / maxScore) * 100);
  
  return {
    score: score,
    maxScore: maxScore,
    percentage: percentage,
    quality: percentage >= 75 ? 'high' : percentage >= 50 ? 'medium' : 'low'
  };
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
    
    // Cache is now persistent - only manual refresh removes it
    // TTL check kept for future use but not enforced
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (for reference)
    const age = Date.now() - cacheData.timestamp;
    const isStale = age > CACHE_DURATION;
    
    if (isStale) {
      console.log(`Using STALE cache for ${symbol} (${Math.round(age / (1000 * 60 * 60))}h old) - serving anyway to preserve API quota`);
    } else {
      console.log(`Using fresh cache for ${symbol} (${Math.round(age / (1000 * 60))}m old)`);
    }
    
    return cacheData;
  } catch (error) {
    console.warn(`Error reading comprehensive cache for ${symbol}:`, error.message);
    return null;
  }
}

// Helper function to cache comprehensive data
async function cacheData(symbol, data) {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cacheData = {
      symbol,
      timestamp: Date.now(),
      data: data
    };
    
    const cacheFile = path.join(cacheDir, `${symbol}_comprehensive.json`);
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    
    return true;
  } catch (error) {
    console.warn(`Error caching comprehensive data for ${symbol}:`, error.message);
    return false;
  }
}