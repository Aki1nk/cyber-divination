# Tokunex Chat Completions Compatibility Fallback Design

## Context

The production Pages Function successfully receives and stores a reading, but the configured Tokunex relay returns an HTTP 5xx response for `POST https://tokunex.com/v1/responses`. Tokunex publicly advertises the OpenAI-compatible `POST /v1/chat/completions` route, so the current Responses-only transport leaves otherwise valid production readings in `failed/provider_unavailable`.

## Decision

Keep the Responses API as the primary transport. For a non-default HTTPS relay, if the Responses request returns a provider rejection or provider 5xx response, make one compatibility attempt against the same base URL's `/chat/completions` route.

The fallback request keeps the approved model, `store: false`, no tools, medium reasoning effort, the same system/user prompt content, and strict JSON Schema output through Chat Completions' `response_format.json_schema` contract. Official OpenAI requests do not silently change transport.

## Parsing

Responses output continues to parse `output[].content[]`. Chat Completions output parses `choices[0].message.content`, rejects malformed JSON or missing required fields with `provider_invalid_output`, and treats `message.refusal` as a refusal.

## Error Handling

- Authentication and rate-limit failures remain final and expose only their existing safe error codes.
- A fallback is attempted only after a relay rejects the Responses contract or returns 5xx.
- If the fallback also fails, its safe error code is returned.
- Upstream response bodies, API keys, passwords, and secrets are never returned to the browser or written to Git.

## Verification

Add provider-unit tests that reproduce the observed Responses 5xx, assert the exact fallback URL and request contract, and verify successful structured parsing. Retain all existing Responses API, refusal, timeout, URL validation, full-suite, build, syntax, and production smoke tests.
