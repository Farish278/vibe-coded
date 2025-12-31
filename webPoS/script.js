// Initial state
let categories = JSON.parse(localStorage.getItem('pos_categories')) || ['Coffee', 'Pastry', 'Sandwich', 'Cold Drink', 'Dessert'];
let items = JSON.parse(localStorage.getItem('pos_items')) || [
    { id: 1, name: 'Hot Latte', category: 'Coffee', price: 4.50, image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400&h=300&fit=crop', emoji: '' },
    { id: 2, name: 'Croissant', category: 'Pastry', price: 3.25, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop', emoji: '' },
    { id: 3, name: 'Iced Americano', category: 'Coffee', price: 3.50, image: '', emoji: '🧊' },
    { id: 4, name: 'Salmon Bagel', category: 'Sandwich', price: 8.50, image: '', emoji: '🥯' },
    { id: 5, name: 'Chocolate Muffin', category: 'Pastry', price: 3.75, image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&h=300&fit=crop', emoji: '' },
    { id: 6, name: 'Cheesecake', category: 'Dessert', price: 5.50, image: '', emoji: '🍰' },
    { id: 7, name: 'Green Tea', category: 'Cold Drink', price: 4.00, image: '', emoji: '🍵' },
    { id: 8, name: 'Club Sandwich', category: 'Sandwich', price: 7.25, image: '', emoji: '🥪' }
];
let settings = JSON.parse(localStorage.getItem('pos_settings')) || {
    tax: 10.0,
    serviceCharge: 5.0
};

let cart = [];
let editMode = false;
let catEditMode = false;
let activeCategory = 'All';

// DOM Elements
const storeGrid = document.getElementById('storeGrid');
const managementTable = document.getElementById('managementTable');
const categoryTable = document.getElementById('categoryTable');
const categoryFilters = document.getElementById('categoryFilters');
const categoryDropdown = document.getElementById('itemCategory');
const cartItemsContainer = document.getElementById('cartItems');
const subtotalText = document.getElementById('subtotalText');
const taxText = document.getElementById('taxText');
const serviceChargeText = document.getElementById('serviceChargeText');
const taxLabel = document.getElementById('taxLabel');
const serviceLabel = document.getElementById('serviceLabel');
const totalText = document.getElementById('totalText');
const checkoutBtn = document.getElementById('checkoutBtn');
const itemForm = document.getElementById('itemForm');
const settingsForm = document.getElementById('settingsForm');
const itemImageInput = document.getElementById('itemImage');
const imagePreview = document.getElementById('imagePreview');
const searchInput = document.getElementById('searchItems');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    saveToStorage();
    renderAll();
});

// localStorage Handlers
function saveToStorage() {
    localStorage.setItem('pos_items', JSON.stringify(items));
    localStorage.setItem('pos_categories', JSON.stringify(categories));
    localStorage.setItem('pos_settings', JSON.stringify(settings));
}

function clearStorage() {
    if (confirm('Are you sure you want to reset everything?')) {
        localStorage.clear();
        location.reload();
    }
}

function renderAll() {
    renderStore();
    renderManagement();
    renderCategories();
    populateCategoryDropdown();
    initSettingsView();
}

function initSettingsView() {
    document.getElementById('taxRate').value = settings.tax;
    document.getElementById('serviceChargeRate').value = settings.serviceCharge;
    taxLabel.textContent = settings.tax;
    serviceLabel.textContent = settings.serviceCharge;
}

settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.tax = parseFloat(document.getElementById('taxRate').value);
    settings.serviceCharge = parseFloat(document.getElementById('serviceChargeRate').value);
    saveToStorage();
    renderAll();
    updateCart();
    alert('Settings saved successfully!');
});

// Image to Base64
itemImageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            imagePreview.querySelector('img').src = event.target.result;
            imagePreview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }
});

// CRUD Operations
const categoryForm = document.getElementById('categoryForm');

categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();

    if (catEditMode) {
        const oldName = categories[id];
        items.forEach(item => {
            if (item.category === oldName) item.category = name;
        });
        categories[id] = name;
    } else {
        if (categories.includes(name)) {
            alert('Category already exists!');
            return;
        }
        categories.push(name);
    }

    saveToStorage();
    renderAll();
    bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
});

function editCategory(index) {
    catEditMode = true;
    const cat = categories[index];
    document.getElementById('catModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = index;
    document.getElementById('categoryName').value = cat;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('categoryModal'));
    modal.show();
}

function deleteCategory(index) {
    const catName = categories[index];
    if (confirm(`Delete "${catName}"? Items in this category will be uncategorized.`)) {
        items.forEach(item => {
            if (item.category === catName) item.category = 'Uncategorized';
        });
        categories.splice(index, 1);
        if (activeCategory === catName) activeCategory = 'All';
        saveToStorage();
        renderAll();
    }
}

itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const emoji = document.getElementById('itemEmoji').value;
    const image = imagePreview.classList.contains('d-none') ? '' : imagePreview.querySelector('img').src;

    if (editMode) {
        const index = items.findIndex(i => i.id == id);
        items[index] = { ...items[index], name, category, price, image, emoji };
    } else {
        const newId = Date.now();
        items.push({ id: newId, name, category, price, image, emoji });
    }

    saveToStorage();
    renderAll();
    bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
    itemForm.reset();
    imagePreview.classList.add('d-none');
});

function deleteItem(id) {
    if (confirm('Delete this item?')) {
        items = items.filter(i => i.id != id);
        saveToStorage();
        renderAll();
    }
}

function editItem(id) {
    editMode = true;
    const item = items.find(i => i.id == id);
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemEmoji').value = item.emoji || '';

    if (item.image) {
        imagePreview.querySelector('img').src = item.image;
        imagePreview.classList.remove('d-none');
    } else {
        imagePreview.classList.add('d-none');
    }
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal'));
    modal.show();
}

// Helper to get visual for item
function getItemVisual(item, type = 'card') {
    const imgClass = type === 'card' ? 'product-image' : (type === 'thumb' ? 'management-thumb' : 'cart-item-image');
    const containerClass = type === 'card' ? 'product-image-container' : (type === 'thumb' ? 'management-thumb-container' : 'cart-item-image-container');

    if (item.image) {
        return `<div class="${containerClass}"><img src="${item.image}" class="${imgClass}" alt="${item.name}"></div>`;
    } else if (item.emoji) {
        return `<div class="${containerClass}"><span>${item.emoji}</span></div>`;
    } else {
        return `<div class="${containerClass}"><i class="bi bi-cup-hot placeholder-icon"></i></div>`;
    }
}

// Reset modals on open
document.getElementById('itemModal').addEventListener('show.bs.modal', function (event) {
    if (!event.relatedTarget) return;
    editMode = false;
    document.getElementById('modalTitle').textContent = 'Add New Item';
    itemForm.reset();
    imagePreview.classList.add('d-none');
});

document.getElementById('categoryModal').addEventListener('show.bs.modal', function (event) {
    if (!event.relatedTarget) return;
    catEditMode = false;
    document.getElementById('catModalTitle').textContent = 'Add Category';
    categoryForm.reset();
});

// Render Logic
function renderStore(filter = '') {
    storeGrid.innerHTML = '';
    renderFilterPills();

    let filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));
    if (activeCategory !== 'All') {
        filtered = filtered.filter(i => i.category === activeCategory);
    }

    filtered.forEach(item => {
        const visual = getItemVisual(item, 'card');
        storeGrid.innerHTML += `
            <div class="col-6 col-md-4 col-xl-3">
                <div class="card h-100 product-card shadow-sm" onclick="addToCart(${item.id})">
                    ${visual}
                    <div class="card-body p-3">
                        <small class="text-primary fw-bold text-uppercase" style="font-size: 0.7rem;">${item.category}</small>
                        <h6 class="card-title fw-bold mb-1">${item.name}</h6>
                        <p class="card-text text-muted mb-0 small">$${item.price.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderFilterPills() {
    categoryFilters.innerHTML = `<div class="filter-pill ${activeCategory === 'All' ? 'active' : ''}" onclick="setCategoryFilter('All')">All</div>`;
    categories.forEach(cat => {
        categoryFilters.innerHTML += `<div class="filter-pill ${activeCategory === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">${cat}</div>`;
    });
}

function setCategoryFilter(cat) {
    activeCategory = cat;
    renderStore(searchInput.value);
}

function renderManagement() {
    managementTable.innerHTML = '';
    items.forEach(item => {
        const visual = getItemVisual(item, 'thumb');
        managementTable.innerHTML += `
            <tr>
                <td class="ps-3">${visual}</td>
                <td class="fw-bold">${item.name}</td>
                <td><span class="badge bg-light text-dark border">${item.category}</span></td>
                <td>$${item.price.toFixed(2)}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editItem(${item.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderCategories() {
    categoryTable.innerHTML = '';
    categories.forEach((cat, index) => {
        categoryTable.innerHTML += `
            <tr>
                <td class="ps-3 fw-medium">${cat}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-link text-primary p-0 me-2" onclick="editCategory(${index})"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-link text-danger p-0" onclick="deleteCategory(${index})"><i class="bi bi-x-circle"></i></button>
                </td>
            </tr>
        `;
    });
}

function populateCategoryDropdown() {
    categoryDropdown.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') + '<option value="Uncategorized">Uncategorized</option>';
}

// Cart Logic
function addToCart(id) {
    const item = items.find(i => i.id == id);
    const existing = cart.find(c => c.id == id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    updateCart();
}

function updateCart() {
    renderCart();
    calculateTotals();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id != id);
    updateCart();
}

function updateQuantity(id, delta) {
    const item = cart.find(c => c.id == id);
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        updateCart();
    }
}

function renderCart() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-5 text-muted empty-cart-msg">
                <i class="bi bi-cart3 display-4 d-block mb-3"></i>
                Your cart is empty
            </div>
        `;
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = false;
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="list-group-item border-0 border-bottom p-3">
            <div class="d-flex align-items-center">
                ${getItemVisual(item, 'cart')}
                <div class="flex-grow-1 ms-3">
                    <h6 class="mb-0 fw-bold">${item.name}</h6>
                    <small class="text-muted">$${item.price.toFixed(2)}</small>
                </div>
                <div class="d-flex align-items-center">
                    <div class="input-group input-group-sm" style="width: 100px;">
                        <button class="btn btn-outline-secondary px-2" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="form-control text-center bg-white border-secondary border-start-0 border-end-0">${item.quantity}</span>
                        <button class="btn btn-outline-secondary px-2" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function calculateTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * (settings.tax / 100);
    const serviceCharge = subtotal * (settings.serviceCharge / 100);
    const total = subtotal + tax + serviceCharge;

    subtotalText.textContent = `$${subtotal.toFixed(2)}`;
    taxText.textContent = `$${tax.toFixed(2)}`;
    serviceChargeText.textContent = `$${serviceCharge.toFixed(2)}`;
    totalText.textContent = `$${total.toFixed(2)}`;
}

// Events
searchInput.addEventListener('input', (e) => renderStore(e.target.value));
document.getElementById('clearCart').addEventListener('click', () => {
    cart = [];
    updateCart();
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
    document.getElementById('checkoutTotalText').textContent = totalText.textContent;
    const statusDiv = document.getElementById('paymentStatus');
    statusDiv.classList.add('d-none');
    statusDiv.textContent = '';
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('checkoutModal'));
    modal.show();
});

function completePayment() {
    const statusDiv = document.getElementById('paymentStatus');
    statusDiv.textContent = 'Thank you for your purchase!';
    statusDiv.className = 'mt-3 fw-bold text-success';
    statusDiv.classList.remove('d-none');

    // Clear cart and update UI
    cart = [];
    updateCart();

    // Close modal after a short delay
    setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
        if (modal) modal.hide();
    }, 1500);
}

function failPayment() {
    const statusDiv = document.getElementById('paymentStatus');
    statusDiv.textContent = 'Payment Failed. Please try again.';
    statusDiv.className = 'mt-3 fw-bold text-danger';
    statusDiv.classList.remove('d-none');
}

document.getElementById('resetStorage').addEventListener('click', clearStorage);
