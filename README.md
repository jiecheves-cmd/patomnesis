# Patomnesis

**Mira, piensa, diagnostica.**

Patomnesis es una app de quiz visual para aprender anatomia patologica con preguntas clasificadas por categoria, sistema y dificultad.

## Estado

Este es el primer MVP en React:

- Modo alumno con quiz local.
- Modo profesor con banco y editor local.
- Modo supervisor con metricas de la sesion.
- Datos semilla en `src/data/questions.js`.
- Preparacion para Supabase en `src/lib/supabase.js`.
- Esquema inicial en `supabase/schema.sql`.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Demo con testers

Ver [TESTERS.md](./TESTERS.md) para publicar una demo inicial en Vercel y recoger feedback.

## Aislamiento respecto a Histomind

Ver [PROJECT_ISOLATION.md](./PROJECT_ISOLATION.md). Patomnesis debe vivir en repo, Vercel y Supabase separados para no afectar a Histomind.

## Supabase

Copia `.env.example` a `.env.local` y rellena:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Las imagenes deben vivir en Supabase Storage, no en GitHub.
