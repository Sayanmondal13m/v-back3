const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://sm187966:uewqZuG2ZRNzl6GO@portfolio.jbu3t.mongodb.net/?retryWrites=true&w=majority&appName=portfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const visitorSchema = new mongoose.Schema({
  fingerprint: { type: String, unique: true },
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
});

const Visitor = mongoose.model("Visitor", visitorSchema);

const countSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
});

const Count = mongoose.model("Count", countSchema);

// Get visitor count
app.get("/api/visitors", async (req, res) => {
  try {
    const countDoc = await Count.findOne();
    const count = countDoc ? countDoc.count : 0;
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching visitors count" });
  }
});

// Track new visitor
app.post("/api/visitors", rateLimit({ windowMs: 60 * 1000, max: 1 }), async (req, res) => {
  try {
    const { ip, userAgent } = req.body;
    const fingerprint = crypto.createHash("sha256").update(ip + userAgent).digest("hex");

    const existingVisitor = await Visitor.findOne({ fingerprint });
    if (!existingVisitor) {
      const newVisitor = new Visitor({ fingerprint, ip, userAgent });
      await newVisitor.save();

      const countDoc = await Count.findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true, upsert: true });
      return res.json({ count: countDoc.count });
    }

    res.json({ message: "Visitor already counted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error tracking visitor" });
  }
});

// Increment count manually
app.post("/api/increment", async (req, res) => {
  try {
    const incrementBy = req.body.incrementBy || 1;
    const countDoc = await Count.findOneAndUpdate({}, { $inc: { count: incrementBy } }, { new: true, upsert: true });
    res.json({ count: countDoc.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error incrementing count" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});