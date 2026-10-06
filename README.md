## Pulso

Web app instalable (PWA) para construir hábitos saludables: moverse, comer, descansar y medir el progreso.
HTML, CSS y JS vanilla con ES modules. Sin build ni dependencias de npm.

```bash
npx serve . -l 4173
```

Abrir `http://localhost:4173`.

Tests de la lógica (rachas, progreso, fechas), sin dependencias:

```bash
node --test 'tests/**/*.test.js'
```

- `CLAUDE.md`: arquitectura y convenciones de código.
- `DESIGN.md`: design system (tokens, roles, componentes).
