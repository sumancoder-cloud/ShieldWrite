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
	logoutAll,
	getAdminMfaStatus,
	setupAdminMfa,
	enableAdminMfa,
	disableAdminMfa,
	verifyEmail,
	resendVerification
}=require('../controllers/auth.Controller')

router.post('/signup',signup)
router.post('/login',login)
router.post('/verify-otp',verifyOtp)
router.post('/verify-email',verifyEmail)
router.post('/resend-verification',resendVerification)
router.get('/verify-email',verifyEmail)
router.post('/refresh-token',refreshAccessToken)
router.post('/logout',logout)
router.post('/logout-all',auth,authorize('user','admin'),logoutAll)
router.get('/me',auth,authorize('user','admin'),getMe)
router.get('/admin-mfa/status',auth,authorize('admin'),getAdminMfaStatus)
router.post('/admin-mfa/setup',auth,authorize('admin'),setupAdminMfa)
router.post('/admin-mfa/enable',auth,authorize('admin'),enableAdminMfa)
router.post('/admin-mfa/disable',auth,authorize('admin'),disableAdminMfa)

module.exports=router