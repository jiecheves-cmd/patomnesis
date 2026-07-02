# Aislamiento de Patomnesis

Este proyecto debe mantenerse separado de Histomind.

## Reglas

- Usar un repositorio GitHub independiente: `patomnesis`.
- Usar un proyecto Vercel independiente.
- Usar un proyecto Supabase independiente.
- No reutilizar variables `.env` de Histomind.
- No mezclar buckets de Storage con Histomind.
- No compartir tablas de Supabase con Histomind.
- No subir imagenes o datos de Histomind a este repositorio.

## Variables esperadas

Patomnesis debe usar sus propias variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Estas variables deben apuntar solo al proyecto Supabase de Patomnesis.

## Vercel

Crear un proyecto Vercel nuevo llamado `patomnesis`.

Configuracion:

- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Root directory: raiz del repositorio `patomnesis`.

## Supabase

Crear un proyecto Supabase nuevo para Patomnesis.

No usar el proyecto Supabase de Histomind.

Recursos esperados:

- Base de datos propia.
- Bucket propio: `question-images`.
- Auth propio.
- Politicas RLS propias.

## GitHub

Este repositorio no debe contener:

- `.env`
- `.env.local`
- `node_modules/`
- `dist/`
- dumps de base de datos
- imagenes pesadas

`.gitignore` ya excluye los archivos principales que no deben subirse.
