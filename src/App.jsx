import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Trash2, Calculator, TrendingUp, DollarSign, Percent, Search } from 'lucide-react';

const PortfolioAnalyzer = () => {
  const [securities, setSecurities] = useState([
    { id: 1, symbol: '', contribution: '', frequency: 'monthly' }
  ]);
  const [duration, setDuration] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [savedPortfolios, setSavedPortfolios] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [popularSecurities, setPopularSecurities] = useState([]);
  const searchCache = useRef(new Map());
  const apiSearchCache = useRef(new Map());


  // Load popular securities from local cache on component mount
  useEffect(() => {
    const loadPopularSecurities = async () => {
      try {
        const response = await fetch('/data/popular-securities.json');
        if (response.ok) {
          const data = await response.json();
          setPopularSecurities(data.securities || []);
          console.log(`Loaded ${data.securities?.length || 0} popular securities from cache`);
        } else {
          console.warn('Could not load popular securities cache, using fallback');
        }
      } catch (error) {
        console.warn('Error loading popular securities:', error);
      }
    };
    
    loadPopularSecurities();
  }, []);

  // Load saved portfolios from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedPortfolios');
      if (saved) {
        setSavedPortfolios(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Error loading saved portfolios:', error);
    }
  }, []);

  // Fallback stock database (used if cache load fails)
  const fallbackStockDatabase = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'DIS', name: 'Walt Disney Company' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
    { symbol: 'KO', name: 'Coca-Cola Company' },
    { symbol: 'PEP', name: 'PepsiCo Inc.' },
    { symbol: 'NKE', name: 'Nike Inc.' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' }
  ];

  // Use popular securities cache or fallback
  const stockDatabase = popularSecurities.length > 0 ? popularSecurities : fallbackStockDatabase;

  // Popular securities recommendations data
  const popularRecommendations = [
    // Index Funds & ETFs
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", category: "🏛️ Index Funds", description: "Low-cost S&P 500 tracking" },
    { symbol: "VTI", name: "Vanguard Total Stock Market", category: "🏛️ Index Funds", description: "Entire US stock market" },
    { symbol: "QQQ", name: "Invesco QQQ Trust", category: "💻 Tech ETF", description: "Nasdaq 100 technology focus" },
    
    // Mega Cap Stocks
    { symbol: "AAPL", name: "Apple Inc.", category: "📱 Mega Cap", description: "Consumer electronics leader" },
    { symbol: "MSFT", name: "Microsoft Corporation", category: "☁️ Cloud & Software", description: "Cloud computing giant" },
    { symbol: "GOOGL", name: "Alphabet Inc.", category: "🔍 Search & AI", description: "Search and advertising" },
    
    // Growth Stocks
    { symbol: "TSLA", name: "Tesla Inc.", category: "🚗 Electric Vehicles", description: "EV and clean energy" },
    { symbol: "NVDA", name: "NVIDIA Corporation", category: "🤖 AI & Chips", description: "AI and graphics chips" },
    
    // Dividend Stocks
    { symbol: "JNJ", name: "Johnson & Johnson", category: "💊 Healthcare", description: "Pharmaceutical giant" },
    { symbol: "PG", name: "Procter & Gamble", category: "🧴 Consumer Goods", description: "Consumer staples" },
    
    // International
    { symbol: "VXUS", name: "Vanguard Total International", category: "🌍 International", description: "Global diversification" }
  ];

  // Categorized recommendations for organized display
  const recommendationCategories = {
    "🏛️ Safe & Steady": ["VOO", "VTI", "VXUS"],
    "💻 Growth & Tech": ["QQQ", "AAPL", "MSFT", "GOOGL"],
    "🚀 High Growth": ["TSLA", "NVDA"],
    "💰 Dividend Income": ["JNJ", "PG"]
  };

  // Helper function to get contribution frequency multiplier
  const getFrequencyMultiplier = (frequency) => {
    switch (frequency) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'semi-monthly': return 24; // Twice per month
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semi-annually': return 2;
      case 'yearly': return 1;
      default: return 12; // Default to monthly
    }
  };

  // Function to refresh popular securities cache (call this manually or on a schedule)
  const refreshPopularSecurities = async () => {
    try {
      console.log('Refreshing popular securities cache...');
      const response = await fetch('/api/popular-securities', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        console.log('Cache refresh result:', result);
        
        // Reload the cached data
        const newData = await fetch('/data/popular-securities.json');
        if (newData.ok) {
          const data = await newData.json();
          setPopularSecurities(data.securities || []);
          console.log(`Updated cache with ${data.securities?.length || 0} securities`);
        }
      }
    } catch (error) {
      console.error('Failed to refresh popular securities cache:', error);
    }
  };

  // Enhanced search with local + API results and 24h caching
  const searchSymbols = async (query) => {
    if (query.length < 1) return [];
    
    // Check local cache first (instant results)
    const cacheKey = query.toLowerCase();
    const cached = searchCache.current.get(cacheKey);
    if (cached) return cached;

    // Search local hardcoded database
    const localResults = stockDatabase.filter(stock => 
      stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
      stock.name.toLowerCase().includes(query.toLowerCase())
    );

    // For short queries (1-2 chars), only use local results
    if (query.length < 3) {
      const results = localResults.slice(0, 6);
      searchCache.current.set(cacheKey, results);
      return results;
    }

    // Check API cache with 24h expiry
    const apiCacheKey = `api_${cacheKey}`;
    const apiCached = apiSearchCache.current.get(apiCacheKey);
    const now = Date.now();
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    if (apiCached && (now - apiCached.timestamp) < CACHE_DURATION) {
      // Combine local and cached API results
      const combinedResults = [...localResults, ...apiCached.data]
        .reduce((acc, current) => {
          // Remove duplicates by symbol
          if (!acc.find(item => item.symbol === current.symbol)) {
            acc.push(current);
          }
          return acc;
        }, [])
        .slice(0, 8);
      
      searchCache.current.set(cacheKey, combinedResults);
      return combinedResults;
    }

    // If no valid cache, return local results immediately and fetch API in background
    const immediateResults = localResults.slice(0, 6);
    searchCache.current.set(cacheKey, immediateResults);

    // Fetch from API in background (don't await)
    fetchApiSymbols(query, cacheKey, localResults);
    
    return immediateResults;
  };

  const fetchApiSymbols = async (query, cacheKey, localResults) => {
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        const apiResults = data.results || [];
        
        // Store in API cache with timestamp
        apiSearchCache.current.set(`api_${cacheKey}`, {
          data: apiResults,
          timestamp: Date.now()
        });

        // Combine and update main cache
        const combinedResults = [...localResults, ...apiResults]
          .reduce((acc, current) => {
            if (!acc.find(item => item.symbol === current.symbol)) {
              acc.push(current);
            }
            return acc;
          }, [])
          .slice(0, 8);

        searchCache.current.set(cacheKey, combinedResults);
        
        // Update active dropdown if still searching same query
        // This will refresh the dropdown with API results
        setSearchResults(prev => ({
          ...prev,
          [activeDropdown]: combinedResults
        }));
      }
    } catch (error) {
      console.warn('API search failed, using local results only:', error);
    }
  };

  const handleSymbolInput = async (securityId, value) => {
    updateSecurity(securityId, 'symbol', value);
    
    if (value.length >= 1) {
      setActiveDropdown(securityId);
      const results = await searchSymbols(value);
      setSearchResults(prev => ({ ...prev, [securityId]: results }));
    } else {
      setActiveDropdown(null);
    }
  };

  const selectSymbol = (securityId, symbolData) => {
    updateSecurity(securityId, 'symbol', symbolData.symbol);
    setActiveDropdown(null);
  };

  const addSecurity = () => {
    setSecurities([...securities, { 
      id: Date.now(), 
      symbol: '', 
      contribution: '', 
      frequency: 'monthly' 
    }]);
  };

  const removeSecurity = (id) => {
    setSecurities(securities.filter(s => s.id !== id));
  };

  const updateSecurity = (id, field, value) => {
    setSecurities(securities.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  // Portfolio Management Functions
  const savePortfolio = (name) => {
    if (!name.trim()) return;
    
    const portfolio = {
      id: Date.now().toString(),
      name: name.trim(),
      securities: securities.filter(s => s.symbol && s.contribution),
      duration,
      results,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const updated = [...savedPortfolios, portfolio];
      setSavedPortfolios(updated);
      localStorage.setItem('savedPortfolios', JSON.stringify(updated));
      setShowSaveDialog(false);
      setPortfolioName('');
      console.log(`Portfolio "${name}" saved successfully`);
    } catch (error) {
      console.error('Error saving portfolio:', error);
      alert('Error saving portfolio. Please try again.');
    }
  };

  const loadPortfolio = (portfolio) => {
    setSecurities(portfolio.securities);
    setDuration(portfolio.duration);
    setResults(portfolio.results);
    setShowLoadDialog(false);
    console.log(`Portfolio "${portfolio.name}" loaded successfully`);
  };

  const deletePortfolio = (portfolioId) => {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;
    
    try {
      const updated = savedPortfolios.filter(p => p.id !== portfolioId);
      setSavedPortfolios(updated);
      localStorage.setItem('savedPortfolios', JSON.stringify(updated));
      console.log('Portfolio deleted successfully');
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Error deleting portfolio. Please try again.');
    }
  };

  const canSavePortfolio = () => {
    return securities.some(s => s.symbol && s.contribution) && duration && results;
  };

  // Add recommended security to portfolio
  const addRecommendedSecurity = (recommendation) => {
    // Check if security already exists
    const exists = securities.some(s => s.symbol.toLowerCase() === recommendation.symbol.toLowerCase());
    if (exists) {
      alert(`${recommendation.symbol} is already in your portfolio!`);
      return;
    }

    // Find first empty security slot or add new one
    const emptySlot = securities.find(s => !s.symbol);
    if (emptySlot) {
      updateSecurity(emptySlot.id, 'symbol', recommendation.symbol);
    } else {
      setSecurities([...securities, { 
        id: Date.now(), 
        symbol: recommendation.symbol, 
        contribution: '', 
        frequency: 'monthly' 
      }]);
    }
    
    console.log(`Added ${recommendation.symbol} to portfolio`);
  };

  const fetchSecurityData = async (symbol) => {
    try {
      // Use comprehensive API for realistic expected returns
      const response = await fetch(`/api/stock-comprehensive?symbol=${symbol}`);
      
      if (!response.ok) {
        // Fallback to simple API if comprehensive fails
        console.warn(`Comprehensive API failed for ${symbol}, trying simple API...`);
        return await fetchSecurityDataFallback(symbol);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Extract data from comprehensive response
      const quote = data.quote?.['Global Quote'];
      const analysis = data.analysis;
      const overview = data.overview;
      
      if (quote && quote['05. price'] && analysis) {
        return {
          symbol,
          currentPrice: parseFloat(quote['05. price']),
          expectedAnnualReturn: analysis.expectedReturn,
          change: parseFloat(quote['09. change'] || 0),
          isRealData: true,
          // Additional data for enhanced display
          companyName: overview?.Name || symbol,
          sector: overview?.Sector || 'Unknown',
          analysisMethod: analysis.method,
          confidence: analysis.confidence,
          dataQuality: data.dataQuality?.quality || 'unknown',
          analystTarget: overview?.AnalystTargetPrice ? parseFloat(overview.AnalystTargetPrice) : null
        };
      } else {
        throw new Error('Invalid comprehensive API response structure');
      }
    } catch (error) {
      console.error(`Error fetching comprehensive data for ${symbol}:`, error);
      return await fetchSecurityDataFallback(symbol);
    }
  };

  // Fallback to simple API or mock data
  const fetchSecurityDataFallback = async (symbol) => {
    try {
      const response = await fetch(`/api/stock?symbol=${symbol}`);
      
      if (response.ok) {
        const data = await response.json();
        const quote = data['Global Quote'];
        
        if (quote && quote['05. price']) {
          return {
            symbol,
            currentPrice: parseFloat(quote['05. price']),
            expectedAnnualReturn: 0.08 + Math.random() * 0.04, // Still random as fallback
            change: parseFloat(quote['09. change'] || 0),
            isRealData: true,
            companyName: symbol,
            sector: 'Unknown',
            analysisMethod: 'fallback_random',
            confidence: 'low',
            dataQuality: 'basic'
          };
        }
      }
      
      // Final fallback to mock data
      return {
        symbol,
        currentPrice: 100 + Math.random() * 200,
        expectedAnnualReturn: 0.08 + Math.random() * 0.04,
        change: (Math.random() - 0.5) * 10,
        isRealData: false,
        companyName: symbol,
        sector: 'Unknown',
        analysisMethod: 'mock_data',
        confidence: 'none',
        dataQuality: 'mock'
      };
    } catch (error) {
      console.error(`Fallback also failed for ${symbol}:`, error);
      
      return {
        symbol,
        currentPrice: 100 + Math.random() * 200,
        expectedAnnualReturn: 0.08 + Math.random() * 0.04,
        change: (Math.random() - 0.5) * 10,
        isRealData: false,
        companyName: symbol,
        sector: 'Unknown',
        analysisMethod: 'error_fallback',
        confidence: 'none',
        dataQuality: 'mock'
      };
    }
  };

  const calculateCompoundGrowth = (periodicPayment, periodsPerYear, annualRate, years) => {
    const periodicRate = annualRate / periodsPerYear;
    const totalPeriods = periodsPerYear * years;
    
    if (periodicRate === 0) {
      return periodicPayment * totalPeriods;
    }
    
    return periodicPayment * (Math.pow(1 + periodicRate, totalPeriods) - 1) / periodicRate;
  };

  const calculatePortfolioPerformance = async () => {
    setLoading(true);
    setProgressStatus({});
    
    try {
      const durationYears = parseInt(duration);
      const validSecurities = securities.filter(s => s.symbol && s.contribution);
      
      // Show initial progress
      setProgressStatus({
        message: `Analyzing ${validSecurities.length} securities... This may take 1-2 minutes.`,
        total: validSecurities.length,
        current: 0
      });
      
      const securityData = await Promise.all(
        validSecurities.map(async (security, index) => {
          // Update progress for each security
          setProgressStatus(prev => ({
            ...prev,
            current: index + 1,
            message: `Fetching ${security.symbol} data... (${index + 1}/${validSecurities.length})`
          }));
          
          const data = await fetchSecurityData(security.symbol.toUpperCase());
          return { ...security, data };
        })
      );

      const contributionSchedule = securityData.map(security => {
        const monthlyContribution = parseFloat(security.contribution);
        const frequency = security.frequency;
        const contributionsPerYear = getFrequencyMultiplier(frequency);
        const totalContributions = monthlyContribution * contributionsPerYear * durationYears;
        
        const avgReturn = security.data.expectedAnnualReturn;
        const projectedValue = calculateCompoundGrowth(monthlyContribution, contributionsPerYear, avgReturn, durationYears);
        
        return {
          ...security,
          totalContributions,
          projectedValue,
          gain: projectedValue - totalContributions,
          gainPercent: ((projectedValue - totalContributions) / totalContributions) * 100
        };
      });

      const totalContributions = contributionSchedule.reduce((sum, s) => sum + s.totalContributions, 0);
      const totalValue = contributionSchedule.reduce((sum, s) => sum + s.projectedValue, 0);
      const totalGain = totalValue - totalContributions;

      const sp500Value = calculateCompoundGrowth(totalContributions / (durationYears * 12), 12, 0.10, durationYears);

      setResults({
        securities: contributionSchedule,
        portfolio: {
          totalContributions,
          totalValue,
          totalGain,
          // CAGR formula: ((Final Value / Initial Value)^(1/Years)) - 1
          // Now meaningful because totalValue uses realistic market-based expected returns
          annualizedReturn: Math.pow(totalValue / totalContributions, 1 / durationYears) - 1
        },
        benchmark: { value: sp500Value, annualizedReturn: 0.10 }
      });
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
      setProgressStatus({});
    }
  };

  // Enhanced growth chart data with individual securities
  const growthChartData = results ? (() => {
    const durationYears = parseInt(duration);
    const data = [];
    
    for (let year = 0; year <= durationYears; year++) {
      let totalContributions = 0;
      let totalPortfolioValue = 0;
      
      const dataPoint = {
        year: year,
        contributions: 0,
        portfolio: 0,
        sp500: 0
      };
      
      // Calculate individual security values and portfolio totals
      results.securities.forEach(security => {
        const annualContrib = parseFloat(security.contribution) * getFrequencyMultiplier(security.frequency);
        
        const contribToDate = annualContrib * year;
        totalContributions += contribToDate;
        
        let securityValue = 0;
        if (year > 0) {
          securityValue = annualContrib * ((Math.pow(1 + security.data.expectedAnnualReturn, year) - 1) / security.data.expectedAnnualReturn);
          totalPortfolioValue += securityValue;
        }
        
        // Add individual security data to chart
        dataPoint[`security_${security.symbol}`] = Math.round(securityValue);
      });
      
      const sp500Value = year > 0 ? 
        (totalContributions / year) * ((Math.pow(1.10, year) - 1) / 0.10) : 0;
      
      dataPoint.contributions = Math.round(totalContributions);
      dataPoint.portfolio = Math.round(totalPortfolioValue);
      dataPoint.sp500 = Math.round(sp500Value);
      
      data.push(dataPoint);
    }
    
    return data;
  })() : [];

  // Initialize visibility state with individual securities hidden by default
  const getInitialVisibility = () => {
    const visibility = {
      contributions: true,
      portfolio: true,
      sp500: true
    };
    
    // Add individual securities (hidden by default)
    if (results && results.securities) {
      results.securities.forEach(security => {
        visibility[`security_${security.symbol}`] = false;
      });
    }
    
    return visibility;
  };

  const [visibleLines, setVisibleLines] = useState(getInitialVisibility());
  
  // Update visibility when results change
  React.useEffect(() => {
    if (results) {
      setVisibleLines(prev => {
        const newVisibility = { ...prev };
        results.securities.forEach(security => {
          const key = `security_${security.symbol}`;
          if (!(key in newVisibility)) {
            newVisibility[key] = false; // Hidden by default
          }
        });
        return newVisibility;
      });
    }
  }, [results]);

  const toggleLineVisibility = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const pieChartData = results ? results.securities.map(s => ({
    name: s.symbol,
    value: s.projectedValue
  })) : [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Portfolio Investment Analyzer</h1>
          <p className="text-sm sm:text-base text-gray-600">Smart search, live data, and growth visualization</p>
        </div>

        {/* Popular Securities Recommendations */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🔥 Popular Investment Choices
            <span className="text-sm font-normal text-gray-600">Click to add to your portfolio</span>
          </h2>
          
          {/* Quick Add - Most Popular */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Start</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {popularRecommendations.slice(0, 4).map((rec) => (
                <button
                  key={rec.symbol}
                  onClick={() => addRecommendedSecurity(rec)}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div className="font-semibold text-gray-900 group-hover:text-blue-700">{rec.symbol}</div>
                  <div className="text-xs text-gray-600 truncate">{rec.category}</div>
                  <div className="text-xs text-gray-500 mt-1 group-hover:text-blue-600">+ Add to portfolio</div>
                </button>
              ))}
            </div>
          </div>

          {/* Categorized Recommendations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(recommendationCategories).map(([category, symbols]) => (
              <div key={category} className="bg-white rounded-lg border border-gray-200 p-3">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">{category}</h4>
                <div className="space-y-1">
                  {symbols.map((symbol) => {
                    const rec = popularRecommendations.find(r => r.symbol === symbol);
                    if (!rec) return null;
                    
                    return (
                      <button
                        key={symbol}
                        onClick={() => addRecommendedSecurity(rec)}
                        className="w-full text-left p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors group"
                      >
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-700">{symbol}</div>
                        <div className="text-xs text-gray-500 truncate group-hover:text-blue-600">{rec.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              💡 Recommendations based on popular investment strategies. Always do your own research.
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Investment Configuration</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Securities & Contributions</label>
            {securities.map((security) => (
              <div key={security.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-3 items-stretch sm:items-center relative">
                <div className="flex-1 relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search (e.g., Apple, AAPL)"
                      value={security.symbol}
                      onChange={(e) => handleSymbolInput(security.id, e.target.value)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Smart Dropdown */}
                  {activeDropdown === security.id && searchResults[security.id]?.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults[security.id].map((result, index) => (
                        <div
                          key={index}
                          onClick={() => selectSymbol(security.id, result)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{result.symbol}</div>
                          <div className="text-sm text-gray-600">{result.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 sm:contents">
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    value={security.contribution}
                    onChange={(e) => updateSecurity(security.id, 'contribution', e.target.value)}
                    className="flex-1 sm:w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
                  />
                  
                  <select
                    value={security.frequency}
                    onChange={(e) => updateSecurity(security.id, 'frequency', e.target.value)}
                    className="flex-1 sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="semi-monthly">Semi-monthly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annually">Semi-annually</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                {securities.length > 1 && (
                  <button onClick={() => removeSecurity(security.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            
            <button onClick={addSecurity} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base">
              <Plus size={16} /> Add Security
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Investment Duration (Years)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 10"
              className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <button
            onClick={calculatePortfolioPerformance}
            disabled={loading || !duration || securities.some(s => !s.symbol || !s.contribution)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-base"
          >
{loading ? (
              progressStatus.message ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {progressStatus.message}
                </>
              ) : 'Loading...'
            ) : (
              <><Calculator size={16} /> Calculate Portfolio</>
            )}
          </button>

          {/* Portfolio Management */}
          <div className="flex flex-wrap gap-2 mt-4">
            {savedPortfolios.length > 0 && (
              <button
                onClick={() => setShowLoadDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                📁 Load Portfolio ({savedPortfolios.length})
              </button>
            )}
            
            {canSavePortfolio() && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              >
                💾 Save Portfolio
              </button>
            )}
          </div>
        </div>

        {/* Save Portfolio Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Save Portfolio</h3>
              <input
                type="text"
                placeholder="Enter portfolio name..."
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 mb-4"
                onKeyPress={(e) => e.key === 'Enter' && portfolioName.trim() && savePortfolio(portfolioName)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => portfolioName.trim() && savePortfolio(portfolioName)}
                  disabled={!portfolioName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setPortfolioName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Portfolio Dialog */}
        {showLoadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Load Portfolio</h3>
              {savedPortfolios.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No saved portfolios found.</p>
              ) : (
                <div className="space-y-3">
                  {savedPortfolios.map((portfolio) => (
                    <div key={portfolio.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{portfolio.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {portfolio.securities.length} securities • {portfolio.duration} years
                          </p>
                          <p className="text-sm text-gray-600">
                            Securities: {portfolio.securities.map(s => s.symbol).join(', ')}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Created: {new Date(portfolio.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => loadPortfolio(portfolio)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deletePortfolio(portfolio.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <button
                  onClick={() => setShowLoadDialog(false)}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Popular Securities Recommendations */}
        {!results && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">🚀 Quick Start</h2>
              <p className="text-gray-600">Not sure where to begin? Try these popular securities to get started with your portfolio analysis!</p>
            </div>
            
            {Object.entries(recommendationCategories).map(([categoryName, categorySecurities]) => (
              <div key={categoryName} className="mb-6 last:mb-0">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {categoryName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorySecurities.map((symbol) => {
                    const recommendation = popularRecommendations.find(r => r.symbol === symbol);
                    if (!recommendation) return null;
                    
                    const isAlreadyAdded = securities.some(s => s.symbol.toLowerCase() === recommendation.symbol.toLowerCase());
                    
                    return (
                      <button
                        key={recommendation.symbol}
                        onClick={() => !isAlreadyAdded && addRecommendedSecurity(recommendation)}
                        disabled={isAlreadyAdded}
                        className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                          isAlreadyAdded 
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' 
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-800 text-sm">{recommendation.symbol}</span>
                          {isAlreadyAdded && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Added</span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-700 text-sm mb-1 line-clamp-1">{recommendation.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">{recommendation.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                💡 <strong>Tip:</strong> Click any security above to add it to your portfolio, then set your contribution amount and analyze!
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
                    <p className="text-2xl font-bold text-green-600">${results.portfolio.totalValue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Gain</p>
                    <p className="text-2xl font-bold text-blue-600">${results.portfolio.totalGain.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Annualized Return</p>
                    <p className="text-2xl font-bold text-purple-600">{(results.portfolio.annualizedReturn * 100).toFixed(1)}%</p>
                  </div>
                  <Percent className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Growth Chart */}
            {growthChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Growth Over Time</h3>
                
                {/* Interactive Legend */}
                <div className="mb-4">
                  {/* Primary chart lines */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={() => toggleLineVisibility('contributions')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
                        visibleLines.contributions ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Principal
                    </button>
                    
                    <button
                      onClick={() => toggleLineVisibility('portfolio')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
                        visibleLines.portfolio ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      Total Portfolio
                    </button>
                    
                    <button
                      onClick={() => toggleLineVisibility('sp500')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
                        visibleLines.sp500 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      S&P 500
                    </button>
                  </div>

                  {/* Individual securities (expandable) */}
                  {results && results.securities && results.securities.length > 1 && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-500 mb-2">Individual Securities (click to show):</p>
                      <div className="flex flex-wrap gap-2">
                        {results.securities.map((security, index) => {
                          const key = `security_${security.symbol}`;
                          const colors = [
                            'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 
                            'bg-orange-500', 'bg-teal-500', 'bg-red-500',
                            'bg-emerald-500', 'bg-cyan-500', 'bg-lime-500'
                          ];
                          const colorClass = colors[index % colors.length];
                          const isVisible = visibleLines[key];
                          
                          return (
                            <button
                              key={key}
                              onClick={() => toggleLineVisibility(key)}
                              className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs ${
                                isVisible 
                                  ? `bg-opacity-20 text-gray-800 ${colorClass.replace('bg-', 'bg-').replace('-500', '-100')}` 
                                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${isVisible ? colorClass : 'bg-gray-300'}`}></div>
                              {security.symbol}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={320} className="sm:h-96">
                  <LineChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -10 }} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value, name) => {
                        let displayName = name;
                        if (name === 'contributions') displayName = 'Principal';
                        else if (name === 'portfolio') displayName = 'Total Portfolio';
                        else if (name === 'sp500') displayName = 'S&P 500';
                        else if (name.startsWith('security_')) {
                          displayName = name.replace('security_', '');
                        }
                        
                        return [
                          `$${parseInt(value).toLocaleString()}`, 
                          displayName
                        ];
                      }}
                      labelFormatter={(year) => `Year ${year}`}
                    />
                    
                    {visibleLines.contributions && (
                      <Line type="monotone" dataKey="contributions" stroke="#ffc658" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    )}
                    
                    {visibleLines.portfolio && (
                      <Line type="monotone" dataKey="portfolio" stroke="#1f77b4" strokeWidth={3} dot={false} />
                    )}
                    
                    {visibleLines.sp500 && (
                      <Line type="monotone" dataKey="sp500" stroke="#2ca02c" strokeWidth={2} dot={false} />
                    )}

                    {/* Individual security lines */}
                    {results && results.securities.map((security, index) => {
                      const key = `security_${security.symbol}`;
                      const colors = [
                        '#8b5cf6', '#ec4899', '#6366f1', '#f59e0b', 
                        '#14b8a6', '#ef4444', '#10b981', '#06b6d4', '#84cc16'
                      ];
                      const strokeColor = colors[index % colors.length];
                      
                      return visibleLines[key] && (
                        <Line 
                          key={key}
                          type="monotone" 
                          dataKey={key} 
                          stroke={strokeColor} 
                          strokeWidth={2} 
                          strokeDasharray="3 3"
                          dot={false} 
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Performance Table */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Performance & Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Security</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Analysis</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gain</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.securities.map((security, index) => (
                      <tr key={index}>
                        <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{security.symbol}</span>
                              {security.data.isRealData ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  LIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {security.data.companyName && security.data.companyName !== security.symbol ? 
                                security.data.companyName : ''
                              }
                              {security.data.sector && security.data.sector !== 'Unknown' ? 
                                ` • ${security.data.sector}` : ''
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span>${security.data.currentPrice.toFixed(2)}</span>
                            {security.data.analystTarget && (
                              <span className="text-xs text-blue-600">
                                Target: ${security.data.analystTarget.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {(security.data.expectedAnnualReturn * 100).toFixed(1)}%
                            </span>
                            {security.data.confidence && (
                              <span className={`text-xs ${
                                security.data.confidence === 'high' ? 'text-green-600' :
                                security.data.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {security.data.confidence} confidence
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                          <div className="flex flex-col">
                            <span className="capitalize">
                              {security.data.analysisMethod ? 
                                security.data.analysisMethod.replace(/_/g, ' ') : 
                                'Basic'
                              }
                            </span>
                            {security.data.dataQuality && (
                              <span className={`text-xs ${
                                security.data.dataQuality === 'high' ? 'text-green-600' :
                                security.data.dataQuality === 'medium' ? 'text-yellow-600' : 'text-gray-500'
                              }`}>
                                {security.data.dataQuality} quality
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">${security.projectedValue.toLocaleString()}</td>
                        <td className={`px-3 sm:px-6 py-4 text-sm ${security.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${security.gain.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Allocation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Status Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>🚀 Ready for Vercel Deployment:</strong> This app will use serverless functions for live market data. 
            LIVE badges show real data, DEMO badges show simulated data when APIs are unavailable.
            <br />
            <strong>Next Steps:</strong> Deploy to Vercel with serverless API functions for real Alpha Vantage integration!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioAnalyzer;