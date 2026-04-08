const jwt=require('jsonwebtoken')
const User=require('../models/user.model')
const auth=async(req,res,next)=>{
    try{
        const token=req.headers.authorization;
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token missing"
            })
        }

        const decoded=await jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded;
        next();

    }catch(error){
        return res.status(401).json({
            success:false,
            message:"Invalid Token"
        })
    }
}

const authorize=(...roles)=>{
    return (req,res,next)=>{
        try{
            const userRole=req.user.role
        if(!roles.includes(userRole)){
            return res.json(403).json({
                success:false,
                message:"Access Denied."
            })
        }
        next();
        }catch(error){
            return res.status(500).json({
                succcess:false,
                message:"Internal Server Error",
                mes:error.message
            })
        }
    }
}
module.exports={auth,authorize};