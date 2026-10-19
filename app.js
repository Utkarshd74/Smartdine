const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
console.log(process.env.SECRET);

const dburl = process.env.ATLASDB_URL;

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const customerRoutes = require("./routes/customer");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/authentication");
const donationRoutes = require("./routes/donation");
const ngoRoutes = require("./routes/ngo");

const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const Admin = require("./models/admin");
const Customer = require("./models/customer");
const NGO = require("./models/ngo");

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

const store = MongoStore.create({
    mongoUrl: dburl,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store: MongoStore.create({
        mongoUrl: dburl,
        collectionName: "sessions"
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
};

app.use(session(sessionOptions));

app.use(session(sessionOptions));

app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(Admin.createStrategy());

passport.use(
    "customer",
    new LocalStrategy(
        { usernameField: "email" },
        Customer.authenticate()
    )
);

passport.serializeUser((user, done) => {
    done(null, {
        id: user._id.toString(),
        type: user.constructor.modelName
    });
});

passport.deserializeUser(async (data, done) => {
    try {
        let user = null;

        if (data.type === "Admin") {
            user = await Admin.findById(data.id);
        }

        if (data.type === "Customer") {
            user = await Customer.findById(data.id);
        }

        if (data.type === "NGO") {
            user = await NGO.findById(data.id);
        }

        done(null, user);

    } catch (err) {
        done(err);
    }
});

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.isLoggedIn = req.isAuthenticated();
    next();
});

app.use("/", adminRoutes);
app.use("/", authRoutes);
app.use("/", customerRoutes);
app.use("/", donationRoutes);
app.use("/", ngoRoutes);

// Homepage: redirect to role selection page
app.get("/", (req, res) => {
    res.redirect("/role");
});

// Role selection page
app.get("/role", (req, res) => {
    res.render("auth/role.ejs");
});




console.log("Atlas URL loaded:", Boolean(dburl));

async function main() {
    if (!dburl) {
        throw new Error(
            "ATLASDB_URL missing. Please check your .env file."
        );
    }

    await mongoose.connect(dburl);
}

main()
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
    });



const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartDine server running on port ${PORT}`);
});