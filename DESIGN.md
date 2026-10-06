# Pulso — Design System

> Blanco, negro y naranja. Números grandes, textos chicos, líneas finas. Una página editorial que se usa todos los días.

**Referencias visuales**
- **Estilo:** diseño tipográfico minimalista (stories editoriales en blanco, negro y naranja): cifras gigantes en peso regular, texto de apoyo chico, separadores de 1px, pills con borde, datos como puntos.
- **Estructura:** la de openGym (nav con un botón central, tira de la semana, header grande). Se copia el layout, nunca su código (es AGPL, ver "Componentes por fase").

Los nombres de tokens de este archivo son los que existen en `src/styles/`.

## Principios

1. **Tres colores.** Blanco, negro y el naranja de Pulso. Los grises son blanco y negro diluidos, solo para texto secundario y líneas.
2. **Números grandes, textos chicos.** Cada pantalla tiene un número protagonista (el % del día, la racha) en tamaño gigante y peso regular, con texto de apoyo chico al lado.
3. **Plano.** Sin sombras ni degradés. Las secciones y los datos se separan con una línea de 1px y aire. Los únicos fondos son los **bloques de dato** de la pila de ciencia en Hoy. Los resúmenes de sección van en **filas tipográficas** (`stat-row`), nunca en cajas. Única excepción al plano: la barra de navegación es de **vidrio** (fondo translúcido con desenfoque), como la de Fitness.
4. **El naranja es estado.** Aparece cuando algo pasa: hoy, cumplido, progreso, la racha. Una sola superficie naranja grande por pantalla como máximo.
5. **Sin culpa.** Nunca rojo. Los niveles se muestran con naranja lleno / a medias / vacío y siempre con palabra o número.

## Tema

Claro (fondo blanco) y oscuro (fondo `#0F0F0F`) con `light-dark()`. Cada alias se declara una vez con sus dos valores.

| Cómo | Resultado |
|---|---|
| Sin `data-theme` | Sigue al sistema operativo |
| `<html data-theme="light">` / `"dark"` | Fuerza el tema en toda la app (lo hace `utils/theme.js` con `profile.theme`) |
| `data-theme` en cualquier elemento | Fuerza el tema solo en ese bloque |

**Regla:** vistas y componentes usan solo alias semánticos (`--color-text`, `--color-rule`…), nunca tokens crudos (`--color-gray-600`).

## Colores

| Alias | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-bg` / `--color-surface` | `#ffffff` | `#0f0f0f` | Fondo de todo (no hay cards con fondo) |
| `--color-surface-2` | `#f0f0f0` | `#222222` | Hover |
| `--color-text` / `--color-headings` | negro | blanco | Texto, íconos, bordes de pills |
| `--color-text-muted` | `#6b6b6b` | `#999999` | Texto de apoyo chico |
| `--color-rule` | negro | blanco | Línea que separa secciones |
| `--color-border` | negro | blanco | Bordes de pills, inputs y botones redondos |
| `--color-divider` | `#d6d6d6` | `#2e2e2e` | Línea entre filas, track de barras |
| `--color-inverse-bg` / `-text` | negro / blanco | blanco / negro | Botón principal, chip elegido, toast, avatar activo |
| `--color-accent` | `#c94a0c` | `#ee6018` | Texto naranja (nav activa) |
| `--color-accent-fill` | `#ee6018` | `#ee6018` | Rellenos naranjas: hoy, cumplido, barras, botón Hoy, bloque de racha |
| `--color-on-accent` | negro | negro | Lo que va encima del naranja |
| `--color-status-good` / `-bad` | naranja | naranja | Cumplido / error de formulario (con palabra) |

Contraste verificado (WCAG): texto ≥19:1; texto secundario ≥5.3:1 (claro) y ≥6.7:1 (oscuro); naranja como texto ≥4.7:1; negro sobre naranja 6.3:1. El naranja `#ee6018` sobre blanco da 3.3:1: sirve para rellenos y gráficos, no para texto chico (para eso está `--color-accent`).

### Niveles en naranja

Reemplazan al verde/amarillo/rojo de la spec. Siempre acompañados de palabra o número.

| Nivel | Marca | Ejemplo |
|---|---|---|
| Completo | punto o círculo **lleno** naranja | Día completo, hábito cumplido, "buen día" en Comer |
| A medias | **aro** naranja | Día con algo hecho, "día medio" en Comer |
| Nada | aro gris o vacío | Pendiente, "día flojo" en Comer |

## Tipografía

**Geist** (`--font-primary`), pesos 400 (casi todo) y 500 (labels chicos, nav, botones). Nunca bold.

| Token | Mobile | ≥768 | Uso |
|---|---|---|---|
| `--font-xs-*` | 11/14 | — | Eyebrows y nav, en mayúsculas |
| `--font-sm-*` | 13/17 | 14/18 | Texto de apoyo, metas, `.label` |
| `--font-base-*` | 15/20 | 16/22 | Nombres de hábitos, texto corrido |
| `--font-lg-*` | 18/22 | — | Números de la tira de la semana |
| `--font-xl-*` | 24/28 | — | Títulos de sección (`h2`, `.card__title`) |
| `--font-2xl-*` | 32/34 | — | Título de hoja modal |
| `--font-3xl-*` | 40/42 | — | Título de pantalla (`h1`) |
| `--font-4xl-*` | 56/56 | — | `h1` en desktop (≥1024) |
| `--num-sm-*` | 32 | — | Números chicos |
| `--num-md-*` | 64 | 80 | Número de una sección |
| `--num-lg-*` | 96 | 128 | Racha |
| `--num-xl-*` | 128 | — | Número protagonista (% del día) |

Los números van con `.num` + `.num--sm/md/lg/xl`: regular, tracking ≈ -0.05em, cifras tabulares. Los inputs quedan en 16px (con menos, iOS hace zoom).

## Espacio y forma

- **Spacing** (base 8): `2xs` 2 · `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 32 · `3xl` 40 · `4xl` 56 · `5xl` 80 · `6xl` 96 · `7xl` 120.
- **Radius:** `none` para secciones · `sm` 4px para bloques de dato (casi rectos, acompañan el estilo tipográfico) · `full` para pills, botones, inputs y círculos · `lg` 16px solo arriba de las hojas modales.
- **Líneas:** 1px. `--color-rule` arriba de cada sección; `--color-divider` entre filas.
- **Layout:** columna `--width-app` 720px · gutter 20 → 24 (≥768) · nav 68 flotante (cápsula a 8px de los bordes) + área segura · Hoy 28 · riel 104 (≥1024) · área tocable mínima 44.

## Navegación

Barra **flotante de vidrio**, como la de Fitness de Apple: cápsula totalmente redondeada separada 8px de los bordes (y por encima del área segura), borde de 1px apenas visible y fondo translúcido con desenfoque (`--color-nav-glass`, `backdrop-filter`); sin desenfoque disponible o con "reducir transparencia", fondo sólido. **Moverse · Comer · [Hoy] · Descanso · Progreso**. Labels de 11px en minúscula (como Fitness); la sección activa en naranja con una **pill de fondo** redondeada. Hoy es un círculo naranja de 28px dentro de la barra. La pill activa es bien visible (15% del color del texto) y casi del alto de la barra, como en Fitness. Perfil se abre desde el avatar (círculo con borde; relleno inverso cuando estás en Perfil). En desktop (≥1024) la barra pasa a un riel vertical a la izquierda.

## Componentes

| Componente | Archivos | Notas |
|---|---|---|
| Card | `components/card/` | `.card` = **sección**: línea arriba, sin fondo ni radio. `.card__header`, `.card__title`, `.card__text`. `.card--accent`: bloque naranja (uno por pantalla). |
| Button | `components/button/` | Pills. `--primary` (inverso), `--ghost` (borde), `--accent` (naranja: la acción del momento), `--text` (subrayado: "Editar"), `--icon` (círculo de 44 con borde, con `aria-label`), `--block`. |
| Field | `components/field/` | Input en pill con borde de 1px, alto 48. Foco y error: borde naranja de 2px. `suffix`, `hint`, `setFieldError()`. |
| Segmented | `components/segmented/` | Pill con borde; la opción elegida, inversa. Hasta 3 opciones. |
| Chip | `components/chip/` | Pills con borde, texto en mayúsculas; el elegido, inverso. |
| Option grid | `components/option-grid/` | Círculos con ícono; el elegido, inverso. |
| List row | `components/list-row/` | Fila con línea `divider`: ícono · título + detalle · acciones. |
| Sheet | `components/sheet/` | Hoja modal sobre `<dialog>`, plana, con línea arriba y manija. Devuelve el foco. |
| Toast | `components/toast/` | Pill inversa con `aria-live`. |
| Gauge | `components/gauge/` | Anillo SVG portado de gauge-ui. Color = `currentColor`. `start` / `end` lo abren abajo (60 → 300 en Moverse, como "Steps") y recortan el espacio de la apertura; `ticks` agrega marcas por dentro; `segments` lo corta en tramos. |
| Habit card | `components/habit-card/` | Fila de hábito: ícono · nombre + meta (+ barra naranja de 2px si es contador) · check, `−`/`+` o `+` para registrar. Cumplido = check naranja lleno. |
| Stat row | `components/stat-row/` | **Fila tipográfica** (referencia "55% · Entertainment purposes"): número grande a la izquierda, copy chico pegado a la derecha, línea fina arriba. Opcional: barra de progreso naranja de 2px y HTML extra debajo del copy (botones − / +, marca de nivel). Varias filas seguidas (`.stat-rows`) son el formato de resumen por defecto (Comer). Una sección puede tener su propio layout para no repetirse (Moverse). |
| Data block | `components/data-block/` | **Bloque de dato** (referencia "143 ha"): **copy arriba** (label + texto) y **número gigante abajo** con la unidad en chico al lado. Sin fuentes ni pie. Tonos `--accent` (naranja), `--strong` (oscuro en claro / claro en oscuro), `--soft` (gris). Radio 4. |
| Block stack | `components/data-block/` + `animation/stack-cards.js` | `.block-stack`: bloques sticky que se apilan al scrollear; el de abajo se achica (GSAP, atado al scroll) y el último termina encima de todos. Tiene un recorrido extra corto (`::after`) para que el último llegue arriba; para que no quede un hueco al final, **después de la pila tiene que haber contenido** (en Hoy: racha y Registrar) y el título de la sección queda fijo arriba (`--stack-top`). Usado en "Lo que recomienda la ciencia". |
| Bar chart | `components/bar-chart/` | Barras finas por día (8px, puntas redondas), punto en los días sin dato, línea punteada de meta, hoy en naranja. Lista oculta para lectores de pantalla. Usado en la card de Moverse. |
| Week strip | `components/week-strip/` | **Tira de la semana**, la misma en Hoy y Moverse: letra (LU, MA…), número y punto debajo. El día destacado va en **círculo naranja** (Hoy: hoy · Moverse: el día elegido); la letra de hoy, en naranja. Punto lleno = completo / con actividad, aro = algo hecho. Con `selectable` cada día es un botón. |
| Level | `components/level/` | Marca de nivel en naranja: **lleno** (bueno), **a medias** (medio), **aro** (flojo), gris (sin registro). Siempre con la palabra al lado. Tamaños sm 12 · md 28 · lg 56. |
| Status pulse | `components/status-pulse/` | Punto naranja de 6px. |
| Sleep dial | `components/sleep-dial/` | Reloj de 24 h portado del `SleepDial` de gauge-ui: medianoche arriba, una marca por hora, 00 · 06 · 12 · 18, y la noche como un solo arco naranja de la hora de dormir a la de despertar (aunque cruce las 00). Usado en Descanso. |
| Range dial | `components/range-dial/` | Medio dial chico portado del `RangeDial` de gauge-ui: escala como track, el rango de referencia atenuado encima y un punto en el valor: **lleno** naranja en rango, **aro** naranja fuera. Siempre con la palabra ("En rango"). Usado en los análisis de Progreso. |
| Line chart | `components/line-chart/` | Evolución en el tiempo (referencia: card "Body weight" de openGym, escrito desde cero): línea fina del color del texto, punto por medición, el último en naranja con su valor arriba, líneas punteadas para rango o meta y fechas de punta a punta. Eje X por tiempo. Lista oculta para lectores de pantalla. |
| Placeholder | `components/placeholder/` | Vista "en construcción" (hoy sin uso: todas las secciones están hechas). |
| Header | `layout/header/` | `h1` grande en regular + subtítulo chico + avatar. Flecha de volver en subrutas. |
| Bottom nav | `layout/bottom-nav/` | Ver "Navegación". |

Piezas propias de cada vista:

- **Hoy** (`views/hoy/`): tira de la semana (`week-strip`: hoy en círculo naranja; punto lleno = día completo, aro = algo hecho), **% del día gigante** con texto chico al lado y una fila de círculos (uno por hábito), lista de hábitos, **"Lo que recomienda la ciencia"** (título fijo + seis bloques apilados con el dato de referencia de cada hábito, copy arriba y número abajo; contenido en `src/content/recommendations.js`), y después racha (número grande) y pills para registrar.
- **Comer** (`views/comer/`): filas tipográficas (comidas de hoy con su nivel · chips positivos y a moderar del día) · **card de agua como "Water" de gauge-ui**: anillo naranja grueso cortado en un tramo por vaso, litros grandes en el centro ("1,25 L de 2 L"), datos al costado (falta, vaso de 250 ml, hora del último) y botones − / "+ 250 ml"; sincronizada con Hoy · la semana (un nivel por día) · chips más frecuentes (borde punteado = a moderar). Botón "Registrar comida" (hoja con momento sugerido por la hora, chips "Sumó" y "A moderar", día y nota) e historial por día con su nivel.
- **Descanso** (`views/descanso/`): filas tipográficas (horas de anoche en grande como reloj "7:30 h" con su nivel contra la meta · promedio de la semana) · **card gris como "Sleep" de gauge-ui**: reloj de 24 h con la noche en naranja, horas en el centro y datos al costado (me acosté, me desperté, calidad, meta); botón registrar / editar · la semana en barras con la línea punteada de referencia (7 h) · respiración guiada (patrón 4-4-4-4 / 4-7-8 y 1, 3 o 5 min; la hoja muestra un círculo naranja que crece al inhalar y se achica al exhalar, con la cuenta; al terminar marca el hábito de pausa) · check-in de ánimo y energía (1 a 5, opcional) · historial de noches. Un registro de sueño por día: el día en que te despertaste.
- **Progreso** (`views/progreso/`): resumen de la semana en filas (% de hábitos con barra, minutos activos con barra, días buenos en Comer, sueño promedio) · **calendario de constancia** de 26 semanas: un punto por día con los niveles de `level` (lleno = todos los hábitos, a medias = la mitad o más, aro = alguno, gris = ninguno) y leyenda · peso en grande con el cambio desde hace 30 días y su línea · análisis: grilla de diales de rango separada por líneas (2 columnas, 3 desde 640), chips para elegir qué indicador ver en la línea de evolución con su rango punteado, rangos editables · Lp(a) aparte con su nota de contexto · historial de análisis · aviso fijo.
- **Moverse** (`views/moverse/`): layout **por día** (referencia de lista de tareas), distinto a Comer a propósito: tira de la semana (la misma de Hoy, con el mes y flechas en el encabezado; el día elegido en círculo naranja; punto si hubo actividad) · card gris **como "Steps" de gauge-ui**: dial abierto abajo con marcas (arco naranja, minutos de la semana en el centro), datos al costado (sesiones, promedio, faltan, días activos) y barras por día con la meta diaria · sesiones del día elegido: tags chicos (duración, intensidad), **tipo en grande** y un **círculo negro de 88px "repetir"** (la suma hoy); al final, círculo naranja "+" para registrar en ese día · calendario de puntos de 12 semanas. El historial por semana se recorre con las flechas.


## Componentes por fase (referencias)

Componentes que se construyen fase a fase, con proyectos de `inspo/` como referencia. Cada uno se escribe como función vanilla que devuelve HTML/SVG, con nuestros tokens.

**Reglas de uso de las referencias**

- **gauge-ui** (`inspo/gauge-ui-main`, MIT): se puede portar el código (la matemática de arcos, ticks y zonas) a JS vanilla. Cada archivo portado lleva en su cabecera: `// Adaptado de gauge-ui (MIT) — https://gauge-ui.dev`.
- **openGym** (`inspo/openGym-main`, **AGPL-3.0**): referencia de **look y de UX**: cómo se ve y cómo se comporta. **Nunca se copia ni se traduce su código** (ni su CSS, ni su JS, ni reescrito de React a vanilla), porque eso volvería a Pulso AGPL. Se miran las pantallas y se escribe desde cero.
- **Estética:** de openGym se toma la estructura y el comportamiento; el look es el editorial de este archivo (blanco, negro, naranja; líneas en vez de cards; números grandes). Donde openGym usa colores o verde, Pulso usa naranja por niveles.
- **Gráficos:** SVG propio a partir de estas referencias, sin librerías de gráficos (resuelve la decisión pendiente de la spec, sección 8).

| Fase | Sección | Necesidad de la spec | Referencia |
|---|---|---|---|
| 1 | Hoy | Progreso diario (hoy: % gigante + puntos) | gauge-ui `ActivityRings` / `GaugeArc` (descartado por el estilo editorial) |
| 1 | Hoy | Hábito contador (agua 3/8) con `+` | gauge-ui `WaterDial` · openGym `Stepper` |
| 1 | Hoy | Hábito sí/no | openGym `Check` |
| 1 | Hoy | Rachas | openGym, card "week streak" de Home |
| 1 | Hoy | Tira de la semana | openGym, calendario semanal de Home |
| 1 | Perfil | Ajustes y gestión de hábitos | openGym `Section`, `Row`, `Switch`, `SelectRow` |
| 2 | Pilares | Registrar comida, entreno o sueño (accesos rápidos) | openGym, hojas modales (`Modals` / `sheets`) — comida y entreno ✓ |
| 2 | Pilares | Historial con borrado | openGym `SwipeToDelete` |
| 2 | Moverse | Minutos semanales contra la meta de 150 | layout por día (referencia de lista de tareas) + card "Steps" de gauge-ui (dial + datos + barras) + calendario de puntos de "Workouts" ✓ |
| 2 | Descanso | Horas de sueño con referencia en 7 h | gauge-ui `SleepDial` ✓ |
| 3 | Progreso | Resumen semanal | filas tipográficas (`stat-row`), como Moverse y Comer ✓ |
| 3 | Progreso | Calendario de constancia | openGym `Heatmap` (en niveles de naranja, como la grilla de puntos de la referencia) ✓ |
| 3 | Progreso | Evolución de análisis y peso | openGym `LineChart` (card "Body weight" de Home) ✓ |
| 3 | Progreso | Indicador con rango de referencia editable (LDL, glucemia…) | gauge-ui `RangeDial` / `GaugeZones` ✓ |
| 6 | Moverse | Rutina paso a paso con temporizador de descanso | openGym `RestTimer` |

Archivos de referencia: gauge-ui en `components/gauge/` (primitivas) y `components/examples/health-dashboard.tsx` (diales de salud). openGym: capturas en `assets/screenshots/`.

## Motion

- Transiciones de UI cortas: `--transition-fast` 0.15s y `--transition-normal` 0.2s, con `--ease-standard`.
- Barras y checks animan el cambio porque se actualizan en el lugar.
- Las hojas suben con `@starting-style`.
- Entradas de vista con GSAP (`src/animation/`): sobrias, 0.5–0.6s, 16–24px como máximo. Una vez por vista.
- Con `prefers-reduced-motion` o la pestaña oculta, no se anima nada.

## Iconografía

Lucide (ISC), SVG inline desde `utils/icons.js`: trazo `currentColor` de 1.5, sin rellenos ni fondos de color. Si un ícono acompaña a un texto, lleva `aria-hidden="true"`.

## Do / Don't

**Do**
- Darle a cada pantalla un número protagonista en grande, con texto chico al lado.
- Separar secciones con una línea de 1px y aire.
- Usar el naranja para lo que está pasando (hoy, cumplido, progreso) y nada más.
- Mostrar niveles con lleno / aro / vacío y siempre con palabra o número.

**Don't**
- No sumar colores: nada de verde, rojo, azul ni colores por hábito.
- No usar bold: la jerarquía es tamaño y tracking.
- No poner fondos a las secciones ni sombras a nada.
- No usar más de una superficie naranja grande por pantalla (excepción: la pila de ciencia, donde los tonos se alternan).
- No copiar CSS ni JS de openGym.
