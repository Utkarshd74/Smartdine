const express = require("express");
const router = express.Router();
const passport = require("passport");
const Customer = require("../models/customer");
const FoodItem = require("../models/item");
const Admin = require("../models/admin");
const Order = require("../models/order");
const Donation = require("../models/Donation");


router.get("/customer/register", (req, res) => {
    res.render("customer/register.ejs");
});

router.post("/customer/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password
        } = req.body;

        const customer = new Customer({
            name,
            email,
            phone
        });

        await Customer.register(customer, password);

        req.flash("success", "Account created successfully!");

        res.redirect("/customer/login");

    } catch (err) {
        console.log("CUSTOMER REGISTER ERROR:", err);

        req.flash("error", err.message);

        res.redirect("/customer/register");
    }
});

//login route
router.get("/customer/login", (req, res) => {
    res.render("customer/login.ejs");
});

//login post route
router.post(
    "/customer/login",
    passport.authenticate("customer", {
        failureRedirect: "/customer/login",
        failureFlash: true
    }),
    (req, res) => {
        req.flash("success", "Login successful!");
        res.redirect("/customer/home");
    }
);

//home page
router.get("/customer/home", async (req, res) => {
    try {
        const categories = await FoodItem.distinct("category");

        const restaurants = await Admin.find({})
            .limit(6);

        res.render("customer/home.ejs", {
            categories,
            restaurants
        });

    } catch (err) {
        console.log("CUSTOMER HOME ERROR:", err);
        res.send("Something went wrong");
    }
});

//Visit number of restaurants page
router.get("/customer/restaurants", async (req, res) => {
    try {

         if (!req.isAuthenticated()) {
            return res.redirect("/customer/login");
        }

        const restaurants = await Admin.find({});

        res.render("customer/restaurant.ejs", {
            restaurants
        });

    } catch (err) {
        console.log("RESTAURANTS ERROR:", err);
        res.send("Something went wrong");
    }
});


//view restaurant route
router.get("/customer/restaurants/:id", async (req, res) => {
    try {
        const restaurant = await Admin.findById(req.params.id);

        if (!restaurant) {
            return res.send("Restaurant not found");
        }

        const foodItems = await FoodItem.find({
            restaurant: restaurant._id,
            isAvailable: true
        });

        res.render("customer/restaurantDetails.ejs", {
            restaurant,
            foodItems
        });

    } catch (err) {
        console.log("RESTAURANT DETAILS ERROR:", err);
        res.send("Something went wrong");
    }
});

//Food items add route
router.post("/customer/cart/add/:id", async (req, res) => {
    try {
        const item = await FoodItem.findById(req.params.id);

        if (!item) {
            req.flash("error", "Food item not found!");
            return res.redirect("/customer/restaurants");
        }

        if (!req.session.cart) {
            req.session.cart = [];
        }

        const existingItem = req.session.cart.find(
            cartItem => cartItem.itemId.toString() === item._id.toString()
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            req.session.cart.push({
                itemId: item._id,
                restaurantId: item.restaurant.toString(),
                name: item.name,
                price: item.price,
                image: item.image?.url || "",
                quantity: 1
            });
        }

        req.flash("success", `${item.name} added to cart!`);

        res.redirect(`/customer/restaurants/${item.restaurant}`);

    } catch (err) {
        console.log("ADD TO CART ERROR:", err);
        req.flash("error", "Unable to add item to cart!");
        res.redirect("/customer/restaurants");
    }
});

//Cart Route
router.get("/customer/cart", (req, res) => {
    const cart = req.session.cart || [];

    res.render("customer/cart.ejs", {
        cart
    });
});

// increase items in cart 
router.post("/customer/cart/increase/:itemId", (req, res) => {
    const cart = req.session.cart || [];

    const item = cart.find(
        item => item.itemId.toString() === req.params.itemId
    );

    if (item) {
        item.quantity += 1;
    }

    req.session.cart = cart;

    res.redirect("/customer/cart");
});

//Decrease items in cart
router.post("/customer/cart/decrease/:itemId", (req, res) => {
    const cart = req.session.cart || [];

    const itemIndex = cart.findIndex(
        item => item.itemId.toString() === req.params.itemId
    );

    if (itemIndex !== -1) {
        cart[itemIndex].quantity -= 1;

        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
    }

    req.session.cart = cart;

    res.redirect("/customer/cart");
});

//Delete items in cart
router.post("/customer/cart/remove/:itemId", (req, res) => {
    let cart = req.session.cart || [];

    cart = cart.filter(
        item => item.itemId.toString() !== req.params.itemId
    );

    req.session.cart = cart;

    res.redirect("/customer/cart");
});

//Place order or payment route
router.get("/customer/payment", (req, res) => {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
        return res.redirect("/customer/cart");
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    res.render("customer/payment.ejs", {
        cart,
        total
    });
});

// Customer Donation Payment Page
router.get("/customer/donation/payment", (req, res) => {
    try {
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Customer"
        ) {
            req.flash("error", "Please login as a customer first.");
            return res.redirect("/customer/login");
        }

        const cart = req.session.cart || [];

        if (cart.length === 0) {
            req.flash("error", "Your cart is empty!");
            return res.redirect("/customer/cart");
        }

        const total = cart.reduce(
            (sum, item) => sum + Number(item.price) * Number(item.quantity),
            0
        );

        res.render("customer/donationPayment.ejs", {
            cart,
            total
        });

    } catch (err) {
        console.error("DONATION PAYMENT PAGE ERROR:", err);
        req.flash("error", "Unable to open donation payment page.");
        res.redirect("/customer/cart");
    }
});

// My Orders + My Donation Requests
router.get("/customer/orders", async (req, res) => {
    try {
        // Check customer authentication
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Customer"
        ) {
            req.flash("error", "Please login as a customer first.");
            return res.redirect("/customer/login");
        }

        // Calculate date 5 days ago
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        // Fetch normal orders from the last 5 days
        const orders = await Order.find({
            customer: req.user._id,
            createdAt: { $gte: fiveDaysAgo }
        })
            .populate("restaurant")
            .populate("items.foodItem")
            .sort({ createdAt: -1 });

        // Fetch customer donations from the last 5 days
        const donations = await Donation.find({
            customer: req.user._id,
            createdAt: { $gte: fiveDaysAgo }
        })
            .populate("restaurant", "restaurantName")
            .populate("items.foodItem")
            .sort({ createdAt: -1 });

        // Render orders and donations together
        return res.render("customer/myOrders.ejs", {
            orders,
            donations
        });

    } catch (err) {
        console.error("MY ORDERS ERROR:", err);

        req.flash(
            "error",
            "Unable to load orders and donations."
        );

        return res.redirect("/customer/home");
    }
});


// Customer Donation Request
router.post("/customer/donation/create", async (req, res) => {
    try {
        // Check customer login
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Customer"
        ) {
            req.flash("error", "Please login as a customer first.");
            return res.redirect("/customer/login");
        }

        const cart = req.session.cart || [];

        if (cart.length === 0) {
            req.flash("error", "Your cart is empty!");
            return res.redirect("/customer/cart");
        }

        // Ensure all cart items belong to the same restaurant
        const restaurantId = cart[0].restaurantId;

        const sameRestaurant = cart.every(
            item => item.restaurantId.toString() === restaurantId.toString()
        );

        if (!sameRestaurant) {
            req.flash(
                "error",
                "Please donate items from one restaurant at a time."
            );
            return res.redirect("/customer/cart");
        }

        // Verify restaurant exists
        const restaurant = await Admin.findById(restaurantId);

        if (!restaurant) {
            req.flash("error", "Restaurant not found.");
            return res.redirect("/customer/cart");
        }

        // Verify food items against database
        const donationItems = [];

        for (const cartItem of cart) {
            const foodItem = await FoodItem.findOne({
                _id: cartItem.itemId,
                restaurant: restaurantId,
                isAvailable: true
            });

            if (!foodItem) {
                req.flash(
                    "error",
                    `${cartItem.name} is no longer available.`
                );
                return res.redirect("/customer/cart");
            }

            const quantity = Number(cartItem.quantity);

            if (!Number.isInteger(quantity) || quantity < 1) {
                req.flash("error", "Invalid item quantity.");
                return res.redirect("/customer/cart");
            }

            donationItems.push({
                foodItem: foodItem._id,
                name: foodItem.name,
                quantity,
                price: foodItem.price
            });
        }

        // Create customer donation request
        const donation = new Donation({
            donationType: "Customer",
            restaurant: restaurant._id,
            customer: req.user._id,
            items: donationItems,
            message: req.body.message || "",
            paymentStatus: "Pending",
            approvalStatus: "Pending",
            status: "Pending"
        });

        await donation.save();

        req.flash(
            "success",
            "Donation request created successfully!"
        );

        return res.redirect("/customer/home");

    } catch (err) {
        console.error("CUSTOMER DONATION ERROR:", err);
        req.flash("error", "Unable to create donation request.");
        return res.redirect("/customer/cart");
    }
});

// Customer Donation Payment Success
router.post("/customer/donation/payment/success", async (req, res) => {
    try {
        // Customer login check
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "Customer"
        ) {
            req.flash("error", "Please login as a customer first.");
            return res.redirect("/customer/login");
        }

        const cart = req.session.cart || [];

        if (cart.length === 0) {
            req.flash("error", "Your cart is empty!");
            return res.redirect("/customer/cart");
        }

        // Check that all items belong to the same restaurant
        const restaurantId = cart[0].restaurantId;

        const sameRestaurant = cart.every(
            item => item.restaurantId.toString() === restaurantId.toString()
        );

        if (!sameRestaurant) {
            req.flash("error", "Please donate items from one restaurant at a time.");
            return res.redirect("/customer/cart");
        }

        // Verify restaurant
        const restaurant = await Admin.findById(restaurantId);

        if (!restaurant) {
            req.flash("error", "Restaurant not found.");
            return res.redirect("/customer/cart");
        }

        // Verify items against database
        const donationItems = [];

        for (const cartItem of cart) {
            const foodItem = await FoodItem.findOne({
                _id: cartItem.itemId,
                restaurant: restaurantId,
                isAvailable: true
            });

            if (!foodItem) {
                req.flash("error", `${cartItem.name} is no longer available.`);
                return res.redirect("/customer/cart");
            }

            const quantity = Number(cartItem.quantity);

            if (!Number.isInteger(quantity) || quantity < 1) {
                req.flash("error", "Invalid food quantity.");
                return res.redirect("/customer/cart");
            }

            donationItems.push({
                foodItem: foodItem._id,
                name: foodItem.name,
                quantity,
                price: foodItem.price
            });
        }

        // Simulated payment for the college project.
        // This is NOT verification from a real payment gateway.
        const donation = new Donation({
            donationType: "Customer",
            restaurant: restaurant._id,
            customer: req.user._id,
            items: donationItems,
            paymentStatus: "Paid",
            approvalStatus: "Pending",
            status: "Pending"
        });

        await donation.save();

        // Clear cart only after donation is saved
        req.session.cart = [];

        req.flash(
            "success",
            "Thank you for your donation! Your request has been sent to the restaurant."
        );

        return res.redirect("/customer/home");

    } catch (err) {
        console.error("CUSTOMER DONATION PAYMENT ERROR:", err);
        req.flash("error", "Unable to create donation request.");
        return res.redirect("/customer/cart");
    }
});

//Post route my orders
router.post("/customer/order/place", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect("/customer/login");
        }

        const cart = req.session.cart || [];

        if (cart.length === 0) {
            req.flash("error", "Your cart is empty!");
            return res.redirect("/customer/cart");
        }

        const restaurantId = cart[0].restaurantId;

        const orderItems = cart.map(item => ({
            foodItem: item.itemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));

        const totalAmount = cart.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        );

        const order = new Order({
            customer: req.user._id,
            restaurant: restaurantId,
            items: orderItems,
            totalAmount: totalAmount,
            status: "Pending"
        });

        await order.save();

        req.session.cart = [];

        req.flash("success", "Your order has been booked successfully!");

        res.redirect("/customer/orders");

    } catch (err) {
        console.log("PLACE ORDER ERROR:", err);
        req.flash("error", "Unable to place order!");
        res.redirect("/customer/cart");
    }
});


//Customer Profile
router.get("/customer/profile", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect("/customer/login");
        }

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.redirect("/customer/login");
        }

        res.render("customer/profile.ejs", { customer });

    } catch (err) {
        console.log("CUSTOMER PROFILE ERROR:", err);
        res.send("Something went wrong");
    }
});

//Logout route
router.get("/customer/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "Logged out successfully!");
        res.redirect("/customer/login");
    });
});

module.exports = router;