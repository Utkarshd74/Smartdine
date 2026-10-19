const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const customerSchema = new mongoose.Schema({
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
    }
});

customerSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

module.exports = mongoose.model("Customer", customerSchema);