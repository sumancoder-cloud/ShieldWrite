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

const login=async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"All fields are Required"
            })
        }
        const userExists=await User.findOne({email});
        if(!userExists){
           return res.status(400).json({
                success:false,
                message:"User is not Registered"
            })
        }
         if(userExists.accountBlocked){
            if(userExists.lockuntil && userExists.lockuntil >Date.now()){

                return res.status(403).json({
                    success:false,
                    message:"Your Account was Blocked .Please Try again later"
                })
            }else{
                userExists.accountBlocked=false;
                userExists.failedLoginAttempts=0;
                userExists.lockuntil=null;
                await userExists.save()
            }
        }

        const isValidPassword=await argon2.verify(userExists.password,password);
      
        if(!isValidPassword){
            userExists.failedLoginAttempts+=1;

            if(userExists.failedLoginAttempts>=3){
                userExists.accountBlocked=true;
                userExists.lockuntil=Date.now()+1*60*1000;
                await userExists.save();
                return res.status(403).json({
                    success:false,
                    message:"Account Locked due to multiple failed attempts"
                })
            }

            await userExists.save();
            return res.status(400).json({
                success:false,
                message:"Credentials are invalid"
            })
        }else{
            userExists.failedLoginAttempts=0;
            await userExists.save();
            return res.status(200).json({
                success:true,
                message:"Login was SuccessFull...!",
                user:{
                    id:userExists._id,
                    email:userExists.email,
                    role:userExists.role
                }

            })
        }
    }catch(error){
        res.status(500).json({
            success:false,
            message:"Internal Server Error...!"
        })
    }
}

module.exports={
    signup,
    login
}