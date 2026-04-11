const express=require('express');
const router=express.Router();
const {auth,authorize}=require('../middleware/auth.middleware');
const {
    createComment,
    listCommentsByBlog,
    deleteComment
}=require('../controllers/comment.Controller');

router.use(auth,authorize('user','admin'));

router.post('/blog/:blogId',createComment);
router.get('/blog/:blogId',listCommentsByBlog);
router.delete('/:id',deleteComment);

module.exports=router;
