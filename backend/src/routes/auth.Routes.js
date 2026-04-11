const express=require('express');
const router=express.Router();
const {auth,authorize}=require('../middleware/auth.middleware')
const {
	signup,
	login,
	verifyOtp,
	getMe,
	refreshAccessToken,
	logout,
	logoutAll
}=require('../controllers/auth.Controller')

router.post('/signup',signup)
router.post('/login',login)
router.post('/verify-otp',verifyOtp)
router.post('/refresh-token',refreshAccessToken)
router.post('/logout',logout)
router.post('/logout-all',auth,authorize('user','admin'),logoutAll)
router.get('/me',auth,authorize('user','admin'),getMe)

module.exports=router