const express = require('express')
const routes = express.Router();

const userController = require('../../controller/user_controller/user')
routes.use(userController.userLayout)

//cache clearing... 
routes.use(userController.cacheClearing);

/*=======
Checking whether loggehdin or not
========*/
routes.use(userController.userLoggedIn)

/*=======
Pages
========*/
routes.get('/verify',userController.verifyDash)
routes.get('/verify/:key/:id',userController.verifyKeyId)

routes.use(userController.phoneVerified)
routes.get('/profile',userController.profile)
routes.get('/settings',userController.dashSettings)
routes.get('/orders',userController.orders)
routes.get('/order/:id',userController.orderId)

routes.get('/cart',userController.cart)

routes.get('/cart/checkout/:id',userController.cartCheckoutId)

routes.get('/wishlist',userController.wishlist)

module.exports = routes;