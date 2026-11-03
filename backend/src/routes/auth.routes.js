const express=require('express');
const crypto=require('crypto');
const {google}=require('googleapis');
const {createOAuthClient,getAuthUrl,saveUserAndTokens,loadTokens}=require('../config/oauth');
const db=require('../db/db');
const router=express.Router();
router.get('/google',(req,res)=>{const state=crypto.randomBytes(24).toString('hex');req.session.oauthState=state;res.redirect(getAuthUrl(state));});
router.get('/google/callback',async(req,res)=>{
 const {code,error,state}=req.query;
 if(error) return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=${encodeURIComponent(error)}`);
 if(!state || state!==req.session.oauthState) return res.status(403).send('Invalid OAuth state. Please try signing in again.');
 delete req.session.oauthState;
 try{
  const client=createOAuthClient(); const {tokens}=await client.getToken(code); client.setCredentials(tokens);
  const oauth2=google.oauth2({version:'v2',auth:client}); const {data}=await oauth2.userinfo.get();
  const user=saveUserAndTokens({sub:data.id,email:data.email,name:data.name,picture:data.picture},tokens);
  req.session.userId=user.id;
  res.redirect(`${process.env.FRONTEND_URL}/?signed_in=true`);
 }catch(e){console.error('OAuth callback:',e.message);res.redirect(`${process.env.FRONTEND_URL}/?auth_error=callback_failed`);}
});
router.get('/status',(req,res)=>{
 if(!req.session.userId) return res.json({connected:false,user:null});
 const user=db.prepare('SELECT id,email,name,picture FROM users WHERE id=?').get(req.session.userId);
 const tokens=loadTokens(req.session.userId);
 if(!user || !tokens?.refresh_token){req.session.userId=null;return res.json({connected:false,user:null});}
 res.json({connected:true,user});
});
router.post('/logout',(req,res)=>{req.session.destroy(err=>{if(err)return res.status(500).json({error:'Could not sign out'});res.clearCookie('sgm.sid');res.json({ok:true});});});
module.exports=router;
