# Next.js — si `/story-engine` (u otras rutas) devuelve 500 o chunks `fallback/*.js` 404

## `Cannot find module './974.js'` (webpack-runtime)

Eso es casi siempre **`.next` corrupto o a medias** (dev interrumpido, EMFILE, o `next dev` lanzado desde un cwd distinto al paquete `apps/web`).

Desde la **raíz del monorepo**:

```bash
npm run dev:fresh
```

Equivale a `rm -rf apps/web/.next` + `next dev` en el workspace correcto.

**No** ejecutes `next dev` desde la raíz del repo sin el workspace (usa siempre `npm run dev` en la raíz o `cd apps/web && npm run dev`).

---

1. **Limpia la caché de build**
   ```bash
   cd apps/web && npm run clean && npm run dev
   ```
   (o `npm run dev:clean`)

2. **macOS: EMFILE (too many open files)**  
   Si en la terminal ves `Watchpack Error (watcher): EMFILE`:
   ```bash
   ulimit -n 10240
   ```
   Luego arranca de nuevo. Alternativa (polling, más lento pero estable):
   ```bash
   npm run dev:poll
   ```

3. **No mezclar `next start` con `next dev`**  
   Tras `next build`, usa `next start`. En desarrollo solo `next dev`.

4. **Puerto ocupado / proxy**  
   Asegúrate de abrir exactamente la URL que muestra Next (p. ej. `http://localhost:3000`).

5. **Tipo `Symbol` en TypeScript**  
   No declares `interface Symbol` en páginas React: fusiona con el `Symbol` global y puede romper el compilador. Usa nombres como `StorySymbol`.
