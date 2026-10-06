/* ============================================
   Utils — Download
   ============================================ */

// Descarga `data` como archivo .json (Exportar en Perfil y la copia de
// seguridad antes de reemplazar datos en el primer login).

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
