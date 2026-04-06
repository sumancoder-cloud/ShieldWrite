const mongoose=require('mongoose');

const connectDB=async(req,res)=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected SuccessFully")
    }catch(error){
        console.log("mongoDB not connected",error.message)
    }
}

module.exports=connectDB