const jwt=require('jsonwebtoken');

const auth=(req,res,next)=>{
    try{
        const authorization=req.headers.authorization || '';
        const [scheme,token]=authorization.split(' ');

        if(scheme !== 'Bearer' || !token){
            return res.status(401).json({
                success:false,
                message:'Authorization token missing or malformed'
            });
        }

        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user={
            id:decoded.id,
            role:decoded.role
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
        return next();
    };
};

module.exports={auth,authorize};