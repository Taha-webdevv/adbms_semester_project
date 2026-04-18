const express = require("express");
// const mysql = require("mysql");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());


app.use(
    session({
        secret: "lostfoundsecret",
        resave: false,
        saveUninitialized: true
    })
);


//connector
// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "1234",
    // GodofwarragnarokNovember2022
    //1234
    
//     database: "lostfound"
// });

// db.connect(err => {
//     if (err) console.log(err);
//     else console.log("MySQL Connected!");
// });

//connector
mongoose.connect("mongodb://localhost:27017/lostfound")
.then(() => console.log("MongoDB Connected!"))
.catch(err => console.log(err));

//Schema 
const userSchema = new mongoose.Schema({
    // id → MongoDB auto-creates _id
    username: { type: String, required: true, unique: true },  // VARCHAR(50) UNIQUE NOT NULL
    password: { type: String, required: true },                // VARCHAR(255) NOT NULL
    role:     { type: String, enum: ["admin", "user"], default: "user" } // ENUM('admin','user')
});
const User = mongoose.model("User", userSchema);
 
const itemSchema = new mongoose.Schema({
    // id → MongoDB auto-creates _id
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // FOREIGN KEY users(id)
    item_name:      { type: String, required: true },                      // VARCHAR(100) NOT NULL
    category:       { type: String, required: true, enum: ["phone", "laptop", "keys", "wallet_purse", "charger", "miscellaneous"] }, // ENUM
    description:    { type: String },                                      // TEXT
    location_found: { type: String },                                      // VARCHAR(255)
    found_date:     { type: Date, default: Date.now },                     // DATETIME DEFAULT CURRENT_TIMESTAMP
    status:         { type: String, enum: ["listed", "claimed", "returned", "junked"], default: "listed" } // ENUM
});
const Item = mongoose.model("Item", itemSchema);
 
const claimSchema = new mongoose.Schema({
    // id → MongoDB auto-creates _id
    user_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // FOREIGN KEY users(id)
    item_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true }, // FOREIGN KEY items(id)
    proof_text:   { type: String },                                                      // TEXT
    proof_image:  { type: String },                                                      // VARCHAR(255)
    claim_date:   { type: Date, default: Date.now },                                     // DATETIME DEFAULT CURRENT_TIMESTAMP
    admin_status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" } // ENUM
});
const Claim = mongoose.model("Claim", claimSchema);




//image uploads Multer
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


//register route
// app.post("/register", (req, res) => {
//     const { username, password } = req.body;

//     db.query(
//         "INSERT INTO users (username, password) VALUES (?, ?)",
//         [username, password],
//         (err) => {
//             if (err) return res.json({ error: err });
//             res.json({ success: true });
//         }
//     );
// });
//register route
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = new User({ username, password });
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ error: err.message });
    }
});
 



// login route

// app.post("/login", (req, res) => {
//     const { username, password } = req.body;

//     db.query(
//         "SELECT * FROM users WHERE username=? AND password=?",
//         [username, password],
//         (err, result) => {
//             if (err) return res.json({ error: err });
//             if (result.length === 0)
//                 return res.json({ success: false });

//             req.session.user = {
//                 id: result[0].id,
//                 role: result[0].role
//             };

//             res.json({ success: true, role: result[0].role });
//         }
//     );
// });

// login route

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (!user) return res.json({ success: false });
 
        req.session.user = { id: user._id, role: user.role };
        res.json({ success: true, role: user.role });
    } catch (err) {
        res.json({ error: err.message });
    }
});


// app.post("/add-item", (req, res) => {

//     if (!req.session.user) {
//         return res.json({ error: "Not logged in" });
//     }

//     const { item_name, category, description, location_found } = req.body;
//     const user_id = req.session.user.id;

//     db.query(
//         `INSERT INTO items (user_id, item_name, category, description, location_found)
//          VALUES (?, ?, ?, ?, ?)`,
//         [user_id, item_name, category, description, location_found],
//         (err) => {
//             if (err) return res.json({ error: err });
//             res.json({ success: true });
//         }
//     );
// });
//add item
app.post("/add-item", async (req, res) => {
    if (!req.session.user) return res.json({ error: "Not logged in" });
 
    const { item_name, category, description, location_found } = req.body;
    try {
        const item = new Item({
            user_id: req.session.user.id,
            item_name, category, description, location_found
        });
        await item.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ error: err.message });
    }
});


// for available items

// app.get("/items", (req, res) => {
//     db.query("SELECT * FROM items WHERE status='listed'", (err, result) => {
//         if (err) return res.json({ error: err });
//         res.json(result);
//     });
// });
// for available items
app.get("/items", async (req, res) => {
    try {
        const items = await Item.find({ status: "listed" });
        res.json(items);
    } catch (err) {
        res.json({ error: err.message });
    }
});


        // claim form
// app.post("/claim", upload.single("proof_image"), (req, res) => {
//     const { item_id, proof_text } = req.body;
//     const user_id = req.session.user.id;

//     const file = req.file ? req.file.filename : null;

//     db.query(
//         `INSERT INTO claims (user_id, item_id, proof_text, proof_image)
//          VALUES (?, ?, ?, ?)`,
//         [user_id, item_id, proof_text, file],
//         (err) => {
//             if (err) return res.json({ error: err });
//             db.query("UPDATE items SET status='claimed' WHERE id=?", [item_id]);
//             res.json({ success: true });
//         }
//     );
// });

app.post("/claim", upload.single("proof_image"), async (req, res) => {
    if (!req.session.user) return res.json({ error: "Not logged in" });
 
    const { item_id, proof_text } = req.body;
    const proof_image = req.file ? req.file.filename : null;
 
    try {
        const claim = new Claim({
            user_id: req.session.user.id,
            item_id,
            proof_text,
            proof_image
        });
        await claim.save();
        await Item.findByIdAndUpdate(item_id, { status: "claimed" });
        res.json({ success: true });
    } catch (err) {
        res.json({ error: err.message });
    }
});

//admin panel claims
// app.get("/admin/claims", (req, res) => {
//     db.query(
//         `SELECT claims.*, items.item_name, users.username 
//          FROM claims
//          JOIN items ON claims.item_id = items.id
//          JOIN users ON claims.user_id = users.id
//          WHERE admin_status='pending'`,
//         (err, result) => {
//             if (err) return res.json({ error: err });
//             res.json(result);
//         }
//     );
// });
app.get("/admin/claims", async (req, res) => {
    try {
        const claims = await Claim.find({ admin_status: "pending" })
            .populate("item_id", "item_name")
            .populate("user_id", "username");
        res.json(claims);
    } catch (err) {
        res.json({ error: err.message });
    }
});




// app.post("/admin/approve", (req, res) => {
//     const { claim_id, item_id } = req.body;

//     db.query("UPDATE claims SET admin_status='approved' WHERE id=?", [claim_id]);
//     db.query("UPDATE items SET status='returned' WHERE id=?", [item_id]);

//     res.json({ success: true });
// });
app.post("/admin/approve", async (req, res) => {
    const { claim_id, item_id } = req.body;
    try {
        await Claim.findByIdAndUpdate(claim_id, { admin_status: "approved" });
        await Item.findByIdAndUpdate(item_id, { status: "returned" });
        res.json({ success: true });
    } catch (err) {
        res.json({ error: err.message });
    }
});


// app.post("/admin/reject", (req, res) => {
//     const { claim_id, item_id } = req.body;

//     db.query("UPDATE claims SET admin_status='rejected' WHERE id=?", [claim_id]);
//     db.query("UPDATE items SET status='listed' WHERE id=?", [item_id]);

//     res.json({ success: true });
// });
app.post("/admin/reject", async (req, res) => {
    const { claim_id, item_id } = req.body;
    try {
        await Claim.findByIdAndUpdate(claim_id, { admin_status: "rejected" });
        await Item.findByIdAndUpdate(item_id, { status: "listed" });
        res.json({ success: true });
    } catch (err) {
        res.json({ error: err.message });
    }
});
 


//send to junk
app.get("/auto-junk", async (req, res) => {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    try {
        const result = await Item.updateMany(
            { category: "miscellaneous", status: "listed", found_date: { $lt: cutoff } },
            { status: "junked" }
        );
        res.json({ message: "Auto junk complete", updated: result.modifiedCount });
    } catch (err) {
        res.json({ error: err.message });
    }
});
 
// Static files
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
 
app.listen(3000, () => console.log("Server running on port 3000"));