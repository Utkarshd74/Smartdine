const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },

    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },

    items: [
        {
            foodItem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FoodItem",
                required: true
            },
            name: String,
            price: Number,
            quantity: Number
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Preparing" , "Departed", "Completed", "Cancelled"],
        default: "Pending"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Order", orderSchema);