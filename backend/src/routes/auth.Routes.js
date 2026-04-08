const express=require('express');
const router=express.Router();
const {signup,login}=require('../controllers/auth.Controller')
const {writeBlog,getBlog,updateBlog,deleteBlog}=require('../controllers/blog.Controller')
const {auth,authorize}=require('../middleware/auth.middleware')


router.post('/signup',signup)
router.post('/login',login)
router.post('/writeBlog',auth,authorize("user","admin"),writeBlog)
router.get('/getBlog/:id',auth,authorize("user","admin"),getBlog)
router.put('/updateBlog/:id',auth,authorize("user","admin"),updateBlog)
router.delete('/deleteBlog/:id',auth,authorize("user","admin"),deleteBlog)
module.exports=router