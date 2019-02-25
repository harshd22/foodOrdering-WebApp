//express
const express = require('express')
const app = express()
const md5 =require('md5')

const path = require('path');
//import User Service
const userService = require('./modules/users')

const orderService = require('./modules/admin')
//create main session instance
const session = require('express-session')
const mainSession = session({ secret: 'myapp', cookie: {maxAge: 60*60*1000} , resave: true, saveUninitialized: true})

//create PostgreSAL client
const Pg = require('pg')
const pgClient = new Pg.Client('postgres://dzpmclapruhrzo:52f304fd919261591dc5be4c3b12dfbbb17a0d863ba7a9a61baba79ff62ad26f@ec2-184-72-234-230.compute-1.amazonaws.com:5432/ddirqc41svsi25?ssl=true')
pgClient.connect()


const bodyParser = require('body-parser')

//configuration
app.use(mainSession)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
userService.set('session', mainSession)
userService.set('db', pgClient)

orderService.set('db', pgClient)

// userService.manager.sendResetPasswordCode('n.l_nut@yahoo.com')
var Cart = require('./modules/cart');
//var cacheResponseDirective = require('express-cache-response-directive');
var editID;
var archiveList = [];



// userService.register.regis("nwen304_2018@yahoo.com", "group9", "admin group9", '', true)
app.get('/', async (req,res) => {
 
    if(!await userService.auth.isLogin()){
        return res.redirect('/login')
    }
    pgClient.query("select * from products").then(data => {
       
        res.render('home', { data: data , error:false})
    }).catch(error => {
        console.log("Error:" + error)
    });
    //res.setHeader('Cache-Control', 'public, max-age=31557600');

})

//NATALIE
//login, logout, reset password

app.get('/login', async (req,res)=>{
    let {fb_token}= req.query
    if(fb_token){
        if(userService.auth.loginFromFB(fb_token)){
            return res.redirect('/')
        }

    }
        res.render('login', {err:false})

})
app.post('/login', async (req,res)=>{
        let {email, password} = req.body
        let status = await userService.auth.login(email, password)
        if(status){
            if(userService.manager.verifyAdmin()){
                res.redirect('/admin')
            }
            else{
                res.redirect('/')
            }
        }
        else {
            res.render('login', {err: true})
        }
})
app.post('/api/login', async (req,res)=>{
    let {email, password} = req.body
    let status = await userService.auth.login(email, password)
    if(status){
        if(userService.manager.verifyAdmin()){
            res.json({
                status: true,
                isAdmin: true
            })
        }
        else{
            res.json({
                status: true,
                isAdmin: false
            })
        }
    }
    else {
        res.json({
            status: false,
            isAdmin: false
        })
    }
})
app.get('/logout', (req,res)=>{
    res.redirect('/')
    userService.auth.logout()
})
app.get('/register', (req,res) =>{
    res.render('register')
})
app.post('/register', async (req, res)=>{
    let {email, password, password2, display_name} = req.body
    let uid = await userService.register.regis(email,password,display_name)

    if(uid){
        await userService.auth.loginById(uid)
        return res.redirect('/')
    }
})
app.post('/api/register', async (req, res)=>{
    let {email, password, display_name} = req.body
    let uid = await userService.register.regis(email,password,display_name)

    if(uid){
        await userService.auth.loginById(uid)
        res.json({
            status: true,
            uid:uid
        })
    }
    else{
        res.json({
            status: false,
            uid:null
        })
    }
})


app.get('/login/forget', (req,res)=>{
    let {sent} = req.query
    res.render('forget_password', {sent: sent})
})
app.post('/login/forget', async (req, res) =>{
    let {email} = req.body

    let user = await userService.manager.getUserFromEmail(email)

    if(user){
       await userService.manager.sendResetPasswordCode(user.uid, email)
    }
    res.redirect('/login/forget?sent=1')
})
app.post('/api/login/forget', async (req, res) =>{
    let {email} = req.body

    let user = await userService.manager.getUserFromEmail(email)

    if(user){
        await userService.manager.sendResetPasswordCode(user.uid, email)
    }
    res.json({
        status: true,
    })
})

app.get('/user/reset', async (req,res)=>{
    let {code} = req.query

    let user = await userService.manager.getUserFromResetCode(code)
    res.render('set_new_password', {codeNotExist: user ? false: true, changed: false})
})

app.post('/user/reset', async (req,res)=>{
    let {password, password2} = req.body
    if(password != password2){
        return res.redirect('/user/reset')
    }
    let uid = userService.auth.current().uid
    let result = await userService.manager.resetPassword(uid, password)
    res.render('set_new_password', {codeNotExist: false, changed: result ? true: false})
})
app.post('/api/user/reset', async (req,res)=>{
    let {password, password2} = req.body
    let uid = userService.auth.current().uid
    let result = await userService.manager.resetPassword(uid, password)
    res.render({
        status: true,
        codeNotExist: false,
        changed: result ? true: false
    })
})

app.get('/admin/users', async(req, res) =>{
    if(!userService.manager.verifyAdmin()){
        res.redirect('/')
    }
    let users = await userService.manager.listAllUser()
    console.log("all users: ", users)
    res.render('admin/users', {
        users:users
    })
})
app.get('/admin/reset_password', async(req, res) =>{
    let users = await userService.manager.listAllResetCode()
    console.log("all users: ", users)
    res.render('admin/users', {
        users:users
    })
})

//HARSH
// Cart functions
app.get('/cart', async (req, res) => {
    if(!await userService.auth.isLogin()){
        return res.redirect('/login')
    }
    if (!mainSession.cart)
        return res.render('cart', { cartProducts: null });
    var cart = new Cart(mainSession.cart);
    res.render('cart', { cartProducts: cart.generateArray(), total: cart.totalPrice })
});

app.get('/addtocart/:id', async (req, res) => {

    var cart = new Cart(mainSession.cart ? mainSession.cart : {});

    pgClient.query('select * from products where id=$1', [req.params.id])
        .then(data => {
            cart.add(data.rows[0], data.rows[0].id);
            mainSession.cart = cart;
            // alert(data.rows[0].name + "added successfully to the cart")
            res.redirect('/');
        })
        .catch(error => {
            console.log('ERROR: ' + error);
        });

})

app.get('/removefromcart/:id', async (req, res) => {
    var productID = req.params.id;
    var cart = new Cart(mainSession.cart ? mainSession.cart : {});
    cart.reduceByOne(productID);
    mainSession.cart = cart;
    res.redirect('/cart');

});

//Search function
app.get('/search', async (req, res) => {
    if(!await userService.auth.isLogin()){
        return res.redirect('/login')
    }

    searchString = '%' + req.query.search + '%'
    pgClient.query("Select * FROM products WHERE name LIKE $1", [searchString] ).then(data => {

        res.render('home', {data : data})

    })
        .catch(error => {
            console.log('Error: ' + error);
        });

});

//check out function
app.get('/checkout', async (req, res) => {
    if(!await userService.auth.isLogin()){
        return res.redirect('/login')
    }

    if (!mainSession.cart)
        return res.render('/checkout', { cartProducts: null });
    var cart = new Cart(mainSession.cart);
    res.render('checkout', { cartProducts: cart.generateArray(), total: cart.totalPrice })
})

app.post('/checkout', async (req, res) => {
    if(!await userService.auth.isLogin()){
        return res.redirect('/login')
    }

    let {address} = req.body
    var cart = new Cart(mainSession.cart);
    var product_id = cart.getID().toString();
    var quantity = cart.getQuantity().toString();
    var price = cart.totalPrice;
    var Uid = mainSession.current.uid
    pgClient.query(`insert into past_order(user_id,product_id,Quantity,price,address)
    values($1,$2,$3,$4,$5)`,[Uid,product_id,quantity,price,address])
        .then(data => {
            res.redirect('/order_placed');
            mainSession.cart=null
        })
        .catch(error => {
            console.log('ERROR: ' + error);
        });
})

app.get('/order_placed', (req, res) => {

    res.render('order_placed')
})


//get order history for user.
app.get('/order', (req, res) => {


    pgClient.query("select * from past_order where user_id = $1",[mainSession.current.uid]).then(data => {
        res.render('order', { data: data.rows })
    }).catch(error => {
        console.log("Error:" + error)
    });
})

//admin home pagefunction
app.get('/admin', async (req, res) => {
    if(!userService.manager.verifyAdmin()){
        return res.redirect('/')
    }

        pgClient.query("select * from products").then(data => {
            res.render('admin', { data: data , error:false})
            res.setHeader('Cache-Control', 'max-age=31557, must-revalidate');
        }).catch(error => {
            console.log("Error:" + error)
        });
    
   
})
app.get('/loadorder', async(req,res)=>{

    if(!await userService.auth.isLogin() || !userService.manager.verifyAdmin()){
        return res.redirect('/')
    }
    
    res.setHeader('Cache-Control', 'max-age=31557, must-revalidate');
    pgClient.query('select * from past_order').then(data => {
        res.render('loadorder', { data: data.rows , edit:false, id:-1})

    })
})

app.get('/manageorder', (req, res) => {
  

    res.render('manageorder')
})

//edit order
app.get('/loadorder/edit/:id', (req, res) => {
    if(!userService.manager.verifyAdmin()){
    return res.redirect('/')
    }
    res.setHeader('Cache-Control', 'max-age=31557, must-revalidate');
    oID = req.params.id
    this.editID = oID
    pgClient.query('select * from past_order').then(data => {
        res.render('loadorder', { data: data.rows , edit:true, id: oID})

    })
})

//delete order
app.get('/loadorder/delete/:id', (req, res) => {
    if(!userService.manager.verifyAdmin()){
        return res.redirect('/')
        }

    oID = req.params.id
    pgClient.query('delete from past_order where order_id = $1', [oID])

})

//save the order modification.
app.get('/loadorder/save', (req, res) => {
    price  = req.query.price
    if(price!=''){
        pgClient.query(`update past_order set price = $1 where order_id = $2`,[price,this.editID])}

    product_id = req.query.product_id
    if(product_id!=''){
        pgClient.query(`update past_order set product_id = $1 where order_id = $2`,[product_id,this.editID])}

    quantity = req.query.quantity
    if(quantity!=''){
        pgClient.query(`update past_order set quantity = $1 where order_id = $2`,[quantity,this.editID])}

    address = req.query.address
    if(address!=''){
        pgClient.query(`update past_order set address = $1 where order_id = $2`,[address,this.editID])}
    res.redirect('/loadorder')

})

//archive the order and save into local file.
app.get('/loadorder/archive/:id', (req, res) => {
    if(!userService.manager.verifyAdmin()){
        return res.redirect('/')
        }

    oID = req.params.id
    pgClient.query('select * from past_order where order_id = $1', [oID])
        .then(data => {
            var data = data.rows[0]
           // console.log(data)
            fs.appendFile('archive_order.txt', JSON.stringify(data), function (err, data) {
                if (err) console.log(err);
                console.log("Successfull")
            })

        }).catch(error => {
    });
    pgClient.query('delete from past_order where order_id = $1', [oID])

    res.redirect('/loadorder')
})

    


//Test functions - HARSH

app.get('/api/search', async (req, res) => {

    searchString = '%' + req.query.search + '%'
    pgClient.query("Select * FROM products WHERE name LIKE $1", [searchString] ).then(data => {

        res.json({data : data.rows})

    }).catch(error => {
            console.log('Error: ' + error);
        });
});

app.get('/api/addtocart/:id', async (req, res) => {

    var cart = new Cart(mainSession.cart ? mainSession.cart : {});

    pgClient.query('select * from products where id=$1', [req.params.id])
        .then(data => {
            cart.add(data.rows[0], data.rows[0].id);
            mainSession.cart = cart;
            res.json({id: req.params.id,
                message: "Added to cart"});      
        })
        .catch(error => {
            console.log('ERROR: ' + error);
        });

})

app.get('/api/removefromcart/:id', async (req, res) => {
    var productID = req.params.id;
    var cart = new Cart(mainSession.cart ? mainSession.cart : {});
    cart.reduceByOne(productID);
    mainSession.cart = cart;
    res.json({id: productID,
                message: "removed from cart"});

})

app.get('/api/home', async (req,res) => {

    pgClient.query("select * from products").then(data => {

        res.json({ data: data.rows , error:false})
    }).catch(error => {
        console.log("Error:" + error)
    });
})


    const PORT = process.env.PORT  || 8000
app.listen(PORT, ()=>{
    console.log("App started!!", userService)
})


