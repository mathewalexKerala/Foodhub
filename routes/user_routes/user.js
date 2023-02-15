const express = require('express')
const routes = express.Router();


const userController = require('../../controller/user_controller/user')

routes.use(userController.userLayout)

/*=======
Checking whether loggedin or not
========*/

routes.use(userController.userLogin)

/**
 * IMG Thumb for products
 */
routes.use('/productimage/thumb/:img',userController.productThumbImage)
/*=======
Pages
========*/
routes.get('/',userController.bannerList)


routes.get('/about',userController.about)
routes.get('/shop',userController.shop)

routes.get('/product/:size/:id',userController.productSizeId)
routes.get('/contact',userController.contact)





module.exports = routes;