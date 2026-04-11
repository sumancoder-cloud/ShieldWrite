const argon2=require('argon2');
const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const speakeasy=require('speakeasy');
const QRCode=require('qrcode');
const User=require('../models/user.model');
const RefreshToken=require('../models/refreshToken.model');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const { generateOtp } = require('../utils/otp');
const { sendOtpEmail, sendEmailVerificationEmail, sendSecurityAlertEmail } = require('../utils/email');

const MAX_FAILED_ATTEMPTS=Number(process.env.MAX_FAILED_ATTEMPTS || 3);
const ACCOUNT_LOCK_MINUTES=Number(process.env.ACCOUNT_LOCK_MINUTES || 1);
const OTP_TTL_SECONDS=Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_MAX_VERIFY_ATTEMPTS=Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);
const ACCESS_TOKEN_EXPIRES_IN=process.env.JWT_EXPIRES_IN || '2d';
const MFA_TOKEN_EXPIRES_IN=process.env.MFA_TOKEN_EXPIRES_IN || '10m';
const REFRESH_TOKEN_EXPIRES_IN=process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET=process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const EMAIL_VERIFY_EXPIRES_IN=process.env.EMAIL_VERIFY_EXPIRES_IN || '24h';
const FRONTEND_URL=process.env.FRONTEND_URL || 'http://localhost:5173';

const normalizeEmail=(email='')=>email.trim().toLowerCase();
const MAIN_ADMIN_EMAIL=normalizeEmail(process.env.MAIN_ADMIN_EMAIL || 'suman.tati2005@gmail.com');
const SECURITY_ALERT_EMAIL=normalizeEmail(process.env.SECURITY_ALERT_EMAIL || process.env.MAIN_ADMIN_EMAIL || 'suman.tati2005@gmail.com');

const validateStrongPassword=(password='')=>{
    const value=String(password);
    if(value.length < 12){
        return 'Password must be at least 12 characters long';
    }

    const hasUpper=/[A-Z]/.test(value);
    const hasLower=/[a-z]/.test(value);
    const hasDigit=/\d/.test(value);
    const hasSpecial=/[^A-Za-z0-9]/.test(value);
    if(!hasUpper || !hasLower || !hasDigit || !hasSpecial){
        return 'Password must include uppercase, lowercase, number, and special character';
    }
    return null;
};

const parseCookieMaxAge=(expiresIn)=>{
    if(typeof expiresIn === 'number') return expiresIn * 1000;
    const value=String(expiresIn || '').trim();
    const match=value.match(/^(\d+)([smhd])$/i);
    if(!match) return 7 * 24 * 60 * 60 * 1000;
    const n=Number(match[1]);
    const unit=match[2].toLowerCase();
    const map={ s:1000, m:60*1000, h:60*60*1000, d:24*60*60*1000 };
    return n * map[unit];
};

const cookieBaseOptions={
    httpOnly:true,
    secure:process.env.NODE_ENV === 'production',
    sameSite:'lax',
    path:'/'
};

const setAuthCookies=(res,{ accessToken, refreshToken })=>{
    res.cookie('sw_access_token',accessToken,{ ...cookieBaseOptions, maxAge:parseCookieMaxAge(ACCESS_TOKEN_EXPIRES_IN) });
    res.cookie('sw_refresh_token',refreshToken,{ ...cookieBaseOptions, maxAge:parseCookieMaxAge(REFRESH_TOKEN_EXPIRES_IN) });
};

const clearAuthCookies=(res)=>{
    res.clearCookie('sw_access_token',cookieBaseOptions);
    res.clearCookie('sw_refresh_token',cookieBaseOptions);
};

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

const createEmailVerificationToken=(userId)=>jwt.sign(
    {
        id:userId,
        purpose:'email-verify',
        nonce:crypto.randomBytes(16).toString('hex')
    },
    process.env.JWT_SECRET,
    {
        expiresIn:EMAIL_VERIFY_EXPIRES_IN
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

    if(!isRedisConnected() || !redisClient){
        throw new Error('Redis is unavailable for OTP session storage');
    }

    await redisClient.setEx(key,OTP_TTL_SECONDS,JSON.stringify(payload));
    return key;
};

const readOtpSession=async(key)=>{
    const redisClient=getRedisClient();
    if(!isRedisConnected() || !redisClient){
        throw new Error('Redis is unavailable for OTP session read');
    }

    const value=await redisClient.get(key);
    return value ? JSON.parse(value) : null;
};

const writeOtpSession=async(key,data)=>{
    const redisClient=getRedisClient();
    if(!isRedisConnected() || !redisClient){
        throw new Error('Redis is unavailable for OTP session write');
    }

    await redisClient.setEx(key,OTP_TTL_SECONDS,JSON.stringify(data));
};

const deleteOtpSession=async(key)=>{
    const redisClient=getRedisClient();
    if(!isRedisConnected() || !redisClient){
        throw new Error('Redis is unavailable for OTP session delete');
    }

    await redisClient.del(key);
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

        const passwordError=validateStrongPassword(password);
        if(passwordError){
            return res.status(400).json({
                success:false,
                message:passwordError
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
        const normalizedMainAdminEmail=normalizeEmail(MAIN_ADMIN_EMAIL);
        const isMainAdmin=normalizeEmail(normalizedEmail) === normalizedMainAdminEmail;
        const userRole=isMainAdmin ? 'admin' : (role === 'admin' ? 'admin' : 'user');

        const newUser=await User.create({
            firstName:firstName.trim(),
            lastName:lastName ? String(lastName).trim() : '',
            age:Number(age),
            email:normalizedEmail,
            password:hashedPassword,
            role:userRole,
            adminApproved:userRole === 'admin' ? isMainAdmin : true,
            isSuperAdmin:isMainAdmin,
            emailVerified:isMainAdmin
        });

        if(!newUser.emailVerified){
            const verifyToken=createEmailVerificationToken(newUser._id.toString());
            newUser.emailVerificationTokenHash=hashToken(verifyToken);
            const decoded=jwt.decode(verifyToken);
            newUser.emailVerificationExpiresAt=new Date(decoded.exp * 1000);
            await newUser.save();

            const verificationUrl=`${FRONTEND_URL}/login?verifyToken=${encodeURIComponent(verifyToken)}`;
            await sendEmailVerificationEmail({
                to:newUser.email,
                firstName:newUser.firstName,
                verificationUrl
            });
        }

        return res.status(201).json({
            success:true,
            message:!newUser.emailVerified
                ? 'Account created. Please verify your email before logging in.'
                : (userRole === 'admin' && !newUser.adminApproved
                ? 'Admin signup request submitted. Wait for super admin approval.'
                : 'User created successfully'),
            user:{
                id:newUser._id,
                email:newUser.email,
                role:newUser.role,
                adminApproved:newUser.adminApproved,
                isSuperAdmin:newUser.isSuperAdmin,
                emailVerified:newUser.emailVerified
            }
        });

    }catch(error){
        if(error.message && error.message.includes('Redis is unavailable')){
            return res.status(503).json({
                success:false,
                message:'Redis service unavailable. OTP flow requires Redis.'
            });
        }

        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const login=async(req,res)=>{
    try{
        const {email,password,role}=req.body;

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

        if(role && role !== user.role){
            return res.status(401).json({
                success:false,
                message:'Selected role does not match your account role'
            });
        }

        if(!user.emailVerified){
            return res.status(403).json({
                success:false,
                message:'Email not verified. Please verify your email before login.'
            });
        }

        if(user.role === 'admin' && !user.adminApproved){
            return res.status(403).json({
                success:false,
                message:'Admin access pending approval by main administrator'
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
                await sendSecurityAlertEmail({
                    to:SECURITY_ALERT_EMAIL,
                    subject:'ShieldWrite alert: account locked',
                    message:`Account ${user.email} locked after repeated failed login attempts.`,
                    details:`IP: ${req.ip}\nUser-Agent: ${req.headers['user-agent'] || 'unknown'}`
                });
            }

            await user.save();

            if(user.failedLoginAttempts >= 2){
                await sendSecurityAlertEmail({
                    to:SECURITY_ALERT_EMAIL,
                    subject:'ShieldWrite alert: suspicious login failures',
                    message:`Repeated failed login attempts for ${user.email}.`,
                    details:`Attempts: ${user.failedLoginAttempts}\nIP: ${req.ip}\nUser-Agent: ${req.headers['user-agent'] || 'unknown'}`
                });
            }

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

        await sendOtpEmail({
            to:user.email,
            firstName:user.firstName,
            otp
        });

        const mfaToken=createMfaToken(user._id,mfaSessionId);

        return res.status(200).json({
            success:true,
            message:'Password verified. Complete MFA with OTP.',
            mfaRequired:true,
            mfaToken
        });

    }catch(error){
        if(error.message && error.message.includes('Redis is unavailable')){
            return res.status(503).json({
                success:false,
                message:'Redis service unavailable. OTP flow requires Redis.'
            });
        }

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
        setAuthCookies(res,{ accessToken:token, refreshToken });

        return res.status(200).json({
            success:true,
            message:'MFA verification successful',
            user:{
                id:user._id,
                email:user.email,
                role:user.role,
                isVerified:user.isVerified,
                adminApproved:user.adminApproved,
                isSuperAdmin:user.isSuperAdmin,
                emailVerified:user.emailVerified
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
        const refreshToken=req.body?.refreshToken || req.cookies?.sw_refresh_token;
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
        setAuthCookies(res,{ accessToken, refreshToken:newRefreshToken });

        return res.status(200).json({
            success:true,
            message:'Token refreshed successfully'
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
        const refreshToken=req.body?.refreshToken || req.cookies?.sw_refresh_token;
        if(!refreshToken){
            clearAuthCookies(res);
            return res.status(400).json({
                success:false,
                message:'refreshToken is required'
            });
        }

        const validated=await validateStoredRefreshToken(refreshToken);
        if(validated.error){
            clearAuthCookies(res);
            return res.status(200).json({
                success:true,
                message:'Session already invalid'
            });
        }

        await revokeRefreshTokenRecord(validated.tokenRecord);
        clearAuthCookies(res);

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
        clearAuthCookies(res);

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
        const user=await User.findById(req.user.id).select('-password -adminMfaSecret -adminMfaTempSecret');
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

const verifyEmail=async(req,res)=>{
    try{
        const token=req.body?.token || req.query?.token;
        if(!token){
            return res.status(400).json({
                success:false,
                message:'Verification token is required'
            });
        }

        let decoded;
        try{
            decoded=jwt.verify(token,process.env.JWT_SECRET);
        }catch(error){
            return res.status(401).json({
                success:false,
                message:'Invalid or expired verification token'
            });
        }

        if(decoded.purpose !== 'email-verify' || !decoded.id){
            return res.status(401).json({
                success:false,
                message:'Invalid verification token payload'
            });
        }

        const user=await User.findById(decoded.id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:'User not found'
            });
        }

        if(user.emailVerified){
            return res.status(200).json({
                success:true,
                message:'Email already verified'
            });
        }

        const tokenHash=hashToken(token);
        if(
            !user.emailVerificationTokenHash ||
            user.emailVerificationTokenHash !== tokenHash ||
            (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date())
        ){
            return res.status(401).json({
                success:false,
                message:'Invalid or expired verification token'
            });
        }

        user.emailVerified=true;
        user.emailVerificationTokenHash=null;
        user.emailVerificationExpiresAt=null;
        await user.save();

        return res.status(200).json({
            success:true,
            message:'Email verified successfully. You can now login.'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const resendVerification=async(req,res)=>{
    try{
        const { email }=req.body;
        if(!email){
            return res.status(400).json({
                success:false,
                message:'Email is required'
            });
        }

        const normalizedEmail=normalizeEmail(email);
        const user=await User.findOne({ email:normalizedEmail });
        if(!user){
            return res.status(200).json({
                success:true,
                message:'If this email exists, a verification mail has been sent.'
            });
        }

        if(user.emailVerified){
            return res.status(200).json({
                success:true,
                message:'Email already verified.'
            });
        }

        const verifyToken=createEmailVerificationToken(user._id.toString());
        user.emailVerificationTokenHash=hashToken(verifyToken);
        const decoded=jwt.decode(verifyToken);
        user.emailVerificationExpiresAt=new Date(decoded.exp * 1000);
        await user.save();

        const verificationUrl=`${FRONTEND_URL}/login?verifyToken=${encodeURIComponent(verifyToken)}`;
        await sendEmailVerificationEmail({
            to:user.email,
            firstName:user.firstName,
            verificationUrl
        });

        return res.status(200).json({
            success:true,
            message:'Verification email sent.'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const getAdminMfaStatus=async(req,res)=>{
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success:false,
                message:'Admin role required'
            });
        }

        const user=await User.findById(req.user.id).select('adminMfaEnabled');

        return res.status(200).json({
            success:true,
            adminMfaEnabled:!!user?.adminMfaEnabled
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const setupAdminMfa=async(req,res)=>{
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success:false,
                message:'Admin role required'
            });
        }

        const user=await User.findById(req.user.id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:'User not found'
            });
        }

        const secret=speakeasy.generateSecret({
            name:`ShieldWrite (${user.email})`,
            issuer:'ShieldWrite',
            length:20
        });

        user.adminMfaTempSecret=secret.base32;
        await user.save();

        const qrCodeDataUrl=await QRCode.toDataURL(secret.otpauth_url);

        return res.status(200).json({
            success:true,
            message:'Scan QR in Google Authenticator and confirm with a TOTP code',
            manualKey:secret.base32,
            qrCodeDataUrl
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const enableAdminMfa=async(req,res)=>{
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success:false,
                message:'Admin role required'
            });
        }

        const { token }=req.body;
        if(!token){
            return res.status(400).json({
                success:false,
                message:'TOTP token is required'
            });
        }

        const user=await User.findById(req.user.id);
        if(!user || !user.adminMfaTempSecret){
            return res.status(400).json({
                success:false,
                message:'MFA setup not initialized. Call setup first.'
            });
        }

        const verified=speakeasy.totp.verify({
            secret:user.adminMfaTempSecret,
            encoding:'base32',
            token:String(token),
            window:1
        });

        if(!verified){
            return res.status(401).json({
                success:false,
                message:'Invalid TOTP token'
            });
        }

        user.adminMfaSecret=user.adminMfaTempSecret;
        user.adminMfaTempSecret=null;
        user.adminMfaEnabled=true;
        await user.save();

        return res.status(200).json({
            success:true,
            message:'Google Authenticator enabled for admin actions'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const disableAdminMfa=async(req,res)=>{
    try{
        if(req.user.role !== 'admin'){
            return res.status(403).json({
                success:false,
                message:'Admin role required'
            });
        }

        const { token }=req.body;
        if(!token){
            return res.status(400).json({
                success:false,
                message:'TOTP token is required'
            });
        }

        const user=await User.findById(req.user.id);
        if(!user || !user.adminMfaEnabled || !user.adminMfaSecret){
            return res.status(400).json({
                success:false,
                message:'Admin MFA is not enabled'
            });
        }

        const verified=speakeasy.totp.verify({
            secret:user.adminMfaSecret,
            encoding:'base32',
            token:String(token),
            window:1
        });

        if(!verified){
            return res.status(401).json({
                success:false,
                message:'Invalid TOTP token'
            });
        }

        user.adminMfaEnabled=false;
        user.adminMfaSecret=null;
        user.adminMfaTempSecret=null;
        await user.save();

        return res.status(200).json({
            success:true,
            message:'Google Authenticator disabled for admin actions'
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
    logoutAll,
    getAdminMfaStatus,
    setupAdminMfa,
    enableAdminMfa,
    disableAdminMfa,
    verifyEmail,
    resendVerification
};