# Portfolio Investment Return Calculator

A sophisticated React-based web application that provides realistic portfolio analysis using live market data from Alpha Vantage API. Calculate investment returns, track portfolio performance, and visualize growth projections with intelligent caching and comprehensive financial modeling.

## Features

### Core Functionality
- **Live Market Data Integration**: Real-time stock quotes, company fundamentals, earnings data, and historical prices
- **Intelligent Expected Return Calculation**: Blended algorithm using analyst targets, earnings growth, and historical performance
- **Portfolio Analysis**: Calculate total returns, gains, and annualized performance across multiple securities
- **Interactive Visualization**: Charts showing portfolio growth with individual security breakdowns
- **Flexible Investment Frequencies**: Weekly, biweekly, semi-monthly, monthly, quarterly, semi-annual, and yearly contributions

### Advanced Features
- **500+ Securities Support**: Comprehensive database of popular stocks and ETFs
- **Intelligent Caching System**: Persistent cache with manual refresh to optimize API usage
- **Multiple Calculation Methods**: Fallback hierarchy for robust expected return estimates
- **Data Quality Assessment**: Real-time evaluation of data completeness and reliability
- **Rate Limit Protection**: Built-in safeguards to prevent API quota exhaustion

## Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: TailwindCSS for responsive, modern UI design
- **Charting**: Recharts for interactive financial visualizations
- **State Management**: React hooks (useState, useRef, useEffect)

### Backend (Vercel Serverless Functions)
- **Runtime**: Node.js serverless functions
- **API Provider**: Alpha Vantage for financial market data
- **File System**: Local JSON caching with persistent storage
- **CORS**: Full cross-origin support for frontend integration

## API Endpoints

### `/api/stock-comprehensive`
**Primary endpoint for detailed stock analysis**
- **Method**: GET
- **Parameters**: `symbol` (required)
- **Returns**: Comprehensive stock data with calculated expected returns
- **Data Sources**: 
  - Global Quote (real-time price)
  - Company Overview (fundamentals, analyst targets)
  - Earnings History (annual and quarterly)
  - Monthly Time Series (3+ years historical prices)

### `/api/cache-refresh`
**Manual cache management**
- **Methods**: POST (refresh), DELETE (clear)
- **Parameters**: 
  - `symbol`: Single security to refresh/clear
  - `symbols`: Array of securities (POST only)
  - `action`: "refresh_all" to update all cached data (POST only)
- **Protection**: Prevents excessive API usage (warns if >20 calls needed)

### `/api/search`
**Security symbol search**
- **Method**: GET
- **Parameters**: `query` (search term)
- **Returns**: Filtered list of matching securities from 500+ database
- **Features**: Fuzzy matching on symbol and company name

### `/api/stock`
**Simple stock quote (legacy)**
- **Method**: GET  
- **Parameters**: `symbol`
- **Returns**: Basic quote data only
- **Usage**: Lightweight alternative when full analysis not needed

## Expected Return Calculation Algorithm

### Blended Approach (Priority Method)
When analyst target price is available, the system creates a weighted blend:

1. **All Data Available**: 
   - 50% Analyst Target (1-year forward projection)
   - 25% 3-Year EPS CAGR (fundamental growth trend)
   - 25% 3-Year Price CAGR (market performance trend)

2. **Partial Data Available**:
   - **Analyst + EPS**: 60% analyst, 40% EPS trend
   - **Analyst + Historical**: 60% analyst, 40% price trend
   - **Analyst Only**: 100% analyst target

### Fallback Methods (when no analyst target)
3. **2-Year EPS Growth**: Recent vs prior year earnings growth (0.8x discount applied)
4. **1-Year Historical Return**: Price performance over 12 months
5. **Sector-Based Average**: Industry-specific expected returns (Technology: 12%, Healthcare: 10%, etc.)
6. **Default Fallback**: 8% market average

### Validation & Bounds
- **Analyst Returns**: Capped between -50% and +100%
- **EPS Growth**: Capped between -30% and +50% 
- **Historical Returns**: Capped between -50% and +100%
- **Final Result**: Rounded to 4 decimal places

## Caching System

### Design Principles
- **Persistent Storage**: Cache files never auto-expire to preserve API quota
- **Manual Refresh**: Users control when to fetch fresh data
- **Intelligent Logging**: Clear indication of cache age and staleness
- **Rate Limit Protection**: Built-in delays and quota monitoring

### Cache Structure
```
public/data/cache/
├── SYMBOL_comprehensive.json    # Full analysis data
└── SYMBOL.json                  # Basic quote data (legacy)
```

### Cache File Format
```json
{
  "symbol": "AAPL",
  "timestamp": 1756869356939,
  "data": {
    "symbol": "AAPL",
    "quote": { /* Alpha Vantage Global Quote */ },
    "overview": { /* Company fundamentals */ },
    "earnings": { /* Annual & quarterly earnings */ },
    "historical": { /* Monthly time series */ },
    "analysis": {
      "expectedReturn": 0.023,
      "method": "blended_analyst_eps", 
      "confidence": "high",
      "components": { /* Calculation breakdown */ }
    },
    "dataQuality": { /* Completeness score */ }
  }
}
```

### Cache Lifecycle
1. **First Request**: Fetches from Alpha Vantage, calculates returns, saves to cache
2. **Subsequent Requests**: Serves from cache (logs age but always serves)
3. **Manual Refresh**: User-triggered cache clearing and rebuild
4. **Stale Handling**: Cache >24h old flagged as "STALE" but still served

## Alpha Vantage API Integration

### Rate Limiting Strategy
- **Daily Limit**: 25 API calls per day (free tier)
- **Calls per Symbol**: 4 API calls needed for comprehensive analysis
- **Max Symbols per Day**: ~6 symbols for full analysis
- **Protection**: Automatic warnings and blocks to prevent quota exhaustion

### API Call Pattern
```javascript
// Sequential calls with 12-second delays
1. GLOBAL_QUOTE     → Current price data
2. OVERVIEW         → Fundamentals + analyst targets  
3. EARNINGS         → EPS history + quarterly results
4. TIME_SERIES_MONTHLY → 3+ years historical prices
```

### Error Handling
- **Rate Limit Detection**: Automatic detection of quota exceeded messages
- **Graceful Degradation**: System continues with cached/partial data
- **Comprehensive Logging**: Detailed error tracking and debugging info

## Development & Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start development server (for frontend only)
npm run dev

# Start with serverless functions (recommended)
vercel dev
```

### Environment Setup
```bash
# Required: Alpha Vantage API key
echo "ALPHA_VANTAGE_KEY=your_key_here" > .env.local
```

### Build & Deploy
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

## Technical Decisions & Trade-offs

### Why Persistent Caching?
- **API Constraints**: 25 daily calls severely limits real-time updates
- **User Experience**: Immediate responses vs waiting for API calls
- **Cost Management**: Free tier sustainability for prototype/demo usage

### Why Blended Expected Returns?
- **Analyst Bias**: Short-term targets can be overly optimistic/pessimistic
- **Historical Context**: Past performance provides grounding
- **Fundamental Analysis**: EPS trends indicate business health
- **Balanced View**: Multiple perspectives reduce single-point-of-failure

### Why Vercel Serverless?
- **Zero Configuration**: Automatic deployment and scaling
- **Edge Performance**: Global CDN for fast response times
- **Cost Efficiency**: Pay-per-execution model ideal for prototype
- **Environment Management**: Secure API key handling

### Why React + Vite?
- **Development Speed**: Hot reload and fast builds
- **Modern Toolchain**: ES6+ support with minimal configuration
- **Component Reusability**: Modular UI architecture
- **Performance**: Optimized bundle size and loading

## Data Quality & Reliability

### Quality Assessment
Each API response is scored on data completeness:
- **High Quality** (75%+): All 4 data sources available
- **Medium Quality** (50-74%): 2-3 data sources available  
- **Low Quality** (<50%): Limited data, falls back to defaults

### Calculation Confidence Levels
- **High**: Blended methods with multiple data sources
- **Medium**: Single reliable method (analyst target, sector average)
- **Low**: Default fallback values

### Error Recovery
- **Partial Data**: System continues with available information
- **API Failures**: Graceful fallback to cached/default values
- **Invalid Data**: Comprehensive validation and bounds checking

## Security & Best Practices

### API Key Protection
- Environment variables only (`.env.local`)
- No client-side exposure
- Serverless function isolation

### Input Validation
- Symbol format validation (`/^[A-Z.]{1,6}$/`)
- Request method verification
- Parameter sanitization

### Error Handling
- Comprehensive try-catch blocks
- Detailed logging for debugging
- User-friendly error messages

## Future Enhancements

### Potential Improvements
- **Portfolio Optimization**: Modern Portfolio Theory integration
- **Risk Metrics**: Volatility, Sharpe ratio, beta analysis
- **Dividend Modeling**: Separate dividend growth projections
- **Sector Diversification**: Automatic portfolio balancing suggestions
- **Premium API**: Upgrade to remove daily limits
- **Database Storage**: Replace file cache with proper database
- **User Accounts**: Personal portfolio persistence
- **Real-time Updates**: WebSocket integration for live data

### Known Limitations
- **API Quota**: 25 daily calls limit real-time functionality
- **ETF Analysis**: Limited fundamental analysis for index funds
- **International Markets**: US securities only
- **Options/Futures**: Equity securities only
- **Dividend Yield**: Not factored into return calculations
- **Risk Assessment**: No volatility or correlation analysis

---

Built with real market data to provide meaningful portfolio analysis and investment planning insights.
