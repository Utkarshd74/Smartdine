const express = require("express");
const router = express.Router();

const Donation = require("../models/Donation");
const FoodItem = require("../models/item");

// ========================================
// 1. Admin Donation Form
// ========================================
router.get("/admin/donations/new", async (req, res) => {
    try {
        if (!req.isAuthenticated() || req.user.constructor.modelName !== "Admin") {
            req.flash("error", "Please login as a restaurant admin.");
            return res.redirect("/admin/login");
        }

        const items = await FoodItem.find({
            restaurant: req.user._id,
            isAvailable: true
        });

        res.render("admin/donations/new.ejs", { items });

    } catch (err) {
        console.log("DONATION FORM ERROR:", err);
        req.flash("error", "Unable to open donation form.");
        res.redirect("/admin/profile");
    }
});


// ========================================
// 2. Create Restaurant Donation
// ========================================
router.post("/admin/donations", async (req, res) => {
    try {
        if (!req.isAuthenticated() || req.user.constructor.modelName !== "Admin") {
            req.flash("error", "Please login as a restaurant admin.");
            return res.redirect("/admin/login");
        }

        const { quantities, message } = req.body;

        if (!quantities || typeof quantities !== "object") {
            req.flash("error", "Please select at least one food item.");
            return res.redirect("/admin/donations/new");
        }

        const items = [];

        for (const [foodItemId, quantityValue] of Object.entries(quantities)) {
            const quantity = Number(quantityValue);

            // Ignore items with zero quantity
            if (quantityValue === "" || quantity === 0) {
                continue;
            }

            if (!Number.isSafeInteger(quantity) || quantity < 1) {
                req.flash("error", "Donation quantity must be a positive whole number.");
                return res.redirect("/admin/donations/new");
            }

            const foodItem = await FoodItem.findOne({
                _id: foodItemId,
                restaurant: req.user._id,
                isAvailable: true
            });

            if (!foodItem) {
                req.flash("error", "An invalid food item was selected.");
                return res.redirect("/admin/donations/new");
            }

            items.push({
                foodItem: foodItem._id,
                name: foodItem.name,
                quantity,
                price: foodItem.price
            });
        }

        if (items.length === 0) {
            req.flash("error", "Please enter a quantity for at least one food item.");
            return res.redirect("/admin/donations/new");
        }

        const donation = new Donation({
            donationType: "Restaurant",
            restaurant: req.user._id,
            items,
            message,
            paymentStatus: "NotRequired",
            approvalStatus: "NotRequired",
            status: "Pending"
        });

        await donation.save();

        req.flash("success", "Donation request created successfully!");
        res.redirect("/admin/profile");

    } catch (err) {
        console.log("CREATE DONATION ERROR:", err);
        req.flash("error", "Unable to create donation request.");
        res.redirect("/admin/donations/new");
    }
});

module.exports = router;

