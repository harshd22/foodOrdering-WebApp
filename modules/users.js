let session = null
let db = null
const md5 = require('md5')
const FB = require('fb').default
const nodemailer = require('nodemailer')

function passwordHash(password){
    let salt = `dchf6gj=${password}-opjiuytfrhcgjbk`
    return md5(salt)
}

let auth = {

    current() {
        return this.isLogin() ? session.current : null
    },
    isLogin() {
        if (typeof session.current == 'undefined') {
            session.current = null
        }
        return session.current != null
    },
    login(email, password) {
        //id, email, password, display_name, register_at, lastlogin_at


        // session.current = {
        //     id: 1,
        //     username: 'abc'
        // }
        return new Promise((resolve, reject) => {
            db.query(`
        select *
        from users
        where email = $1 and password = $2
        `, [email, passwordHash(password)])
                .then(result => {
                    if (result.rows.length == 1) {
                        session.current = result.rows[0]
                        resolve(true)
                    }
                    else {
                        resolve(false)
                    }
                })
        })

    },
    loginById(uid) {
        return new Promise((resolve, reject) => {
            db.query(`
        select *
        from users
        where uid = $1
        `, [uid])
                .then(result => {
                    if (result.rows.length == 1) {
                        session.current = result.rows[0]
                        resolve(true)
                    }
                    else {
                        resolve(false)
                    }
                })
        })
    },
    logout() {
        session.current = null
    },
    loginFromFB(access_token) {
        return new Promise(((resolve, reject) => {
            FB.setAccessToken(access_token)
            FB.api('/me', {fields: 'email, name'}, (res) => {
                let {email, name, id} = res
                if (email && name && id) {
                    db.query(`
                        select *
                        from users
                         where fbid = $1
                         `, [id])
                        .then(async (result) => {
                            if (result.rows.length == 1) {
                                session.current = result.rows[0]
                                resolve(true)
                            }
                            else {
                                let uid = await register.regis(email, null, name, id)
                                this.loginById(uid)
                                resolve(true)
                            }
                        })

                }
                else {
                    resolve(false)
                }
            })
        }))

    }
}
let register = {
    regis(email, password, display_name, fbid = '', isAdmin = false) {
        return new Promise(async (resolve, reject) => {
            let result = await db.query(`
            select * from users
            where email = $1
            `, [email])
            if (result.rows.length > 0) {
                return resolve(false)
            }
            try {
                result = await db.query(`select max(uid) as m from users`)
                let nextId = result.rows[0]['m'] + 1

                result = await db.query(`
        insert into users(uid, email,password,  display_name, register_at, lastlogin_at, fbid, type)
        values($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6)
    `, [nextId, email, password ? passwordHash(password) : null , display_name,fbid,  isAdmin ? 'a' : 'n'])
                if (result.rowCount == 1) {
                    resolve(nextId)
                }
                else {
                    resolve(null)
                }
            }
            catch (err) {
                reject(err)
            }
        })

    }
}

let manager = {
    listAllUser() {
        return new Promise(async (resolve, reject) => {
            try {
                let result = await db.query(`
                select *
                from users
                `)
                resolve(result.rows)
            }
            catch (err) {
                console.error('fetch all usedrs erroe', err)
                return []
            }

        })
    },
    listAllResetCode() {
        return new Promise(async (resolve, reject) => {
            try {
                let result = await db.query(`
                select *
                from reset_password
                `)
                resolve(result.rows)
            }
            catch (err) {
                console.error('fetch all reset_password erroe', err)
                return []
            }

        })
    },
    sendResetPasswordCode(uid, email){

        let code = 'RESET-' + passwordHash(email + (new Date()).getTime())
        let sender = nodemailer.createTransport({
            service: "gmail",
            auth:{
                user: 'nwen304.2018@gmail.com',
                pass: '304_group9'
            }
        })

        let mailcontent = {
            from: 'NWEN304 GROUP9 - <no-reply@nwen304>',
            to: email,
            subject: 'reset password code',
            text: 'click this to reset password',
            html: `<a href="https://nwen304group92018.herokuapp.com/user/reset?code=${code}">${code}</a>`
        }


        sender.sendMail(mailcontent)
        return new Promise(async (resolve, reject) => {

            try {
                let expire = new Date()
                expire.setDate(expire.getDate() + 7)
                let year = expire.getFullYear()
                let month = expire.getMonth()
                let date = expire.getDate()

                let result = await
                    db.query(`
            insert into reset_password(uid, code, expire)
            values($1, $2, $3)
            `, [uid, code, `${year}-${month}-${date}`])
                resolve(true)
            }
            catch (err) {
                resolve(false)

            }
        })
    },
    getUserFromResetCode(code){
        return new Promise(async (resolve, reject) => {
            try {
                let today = new Date()
                let year = today.getFullYear()
                let month = today.getMonth()
                let date = today.getDate()

                let result = await
                    db.query(`
            select *
            from reset_password
            where code = $1 and expire > $2
            `, [code, `${year}-${month}-${date}`])
                if(result.rows.length != 1){
                    return resolve(null)
                }
                let uid = result.rows[0].uid
                if(await auth.loginById(uid)){
                    return resolve(auth.current())
                }
                return resolve(null)
            }
            catch (err) {
                resolve(null)

            }
        })
    },
    resetPassword(uid, newPassword){
        return new Promise(async (resolve, reject) => {
            try {
                let result = await
                    db.query(`
            update users
            set password = $1
            where uid = $2
            `, [passwordHash(newPassword), uid])
                resolve(true)
            }
            catch (err) {
                resolve(false)

            }
        })
    },
    getUserFromEmail(email){
        return new Promise(async (resolve, reject) => {
            try {
                let result = await
                    db.query(`
            select *
            from users
            where email = $1
            `, [email])
                resolve(result.rows.length > 0 ? result.rows[0] : null)
            }
            catch (err) {
                resolve(null)

            }
        })
    },
    isAdmin(user){
        if(user == null){
            return false;
        }
        if(typeof user.type == "undefined"){
            return false;
        }
        return user.type=="a"

    },
    verifyAdmin(){
        let user = auth.current()
        return this.isAdmin(user)
    }
}
// sender.close()
exports.set = (type, val) => {
    if (type == 'session') {
        session = val
    }
    else if (type == 'db') {
        db = val
    }
    return val


}
exports.auth = auth
exports.register = register
exports.manager = manager