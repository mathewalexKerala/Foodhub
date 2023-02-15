/* eslint-disable no-unused-vars */
const express = require('express');
const path = require('path')
const routes = express.Router();
const adminController = require('../../controller/admin_controller/admin_api');
const multer = require("multer");
const main= require('../../helpers/main_functions');
const users = require('../../models/users');
const admins = require('../../models/admins')
const uploads = multer({
    dest: path.join(__dirname,'../public/uploads/temp/')
    // you might also want to set some limits: https://github.com/expressjs/multer#limits
  })


var apiResponse = {
    status: 404,
    message: "API not found",
    success : false,
    args: {}
}


 /*=======
Admin login validator API
========*/
 routes.post('/loginvalidate',async(req,res)=>{
  let loginuserData={}
  let apiRes = JSON.parse(JSON.stringify(apiResponse));
  apiRes.status=200
  if(req.body.user && req.body.password){
      console.log(req.body.user);
      if(main.validateEmail(req.body.user)){
          loginuserData.email = req.body.user;
      }else{
          loginuserData.username = req.body.user;
      }
      loginuserData['state.deleted']={$ne:true}
      console.log(loginuserData);
      let userData = await admins.findOne(loginuserData)
      console.log(userData);
      if(userData){
          let isLoginValid = await main.hashPasswordvalidate(req.body.password,userData.password)
          if(isLoginValid){
              let userloginUpdate = {};
              userloginUpdate.login_sess = main.randomGen(15);
              userloginUpdate.last_login = Date.now()
              req.session.login_sess_admin = userloginUpdate.login_sess;
              req.session.adminid = userData._id;
              apiRes.message = "Welcome "+userData.name.charAt(0).toUpperCase()+ userData.name.slice(1)+", redirecting you to Dashboard!";
              apiRes.success = true;
              admins.updateOne( loginuserData ,userloginUpdate).then(()=>{
                  console.log('Admin loggedin ('+userData.name+")");
              }).catch((err)=>{
                  console.log(err);
              })
          }else{
              
              apiRes.message = "Ooops! you have entered wrong credentials!";
          }
      }else{
          apiRes.message = "Ooops! you have entered wrong credentials!";
      }
  }else{
      apiRes.message = "Please enter password and username."
  }
  res.status(apiRes.status).json(apiRes)
}, )


/*=======
Checking whether loggedin or not
========*/
routes.use(adminController.loggedin_check)



 /*=======
Update user data
========*/
routes.post('/update/:id', adminController.account_control)


/*=======
Get user data API
========*/

routes.get('/getuser/:id',adminController.get_user)


/*=======
Category data API
========*/

routes.post('/category/create', uploads.single("catImg") ,adminController.category_create)


routes.get('/category/get/:cid', adminController.category_get)

routes.get('/caregory/delete/:cid',adminController.category_delete)



/*=======
product data API
========*/
/////////CREATE OR EDIT
routes.post('/product/action', uploads.array('product_images', 12) ,adminController.product_action)
routes.post('/product/action/deleteImg', adminController.product_delete_img)


routes.get('/product/delete/:cid',adminController.product_delete)

/***************
 * UPDATION OR CREATION OF COUPONS
 */
routes.post('/coupon/update',adminController.coupon_update)
routes.get('/coupon/get/:id', adminController.coupon_get)


routes.get('/coupon/delete/:cid',adminController.coupone_delete)


routes.post('/order/updateSTS',adminController.order_status)

routes.post('/order/codpaid',adminController.order_paid)

routes.post('/settings/banner/update',  uploads.single("banrImg") , adminController.banner_update)



routes.get('/banner/get/:bid',adminController.banner_bid)

routes.post('/banner/delete',adminController.banner_delete)


/*=======
Creat admin account
========*/
routes.post('/admin/create',adminController.admin_create)


 // {"username":"admin_2ld8D","password":"dxpz7QiY","email":"adil.akp1@gmail.com" hash: $2b$10$qx4Oh4fEk5Ep86Z0xag7BeHG7O9HJyTtOgVWIeXNAD2CCNsIUXB.2}


 routes.post('/admin/remove',adminController.admin_remove)
 routes.post('/admin/profile/edit',adminController.admin_profile_edit)

 routes.post('/settings',adminController.settings)



/*=======
catch 404 and forward to error handler
========*/
routes.use(adminController.apiResponse);

module.exports = routes;
