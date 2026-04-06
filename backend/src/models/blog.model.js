const mongoose=require('mongoose');

const blogSchema=new mongoose.Schema(
    {
        title:{
            type:String,
            required:true
        },
        content:{
            type:String,
            required:true,   
        },
        author:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        likes:{
            type:Number,
            default:0
        },
        shares:{
            type:Number,
            default:0
        },
        comments:{
            type:Number,
            default:0
        },
        status:{
            type:String,
            enum:["draft","published"]
        }
    },
    {
        timestamps:true
    }

)

const Blog=mongoose.model("Blog",blogSchema);

module.exports=Blog;