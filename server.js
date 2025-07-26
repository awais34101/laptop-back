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

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';
const PORT = process.env.PORT || 8000;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

// ✅ Clean MongoDB log (no null warning)
if (MONGO_URI.includes('@')) {
  const cleanedUri = MONGO_URI.replace(/\/\/.*?:.*?@/, '//<user>:<pass>@');
  console.log('✅ Connecting to MongoDB at:', cleanedUri);
} else {
  console.log('✅ Connecting to MongoDB at:', MONGO_URI);
}

// ✅ CORS: Allow both localhost + Vercel domains
const allowedOrigins = [
  'http://localhost:3000',
  'https://salat-fronted.vercel.app',
  'https://salat-fronted-muhammad-awais-s-projects-bf5a0371.vercel.app'
];

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));

app.use(express.json());

// API Routes
import technicianAssignmentRoutes from './routes/technicianAssignmentRoutes.js';
import technicianSelfRoutes from './routes/technicianSelfRoutes.js';
app.use('/api/items', itemRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/store', storeRoutes);
import store2Routes from './routes/store2Routes.js';
import saleStore2Routes from './routes/saleStore2Routes.js';
app.use('/api/store2', store2Routes);
app.use('/api/sales-store2', saleStore2Routes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/technician-stats', technicianStatsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/technician-assignments', technicianAssignmentRoutes);
app.use('/api/technician-self', technicianSelfRoutes);

// Error handler
import errorHandler from './middleware/errorHandler.js';
app.use(errorHandler);

// Connect to DB + Start server
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
