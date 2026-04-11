const jwt=require('jsonwebtoken');
const speakeasy=require('speakeasy');
const User=require('../models/user.model');

const auth=async(req,res,next)=>{
    try{
        const authorization=req.headers.authorization || '';
        const [scheme,token]=authorization.split(' ');
        const cookieToken=req.cookies?.sw_access_token;
        const accessToken=(scheme === 'Bearer' && token) ? token : cookieToken;

        if(!accessToken){
            return res.status(401).json({
                success:false,
                message:'Authorization token missing or malformed'
            });
        }

        const decoded=jwt.verify(accessToken,process.env.JWT_SECRET);
        const dbUser=await User.findById(decoded.id)
            .select('role email adminApproved isSuperAdmin adminMfaEnabled');

        if(!dbUser){
            return res.status(401).json({
                success:false,
                message:'User not found for token'
            });
        }

        req.user={
            id:String(dbUser._id),
            role:dbUser.role,
            email:dbUser.email,
            adminApproved:!!dbUser.adminApproved,
            isSuperAdmin:!!dbUser.isSuperAdmin,
            adminMfaEnabled:!!dbUser.adminMfaEnabled
        };

        return next();

    }catch(error){
        return res.status(401).json({
            success:false,
            message:'Invalid or expired token'
        });
    }
};

const authorize=(...roles)=>{
    return (req,res,next)=>{
        const userRole=req.user?.role;
        if(!userRole || !roles.includes(userRole)){
            return res.status(403).json({
                success:false,
                message:'Access denied'
            });
        }

        if(userRole === 'admin' && !req.user?.adminApproved){
            return res.status(403).json({
                success:false,
                message:'Admin approval pending'
            });
        }

        return next();
    };
};

const requireSuperAdmin=(req,res,next)=>{
    if(!req.user?.isSuperAdmin){
        return res.status(403).json({
            success:false,
            message:'Super admin access required'
        });
    }
    return next();
};

const requireAdminTotp=async(req,res,next)=>{
    try{
        if(req.user?.role !== 'admin'){
            return next();
        }

        const dbUser=await User.findById(req.user.id).select('adminMfaEnabled adminMfaSecret');
        if(!dbUser){
            return res.status(401).json({
                success:false,
                message:'User not found'
            });
        }

        if(!dbUser.adminMfaEnabled || !dbUser.adminMfaSecret){
            return res.status(403).json({
                success:false,
                message:'Google Authenticator MFA is required for admin update/delete actions'
            });
        }

        const token=req.headers['x-admin-totp'] || req.body?.adminTotp;
        if(!token){
            return res.status(401).json({
                success:false,
                message:'Admin TOTP code is required in x-admin-totp header'
            });
        }

        const verified=speakeasy.totp.verify({
            secret:dbUser.adminMfaSecret,
            encoding:'base32',
            token:String(token),
            window:1
        });

        if(!verified){
            return res.status(401).json({
                success:false,
                message:'Invalid or expired admin TOTP code'
            });
        }

        return next();
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Failed to validate admin TOTP',
            error:error.message
        });
    }
};

module.exports={auth,authorize,requireSuperAdmin,requireAdminTotp};