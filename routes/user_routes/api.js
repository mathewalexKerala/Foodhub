/* eslint-disable no-unused-vars */
const express = require("express");
const routes = express.Router();
const userController = require("../../controller/user_controller/user");
const { checkoutCreatePid } = require("../../controller/user_controller/user");

/*=======
Setting pre defined response for 404
========*/
var apiResponse = {
  status: 404,
  message: "API not found",
  success: false,
  args: [],
  data: {},
};

/*=======
Checking whether loggedin or not
========*/
routes.use(userController.loggedIn);

routes.post("/auth/testmode", userController.auth_TestMode);

routes.post("/searchSuggest", userController.searchSuggest);
routes.post("/getProductDetails/tocart", userController.productDetailsToCart);

routes.post(
  "/getProductDetails/tolocal",
  userController.getProductDetailsToLocal
);
/*=======
Login Validation
========*/
routes.post(
  "/loginvalidate",
  userController.loginValidate,
  userController.loginValidate_cb
);

/*=======
Signup API
========*/

routes.post("/adduser", userController.loginValidate, userController.addUser);

routes.post("/resetPassword/email", userController.resetPassword_Email);

/*======
Reset password - setting new password after verfified user
======== */

routes.post("/resetPassword/:key/:id", userController.resetPassword_id);

/*======
Checking valid user or not
======== */
routes.use(userController.testUserMode);

/*=======
username updation
========*/

routes.post("/updateuserdata", userController.updateUserData);

/*=======
Checking user is verified phone number!
========*/

/*=======
Updaing and deleting address API
========*/

routes.post(
  "/updateAddress",
  userController.checkPhoneVerified,
  userController.updateAddress
);

/*=======
getAddressData API
========*/
routes.post(
  "/getAddressData",
  userController.checkPhoneVerified,
  userController.getAddressData
);
routes.post(
  "/getAddressList",
  userController.checkPhoneVerified,
  userController.getAddressList
);

routes.post("/sentSms", userController.sentSms);
routes.post("/verifysmsotp", userController.verifySmsOtp);

routes.post("/sentemailverify", userController.sentEmailVerify);

/******
 * CHECKOUT ID GENERATOR
 */

routes.post(
  "/checkout/generateid",
  userController.checkPhoneVerified,
  userController.checkoutIdGenerator
);

routes.post(
  "/checkout/update/address",
  userController.checkPhoneVerified,
  userController.updateAddress
);

routes.post(
  "/checkout/getdata",
  userController.checkPhoneVerified,
  userController.checkoutGetData
);
routes.post(
  "/checkout/setCoupon",
  userController.checkPhoneVerified,
  userController.checkoutSetCoupon
);

//Create paymentID/orderID of Razorpay!
routes.post(
  "/checkout/createPID",
  userController.checkPhoneVerified,
  checkoutCreatePid
);
routes.post(
  "/checkout/verifyPayment",
  userController.checkPhoneVerified,
  userController.checkoutVerifyPayment
);

/***********CHECKOUT COD UPDATION */

routes.post(
  "/checkout/CODapprove",
  userController.checkPhoneVerified,
  userController.checkoutCodApprove
);

routes.post(
  "/order/cancel",
  userController.checkPhoneVerified,
  userController.checkoutOrderCancel
);

routes.post(
  "/wishlist/add",
  userController.checkPhoneVerified,
  userController.wishlistAdd
);

routes.post(
  "/wishlist/remove",
  userController.checkPhoneVerified,
  userController.wishlistRemove
);

// checkPhoneVerified add this middleware on any new methods here

/*=======
catch 404 and forward to error handler
========*/

routes.use(function (req, res, next) {
  // next(createError(404));
  res.status(apiResponse.status).json(apiResponse);
});

module.exports = routes;
