const argon2=require('argon2');
const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const User=require('../models/user.model');
const RefreshToken=require('../models/refreshToken.model');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const { generateOtp } = require('../utils/otp');

const MAX_FAILED_ATTEMPTS=Number(process.env.MAX_FAILED_ATTEMPTS || 3);
const ACCOUNT_LOCK_MINUTES=Number(process.env.ACCOUNT_LOCK_MINUTES || 15);
const OTP_TTL_SECONDS=Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_MAX_VERIFY_ATTEMPTS=Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);
const ACCESS_TOKEN_EXPIRES_IN=process.env.JWT_EXPIRES_IN || '2d';
const MFA_TOKEN_EXPIRES_IN=process.env.MFA_TOKEN_EXPIRES_IN || '10m';
const REFRESH_TOKEN_EXPIRES_IN=process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET=process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const otpFallbackStore=new Map();

const normalizeEmail=(email='')=>email.trim().toLowerCase();

const hashToken=(token)=>crypto.createHash('sha256').update(token).digest('hex');

const createAccessToken=(user)=>jwt.sign(
    {
        id:user._id,
        role:user.role
    },
    process.env.JWT_SECRET,
    {
        expiresIn:ACCESS_TOKEN_EXPIRES_IN
    }
);

const createMfaToken=(userId,mfaSessionId)=>jwt.sign(
    {
        id:userId,
        purpose:'mfa',
        mfaSessionId
    },
    process.env.JWT_SECRET,
    {
        expiresIn:MFA_TOKEN_EXPIRES_IN
    }
);

const issueRefreshToken=async(userId)=>{
    const jti=crypto.randomUUID();

    const refreshToken=jwt.sign(
        {
            id:userId,
            jti,
            type:'refresh'
        },
        REFRESH_TOKEN_SECRET,
        {
            expiresIn:REFRESH_TOKEN_EXPIRES_IN
        }
    );

    const decoded=jwt.decode(refreshToken);
    const expiresAt=new Date(decoded.exp * 1000);

    await RefreshToken.create({
        user:userId,
        jti,
        tokenHash:hashToken(refreshToken),
        expiresAt
    });

    return refreshToken;
};

const revokeRefreshTokenRecord=async(record,replacedByTokenHash=null)=>{
    record.revokedAt=new Date();
    if(replacedByTokenHash){
        record.replacedByTokenHash=replacedByTokenHash;
    }
    await record.save();
};

const validateStoredRefreshToken=async(refreshToken)=>{
    let decoded;
    try{
        decoded=jwt.verify(refreshToken,REFRESH_TOKEN_SECRET);
    }catch(error){
        return { error:'Invalid or expired refresh token' };
    }

    if(decoded.type !== 'refresh' || !decoded.id || !decoded.jti){
        return { error:'Malformed refresh token payload' };
    }

    const tokenHash=hashToken(refreshToken);
    const tokenRecord=await RefreshToken.findOne({
        user:decoded.id,
        jti:decoded.jti,
        tokenHash,
        revokedAt:null,
        expiresAt:{ $gt:new Date() }
    });

    if(!tokenRecord){
        return { error:'Refresh token has been revoked or was not recognized' };
    }

    return {
        decoded,
        tokenRecord,
        tokenHash
    };
};

const saveOtpSession=async({userId,mfaSessionId,otp})=>{
    const payload={
        otp,
        attempts:0
    };

    const key=`mfa:otp:${userId}:${mfaSessionId}`;
    const redisClient=getRedisClient();

    if(isRedisConnected() && redisClient){
        await redisClient.setEx(key,OTP_TTL_SECONDS,JSON.stringify(payload));
        return key;
    }

    otpFallbackStore.set(key,{ ...payload, expiresAt:Date.now()+OTP_TTL_SECONDS*1000 });
    return key;
};

const readOtpSession=async(key)=>{
    const redisClient=getRedisClient();
    if(isRedisConnected() && redisClient){
        const value=await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    }

    const fallbackValue=otpFallbackStore.get(key);
    if(!fallbackValue){
        return null;
    }
    if(fallbackValue.expiresAt <= Date.now()){
        otpFallbackStore.delete(key);
        return null;
    }
    return fallbackValue;
};

const writeOtpSession=async(key,data)=>{
    const redisClient=getRedisClient();
    if(isRedisConnected() && redisClient){
        await redisClient.setEx(key,OTP_TTL_SECONDS,JSON.stringify(data));
        return;
    }

    otpFallbackStore.set(key,{ ...data, expiresAt:Date.now()+OTP_TTL_SECONDS*1000 });
};

const deleteOtpSession=async(key)=>{
    const redisClient=getRedisClient();
    if(isRedisConnected() && redisClient){
        await redisClient.del(key);
        return;
    }

    otpFallbackStore.delete(key);
};

const signup=async(req,res)=>{
    try{
        const {firstName,lastName,age,email,password,role}=req.body;

        if(!firstName || !email || !password || age===undefined){
            return res.status(400).json({
                success:false,
                message:'firstName, age, email and password are required'
            });
        }

        if(String(password).length < 8){
            return res.status(400).json({
                success:false,
                message:'Password must be at least 8 characters long'
            });
        }

        const normalizedEmail=normalizeEmail(email);
        const emailExists=await User.findOne({email:normalizedEmail});
        if(emailExists){
            return res.status(409).json({
                success:false,
                message:'User already exists'
            });
        }

        const hashedPassword=await argon2.hash(password);
        const userRole=role === 'admin' ? 'admin' : 'user';

        const newUser=await User.create({
            firstName:firstName.trim(),
            lastName:lastName ? String(lastName).trim() : '',
            age:Number(age),
            email:normalizedEmail,
            password:hashedPassword,
            role:userRole
        });

        return res.status(201).json({
            success:true,
            message:'User created successfully',
            user:{
                id:newUser._id,
                email:newUser.email,
                role:newUser.role
            }
        });

    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const login=async(req,res)=>{
    try{
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:'Email and password are required'
            });
        }

        const normalizedEmail=normalizeEmail(email);
        const user=await User.findOne({email:normalizedEmail});
        if(!user){
            return res.status(401).json({
                success:false,
                message:'Invalid credentials'
            });
        }

        if(user.accountBlocked){
            if(user.lockUntil && user.lockUntil > Date.now()){
                return res.status(423).json({
                    success:false,
                    message:'Account temporarily locked due to repeated failed login attempts',
                    lockedUntil:user.lockUntil
                });
            }

            user.accountBlocked=false;
            user.failedLoginAttempts=0;
            user.lockUntil=null;
            await user.save();
        }

        const isValidPassword=await argon2.verify(user.password,password);
        if(!isValidPassword){
            user.failedLoginAttempts += 1;

            if(user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS){
                user.accountBlocked=true;
                user.lockUntil=new Date(Date.now() + ACCOUNT_LOCK_MINUTES*60*1000);
            }

            await user.save();

            return res.status(401).json({
                success:false,
                message:'Invalid credentials'
            });
        }

        user.failedLoginAttempts=0;
        user.accountBlocked=false;
        user.lockUntil=null;
        await user.save();

        const otp=generateOtp(6);
        const mfaSessionId=crypto.randomBytes(16).toString('hex');
        await saveOtpSession({
            userId:user._id.toString(),
            mfaSessionId,
            otp
        });

        const mfaToken=createMfaToken(user._id,mfaSessionId);

        // In production, deliver OTP through email/SMS provider instead of returning it.
        return res.status(200).json({
            success:true,
            message:'Password verified. Complete MFA with OTP.',
            mfaRequired:true,
            mfaToken,
            otpPreview:process.env.NODE_ENV === 'production' ? undefined : otp
        });

    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const verifyOtp=async(req,res)=>{
    try{
        const {mfaToken,otp}=req.body;

        if(!mfaToken || !otp){
            return res.status(400).json({
                success:false,
                message:'mfaToken and otp are required'
            });
        }

        let decoded;
        try{
            decoded=jwt.verify(mfaToken,process.env.JWT_SECRET);
        }catch(error){
            return res.status(401).json({
                success:false,
                message:'Invalid or expired MFA token'
            });
        }

        if(decoded.purpose !== 'mfa' || !decoded.id || !decoded.mfaSessionId){
            return res.status(401).json({
                success:false,
                message:'Invalid MFA token payload'
            });
        }

        const key=`mfa:otp:${decoded.id}:${decoded.mfaSessionId}`;
        const otpSession=await readOtpSession(key);

        if(!otpSession){
            return res.status(400).json({
                success:false,
                message:'OTP expired or session not found'
            });
        }

        const nextAttempts=Number(otpSession.attempts || 0) + 1;
        if(String(otpSession.otp) !== String(otp)){
            if(nextAttempts >= OTP_MAX_VERIFY_ATTEMPTS){
                await deleteOtpSession(key);
                return res.status(400).json({
                    success:false,
                    message:'OTP verification failed too many times. Please login again.'
                });
            }

            await writeOtpSession(key,{
                ...otpSession,
                attempts:nextAttempts
            });

            return res.status(400).json({
                success:false,
                message:'Invalid OTP',
                attemptsLeft:OTP_MAX_VERIFY_ATTEMPTS-nextAttempts
            });
        }

        await deleteOtpSession(key);

        const user=await User.findById(decoded.id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:'User not found'
            });
        }

        user.isVerified=true;
        await user.save();

        const token=createAccessToken(user);
        const refreshToken=await issueRefreshToken(user._id.toString());

        return res.status(200).json({
            success:true,
            message:'MFA verification successful',
            token,
            refreshToken,
            user:{
                id:user._id,
                email:user.email,
                role:user.role,
                isVerified:user.isVerified
            }
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const refreshAccessToken=async(req,res)=>{
    try{
        const { refreshToken }=req.body;
        if(!refreshToken){
            return res.status(400).json({
                success:false,
                message:'refreshToken is required'
            });
        }

        const validated=await validateStoredRefreshToken(refreshToken);
        if(validated.error){
            return res.status(401).json({
                success:false,
                message:validated.error
            });
        }

        const user=await User.findById(validated.decoded.id);
        if(!user){
            await revokeRefreshTokenRecord(validated.tokenRecord);
            return res.status(404).json({
                success:false,
                message:'User not found'
            });
        }

        const accessToken=createAccessToken(user);
        const newRefreshToken=await issueRefreshToken(user._id.toString());

        await revokeRefreshTokenRecord(validated.tokenRecord,hashToken(newRefreshToken));

        return res.status(200).json({
            success:true,
            message:'Token refreshed successfully',
            token:accessToken,
            refreshToken:newRefreshToken
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const logout=async(req,res)=>{
    try{
        const { refreshToken }=req.body;
        if(!refreshToken){
            return res.status(400).json({
                success:false,
                message:'refreshToken is required'
            });
        }

        const validated=await validateStoredRefreshToken(refreshToken);
        if(validated.error){
            return res.status(200).json({
                success:true,
                message:'Session already invalid'
            });
        }

        await revokeRefreshTokenRecord(validated.tokenRecord);

        return res.status(200).json({
            success:true,
            message:'Logged out successfully'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const logoutAll=async(req,res)=>{
    try{
        await RefreshToken.updateMany(
            {
                user:req.user.id,
                revokedAt:null,
                expiresAt:{ $gt:new Date() }
            },
            {
                $set:{ revokedAt:new Date() }
            }
        );

        return res.status(200).json({
            success:true,
            message:'Logged out from all devices'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const getMe=async(req,res)=>{
    try{
        const user=await User.findById(req.user.id).select('-password');
        if(!user){
            return res.status(404).json({
                success:false,
                message:'User not found'
            });
        }

        return res.status(200).json({
            success:true,
            user
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

module.exports={
    signup,
    login,
    verifyOtp,
    getMe,
    refreshAccessToken,
    logout,
    logoutAll
};