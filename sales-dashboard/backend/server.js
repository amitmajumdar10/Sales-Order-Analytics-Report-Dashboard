// server.js in the 'backend' folder

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // Port for our backend server

// Initialize cache with TTL of 5 minutes (300 seconds) and check period of 1 minute (60 seconds)
const orderCache = new NodeCache({ 
    stdTTL: 1800, // Cache for 5 minutes
    checkperiod: 60, // Check for expired keys every minute
    useClones: false // For better performance, don't clone objects
});

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Allow the server to parse JSON request bodies

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Health check endpoint for API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Sales Dashboard API is running',
        timestamp: new Date().toISOString()
    });
});

/**
 * Gets field options from environment variables
 * @param {string} fieldKey - The field key (e.g., 'order_type')
 * @returns {Array} - Array of options for the field
 */
const getFieldOptionsFromEnv = (fieldKey) => {
    const envKey = `TERM_QUERY_FIELD_${fieldKey.toUpperCase()}_VALUES`;
    const envValue = process.env[envKey];
    
    if (envValue && envValue.trim() !== '') {
        return envValue.split(',').map(option => option.trim()).filter(option => option !== '');
    }
    
    return []; // Return empty array if no values defined
};

// Get available configurable fields endpoint
app.get('/api/config/fields', (req, res) => {
    try {
        const configurableFields = getConfigurableTermQueryFields();
        
        // Default field labels
        const fieldLabels = {
            order_type: 'Order Type',
            customer_type: 'Customer Type',
            channel: 'Channel',
            region: 'Region',
            store_id: 'Store ID'
        };
        
        const availableFields = {};
        
        // Only include fields that are configured in environment AND have dropdown values
        Object.keys(configurableFields).forEach(fieldKey => {
            const options = getFieldOptionsFromEnv(fieldKey);
            
            // Only include fields that have dropdown options defined
            if (options.length > 0) {
                availableFields[fieldKey] = {
                    apiField: configurableFields[fieldKey],
                    label: fieldLabels[fieldKey] || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    options: options
                };
            } else {
                console.log(`⚠️ Skipping field '${fieldKey}' - no dropdown values defined in TERM_QUERY_FIELD_${fieldKey.toUpperCase()}_VALUES`);
            }
        });
        
        console.log('📋 Returning field configuration:', availableFields);
        
        res.json({
            success: true,
            fields: availableFields,
            message: 'Available configurable fields retrieved successfully'
        });
    } catch (error) {
        console.error('❌ Error getting configurable fields:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to retrieve configurable fields',
            fields: {}
        });
    }
});

/**
 * Gets configurable term query fields from environment variables
 * @returns {Object} - Object containing available term query fields
 */
const getConfigurableTermQueryFields = () => {
    const fields = {};
    
    // Iterate through all environment variables to find TERM_QUERY_FIELD_ prefixed ones
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('TERM_QUERY_FIELD_')) {
            const fieldKey = key.replace('TERM_QUERY_FIELD_', '').toLowerCase();
            const fieldValue = process.env[key];
            if (fieldValue) {
                fields[fieldKey] = fieldValue;
            }
        }
    });
    
    console.log('📋 Configurable Term Query Fields:', fields);
    return fields;
};

/**
 * Builds the bool query must array with configurable term queries
 * @param {Object} requestData - Request data containing filter values
 * @param {Object} configurableFields - Available configurable fields
 * @returns {Array} - Array of term query objects
 */
const buildTermQueries = (requestData, configurableFields) => {
    const termQueries = [];
    
    // Always include the status filter (required)
    termQueries.push({
        "term_query": {
            "fields": ["status"],
            "operator": "not_in",
            "values": ["created", "failed"]
        }
    });
    
    // Add configurable term queries based on request data and available fields
    Object.keys(configurableFields).forEach(fieldKey => {
        const fieldName = configurableFields[fieldKey];
        let fieldValue = null;
        
        // Map request data to field values
        switch (fieldKey) {
            case 'order_type':
                fieldValue = requestData.orderType;
                break;
            case 'customer_type':
                fieldValue = requestData.customerType;
                break;
            case 'channel':
                fieldValue = requestData.channel;
                break;
            case 'region':
                fieldValue = requestData.region;
                break;
            case 'store_id':
                fieldValue = requestData.storeId;
                break;
            default:
                // For any other fields, try to find them in request data
                fieldValue = requestData[fieldKey];
                break;
        }
        
        // Add term query if field value is provided
        if (fieldValue && fieldValue.trim() !== '') {
            termQueries.push({
                "term_query": {
                    "fields": [fieldName],
                    "operator": "is",
                    "values": [fieldValue]
                }
            });
        }
    });
    
    return termQueries;
};

/**
 * Generates a cache key based on request parameters
 * @param {string} startDate - Start date for the query
 * @param {string} endDate - End date for the query
 * @param {Object} requestData - All request data for generating unique cache key
 * @param {string} environment - Environment (DEV/PRD)
 * @returns {string} - Cache key
 */
const generateCacheKey = (startDate, endDate, requestData, environment) => {
    // Create a sorted string of all filter values for consistent cache keys
    const filterValues = Object.keys(requestData)
        .sort()
        .map(key => `${key}:${requestData[key] || ''}`)
        .join('_');
    
    return `orders_${environment}_${startDate}_${endDate}_${filterValues}`;
};

// --- In-memory cache for environment-specific access tokens ---
const tokenCache = {
    DEV: {
        accessToken: null,
        tokenExpiresAt: null
    },
    PRD: {
        accessToken: null,
        tokenExpiresAt: null
    }
};

/**
 * Gets environment-specific configuration
 * @param {string} environment - 'DEV' or 'PROD'
 * @returns {Object} - Environment-specific config
 */
const getEnvironmentConfig = (environment) => {
    const env = environment || 'DEV';
    const prefix = env.toUpperCase();
    
    const config = {
        apiBaseUrl: process.env[`API_BASE_URL_${prefix}`],
        clientId: process.env[`CLIENT_ID_${prefix}`],
        authHeader: process.env[`AUTH_HEADER_${prefix}`]
    };
    
    console.log(`🔧 Environment Config - Environment: ${env}, Prefix: ${prefix}`);
    console.log(`📋 Config Status - API URL: ${config.apiBaseUrl ? 'SET' : 'NOT SET'}, Client ID: ${config.clientId ? 'SET' : 'NOT SET'}, Auth Header: ${config.authHeader ? 'SET' : 'NOT SET'}`);
    
    return config;
};

/**
 * Fetches a new access token if the current one is invalid or expired.
 * @param {string} environment - 'DEV' or 'PRD'
 */
const getAccessToken = async (environment) => {
    const env = environment || 'DEV';
    const cacheKey = env.toUpperCase();
    
    const envCache = tokenCache[cacheKey];
    
    // If we have a valid token for this environment, return it
    if (envCache.accessToken && envCache.tokenExpiresAt && new Date() < envCache.tokenExpiresAt) {
        console.log(`🔑 Using cached access token for ${cacheKey} environment.`);
        return envCache.accessToken;
    }

    console.log(`🔄 Fetching a new access token for ${cacheKey} environment...`);
    try {
        const config = getEnvironmentConfig(env);
        const params = new URLSearchParams();
        params.append('grant_type', 'urn:demandware:params:oauth:grant-type:client-id:dwsid:dwsecuretoken');

        const response = await axios.post(
            `${config.apiBaseUrl}/dw/oauth2/access_token?client_id=${config.clientId}`,
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': config.authHeader,
                },
            }
        );

        const { access_token, expires_in } = response.data;
        
        // Cache the token for this specific environment
        envCache.accessToken = access_token;
        // Set expiry time to be 60 seconds before it actually expires, for safety
        envCache.tokenExpiresAt = new Date(new Date().getTime() + (expires_in - 60) * 1000);

        console.log(`✅ Successfully fetched and cached new token for ${cacheKey} environment.`);
        return envCache.accessToken;
    } catch (error) {
        console.error(`❌ Error fetching access token for ${cacheKey} environment:`, error.response ? error.response.data : error.message);
        throw new Error(`Could not retrieve access token for ${cacheKey} environment.`);
    }
};

/**
 * Processes raw order data into a format suitable for the dashboard.
 * @param {Array} hits - The array of order hits from the API response.
 * @param {string} paymentMethod - Optional payment method filter.
 * @returns {Object} - Processed data for the dashboard.
 */
const processOrderData = (hits, paymentMethod) => {
    // Filter orders by payment method if specified
    let filteredHits = hits;
    if (paymentMethod && paymentMethod.trim() !== '') {
        filteredHits = hits.filter(hit => {
            const order = hit.data;
            // Check if order has payment instruments and the first one matches the selected payment method
            return order.payment_instruments && 
                   order.payment_instruments.length > 0 && 
                   order.payment_instruments[0].payment_method_id === paymentMethod;
        });
        console.log(`Filtered ${filteredHits.length} orders out of ${hits.length} for payment method: ${paymentMethod}`);
    }
    const dailyMetrics = {};
    const customerBreakdown = { new: 0, returning: 0, registered: 0, unregistered: 0 };
    let totalOrders = filteredHits.length;
    let totalRevenue = 0;
    let totalUnits = 0;

    filteredHits.forEach(hit => {
        const order = hit.data;
        const date = order.creation_date.split('T')[0]; // Get YYYY-MM-DD

        // Initialize date entry if it doesn't exist
        if (!dailyMetrics[date]) {
            dailyMetrics[date] = { orders: 0, revenue: 0, units: 0 };
        }

        // Aggregate daily metrics
        dailyMetrics[date].orders += 1;
        dailyMetrics[date].revenue += order.order_total;
        const orderUnits = order.product_items.reduce((sum, item) => sum + item.quantity, 0);
        dailyMetrics[date].units += orderUnits;

        // Aggregate totals
        totalRevenue += order.order_total;
        totalUnits += orderUnits;

        // Customer segmentation (based on 'guest' flag)
        if (order.guest) {
            customerBreakdown.new += 1; // Assuming 'guest' means 'new'
            customerBreakdown.unregistered += 1;
        } else {
            customerBreakdown.returning += 1; // Assuming not 'guest' means 'returning'
            customerBreakdown.registered += 1;
        }
    });

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgUnitsPerTransaction = totalOrders > 0 ? totalUnits / totalOrders : 0;

    return {
        dailyMetrics,
        customerBreakdown,
        kpis: {
            totalOrders,
            totalRevenue,
            totalUnits,
            avgOrderValue,
            avgUnitsPerTransaction,
        },
    };
};

// --- API Endpoint for the Frontend ---
app.post('/api/orders', async (req, res) => {
    try {
        const { startDate, endDate, environment, ...otherFilters } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required.' });
        }
        
        // Default to 'DEV' if environment is not provided
        const selectedEnvironment = environment || 'DEV';
        
        // Prepare request data for processing
        const requestData = {
            orderType: otherFilters.orderType || 'Prepaid', // Default to Prepaid
            ...otherFilters
        };
        
        console.log(`🌍 API Request - Environment: ${selectedEnvironment}, Filters:`, requestData);
        
        // Get configurable term query fields
        const configurableFields = getConfigurableTermQueryFields();
        
        // Generate cache key for this request
        const cacheKey = generateCacheKey(startDate, endDate, requestData, selectedEnvironment);
        
        // Check if data exists in cache
        const cachedData = orderCache.get(cacheKey);
        if (cachedData) {
            console.log(`💾 Cache HIT - Returning cached data for key: ${cacheKey}`);
            return res.json(cachedData);
        }
        
        console.log(`🔍 Cache MISS - Fetching fresh data for key: ${cacheKey}`);
        
        // Get environment-specific configuration
        const config = getEnvironmentConfig(selectedEnvironment);

        const token = await getAccessToken(selectedEnvironment);
        
        // Build dynamic term queries based on configuration and request data
        const termQueries = buildTermQueries(requestData, configurableFields);

        const orderSearchPayload = {
            "query": {
                "filtered_query": {
                    "filter": {
                        "range_filter": {
                            "field": "creation_date",
                            "from": startDate,
                            "to": endDate
                        }
                    },
                    "query": {
                        "bool_query": {
                            "must": termQueries
                        }
                    }
                }
            },
            "count": 200,
            "start": 0,
            "select": "(**)",
            "sorts": [
                {
                    "field": "last_modified",
                    "sort_order": "desc"
                }
            ]
        };

        // Fetch all orders with pagination
        let allHits = [];
        let start = 0;
        let total = 0;
        
        do {
            // Update the start parameter for pagination
            orderSearchPayload.start = start;
            
            const response = await axios.post(
                `${config.apiBaseUrl}/dw/shop/v24_5/order_search`,
                orderSearchPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const responseData = response.data;
            console.log(`Fetched ${responseData.hits.length} orders, start: ${start}, total: ${responseData.total}`);
            
            // Add current batch of hits to our collection
            allHits = allHits.concat(responseData.hits);
            
            // Update total and start for next iteration
            total = responseData.total;
            start += responseData.hits.length;
            
        } while (start < total && allHits.length < total);

        console.log(`Total orders fetched: ${allHits.length} out of ${total}`);
        
        // Prepare response data
        const responseData = { hits: allHits };
        
        // Cache the response data
        orderCache.set(cacheKey, responseData);
        console.log(`💾 Data cached successfully for key: ${cacheKey}`);
        
        // Return raw hits data for client-side processing
        res.json(responseData);

    } catch (error) {
        console.error("Error in /api/orders:", error.message);
        res.status(500).json({ error: 'Failed to fetch order data.' });
    }
});

// --- Cache Management Endpoints ---

// Get cache statistics
app.get('/api/cache/stats', (req, res) => {
    const stats = orderCache.getStats();
    const keys = orderCache.keys();
    
    res.json({
        stats,
        totalKeys: keys.length,
        keys: keys,
        message: 'Cache statistics retrieved successfully'
    });
});

// Clear all cache
app.delete('/api/cache/clear', (req, res) => {
    const keyCount = orderCache.keys().length;
    orderCache.flushAll();
    
    console.log(`🗑️ Cache cleared - Removed ${keyCount} cached entries`);
    res.json({
        message: `Cache cleared successfully. Removed ${keyCount} entries.`,
        clearedKeys: keyCount
    });
});

// Clear specific cache entry
app.delete('/api/cache/clear/:key', (req, res) => {
    const key = req.params.key;
    const deleted = orderCache.del(key);
    
    if (deleted) {
        console.log(`🗑️ Cache entry deleted - Key: ${key}`);
        res.json({
            message: `Cache entry for key '${key}' cleared successfully.`,
            deleted: true
        });
    } else {
        res.status(404).json({
            message: `Cache entry for key '${key}' not found.`,
            deleted: false
        });
    }
});

// Catch-all handler: send back React's index.html file for any non-API routes
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});