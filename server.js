const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(
  session({
    secret: "lostfoundsecret",
    resave: false,
    saveUninitialized: true,
  }),
);

// ─── DB CONNECTION ───────────────────────────────────────────────────────────
mongoose
  .connect("mongodb://localhost:27017/lostfound")
  .then(() => console.log("MongoDB Connected!"))
  .catch((err) => console.log(err));

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
});
const User = mongoose.model("User", userSchema);

const itemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  item_name: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      "phone",
      "laptop",
      "keys",
      "wallet_purse",
      "charger",
      "miscellaneous",
    ],
  },
  description: { type: String },
  location_found: { type: String },
  found_date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["listed", "claimed", "returned", "junked"],
    default: "listed",
  },
});
const Item = mongoose.model("Item", itemSchema);

const claimSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  proof_text: { type: String },
  proof_image: { type: String },
  claim_date: { type: Date, default: Date.now },
  admin_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});
const Claim = mongoose.model("Claim", claimSchema);

const complaintSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  roll_number: { type: String, required: true },
  email: { type: String, required: true },
  category: { type: String, required: true },
  related_item: { type: String },
  description: { type: String, required: true },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  submitted_at: { type: Date, default: Date.now },
});
const Complaint = mongoose.model("Complaint", complaintSchema, "complaint");

// ─── MULTER ──────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false });

    req.session.user = { id: user._id, role: user.role };
    res.json({ success: true, role: user.role });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Add Item
app.post("/add-item", requireLogin, async (req, res) => {
  const { item_name, category, description, location_found } = req.body;

  if (!item_name?.trim() || !category?.trim()) {
    return res.json({ error: "Item name and category are required." });
  }

  try {
    const item = new Item({
      user_id: req.session.user.id,
      item_name: item_name.trim(),
      category,
      description: description?.trim(),
      location_found: location_found?.trim(),
    });
    await item.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Get Listed Items
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find({ status: "listed" });
    res.json(items);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Submit Claim
app.post(
  "/claim",
  requireLogin,
  upload.single("proof_image"),
  async (req, res) => {
    const { item_id, proof_text } = req.body;
    const proof_image = req.file ? req.file.filename : null;

    try {
      const existing = await Claim.findOne({
        user_id: req.session.user.id,
        item_id,
      });
      if (existing)
        return res.json({
          error: "You have already submitted a claim for this item.",
        });

      const item = await Item.findOneAndUpdate(
        { _id: item_id, status: "listed" },
        { status: "claimed" },
        { new: true },
      );

      if (!item) {
        return res.json({ error: "This item is no longer available." });
      }

      const claim = new Claim({
        user_id: req.session.user.id,
        item_id,
        proof_text,
        proof_image,
      });
      await claim.save();
      res.json({ success: true });
    } catch (err) {
      res.json({ error: err.message });
    }
  },
);

// Submit Complaint
app.post("/complaint", requireLogin, async (req, res) => {
  const { name, roll_number, email, category, related_item, description } =
    req.body;

  if (
    !name?.trim() ||
    !roll_number?.trim() ||
    !email?.trim() ||
    !category?.trim() ||
    !description?.trim()
  ) {
    return res.json({ error: "Please fill in all required fields." });
  }

  try {
    const complaint = new Complaint({
      user_id: req.session.user.id,
      name: name.trim(),
      roll_number: roll_number.trim(),
      email: email.trim(),
      category: category.trim(),
      related_item: related_item?.trim(),
      description: description.trim(),
    });
    await complaint.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Admin — Get Pending Claims
app.get("/admin/claims", requireAdmin, async (req, res) => {
  try {
    const claims = await Claim.find({ admin_status: "pending" })
      .populate("item_id", "item_name")
      .populate("user_id", "username");

    const validClaims = claims.filter((c) => c.user_id && c.item_id);
    res.json(validClaims);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Admin — Approve Claim
app.post("/admin/approve", requireAdmin, async (req, res) => {
  const { claim_id, item_id } = req.body;
  try {
    await Claim.findByIdAndUpdate(claim_id, { admin_status: "approved" });
    await Item.findByIdAndUpdate(item_id, { status: "returned" });

    await Claim.updateMany(
      { item_id, _id: { $ne: claim_id }, admin_status: "pending" },
      { admin_status: "rejected" },
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Admin — Reject Claim
app.post("/admin/reject", requireAdmin, async (req, res) => {
  const { claim_id, item_id } = req.body;
  try {
    await Claim.findByIdAndUpdate(claim_id, { admin_status: "rejected" });

    const otherPending = await Claim.findOne({
      item_id,
      _id: { $ne: claim_id },
      admin_status: "pending",
    });

    if (!otherPending) {
      await Item.findByIdAndUpdate(item_id, { status: "listed" });
    }

    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Admin — Get All Complaints
app.get("/admin/complaints", requireAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("user_id", "username")
      .sort({ submitted_at: -1 });
    res.json(complaints);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Admin — Resolve Complaint
app.post("/admin/complaints/resolve", requireAdmin, async (req, res) => {
  const { complaint_id } = req.body;
  try {
    await Complaint.findByIdAndUpdate(complaint_id, { status: "resolved" });
    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Auto Junk
app.get("/auto-junk", requireAdmin, async (req, res) => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  try {
    const result = await Item.updateMany(
      {
        category: "miscellaneous",
        status: "listed",
        found_date: { $lt: cutoff },
      },
      { status: "junked" },
    );
    res.json({ message: "Auto junk complete", updated: result.modifiedCount });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Who is logged in
app.get("/me", async (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });
  try {
    const user = await User.findById(req.session.user.id, "username role");
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, role: user.role, username: user.username });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.listen(3000, () => console.log("Server running on port 3000"));
