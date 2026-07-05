# Patomnesis

Demo pública inicial para testers.

**Mira, piensa, diagnostica.**

Patomnesis es una app de quiz visual para aprender anatomia patologica con preguntas clasificadas por categoria, tema y dificultad.

## Estado

Este es el primer MVP en React:

- Modo alumno con quiz y guardado de intentos si Supabase esta configurado.
- Modo profesor con banco y editor local.
- Modo supervisor con metricas de la sesion.
- Datos semilla en `src/data/questions.js`.
- Conexion a Supabase en `src/lib/supabase.js` con fallback local.
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

En Supabase:

1. Ejecuta `supabase/schema.sql` en el SQL editor del proyecto.
2. En Authentication, activa Anonymous sign-ins si quieres probar sin login formal.
3. En Vercel, anade las mismas variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Para cargar las preguntas iniciales, ejecuta `supabase/seed_questions.sql`.
5. Publica nuevas preguntas con `status = 'published'` y sus opciones en `question_options`.

Si Supabase no esta configurado o no responde, la app cae automaticamente a demo local con `seedQuestions`.

Las imagenes deben vivir en Supabase Storage, no en GitHub.
