/* ============================================
   Components — Toast
   ============================================ */

// Muestra un aviso breve. La región tiene aria-live: los lectores de pantalla lo leen.
//
//   toast("Hábito guardado");

const DURATION = 2500;

export function toast(message) {
  const region = document.querySelector("[data-toast-region]");
  if (!region) return;

  const item = document.createElement("p");
  item.className = "toast";
  item.textContent = message;
  region.appendChild(item);

  setTimeout(() => {
    item.classList.add("is-leaving");
    setTimeout(() => item.remove(), 300);
  }, DURATION);
}
