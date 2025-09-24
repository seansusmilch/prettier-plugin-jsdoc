import { parse, Spec, Block, tokenizers } from "comment-parser";
import {
  addStarsToTheBeginningOfTheLines,
  convertToModernType,
  formatType,
  detectEndOfLine,
  findPluginByParser,
  isDefaultTag,
} from "./utils.js";
import { DESCRIPTION, PARAM, RETURNS, EXAMPLE } from "./tags.js";
import {
  TAGS_DESCRIPTION_NEEDED,
  TAGS_GROUP_HEAD,
  TAGS_GROUP_CONDITION,
  TAGS_NAMELESS,
  TAGS_ORDER,
  TAGS_SYNONYMS,
  TAGS_TYPELESS,
  TAGS_VERTICALLY_ALIGN_ABLE,
} from "./roles.js";
import { AST, AllOptions, PrettierComment } from "./types.js";
import { stringify } from "./stringify.js";
import { Parser } from "prettier";
import { SPACE_TAG_DATA, getAliasGroupId, resolvePreferredTagForGroup } from "./tags.js";

const {
  name: nameTokenizer,
  tag: tagTokenizer,
  type: typeTokenizer,
  description: descriptionTokenizer,
} = tokenizers;

/** @link https://prettier.io/docs/en/api.html#custom-parser-api} */
export const getParser = (originalParse: Parser["parse"], parserName: string) =>
  async function jsdocParser(
    text: string,
    parsersOrOptions: Parameters<Parser["parse"]>[1],
    maybeOptions?: AllOptions,
  ): Promise<AST> {
    let options = (maybeOptions ?? parsersOrOptions) as AllOptions;
    const prettierParse =
      findPluginByParser(parserName, options)?.parse || originalParse;

    const ast = prettierParse(text, options) as AST;

    options = {
      ...options,
      printWidth: options.jsdocPrintWidth ?? options.printWidth,
    };

    const eol =
      options.endOfLine === "auto" ? detectEndOfLine(text) : options.endOfLine;
    options = { ...options, endOfLine: "lf" };

    await Promise.all(
      ast.comments.map(async (comment) => {
        if (!isBlockComment(comment)) return;

        const paramsOrder = getParamsOrders(text, comment);
        const originalValue = comment.value;

        /** Issue: https://github.com/hosseinmd/prettier-plugin-jsdoc/issues/18 */
        comment.value = comment.value.replace(/^([*]+)/g, "*");
        // Create the full comment string with line ends normalized to \n
        // This means that all following code can assume \n and should only use
        // \n.
        const commentString = `/*${comment.value.replace(/\r\n?/g, "\n")}*/`;

        /**
         * Check if this comment block is a JSDoc. Based on:
         * https://github.com/jsdoc/jsdoc/blob/master/packages/jsdoc/plugins/commentsOnly.js
         */
        if (!/^\/\*\*[\s\S]+?\*\/$/.test(commentString)) return;

        const parsed = parse(commentString, {
          spacing: "preserve",
          tokenizers: [
            tagTokenizer(),
            (spec) => {
              if (isDefaultTag(spec.tag)) {
                return spec;
              }

              return typeTokenizer("preserve")(spec);
            },
            nameTokenizer(),
            descriptionTokenizer("preserve"),
          ],
        })[0];

        comment.value = "";

        if (!parsed) {
          // Error on commentParser
          return;
        }

        normalizeTags(parsed, options);
        convertCommentDescToDescTag(parsed);

        const commentContentPrintWidth = getIndentationWidth(
          comment,
          text,
          options,
        );

        let maxTagTitleLength = 0;
        let maxTagTypeLength = 0;
        let maxTagNameLength = 0;

        let tags = parsed.tags
          // Prepare tags data
          .map(({ type, optional, ...rest }) => {
            if (type) {
              /**
               * Convert optional to standard
               * https://jsdoc.app/tags-type.html#:~:text=Optional%20parameter
               */
              type = type.replace(/[=]$/, () => {
                optional = true;
                return "";
              });

              type = convertToModernType(type);
            }

            return {
              ...rest,
              type,
              optional,
            } as Spec;
          });

        // Group tags
        tags = sortTags(tags, paramsOrder, options);

        if (options.jsdocSeparateReturnsFromParam) {
          tags = tags.flatMap((tag, index) => {
            if (tag.tag === RETURNS && tags[index - 1]?.tag === PARAM) {
              return [SPACE_TAG_DATA, tag];
            }

            return [tag];
          });
        }
        if (options.jsdocAddDefaultToDescription && options.jsdocFormatDescriptions !== false) {
          tags = tags.map(addDefaultValueToDescription);
        }

        tags = await Promise.all(
          tags
            .map(assignOptionalAndDefaultToName)
            .map(async ({ type, ...rest }) => {
              if (type) {
                type = await formatType(type, {
                  ...options,
                  printWidth: commentContentPrintWidth,
                });
              }

              return {
                ...rest,
                type,
              } as Spec;
            }),
        ).then((formattedTags) =>
          formattedTags.map(({ type, name, description, tag, ...rest }) => {
            const isVerticallyAlignAbleTags =
              TAGS_VERTICALLY_ALIGN_ABLE.includes(tag);

            if (isVerticallyAlignAbleTags) {
              maxTagTitleLength = Math.max(maxTagTitleLength, tag.length);
              maxTagTypeLength = Math.max(maxTagTypeLength, type.length);
              maxTagNameLength = Math.max(maxTagNameLength, name.length);
            }

            return {
              type,
              name,
              description,
              tag,
              ...rest,
            };
          }),
        );

        if (options.jsdocSeparateTagGroups) {
          tags = tags.flatMap((tag, index) => {
            const prevTag = tags[index - 1];
            if (
              prevTag &&
              prevTag.tag !== DESCRIPTION &&
              prevTag.tag !== EXAMPLE &&
              prevTag.tag !== SPACE_TAG_DATA.tag &&
              tag.tag !== SPACE_TAG_DATA.tag &&
              prevTag.tag !== tag.tag
            ) {
              return [SPACE_TAG_DATA, tag];
            }

            return [tag];
          });
        }

        const filteredTags = tags.filter(({ description, tag }) => {
          if (!description && TAGS_DESCRIPTION_NEEDED.includes(tag)) {
            return false;
          }
          return true;
        });

        // Create final jsDoc string
        for (const [tagIndex, tagData] of filteredTags.entries()) {
          const renderTagOverride = computeRenderTag(tagData, options);
          const formattedTag = await stringify(
            tagData,
            tagIndex,
            filteredTags,
            { ...options, printWidth: commentContentPrintWidth },
            maxTagTitleLength,
            maxTagTypeLength,
            maxTagNameLength,
            renderTagOverride,
          );
          comment.value += formattedTag;
        }

        comment.value = comment.value.trimEnd();

        if (comment.value) {
          comment.value = addStarsToTheBeginningOfTheLines(
            originalValue,
            comment.value,
            options,
          );
        }

        if (eol === "cr") {
          comment.value = comment.value.replace(/\n/g, "\r");
        } else if (eol === "crlf") {
          comment.value = comment.value.replace(/\n/g, "\r\n");
        }
      }),
    );

    ast.comments = ast.comments.filter(
      (comment) => !(isBlockComment(comment) && !comment.value),
    );

    return ast;
  };

function sortTags(
  tags: Spec[],
  paramsOrder: string[] | undefined,
  options: AllOptions,
): Spec[] {
  let canGroupNextTags = false;
  let shouldSortAgain = false;

  tags = tags
    .reduce<Spec[][]>((tagGroups, cur) => {
      if (
        tagGroups.length === 0 ||
        (TAGS_GROUP_HEAD.includes(cur.tag) && canGroupNextTags)
      ) {
        canGroupNextTags = false;
        tagGroups.push([]);
      }
      if (TAGS_GROUP_CONDITION.includes(cur.tag)) {
        canGroupNextTags = true;
      }
      tagGroups[tagGroups.length - 1].push(cur);

      return tagGroups;
    }, [])
    .flatMap((tagGroup, index, array) => {
      // sort tags within groups
      tagGroup.sort((a, b) => {
        if (
          paramsOrder &&
          paramsOrder.length > 1 &&
          a.tag === PARAM &&
          b.tag === PARAM
        ) {
          const aIndex = paramsOrder.indexOf(a.name);
          const bIndex = paramsOrder.indexOf(b.name);
          if (aIndex > -1 && bIndex > -1) {
            //sort params
            return aIndex - bIndex;
          }
          return 0;
        }
        return (
          getTagOrderWeight(a.tag, options) - getTagOrderWeight(b.tag, options)
        );
      });

      // add an empty line between groups
      if (array.length - 1 !== index) {
        tagGroup.push(SPACE_TAG_DATA);
      }

      if (
        index > 0 &&
        tagGroup[0]?.tag &&
        !TAGS_GROUP_HEAD.includes(tagGroup[0].tag)
      ) {
        shouldSortAgain = true;
      }

      return tagGroup;
    });

  return shouldSortAgain ? sortTags(tags, paramsOrder, options) : tags;
}

/**
 * Control order of tags by weights. Smaller value brings tag higher.
 */
function getTagOrderWeight(tag: string, options: AllOptions): number {
  if (tag === DESCRIPTION && !options.jsdocDescriptionTag) {
    return -1;
  }
  let index;

  if (options.jsdocTagsOrder?.[tag] !== undefined) {
    index = options.jsdocTagsOrder[tag];
  } else {
    index = TAGS_ORDER[tag as keyof typeof TAGS_ORDER];
  }

  return index === undefined ? TAGS_ORDER.other : index;
}

function isBlockComment(comment: PrettierComment): boolean {
  return comment.type === "CommentBlock" || comment.type === "Block";
}

function getIndentationWidth(
  comment: PrettierComment,
  text: string,
  options: AllOptions,
): number {
  const line = text.split(/\r\n?|\n/g)[comment.loc.start.line - 1];

  let spaces = 0;
  let tabs = 0;
  for (let i = comment.loc.start.column - 1; i >= 0; i--) {
    const c = line[i];
    if (c === " ") {
      spaces++;
    } else if (c === "\t") {
      tabs++;
    } else {
      break;
    }
  }

  return options.printWidth - (spaces + tabs * options.tabWidth) - " * ".length;
}

const TAGS_ORDER_ENTRIES = Object.entries(TAGS_ORDER);
/**
 * This will adjust the casing of tag titles, resolve synonyms, fix
 * incorrectly parsed tags, correct incorrectly assigned names and types, and
 * trim spaces.
 *
 * @param parsed
 */
function normalizeTags(parsed: Block, options: AllOptions): void {
  const mode = options.jsdocAliasTagsMode || "normalize";

  // First pass: normalize structure and decide render tag per alias preferences
  const normalized = parsed.tags.map(
    ({ tag, type, name, description, default: _default, ...rest }) => {
      let currentTag = tag || "";
      let tagType = type || "";
      let tagName = name || "";
      let tagDescription = description || "";
      const tagDefault = _default?.trim();

      // Handle missing space between tag and type
      const tagSticksToType = currentTag.indexOf("{");
      if (tagSticksToType !== -1 && currentTag[currentTag.length - 1] === "}") {
        tagType = currentTag.slice(tagSticksToType + 1, -1) + " " + tagType;
        currentTag = currentTag.slice(0, tagSticksToType);
      }

      currentTag = currentTag.trim();
      const lower = currentTag.toLowerCase();

      // Find canonical casing if tag is known directly by TAGS_ORDER keys
      const tagIndex = TAGS_ORDER_ENTRIES.findIndex(
        ([key]) => key.toLowerCase() === lower,
      );
      // Determine alias group
      const groupId = getAliasGroupId(lower);

      // Logical tag (used for ordering/roles)
      let logicalTag = currentTag;
      if (groupId) {
        // Always use group canonical for internal logic
        logicalTag = TAGS_ORDER_ENTRIES.find(([key]) => key === getGroupCanonicalFallback(groupId))?.[0] || getGroupCanonicalFallback(groupId);
      } else if (tagIndex >= 0) {
        logicalTag = TAGS_ORDER_ENTRIES[tagIndex][0];
      } else if (lower in TAGS_SYNONYMS) {
        logicalTag = TAGS_SYNONYMS[lower as keyof typeof TAGS_SYNONYMS];
      }

      // Render tag decision based on mode
      tagType = tagType.trim();
      tagName = tagName.trim();

      if (tagName && TAGS_NAMELESS.includes(logicalTag)) {
        // comment-parser note:
        // - comment-parser tokenizes generically: tag -> type -> name -> description.
        // - It does not know which tags are nameless (e.g. @file, @description, @example, @remarks).
        // - For a line like `@file Full screen ...` (especially when the first
        //   line had no leading `*`), comment-parser often assigns `Full` to `name`
        //   and leaves ` description...` (with a leading space) as the description.
        //
        // Our normalization merges such stray `name` back into the description
        // for nameless tags to match JSDoc semantics. While merging, we trim
        // only a single leading space from the description to avoid producing
        // a double space ("Full  screen") but keep any intentional indentation
        // and newlines (lists, markdown blocks, etc.).
        const descNoLeading = (tagDescription || "").replace(/^ /, "");
        tagDescription = descNoLeading ? `${tagName} ${descNoLeading}` : tagName;
        tagName = "";
      }
      if (tagType && TAGS_TYPELESS.includes(logicalTag)) {
        tagDescription = `{${tagType}} ${tagDescription}`;
        tagType = "";
      }

      return {
        tag: logicalTag,
        type: tagType,
        name: tagName,
        description: tagDescription,
        default: tagDefault,
        ...rest,
      } as Spec;
    },
  );

  // Strict mode conflict resolution for non-repeatable groups
  parsed.tags = mode === "strict" ? applyAliasConflicts(normalized, options) : normalized;
}

function getGroupCanonicalFallback(groupId: string): string {
  switch (groupId) {
    case "abstract":
      return "abstract";
    case "augments":
      return "extends";
    case "class":
      return "class";
    case "constant":
      return "constant";
    case "default":
      return "default";
    case "description":
      return "description";
    case "emits":
      return "fires";
    case "external":
      return "external";
    case "file":
      return "file";
    case "function":
      return "function";
    case "member":
      return "member";
    case "param":
      return "param";
    case "property":
      return "property";
    case "returns":
      return "returns";
    case "throws":
      return "throws";
    case "yields":
      return "yields";
    default:
      return groupId;
  }
}

const NON_REPEATABLE_GROUPS = new Set(["returns", "class", "emits", "augments", "yields"]);

function applyAliasConflicts(tags: Spec[], options: AllOptions) {
  const strategy = options.jsdocAliasConflictStrategy || "merge";
  const groups: Record<string, number[]> = {};

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    const g = getAliasGroupId(t.tag);
    if (g && NON_REPEATABLE_GROUPS.has(g)) {
      if (!groups[g]) groups[g] = [];
      groups[g].push(i);
    }
  }

  const toRemove = new Set<number>();
  const out = [...tags];

  for (const [, indices] of Object.entries(groups)) {
    if (indices.length <= 1) continue;
    if (strategy === "first") {
      // Keep first
      for (let k = 1; k < indices.length; k++) toRemove.add(indices[k]);
      // keep first, remove others
    } else if (strategy === "last") {
      for (let k = 0; k < indices.length - 1; k++) toRemove.add(indices[k]);
      // keep last
    } else if (strategy === "error") {
      // Keep first unchanged
      for (let k = 1; k < indices.length; k++) toRemove.add(indices[k]);
    } else {
      // merge
      const baseIndex = indices[0];
      const base = out[baseIndex];
      for (let k = 1; k < indices.length; k++) {
        const idx = indices[k];
        const cur = out[idx];
        if (!base.type && cur.type) base.type = cur.type;
        if (!base.name && cur.name) base.name = cur.name;
        // Prefer longer description
        if ((cur.description || "").length > (base.description || "").length) {
          base.description = cur.description;
        }
        toRemove.add(idx);
      }
    }
  }

  return out.filter((_, i) => !toRemove.has(i));
}

function computeRenderTag(tag: Spec, options: AllOptions): string | undefined {
  const mode = options.jsdocAliasTagsMode || "normalize";
  if (mode === "preserve") {
    const original = extractOriginalTagFromSource(tag);
    return original || tag.tag;
  }

  if (mode === "prefer" || mode === "strict") {
    const g = getAliasGroupId(tag.tag);
    if (g) {
      return resolvePreferredTagForGroup(g, options);
    }
    return undefined;
  }

  // normalize mode
  return undefined;
}

function extractOriginalTagFromSource(tag: Spec): string | undefined {
  try {
    const src = tag.source || [];
    for (const s of src) {
      const m = /@([A-Za-z]+)/.exec(s.source);
      if (m) return m[1].toLowerCase();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * This will merge the comment description and all `@description` tags into one
 * `@description` tag.
 *
 * @param parsed
 */
function convertCommentDescToDescTag(parsed: Block): void {
  const original = parsed.description || "";
  let description = original;
  parsed.description = "";

  parsed.tags = parsed.tags.filter(({ description: _description, tag }) => {
    if (tag.toLowerCase() === DESCRIPTION) {
      if (_description.trim()) {
        // Only insert a separating blank line when there was an existing
        // comment description above. If the top-level description was empty,
        // just append the tag content directly so we don't create leading
        // blank lines at the top of the JSDoc.
        description += (description ? "\n\n" : "") + _description;
      }
      return false;
    } else {
      return true;
    }
  });

  if (description) {
    parsed.tags.unshift({
      tag: DESCRIPTION,
      description,
      name: undefined as any,
      type: undefined as any,
      source: [],
      optional: false,
      problems: [],
    });
  }
}

/**
 * This is for find params of function name in code as strings of array. Since
 * tokens are not available in newer Prettier versions, we'll parse the text
 * directly.
 */
function getParamsOrders(
  text: string,
  comment: PrettierComment,
): string[] | undefined {
  try {
    const lines = text.split("\n");
    let commentEnd = 0;
    for (let i = 0; i < comment.loc.end.line - 1; i++) {
      commentEnd += lines[i].length + 1;
    }
    commentEnd += comment.loc.end.column;

    const textAfterComment = text.slice(commentEnd);

    const functionMatch = textAfterComment.match(
      /^\s*function\s+\w*\s*\(([^)]*)\)/,
    );
    if (functionMatch) {
      const paramsString = functionMatch[1];
      const params = paramsString
        .split(",")
        .map((param) => {
          const trimmed = param.trim();
          const colonIndex = trimmed.indexOf(":");
          const paramName =
            colonIndex > -1 ? trimmed.slice(0, colonIndex) : trimmed;
          return paramName.split(/\s+/)[0].replace(/[{}[\]]/g, "");
        })
        .filter((param) => param && param !== "...");

      return params;
    }

    const arrowMatch = textAfterComment.match(
      /^\s*(?:const|let|var)\s+\w+\s*=\s*\(([^)]*)\)\s*=>/,
    );
    if (arrowMatch) {
      const paramsString = arrowMatch[1];
      const params = paramsString
        .split(",")
        .map((param) => {
          const trimmed = param.trim();
          const colonIndex = trimmed.indexOf(":");
          const paramName =
            colonIndex > -1 ? trimmed.slice(0, colonIndex) : trimmed;
          return paramName.split(/\s+/)[0].replace(/[{}[\]]/g, "");
        })
        .filter((param) => param && param !== "...");

      return params;
    }

    const methodMatch = textAfterComment.match(/^\s*(\w+)\s*\(([^)]*)\)/);
    if (methodMatch) {
      const paramsString = methodMatch[2];
      const params = paramsString
        .split(",")
        .map((param) => {
          const trimmed = param.trim();
          const colonIndex = trimmed.indexOf(":");
          const paramName =
            colonIndex > -1 ? trimmed.slice(0, colonIndex) : trimmed;
          return paramName.split(/\s+/)[0].replace(/[{}[\]]/g, "");
        })
        .filter((param) => param && param !== "...");

      return params;
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * If the given tag has a default value, then this will add a note to the
 * description with that default value. This is done because TypeScript does
 * not display the documented JSDoc default value (e.g. `@param [name="John"]`).
 *
 * If the description already contains such a note, it will be updated.
 */
function addDefaultValueToDescription(tag: Spec): Spec {
  if (tag.optional && tag.default) {
    let { description } = tag;

    // remove old note
    description = description.replace(/(?:\s*Default\s+is\s+`.*?`\.?)+/g, "");

    // add a `.` at the end of previous sentences
    if (description && !/[.\n]$/.test(description)) {
      description += ".";
    }

    description += ` Default is \`${tag.default}\``;

    return {
      ...tag,
      description: description.trim(),
    };
  } else {
    return tag;
  }
}

/**
 * This will combine the `name`, `optional`, and `default` properties into name
 * setting the other two to `false` and `undefined` respectively.
 */
function assignOptionalAndDefaultToName({
  name,
  optional,
  default: default_,
  tag,
  type,
  source,
  description,
  ...rest
}: Spec): Spec {
  if (isDefaultTag(tag)) {
    const usefulSourceLine =
      source.find((x) => x.source.includes(`@${tag}`))?.source || "";

    const tagMatch = usefulSourceLine.match(
      /@default(Value)? (\[.*]|{.*}|\(.*\)|'.*'|".*"|`.*`| \w+)( ((?!\*\/).+))?/,
    );
    const tagValue = tagMatch?.[2] || "";
    const tagDescription = tagMatch?.[4] || "";

    if (tagMatch) {
      type = tagValue;
      name = "";
      description = tagDescription;
    }
  } else if (optional) {
    if (name) {
      // Figure out if tag type have default value
      if (default_) {
        name = `[${name}=${default_}]`;
      } else {
        name = `[${name}]`;
      }
    } else {
      type = `${type} | undefined`;
    }
  }

  return {
    ...rest,
    tag,
    name,
    description,
    optional,
    type,
    source,
    default: default_,
  };
}
