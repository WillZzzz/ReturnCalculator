import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheDir = path.join(process.cwd(), 'public', 'data', 'cache');
    
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Get all cache files
    const cacheFiles = fs.readdirSync(cacheDir).filter(file => file.endsWith('.json'));
    
    const now = Date.now();
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    
    const cacheStatus = {
      totalCached: cacheFiles.length,
      fresh: 0,
      expired: 0,
      oldestCache: null,
      newestCache: null,
      totalSize: 0,
      symbols: []
    };

    cacheFiles.forEach(file => {
      try {
        const filePath = path.join(cacheDir, file);
        const fileStats = fs.statSync(filePath);
        const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const symbol = file.replace('.json', '');
        const age = now - cacheData.timestamp;
        const isExpired = age > CACHE_DURATION;
        const ageHours = Math.round(age / (1000 * 60 * 60));
        const sizeKB = Math.round(fileStats.size / 1024);

        cacheStatus.totalSize += fileStats.size;

        if (isExpired) {
          cacheStatus.expired++;
        } else {
          cacheStatus.fresh++;
        }

        // Track oldest and newest
        if (!cacheStatus.oldestCache || cacheData.timestamp < cacheStatus.oldestCache.timestamp) {
          cacheStatus.oldestCache = { symbol, timestamp: cacheData.timestamp, age };
        }
        
        if (!cacheStatus.newestCache || cacheData.timestamp > cacheStatus.newestCache.timestamp) {
          cacheStatus.newestCache = { symbol, timestamp: cacheData.timestamp, age };
        }

        cacheStatus.symbols.push({
          symbol,
          timestamp: cacheData.timestamp,
          age,
          ageHours,
          expired: isExpired,
          sizeKB,
          price: cacheData.data?.['Global Quote']?.['05. price'] || 'N/A'
        });

      } catch (error) {
        console.warn(`Error reading cache file ${file}:`, error.message);
      }
    });

    // Sort symbols by age (newest first)
    cacheStatus.symbols.sort((a, b) => b.timestamp - a.timestamp);

    // Convert total size to KB
    cacheStatus.totalSizeKB = Math.round(cacheStatus.totalSize / 1024);

    // Add cache health percentage
    cacheStatus.healthPercentage = cacheStatus.totalCached > 0 ? 
      Math.round((cacheStatus.fresh / cacheStatus.totalCached) * 100) : 100;

    res.status(200).json(cacheStatus);

  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      error: 'Failed to get cache status',
      message: error.message
    });
  }
}