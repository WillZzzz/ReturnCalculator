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

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ALPHA_VANTAGE_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'API configuration error',
      message: 'Alpha Vantage API key not configured'
    });
  }

  try {
    // Define popular search terms to get diverse securities
    const popularSearchTerms = [
      // Major indices and ETFs
      'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'AGG',
      // Tech giants
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX', 'ADBE', 'CRM',
      // Financial services
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'AXP', 'BRK',
      // Healthcare
      'JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'DHR', 'BMY', 'LLY', 'MRK', 'ABT',
      // Consumer
      'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT', 'LOW', 'COST', 'PG',
      // Industrial
      'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT', 'NOC', 'GD',
      // Energy
      'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'KMI', 'OKE', 'WMB', 'MPC',
      // Popular growth stocks
      'AMD', 'INTC', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX'
    ];

    const allSecurities = new Map(); // Use Map to prevent duplicates

    console.log('Starting to fetch popular securities...');
    
    // Fetch securities for each search term
    for (const term of popularSearchTerms) {
      try {
        const apiUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${term}&apikey=${API_KEY}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) continue;

        const data = await response.json();
        
        if (data['bestMatches']) {
          data['bestMatches'].forEach(match => {
            const symbol = match['1. symbol'];
            const name = match['2. name'];
            const type = match['3. type'];
            const region = match['4. region'];
            
            // Filter for US equities and ETFs primarily
            if (region === 'United States' && (type === 'Equity' || type === 'ETF')) {
              allSecurities.set(symbol, {
                symbol,
                name,
                type,
                region,
                currency: match['8. currency']
              });
            }
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`Failed to fetch data for ${term}:`, error.message);
        continue;
      }
    }

    // Convert Map to Array and limit to ~500 securities
    const securitiesArray = Array.from(allSecurities.values()).slice(0, 500);
    
    console.log(`Fetched ${securitiesArray.length} unique securities`);

    // Prepare the data structure
    const popularSecuritiesData = {
      lastUpdated: new Date().toISOString(),
      count: securitiesArray.length,
      securities: securitiesArray,
      metadata: {
        version: '1.0',
        source: 'Alpha Vantage API',
        description: 'Popular US equities and ETFs for portfolio analysis'
      }
    };

    // For GET requests, return the data
    if (req.method === 'GET') {
      return res.status(200).json(popularSecuritiesData);
    }

    // For POST requests, also save to file system (if possible in serverless)
    if (req.method === 'POST') {
      try {
        // Try to save to public directory (may not work in serverless)
        const publicDir = path.join(process.cwd(), 'public', 'data');
        const filePath = path.join(publicDir, 'popular-securities.json');
        
        // Ensure directory exists
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, JSON.stringify(popularSecuritiesData, null, 2));
        
        console.log(`Saved ${securitiesArray.length} securities to ${filePath}`);
        
        return res.status(200).json({
          message: 'Popular securities fetched and saved successfully',
          count: securitiesArray.length,
          filePath: '/data/popular-securities.json'
        });
      } catch (fileError) {
        console.warn('Could not save to file system:', fileError.message);
        return res.status(200).json({
          message: 'Popular securities fetched (file save failed in serverless environment)',
          data: popularSecuritiesData
        });
      }
    }

  } catch (error) {
    console.error('Error fetching popular securities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch popular securities',
      message: error.message 
    });
  }
}