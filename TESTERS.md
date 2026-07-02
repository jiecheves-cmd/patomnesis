# Patomnesis: prueba con usuarios testers

Objetivo: publicar una demo inicial de Patomnesis en internet para que testers puedan usarla y enviar feedback.

## Estado recomendado para primera demo

Esta primera demo puede funcionar sin Supabase:

- Banco local de preguntas.
- Selector de roles simulado.
- Quiz de alumno.
- Banco/editor de profesor local.
- Panel supervisor local.

Limitaciones esperadas:

- Los datos no se comparten entre usuarios.
- Lo editado por un tester no queda guardado en una base de datos real.
- No hay login real todavia.
- Las metricas del supervisor son solo de la sesion local.

Esto esta bien para validar experiencia, textos, flujo y utilidad docente.

## Opcion recomendada: Vercel

### 1. Crear repositorio GitHub

Nombre sugerido:

```text
patomnesis
```

Subir solo la carpeta `patomnesis`.

No subir:

- `node_modules/`
- `dist/`
- `.env.local`
- imagenes pesadas

### 2. Importar en Vercel

En Vercel:

1. New Project.
2. Importar repo `patomnesis`.
3. Framework: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

Vercel dara una URL parecida a:

```text
https://patomnesis.vercel.app
```

### 3. Compartir con testers

Enviar un mensaje corto:

```text
Estoy probando Patomnesis, una app de quiz visual para anatomia patologica.
Entra aqui: [URL]

Me interesa que pruebes:
1. Modo Alumno: responder una ronda.
2. Modo Profesor: abrir el banco y editar una pregunta.
3. Modo Supervisor: ver metricas tras contestar.

Feedback que necesito:
- Que te resulta claro.
- Que te resulta confuso.
- Que echas en falta.
- Si lo usarias como alumno/profesor.
```

## Que medir en esta prueba

Preguntas clave para testers:

1. Entienden que hacer al entrar?
2. El quiz se siente rapido?
3. El feedback ayuda a aprender?
4. El modo profesor se entiende?
5. El nombre Patomnesis se recuerda?
6. El subtitulo encaja?
7. Falta login desde el principio?
8. Se entiende la diferencia entre alumno, profesor y supervisor?

## Siguiente fase tras testers

Si la demo gusta:

1. Crear proyecto Supabase.
2. Activar Auth.
3. Crear tablas con `supabase/schema.sql`.
4. Crear bucket `question-images`.
5. Conectar banco real.
6. Guardar resultados reales por usuario.

## Seguridad para demo

Para esta fase:

- No usar datos personales reales de alumnos.
- No subir imagenes clinicas identificables.
- No subir material con restricciones de copyright.
- No presentar las metricas como evaluacion oficial.
