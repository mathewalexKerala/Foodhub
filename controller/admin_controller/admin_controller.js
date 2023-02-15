/* eslint-disable no-unused-vars */
const config = require("config");
const path = require("path");
const adminModule = require("../../middlewares/admin_login_check");
const admins = require("../../models/admins");
const users = require("../../models/users");
const categories = require("../../models/categories");
const products = require("../../models/products");
const coupons = require("../../models/coupons");
const orders = require("../../models/orders");
const banners = require("../../models/banners");
const createError = require('http-errors')
const fs = require('fs');
module.exports = {
  adminLayoutSetting:(req, res, next) => {
    res.locals.siteData = config.get("site");
    ///////CHECKING AJAX LOAD OR NOT!
    if (req.query.load) {
      req.app.set(
        "layout",
        path.join(__dirname, "../../views/layout/admin-ajax-layout")
      );
      console.log("Ajax called!");
    } else {
      req.app.set("layout", path.join(__dirname, "../../views/layout/admin-layout"));
    }
    next();
  },
  cacheCleaning:function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
next();
},
loginOrNot:async (req, res, next) => {
  let isUserLoggedin = await adminModule.authCheck(req);
  if (isUserLoggedin) {
    res.locals.userData = await admins.findOne({ _id: req.session.adminid });
    next();
  } else {
    res.redirect("/admin/login");
  }
},
adminHome:async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  let usersCount = await users.countDocuments({});
  let catCount = await categories.countDocuments({});
  let prodCount = await products.countDocuments({});
  let orderCount = await orders.countDocuments({ order_status: "completed" });
  let pendingorderCount = await orders.countDocuments({
    order_status: "pending",
  });
  let paymentpendingorderCount = await orders.countDocuments({
    "payment.payment_status": "pending",
  });
  let paymentpaidorderCount = await orders.countDocuments({
    "payment.payment_status": "completed",
  });
  let successOrders = await orders
    .find({ order_status: "completed" })
    .populate("userid")
    .sort({ ordered_date: -1 })
    .limit(15);
  let salesChartDt = await orders.aggregate([
    {
      $match: {
        ordered_date: {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$ordered_date" } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.render("./admin/index", {
    page: "home",
    pageName: "Dashboard",
    userData: res.locals.userData,
    pages: ["dashboard"],
    usersCount,
    catCount,
    prodCount,
    salesChartDt,
    orderCount,
    successOrders,
    pendingorderCount,
    paymentpendingorderCount,
    paymentpaidorderCount,
  });
},
login:async (req, res, next) => {
  let isUserLoggedin = await adminModule.authCheck(req);
  if (isUserLoggedin) {
    res.redirect("/admin/");
  } else {
    next();
  }
},
login_cb:(req, res) => {
  res.render("./admin/login", {
    page: "home",
    pageName: "Login",
    layout: "layout/admin-base-layout",
    successLoginAttempt: false,
  });
},
admin_index:async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  let usersCount = await users.countDocuments({});
  let catCount = await categories.countDocuments({});
  let prodCount = await products.countDocuments({});
  let orderCount = await orders.countDocuments({ order_status: "completed" });
  let pendingorderCount = await orders.countDocuments({
    order_status: "pending",
  });
  let paymentpendingorderCount = await orders.countDocuments({
    "payment.payment_status": "pending",
  });
  let paymentpaidorderCount = await orders.countDocuments({
    "payment.payment_status": "completed",
  });
  let successOrders = await orders
    .find({ order_status: "completed" })
    .populate("userid")
    .sort({ ordered_date: -1 })
    .limit(15);
  let salesChartDt = await orders.aggregate([
    {
      $match: {
        ordered_date: {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$ordered_date" } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.render("./admin/index", {
    page: "home",
    pageName: "Dashboard",
    userData: res.locals.userData,
    pages: ["dashboard"],
    usersCount,
    catCount,
    prodCount,
    salesChartDt,
    orderCount,
    successOrders,
    pendingorderCount,
    paymentpendingorderCount,
    paymentpaidorderCount,
  });
},
logout:(req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
},
users:async (req, res) => {
  let userslist = await users.find({ "state.deleted": { $ne: true } });

  res.render("./admin/users", {
    page: "users",
    pageName: "Users ",
    userData: res.locals.userData,
    pages: ["users"],
    userslist,
  });
},
user_update:async (req, res, next) => {
  let updateuserData = await users
    .findOne({ _id: req.params.id.toString() })
    .catch((e) => {
      next(createError(400));
    });
  if (updateuserData) {
    res.render("./admin/user-update", {
      page: "users",
      pageName: "Users ",
      userData: res.locals.userData,
      pages: ["users"],
      updateuserData,
    });
  } else {
    next(createError(404));
  }
},
categories: async (req, res) => {
  let catlist = await categories.find({});

  res.render("./admin/category", {
    page: "category",
    pageName: "Category ",
    userData: res.locals.userData,
    pages: ["category"],
    catlist,
  });
},
products:async (req, res) => {
  let prodlist = await products
    .find({ "state.deleted": { $ne: true } })
    .populate("category");
  res.render("./admin/products", {
    page: "products",
    pageName: "Products ",
    userData: res.locals.userData,
    pages: ["products"],
    prodlist,
  });
},
products_add:async (req, res) => {
  let catlist = await categories.find({});

  res.render("./admin/products-add", {
    page: "products",
    pageName: "Create Products ",
    userData: res.locals.userData,
    pages: ["products", "add"],
    catlist,
  });
},
products_edit:async (req, res, next) => {
  try {
    let catlist = await categories.find({});
    let product = await products
      .findOne({ _id: req.params.id })
      .populate("category");
    res.render("./admin/products-edit", {
      page: "products",
      pageName: "Update Products ",
      userData: res.locals.userData,
      pages: ["products", "edit", product.name],
      catlist,
      product,
    });
  } catch (err) {
    console.log(err);
    next(createError(404));
  }
},
coupons:async (req, res) => {
  let couplist = await coupons.find({}).populate("last_updated_user");
  console.log(couplist);
  res.render("./admin/coupons", {
    page: "coupons",
    pageName: "Coupons ",
    userData: res.locals.userData,
    pages: ["coupons"],
    couplist,
  });
},
orders:async (req, res) => {
  let successOrders = await orders
    .find({ order_status: "completed" })
    .populate("userid")
    .sort({ ordered_date: -1 });

  res.render("./admin/orders", {
    page: "orders",
    pageName: "Orders ",
    userData: res.locals.userData,
    pages: ["orders"],
    successOrders,
  });
},
order_id:async (req, res, next) => {
  try {
    let orderData = await orders
      .findOne({ order_status: "completed", _id: req.params.oid })
      .populate("products.product_id")
      .populate("userid");
    res.render("./admin/order-view", {
      page: "orders",
      pageName: "Order ",
      userData: res.locals.userData,
      pages: ["orders", "View"],
      orderData,
    });
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
},
invoice_oid:async (req, res, next) => {
  try {
    let orderData = await orders
      .findOne({ order_status: "completed", _id: req.params.oid })
      .populate("products.product_id")
      .populate("userid");
    res.render("./admin/invoice", {
      page: "orders",
      pageName: "Invoice ",
      userData: res.locals.userData,
      pages: ["orders", "Invoice  "],
      orderData,
      siteData: res.locals.siteData,
    });
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
},
settings_banner: async (req, res, next) => {
  let bannerList = await banners.find({});
  res.render("./admin/settings-banner", {
    page: "banner",
    pageName: "Banner Management",
    userData: res.locals.userData,
    pages: ["settings", "banner_management"],
    bannerList,
  });
},
settings_profile:async (req, res, next) => {
  res.render("./admin/profile", {
    page: "profile",
    pageName: "Account Management",
    userData: res.locals.userData,
    pages: ["settings", "profile"],
  });
},
settings_admins:async (req, res, next) => {
  let adminList = await admins.find({ "state.deleted": { $ne: true } });
  res.render("./admin/admins", {
    page: "admins",
    pageName: "Admin Management",
    userData: res.locals.userData,
    pages: ["settings", "admins"],
    adminList,
  });
},
settings:async (req, res, next) => {
  let settingsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../config/default.json"))
  );
  res.render("./admin/settings", {
    page: "admins",
    pageName: "Site Settings",
    userData: res.locals.userData,
    pages: ["settings"],
    settingsData,
  });
},
report:async (req, res, next) => {
  res.render("./admin/report-ask", {
    page: "report",
    pageName: "Report",
    userData: res.locals.userData,
    pages: ["report"],
  });
},
reports_sales:async (req, res, next) => {
  try {
    let salesData = await orders.aggregate([
      {
        $match: {
          order_status: "completed",
          $and: [
            { ordered_date: { $gt: new Date(req.body.fromDate) } },
            { ordered_date: { $lt: new Date(req.body.toDate) } },
          ],
        },
      },
      {
        $lookup: {
          foreignField: "_id",
          localField: "userid",
          from: "users",
          as: "userid",
        },
      },
      { $sort: { ordered_date: -1 } },
    ]); //.populate('userid') //.sort({ordered_date:-1})
    res.render("./admin/report-sales", {
      page: "report",
      pageName: "Sales Report",
      userData: res.locals.userData,
      pages: ["report", "sales"],
      salesData,
    });
  } catch (error) {
    console.log(error);
    next(createError(404));
  }
},
catch_error:function (req, res, next) {
  next(createError(404));
}


}

