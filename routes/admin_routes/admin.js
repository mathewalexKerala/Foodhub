const express = require("express");
const routes = express.Router();

const adminController = require('../../controller/admin_controller/admin_controller');

/*=======
Setting a layout for all admin pages
========*/
routes.use(adminController.adminLayoutSetting);

//cache clearing... 
routes.use(adminController.cacheCleaning);



/*=======
Login page
========*/
routes.get("/login",adminController.login,adminController.login_cb);

/*=======
Checking whether loggedin or not
========*/
routes.use(adminController.loginOrNot);

routes.get("/",adminController.admin_index);


routes.get("/logout", adminController.logout);
routes.get("/users", adminController.users);
routes.get("/users/update/:id", adminController.user_update);

routes.get("/categories",adminController.categories);

routes.get("/products", adminController.products);
routes.get("/products/add", adminController.products_add);
routes.get("/products/edit/:id", adminController.products_edit);

routes.get("/coupons", adminController.coupons);
routes.get("/orders", adminController.orders);
routes.get("/order/:oid",adminController.order_id );
routes.get("/invoice/:oid",adminController.invoice_oid );
routes.get("/settings/banner",adminController.settings_banner);
routes.get("/settings/profile", adminController.settings_profile);
routes.get("/settings/admins", adminController.settings_admins);
routes.get("/settings/", adminController.settings);
routes.get("/report/", adminController.report);

routes.post("/report/sales", adminController.reports_sales);

/*=======
catch 404 and forward to error handler
========*/
routes.use(adminController.catch_error);

module.exports = routes;
