import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to refresh or DELETE to clear cache.' });
  }

  try {
    const { symbol, symbols, action } = req.method === 'POST' ? req.body : req.query;
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');

    if (req.method === 'DELETE') {
      // Clear cache (single symbol or all)
      if (symbol) {
        const cacheFile = path.join(cacheDir, `${symbol.toUpperCase()}_comprehensive.json`);
        const simpleCacheFile = path.join(cacheDir, `${symbol.toUpperCase()}.json`);
        
        let cleared = 0;
        if (fs.existsSync(cacheFile)) {
          fs.unlinkSync(cacheFile);
          cleared++;
        }
        if (fs.existsSync(simpleCacheFile)) {
          fs.unlinkSync(simpleCacheFile);
          cleared++;
        }

        return res.status(200).json({
          action: 'clear',
          symbol: symbol.toUpperCase(),
          cleared: cleared,
          message: `Cleared ${cleared} cache file(s) for ${symbol.toUpperCase()}`
        });
      } else {
        // Clear all cache
        const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.endsWith('.json'));
        
        cacheFiles.forEach(file => {
          fs.unlinkSync(path.join(cacheDir, file));
        });

        return res.status(200).json({
          action: 'clear_all',
          cleared: cacheFiles.length,
          message: `Cleared all ${cacheFiles.length} cache files`
        });
      }
    }

    if (req.method === 'POST') {
      const API_KEY = process.env.ALPHA_VANTAGE_KEY;
      
      if (!API_KEY) {
        return res.status(500).json({ 
          error: 'API configuration error',
          message: 'Alpha Vantage API key not configured'
        });
      }

      let symbolsToRefresh = [];
      
      if (symbol) {
        symbolsToRefresh = [symbol.toUpperCase()];
      } else if (symbols && Array.isArray(symbols)) {
        symbolsToRefresh = symbols.map(s => s.toUpperCase());
      } else if (action === 'refresh_all') {
        // Get all cached symbols
        const cacheFiles = fs.readdirSync(cacheDir)
          .filter(file => file.endsWith('_comprehensive.json'))
          .map(file => file.replace('_comprehensive.json', ''));
        symbolsToRefresh = cacheFiles;
      } else {
        return res.status(400).json({ 
          error: 'Missing parameters. Provide "symbol", "symbols" array, or "action": "refresh_all"' 
        });
      }

      if (symbolsToRefresh.length === 0) {
        return res.status(400).json({
          error: 'No symbols to refresh',
          message: 'No cached symbols found or no symbols provided'
        });
      }

      // Warning about API quota
      const estimatedAPICalls = symbolsToRefresh.length * 4; // 4 calls per symbol
      if (estimatedAPICalls > 20) {
        return res.status(400).json({
          error: 'Too many API calls required',
          message: `Refreshing ${symbolsToRefresh.length} symbols would use ~${estimatedAPICalls} API calls. Daily limit is 25.`,
          suggestion: 'Refresh fewer symbols at once or use DELETE to clear cache instead.'
        });
      }

      const results = [];
      let totalAPICalls = 0;

      for (const sym of symbolsToRefresh) {
        try {
          console.log(`Manually refreshing cache for ${sym}...`);
          
          // Clear existing cache first
          const cacheFile = path.join(cacheDir, `${sym}_comprehensive.json`);
          if (fs.existsSync(cacheFile)) {
            fs.unlinkSync(cacheFile);
          }

          // Call comprehensive API to rebuild cache
          const baseUrl = req.headers.host?.includes('localhost') ? 
            `http://${req.headers.host}` : 
            `https://${req.headers.host}`;
          
          const response = await fetch(`${baseUrl}/api/stock-comprehensive?symbol=${sym}`, {
            headers: { 'User-Agent': 'Portfolio-Analyzer-Cache-Refresh/1.0' }
          });

          if (response.ok) {
            const data = await response.json();
            totalAPICalls += 4; // Each comprehensive call uses 4 API calls
            
            results.push({
              symbol: sym,
              status: 'success',
              dataQuality: data.dataQuality?.quality || 'unknown',
              analysisMethod: data.analysis?.method || 'unknown',
              expectedReturn: data.analysis?.expectedAnnualReturn ? 
                `${(data.analysis.expectedAnnualReturn * 100).toFixed(1)}%` : 'N/A'
            });
          } else {
            results.push({
              symbol: sym,
              status: 'failed',
              error: `HTTP ${response.status}`
            });
          }

          // Rate limiting delay (Alpha Vantage: 5 calls/minute)
          if (symbolsToRefresh.indexOf(sym) < symbolsToRefresh.length - 1) {
            console.log('Waiting 12 seconds to respect API rate limits...');
            await new Promise(resolve => setTimeout(resolve, 12000));
          }

        } catch (error) {
          console.error(`Error refreshing ${sym}:`, error.message);
          results.push({
            symbol: sym,
            status: 'error',
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status !== 'success').length;

      return res.status(200).json({
        action: 'refresh',
        totalSymbols: symbolsToRefresh.length,
        successful: successful,
        failed: failed,
        estimatedAPICalls: totalAPICalls,
        results: results,
        message: `Cache refresh completed: ${successful} successful, ${failed} failed`
      });
    }

  } catch (error) {
    console.error('Cache refresh error:', error);
    res.status(500).json({ 
      error: 'Cache refresh failed',
      message: error.message 
    });
  }
}