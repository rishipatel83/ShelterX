import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authroutes.js';
import simulationRoutes from './routes/simulationroutes.js';
import nistRoutes from './routes/nistroutes.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'sih-backend',
        uptime: process.uptime()
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sih', simulationRoutes);
app.use('/api/v1/nist', nistRoutes);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Backend server active on port ${PORT}`);
    });
}

export default app;