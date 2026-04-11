const mongoose=require('mongoose');

const refreshTokenSchema=new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
            index:true
        },
        jti:{
            type:String,
            required:true,
            unique:true,
            index:true
        },
        tokenHash:{
            type:String,
            required:true,
            unique:true
        },
        expiresAt:{
            type:Date,
            required:true
        },
        revokedAt:{
            type:Date,
            default:null
        },
        replacedByTokenHash:{
            type:String,
            default:null
        }
    },
    {
        timestamps:true
    }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, revokedAt: 1 });

const RefreshToken=mongoose.model('RefreshToken',refreshTokenSchema);

module.exports=RefreshToken;
