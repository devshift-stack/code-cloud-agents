# /component - React Component erstellen

## Fragen

1. **Name** der Component?
2. **Typ**: Page, Layout, UI, Feature?
3. **Props** - Welche Properties?

## Erstellen

Pfad: `src/components/{Name}/{Name}.tsx`

```tsx
import { FC } from 'react';

interface {Name}Props {
  // Props hier
}

export const {Name}: FC<{Name}Props> = ({ ...props }) => {
  return (
    <div className="">
      {/* Component content */}
    </div>
  );
};
```

## Zusätzlich erstellen

- `src/components/{Name}/index.ts` - Re-Export
- Bei komplexer Logik: Custom Hook `use{Name}.ts`

## Regeln

- Functional Components (keine Class)
- TypeScript Props Interface
- Tailwind für Styling
- Named Export (kein default)
