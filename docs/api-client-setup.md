# API Client Setup (openapi-typescript + openapi-fetch)

## ✅ Setup Complete

**Backend:** `http://localhost:4000`
**OpenAPI:** `swagger.yaml` (18 endpoints mit operationId + tags)
**Client:** openapi-typescript + openapi-fetch

---

## 📁 Generated Files

```
src/
├── generated/
│   └── api-types.ts          # TypeScript types from OpenAPI
├── lib/
│   ├── api-client.ts          # API client with auth middleware
│   └── api-example.tsx        # Usage examples
.env                           # VITE_API_BASE_URL=http://localhost:4000
```

---

## 🔄 Workflow

### 1. Backend ändert OpenAPI

```bash
# Backend ändert swagger.yaml
# → operationId/tags hinzufügen
# → requestBody schemas aktualisieren
```

### 2. Types regenerieren

```bash
npm run generate:api
```

### 3. Frontend nutzt generated types

```tsx
import api from '@/lib/api-client';

// Type-safe API call
const { data, error } = await api.GET('/api/tasks');
```

---

## 💡 Usage Examples

### GET Request (List)

```tsx
import api from '@/lib/api-client';

async function loadTasks() {
  const { data, error } = await api.GET('/api/tasks');

  if (error) {
    console.error('Failed to load tasks');
    return;
  }

  return data; // Type: Task[]
}
```

### POST Request (Create)

```tsx
import api from '@/lib/api-client';

async function createTask(title: string) {
  const { data, error } = await api.POST('/api/tasks', {
    body: {
      title,
      description: 'New task',
      status: 'pending',
    },
  });

  if (error) {
    throw new Error('Failed to create task');
  }

  return data; // Type: Task
}
```

### DELETE Request

```tsx
import api from '@/lib/api-client';

async function deleteTask(id: string) {
  const { error } = await api.DELETE('/api/tasks/{id}', {
    params: {
      path: { id },
    },
  });

  if (error) {
    throw new Error('Failed to delete task');
  }
}
```

### With React State

```tsx
import { useEffect, useState } from 'react';
import api from '@/lib/api-client';
import type { components } from '@/generated/api-types';

type Task = components['schemas']['Task'];

function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.GET('/api/tasks').then(({ data }) => {
      setTasks(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

---

## 🔐 Authentication

API client automatically adds `Authorization` header from localStorage:

```tsx
// Login
const { data } = await api.POST('/api/auth/login', {
  body: { email, password },
});
localStorage.setItem('token', data.token);

// Now all requests include: Authorization: Bearer <token>

// Logout
localStorage.removeItem('token');
```

---

## ⚙️ Configuration

### Change Base URL

Edit `.env`:

```bash
VITE_API_BASE_URL=https://api.production.com
```

### Add Custom Headers

Edit `src/lib/api-client.ts`:

```tsx
const customMiddleware: Middleware = {
  async onRequest({ request }) {
    request.headers.set('X-Custom-Header', 'value');
    return request;
  },
};

api.use(customMiddleware);
```

---

## 🚀 Next Steps

1. **Replace existing API calls** in App.tsx, components
2. **Remove axios** (if not needed elsewhere)
3. **Add React Query** (optional, for caching/refetching)
4. **Setup CI** to auto-generate on OpenAPI changes

---

## 📚 Resources

- [openapi-typescript](https://github.com/openapi-ts/openapi-typescript)
- [openapi-fetch](https://github.com/openapi-ts/openapi-typescript/tree/main/packages/openapi-fetch)
- [OpenAPI Spec](./swagger.yaml)

---

## ✅ Checklist

- [x] Backend running on port 4000
- [x] swagger.yaml has operationId + tags
- [x] Types generated (`src/generated/api-types.ts`)
- [x] API client created (`src/lib/api-client.ts`)
- [x] Examples written (`src/lib/api-example.tsx`)
- [ ] Replace old API calls in App.tsx
- [ ] Remove axios dependency
- [ ] Add tests for API client
