const User=require('../models/user.model')
const argon2=require('argon2')

const signup=async(req,res)=>{
    try{
        const {firstName,lastName,age,email,password}=req.body;
        if(!email || !password || !firstName ||!age ){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
        }
        const emailExists=await User.findOne({email});
        if(emailExists){
            return res.status(400).json({
                success:false,
                message:"User Already Exists"
            })
        }
        const hashedPassword=await argon2.hash(password)

        const newUser=new User({
            firstName,lastName:lastName || "",age,email,password:hashedPassword
        })
    
        await newUser.save();
        res.status(201).json({
            success:true,
            message:"User successFully Created"
        })

    }catch(error){
        res.status(500).json({
            success:false,
            message:"Internal Sever Error"
        })
    }
}

module.exports=signup