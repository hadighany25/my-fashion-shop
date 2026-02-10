// =========================================
// ១. កំណត់អថេរ និង ការរៀបចំ (SETUP)
// =========================================
let products = []; // អថេរសម្រាប់ទុកទិន្នន័យផលិតផលដែលទាញពី Server
const API_URL = "/api"; // ផ្លូវសម្រាប់ហៅទៅកាន់ Backend

// =========================================
// ២. មុខងារទាញទិន្នន័យពី SERVER (LOAD PRODUCTS)
// =========================================
async function loadProducts() {
  try {
    // ហៅទៅ API ដើម្បីយកទិន្នន័យ
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();

    // បើសិនមានទិន្នន័យ យើងយកវាដាក់ចូលអថេរ products
    if (data.length > 0) {
      products = data;
    } else {
      console.log("⚠️ មិនមានទិន្នន័យផលិតផលទេ (Database ទទេ)");
    }

    // បង្ហាញផលិតផលនៅលើអេក្រង់
    displayProducts(products);
  } catch (error) {
    console.error("Error loading products:", error);

    // បង្ហាញសារ Error លើអេក្រង់ បើភ្លេចបើក Server
    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.innerHTML = `
                <div style="text-align:center; color:red; width:100%; padding: 20px;">
                    <h3>⚠️ មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ</h3>
                    <p>សូមមេត្តាបើក "node server.js" នៅក្នុង Terminal ជាមុនសិន!</p>
                </div>
            `;
    }
  }
}

// =========================================
// ៣. មុខងារបង្ហាញផលិតផល (DISPLAY UI)
// =========================================
function displayProducts(items) {
  const grid = document.getElementById("productGrid");
  if (!grid) return; // បើរកមិនឃើញកន្លែងបង្ហាញ ឈប់ធ្វើការ

  // បើអត់មានទិន្នន័យ បង្ហាញសារប្រាប់
  if (items.length === 0) {
    grid.innerHTML = `<p style="text-align:center; width:100%; padding:20px;">មិនមានផលិតផលដែលអ្នកស្វែងរកទេ!</p>`;
    return;
  }

  // បង្កើត HTML សម្រាប់កាតផលិតផលនីមួយៗ
  grid.innerHTML = items
    .map(
      (p) => `
        <div class="product-card">
            <img src="${p.img}" alt="${p.name}" onclick="openModal(${p.id})" style="cursor: pointer;" title="ចុចដើម្បីមើលលម្អិត">
            <div class="product-info">
                <h3 onclick="openModal(${p.id})" style="cursor: pointer;">${p.name}</h3>
                <p class="price">$${p.price.toFixed(2)}</p>
                <div class="action-buttons">
                    <button class="add-to-cart" onclick="addToCart(${p.price}, '${p.name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-shopping-cart"></i> Add
                    </button>
                    <button class="buy-now" onclick="addToCart(${p.price}, '${p.name.replace(/'/g, "\\'")}', true)">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

// =========================================
// ៤. មុខងារស្វែងរក និង ច្រោះ (SEARCH & FILTER)
// =========================================

// ស្វែងរកតាមឈ្មោះ
function searchProducts() {
  const query = document.getElementById("productSearch").value.toLowerCase();
  // ច្រោះយកតែផលិតផលណាដែលមានឈ្មោះដូចពាក្យដែលវាយ
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query));
  displayProducts(filtered);
}

// ច្រោះតាមប្រភេទ (Category Buttons)
const filterButtons = document.querySelectorAll(".btn-filter");
if (filterButtons) {
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // ដក Class 'active' ចេញពីប៊ូតុងផ្សេងៗ
      document
        .querySelectorAll(".btn-filter")
        .forEach((b) => b.classList.remove("active"));
      // ដាក់ Class 'active' លើប៊ូតុងដែលកំពុងចុច
      e.target.classList.add("active");

      const cat = e.target.getAttribute("data-category");
      // បើយក 'all' បង្ហាញទាំងអស់ បើមិនចឹងទេ បង្ហាញតាម category
      const filtered =
        cat === "all" ? products : products.filter((p) => p.category === cat);
      displayProducts(filtered);
    });
  });
}

// =========================================
// ៥. មុខងារកន្ត្រកទំនិញ (SHOPPING CART)
// =========================================

// បង្ហាញសារជូនដំណឹងតូចមួយ (Toast Notification)
function showToast(message) {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.className = "show";
    toast.innerText = message;
    // ឱ្យវាបាត់ទៅវិញក្រោយ 3 វិនាទី
    setTimeout(() => {
      toast.className = toast.className.replace("show", "");
    }, 3000);
  }
}

// ដាក់ទំនិញចូលកន្ត្រក
function addToCart(price, name, isBuyNow = false) {
  // ១. ឆែកមើលថា Login ហើយឬនៅ?
  const user = localStorage.getItem("username");
  if (!user) {
    if (
      confirm(
        "សូម Login ដើម្បីធ្វើការបញ្ជាទិញ។\nតើអ្នកចង់ទៅកាន់ទំព័រ Login ដែរឬទេ?",
      )
    ) {
      window.location.href = "login.html";
    }
    return;
  }

  // ២. ទាញទិន្នន័យកន្ត្រកចាស់ពី LocalStorage
  let cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];

  // ៣. ឆែកមើលថាទំនិញហ្នឹងមានក្នុងកន្ត្រកឬនៅ?
  const existingItem = cart.find((item) => item.name === name);

  if (existingItem) {
    existingItem.qty += 1; // បើមានហើយ ថែមចំនួន
  } else {
    cart.push({ name, price: parseFloat(price), qty: 1 }); // បើអត់ទាន់មាន ដាក់ចូលថ្មី
  }

  // ៤. រក្សាទុកចូល LocalStorage វិញ
  localStorage.setItem("shoppingCart", JSON.stringify(cart));
  updateCartCount(); // អាប់ដេតលេខលើរូបកន្ត្រក

  // ៥. បើចុច "Buy Now" ឱ្យទៅកន្លែងបង់លុយតែម្តង
  if (isBuyNow) {
    window.location.href = "payment.html";
  } else {
    showToast(`បានដាក់ "${name}" ចូលកន្ត្រក!`);
    // បិទ Modal ប្រសិនបើវាកំពុងបើក
    const modal = document.getElementById("productModal");
    if (modal && modal.style.display === "block") {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }
}

// អាប់ដេតចំនួនលេខលើរូបកន្ត្រក
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const count = cart.reduce((total, item) => total + item.qty, 0);
  const cartBadge = document.querySelector(".cart-count");
  if (cartBadge) cartBadge.innerText = count;
}

// =========================================
// ៦. មុខងារ MODAL / POPUP (ផ្ទាំងលម្អិត)
// =========================================
const modal = document.getElementById("productModal");
const closeModalBtn = document.querySelector(".close-modal");

function openModal(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  // បញ្ចូលទិន្នន័យទៅក្នុង Modal
  document.getElementById("m-img").src = product.img;
  document.getElementById("m-name").innerText = product.name;
  document.getElementById("m-category").innerText =
    (product.category || "General").toUpperCase() + " COLLECTION";
  document.getElementById("m-price").innerText = "$" + product.price.toFixed(2);

  // កំណត់ប៊ូតុងក្នុង Modal
  document.getElementById("m-add-btn").onclick = () =>
    addToCart(product.price, product.name);
  document.getElementById("m-buy-btn").onclick = () =>
    addToCart(product.price, product.name, true);

  // បង្ហាញ Modal
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // ហាម Scroll ខាងក្រោយ
  }
}

// បិទ Modal
if (closeModalBtn) {
  closeModalBtn.onclick = () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  };
}
// បិទ Modal ពេលចុចខាងក្រៅ
window.onclick = (event) => {
  if (event.target == modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
};

// =========================================
// ៧. ដំណើរការពេលបើកវេបសាយភ្លាម (ON LOAD)
// =========================================
window.onload = () => {
  loadProducts(); // ទាញផលិតផល
  updateCartCount(); // អាប់ដេតកន្ត្រក

  // --- គ្រប់គ្រងការបង្ហាញ User Login ---
  const user = localStorage.getItem("username");
  const authLink = document.getElementById("auth-link");

  if (user && authLink) {
    // បើ Login ហើយ៖ ប្តូរពាក្យ Login ទៅជា Icon រូបមនុស្ស
    authLink.innerHTML = `<i class="fas fa-user-circle" style="font-size: 1.5rem;"></i>`;
    authLink.title = `សួស្តី, ${user}! ចុចដើម្បីចាកចេញ`;
    authLink.href = "#";

    // តុបតែង Icon បន្តិច
    authLink.style.display = "flex";
    authLink.style.alignItems = "center";
    authLink.style.color = "var(--accent)"; // ពណ៌ទឹកក្រូច

    // ពេលចុចលើ Icon ឱ្យ Logout
    authLink.onclick = (e) => {
      e.preventDefault();
      if (confirm(`សួស្តី ${user}!\n\nតើអ្នកចង់ចាកចេញ (Logout) មែនទេ?`)) {
        localStorage.removeItem("username"); // លុបឈ្មោះ
        localStorage.removeItem("token"); // លុប Token (បើមាន)
        window.location.href = "login.html"; // ត្រឡប់ទៅ Login វិញ
      }
    };
  }
};

// --- Mobile Menu Toggle ---
const mobileMenu = document.getElementById("mobileMenu");
const navLinks = document.getElementById("navLinks");
if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });
}
