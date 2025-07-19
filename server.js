import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';


import itemRoutes from './routes/itemRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import technicianStatsRoutes from './routes/technicianStatsRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Load .env before anything else
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';
const PORT = process.env.PORT || 8000;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

// For debugging: log only the protocol/host/db, not credentials
try {
  const safeUri = new URL(MONGO_URI);
  safeUri.password = safeUri.username = '';
  console.log('Connecting to MongoDB at:', safeUri.origin + safeUri.pathname);
} catch {
  console.log('Connecting to MongoDB (URI hidden for security)');
}


const app = express();
app.use(cors({
  origin: 'https://salat-frontend.vercel.app',
  credentials: true
}));
app.use(express.json());


// API routes
app.use('/api/items', itemRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/technician-stats', technicianStatsRoutes);
app.use('/api/users', userRoutes);

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
