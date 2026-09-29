// hotbar.js
// Top menu bar: opens / closes the File and Edit menus, the Save As modal and Print

// Clicking File or Edit opens its menu and closes the other one
document.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("click", () => {
    // Close the other menus
    document.querySelectorAll(".menu-item").forEach(i => {
      if (i !== item) i.classList.remove("open");
    });

    // Toggle this one
    item.classList.toggle("open");
  });
});

// Close the menus when clicking outside them
document.addEventListener("click", e => {
  if (!e.target.closest(".menu-item")) {
    document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("open"));
  }
});

// Save As modal and its close buttons
const modal = document.getElementById("saveAsModal");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelSave");

// The × button closes the modal
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});

// Cancel closes the modal
cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Clicking the dark area outside the modal box closes it
window.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Print opens the browser's print dialog
document.getElementById("print").addEventListener("click", () => {
  window.print();
});
