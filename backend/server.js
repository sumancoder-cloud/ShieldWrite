const express=require('express');
require('dotenv').config();
const cors=require('cors');
const helmet=require('helmet');
const morgan=require('morgan');
const rateLimit=require('express-rate-limit');
const app=express();
const connectDB=require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const authRoutes=require('./src/routes/auth.Routes');
const blogRoutes=require('./src/routes/blog.Routes');
const commentRoutes=require('./src/routes/comment.Routes');

app.set('trust proxy',1);

app.use(helmet());
app.use(cors({
    origin:process.env.CORS_ORIGIN || '*'
}));
app.use(morgan('dev'));
app.use(express.json());

const globalLimiter=rateLimit({
    windowMs:Number(process.env.RATE_LIMIT_WINDOW_MS || 15*60*1000),
    max:Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300),
    standardHeaders:true,
    legacyHeaders:false,
    message:{
        success:false,
        message:'Too many requests, please try again later.'
    }
});

app.use('/api',globalLimiter);

app.use('/api/auth',authRoutes);
app.use('/api/blogs',blogRoutes);
app.use('/api/comments',commentRoutes);
const PORT=process.env.PORT || 3000;

app.get('/',(req,res)=>{
    res.status(200).json({
        message:'ShieldWrite backend is running'
    });
});

app.use((req,res)=>{
    return res.status(404).json({
        success:false,
        message:'Route not found'
    });
});

app.use((error,req,res,next)=>{
    console.error(error);
    return res.status(500).json({
        success:false,
        message:'Unhandled server error'
    });
});

const startServer=async()=>{
    try{
        await connectDB();
        await connectRedis();
        app.listen(PORT,()=>{
            console.log(`Server is running on port ${PORT}`);
        });
    }catch(error){
        console.error('Server failed to start:',error.message);
        process.exit(1);
    }
};

startServer();