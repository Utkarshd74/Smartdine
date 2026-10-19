const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
    {
        // Restaurant ya Customer
        donationType: {
            type: String,
            enum: ["Restaurant", "Customer"],
            required: true
        },

        // Food provide karne wala restaurant
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true
        },

        //Accepted by
        acceptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NGO",
            default: null
        },

        // Customer donation ke liye
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null
        },

        // Donation ke food items
        items: [
            {
                foodItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "FoodItem",
                    required: true
                },

                name: {
                    type: String,
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        // Restaurant ka optional message
        message: {
            type: String,
            trim: true,
            maxlength: 500
        },

        // Customer ki simulated payment
        paymentStatus: {
            type: String,
            enum: ["NotRequired", "Pending", "Paid", "Failed"],
            default: "NotRequired"
        },

        // Customer donation ki restaurant approval
        approvalStatus: {
            type: String,
            enum: [
                "NotRequired",
                "Pending",
                "Approved",
                "Rejected"
            ],
            default: "NotRequired"
        },

        // Donation ki current state
        status: {
            type: String,
            enum: [
                "Pending",
                "Accepted",
                "Pickup Confirmed",
                "Completed",
                "Cancelled"
            ],
            default: "Pending"
        },

        
    },
    { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);