// =========================================
// ១. កំណត់អថេរ និង ការរៀបចំ (SETUP)
// =========================================
let products = [];
const API_URL = "/api";

// =========================================
// ២. មុខងារទាញទិន្នន័យពី SERVER (LOAD PRODUCTS)
// =========================================
async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();

    if (data.length > 0) {
      products = data;
    } else {
      console.log("⚠️ មិនមានទិន្នន័យផលិតផលទេ (Database ទទេ)");
    }

    displayProducts(products);
  } catch (error) {
    console.error("Error loading products:", error);
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

// 🔥 មុខងារថ្មី៖ ឆែកមើលប្រវត្តិបង់លុយ (បើបង់ជោគជ័យ លុបកន្ត្រកចោល) 🔥
async function checkPendingOrder() {
  const pendingOrderId = localStorage.getItem("pendingOrder");
  if (pendingOrderId) {
    try {
      const res = await fetch(`${API_URL}/check-status/${pendingOrderId}`);
      const data = await res.json();

      if (data.status === "SUCCESS") {
        console.log("✅ រកឃើញការបង់ប្រាក់ជោគជ័យ! លុបកន្ត្រកចេញ...");
        localStorage.setItem("shoppingCart", "[]"); // លុបកន្ត្រក
        localStorage.removeItem("pendingOrder"); // លុបប្រវត្តិរង់ចាំ
        updateCartCount(); // ទម្លាក់លេខលើកន្ត្រកមក ០ វិញ
      }
    } catch (error) {
      console.error("Error checking pending order:", error);
    }
  }
}

// 🔥 មុខងារថ្មី៖ AUTO UPDATE PRODUCTS និងកន្ត្រក (រៀងរាល់ ៣ វិនាទី) 🔥
async function autoUpdateProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const latestProducts = await res.json();

    // ឱ្យវាអាប់ដេតលេខលើកន្ត្រករៀងរាល់ ៣ វិនាទី
    updateCartCount();

    // ឱ្យវាឆែកមើលវិក្កយបត្រ ដែលទើបនឹងបង់រួច
    checkPendingOrder();

    if (JSON.stringify(products) !== JSON.stringify(latestProducts)) {
      console.log("🔄 Update ស្វ័យប្រវត្តិ៖ រកឃើញទិន្នន័យថ្មី!");
      products = latestProducts;

      const activeFilter = document.querySelector(".btn-filter.active");
      const searchQuery = document
        .getElementById("productSearch")
        .value.toLowerCase();

      let filtered = products;

      if (searchQuery) {
        filtered = filtered.filter((p) =>
          p.name.toLowerCase().includes(searchQuery),
        );
      }

      if (
        activeFilter &&
        activeFilter.getAttribute("data-category") !== "all"
      ) {
        filtered = filtered.filter(
          (p) => p.category === activeFilter.getAttribute("data-category"),
        );
      }

      displayProducts(filtered);
    }
  } catch (error) {
    // ស្ងាត់ៗ បើ Error
  }
}

setInterval(autoUpdateProducts, 1000);
// --------------------------------------------------------

// =========================================
// ៣. មុខងារបង្ហាញផលិតផល (DISPLAY UI)
// =========================================
function displayProducts(items) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `<p style="text-align:center; width:100%; padding:20px;">មិនមានផលិតផលដែលអ្នកស្វែងរកទេ!</p>`;
    return;
  }

  grid.innerHTML = items
    .map((p) => {
      let safePrice = parseFloat(p.price);
      if (isNaN(safePrice)) safePrice = 0;
      let safeName = (p.name || "Unknown Product").replace(/'/g, "\\'");
      let safeImg = p.img || "https://via.placeholder.com/150";

      let stockCount = parseInt(p.stock) || 0;
      let isOutOfStock = stockCount <= 0;

      let stockDisplay = isOutOfStock
        ? `<span style="color: red; font-weight: bold; font-size: 0.85rem;">Out of Stock</span>`
        : `<span style="color: green; font-size: 0.85rem;">In Stock: ${stockCount}</span>`;

      let btnState = isOutOfStock
        ? "disabled style='background: #ccc; cursor: not-allowed;'"
        : "";

      return `
        <div class="product-card">
            <img src="${safeImg}" 
                 alt="${safeName}" 
                 onclick="openModal(${p.id})" 
                 style="cursor: pointer;" 
                 onerror="this.src='https://via.placeholder.com/150'">
                 
            <div class="product-info">
                <h3 onclick="openModal(${p.id})" style="cursor: pointer;">${p.name || "No Name"}</h3>
                <p class="price">$${safePrice.toFixed(2)}</p>
                
                <p style="margin-bottom: 10px;">${stockDisplay}</p>
                
                <div class="action-buttons">
                    <button class="add-to-cart" ${btnState} onclick="addToCart(${safePrice}, '${safeName}')">
                        <i class="fas fa-shopping-cart"></i> Add
                    </button>
                    <button class="buy-now" ${btnState} onclick="addToCart(${safePrice}, '${safeName}', true)">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
}

// =========================================
// ៤. មុខងារស្វែងរក និង ច្រោះ (SEARCH & FILTER)
// =========================================

function searchProducts() {
  const query = document.getElementById("productSearch").value.toLowerCase();
  const activeFilter = document
    .querySelector(".btn-filter.active")
    .getAttribute("data-category");

  let filtered = products.filter((p) => p.name.toLowerCase().includes(query));

  if (activeFilter !== "all") {
    filtered = filtered.filter((p) => p.category === activeFilter);
  }

  displayProducts(filtered);
}

const filterButtons = document.querySelectorAll(".btn-filter");
if (filterButtons) {
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".btn-filter")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      searchProducts();
    });
  });
}

// =========================================
// ៥. មុខងារកន្ត្រកទំនិញ (SHOPPING CART)
// =========================================

function showToast(message) {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.className = "show";
    toast.innerText = message;
    setTimeout(() => {
      toast.className = toast.className.replace("show", "");
    }, 3000);
  }
}

function addToCart(price, name, isBuyNow = false) {
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

  const productInfo = products.find((p) => p.name === name);
  const maxStock = productInfo ? parseInt(productInfo.stock) || 0 : 0;

  if (maxStock <= 0) {
    alert("សុំទោស! ទំនិញនេះបានអស់ពីស្តុកហើយ។");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const existingItem = cart.find((item) => item.name === name);
  const currentQty = existingItem ? existingItem.qty : 0;

  if (currentQty + 1 > maxStock) {
    alert(
      `សុំទោស! ទំនិញ "${name}" មានក្នុងស្តុកតែ ${maxStock} ប៉ុណ្ណោះ។ អ្នកមិនអាចទិញលើសនេះបានទេ។`,
    );
    return;
  }

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ id: productInfo.id, name, price: parseFloat(price), qty: 1 });
  }

  localStorage.setItem("shoppingCart", JSON.stringify(cart));
  updateCartCount();

  if (isBuyNow) {
    window.location.href = "payment.html";
  } else {
    showToast(`បានដាក់ "${name}" ចូលកន្ត្រក!`);
    const modal = document.getElementById("productModal");
    if (modal && modal.style.display === "block") {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const count = cart.reduce((total, item) => total + item.qty, 0);
  const cartBadge = document.querySelector(".cart-count");
  if (cartBadge) {
    cartBadge.innerText = count > 0 ? count : "0";
  }
}

// =========================================
// ៦. មុខងារ MODAL / POPUP (ផ្ទាំងលម្អិត)
// =========================================
const modal = document.getElementById("productModal");
const closeModalBtn = document.querySelector(".close-modal");

function openModal(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  document.getElementById("m-img").src = product.img;
  document.getElementById("m-name").innerText = product.name;
  document.getElementById("m-category").innerText =
    (product.category || "General").toUpperCase() + " COLLECTION";
  document.getElementById("m-price").innerText = "$" + product.price.toFixed(2);

  const stockCount = parseInt(product.stock) || 0;
  const isOutOfStock = stockCount <= 0;

  const addBtn = document.getElementById("m-add-btn");
  const buyBtn = document.getElementById("m-buy-btn");

  if (isOutOfStock) {
    addBtn.disabled = true;
    addBtn.style.background = "#ccc";
    addBtn.style.cursor = "not-allowed";
    addBtn.innerText = "Out of Stock";

    buyBtn.disabled = true;
    buyBtn.style.background = "#ccc";
    buyBtn.style.cursor = "not-allowed";
  } else {
    addBtn.disabled = false;
    addBtn.style.background = "";
    addBtn.style.cursor = "pointer";
    addBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Add to Cart`;

    buyBtn.disabled = false;
    buyBtn.style.background = "";
    buyBtn.style.cursor = "pointer";
  }

  addBtn.onclick = () => addToCart(product.price, product.name);
  buyBtn.onclick = () => addToCart(product.price, product.name, true);

  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

if (closeModalBtn) {
  closeModalBtn.onclick = () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  };
}
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
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";

  loadProducts();
  updateCartCount();

  const user = localStorage.getItem("username");
  const authLink = document.getElementById("auth-link");

  if (user && authLink) {
    authLink.innerHTML = `<i class="fas fa-user-circle" style="font-size: 1.5rem;"></i>`;
    authLink.title = `សួស្តី, ${user}! ចុចដើម្បីចាកចេញ`;
    authLink.href = "#";

    authLink.style.display = "flex";
    authLink.style.alignItems = "center";
    authLink.style.color = "var(--accent)";

    authLink.onclick = (e) => {
      e.preventDefault();
      if (confirm(`សួស្តី ${user}!\n\nតើអ្នកចង់ចាកចេញ (Logout) មែនទេ?`)) {
        localStorage.removeItem("username");
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    };
  }
};

const mobileMenu = document.getElementById("mobileMenu");
const navLinks = document.getElementById("navLinks");
if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });
}
