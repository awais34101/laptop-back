import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import itemRoutes from './routes/itemRoutes.js';
import returnStoreRoutes from './routes/returnStoreRoutes.js';
import returnStore2Routes from './routes/returnStore2Routes.js';
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
import technicianAssignmentRoutes from './routes/technicianAssignmentRoutes.js';
import technicianSelfRoutes from './routes/technicianSelfRoutes.js';
import store2Routes from './routes/store2Routes.js';
import saleStore2Routes from './routes/saleStore2Routes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import partRequestRoutes from './routes/partRequestRoutes.js';
import partsInventoryRoutes from './routes/partsInventoryRoutes.js';
import partsPurchaseRoutes from './routes/partsPurchaseRoutes.js';
import partsUsageRoutes from './routes/partsUsageRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import timeRoutes from './routes/timeRoutes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';
const PORT = process.env.PORT || 8000;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

// ✅ Clean log of sensitive parts
if (MONGO_URI.includes('@')) {
  const cleanedUri = MONGO_URI.replace(/\/\/.*?:.*?@/, '//<user>:<pass>@');
  console.log('✅ Connecting to MongoDB at:', cleanedUri);
} else {
  console.log('✅ Connecting to MongoDB at:', MONGO_URI);
}

// ✅ CORS config: Allow Vercel + localhost
const allowedOrigins = [
  'http://localhost:3000',
  'https://laptop-fro.vercel.app' // ✅ Your real frontend
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

// ✅ Routes
app.use('/api/items', itemRoutes);
app.use('/api/returns-store', returnStoreRoutes);
app.use('/api/returns-store2', returnStore2Routes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/store', storeRoutes);
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
app.use('/api/expenses', expenseRoutes);
app.use('/api/parts', partRequestRoutes);
app.use('/api/parts-inventory', partsInventoryRoutes);
app.use('/api/parts-purchases', partsPurchaseRoutes);
app.use('/api/parts-usage', partsUsageRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/time', timeRoutes);

// ✅ Error handler
app.use(errorHandler);

// ✅ Connect to DB + Start server
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
