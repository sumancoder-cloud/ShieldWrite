const Blog=require('../models/blog.model');

const canManageResource=(resourceAuthorId,requestUser)=>{
    const isOwner=resourceAuthorId.toString() === requestUser.id;
    const isAdmin=requestUser.role === 'admin';
    return isOwner || isAdmin;
};

const createBlog=async(req,res)=>{
    try{
        const {title,content,status}=req.body;
        if(!title || !content){
            return res.status(400).json({
                success:false,
                message:'title and content are required'
            });
        }

        const blog=await Blog.create({
            title:String(title).trim(),
            content:String(content).trim(),
            status:status === 'published' ? 'published' : 'draft',
            author:req.user.id
        });

        return res.status(201).json({
            success:true,
            message:'Blog created successfully',
            blog
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const listBlogs=async(req,res)=>{
    try{
        const query=req.user.role === 'admin' ? {} : { author:req.user.id };
        const blogs=await Blog.find(query)
            .populate('author','firstName lastName email role')
            .sort({ createdAt:-1 });

        return res.status(200).json({
            success:true,
            count:blogs.length,
            blogs
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const getBlogById=async(req,res)=>{
    try{
        const blog=await Blog.findById(req.params.id)
            .populate('author','firstName lastName email role');

        if(!blog){
            return res.status(404).json({
                success:false,
                message:'Blog not found'
            });
        }

        if(!canManageResource(blog.author._id,req.user)){
            return res.status(403).json({
                success:false,
                message:'Not allowed to view this blog'
            });
        }

        return res.status(200).json({
            success:true,
            blog
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const updateBlog=async(req,res)=>{
    try{
        const blog=await Blog.findById(req.params.id);
        if(!blog){
            return res.status(404).json({
                success:false,
                message:'Blog not found'
            });
        }

        if(!canManageResource(blog.author,req.user)){
            return res.status(403).json({
                success:false,
                message:'You are not allowed to update this blog'
            });
        }

        const {title,content,status}=req.body;
        if(title !== undefined){
            blog.title=String(title).trim();
        }
        if(content !== undefined){
            blog.content=String(content).trim();
        }
        if(status !== undefined && ['draft','published'].includes(status)){
            blog.status=status;
        }

        await blog.save();

        return res.status(200).json({
            success:true,
            message:'Blog updated successfully',
            blog
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const deleteBlog=async(req,res)=>{
    try{
        const blog=await Blog.findById(req.params.id);
        if(!blog){
            return res.status(404).json({
                success:false,
                message:'Blog not found'
            });
        }

        if(!canManageResource(blog.author,req.user)){
            return res.status(403).json({
                success:false,
                message:'You are not allowed to delete this blog'
            });
        }

        await blog.deleteOne();

        return res.status(200).json({
            success:true,
            message:'Blog deleted successfully'
        });
    }catch(error){
        return res.status(500).json({
            success:false,
            message:'Internal server error',
            error:error.message
        });
    }
};

const likeBlog=async(req,res)=>{
    try{
        const blog=await Blog.findById(req.params.id);
        if(!blog){
            return res.status(404).json({
                success:false,
                message:'Blog not found'
            });
        }

        if(!canManageResource(blog.author,req.user)){
            return res.status(403).json({
                success:false,
                message:'Not allowed to interact with this blog'
            });
        }

        blog.likes += 1;
        await blog.save();

        return res.status(200).json({
            success:true,
            message:'Like added',
            likes:blog.likes
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
    createBlog,
    listBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    likeBlog
};