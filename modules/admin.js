
let db = null

let checkout = {
    add_order(address) {
        
        return new Promise(async (resolve, reject) => {
            try{
            let result = await db.query(`
        insert into past_order(user_id,product_id,Quantity,price,address)
        values($1,)
    `, [address])
    if (result.rowCount == 1) {
        resolve(true)
    }
    else {
        resolve(null)
    }
    }
    catch (err) {
    reject(err)
    }})
   
}}


exports.set = (type, val) => {
    if (type == 'db') {
        db = val
    }
    return val
}

exports.checkout = checkout;