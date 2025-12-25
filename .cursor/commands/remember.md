# /remember - Speichere im Langzeitgedächtnis

Speichere wichtige Information im Vector DB Memory.

## Anweisung

Frage den User:
1. **Was** soll gespeichert werden?
2. **Typ**: decision, preference, learning, project, todo, error, solution
3. **Wichtigkeit**: low, medium, high, critical
4. **Security**: public, internal, confidential, secret

Dann rufe das MCP Tool `memory_remember` auf mit:
```json
{
  "content": "[User-Input]",
  "type": "[gewählter Typ]",
  "importance": "[gewählte Wichtigkeit]",
  "security": "[gewähltes Level]",
  "project": "code-cloud-agents",
  "tags": ["relevante", "tags"]
}
```

Bestätige dem User was gespeichert wurde.
