const mongoose=require('mongoose');

const userSchema=new mongoose.Schema(
    {
        firstName:{
            type:String,
            required:true,
            trim:true
        },
        lastName:{
            type:String,
            trim:true
        },
        age:{
            type:Number
        },
        email:{
            type:String,
            unique:true,
            required:true,
            lowercase:true,
            trim:true
        },
        password:{
            type:String,
            required:true,
            trim:true
        },
        role:{
            type:String,
            required:true,
            enum:["user","admin"],
            default:"user"
        },
        isVerified:{
            type:Boolean,
            default:false,
        },
        failedLoginAttempts:{
            type:Number,
            default:0
        },
        accountBlocked:{
            type:Boolean,
            default:false
        },
        lockUntil:{
            type:Date,
            default:null
        }
    },
    {
        timestamps:true
    }
)

const User=mongoose.model("User",userSchema);

module.exports=User;