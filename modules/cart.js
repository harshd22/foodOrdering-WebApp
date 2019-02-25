//Reference: https://www.youtube.com/watch?v=_pVKGCzbMwg&list=PL55RiY5tL51rajp7Xr_zk-fCFtzdlGKUp&index=13

module.exports = function Cart(oldCart) {
    this.items = oldCart.items || {};
    this.totalQty = oldCart.totalQty || 0;
    this.totalPrice = oldCart.totalPrice || 0;

    this.add = function (item, id) {
        var storedItem = this.items[id];
        if (!storedItem) {
            storedItem = this.items[id] = {qty: 0, item: item, price: 0};
        }
        storedItem.qty++;
        storedItem.price = storedItem.item.price * storedItem.qty;
        this.totalQty++;
        this.totalPrice += storedItem.item.price * 1;
    };

    this.generateArray = function () {
        var arr = [];
        for (var id in this.items) {
            arr.push(this.items[id]);
        }
        return arr;
    };

    //add
    this.getID = function(){
        var arr = [];
        for(var id in this.items){
            arr.push(id)
        }
        return arr;
    }

    this.getQuantity = function(){
        var arr = [];
        for(var id in this.items){
            arr.push(this.items[id].qty)
        }
        return arr;
    }


    this.reduceByOne = function (id) {
        this.items[id].qty--;
        this.items[id].price -= this.items[id].item.price;
        this.totalQty--;
        this.totalPrice -= this.items[id].item.price;
        if (this.items[id].qty <= 0) {
            delete this.items[id];
        }
    };
};