const express=require('express');
const router=express.Router();
const {auth,authorize}=require('../middleware/auth.middleware');
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
router.put('/:id',updateBlog);
router.delete('/:id',deleteBlog);
router.patch('/:id/like',likeBlog);

module.exports=router;
