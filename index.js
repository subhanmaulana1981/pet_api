/* environments */
require('dotenv').config();

/* requirements */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const petRoutes = require('./routes/pet.routes');

/* application */
const app = express();
const port = process.env.PORT || 3000;

/* middleware */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/* health / root route */
app.get('/', (req, res) => {
  console.log(req.method, req.originalUrl);
  res.status(200).json({
    status: 'ok',
    message: 'Pet REST API is up and running',
    endpoints: {
      pets: '/api/pets'
    }
  });
});

/* api routes */
app.use('/api/pets', petRoutes);

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

/* error handling middleware */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const details = err.errors ? Object.values(err.errors).map((e) => e.message) : [];
    message = details.length > 0 ? details.join(', ') : err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  res.status(statusCode).json({
    success: false,
    message
  });
});

/* database connection string */
const mongoURI =
  process.env.MONGODB_URI ||
  `mongodb://${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'petdb'}`;

/* connect and start server */
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    app.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('👉 Make sure MongoDB is running. On Windows, run: net start MongoDB (as Admin)');
    process.exit(1);
  });
