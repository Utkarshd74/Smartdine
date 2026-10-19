const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const ngoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true
    }
});

ngoSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

module.exports = mongoose.model("NGO", ngoSchema);