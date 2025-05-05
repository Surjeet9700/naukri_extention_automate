import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import jobRoutes from './routes/jobRoutes';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure CORS to allow requests from Chrome extension
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Base route
app.get('/', (req, res) => {
  res.send('Naukri Apply Assist API is running');
});

// API routes
app.use('/api', jobRoutes);

// Default route
app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Naukri Apply Assist API is running',
    endpoints: ['/api/matchJobs']
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start the server
const startServer = async () => {
  await connectDB();
  
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

export default app;