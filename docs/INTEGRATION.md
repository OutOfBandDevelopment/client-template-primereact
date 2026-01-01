# Integration Guide

This guide explains how to integrate the template project into an existing React application.

## Prerequisites

- React 18+ or 19
- TypeScript 5+
- Vite (recommended) or webpack
- Node.js 18+

## Step 1: Install NPM Dependencies

```bash
npm install primereact primeflex primeicons zod react-hook-form @hookform/resolvers react-router-dom

# Optional for export functionality
npm install xlsx
```

## Step 2: Configure Path Aliases

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Step 3: Copy Runtime Dependencies

Copy the `runtime/` folder contents to your `src/` directory:

```bash
# From template-project directory
cp -r runtime/components/* ../src/components/
cp -r runtime/utils/* ../src/utils/
cp -r runtime/hooks/* ../src/hooks/
cp -r runtime/types/* ../src/types/
```

Your structure should look like:

```
src/
├── components/
│   └── ui/
│       └── prime/
│           ├── GenericGrid/
│           │   ├── SimpleGenericGrid.tsx
│           │   ├── FilterSidebar.tsx
│           │   └── ...
│           └── EntityForm/
│               ├── EntityPage.tsx
│               ├── BasePropertyEditor.tsx
│               └── ...
├── utils/
│   ├── schemaBasedColumnBuilder.tsx
│   ├── zodSchemaHelper.tsx
│   └── masterDataCache.ts
├── hooks/
│   ├── useCachedApiCall.ts
│   └── usePermissions.ts
└── types/
    └── roles.ts
```

## Step 4: Configure PrimeReact

### App Entry Point

```tsx
// src/main.tsx or src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';

// PrimeReact CSS
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </React.StrictMode>
);
```

### Theme Selection

Available themes in PrimeReact:

- `lara-light-blue` (recommended)
- `lara-dark-blue`
- `saga-blue`
- `vela-blue`
- `arya-blue`

Replace the theme import as needed:

```typescript
import 'primereact/resources/themes/lara-dark-blue/theme.css';
```

## Step 5: Connect Authentication

Edit `src/hooks/usePermissions.ts` to connect to your auth system:

```typescript
export function usePermissions(): UsePermissionsReturn {
  // Option 1: React Context
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  const roleId = user?.roleId ?? null;
  const userRoleName = user?.roleName ?? null;

  // Option 2: Redux
  // const { user, isAuthenticated, isLoading } = useSelector(state => state.auth);

  // Option 3: Zustand
  // const { user, isAuthenticated, isLoading } = useAuthStore();

  // ... rest of hook
}
```

## Step 6: Configure Role System

Edit `src/types/roles.ts` to match your role system:

```typescript
export type UserRole =
  | 'admin'
  | 'manager'
  | 'user'
  | 'guest';

export const ROLE_ID_MAP: Record<number, UserRole> = {
  1: 'admin',
  2: 'manager',
  3: 'user',
  4: 'guest',
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'admin': 100,
  'manager': 80,
  'user': 60,
  'guest': 40,
};
```

## Step 7: Set Up API Client Base

Create a base client configuration:

```typescript
// src/api/clientConfig.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function getAuthToken(): Promise<string | null> {
  // Return your auth token here
  return localStorage.getItem('token');
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
```

## Step 8: Configure the Generator

Your .NET generator needs to know where to find templates and where to output generated code.

### Generator Configuration

```csharp
// Generator configuration example
public class GeneratorConfig
{
    public string TemplatesPath { get; set; } = "./templates";
    public string OutputPath { get; set; } = "../src";
    public string SwaggerPath { get; set; } = "./swagger.json";
}
```

### Running the Generator

```bash
cd TypeScriptGenerator
dotnet run

# Verify the build
cd ../
npm run build
```

## Step 9: Add Router Configuration

If using React Router, set up routes for generated pages:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import generated routes
import GreenOnionRoutes from './pages/GreenOnion/Routes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Generated routes */}
        {GreenOnionRoutes}
        {/* Your other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

## Step 10: Verify Installation

### Run Development Server

```bash
npm run dev
```

### Check for Common Issues

1. **Missing PrimeReactProvider**
   - Error: Components not rendering correctly
   - Fix: Ensure PrimeReactProvider wraps your app

2. **Path alias not working**
   - Error: `Module not found: @/...`
   - Fix: Check vite.config.ts and tsconfig.json

3. **CSS not loading**
   - Error: Components unstyled
   - Fix: Verify CSS imports in main.tsx

4. **Auth hook errors**
   - Error: useContext returns undefined
   - Fix: Connect usePermissions to your auth system

### Test Generated Components

```tsx
// Quick test component
import { QueryCategoryModelComboBox } from '@/components/GreenOnion';

function TestPage() {
  const [categoryId, setCategoryId] = useState<number | null>(null);

  return (
    <div>
      <h1>Test Generated Components</h1>
      <QueryCategoryModelComboBox
        value={categoryId}
        onChange={setCategoryId}
      />
    </div>
  );
}
```

## Troubleshooting

### Build Errors

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

### Common Fixes

| Issue | Solution |
|-------|----------|
| Type mismatch | Check Zod schema matches API response |
| Import errors | Verify path aliases and exports |
| Runtime errors | Check browser console for details |
| Empty dropdowns | Verify API client authentication |

## Next Steps

1. Run the code generator with your swagger.json
2. Verify generated files compile
3. Test components in browser
4. Customize templates as needed
5. Set up CI/CD for generation
