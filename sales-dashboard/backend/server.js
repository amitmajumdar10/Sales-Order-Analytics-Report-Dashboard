// server.js in the 'backend' folder

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // Port for our backend server

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Allow the server to parse JSON request bodies

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Sales Dashboard API is running',
        timestamp: new Date().toISOString()
    });
});

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
        const { startDate, endDate, orderType, environment } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required.' });
        }
        
        // Default to 'Prepaid' if orderType is not provided
        const selectedOrderType = orderType || 'Prepaid';
        
        // Default to 'DEV' if environment is not provided
        const selectedEnvironment = environment || 'DEV';
        
        console.log(`🌍 API Request - Environment: ${selectedEnvironment}, OrderType: ${selectedOrderType}`);
        
        // Get environment-specific configuration
        const config = getEnvironmentConfig(selectedEnvironment);

        const token = await getAccessToken(selectedEnvironment);

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
                            "must": [
                                {
                                    "term_query": {
                                        "fields": [
                                            "status"
                                        ],
                                        "operator": "not_in",
                                        "values": [
                                            "created", "failed"
                                        ]
                                    }
                                },
                                {
                                    "term_query": {
                                        "fields": [
                                            "c_smartOrderType"
                                        ],
                                        "operator": "is",
                                        "values": [
                                            selectedOrderType // Dynamic order type from frontend
                                        ]
                                    }
                                }
                            ]
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
        
        // Return raw hits data for client-side processing
        res.json({ hits: allHits });

    } catch (error) {
        console.error("Error in /api/orders:", error.message);
        res.status(500).json({ error: 'Failed to fetch order data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});