const mongoose=require('mongoose');

const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI,{
            serverSelectionTimeoutMS:5000
        });
        console.log('MongoDB connected successfully');
    }catch(error){
        console.log('MongoDB not connected',error.message);
        throw error;
    }
}

module.exports=connectDB