import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import metaRouter from './routes/metaRoute.js';
import aiRouter from './routes/aiRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';
const app = express();
//Allow multiple origins
const port = process.env.PORT || 4000;

await connectDB()

await connectCloudinary()

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const allowedOriginSuffixes = (process.env.ALLOWED_ORIGIN_SUFFIXES || '')
    .split(',')
    .map((suffix) => suffix.trim())
    .filter(Boolean);

app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks)
//Middleware configuration

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        const normalizedOrigin = normalizeOrigin(origin || '');
        const hasAllowedSuffix = allowedOriginSuffixes.some(
            (suffix) => normalizedOrigin.endsWith(suffix),
        );

        if (!origin || allowedOrigins.includes(normalizedOrigin) || hasAllowedSuffix) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));


app.get('/', (req, res) => res.send('API is Working'));
app.use('/api/user', userRouter)
app.use('/api/seller', sellerRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/address', addressRouter)
app.use('/api/order', orderRouter)
app.use('/api/meta', metaRouter)
app.use('/api/ai', aiRouter)

app.listen(port, ()=> {
    console.log(`Server is running on http://localhost:${port}`)
})
