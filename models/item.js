const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({

    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    price: {
        type: Number,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    image: {
        url: {
            type: String
        }
    },

    isAvailable: {
        type: Boolean,
        default: true
    }

});

module.exports = mongoose.model("FoodItem", foodItemSchema);