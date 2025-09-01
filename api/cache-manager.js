import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
  
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    if (req.method === 'GET') {
      // Get cache status and statistics
      const { symbol } = req.query;
      
      if (symbol) {
        // Get specific symbol cache info
        const cacheFile = path.join(cacheDir, `${symbol.toUpperCase()}.json`);
        
        if (fs.existsSync(cacheFile)) {
          const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          const isExpired = isCacheExpired(cacheData.timestamp);
          
          return res.status(200).json({
            symbol: symbol.toUpperCase(),
            cached: true,
            timestamp: cacheData.timestamp,
            age: Date.now() - cacheData.timestamp,
            expired: isExpired,
            data: cacheData.data
          });
        } else {
          return res.status(404).json({
            symbol: symbol.toUpperCase(),
            cached: false,
            message: 'No cache found for this symbol'
          });
        }
      } else {
        // Get overall cache statistics
        const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.endsWith('.json'));
        const stats = {
          totalCached: cacheFiles.length,
          symbols: [],
          expired: 0,
          fresh: 0
        };

        cacheFiles.forEach(file => {
          try {
            const filePath = path.join(cacheDir, file);
            const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const symbol = file.replace('.json', '');
            const isExpired = isCacheExpired(cacheData.timestamp);
            
            stats.symbols.push({
              symbol,
              timestamp: cacheData.timestamp,
              age: Date.now() - cacheData.timestamp,
              expired: isExpired
            });
            
            if (isExpired) stats.expired++;
            else stats.fresh++;
          } catch (error) {
            console.warn(`Error reading cache file ${file}:`, error.message);
          }
        });

        return res.status(200).json(stats);
      }
    }

    if (req.method === 'POST') {
      // Cache security data
      const { symbol, data } = req.body;
      
      if (!symbol || !data) {
        return res.status(400).json({ error: 'Symbol and data are required' });
      }

      const cacheData = {
        symbol: symbol.toUpperCase(),
        timestamp: Date.now(),
        data: data
      };

      const cacheFile = path.join(cacheDir, `${symbol.toUpperCase()}.json`);
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));

      return res.status(200).json({
        message: 'Data cached successfully',
        symbol: symbol.toUpperCase(),
        timestamp: cacheData.timestamp
      });
    }

    if (req.method === 'DELETE') {
      // Clear cache
      const { symbol } = req.query;
      
      if (symbol) {
        // Delete specific symbol cache
        const cacheFile = path.join(cacheDir, `${symbol.toUpperCase()}.json`);
        
        if (fs.existsSync(cacheFile)) {
          fs.unlinkSync(cacheFile);
          return res.status(200).json({
            message: `Cache cleared for ${symbol.toUpperCase()}`
          });
        } else {
          return res.status(404).json({
            error: `No cache found for ${symbol.toUpperCase()}`
          });
        }
      } else {
        // Clear all cache
        const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.endsWith('.json'));
        
        cacheFiles.forEach(file => {
          fs.unlinkSync(path.join(cacheDir, file));
        });

        return res.status(200).json({
          message: `Cleared ${cacheFiles.length} cached items`
        });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Cache manager error:', error);
    res.status(500).json({ 
      error: 'Cache manager error',
      message: error.message 
    });
  }
}

// Helper function to check if cache is expired (24 hours)
function isCacheExpired(timestamp) {
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return (Date.now() - timestamp) > CACHE_DURATION;
}