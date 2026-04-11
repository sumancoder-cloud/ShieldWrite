const Comment=require('../models/comment.model');
const Blog=require('../models/blog.model');

const canManageResource=(resourceUserId,requestUser)=>{
    const isOwner=resourceUserId.toString() === requestUser.id;
    const isAdmin=requestUser.role === 'admin';
    return isOwner || isAdmin;
};

const createComment=async(req,res)=>{
    try{
        const {text}=req.body;
        const {blogId}=req.params;

        if(!text){
            return res.status(400).json({
                success:false,
                message:'text is required'
            });
        }

        const blog=await Blog.findById(blogId);
        if(!blog){
            return res.status(404).json({
                success:false,
                message:'Blog not found'
            });
        }

        const comment=await Comment.create({
            text:String(text).trim(),
            user:req.user.id,
            blog:blogId
        });

        blog.comments += 1;
        await blog.save();

        return res.status(201).json({
            success:true,
            message:'Comment created successfully',
            comment
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const listCommentsByBlog=async(req,res)=>{
    try{
        const {blogId}=req.params;
        const comments=await Comment.find({blog:blogId})
            .populate('user','firstName lastName email role')
            .sort({createdAt:-1});

        return res.status(200).json({
            success:true,
            count:comments.length,
            comments
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const deleteComment=async(req,res)=>{
    try{
        const {id}=req.params;
        const comment=await Comment.findById(id);

        if(!comment){
            return res.status(404).json({
                success:false,
                message:'Comment not found'
            });
        }

        if(!canManageResource(comment.user,req.user)){
            return res.status(403).json({
                success:false,
                message:'You are not allowed to delete this comment'
            });
        }

        await comment.deleteOne();
        await Blog.findByIdAndUpdate(comment.blog,{$inc:{comments:-1}});

        return res.status(200).json({
            success:true,
            message:'Comment deleted successfully'
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
    createComment,
    listCommentsByBlog,
    deleteComment
};
