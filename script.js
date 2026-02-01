// --- ១. កំណត់អថេរ (VARIABLES) ---
let products = []; // ទុកទទេសិន ចាំទាញពី Server
const API_URL = "/api";

// --- ២. មុខងារទាញទិន្នន័យពី SERVER (សំខាន់បំផុត) ---
async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();

    // បើសិនក្នុង Server មានទិន្នន័យ យើងយកវាប្រើ
    if (data.length > 0) {
      products = data;
    } else {
      // បើអត់ទាន់មាន (ទើបបង្កើតថ្មី) យើងបង្ហាញសារក្នុង Console
      console.log("No products found in database.");
    }

    displayProducts(products); // បង្ហាញចេញមកក្រៅ
  } catch (error) {
    console.error("Error loading products:", error);
    // បង្ហាញសារប្រាប់ បើភ្លេចបើក Server
    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.innerHTML = `<p style="text-align:center; color:red; width:100%;">
        ⚠️ មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ។<br>
        សូមបើក "node server.js" ជាមុនសិន!
      </p>`;
    }
  }
}

// --- ៣. មុខងារបង្ហាញផលិតផល (DISPLAY) ---
function displayProducts(items) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `<p style="text-align:center; width:100%;">No products available. Please add via Admin Panel.</p>`;
    return;
  }

  grid.innerHTML = items
    .map(
      (p) => `
        <div class="product-card">
            <img src="${p.img}" alt="${p.name}" onclick="openModal(${p.id})" style="cursor: pointer;" title="Click to view details">
            <div class="product-info">
                <h3 onclick="openModal(${p.id})" style="cursor: pointer;">${p.name}</h3>
                <p class="price">$${p.price.toFixed(2)}</p>
                <div class="action-buttons">
                    <button class="add-to-cart" onclick="addToCart(${p.price}, '${p.name}')">Add to Cart</button>
                    <button class="buy-now" onclick="addToCart(${p.price}, '${p.name}', true)">Buy Now</button>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

// --- ៤. មុខងារស្វែងរក (SEARCH) ---
function searchProducts() {
  const query = document.getElementById("productSearch").value.toLowerCase();
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query));
  displayProducts(filtered);
}

// --- ៥. Category Filter ---
document.querySelectorAll(".btn-filter").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document
      .querySelectorAll(".btn-filter")
      .forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");

    const cat = e.target.getAttribute("data-category");
    const filtered =
      cat === "all" ? products : products.filter((p) => p.category === cat);
    displayProducts(filtered);
  });
});

// --- ៦. មុខងារ ADD TO CART (មាន Check Login) ---
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
  // Check Login
  const user = localStorage.getItem("username");
  if (!user) {
    if (confirm("Please Login to purchase items.\nGo to Login page?")) {
      window.location.href = "login.html";
    }
    return;
  }

  let cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const existingItem = cart.find((item) => item.name === name);

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ name, price: parseFloat(price), qty: 1 });
  }

  localStorage.setItem("shoppingCart", JSON.stringify(cart));
  updateCartCount();

  if (isBuyNow) {
    window.location.href = "payment.html";
  } else {
    showToast(`Added "${name}" to Cart!`);
    // Close Modal if open
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
  if (cartBadge) cartBadge.innerText = count;
}

// --- ៧. មុខងារ MODAL (POPUP) ---
const modal = document.getElementById("productModal");
const closeModalBtn = document.querySelector(".close-modal");

function openModal(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  document.getElementById("m-img").src = product.img;
  document.getElementById("m-name").innerText = product.name;
  document.getElementById("m-category").innerText =
    product.category.toUpperCase() + " COLLECTION";
  document.getElementById("m-price").innerText = "$" + product.price.toFixed(2);

  document.getElementById("m-add-btn").onclick = () =>
    addToCart(product.price, product.name);
  document.getElementById("m-buy-btn").onclick = () =>
    addToCart(product.price, product.name, true);

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

// --- ៨. ON LOAD (ហៅទិន្នន័យពេលបើកវេបសាយ) ---
window.onload = () => {
  loadProducts();
  updateCartCount();

  // Login Display (កែត្រង់នេះ)
  const user = localStorage.getItem("username");
  const authLink = document.getElementById("auth-link");

  if (user && authLink) {
    // ប្តូរទៅជា Icon រូបមនុស្ស (User Circle)
    authLink.innerHTML = `<i class="fas fa-user-circle" style="font-size: 1.5rem;"></i>`;

    // ដាក់ Title ដើម្បីឱ្យពេលយក Mouse ទៅដាក់ វាលោតឈ្មោះឈ្មោះ
    authLink.title = `Hi, ${user}! Click to Logout`;
    authLink.href = "#";

    // ដាក់ Style បន្ថែមបន្តិចឱ្យស្អាត
    authLink.style.display = "flex";
    authLink.style.alignItems = "center";
    authLink.style.color = "var(--accent)"; // ឱ្យចេញពណ៌ទឹកក្រូច

    // ពេលចុចលើ Icon
    authLink.onclick = (e) => {
      e.preventDefault(); // ហាមមិនឱ្យលោតទៅលើ

      // លោតផ្ទាំងសួរ
      if (confirm(`សួស្តី ${user}!\n\nតើអ្នកចង់ចាកចេញ (Logout) មែនទេ?`)) {
        localStorage.clear(); // លុបឈ្មោះចោល
        window.location.href = "login.html"; // ត្រឡប់ទៅ Login វិញ
      }
    };
  }
};

// Mobile Menu
const mobileMenu = document.getElementById("mobileMenu");
const navLinks = document.getElementById("navLinks");
if (mobileMenu) {
  mobileMenu.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });
}
