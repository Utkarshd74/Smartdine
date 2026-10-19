const express = require("express");
const router = express.Router();

router.get("/role",(req, res)=> {
    res.render("auth/role.ejs");
});

module.exports = router;