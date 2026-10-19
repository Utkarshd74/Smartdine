const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const NGO = require("../models/ngo");

// NGO authentication strategy
passport.use(
    "ngo",
    new LocalStrategy(
        { usernameField: "email" },
        NGO.authenticate()
    )
);

// NGO Registration Page
router.get("/ngo/register", (req, res) => {
    res.render("ngo/register.ejs");
});

// NGO Registration
router.post("/ngo/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            description,
            password
        } = req.body;

        const newNGO = new NGO({
            name,
            email,
            phone,
            address,
            description
        });

        await NGO.register(newNGO, password);

        req.flash(
            "success",
            "NGO registered successfully! Please login."
        );

        res.redirect("/ngo/login");

    } catch (err) {
        console.log("NGO REGISTRATION ERROR:", err);

        req.flash(
            "error",
            err.code === 11000
                ? "Email or phone number is already registered."
                : err.message || "NGO registration failed."
        );

        res.redirect("/ngo/register");
    }
});

// NGO Login Page
router.get("/ngo/login", (req, res) => {
    res.render("ngo/login.ejs");
});

// NGO Login
router.post(
    "/ngo/login",
    (req, res, next) => {
        passport.authenticate("ngo", (err, ngo, info) => {
            if (err) {
                return next(err);
            }

            if (!ngo) {
                req.flash(
                    "error",
                    info?.message || "Invalid email or password."
                );

                return res.redirect("/ngo/login");
            }

            req.logIn(ngo, (err) => {
                if (err) {
                    return next(err);
                }

                req.flash("success", "Welcome to SmartDine NGO Dashboard!");

                return res.redirect("/ngo/dashboard");
            });
        })(req, res, next);
    }
);

// NGO Dashboard
router.get("/ngo/dashboard", async (req, res) => {
    try {
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        const donations = await Donation.find({
            $or: [
                {
                    donationType: "Restaurant",
                    approvalStatus: "NotRequired",
                    status: "Pending"
                },
                {
                    donationType: "Customer",
                    approvalStatus: "Approved",
                    status: "Pending"
                }
            ]
        })
            .populate("restaurant", "restaurantName address")
            .populate("items.foodItem", "name category image");

        const acceptedCount = await Donation.countDocuments({
            status: { $in: ["Accepted", "Pickup Confirmed"] }
        });

        const completedCount = await Donation.countDocuments({
            status: "Completed"
        });

        res.render("ngo/dashboard.ejs", {
            donations,
            acceptedCount,
            completedCount
        });

    } catch (err) {
        console.log("NGO DASHBOARD ERROR:", err);
        req.flash("error", "Unable to load NGO dashboard.");
        res.redirect("/ngo/login");
    }
});


// Available Donations Page
router.get("/ngo/donations", async (req, res) => {
    try {
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        const donations = await Donation.find({
            $or: [
                {
                    donationType: "Restaurant",
                    approvalStatus: "NotRequired",
                    status: "Pending"
                },
                {
                    donationType: "Customer",
                    approvalStatus: "Approved",
                    status: "Pending"
                }
            ]
        })
            .populate("restaurant", "restaurantName address")
            .populate("items.foodItem", "name category image");

        res.render("ngo/donations.ejs", { donations });

    } catch (err) {
        console.log("AVAILABLE DONATIONS ERROR:", err);
        req.flash("error", "Unable to load donations.");
        res.redirect("/ngo/dashboard");
    }
});


// Accept Donation
router.post("/ngo/donations/:id/accept", async (req, res) => {
    try {
        if (
            !req.user ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        const donation = await Donation.findOne({
            _id: req.params.id,
            status: "Pending",
            $or: [
                {
                    donationType: "Restaurant",
                    approvalStatus: "NotRequired"
                },
                {
                    donationType: "Customer",
                    approvalStatus: "Approved"
                }
            ]
        });

        if (!donation) {
            req.flash(
                "error",
                "Donation is unavailable or has already been accepted."
            );
            return res.redirect("/ngo/donations");
        }

        // Atomically accept the donation for this NGO.
        const acceptedDonation = await Donation.findOneAndUpdate(
            {
                _id: donation._id,
                status: "Pending",
                acceptedBy: null,
                $or: [
                    {
                        donationType: "Restaurant",
                        approvalStatus: "NotRequired"
                    },
                    {
                        donationType: "Customer",
                        approvalStatus: "Approved"
                    }
                ]
            },
            {
                $set: {
                    status: "Accepted",
                    acceptedBy: req.user._id
                }
            },
            { new: true }
        );

        if (!acceptedDonation) {
            req.flash(
                "error",
                "Another NGO has already accepted this donation."
            );
            return res.redirect("/ngo/donations");
        }

        req.flash("success", "Donation accepted successfully!");
        return res.redirect("/ngo/my-donations");

    } catch (err) {
        console.error("ACCEPT DONATION ERROR:", err);
        req.flash("error", "Unable to accept donation.");
        return res.redirect("/ngo/donations");
    }
});


// NGO My Donations
router.get("/ngo/my-donations", async (req, res) => {
    try {
        // Check whether an NGO is logged in
        if (
            !req.user ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        // Fetch only donations accepted by the logged-in NGO
        const donations = await Donation.find({
            acceptedBy: req.user._id,
            status: {
                $in: [
                    "Accepted",
                    "Pickup Confirmed",
                    "Completed"
                ]
            }
        })
            .populate("restaurant", "restaurantName address")
            .populate("items.foodItem")
            .sort({ createdAt: -1 });

        res.render("ngo/my-donations.ejs", {
            donations
        });

    } catch (err) {
        console.error("NGO MY DONATIONS ERROR:", err);

        req.flash("error", "Unable to load your donations.");
        res.redirect("/ngo/dashboard");
    }
});


// Confirm Pickup
router.post("/ngo/donations/:id/pickup", async (req, res) => {
    try {
        if (
            !req.user ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        const donation = await Donation.findOneAndUpdate(
            {
                _id: req.params.id,
                acceptedBy: req.user._id,
                status: "Accepted"
            },
            {
                $set: {
                    status: "Pickup Confirmed"
                }
            },
            { new: true }
        );

        if (!donation) {
            req.flash(
                "error",
                "Donation not found or you cannot confirm its pickup."
            );
            return res.redirect("/ngo/my-donations");
        }

        req.flash("success", "Pickup confirmed successfully!");
        return res.redirect("/ngo/my-donations");

    } catch (err) {
        console.error("PICKUP CONFIRMATION ERROR:", err);
        req.flash("error", "Unable to confirm pickup.");
        return res.redirect("/ngo/my-donations");
    }
});


// Mark Donation as Completed
router.post("/ngo/donations/:id/complete", async (req, res) => {
    try {
        // Check NGO authentication
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        // Complete only the donation accepted by this NGO
        // and whose pickup has been confirmed
        const donation = await Donation.findOneAndUpdate(
            {
                _id: req.params.id,
                acceptedBy: req.user._id,
                status: "Pickup Confirmed"
            },
            {
                $set: {
                    status: "Completed"
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        // Handle donation not found or unauthorized access
        if (!donation) {
            req.flash(
                "error",
                "Donation not found or you cannot complete it."
            );

            return res.redirect("/ngo/my-donations");
        }

        req.flash("success", "Donation marked as completed!");

        return res.redirect("/ngo/my-donations");

    } catch (err) {
        console.error("COMPLETE DONATION ERROR:", err);

        req.flash("error", "Unable to complete donation.");

        return res.redirect("/ngo/my-donations");
    }
});




// NGO Profile Page
router.get("/ngo/profile", async (req, res) => {
    try {
        if (
            !req.isAuthenticated() ||
            req.user.constructor.modelName !== "NGO"
        ) {
            req.flash("error", "Please login as an NGO first.");
            return res.redirect("/ngo/login");
        }

        res.render("ngo/profile.ejs", { ngo: req.user });

    } catch (err) {
        console.log("NGO PROFILE ERROR:", err);
        req.flash("error", "Unable to load profile.");
        res.redirect("/ngo/dashboard");
    }
});


// NGO Logout
router.post("/ngo/logout", (req, res, next) => {
    if (
        !req.isAuthenticated() ||
        req.user.constructor.modelName !== "NGO"
    ) {
        req.flash("error", "Please login as an NGO first.");
        return res.redirect("/ngo/login");
    }

    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "Logged out successfully.");
        res.redirect("/ngo/login");
    });
});

module.exports = router;

module.exports = router;