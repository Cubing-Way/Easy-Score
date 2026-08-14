
document.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("click", () => {
    // close other menus
    document.querySelectorAll(".menu-item").forEach(i => {
      if (i !== item) i.classList.remove("open");
    });
    // toggle this one
    item.classList.toggle("open");
  });
});

// Close menus if you click outside
document.addEventListener("click", e => {
  if (!e.target.closest(".menu-item")) {
    document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("open"));
  }
});

const modal = document.getElementById("saveAsModal");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelSave");
const filenameInput = document.getElementById("filename");


// Close modal
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});
cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close if click outside modal-content
window.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});


document.getElementById("print").addEventListener("click", () => {
  const container = document.getElementById("main");
  const output = document.getElementById("output");
  output.style.left = `52.5%`;
  container.style.transform = `scale(1) `;
  
  window.onafterprint = () => container.style.transform = `scale(0.85)`;
  window.print();
});