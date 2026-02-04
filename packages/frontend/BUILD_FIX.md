# Solución de Problemas de Build del Frontend

## Problema: Error de Permisos con .env

Si encuentras el error:
```
EPERM: operation not permitted, open '.env'
```

### Solución 1: Crear el archivo .env manualmente

```bash
cd packages/frontend
cp env.example .env
# O crear manualmente:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env
```

### Solución 2: Usar variable de entorno directamente

El script de build ahora tiene un valor por defecto, pero puedes también ejecutar:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run build
```

### Solución 3: Usar .env.local (recomendado para desarrollo)

```bash
cd packages/frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

## Otros Problemas Comunes

### Error: Cannot find module '@/...'

Verifica que el `tsconfig.json` tenga la configuración correcta de paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error: Image optimization

Si hay problemas con las imágenes, verifica que `next.config.js` tenga la configuración correcta de `remotePatterns`.

## Verificación de Build

Para verificar que todo está correcto antes del build:

```bash
# Verificar tipos de TypeScript
npm run build:check

# Build completo
npm run build
```
