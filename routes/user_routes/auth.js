const express = require('express')
const routes = express.Router();

const userController = require('../../controller/user_controller/user')

routes.use(userController.baseLayout)


//cache clearing... 
routes.use(userController.cacheClearing);

/*=======
Checking whether loggedin or not
========*/
routes.get('/logout',userController.logout)
routes.use(userController.loggedInCheck)


routes.get('/login',userController.login)
routes.get('/register',userController.register) 
routes.get('/reset',userController.reset) 
routes.get('/reset/:key/:id',userController.resetKeyId) 


routes.get('/test',userController.testLogin)

module.exports = routes;