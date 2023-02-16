/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const Razorpay = require("razorpay");
let users = require("../../models/users");
const usersModules = require("../../middlewares/user_login_check");
const coupons = require('../../models/coupons')
const path = require("path");
const orders = require("../../models/orders");
const categories = require("../../models/categories");
const crypto =require('crypto')
const mainModule = require("../../helpers/main_functions");
const products = require("../../models/products");
const createError = require("http-errors");
const banners = require("../../models/banners");
const config = require("config");
const sharp = require("sharp");

const mongoose = require("mongoose");
var apiResponse = {
  status: 404,
  message: "API not found",
  success: false,
  args: [],
  data: {},
};
module.exports={
    loggedIn:async (req,res,next)=>{
    let isUserLoggedin = await usersModules.authCheck(req);
    if (isUserLoggedin) {
      res.locals.userData = await users.findOne({ _id: req.session.userid });
      res.locals.login = true;
      next();
    } else {
      res.locals.userData = { username: "", name: "" };
      res.locals.login = false;
      next();
    }
  },
  auth_TestMode: (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "No result found!";
    apiRes.status = 200;
    apiRes.success = false;
    let toUpdate = {};
    let userData = {
      name: "test user",
    };
    let dataToSearch = { username: "test_user" };
    let loginuserData = { username: "test_user" };

    if (config.get("server.test_mode.state")) {
      toUpdate.login_sess = mainModule.randomGen(15);
      toUpdate.last_login = Date.now();
      req.session.login_sess = toUpdate.login_sess;
      req.session.userid = config.get("server.test_mode.user_id");
      users
        .updateOne(dataToSearch, toUpdate)
        .then(() => {
          let userloginUpdate = {};
          userloginUpdate.login_sess = mainModule.randomGen(15);
          userloginUpdate.last_login = Date.now();
          req.session.login_sess_admin = userloginUpdate.login_sess;
          req.session.adminid = config.get("server.test_mode.admin_id");
          apiRes.success = true;
          admins
            .updateOne(loginuserData, userloginUpdate)
            .then(() => {
              apiRes.message =
                "Welcome " +
                userData.name +
                ", You have granted access to the pages listed below!";
              console.log("Admin loggedin (" + userData.name + ")");
              apiRes.success = true;
              res.status(apiRes.status).json(apiRes);
            })
            .catch((err) => {
              console.log(err);
              apiRes.message = "Something went wrong!";
              res.status(apiRes.status).json(apiRes);
            });
        })
        .catch((err) => {
          console.log(err);
          apiRes.message = "Something went wrong!";
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      apiRes.message = "Test user is disabled!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  searchSuggest: async (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "No result found!";
    apiRes.status = 200;
    apiRes.success = false;
    let sResult = [];
    let skey = req.body.q;
    try {
      if (req.body.q) {
        let regex = new RegExp("^" + skey + ".*", "i");
        let productlist = await products.aggregate([
          {
            $match: {
              $or: [
                { name: regex },
                { discription: regex },
                { specification: regex },
                { tags: regex },
              ],
              "state.deleted": { $ne: true },
            },
          },
        ]);
        productlist.forEach((val, i) => {
          sResult.push({ title: val.name, type: "Product", id: val._id });
        });
        let catlist = await categories.aggregate([
          { $match: { $or: [{ name: regex }, { tags: regex }] } },
        ]);
        catlist.forEach((val, i) => {
          sResult.push({ title: val.name, type: "Category", id: val._id });
        });
        if (sResult.length > 0) {
          apiRes.success = true;
          apiRes.message = "Found result!";
        }
      }
      apiRes.data = sResult;
    } catch (error) {
      console.log(error);
      apiRes.message = "Internal Error!";
    } finally {
      res.status(apiRes.status).json(apiRes);
    }
  },
  productDetailsToCart: async (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "No result found!";
    apiRes.status = 200;
    apiRes.success = false;
    let cartData = JSON.parse(req.body.cart);
    let cartIdArr = cartData.map((val) => {
      return mongoose.Types.ObjectId(val.id);
    });
    try {
      if (req.body.cart) {
        // let productlist = await products.aggregate([{$match:{_id:{$in:cartIdArr}}}])
        let productlist = await products.aggregate([
          { $unwind: "$sizes" },
          { $match: { "sizes._id": { $in: cartIdArr } } },
        ]);
        if (productlist) {
          let dataToUpload = [];
          apiRes.data = productlist.map((val, i) => {
            let thisQnty = cartData.reduce((qnty, val2) => {
              if (val2.id.toString() == val.sizes._id.toString()) {
                qnty = val2.qnty;
              }
              return qnty;
            }, 0);
            dataToUpload.push({
              product_id: val.sizes._id,
              quantity: thisQnty,
            });
            let dataTOreturn = {
              id: val.sizes._id,
              name: val.name,
              price: val.sizes.price,
              size: val.sizes.name,
              qnty: thisQnty,
              total: thisQnty * val.sizes.price,
              limit: val.sizes.stock,
            };
            if (val.image[0]) {
              //set img only if it's exist
              dataTOreturn.image = val.image[0];
            }
            return dataTOreturn;
          });
          apiRes.success = true;
          apiRes.message = "Found Products!";
          if (res.locals.login) {
            users
              .updateOne(
                { _id: res.locals.userData._id },
                { $set: { cart: dataToUpload } }
              )
              .then((data) => {
                apiRes.message = "Cart updated!";
                console.log("Cart updated!");
                console.log(data);
              })
              .catch((err) => {
                apiRes.message =
                  "Internal server error! but updated to client area cart!";
                console.log(err);
              });
          }
        } else {
          apiRes.message = "No data found!";
        }
      } else {
        apiRes.message = "No data found!";
      }
    } catch (error) {
      console.log(error);
      apiRes.message = "Internal Error!";
    } finally {
      res.status(apiRes.status).json(apiRes);
    }
  },
  getProductDetailsToLocal: async (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "No result found!";
    apiRes.status = 200;
    apiRes.success = false;
    try {
      apiRes.message = "Data fetch success!";
      apiRes.success = true;
      if (res.locals.login) {
        apiRes.data = res.locals.userData.cart;
      } else {
        apiRes.data = [];
      }
      console.log(apiRes.data);
    } catch (error) {
      apiRes.message = "Error while trying to accessing the cart!";
    } finally {
      res.status(apiRes.status).json(apiRes);
    }
  },
  loginValidate: (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    if (res.locals.login) {
      apiRes.message = "You have already logged in!";
      res.status(200).json(apiRes);
    } else {
      next();
    }
  },
  loginValidate_cb: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));

    // res.render('./admin/login', {page:'home', pageName:"Login", layout:'layout/admin-base-layout', successLoginAttempt:false})
    let dataToSearch = {
      "state.deleted": { $ne: true },
    };
    let toUpdate = {};
    apiRes.status = 200;
    if (mainModule.validateEmail(req.body.user)) {
      dataToSearch.email = req.body.user;
    } else {
      dataToSearch.username = req.body.user;
    }
    userData = await users.findOne(dataToSearch);
    if (userData) {
      let isHashValid = await mainModule.hashPasswordvalidate(
        req.body.password,
        userData.password
      );
      if (isHashValid) {
        apiRes.message =
          "Welcome " + userData.name + ", Redirecting you to the home page!";
        apiRes.success = true;
        toUpdate.login_sess = mainModule.randomGen(15);
        toUpdate.last_login = Date.now();
        req.session.login_sess = toUpdate.login_sess;
        req.session.userid = userData._id;
        users
          .updateOne(dataToSearch, toUpdate)
          .then(() => console.log("Data updated"))
          .catch((err) => console.log(err));
      } else {
        apiRes.message = "Oops! you have entered a wrong credentials!";
        apiRes.success = false;
      }
    } else {
      apiRes.message = "Oops! you have entered a wrong credentials!";
      apiRes.success = false;
    }
    res.status(apiRes.status).json(apiRes);
  },
  addUser: (req, res) => {
    let doSignup = false;
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;

    if (
      req.body.name &&
      req.body.email &&
      req.body.phone &&
      req.body.password &&
      req.body.repassword
    ) {
      if (req.body.password == req.body.repassword) {
        if (req.body.password.length >= 8) {
          if (mainModule.validateEmail(req.body.email)) {
            if (req.body.phone.length == 10) {
              doSignup = true;
              apiRes.code = 22000;
            } else {
              apiRes.message = "Only accept indian numbers!!";
              apiRes.code = 11002;
            }
          } else {
            apiRes.message = "User validation failed!";
            apiRes.code = 11002;
          }
        } else {
          apiRes.message = "Password is too short! minimum 8 letters!";
          apiRes.code = 110012;
        }
      } else {
        apiRes.message = "Password didn't match";
        apiRes.code = 11001;
      }
    } else {
      apiRes.code = 11000;
      apiRes.message = "User validation failed!";

      res.status(apiRes.status).json(apiRes);
    }

    if (doSignup == true) {
      let userloginUpdate = {};
      userloginUpdate.login_sess = mainModule.randomGen(15);
      userloginUpdate.last_login = Date.now();
      req.session.login_sess = userloginUpdate.login_sess;

      const newUser = new users({
        username:
          req.body.name.replace(/ /g, "").toLowerCase() +
          "_" +
          mainModule.randomGen(10).toLowerCase(),
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        login_sess: userloginUpdate.login_sess,
        last_login: userloginUpdate.last_login,
        password: mainModule.hashPassword(req.body.password),
      });
      newUser
        .save()
        .then((data) => {
          req.session.userid = data._id;

          apiRes.message = "User account created successfully!";
          apiRes.success = true;
        })
        .catch((err) => {
          console.log(err);
          if (err.code == 11000) {
            if (err.keyPattern.email) {
              apiRes.message =
                "Email " + err.keyValue.email + " already exists!";
              apiRes.code = 11003;
            } else if (err.keyPattern.phone) {
              apiRes.message =
                "phone " + err.keyValue.phone + " already exists!";
              apiRes.code = 11004;
            } else {
              apiRes.message = "Server error detected";
              apiRes.code = 11005;
            }
          } else {
            apiRes.status = 500;
            apiRes.code = 11006;
            apiRes.message = "Error updating data";
          }
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  resetPassword_Email: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No valid data recieved!";
    apiRes.success = false;
    if (req.body.email) {
      if (mainModule.validateEmail(req.body.email)) {
        let isUserExist = await users.findOne({ email: req.body.email });
        if (isUserExist) {
          let key = mainModule.randomGen(15);
          users
            .updateOne({ _id: isUserExist._id }, { $set: { email_id: key } })
            .then(() => {
              let data = {};
              data.mailOptions = {
                from: "mathewalex557@gmail.com",
                to: isUserExist.email,
                subject: "Reset Password",
                html: `<h2>Reset Password</h2> <p>To reset the password, we have to conform that your aware and authorized to change the password, use the link provided below to change the password! </p>
                    Reset: <a href="${req.protocol}://${req.hostname}/auth/reset/${key}/${isUserExist._id}"> Click here </a>`,
              };
              mainModule.mailer(data);
              apiRes.message =
                "Verification email sent to " + data.mailOptions.to;
              apiRes.success = true;
            })
            .catch((err) => {
              apiRes.message = "Internal error detected, try again later!";
            })
            .then(() => {
              res.status(apiRes.status).json(apiRes);
            });
        } else {
          apiRes.message = "No account found!";
          apiRes.success = false;
          res.status(apiRes.status).json(apiRes);
        }
      } else {
        apiRes.message = "Invalid email!";
        res.status(apiRes.status).json(apiRes);
      }
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  resetPassword_id: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No valid data recieved!";
    apiRes.success = false;
    if (req.body.password && req.body.repassword) {
      if (req.body.password == req.body.repassword) {
        try {
          let uData = await users.findOne({ _id: req.params.id });
          if (uData) {
            if (uData.email_id == req.params.key) {
              let password = await mainModule.hashPassword(req.body.password);
              users
                .updateOne(
                  { _id: uData._id },
                  { password, email_id: "", email_verified: true }
                )
                .then(() => {
                  apiRes.message = "New password updated!";
                  apiRes.success = true;
                })
                .catch((err) => {
                  console.log(err);
                  apiRes.message = "Internal error detucted! try again later..";
                })
                .then(() => {
                  res.status(apiRes.status).json(apiRes);
                });
            } else {
              apiRes.message =
                "We couldn't verify you, please try again later!";
              res.status(apiRes.status).json(apiRes);
            }
          }
        } catch (err) {
          console.log(err);
          apiRes.message = "We couldn't verify you, please try again later!";
          res.status(apiRes.status).json(apiRes);
        }
      } else {
        apiRes.message = "Password didn't match!";
        res.status(apiRes.status).json(apiRes);
      }
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  testUserMode: (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    if (res.locals.login) {
      if (res.locals.userData.username != "test_user") {
        next();
      } else {
        apiRes.message =
          "You are in test mode of this website, signup to get full access!";
        res.status(200).json(apiRes);
      }
    } else {
      apiRes.message = "You have not authorized to access!!";
      res.status(200).json(apiRes);
    }
  },
  updateUserData: async (req, res) => {
    let readyToUpdate = false;
    let readyToDelete = false;
    let dataToUpdate = {};
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";

    if (req.body.phone) {
      if (req.body.phone.length == 10) {
        readyToUpdate = true;
        dataToUpdate.phone = req.body.phone;
        dataToUpdate.phone_verified = false;
      } else {
        apiRes.message = "Invalid phone number, only accepts indian number";
      }
    }
    if (res.locals.userData.phone_verified) {
      // ONLY IF USER VERIFIED PHONE NUMBER!

      if (req.body.username) {
        if (req.body.username.length >= 4) {
          readyToUpdate = true;
          dataToUpdate.username = req.body.username.toString();
        } else {
          apiRes.message = "Username is too small and not available!";
        }
      }
      if (req.body.name) {
        if (req.body.name.length >= 4) {
          readyToUpdate = true;
          dataToUpdate.name = req.body.name.toString();
        } else {
          apiRes.message = "Username is too small and not available!";
        }
      }
      if (req.body.password) {
        if (req.body.password === req.body.repassword) {
          if (req.body.password.length >= 8) {
            readyToUpdate = true;
            dataToUpdate.password = await mainModule.hashPassword(
              req.body.password
            );
          } else {
            apiRes.message = "Password must contain 8 letters!";
          }
        } else {
          apiRes.message = "Password didn't match, try again!";
        }
      }

      if (req.body.email) {
        if (mainModule.validateEmail(req.body.email)) {
          readyToUpdate = true;
          dataToUpdate.email = req.body.email.toString();
          dataToUpdate.email_verified = false;
        } else {
          apiRes.message = "Invalid email format!";
        }
      }
      if (req.body.deleteaccount) {
        console.log("req.body.deleteaccount: " + req.body.deleteaccount);
        if (req.body.deleteaccount == "dodelete") {
          readyToDelete = true;
        } else {
          apiRes.message = "You have declined the action!";
        }
      }
    } else {
      if (readyToDelete == false && readyToUpdate == false) {
        // SENT ERROR ONLY IF THERE IS NOTHING TO UPDATE WHICH IS NOT REQUIRED THE PHONE VERIFICATION LIKE PHONE NUMBER
        apiRes.message = "Phone number verification is required!";
        res.status(200).json(apiRes);
      }
    }
    if (readyToUpdate) {
      users
        .updateOne({ _id: res.locals.userData._id }, { $set: dataToUpdate })
        .then(() => {
          apiRes.message = "User account updated successfully!";
          apiRes.success = true;
        })
        .catch((err) => {
          console.log(err);
          if (err.code == 11000) {
            if (err.keyPattern.email) {
              apiRes.message =
                "Email " + err.keyValue.email + " already exists!";
              apiRes.code = 11003;
            } else if (err.keyPattern.phone) {
              apiRes.message =
                "phone " + err.keyValue.phone + " already exists!";
              apiRes.code = 11004;
            } else if (err.keyPattern.username) {
              apiRes.message =
                "username " + err.keyValue.username + " already exists!";
              apiRes.code = 11005;
            } else {
              apiRes.message = "Server error Detucted";
              apiRes.code = 11006;
            }
          } else {
            apiRes.status = 500;
            apiRes.code = 11007;
            apiRes.message = "Error updating data";
          }
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else if (readyToDelete) {
      users
        .updateOne(
          { _id: res.locals.userData._id },
          { $set: { "state.deleted": true } }
        )
        .then(() => {
          apiRes.message = "User account deleted successfully!";
          apiRes.success = true;
        })
        .catch((err) => {
          apiRes.message =
            "internal error detucted while deleting the account!";
          console.log(err);
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  updateAddress: async function (req, res) {
    let readyToUpdate = false;
    let readyToDelete = false;
    let dataToCreate = {}; //address:{$:{}}
    let dataToUpdate = {};
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;
    if (req.body.action == "create" || req.body.action == "update") {
      if (
        req.body.name &&
        req.body.house &&
        req.body.post &&
        req.body.city &&
        req.body.district &&
        req.body.state &&
        req.body.pin &&
        req.body.action
      ) {
        if (req.body.name.length >= 4) {
          if (req.body.house.length >= 4) {
            if (req.body.post.length >= 3) {
              if (req.body.city.length >= 3) {
                if (req.body.district.length >= 3) {
                  if (req.body.state.length >= 3) {
                    if (req.body.pin.length == 6) {
                      readyToUpdate = true;
                      dataToUpdate = {
                        "address.$.name": req.body.name,
                        "address.$.house": req.body.house,
                        "address.$.city": req.body.city,
                        "address.$.post": req.body.post,
                        "address.$.district": req.body.district,
                        "address.$.state": req.body.state,
                        "address.$.pin": req.body.pin,
                      };
                      dataToCreate.name = req.body.name;
                      dataToCreate.house = req.body.house;
                      dataToCreate.city = req.body.city;
                      dataToCreate.post = req.body.post;
                      dataToCreate.district = req.body.district;
                      dataToCreate.state = req.body.state;
                      dataToCreate.pin = req.body.pin;
                    } else {
                      apiRes.message =
                        "Invalid pin, tell us your right pin code!";
                    }
                  } else {
                    apiRes.message = "Invalid state, tell us your right state!";
                  }
                } else {
                  apiRes.message =
                    "Invalid district, tell us your right district!";
                }
              } else {
                apiRes.message = "Invalid city, tell us your right city!";
              }
            } else {
              apiRes.message = "Invalid Post, tell us your right post!";
            }
          } else {
            apiRes.message = "Invalid house, tell us your right house name!";
          }
        } else {
          apiRes.message = "Invalid name, tell us your right name!";
        }
      } else {
        apiRes.message = "Some datas are missing!";
      }
    } else if (req.body.action == "delete") {
      readyToDelete = true;
    } else {
      apiRes.message = "Invalid action, try again later...!";
    }

    if (readyToUpdate) {
      if (req.body.action == "create") {
        users
          .updateOne(
            { _id: res.locals.userData._id },
            { $push: { address: dataToCreate } }
          )
          .then(() => {
            apiRes.success = true;
            apiRes.message = "Address added successfully!";
          })
          .catch((err) => {
            console.log(err);
            apiRes.message = "Internal error detucted, try again later...";
          })
          .then(() => {
            res.status(apiRes.status).json(apiRes);
          });
      } else if (req.body.action == "update") {
        if (req.body.id) {
          users
            .updateOne(
              { _id: res.locals.userData._id, "address._id": req.body.id },
              { $set: dataToUpdate }
            )
            .then(() => {
              apiRes.success = true;
              apiRes.message = "Address updated successfully!";
            })
            .catch((err) => {
              console.log(err);
              apiRes.message = "Internal error detucted, try again later...";
            })
            .then(() => {
              res.status(apiRes.status).json(apiRes);
            });
        } else {
          apiRes.message = "No id available!";
        }
      }
    } else if (readyToDelete) {
      if (req.body.id) {
        users
          .updateOne(
            { _id: res.locals.userData._id },
            { $pull: { address: { _id: req.body.id } } }
          )
          .then((data) => {
            console.log(data);
            apiRes.success = true;
            apiRes.message = "Address Deleted successfully!";
          })
          .catch((err) => {
            console.log(err);
            apiRes.message = "Internal error detucted, try again later...";
          })
          .then(() => {
            res.status(apiRes.status).json(apiRes);
          });
      } else {
        apiRes.message = "No id available!";
      }
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  getAddressData: (req, res) => {
    let dataToShow = {};
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;

    if (req.body.addressid) {
      dataToShow = res.locals.userData.address[req.body.addressid];
      apiRes.data.address = dataToShow;
      apiRes.message = "Data fetch success!";
      apiRes.success = true;
    } else {
      apiRes.message = "Internal error detucted!";
      apiRes.success = false;
    }
    res.status(apiRes.status).json(apiRes);
  },
  getAddressList: (req, res) => {
    let dataToShow = [];
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;

    dataToShow = res.locals.userData.address;
    apiRes.data.addressList = dataToShow;
    apiRes.message = "Data fetch success!";
    apiRes.success = true;

    res.status(apiRes.status).json(apiRes);
  },
  sentSms: function (req, res) {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;
    try {
      if (res.locals.userData.phone_verified == false) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTHTOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SID;
        const client = require("twilio")(accountSid, authToken);

        client.verify.v2
          .services(verifySid)
          .verifications.create({
            to: "+91" + res.locals.userData.phone,
            channel: "sms",
          })
          .then((verification) => {
            apiRes.message = "OTP sent to " + verification.to;
            apiRes.success = true;
          })
          .catch((err) => {
            console.log(err);
            apiRes.message =
              "Error detucted while trying to send OTP! try again later..";
          })
          .then(() => {
            res.status(apiRes.status).json(apiRes);
          });
      } else {
        apiRes.message = "You are already verified your phone!";
        res.status(apiRes.status).json(apiRes);
      }
    } catch (error) {
      console.log(error);
      apiRes.message =
        "Error detucted while trying to send OTP! try again later..";
      res.status(apiRes.status).json(apiRes);
    }
  },
  verifySmsOtp: function (req, res) {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;

    if (res.locals.userData.phone_verified == false) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTHTOKEN;
      const verifySid = process.env.TWILIO_VERIFY_SID;
      const client = require("twilio")(accountSid, authToken);
      const otpCode = req.body.otp;

      client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to: "+91" + res.locals.userData.phone,
          code: otpCode,
        })
        .then((verification_check) => {
          console.log(verification_check.status);
          if (verification_check.status == "approved") {
            apiRes.message =
              verification_check.status + ": Phone number validated!";
            apiRes.success = true;
            apiRes.verified = "phone";
            users
              .updateOne(
                { _id: res.locals.userData._id },
                { $set: { phone_verified: true } }
              )
              .then(() => {
                console.log("Updated");
              });
          } else {
            apiRes.message = "You have entered an invalid OTP, try again!";
          }
        })
        .catch((err) => {
          console.log(err);
          apiRes.message =
            "Invalid OTP or something went wrong, try again later..";
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      apiRes.message = "You are already verified your phone!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  sentEmailVerify: (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    apiRes.message = "No data recieved!";
    apiRes.success = false;
    if (res.locals.userData.email_verified == false) {
      let key = mainModule.randomGen(15);
      users
        .updateOne(
          { _id: res.locals.userData._id },
          { $set: { email_id: key } }
        )
        .then(() => {
          let data = {};
          data.mailOptions = {
            from: process.env.EMAIL_USER,
            to: res.locals.userData.email,
            subject: "Verification Email",
            html: `<h2>Verify Email</h2> <p>To verify your email account please click on the link provided below.</p>
            Verify: <a href="${req.protocol}://${req.hostname}/dash/verify/${key}/${res.locals.userData._id}"> Click here </a>`,
          };
          mainModule.mailer(data);
          apiRes.message = "Verification email sent to " + data.mailOptions.to;
          apiRes.success = true;
          // apiRes.verified = 'email';
        })
        .catch((err) => {
          apiRes.message = "Internal error detucted!";
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      apiRes.message = "You are already verified your phone!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutIdGenerator: async (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "No result found!";
    apiRes.status = 200;
    apiRes.success = false;
    let cartProducts = [];
    let toatalBill = 0;
    try {
      let cartData = await users.findById(res.locals.userData._id);
      let cartIdArr = cartData.cart.map((val) => {
        return val.product_id;
      });
      if (cartIdArr.length > 0) {
        if (cartData) {
          let productlist = await products.aggregate([
            { $unwind: "$sizes" },
            { $match: { "sizes._id": { $in: cartIdArr } } },
          ]);
          if (productlist) {
            cartProducts = productlist.map((val, i) => {
              let thisQnty = cartData.cart.reduce((qnty, val2) => {
                if (val2.product_id.toString() == val.sizes._id.toString()) {
                  qnty = val2.quantity;
                }
                return qnty;
              }, 0);
              let dataTOreturn = {
                product_id: val._id,
                name: val.name,
                size: val.sizes.name,
                qnty: thisQnty,
                price: val.sizes.price,
              };
              toatalBill += thisQnty * val.sizes.price;
              return dataTOreturn;
            });
            let dataToDB = {
              userid: res.locals.userData._id,
              address:
                res.locals.userData.address[
                  res.locals.userData.address.length - 1
                ],
              bill_amount: toatalBill,
              products: cartProducts,
              coupen: { discount: 0 },
            };
            console.log(
              res.locals.userData.address[
                res.locals.userData.address.length - 1
              ]
            );
            let newOrder = new orders(dataToDB);
            newOrder
              .save()
              .then((data) => {
                apiRes.success = true;
                apiRes.message = "Found Products!";
                apiRes.data = {
                  id: data._id,
                };
              })
              .catch((err) => {
                console.log(err);
                apiRes.message = "Internal server error!";
              })
              .then(() => {
                res.status(apiRes.status).json(apiRes);
              });
          } else {
            apiRes.message = "No data found!";
            res.status(apiRes.status).json(apiRes);
          }
        } else {
          apiRes.message = "No data found!";
          res.status(apiRes.status).json(apiRes);
        }
      } else {
        apiRes.message = "Cart is empty!";
        res.status(apiRes.status).json(apiRes);
      }
    } catch (error) {
      console.log(error);
      apiRes.message = "Internal Error!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutUpdateAddress: (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    let readyToUpdate = false;
    apiRes.message = "Invalid query!";
    apiRes.status = 200;
    apiRes.success = false;
    let addressToCheckout = {};
    if (req.body.selectedAddress && req.body.id) {
      apiRes.message = "No result found!";
      res.locals.userData.address.forEach((val, i) => {
        if (
          val._id.toString() ===
          req.body.selectedAddress.toString().substring(5)
        ) {
          addressToCheckout = val;
          console.log(addressToCheckout);
          readyToUpdate = true;
        }
      });
      if (readyToUpdate) {
        orders
          .updateOne(
            {
              _id: req.body.id,
              userid: res.locals.userData._id,
              order_status: "pending",
            },
            {
              $set: {
                address: {
                  name: addressToCheckout.name,
                  house: addressToCheckout.house,
                  post: addressToCheckout.post,
                  city: addressToCheckout.city,
                  district: addressToCheckout.district,
                  state: addressToCheckout.state,
                  pin: addressToCheckout.pin,
                },
              },
            }
          )
          .then(() => {
            apiRes.message = "Updated Address!";
            apiRes.success = true;
          })
          .catch((err) => {
            console.log(err);
            apiRes.message = "Internal Error detuceted!";
          })
          .then(() => {
            res.status(apiRes.status).json(apiRes);
          });
      }
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutGetData: (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    let readyToUpdate = false;
    apiRes.message = "Invalid query!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.id) {
      orders
        .findOne({
          _id: req.body.id,
          userid: res.locals.userData._id,
          order_status: "pending",
        })
        .then((data) => {
          if (data) {
            apiRes.data = data;
            apiRes.message = "Successfully verified user and served data!";
            apiRes.success = true;
          } else {
            apiRes.message = "Verification error!";
          }
        })
        .catch((err) => {
          console.log(err);
        })
        .then(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutSetCoupon: (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message =
      "Seems you have claimed the coupon already or it's an invalid coupon!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.id && req.body.ccode) {
      coupons
        .findOne({
          code: req.body.ccode,
          used_users: { $nin: [res.locals.userData._id] },
        })
        .then((data) => {
          if (data) {
            if (data.expire >= new Date()) {
              //CHECKING EXPIRED OR NOT
              orders
                .findOne({
                  _id: req.body.id,
                  userid: res.locals.userData._id,
                  order_status: "pending",
                })
                .then((orderData) => {
                  if (orderData.bill_amount > data.min_bill) {
                    //CHECKING BILL AMOUNT
                    orders
                      .updateOne(
                        {
                          _id: req.body.id,
                          userid: res.locals.userData._id,
                          order_status: "pending",
                        },
                        {
                          $set: {
                            coupen: {
                              code: data.code,
                              name: data.name,
                              discount: data.discount,
                              ptype: data.pType,
                            },
                          },
                        }
                      )
                      .then(async () => {
                        await coupons.updateOne(
                          { _id: data._id },
                          { $addToSet: { used_users: res.locals.userData._id } }
                        );
                        apiRes.data = data;
                        apiRes.message = "Applied discount to your bill!";
                        apiRes.success = true;
                      })
                      .catch((err) => {
                        console.log(err);
                        apiRes.message = "Error while applying coupon!";
                      })
                      .then(() => {
                        res.status(apiRes.status).json(apiRes);
                      });
                  } else {
                    apiRes.message = "You are not eligible to use this coupon!";
                    res.status(apiRes.status).json(apiRes);
                  }
                })
                .catch((err) => {
                  console.log(err);
                  apiRes.message =
                    "Seems you are not authorised to add coupon to this order!";
                  res.status(apiRes.status).json(apiRes);
                });
            } else {
              apiRes.message = "Coupon Expired, Try another one!";
              res.status(apiRes.status).json(apiRes);
            }
          } else {
            apiRes.message =
              "Invalid coupon or you have already used this coupon once!";
            res.status(apiRes.status).json(apiRes);
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      if (req.body.id) {
        orders
          .findOneAndUpdate(
            {
              _id: req.body.id,
              userid: res.locals.userData._id,
              order_status: "pending",
            },
            {
              $set: {
                coupen: {
                  code: "nocode",
                  name: "noname",
                  discount: 0,
                  ptype: "nodata",
                },
              },
            },
            { returnDocument: "before" }
          )
          .then(async (data) => {
            await coupons.updateOne(
              { code: data.coupen.code },
              { $pull: { used_users: res.locals.userData._id } }
            );
            apiRes.message = "Coupon removed!";
            apiRes.success = true;
          })
          .catch((err) => {
            apiRes.message =
              "Error detucted while removing coupon from your order!";
            console.log(err);
          })
          .then(() => {
            apiRes.message = "coupon removed!";
            res.status(apiRes.status).json(apiRes);
          });
      } else {
        res.status(apiRes.status).json(apiRes);
      }
    }
  },
  checkoutCreatePid: async (req, res) => {
    let razInstance = new Razorpay({
      key_id: process.env.RAZ_KEY_ID,
      key_secret: process.env.RAZ_SECRET_KEY,
    });

    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Invalid order!";
    apiRes.status = 200;
    apiRes.success = false;

    if (req.body.id) {
      try {
        let orderData = await orders.findOne({
          _id: req.body.id,
          userid: res.locals.userData._id,
          order_status: "pending",
        });
        if (orderData) {
          let totalBill = 0;
          if (orderData.coupen.ptype == "inr") {
            totalBill =
              Math.round(orderData.bill_amount - orderData.coupen.discount) +
              "00";
          } else {
            totalBill =
              Math.round(
                orderData.bill_amount -
                  (orderData.bill_amount * orderData.coupen.discount) / 100
              ) + "00";
          }
          let options = {
            amount: parseInt(totalBill), // amount in the smallest currency unit
            currency: "INR",
            receipt: orderData._id,
          };
          razInstance.orders.create(options, function (err, order) {
            if (err) {
              console.log(err);
              apiRes.message = "Something went wrong!";
              res.status(apiRes.status).json(apiRes);
            } else {
              if (order.status == "created") {
                apiRes.message = "Created order id Successfully!";
                apiRes.success = true;
                apiRes.data = {
                  oid: order.id,
                  amount: order.amount,
                  razKey: process.env.RAZ_KEY_ID,
                };
                orders
                  .updateOne(
                    { _id: req.body.id },
                    {
                      $set: {
                        "payment.payment_order_id": order.id,
                        "payment.payment_method": "razorpay",
                      },
                    }
                  )
                  .then(() => {
                    res.status(apiRes.status).json(apiRes);
                  })
                  .catch((err) => {
                    apiRes.message = "Something went wrong!";
                    apiRes.success = false;
                    apiRes.data = {};
                    res.status(apiRes.status).json(apiRes);
                  });
              } else {
                apiRes.message = "Something went wrong!";
                res.status(apiRes.status).json(apiRes);
              }
            }
          });
        } else {
          apiRes.message = "Something went wrong!";
          res.status(apiRes.status).json(apiRes);
        }
      } catch (error) {
        apiRes.message = "Something went wrong!";
        console.log(error);
        res.status(apiRes.status).json(apiRes);
      }
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutVerifyPayment: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Invalid payment or something went wrong!";
    apiRes.status = 200;
    apiRes.success = false;

    if (
      req.body.raz_id &&
      req.body.raz_oid &&
      req.body.raz_sign &&
      req.body.id
    ) {
      console.log(req.body);
      orders
        .findOne({
          _id: req.body.id,
          userid: res.locals.userData._id,
          order_status: "pending",
          "payment.payment_order_id": req.body.raz_oid,
        })
        .then((data) => {
          if (data) {
            let body = req.body.raz_oid + "|" + req.body.raz_id;

            var expectedSignature = crypto
              .createHmac("sha256", process.env.RAZ_SECRET_KEY)
              .update(body.toString())
              .digest("hex");
            console.log("sig received ", req.body.raz_sign);
            console.log("sig generated ", expectedSignature);
            if (expectedSignature === req.body.raz_sign) {
              orders
                .updateOne(
                  { _id: req.body.id },
                  {
                    $set: {
                      "payment.payment_status": "completed",
                      order_status: "completed",
                      "payment.payment_id": req.body.raz_id,
                      "delivery_status.ordered.state": true,
                      "delivery_status.ordered.date": Date.now(),
                    },
                  }
                )
                .then(async () => {
                  apiRes.message = "Payment verified Successfully!";
                  apiRes.success = true;
                  await users.updateOne(
                    { _id: res.locals.userData._id },
                    { $set: { cart: [] } }
                  );
                })
                .catch((err) => {
                  apiRes.message =
                    "Payment verified Successfully, but couldn't update! please contact support ASAP!";
                  console.log(err);
                })
                .finally(() => {
                  res.status(apiRes.status).json(apiRes);
                });
            } else {
              apiRes.message = "Payment couldn't verified, Try again!!";
              res.status(apiRes.status).json(apiRes);
            }
          } else {
            res.status(apiRes.status).json(apiRes);
          }
        })
        .catch((err) => {
          res.status(apiRes.status).json(apiRes);
          console.log(err);
        });
    } else {
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutCodApprove: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Invalid payment or something went wrong!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.id) {
      let orderData = await orders.findOne({
        _id: req.body.id,
        userid: res.locals.userData._id,
        order_status: "pending",
      });
      if (orderData) {
        orders
          .updateOne(
            { _id: req.body.id },
            {
              $set: {
                order_status: "completed",
                "payment.payment_id": "COD_" + req.body.id,
                "payment.payment_order_id": "COD_noOID",
                "payment.payment_method": "cash_on_delivery",
                "delivery_status.ordered.state": true,
                "delivery_status.ordered.date": Date.now(),
              },
            }
          )
          .then(async () => {
            apiRes.message = "Order placed Successfully!";
            apiRes.success = true;
            await users.updateOne(
              { _id: res.locals.userData._id },
              { $set: { cart: [] } }
            );
          })
          .catch((err) => {
            apiRes.message = "Internal error detucted, try again later!";
            console.log(err);
          })
          .finally(() => {
            res.status(apiRes.status).json(apiRes);
          });
      } else {
        apiRes.message = "Something went wrong!";
        res.status(apiRes.status).json(apiRes);
      }
    } else {
      apiRes.message = "Something went wrong!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  checkoutOrderCancel: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Invalid payment or something went wrong!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.id) {
      let orderData = await orders.findOne({
        _id: req.body.id,
        userid: res.locals.userData._id,
        order_status: "completed",
      });
      if (orderData) {
        orders
          .updateOne(
            { _id: req.body.id },
            {
              $set: {
                "delivery_status.cancelled.state": true,
                "delivery_status.cancelled.date": Date.now(),
              },
            }
          )
          .then(async () => {
            apiRes.message = "Order cancelled Successfully!";
            apiRes.success = true;
            await users.updateOne(
              { _id: res.locals.userData._id },
              { $set: { cart: [] } }
            );
          })
          .catch((err) => {
            apiRes.message = "Internal error detucted, try again later!";
            console.log(err);
          })
          .finally(() => {
            res.status(apiRes.status).json(apiRes);
          });
      } else {
        apiRes.message = "Seems it's an invalid order!";
        res.status(apiRes.status).json(apiRes);
      }
    } else {
      apiRes.message = "Invalid argument passed!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  wishlistAdd: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Something went wrong!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.toWish) {
      users
        .updateOne(
          { _id: res.locals.userData._id },
          { $addToSet: { wishlist: req.body.toWish } }
        )
        .then(() => {
          apiRes.message = "Saved the product to your wishlist!";
          apiRes.success = true;
        })
        .catch(() => {
          apiRes.message = "Something went wrong!";
        })
        .finally(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      apiRes.message = "Something went wrong!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  wishlistRemove: async (req, res) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.message = "Something went wrong!";
    apiRes.status = 200;
    apiRes.success = false;
    if (req.body.wishid) {
      users
        .updateOne(
          { _id: res.locals.userData._id },
          { $pull: { wishlist: req.body.wishid } }
        )
        .then(() => {
          apiRes.message = "Removed the product from wishlist!";
          apiRes.success = true;
          apiRes.data.wishlen = res.locals.userData.wishlist.length - 1;
        })
        .catch(() => {
          apiRes.message = "Something went wrong!";
        })
        .finally(() => {
          res.status(apiRes.status).json(apiRes);
        });
    } else {
      apiRes.message = "Something went wrong!";
      res.status(apiRes.status).json(apiRes);
    }
  },
  userLayout: (req, res, next) => {
    res.locals.siteData = config.get("site");
    req.app.set(
      "layout",
      path.join(__dirname, "../../views/layout/user-layout.ejs")
    );
    next();
  },
  userLogin: async (req, res, next) => {
    let isUserLoggedin = await usersModules.authCheck(req);
    res.locals.catList = await categories.find({});
    if (isUserLoggedin) {
      res.locals.userData = await users.findOne({ _id: req.session.userid });
      res.locals.login = true;
      next();
    } else {
      res.locals.userData = { username: "", name: "" };
      res.locals.login = false;
      next();
    }
  },
  productThumbImage: (req, res, next) => {
    var mime = {
      html: "text/html",
      txt: "text/plain",
      css: "text/css",
      gif: "image/gif",
      jpeg: "image/jpeg",
      png: "image/png",
      svg: "image/svg+xml",
      js: "application/javascript",
    };

    sharp("public/uploads/product/" + req.params.img) //prod-02lj2SiBOLUCH62.png
      .jpeg({ quality: 10, progressive: true, force: false })
      .webp({ quality: 10, progressive: true, force: false })
      .png({ compressionLevel: 1, progressive: true, force: false })
      .toBuffer()
      .then((data) => {
        let type = mime[path.extname(req.params.img).slice(1)] || "text/plain";
        res.set("Content-Type", type);
        res.send(data);
      })
      .catch((err) => {
        console.log(err);
        res.send("No image found!");
      });
  },
  bannerList: async (req, res) => {
    let bannerList = await banners.find({});
    res.render("user/index", {
      pageName: "Home",
      login: res.locals.login,
      userData: res.locals.userData,
      catList: res.locals.catList,
      bannerList,
      siteData: res.locals.siteData,
    });
  },
  about: (req, res) => {
    res.render("user/about", { pageName: "About Us" });
  },
  shop: async (req, res, next) => {
    let productsList;
    let typeData = {
      type: "listing",
      key: null,
    };
    let pagination = {
      q: 1,
      skip: 0,
      limit: 20, //Limit can be changed here!
      totalcount: 0,
      urlpath: "?page=",
    };
    if (req.query.page) {
      if (req.query.page > 1) {
        pagination.skip =
          pagination.limit * Number(req.query.page) - pagination.limit;
        // pagination.limit =pagination.limit*Number(req.query.page);
        pagination.q = Number(req.query.page);
        console.log(pagination);
      }
    }

    if (req.query.cat) {
      try {
        productsList = await products
          .find({ category: req.query.cat, "state.deleted": { $ne: true } })
          .populate("category");
        pagination.totalcount = await products.countDocuments({
          category: req.query.cat,
          "state.deleted": { $ne: true },
        });
        pagination.urlpath = "?cat=" + req.query.cat + "&page=";
      } catch (error) {
        console.log(error);
        next(createError(404));
      }
      typeData.type = "catlisting";
    } else if (req.query.q) {
      typeData.type = "qlisting";
      typeData.key = req.query.q.toString();

      try {
        let skey = req.query.q;
        // productsList  = await products.find({ name: { $regex: new RegExp('^'+req.query.q.toString()+'.*','i')}})
        let regex = new RegExp("^" + skey + ".*", "i");
        productsList = await products
          .aggregate([
            {
              $match: {
                $or: [
                  { name: regex },
                  { discription: regex },
                  { specification: regex },
                  { tags: regex },
                ],
                "state.deleted": { $ne: true },
              },
            },
          ])
          .skip(pagination.skip)
          .limit(pagination.limit);
        pagination.totalcount = await products.countDocuments({
          $or: [
            { name: regex },
            { discription: regex },
            { specification: regex },
            { tags: regex },
          ],
          "state.deleted": { $ne: true },
        });
        pagination.urlpath = "?q=" + skey + "&page=";
      } catch (error) {
        console.log(error);
        next(createError(404));
      }
    } else {
      productsList = await products
        .find({ "state.deleted": { $ne: true } })
        .skip(pagination.skip)
        .limit(pagination.limit);
      pagination.totalcount = await products.countDocuments({
        "state.deleted": { $ne: true },
      });
      pagination.urlpath = "?page=";
    }
    let catlist = await categories.find({});
    res.render("user/shop", {
      pageName: "Shop",
      catlist,
      productsList,
      typeData,
      pagination,
    });
  },
  productSizeId: async (req, res, next) => {
    try {
      let product = await products.findOne({
        _id: req.params.id,
        "state.deleted": { $ne: true },
      });
      let wordArr = product.discription.split(" ");
      wordArr = wordArr.map((val) => {
        val = val
          .replace(/./, "")
          .replace(/:/, "")
          .replace(/-br/, "")
          .replace(/\r/, "")
          .replace(/\n/, "")
          .replace(/[0-9]/g, "");

        return val;
      });
      let wordArr2 = product.specification.split(" ");
      wordArr2 = wordArr2.map((val) => {
        val = val
          .replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&")
          .replace(/[0-9]/g, "")
          .replace(/\*/g, "")
          .replace(/./, "")
          .replace(/:/, "")
          .replace(/\r/, "")
          .replace(/\n/, "");
        return val;
      });
      console.log(wordArr2.toString() + wordArr.toString());
      let suggestedProducts = await products.aggregate([
        {
          $match: {
            $or: [
              { tags: { $in: product.tags } },
              { category: product.category },
              { specification: { $in: wordArr2 } },
            ],
          },
        },
        { $limit: 40 },
      ]); // IF U DON"T WANT TO SHOW THE SAME PRODUCT IN SUGGESTION< THE ADD =>  {$match:{_id:{$ne:product._id}}},
      if (product.sizes.length >= req.params.size) {
        res.render("user/product", {
          pageName: product.name,
          product,
          selectedSize: req.params.size,
          suggestedProducts,
        });
      } else {
        next(createError(404));
      }
    } catch (error) {
      console.log(error);
      next(createError(404));
    }
  },
  contact: (req, res) => {
    res.render("user/contact", { pageName: "Contact Us" });
  },
  cacheClearing: function (req, res, next) {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.header("Expires", "-1");
    res.header("Pragma", "no-cache");
    next();
  },
  userLoggedIn: async (req, res, next) => {
    let isUserLoggedin = await usersModules.authCheck(req);
    if (isUserLoggedin) {
      res.locals.userData = await users.findOne({ _id: req.session.userid });
      res.locals.login = true;
      if (res.locals.userData.status == "active") {
        next();
      } else {
        next(createError(401));
      }
    } else {
      res.redirect("/auth/login/?backto=" + req.originalUrl);
    }
  },
  verifyDash: (req, res) => {
    res.render("user/dash/smsotp", {
      pageName: " Verify | Dashboard",
      dashPage: "Verify",
      login: res.locals.login,
      userData: res.locals.userData,
    });
  },
  verifyKeyId: (req, res) => {
    if (res.locals.userData.email_verified) {
      res.render("user/dash/verifyemailtemplate", {
        pageName: " Email verification | Dashboard",
        dashPage: "Email verification",
        login: res.locals.login,
        userData: res.locals.userData,
        emailVerificationSuccess: false,
      });
    } else {
      if (
        res.locals.userData.email_id == req.params.key &&
        res.locals.userData._id == req.params.id
      ) {
        users
          .updateOne(
            { _id: res.locals.userData._id },
            { $set: { email_id: "", email_verified: true } }
          )
          .then(() => console.log("Userverification updated!"))
          .then((err) => console.log(err));
        res.render("user/dash/verifyemailtemplate", {
          pageName: " Email verification | Dashboard",
          dashPage: "Email verification",
          login: res.locals.login,
          userData: res.locals.userData,
          emailVerificationSuccess: true,
        });
      } else {
        res.render("user/dash/verifyemailtemplate", {
          pageName: " Email verification | Dashboard",
          dashPage: "Email verification",
          login: res.locals.login,
          userData: res.locals.userData,
          emailVerificationSuccess: false,
        });
      }
    }
  },
  phoneVerified: (req, res, next) => {
    if (res.locals.userData.phone_verified) {
      next();
    } else {
      res.redirect("/dash/verify/");
    }
  },
  profile: (req, res) => {
    res.render("user/dash/profile", {
      pageName: "Profile | Dashboard",
      dashPage: "profile",
      login: res.locals.login,
      userData: res.locals.userData,
    });
  },
  dashSettings: (req, res) => {
    res.render("user/dash/settings", {
      pageName: "Settings | Dashboard",
      dashPage: "settings",
      login: res.locals.login,
      userData: res.locals.userData,
    });
  },
  orders: async (req, res) => {
    let ordersList = await orders
      .find({ userid: res.locals.userData._id, order_status: "completed" })
      .sort({ ordered_date: -1 });
    res.render("user/dash/orders", {
      pageName: "Orders | Dashboard",
      dashPage: "orders",
      login: res.locals.login,
      userData: res.locals.userData,
      ordersList,
    });
  },
  orderId: async (req, res, next) => {
    try {
      let orderData = await orders
        .findOne({
          userid: res.locals.userData._id,
          _id: req.params.id,
          order_status: "completed",
        })
        .populate("products.product_id");

      if (orderData) {
        res.render("user/dash/orderview", {
          pageName: "Order | Dashboard",
          dashPage: "orders",
          login: res.locals.login,
          userData: res.locals.userData,
          orderData,
        });
      } else {
        next(createError(404));
      }
    } catch (error) {
      next(createError(404));
    }
  },
  cart: async (req, res, next) => {
    try {
      let cartData = await users.findById(res.locals.userData._id);
      let cartIdArr = cartData.cart.map((val) => {
        return val.product_id;
      });
      let productlist = await products.aggregate([
        { $unwind: "$sizes" },
        { $match: { "sizes._id": { $in: cartIdArr } } },
      ]);
      let prodData = productlist.map((val, i) => {
        let thisQnty = cartData.cart.reduce((qnty, val2) => {
          if (val2.product_id.toString() == val.sizes._id.toString()) {
            qnty = val2.quantity;
          }
          return qnty;
        }, 0);
        let dataTOreturn = {
          id: val.sizes._id,
          name: val.name,
          discription: val.discription,
          price: val.sizes.price,
          size: val.sizes.name,
          qnty: thisQnty,
          total: thisQnty * val.sizes.price,
          limit: val.sizes.stock,
        };
        if (val.image[0]) {
          //set img only if it's exist
          dataTOreturn.image = val.image[0];
        }
        return dataTOreturn;
      });
      res.render("user/dash/cart", { pageName: "Cart", prodData });
    } catch (err) {
      console.log(err);
      next(createError(500));
    }
  },
  cartCheckoutId: async (req, res, next) => {
    let today = new Date();
    today =
      today.getDate().toString() +
      today.getMonth().toString() +
      today.getFullYear().toString();
    let userCheckout;
    try {
      userCheckout = await orders.findOne({
        _id: req.params.id,
        userid: res.locals.userData._id,
        order_status: "pending",
      });
    } catch (error) {
      console.log(error);
    } finally {
      console.log(userCheckout);
      if (userCheckout) {
        res.render("user/dash/checkout", {
          pageName: "Checkout",
          userCheckout,
        });
      } else {
        next(createError(404));
      }
    }
  },
  wishlist: async (req, res) => {
    let wishlistData = await users.aggregate([
      { $match: { _id: res.locals.userData._id } },
      {
        $lookup: {
          from: "products",
          localField: "wishlist",
          foreignField: "_id",
          as: "wishData",
        },
      },
    ]);
    wishlistData = wishlistData[0];
    res.render("user/dash/wishlist", {
      pageName: "Wishlist | Dashboard",
      dashPage: "wishlist",
      login: res.locals.login,
      userData: res.locals.userData,
      wishlistData,
    });
  },
  logout: (req, res) => {
    req.session.destroy();
    res.redirect("/auth/login");
  },
  loggedInCheck: async (req, res, next) => {
    let isUserLoggedin = await usersModules.authCheck(req);
    if (isUserLoggedin) {
      res.locals.login = true;
      if (req.query.backto) {
        res.redirect(req.query.backto);
      } else {
        res.redirect("/");
      }
    } else {
      res.locals.login = false;
      next();
    }
  },
  login: (req, res) => {
    res.render("./auth/login", { pageName: "Login" });
  },
  register: (req, res) => {
    res.render("./auth/register", { pageName: "Register" });
  },
  reset: (req, res) => {
    res.render("./auth/forgot", { pageName: "Reset Password" });
  },
  resetKeyId: async (req, res, next) => {
    try {
      let uData = await users.findOne({ _id: req.params.id });
      if (uData) {
        if (uData.email_id == req.params.key) {
          res.render("./auth/reset", {
            pageName: "Reset Password",
            validated: true,
            key: req.params.key,
            id: req.params.id,
          });
        } else {
          res.render("./auth/reset", {
            pageName: "Reset Password",
            validated: false,
          });
        }
      }
    } catch (err) {
      console.log(err);
      next(createError(400));
    }
  },
  testLogin: (req, res) => {
    res.render("./auth/testLogin", { pageName: "Login" });
  },
  baseLayout: (req, res, next) => {
    req.app.set(
      "layout",
      path.join(__dirname, "../../views/layout/base-layout")
    );
    next();
  },
  checkPhoneVerified: (req, res, next) => {
    let apiRes = JSON.parse(JSON.stringify(apiResponse));
    apiRes.status = 200;
    if (res.locals.userData.phone_verified) {
      next();
    } else {
      apiRes.message = "Phone number verification required!";
      res.status(200).json(apiRes);
    }
  },
};
