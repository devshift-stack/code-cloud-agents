## OTOP Rules (MUST)
- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
- Do not hardcode API URLs; use ENV/proxy.
- Backend APIs must have OpenAPI with unique `operationId` + structured `tags`.
