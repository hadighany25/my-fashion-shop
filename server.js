const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 សំខាន់សម្រាប់ Online: បង្ហាញឯកសារ HTML/CSS/JS ពី Folder នេះ
app.use(express.static("."));

// --- កំណត់ទីតាំងឯកសារ ---
const USERS_FILE = "./users.json";
const PRODUCTS_FILE = "./products.json";
const SECRET_KEY = "FASHION_SHOP_SECRET"; // អាចដូរទៅជាអ្វីក៏បាន

// --- FUNCTIONS ជំនួយ (អាន/សរសេរ File) ---
const getData = (file) => {
  if (!fs.existsSync(file)) {
    // បើអត់ទាន់មាន File បង្កើតថ្មីដាក់ []
    fs.writeFileSync(file, "[]");
    return [];
  }
  try {
    const data = fs.readFileSync(file);
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveData = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ==============================
// 1. USER API (Login/Register)
// ==============================

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Please fill all fields" });
  }

  let users = getData(USERS_FILE);

  // ឆែកមើលក្រែងលោមានឈ្មោះជាន់គ្នា
  if (users.find((u) => u.username === username))
    return res.status(400).json({ message: "Username already exists!" });

  // Hash Password (សុវត្ថិភាព)
  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ username, password: hashedPassword });
  saveData(USERS_FILE, users);

  res.status(201).json({ success: true, message: "Register success!" });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const users = getData(USERS_FILE);

  const user = users.find((u) => u.username === username);

  if (user && (await bcrypt.compare(password, user.password))) {
    // បង្កើត Token (សម្គាល់ខ្លួន)
    const token = jwt.sign({ username: user.username }, SECRET_KEY, {
      expiresIn: "1h",
    });

    // ផ្ញើឈ្មោះ និង Token ទៅវិញ
    res.json({ success: true, token, username: user.username });
  } else {
    res
      .status(401)
      .json({ success: false, message: "Invalid username or password!" });
  }
});

// ==============================
// 2. ADMIN API (មើលស្ថិតិ)
// ==============================
app.get("/api/admin/users", (req, res) => {
  const users = getData(USERS_FILE);
  // ផ្ញើតែឈ្មោះទៅបានហើយ កុំផ្ញើ Password
  const safeUsers = users.map((u) => ({ username: u.username }));
  res.json(safeUsers);
});

// ==============================
// 3. PRODUCT API (គ្រប់គ្រងទំនិញ)
// ==============================

// Get All Products (អានផលិតផល)
app.get("/api/products", (req, res) => {
  const products = getData(PRODUCTS_FILE);
  res.json(products);
});

// Add Product (បន្ថែមផលិតផល - សម្រាប់ Admin)
app.post("/api/products", (req, res) => {
  const { name, price, category, img } = req.body;
  let products = getData(PRODUCTS_FILE);

  const newProduct = {
    id: Date.now(), // បង្កើត ID ដោយស្វ័យប្រវត្តិ
    name,
    price: parseFloat(price),
    category,
    img,
  };

  products.push(newProduct);
  saveData(PRODUCTS_FILE, products);
  res
    .status(201)
    .json({ success: true, message: "Product added!", product: newProduct });
});

// Delete Product (លុបផលិតផល - សម្រាប់ Admin)
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  let products = getData(PRODUCTS_FILE);

  // រក្សាទុកតែផលិតផលណាដែល ID មិនដូចអាដែលចង់លុប
  const newProducts = products.filter((p) => p.id != id);

  saveData(PRODUCTS_FILE, newProducts);
  res.json({ success: true, message: "Product deleted" });
});

// ==============================
// 4. PAYMENT API (QR Code Check)
// ==============================

let orders = {}; // ទុកក្នុង RAM (បិទ Server បាត់) - សម្រាប់ Demo គឺ OK

// ទូរស័ព្ទហៅមកកាន់ API នេះដើម្បីប្រាប់ថា "បង់លុយហើយ"
app.post("/api/pay-confirm", (req, res) => {
  const { orderId } = req.body;
  if (orderId) {
    orders[orderId] = "SUCCESS";
    console.log(`Order ${orderId} has been PAID!`);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

// កុំព្យូទ័រហៅមកសួរថា "បង់លុយនៅ?"
app.get("/api/check-status/:orderId", (req, res) => {
  const { orderId } = req.params;
  const status = orders[orderId] || "PENDING";

  // បើជោគជ័យហើយ លុបចេញពី RAM ដើម្បីកុំឱ្យធ្ងន់
  if (status === "SUCCESS") delete orders[orderId];

  res.json({ status });
});

// ==============================
// START SERVER
// ==============================

// ប្រើ PORT ពី System (សម្រាប់ Glitch/Render) ឬ 5000 (សម្រាប់ Local)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
