let Blog=require('../models/blog.model');
let User = require('../models/user.model');

const writeBlog=async(req,res)=>{
    try{    
        const {title,content,author}=req.body;
        if(!title || !content ||!author){
           return res.status(400).json({
                success:false,
                message:"Required Details must provide"
            })
        }
        const newBlog=new Blog({
            title,
            content,
            author
        })


        const blogTitle=await Blog.findOne({title})

       console.log(blogTitle);

        await newBlog.save();


        return res.status(201).json({
            success:true,
            message:"Content is posted successFully...!",
            blog:newBlog,
           
        })
        

    }catch(error){
       return  res.status(500).json({
            success:false,
            message:"Internal Server Error",
            err:error.message
        })
    }
}

const getBlog=async(req,res)=>{
    try{
        const id=req.params.id;
        const found=await Blog.findById(id);
        if(found){
            return res.status(200).json({
                success:true,
                message:"Blog Details Found",
                blog:found
            })
        }else{
            return res.status(400).json({
                success:false,
                message:"Details are not found"
            })
        }
    }catch(error){
        return res.status(500).json({
            success:false,
            message:"Internal server Error",
            mes:error.message
        })
    }
}

const updateBlog=async(req,res)=>{
    try{
    const id=req.params.id;
    const data=req.body;
    const found=await Blog.findById(id);
    if(found.author.id!==req.user.id){
        return res.status(403).json({
            success:false,
            message: "You are not allowed to update this blog"

        })
    }
    if(found){
        Object.assign(found,data);
        await found.save();
        return res.status(200).json({
            success:true,
            message:"Blog Updated SuccessFully",
            mes:found

        })
    }else{
        return res.status(400).json({
            success:false,
            message:"Details are not Found"
        })
    }
    }catch(error){
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
            err:error.message
        })
    }
}

const deleteBlog=async(req,res)=>{
    try{
        const id=req.params.id;
        const deleted=await Blog.filterByIdAndDelete(id);
        if(Blog.author.toString()!==req.user.id){
            return res.statsu(403).json({

                
                success:false,
                message:"You are not allowed to delete this blog"
            })
        }
        if(!deleted){
            return res.status(400).json({
                success:false,
                message:"Blog is not Found"
            })
        }
        return res.status(200).json({
            success:true,
            message:"Blog Deleted SuccessFully...!"
        })
    }catch(error){
        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
            err:error.message
        })
    }
}

const likes=async(req,res)=>{
    try{
        const id=req.params.id;
        const found=await Blog.findById(id);
        if(found){
            found.likes+=1;
            await found.save();
            res.status(200).json({
                success:true,
                message:"Likes are updated",
                likes:found.likes
            })
        }else{
            return res.status(400).json({
                success:false,
                message:"Error at likes api endpoint"
            })
        }
    }catch(error){

    }
}

module.exports={writeBlog,likes,getBlog,updateBlog,deleteBlog};