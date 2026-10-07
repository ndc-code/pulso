/* ============================================
   Utils — Download
   ============================================ */

// Descarga `data` como archivo .json (Exportar en Perfil y la copia de
// seguridad antes de reemplazar datos en el primer login).

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  // Con espera: Safari puede cancelar la descarga si se libera la URL enseguida
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
