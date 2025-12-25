# /api - API Endpoint erstellen

## Fragen

1. **Endpoint Name** (z.B. /users, /invoices)
2. **HTTP Method** (GET, POST, PUT, DELETE)
3. **Request Body** - Was wird gesendet?
4. **Response** - Was wird zurückgegeben?

## Erstellen

### Backend Route
```typescript
// src/api/{name}.ts
export async function handle{Method}{Name}(req, res) {
  // Implementation
}
```

### TypeScript Types
```typescript
// src/types/{name}.ts
interface {Name}Request { ... }
interface {Name}Response { ... }
```

### Frontend Fetch
```typescript
// src/lib/api/{name}.ts
export async function fetch{Name}() {
  return fetch('/api/{name}').then(r => r.json());
}
```

## Checkliste

- [ ] Backend Route
- [ ] Request Validation
- [ ] Error Handling
- [ ] TypeScript Types
- [ ] Frontend Client
- [ ] Auth/Permissions prüfen
