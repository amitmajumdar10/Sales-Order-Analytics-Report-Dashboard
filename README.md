# Sales Order Dashboard

A comprehensive sales analytics dashboard for Salesforce B2C Commerce Cloud order data analysis, built with React and Express.js that provides real-time insights into order data with advanced filtering capabilities. Under the hood, the application uses Salesforce B2C Commerce Cloud APIs to pull order data from a Salesforce B2C Commerce Instance.

**Note:** This dashboard is designed for custom analytics and is not a replacement for CCAC (Reports and Dashboards).

## Features

- **📊 Interactive Dashboard**: Real-time sales metrics with beautiful charts and KPIs
- **📅 Date Range Filtering**: Select custom date ranges to analyze specific periods
- **🏷️ Order Type Filtering**: Filter between Prepaid and Postpaid orders
- **💳 Payment Method Filtering**: Analyze orders by specific payment methods
- **🌍 Environment Switching**: Switch between Development and Production environments
- **📈 Visual Analytics**: Line charts for daily trends and bar charts for customer segmentation
- **🔄 Automatic Pagination**: Handles large datasets by automatically fetching all orders
- **⚡ Real-time Updates**: Dashboard updates automatically when filters change
- **💾 In-Memory Caching**: Caches API responses for 30 minutes to improve performance and reduce API calls
- **🛡️ Error Handling**: Graceful error handling with user-friendly messages

## Tech Stack

### Frontend
- **React 19.1.1** - Modern UI framework
- **Chart.js 4.5.0** - Interactive charts and visualizations
- **Axios 1.11.0** - HTTP client for API calls
- **CSS3** - Custom styling and responsive design

### Backend
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **Axios 1.11.0** - External API integration
- **CORS 2.8.5** - Cross-origin resource sharing
- **dotenv 17.2.1** - Environment variable management
- **node-cache 5.1.2** - In-memory caching for API responses

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Access to Salesforce B2C Commerce Cloud APIs (requires environment variables)
- Valid Salesforce B2C Commerce Instance with order data

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sales-dashboard
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Environment Setup
Create a `.env` file in the `backend` directory with Salesforce B2C Commerce Cloud environment-specific configurations:
```env
# Development Environment Configuration (Salesforce B2C Commerce Cloud)
API_BASE_URL_DEV=https://your-dev-instance.demandware.net
CLIENT_ID_DEV=your_dev_client_id_here
AUTH_HEADER_DEV=Basic your_dev_auth_header_here

# Production Environment Configuration (Salesforce B2C Commerce Cloud)
API_BASE_URL_PRD=https://your-prod-instance.demandware.net
CLIENT_ID_PRD=your_prod_client_id_here
AUTH_HEADER_PRD=Basic your_prod_auth_header_here
```

### 4. Start the Application
```bash
npm start
```

This single command will start both the backend server (port 3001) and frontend development server (port 3000).

## Available Scripts

### Root Level Commands
- `npm start` - Start both frontend and backend in production mode
- `npm run dev` - Start both services in development mode (with nodemon for backend)
- `npm run install:all` - Install dependencies for root, backend, and frontend
- `npm run build` - Build the frontend for production
- `npm run start:backend` - Start only the backend server
- `npm run start:frontend` - Start only the frontend server

### Individual Service Commands

#### Backend (in `/backend` directory)
- `npm start` - Start the Express server
- `npm run dev` - Start with nodemon for auto-restart on changes

#### Frontend (in `/frontend` directory)
- `npm start` - Start the React development server
- `npm run build` - Create production build
- `npm test` - Run tests

## Application Structure

```
sales-dashboard/
├── backend/                 # Express.js backend
│   ├── server.js           # Main server file with API endpoints
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables (create this)
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styling
│   │   └── index.js       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── package.json           # Root package.json with scripts
└── README.md             # This file
```

## API Endpoints

### POST `/api/orders`
Fetches and processes order data from Salesforce B2C Commerce Cloud based on filters. Responses are cached in-memory for 30 minutes to improve performance and reduce external API calls to the Commerce Cloud instance.

**Request Body:**
```json
{
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T23:59:59.999Z",
  "orderType": "Prepaid",
  "paymentMethod": "COD",
  "environment": "DEV"
}
```

**Response:**
```json
{
  "dailyMetrics": {
    "2025-01-01": {
      "orders": 150,
      "revenue": 45000,
      "units": 300
    }
  },
  "customerBreakdown": {
    "new": 75,
    "returning": 75,
    "registered": 100,
    "unregistered": 50
  },
  "kpis": {
    "totalOrders": 150,
    "totalRevenue": 45000,
    "totalUnits": 300,
    "avgOrderValue": 300,
    "avgUnitsPerTransaction": 2
  }
}
```

### GET `/api/cache/stats`
Returns cache statistics including total keys, cache hits/misses, and current cached keys.

**Response:**
```json
{
  "stats": {
    "keys": 3,
    "hits": 15,
    "misses": 8,
    "ksize": 3,
    "vsize": 3
  },
  "totalKeys": 3,
  "keys": ["orders_DEV_Prepaid_2025-01-01_2025-01-31"],
  "message": "Cache statistics retrieved successfully"
}
```

### DELETE `/api/cache/clear`
Clears all cached entries.

**Response:**
```json
{
  "message": "Cache cleared successfully. Removed 3 entries.",
  "clearedKeys": 3
}
```

### DELETE `/api/cache/clear/:key`
Clears a specific cache entry by key.

**Response:**
```json
{
  "message": "Cache entry for key 'orders_DEV_Prepaid_2025-01-01_2025-01-31' cleared successfully.",
  "deleted": true
}
```

## Filter Options

### Order Types
- **Prepaid**: Prepaid service orders
- **Postpaid**: Postpaid service orders

### Payment Methods
- `CHARGE_TO_BILL` - Bill-based charging
- `CHARGE_TO_LOAD` - Load-based charging  
- `COD` - Cash on Delivery
- `Home_Credit` - Home credit payments
- `Credit_Card_Instalment` - Credit card installments
- `Maya` - Maya digital wallet
- `PayLater` - Pay later services
- `Prepaid_MNP_Free` - Free prepaid MNP

## Key Features Explained

### In-Memory Caching
The application uses node-cache to implement intelligent caching of Salesforce B2C Commerce Cloud API responses:
- **Cache Duration**: Responses are cached for 30 minutes (configurable)
- **Cache Keys**: Generated based on request parameters (environment, order type, date range)
- **Performance**: Subsequent identical requests return instantly from cache, reducing load on Commerce Cloud
- **Memory Management**: Automatic cleanup of expired entries every minute
- **Cache Management**: Built-in endpoints to monitor and clear cache when needed

### Automatic Pagination
The backend automatically handles pagination when the Salesforce B2C Commerce Cloud API returns more than 200 orders, making multiple requests to fetch all data for the selected date range.

### Real-time Filtering
Orders are filtered client-side after fetching to provide instant results when changing payment methods, while maintaining server-side filtering for order types and date ranges.

### Error Handling
- **Network Errors**: Graceful handling of Salesforce B2C Commerce Cloud API failures
- **Invalid Dates**: Validation of date range inputs  
- **No Data**: User-friendly messages when no orders match filters
- **Persistent UI**: Input controls remain accessible during error states

### Responsive Design
The dashboard is fully responsive and works on desktop, tablet, and mobile devices.

## Salesforce B2C Commerce Cloud Integration

This dashboard integrates directly with Salesforce B2C Commerce Cloud APIs to provide custom analytics capabilities:

### API Integration
- Uses Salesforce B2C Commerce Cloud Order Search API (`/dw/shop/v24_5/order_search`)
- Supports both Development and Production Commerce Cloud instances
- Implements OAuth 2.0 authentication for secure API access
- Handles Commerce Cloud API rate limits through intelligent caching

### Relationship with CCAC
- **Complementary Tool**: This dashboard is designed to complement, not replace, CCAC (Reports and Dashboards)
- **Custom Analytics**: Provides specialized views and filtering options not available in standard CCAC reports
- **Real-time Data**: Offers near real-time order analysis with custom date ranges and filters
- **Enhanced Visualization**: Features interactive charts and KPIs tailored for specific business needs

### Use Cases
- Custom order analysis beyond standard CCAC capabilities
- Real-time monitoring of order trends and patterns
- Specialized filtering by payment methods and order types
- Cross-environment order data comparison (DEV vs PRD)

## Development

### Adding New Payment Methods
1. Add the new option to the frontend dropdown in `App.js`
2. The backend will automatically handle the new payment method ID

### Adding New Filters
1. Add state management in `App.js`
2. Update the API call to include the new parameter
3. Modify the backend to accept and process the new filter
4. Update the `processOrderData` function if needed

### Customizing Charts
Charts are built with Chart.js and can be customized by modifying the chart configuration objects in `App.js`.

## Troubleshooting

### Common Issues

**Backend server won't start:**
- Check that the `.env` file exists in the `backend` directory
- Verify all required environment variables are set
- Ensure port 3001 is not already in use

**Frontend can't connect to backend:**
- Verify the backend is running on port 3001
- Check for CORS issues in browser console
- Ensure the API URL in `App.js` matches the backend port

**No data showing:**
- Check the date range (ensure it includes orders)
- Verify the selected filters aren't too restrictive
- Check browser console for API errors
- Try clearing the cache using `DELETE /api/cache/clear` if data seems stale

### Logs
- Backend logs are visible in the terminal running the backend server
- Frontend logs are available in the browser's developer console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
