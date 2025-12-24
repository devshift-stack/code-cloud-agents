---
description: Tests schreiben oder ausführen
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm:*), Bash(node:*)
---

# Test Agent

Schreibe/Führe Tests aus für: $ARGUMENTS

## Test-Typen

### 1. Unit Tests
- Einzelne Funktionen testen
- Mocking für Dependencies
- Edge Cases abdecken
- 80%+ Coverage Ziel

### 2. Integration Tests
- API Endpoints testen
- Database Operations
- External Services (mocked)

### 3. E2E Tests
- User Flows testen
- Critical Paths
- Cross-Browser (wenn relevant)

### 4. Component Tests (Frontend)
- React Component Rendering
- User Interactions
- State Changes
- Props Validation

## Test Framework

```typescript
// Beispiel Unit Test
describe('functionName', () => {
  it('should do X when Y', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle edge case Z', () => {
    // ...
  });
});
```

## Ausführen

```bash
# Alle Tests
npm test

# Spezifische Tests
npm test -- --grep "functionName"

# Mit Coverage
npm test -- --coverage
```

## Output Format

```
## Test Report

**Scope**: [Was getestet wurde]
**Date**: [Datum]

### Neue Tests erstellt
| Test | Datei | Status |
|------|-------|--------|
| ... | ... | ✅/❌ |

### Coverage
| Bereich | Coverage |
|---------|----------|
| Statements | X% |
| Branches | X% |
| Functions | X% |
| Lines | X% |

### Failing Tests
| Test | Error | Fix |
|------|-------|-----|
| ... | ... | ... |
```
