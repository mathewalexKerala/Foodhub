const express = require('express')
const app = express()
const path = require("path")
const ejsLayout = require('express-ejs-layouts')
const createError = require('http-errors')
const logger = require("morgan")
const mongoose = require('mongoose')
const dotenv = require("dotenv")
const session = require("express-session")
const  mainModule  = require('./helpers/main_functions')
const config = require('config')
const errorHandler = require('./errorhandler/error')
mongoose.set('strictQuery', true)


app.use((req,res,next)=>{
    let configdata = config.get('server');
    if(configdata.maintenance.state){
        res.render('error/maintenance',{pageName:"under_maintenance",message: configdata.maintenance.message});
    }else{
        next()
    }
})




/**DB CONFIG */
let dbErr = false;
    dotenv.config()
    mongoose.connect(process.env.DB_SECRET).then(()=>{
        console.log('Db connected...')
        // next()
    })
    .catch((err)=>{
        dbErr  =true;
        console.log(err)
        // next(createError(500))
    })
app.use((req,res,next)=>{
    if (dbErr) {
        next(createError(500))
    }else{
        next()
    }
})

app.use(express.static(path.join(__dirname,"public")))
app.use('/shop',express.static(path.join(__dirname,"public/uploads/product")))
app.use('/cat',express.static(path.join(__dirname,"public/uploads/category")))
app.use('/bnr',express.static(path.join(__dirname,"public/uploads/banner")))
app.use(logger('dev'))
app.use(ejsLayout)
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({secret: mainModule.randomGen(15), cookie:{maxAge:60000000000},resave:true,saveUninitialized:true}))


const adminRoutes = require('./routes/admin_routes/admin')
const userRoutes = require('./routes/user_routes/user')
const authRoutes = require('./routes/user_routes/auth')
const apiRoutes = require('./routes/user_routes/api') 
const adminapiRoutes = require('./routes/admin_routes/adminApi') 
const userDashRoutes = require('./routes/user_routes/userdash') 

app.set("view engine", "ejs")
app.set("layout", path.join(__dirname,'views/layout/base-layout'))
app.set("views", path.join(__dirname,'views')) 


app.use('/admin',adminRoutes)
app.use('/',userRoutes)
app.use('/auth',authRoutes)
app.use('/api',apiRoutes)
app.use('/adminapi',adminapiRoutes)
app.use('/dash',userDashRoutes)




// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});
  
  // error handler
app.use(errorHandler.errorHandling);


const PORT = process.env.PORT || 80;
app.listen(PORT, ()=>{
    console.log('Server is running on port '+PORT);
    
})


