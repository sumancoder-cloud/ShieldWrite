const express=require('express');
const router=express.Router();
const {auth,authorize,requireAdminTotp}=require('../middleware/auth.middleware');
const {
    createBlog,
    listBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    likeBlog
}=require('../controllers/blog.Controller');

router.use(auth,authorize('user','admin'));

router.post('/',createBlog);
router.get('/',listBlogs);
router.get('/:id',getBlogById);
router.put('/:id',requireAdminTotp,updateBlog);
router.delete('/:id',requireAdminTotp,deleteBlog);
router.patch('/:id/like',likeBlog);

module.exports=router;
