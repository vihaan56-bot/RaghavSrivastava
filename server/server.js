import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initializeDb } from './db.js';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import messagesRoutes from './routes/messages.js';
import uploadRoutes from './routes/uploads.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow local images to display in client
}));

// CORS Configuration
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity, can be locked down
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/uploads', uploadRoutes);

// Fallback to client build in production
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  // If request is for an API endpoint, return 404 instead of sending HTML
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist (e.g. dev mode without build), let Express handle normally
      res.status(404).send('Not Found');
    }
  });
});

// Initialize database files and seed admin then start listening
initializeDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 Server running on port http://localhost:${PORT}`);
      console.log(`📁 Static uploads folder: ${path.join(__dirname, 'uploads')}`);
      console.log(`🔐 Credentials initialized: admin / MaaMaa1234`);
      console.log(`=================================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
