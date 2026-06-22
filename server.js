const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");
const app = express();

// --- CONFIGURATION ---
app.use(express.json());
app.use(cors());
app.use(express.static("."));

const USERS_FILE = "./users.json";
const PRODUCTS_FILE = "./products.json";
const ORDERS_FILE = "./orders.json";
const SECRET_KEY = "FASHION_SHOP_SECRET";

// ==============================
// មុខងារ TELEGRAM BOT
// ==============================
const TELEGRAM_TOKEN = "8792242361:AAEsTUduTrEawl4_SfmtUtBcyAykrNzSYbA";
const CHAT_ID = "5612301669";

// 🔥 ផ្ញើសារភ្ជាប់ជាមួយប៊ូតុងដំបូង (រង់ចាំការដឹកជញ្ជូន)
async function sendTelegramNotification(textMessage, orderId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: textMessage,
        parse_mode: "HTML",
        // ប៊ូតុងជំហានដំបូងបំផុត
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚚 ប្តូរទៅជា: កំពុងដឹកជញ្ជូន",
                callback_data: `ship_${orderId}`,
              },
            ],
          ],
        },
      }),
    });
    if (response.ok) console.log("✅ បានផ្ញើសារ និងប៊ូតុងចូល Telegram ជោគជ័យ!");
  } catch (error) {
    console.error("❌ មានបញ្ហាក្នុងការភ្ជាប់ទៅ Telegram:", error);
  }
}

// --- FUNCTIONS ជំនួយ ---
const getData = (file) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return [];
  }
};

const saveData = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ==============================
// 1. USER API
// ==============================
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Please fill all fields" });
  let users = getData(USERS_FILE);
  if (users.find((u) => u.username === username))
    return res.status(400).json({ message: "Username already exists!" });
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
    const token = jwt.sign({ username: user.username }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({ success: true, token, username: user.username });
  } else {
    res
      .status(401)
      .json({ success: false, message: "Invalid username or password!" });
  }
});

// ==============================
// 2. PRODUCT API
// ==============================
app.get("/api/products", (req, res) => res.json(getData(PRODUCTS_FILE)));

app.post("/api/products", (req, res) => {
  const { name, price, category, img, stock } = req.body;
  let products = getData(PRODUCTS_FILE);
  const newProduct = {
    id: Date.now(),
    name,
    price: parseFloat(price),
    category,
    img,
    stock: parseInt(stock) || 0,
  };
  products.push(newProduct);
  saveData(PRODUCTS_FILE, products);
  res.status(201).json({ success: true, product: newProduct });
});

app.put("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, category, img, stock } = req.body;
  let products = getData(PRODUCTS_FILE);
  const index = products.findIndex((p) => p.id === id);
  if (index !== -1) {
    products[index] = {
      ...products[index],
      name: name || products[index].name,
      price: price ? parseFloat(price) : products[index].price,
      category: category || products[index].category,
      img: img || products[index].img,
      stock: stock !== undefined ? parseInt(stock) : products[index].stock,
    };
    saveData(PRODUCTS_FILE, products);
    res.json({ success: true, product: products[index] });
  } else {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let products = getData(PRODUCTS_FILE);
  const newProducts = products.filter((p) => p.id !== id);
  if (products.length !== newProducts.length) {
    saveData(PRODUCTS_FILE, newProducts);
    res.json({ success: true, message: "Product deleted" });
  } else {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

// ==============================
// 3. PAYMENT & ORDER HISTORY API
// ==============================
let orders = {};

app.post("/api/create-order", (req, res) => {
  const { orderId, cart, user, itemsString, amount } = req.body;
  orders[orderId] = { status: "PENDING", cart, user, itemsString, amount };
  res.json({ success: true });
});

// 🔥 កែសម្រួល API ទទួលការបញ្ជាក់ការបង់ប្រាក់ (Webook) 🔥
app.post("/api/pay-confirm", (req, res) => {
  const { orderId } = req.body;
  console.log(`✅ [Webhook Received] Order ID: ${orderId}`);

  // ១. ប្តូរស្ថានភាពក្នុង Memory ឱ្យអ្នកដែលកំពុងរង់ចាំ (Polling) ឃើញថា SUCCESS
  if (orderId && orders[orderId]) {
    orders[orderId].status = "SUCCESS";

    const order = orders[orderId];

    // ២. កាត់ស្តុកទំនិញក្នុងផលិតផល
    let products = getData(PRODUCTS_FILE);
    if (order.cart && Array.isArray(order.cart)) {
      order.cart.forEach((cartItem) => {
        let pIndex = products.findIndex(
          (p) => p.id === cartItem.id || p.name === cartItem.name,
        );
        if (pIndex !== -1) {
          products[pIndex].stock = Math.max(
            0,
            (products[pIndex].stock || 0) - cartItem.qty,
          );
        }
      });
      saveData(PRODUCTS_FILE, products);
    }

    // ៣. រក្សាទុកប្រវត្តិទិញចូល orders.json ជារៀងរហូត
    const time = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });
    let allSavedOrders = getData(ORDERS_FILE);
    allSavedOrders.push({
      orderId: orderId,
      user: order.user || "Unknown",
      itemsString: order.itemsString || "",
      amount: order.amount || 0,
      date: time,
      status: "Preparing",
    });
    saveData(ORDERS_FILE, allSavedOrders);

    // ៤. ផ្ញើសារដំណឹងទៅ Telegram ម្ចាស់ហាង
    const message =
      `🛍️ <b>មានការបញ្ជាទិញថ្មី (Fashion Shop)!</b>\n` +
      `━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>អតិថិជន:</b> ${order.user || "Unknown"}\n` +
      `💳 <b>វិក្កយបត្រ:</b> #${orderId}\n` +
      `💰 <b>សរុប:</b> $${order.amount || "0.00"}\n` +
      `✅ <b>ស្ថានភាព:</b> 📦 កំពុងរៀបចំអីវ៉ាន់`;

    sendTelegramNotification(message, orderId);

    return res.json({ success: true });
  } else {
    console.error("❌ រកមិនឃើញ Order ID ក្នុង Memory ទេ:", orderId);
    return res
      .status(400)
      .json({ success: false, message: "Order not found in memory" });
  }
});

app.get("/api/check-status/:orderId", (req, res) => {
  const { orderId } = req.params;
  const status = (orders[orderId] && orders[orderId].status) || "PENDING";
  if (status === "SUCCESS") delete orders[orderId];
  res.json({ status });
});

app.get("/api/orders/:username", (req, res) => {
  const { username } = req.params;
  const allSavedOrders = getData(ORDERS_FILE);
  const userOrders = allSavedOrders
    .filter((o) => o.user === username)
    .reverse();
  res.json(userOrders);
});

// ==============================
// 🤖 4. TELEGRAM BOT ACTION LISTENER
// ==============================
let lastUpdateId = 0;

async function pollTelegramUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`,
    );
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        if (update.callback_query) {
          const callbackData = update.callback_query.data;
          const queryId = update.callback_query.id;
          const messageId = update.callback_query.message.message_id;
          const chatId = update.callback_query.message.chat.id;

          let newStatus = "";
          let targetOrderId = "";
          let alertMsg = "";
          let newKeyboard = [];
          let newStatusText = "";

          // 🔥 ប្រព័ន្ធប្តូរស្ថានភាពជាដំណាក់កាល
          if (callbackData.startsWith("ship_")) {
            newStatus = "Shipping";
            targetOrderId = callbackData.replace("ship_", "");
            alertMsg = "បានប្តូរទៅជា៖ 🚚 កំពុងដឹកជញ្ជូន";
            newStatusText = "🚚 កំពុងធ្វើការដឹកជញ្ជូន";
            newKeyboard = [
              [
                {
                  text: "✅ ប្តូរទៅជា: ទទួលបានហើយ",
                  callback_data: `done_${targetOrderId}`,
                },
              ],
            ];
          } else if (callbackData.startsWith("done_")) {
            newStatus = "Delivered";
            targetOrderId = callbackData.replace("done_", "");
            alertMsg = "បានប្តូរទៅជា៖ ✅ ទទួលបានហើយ";
            newStatusText = "✅ អតិថិជនទទួលបានហើយ";
            newKeyboard = []; // ដល់ដំណាក់កាលចុងក្រោយ លុបប៊ូតុងចោល
          }

          if (targetOrderId && newStatus) {
            let allSavedOrders = getData(ORDERS_FILE);
            let orderIndex = allSavedOrders.findIndex(
              (o) => o.orderId === targetOrderId,
            );

            if (orderIndex !== -1) {
              allSavedOrders[orderIndex].status = newStatus;
              saveData(ORDERS_FILE, allSavedOrders);

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: queryId,
                    text: alertMsg,
                  }),
                },
              );

              // ទាញអត្ថបទដើម ហើយកាត់យកត្រឹមពាក្យ "✅ ស្ថានភាព:" ចោល ដើម្បីកុំឱ្យវាជាន់គ្នា
              let originalText = update.callback_query.message.text;
              let textWithoutStatus = originalText
                .split("✅ ស្ថានភាព:")[0]
                .trim();

              await fetch(
                `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: textWithoutStatus + `\n✅ ស្ថានភាព: ${newStatusText}`,
                    reply_markup:
                      newKeyboard.length > 0
                        ? { inline_keyboard: newKeyboard }
                        : undefined,
                  }),
                },
              );

              console.log(
                `🤖 Telegram Bot: Updated Order ${targetOrderId} to ${newStatus}`,
              );
            }
          }
        }
      }
    }
  } catch (err) {
    // ស្ងាត់ៗបើ Error
  }
}
setInterval(pollTelegramUpdates, 2000);

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Fashion Shop Server running on port ${PORT}`);
});
module.exports = app;
