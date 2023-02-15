/* eslint-disable no-unused-vars */



module.exports ={
  errorHandling:function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    let errStatus = err.status || 500;
    // render the error page
    console.log(err);
    res.status(errStatus);
    if(errStatus==404){ //401 Unauthorized
        res.render('error/404',{pageName:"404 Page not found", page:"err",userData: res.locals.userData, pages: ['404_page_not_found'],});
    }else if(errStatus==401){ //401 Unauthorized
        res.render('error/401',{pageName:"401 Unauthorized", page:"err",userData: res.locals.userData, pages: ['401_unauthorized'],});
    }else if(errStatus==400){ //401 Unauthorized
        res.render('error/400',{pageName:"400 Bad Request", page:"err",userData: res.locals.userData, pages: ['400_bad_request'],});
    }else{
        
        res.send('<div style="font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; text-align:center;"><h2 style="color:red;">500 |  Internal error !</h2> We will be back soon..</div>')
       
    }
}
}