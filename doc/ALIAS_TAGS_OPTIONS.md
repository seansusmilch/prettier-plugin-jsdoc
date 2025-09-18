# Alias tag normalization and configuration

This plugin can normalize JSDoc alias tags to a consistent target, preserve the authoring as-is, or prefer project-specific aliases. You can also control how duplicate/conflicting aliases are handled.

The options are declared in `src/index.ts` and consumed in the normalization pipeline in `src/parser.ts`. Rendering respects the chosen alias via `src/stringify.ts`.

## Options

- jsdocAliasTagsMode (choice)
  - "normalize" (default): Normalize alias tags to the plugin’s canonical targets. Backward compatible with existing behavior.
  - "preserve": Keep tag names exactly as written by the author; content (type/name/description) is still normalized.
  - "prefer": Normalize aliases but render with your preferred target from `jsdocPreferredAliases` when available.
  - "strict": Same as `prefer`, and when multiple aliases from the same group appear in a block, applies `jsdocAliasConflictStrategy`.

- jsdocPreferredAliases (object or JSON string)
  - Maps an alias group id to a preferred tag name. Only used in `prefer` and `strict` modes.
  - Example:

```javascript
{
  "jsdocPreferredAliases": JSON.stringify({
    "returns": "return",
    "class": "constructor",
    "emits": "fires"
  })
}
```

- jsdocAliasConflictStrategy (choice)
  - What to do when a block contains multiple aliases from the same group (e.g., `@return` and `@returns`). Used only in `strict` mode.
  - "merge" (default): Merge entries into one using the preferred alias, combining content and keeping the most complete.
  - "first": Keep the first occurrence, drop the rest.
  - "last": Keep the last occurrence, drop the rest.
  - "error": Keep the first unchanged (no-op). You can later add diagnostics if desired.

## Alias groups

Alias groups are based on official JSDoc synonyms. The plugin uses a canonical target for internal ordering/roles and will render your preferred names in `prefer`/`strict` modes.

- abstract: `abstract` | `virtual`
- augments: `augments` | `extends` (canonical: `extends`)
- class: `class` | `constructor`
- constant: `constant` | `const`
- default: `default` | `defaultValue`
- description: `description` | `desc`
- emits: `emits` | `fires` (canonical: `fires`)
- external: `external` | `host`
- file: `file` | `fileoverview` | `overview`
- function: `function` | `func` | `method`
- member: `member` | `var`
- param: `param` | `arg` | `argument` | `params`
- property: `property` | `prop`
- returns: `returns` | `return`
- throws: `throws` | `exception`
- yields: `yields` | `yield`

Note: Inline tag aliases (e.g., `{@link ...}` vs `{@linkplain ...}`) are not affected by this pass.

## Configuration examples

Keep authoring as-is:

```
{
  "jsdocAliasTagsMode": "preserve"
}
```

Prefer specific tags while normalizing:

```
{
  "jsdocAliasTagsMode": "prefer",
  "jsdocPreferredAliases": "{\"returns\":\"return\",\"class\":\"constructor\"}"
}
```

Strict mode with conflict handling:

```
{
  "jsdocAliasTagsMode": "strict",
  "jsdocPreferredAliases": { "returns": "return" },
  "jsdocAliasConflictStrategy": "merge"
}
```

## Interactions with ordering

When aliases are transformed, ordering (`jsdocTagsOrder`) uses the internal canonical tag. Custom order keys should reference the canonical names. See `doc/CUSTOM_TAGS_ORDER.md` for weights.

- Example: the augments group uses `extends` as canonical; use `"extends"` when customizing order.

## Where it runs in the pipeline

- `src/parser.ts`: Parses JSDoc blocks, normalizes tags, applies alias mode/strategy, resolves conflicts, and computes final render tag.
- `src/stringify.ts`: Renders the tag using its preferred/preserved display name while keeping core ordering/roles stable.
- `src/roles.ts`, `src/tags.ts`: Define canonical names, groups, and ordering used internally.
