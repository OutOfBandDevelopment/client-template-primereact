# Troubleshooting Protocol

## Overview

This document covers common issues encountered when integrating the TypeScript generator templates and their solutions.

## Build & Compilation Errors

### Cannot find module '@/api/...'

**Symptoms:**
```
Module not found: Error: Can't resolve '@/api/YourApp/Clients/ProductClient'
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Generator not run | Run `cd TypeScriptGenerator && dotnet run` |
| Wrong namespace | Check `generator.config.json` namespace matches imports |
| Missing tsconfig paths | Add `"@/*": ["./src/*"]` to tsconfig paths |
| Vite alias missing | Add `'@': path.resolve(__dirname, './src')` to vite.config |

### PrimeReactProvider not found

**Symptoms:**
```
Error: Cannot find module 'primereact/api'
```

**Solution:**
```bash
npm install primereact@latest
```

Ensure wrapping in main.tsx:
```typescript
import { PrimeReactProvider } from 'primereact/api';

<PrimeReactProvider>
  <App />
</PrimeReactProvider>
```

### Type errors in generated code

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**

1. **Regenerate code** after schema changes:
   ```bash
   cd TypeScriptGenerator && dotnet run
   npm run build
   ```

2. **Check Zod version** - requires Zod v4+:
   ```bash
   npm install zod@latest
   ```

3. **Clear TypeScript cache**:
   ```bash
   rm -rf node_modules/.cache
   npx tsc --build --clean
   ```

### Missing runtime dependencies

**Symptoms:**
```
Cannot find module '@/hooks/useCachedApiCall'
Cannot find module '@/components/ui/prime/GenericGrid'
```

**Solution:**
```bash
./scripts/copy-runtime.sh ./src
# or on Windows
scripts\copy-runtime.bat .\src
```

## Runtime Errors

### "usePermissions is not defined"

**Cause:** Hook not integrated with auth context.

**Solution:** Edit `src/hooks/usePermissions.ts`:
```typescript
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function usePermissions() {
  const { user } = useContext(AuthContext);
  // Return permissions based on user
}
```

### "Cannot read property 'rows' of undefined"

**Cause:** API response format mismatch.

**Solution:** Ensure API returns:
```json
{
  "rows": [...],
  "totalRows": 100,
  "currentPage": 0,
  "pageSize": 25
}
```

### ComboBox/MultiSelect shows empty

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| API error | Check browser console for errors |
| Wrong endpoint | Verify client Query method URL |
| Auth token missing | Check authentication setup |
| CORS blocked | Configure backend CORS headers |

**Debug:**
```typescript
<QueryCategoryModelComboBox
  onLoadError={(error) => console.error('Load error:', error)}
/>
```

### DataGrid infinite loading

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| API never responds | Check network tab for pending requests |
| Client instantiation in render | Use `useMemo(() => new Client(), [])` |
| Missing await | Ensure async/await in client methods |

### Form validation not working

**Cause:** Zod resolver not configured.

**Solution:**
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { ZQueryProductModelSave } from '@/api/YourApp/Schema';

const form = useForm({
  resolver: zodResolver(ZQueryProductModelSave)
});
```

## Styling Issues

### PrimeReact components unstyled

**Cause:** Missing CSS imports.

**Solution:** Add to main.tsx:
```typescript
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
```

### Layout broken / no grid

**Cause:** Missing PrimeFlex.

**Solution:**
```bash
npm install primeflex
```

```typescript
import 'primeflex/primeflex.css';
```

### Icons not showing

**Cause:** Missing PrimeIcons.

**Solution:**
```bash
npm install primeicons
```

```typescript
import 'primeicons/primeicons.css';
```

## API Integration Issues

### 401 Unauthorized on every request

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Token not sent | Check ClientBase sends Authorization header |
| Token expired | Implement token refresh logic |
| Wrong token format | Verify `Bearer ${token}` format |

### 404 Not Found

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong API base URL | Check `apiBaseUrl` in config |
| Missing endpoint | Verify backend implements endpoint |
| Wrong HTTP method | Check client uses correct method |

### CORS errors

**Symptoms:**
```
Access to fetch at 'http://api.example.com' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:** Configure backend CORS:
```csharp
// ASP.NET Core
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### Request payload too large

**Cause:** Bulk operation with too many items.

**Solution:**
```typescript
// Batch large operations
const BATCH_SIZE = 100;
for (let i = 0; i < ids.length; i += BATCH_SIZE) {
  const batch = ids.slice(i, i + BATCH_SIZE);
  await client.BulkDelete({ body: batch });
}
```

## Navigation Issues

### Routes not matching

**Cause:** Route prefix mismatch.

**Solution:** Verify configuration:
```typescript
configureNavigation({
  routePrefix: '/app'  // Must match your route structure
});

// Routes should be:
// /app/QueryProductModel/List
// /app/QueryProductModel/Edit/:id
```

### Menu items not showing

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Role filtering | Check user has required role |
| Wrong path | Verify menu item paths |
| filterMenuByRole not called | Apply filter before rendering |

### Navigation doesn't work (page reloads)

**Cause:** Not using React Router navigation.

**Solution:**
```typescript
configureNavigation({
  useReactRouter: true
});

// Use navigate() not window.location
const navigate = useNavigate();
navigate('/products');
```

## Generator Issues

### Generator fails to run

**Symptoms:**
```
error: Unable to find template file
```

**Solution:**
1. Verify template path in `generator.config.json`
2. Check templates exist in `templates/` folder
3. Ensure .hbs extension on template files

### Generated code has wrong imports

**Cause:** Namespace not configured.

**Solution:** Check `generator.config.json`:
```json
{
  "generator": {
    "namespace": "YourApp"
  }
}
```

### Missing components after generation

**Cause:** Entity missing required swagger extensions.

**Solution:** Ensure entity has:
```json
{
  "QueryEntityModel": {
    "x-query-model": true,
    "properties": {
      "entityId": {
        "x-navigation-key": true
      }
    }
  }
}
```

## Performance Issues

### Slow initial load

**Solutions:**
1. Use lazy loading for pages
2. Reduce initial data fetch size
3. Enable code splitting

### DataGrid slow with many rows

**Solutions:**
1. Reduce page size: `pageSize={25}`
2. Limit visible columns: `visibleColumns={[...]}`
3. Use server-side pagination (default)

### Memory leaks

**Cause:** Not cleaning up subscriptions/timers.

**Solution:**
```typescript
useEffect(() => {
  const timer = setInterval(fetchData, 30000);
  return () => clearInterval(timer);  // Cleanup
}, []);
```

## Debug Tools

### Enable development mode

```typescript
// Shows dev tools in EntityForm, additional logging
if (import.meta.env.DEV) {
  console.log('Development mode enabled');
}
```

### Check generated schema

Visit: `http://localhost:5173/development/schema-registry-demo`

### Network inspection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check request/response details

### React DevTools

Install React DevTools browser extension to inspect:
- Component hierarchy
- Props and state
- Context values

## Getting Help

1. **Check documentation:**
   - `docs/API_CONTRACT.md` - API requirements
   - `docs/SCHEMA_METADATA.md` - Swagger extensions
   - `docs/TEMPLATE_GUIDE.md` - Template customization

2. **Verify build:**
   ```bash
   npm run build  # Always use build, not dev
   ```

3. **Check console:**
   - Browser console for runtime errors
   - Terminal for build errors

4. **Regenerate:**
   ```bash
   cd TypeScriptGenerator && dotnet run
   npm run build
   ```
