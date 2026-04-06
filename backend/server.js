const express=require('express');
require('dotenv').config();
const app=express();
const connectDB=require('./src/config/db')
const signupRoutes=require('./src/routes/signupRoutes')
app.use(express.json());
app.use('/api',signupRoutes);
const PORT=process.env.PORT

app.get('/',(req,res)=>{
    res.status(200).json({
        message:"welcome to the backend part"
    })
})
connectDB();
app.listen(PORT,()=>{
    console.log(`Server is Running on port ${PORT}`)
})