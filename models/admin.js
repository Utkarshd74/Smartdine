const mongoose = require("mongoose");

const passportLocalMongoose =
    require("passport-local-mongoose").default;

const adminSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    phone: {
        type: String,
        required: true,
        unique: true
    },

    restaurantName: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    image: {
        url: {
            type: String
        }
    }

});


// Passport Local Mongoose

adminSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});


module.exports = mongoose.model("Admin", adminSchema);