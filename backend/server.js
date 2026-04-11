const express=require('express');
require('dotenv').config();
const cors=require('cors');
const helmet=require('helmet');
const morgan=require('morgan');
const rateLimit=require('express-rate-limit');
const cookieParser=require('cookie-parser');
const app=express();
const connectDB=require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const authRoutes=require('./src/routes/auth.Routes');
const blogRoutes=require('./src/routes/blog.Routes');
const commentRoutes=require('./src/routes/comment.Routes');
const adminRoutes=require('./src/routes/admin.Routes');
const { ensureSuperAdmin } = require('./src/utils/bootstrapAdmin');
const User=require('./src/models/user.model');
const Blog=require('./src/models/blog.model');
const Comment=require('./src/models/comment.model');

app.set('trust proxy',1);

const allowedOrigins=(process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin)=>origin.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({
    origin:(origin,callback)=>{
        if(!origin){
            return callback(null,true);
        }

        if(allowedOrigins.includes(origin)){
            return callback(null,true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials:true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

const globalLimiter=rateLimit({
    windowMs:Number(process.env.RATE_LIMIT_WINDOW_MS || 60*1000),
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
app.use('/api/admin',adminRoutes);
const PORT=process.env.PORT || 3000;

app.get('/',(req,res)=>{
    res.status(200).json({
        message:'ShieldWrite backend is running'
    });
});

app.get('/api/public/stats',async(req,res)=>{
    try{
        const [writers,articles,comments,admins]=await Promise.all([
            User.countDocuments({ role:'user' }),
            Blog.countDocuments(),
            Comment.countDocuments(),
            User.countDocuments({ role:'admin', adminApproved:true })
        ]);

        return res.status(200).json({
            success:true,
            stats:{
                writers,
                articles,
                comments,
                admins
            }
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Failed to fetch public stats',
            error:error.message
        });
    }
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
        await ensureSuperAdmin();
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