# Clases de animación

Requieren GSAP + ScrollTrigger + SplitText (CDN en el `<head>` de `index.html`).
Se aplican solas a cada vista que monta el router (`src/animation/animations.js`)
y se limpian al salir. No hace falta llamar nada desde la vista.

Si GSAP no carga o el sistema tiene "reducir movimiento", no se anima nada
y el contenido se muestra igual.

| Clase | Efecto | Dispara |
|---|---|---|
| `.content-reveal-position-sm` | opacity 0→1, y 24→0, 0.6s | al entrar en pantalla, una vez |
| `.content-reveal-opacity-sm` | opacity 0→1, 0.6s | al entrar en pantalla, una vez |
| `.content-reveal-stagger` | en el **contenedor**: cada hijo directo aparece, y 16→0, stagger 0.08s | al entrar en pantalla, una vez |
| `.content-reveal-skip` | en un hijo de un stagger: lo excluye | — |
| `.split-text` + `data-split="lines\|words\|chars"` | parte el texto y lo sube línea / palabra / letra | al entrar en pantalla, una vez |
| `.block-stack` | en el **contenedor** de `.data-block`: cada bloque queda pegado arriba (sticky) y se achica y apaga mientras el siguiente lo tapa | atado al scroll (scrub) |
| `.fade-in.show` | fade CSS de 0.2s (la clase `show` se agrega por JS) | manual |

Criterio de motion (ver `DESIGN.md`): entradas cortas y sobrias. Nada de
parallax ni scroll scrubbing.
