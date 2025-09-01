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

  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query parameter required with minimum 2 characters' });
  }

  try {
    const API_KEY = process.env.ALPHA_VANTAGE_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API configuration error',
        message: 'Alpha Vantage API key not configured'
      });
    }

    const apiUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    
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
        error: 'API error',
        message: data['Error Message']
      });
    }

    if (data['Note']) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded',
        message: data['Note']
      });
    }

    // Transform Alpha Vantage response to our format
    const matches = data['bestMatches'] || [];
    const results = matches.slice(0, 10).map(match => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency']
    }));

    res.status(200).json({ results });

  } catch (error) {
    console.error(`Error searching symbols for "${query}":`, error);
    res.status(500).json({ 
      error: 'Failed to search symbols',
      message: error.message 
    });
  }
}