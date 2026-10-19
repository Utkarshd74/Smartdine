const express = require("express");
const router = express.Router();

const Admin = require("../models/admin");
const FoodItem = require("../models/item");
const Order = require("../models/order");
const passport = require("passport");
const Donation = require("../models/Donation");


// Normal Page
router.post("/admin", (req, res) => {
    res.send("Hello Admin");
});


// Register page
router.get("/admin/register", (req, res) => {
    res.render("admin/register.ejs");
});


// Login page
router.get("/admin/login", (req, res) => {
    res.render("admin/login.ejs");
});


// Register admin
router.post("/admin/register", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            restaurantName,
            address,
            description,
            password
        } = req.body;


        // Create Admin document

        const newAdmin = new Admin({

            name,

            email,

            phone,

            restaurantName,

            address,

            description,

            image: {
                url: req.body.image?.url
            }

        });


        // Passport Local Mongoose
        // Password automatically hash karega

        await Admin.register(newAdmin, password);


        req.flash(
            "success",
            "Admin account created successfully!"
        );


        res.redirect("/admin/login");


    } catch (e) {

        console.log("REGISTER ERROR:", e);


        req.flash(
            "error",
            e.message
        );


        res.redirect("/admin/register");

    }

});

// Admin Login
router.post("/admin/login",
    passport.authenticate("local", {
        failureRedirect: "/admin/login",
        failureFlash: true
    }),
    (req, res) => {

        req.flash("success", "Login successful!");

        res.redirect("/admin/profile");

    }
);


// Profile page
router.get("/admin/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/admin/login");
    }

    const admin = await Admin.findById(req.user._id);

    res.render("admin/profile.ejs", {
        admin
    });
});

// Add Item Page
router.get("/admin/items/new", (req, res) => {
    if(!req.isAuthenticated()){
        req.flash("error","You must be logged in to Add items")
        return res.redirect("/admin/login");
    }
    res.render("admin/new.ejs");
});


//Save Item
router.post("/admin/items/new", async (req, res) => {
    try {
        const foodItem = new FoodItem({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            image: {
                url: req.body.image?.url
            },
            isAvailable: req.body.isAvailable === "true",
            restaurant: req.user._id
        });

        await foodItem.save();

        req.flash("success", "Food item added successfully!");
        res.redirect("/admin/profile");
    } catch (err) {
        console.log("FOOD ITEM ERROR:", err);
        req.flash("error", err.message);
        res.redirect("/admin/items/new");
    }
});

// Manage Food items page
router.get("/admin/items", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/admin/login");
    }

    const items = await FoodItem.find({
        restaurant: req.user._id
    });

    res.render("admin/index.ejs", { items });
});

//Edit food item page
router.get("/admin/items/:id/edit", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/admin/login");
    }

    const item = await FoodItem.findOne({
        _id: req.params.id,
        restaurant: req.user._id
    });

    if (!item) {
        return res.redirect("/admin/items");
    }

    res.render("admin/edit.ejs", {
        item
    });
});

//Update food item page
router.put("/admin/items/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/admin/login");
    }

    const item = await FoodItem.findOneAndUpdate(
        {
            _id: req.params.id,
            restaurant: req.user._id
        },
        {
            name: req.body.name,
            category: req.body.category,
            price: req.body.price,
            description: req.body.description,
            image: {
                url: req.body.image?.url
            },
            isAvailable: req.body.isAvailable === "true"
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!item) {
        return res.redirect("/admin/items");
    }

    req.flash("success", "Food item updated successfully!");

    res.redirect("/admin/items");
});

// Delete food item route
router.delete("/admin/items/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/admin/login");
    }

    const item = await FoodItem.findOneAndDelete({
        _id: req.params.id,
        restaurant: req.user._id
    });

    if (!item) {
        return res.redirect("/admin/items");
    }

    req.flash("success", "Food item deleted successfully!");

    res.redirect("/admin/items");
});


//Change password
router.post("/admin/changepass", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect("/admin/login");
        }

        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash("error", "New passwords do not match.");
            return res.redirect("/admin/profile");
        }

        const admin = await Admin.findById(req.user._id);

        await admin.changePassword(currentPassword, newPassword);

        req.flash("success", "Password changed successfully!");

        res.redirect("/admin/profile");

    } catch (err) {
        console.log("PASSWORD ERROR:", err);

        req.flash("error", "Current password is incorrect.");

        res.redirect("/admin/profile");
    }
});

//Logout route
router.get("/admin/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "Logged out successfully!");
        res.redirect("/admin/login");
    });
});

//Admin orders get route
router.get("/admin/orders", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect("/admin/login");
        }

        const orders = await Order.find({
            restaurant: req.user._id,
            status: {
                $nin: ["Completed", "Cancelled"]
            }
        })
        .populate("customer")
        .populate("items.foodItem")
        .sort({ createdAt: -1 });

        res.render("admin/orders.ejs", { orders });

    } catch (err) {
        console.log("ADMIN ORDERS ERROR:", err);
        res.send(err.message);
    }
});

// Admin orders post route
router.post("/admin/orders/:id/status", async (req, res) => {
    try {
        // Check admin authentication
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Admin"
        ) {
            return res.redirect("/admin/login");
        }

        // Find order belonging to this restaurant
        const order = await Order.findOne({
            _id: req.params.id,
            restaurant: req.user._id
        });

        if (!order) {
            req.flash("error", "Order not found!");
            return res.redirect("/admin/orders");
        }

        // Allowed order statuses
        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Preparing",
            "Departed",
            "Completed",
            "Cancelled"
        ];

        const newStatus = req.body.status;

        // Validate requested status
        if (!allowedStatuses.includes(newStatus)) {
            req.flash("error", "Invalid order status!");
            return res.redirect("/admin/orders");
        }

        // Update order status
        order.status = newStatus;

        await order.save();

        req.flash("success", "Order status updated successfully!");
        return res.redirect("/admin/orders");

    } catch (err) {
        console.error("STATUS UPDATE ERROR:", err);

        req.flash("error", "Unable to update order status!");
        return res.redirect("/admin/orders");
    }
});

// Dashboard get route
router.get("/admin/dashboard", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect("/admin/login");
        }

        const restaurantId = req.user._id;

        const totalOrders = await Order.countDocuments({
            restaurant: restaurantId
        });

        const pendingOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Pending"
        });

        const confirmedOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Confirmed"
        });

        const preparingOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Preparing"
        });

        const departedOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Departed"
        });

        const completedOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Completed"
        });

        const cancelledOrders = await Order.countDocuments({
            restaurant: restaurantId,
            status: "Cancelled"
        });

        const totalItems = await FoodItem.countDocuments({
            restaurant: restaurantId
        });

        const salesData = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurantId,
                    status: "Completed"
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: {
                        $sum: "$totalAmount"
                    }
                }
            }
        ]);

        const totalSales =
            salesData.length > 0
                ? salesData[0].totalSales
                : 0;

        const recentOrders = await Order.find({
            restaurant: restaurantId
        })
        .populate("customer")
        .sort({ createdAt: -1 })
        .limit(5);

        res.render("admin/dashboard.ejs", {
            totalOrders,
            pendingOrders,
            confirmedOrders,
            preparingOrders,
            departedOrders,
            completedOrders,
            cancelledOrders,
            totalItems,
            totalSales,
            recentOrders
        });

    } catch (err) {
        console.log("ADMIN DASHBOARD ERROR:", err);
        res.send(err.message);
    }
});

// ================= DONATION MANAGEMENT =================

// View Customer Donation Requests - GET Route
router.get("/admin/donations", async (req, res) => {
    try {
        // Check Admin Login
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Admin"
        ) {
            req.flash("error", "Please login as a restaurant owner.");
            return res.redirect("/admin/login");
        }

        // Calculate date 5 days ago
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        // Fetch customer donations from the last 5 days
        const donations = await Donation.find({
            restaurant: req.user._id,
            donationType: "Customer",
            createdAt: { $gte: fiveDaysAgo }
        })
            .populate("items.foodItem")
            .sort({ createdAt: -1 });

        // Render Manage Donations page
        res.render("admin/donations/index.ejs", {
            donations
        });

    } catch (err) {
        console.error("ADMIN DONATIONS ERROR:", err);

        req.flash("error", "Unable to load donation requests.");
        return res.redirect("/admin/dashboard");
    }
});

// My Restaurant Donations - GET Route
router.get("/admin/donations/my", async (req, res) => {
    try {
        // Check Admin Login
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Admin"
        ) {
            req.flash("error", "Please login as a restaurant owner.");
            return res.redirect("/admin/login");
        }

        // Calculate date 5 days ago
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        // Fetch restaurant donations from the last 5 days
        const donations = await Donation.find({
            restaurant: req.user._id,
            donationType: "Restaurant",
            createdAt: { $gte: fiveDaysAgo }
        })
            .populate("items.foodItem")
            .sort({ createdAt: -1 });

        // Render My Donations page
        res.render("admin/donations/my.ejs", {
            donations
        });

    } catch (err) {
        console.error("MY DONATIONS ERROR:", err);

        req.flash("error", "Unable to load your donations.");
        return res.redirect("/admin/dashboard");
    }
});


// Approve or reject a customer donation
router.post("/admin/donations/:id/status", async (req, res) => {
    try {
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Admin"
        ) {
            req.flash("error", "Please login as a restaurant owner.");
            return res.redirect("/admin/login");
        }

        const { status } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            req.flash("error", "Invalid donation action.");
            return res.redirect("/admin/donations");
        }

        // Update only a pending request belonging to this restaurant
        const donation = await Donation.findOne({
            _id: req.params.id,
            restaurant: req.user._id,
            donationType: "Customer",
            approvalStatus: "Pending",
            status: "Pending"
        });

        if (!donation) {
            req.flash(
                "error",
                "Donation request not found or already processed."
            );
            return res.redirect("/admin/donations");
        }

        donation.approvalStatus = status;

        await donation.save();

        if (status === "Approved") {
            req.flash(
                "success",
                "Donation approved! It is now available to NGOs."
            );
        } else {
            req.flash(
                "success",
                "Donation request rejected."
            );
        }

        return res.redirect("/admin/donations");

    } catch (err) {
        console.error("DONATION STATUS ERROR:", err);
        req.flash("error", "Unable to update donation status.");
        return res.redirect("/admin/donations");
    }
});

module.exports = router;