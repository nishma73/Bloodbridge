require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const { seedDatabase } = require('./utils/seedData');

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging in non-test environment
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'BloodBridge API Server',
    version: '1.0.0',
    description: 'REST API connecting blood donors, hospitals, and blood banks.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      donors: '/api/donors',
      hospitals: '/api/hospitals',
      requests: '/api/requests',
      responses: '/api/responses',
      admin: '/api/admin',
      notifications: '/api/notifications',
    },
  });
});

// Mount API routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server = null;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is empty (for instant college demo readiness)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[BloodBridge] Database is empty. Running initial sample seed...');
      await seedDatabase();
    }

    server = app.listen(PORT, () => {
      console.log(`[BloodBridge] REST API server listening on http://localhost:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error(`[BloodBridge] Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
