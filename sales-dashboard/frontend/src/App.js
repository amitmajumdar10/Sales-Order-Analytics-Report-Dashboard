// App.js in the 'frontend/src' folder

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './App.css';

// Register Chart.js components we will use
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [rawData, setRawData] = useState(null); // Store the complete unfiltered dataset
  const [data, setData] = useState(null); // Store the filtered/processed data for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Default date range to the last 7 days
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString());
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [orderType, setOrderType] = useState('Prepaid'); // Default to Prepaid
  const [paymentMethod, setPaymentMethod] = useState(''); // Default to empty (all payment methods)
  const [environment, setEnvironment] = useState('DEV'); // Default to DEV

  // Client-side function to process and filter order data
  const processOrderData = (hits, paymentMethodFilter) => {
    // Filter orders by payment method if specified
    let filteredHits = hits;
    if (paymentMethodFilter && paymentMethodFilter.trim() !== '') {
      filteredHits = hits.filter(hit => {
        const order = hit.data;
        // Check if order has payment instruments and the first one matches the selected payment method
        return order.payment_instruments && 
               order.payment_instruments.length > 0 && 
               order.payment_instruments[0].payment_method_id === paymentMethodFilter;
      });
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

  // Effect for fetching data from API (excludes paymentMethod from dependencies)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await axios.post(`${apiUrl}/api/orders`, {
          startDate,
          endDate,
          orderType,
          environment,
        });
        setRawData(response.data.hits); // Store the raw hits data for client-side filtering
      } catch (err) {
        setError('Failed to fetch data. Make sure the backend server is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, orderType, environment]); // Refetch data when dates, order type, or environment change (excludes paymentMethod)

  // Effect for client-side filtering when payment method changes
  useEffect(() => {
    if (rawData) {
      const processedData = processOrderData(rawData, paymentMethod);
      setData(processedData);
    }
  }, [rawData, paymentMethod]); // Process data when rawData or paymentMethod changes

  // Get filtered orders for the table
  const getFilteredOrders = () => {
    if (!rawData) return [];
    
    let filteredHits = rawData;
    if (paymentMethod && paymentMethod.trim() !== '') {
      filteredHits = rawData.filter(hit => {
        const order = hit.data;
        return order.payment_instruments && 
               order.payment_instruments.length > 0 && 
               order.payment_instruments[0].payment_method_id === paymentMethod;
      });
    }
    
    return filteredHits.map(hit => hit.data);
  };

  // Prepare data for charts (only if data is available)
  let lineChartData, avgOrderValueChartData, customerBarData;
  
  if (data && data.dailyMetrics) {
    const sortedDates = Object.keys(data.dailyMetrics).sort();

    lineChartData = {
      labels: sortedDates,
      datasets: [
        {
          label: 'Orders',
          data: sortedDates.map(date => data.dailyMetrics[date].orders),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    };

    avgOrderValueChartData = {
        labels: sortedDates,
        datasets: [
            {
                label: 'Average Order Value (₱)',
                data: sortedDates.map(date => {
                    const day = data.dailyMetrics[date];
                    return day.orders > 0 ? (day.revenue / day.orders) : 0;
                }),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }
        ]
    };

    customerBarData = {
        labels: ['New vs. Returning Customers'],
        datasets: [
            {
                label: 'New',
                data: [data.customerBreakdown.new],
                backgroundColor: 'rgb(54, 162, 235)',
            },
            {
                label: 'Returning',
                data: [data.customerBreakdown.returning],
                backgroundColor: 'rgb(255, 205, 86)',
            },
        ],
    };
  }

  return (
    <div className="container">
      <header>
        <div><h1>Sales Order Report & Dashboard</h1></div>
        <div className="date-picker">
          <label>Environment: </label>
          <select value={environment} onChange={e => setEnvironment(e.target.value)}>
            <option value="DEV">DEV</option>
            <option value="PRD">PRD</option>
          </select>
          <label>From: </label>
          <input type="date" value={startDate.split('T')[0]} onChange={e => setStartDate(new Date(e.target.value).toISOString())} />
          <label>To: </label>
          <input type="date" value={endDate.split('T')[0]} onChange={e => setEndDate(new Date(e.target.value).toISOString())} />
          <label>Order Type: </label>
          <select value={orderType} onChange={e => setOrderType(e.target.value)}>
            <option value="Prepaid">Prepaid</option>
            <option value="Postpaid">Postpaid</option>
          </select>
          <label>Payment Method: </label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="">All Payment Methods</option>
            <option value="CHARGE_TO_BILL">CHARGE_TO_BILL</option>
            <option value="CHARGE_TO_LOAD">CHARGE_TO_LOAD</option>
            <option value="COD">COD</option>
            <option value="Home_Credit">Home_Credit</option>
            <option value="Credit_Card_Instalment">Credit_Card_Instalment</option>
            <option value="Maya">Maya</option>
            <option value="PayLater">PayLater</option>
            <option value="Prepaid_MNP_Free">Prepaid_MNP_Free</option>
          </select>
        </div>
      </header>

      {loading && (
        <div className="loading-message">
          <h2>Loading Dashboard...</h2>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h2>Error: {error}</h2>
          <p>Please try selecting different dates or order type.</p>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="no-data-message">
          <h2>No data available.</h2>
          <p>Please try selecting different dates or order type.</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <h2>Total Orders</h2>
              <p>{data.kpis.totalOrders}</p>
            </div>
            <div className="kpi-card">
              <h2>Total Revenue</h2>
              <p>₱{data.kpis.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="kpi-card">
              <h2>Avg. Order Value</h2>
              <p>₱{data.kpis.avgOrderValue.toFixed(2)}</p>
            </div>
             <div className="kpi-card">
              <h2>Avg. Units / Transaction</h2>
              <p>{data.kpis.avgUnitsPerTransaction.toFixed(2)}</p>
            </div>
          </div>

          <div className="chart-grid">
            <div className="chart-card">
              <h3>Orders per Day</h3>
              <Line data={lineChartData} />
            </div>
            <div className="chart-card">
              <h3>Average Order Value per Day</h3>
              <Line data={avgOrderValueChartData} />
            </div>
            <div className="chart-card">
              <h3>Customer Type</h3>
              <Bar data={customerBarData} options={{ indexAxis: 'y' }} />
            </div>
          </div>

          {/* Orders Table */}
          <div className="orders-table-container">
            <h3>Orders Report</h3>
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Payment Method</th>
                    <th>Order Type</th>
                    {orderType !== 'Prepaid' && <th>Optima Cart ID</th>}
                    {/* CSP columns - hidden for Prepaid */}
                    {orderType !== 'Postpaid' && <th>CSP Sales Order Number</th>}
                    {orderType !== 'Postpaid' && <th>CSP SR Summary ID</th>}
                    {orderType !== 'Postpaid' && <th>CSP Submission Status</th>}
                    {orderType !== 'Postpaid' && <th>SR Status</th>}
                    {/* Optima columns - hidden for Postpaid */}
                    {orderType !== 'Prepaid' && <th>Optima Submission Status</th>}
                    {orderType !== 'Prepaid' && <th>Optima Status</th>}
                    {orderType !== 'Prepaid' && <th>Optima SubStatus</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOrders().map((order, index) => (
                    <tr key={order.order_no || index}>
                      <td>{order.order_no || 'N/A'}</td>
                      <td>
                        {order.payment_instruments && order.payment_instruments.length > 0
                          ? order.payment_instruments[0].payment_method_id || 'N/A'
                          : 'N/A'}
                      </td>
                      <td>{order.c_smartOrderType || 'N/A'}</td>
                      {orderType !== 'Prepaid' && <td>{order.c_optimaCartID || 'N/A'}</td>}
                      {/* CSP columns - hidden for Prepaid */}
                      {orderType !== 'Postpaid' && <td>{order.c_salesOrderNoCSP || 'N/A'}</td>}
                      {orderType !== 'Postpaid' && <td>{order.c_srSummaryIdCSP || 'N/A'}</td>}
                      {orderType !== 'Postpaid' && <td>{order.c_submissionStatusCSP || 'N/A'}</td>}
                      {orderType !== 'Postpaid' && <td>{order.c_SRStatus || 'N/A'}</td>}
                      {/* Optima columns - hidden for Postpaid */}
                      {orderType !== 'Prepaid' && <td>{order.c_submissionStatusOptima || 'N/A'}</td>}
                      {orderType !== 'Prepaid' && <td>{order.c_optimaStatus || 'N/A'}</td>}
                      {orderType !== 'Prepaid' && <td>{order.c_optimaSubStatus || 'N/A'}</td>}
                      <td>{order.status || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getFilteredOrders().length === 0 && (
                <div className="no-orders-message">
                  <p>No orders found for the selected criteria.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;