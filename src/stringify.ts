import { Spec } from "comment-parser";
import {
  formatDescription,
  descriptionEndLine,
} from "./descriptionFormatter.js";
import {
  DESCRIPTION,
  EXAMPLE,
  PRIVATE_REMARKS,
  REMARKS,
  SPACE_TAG_DATA,
} from "./tags.js";
import {
  TAGS_ORDER,
  TAGS_PEV_FORMATE_DESCRIPTION,
  TAGS_VERTICALLY_ALIGN_ABLE,
} from "./roles.js";
import { AllOptions } from "./types.js";
import { formatCode, isDefaultTag } from "./utils.js";

const stringify = async (
  rawTag: Spec,
  tagIndex: number,
  finalTagsArray: Spec[],
  options: AllOptions,
  maxTagTitleLength: number,
  maxTagTypeNameLength: number,
  maxTagNameLength: number,
  renderTagOverride?: string,
): Promise<string> => {
  const { name, type, tag } = rawTag;
  let { description } = rawTag;
  let tagString = "\n";

  if (tag === SPACE_TAG_DATA.tag) {
    return tagString;
  }

  const {
    printWidth,
    jsdocSpaces,
    jsdocVerticalAlignment,
    jsdocDescriptionTag,
    tsdoc,
    useTabs,
    tabWidth,
    jsdocSeparateTagGroups,
    jsdocSeparateDescriptionFromTags,
  } = options;
  const gap = " ".repeat(jsdocSpaces);

  let tagTitleGapAdj = 0;
  let tagTypeGapAdj = 0;
  let tagNameGapAdj = 0;
  let descGapAdj = 0;

  if (jsdocVerticalAlignment && TAGS_VERTICALLY_ALIGN_ABLE.includes(tag)) {
    if (tag) tagTitleGapAdj += maxTagTitleLength - tag.length;
    else if (maxTagTitleLength) descGapAdj += maxTagTitleLength + gap.length;

    if (type) tagTypeGapAdj += maxTagTypeNameLength - type.length;
    else if (maxTagTypeNameLength)
      descGapAdj += maxTagTypeNameLength + gap.length;

    if (name) tagNameGapAdj += maxTagNameLength - name.length;
    else if (maxTagNameLength) descGapAdj = maxTagNameLength + gap.length;
  }

  const displayTag = renderTagOverride || tag;
  const useTagTitle = tag !== DESCRIPTION || jsdocDescriptionTag;

  if (useTagTitle) {
    tagString += `@${displayTag}${" ".repeat(tagTitleGapAdj || 0)}`;
  }
  if (type) {
    const getUpdatedType = () => {
      if (!isDefaultTag(tag)) {
        return `{${type}}`;
      }

      // The space is to improve readability in non-monospace fonts
      if (type === "[]") return "[ ]";
      if (type === "{}") return "{ }";

      const isAnObject = (value: string): boolean =>
        /^{.*[A-z0-9_]+ ?:.*}$/.test(value);
      const fixObjectCommas = (objWithBrokenCommas: string): string =>
        objWithBrokenCommas.replace(/; ([A-z0-9_])/g, ", $1");

      if (isAnObject(type)) {
        return fixObjectCommas(type);
      }

      return type;
    };
    const updatedType = getUpdatedType();
    tagString += gap + updatedType + " ".repeat(tagTypeGapAdj);
  }
  if (name) tagString += `${gap}${name}${" ".repeat(tagNameGapAdj)}`;

  // Try to use prettier on @example tag description
  if (tag === EXAMPLE && !tsdoc) {
    const exampleCaption = description.match(/<caption>([\s\S]*?)<\/caption>/i);

    if (exampleCaption) {
      description = description.replace(exampleCaption[0], "");
      tagString = `${tagString} ${exampleCaption[0]}`;
    }

    const beginningSpace = useTabs ? "\t" : " ".repeat(tabWidth);
    const formattedExample = await formatCode(
      description,
      beginningSpace,
      options,
    );

    tagString += formattedExample
      .replace(
        new RegExp(
          `^\\n${beginningSpace
            .replace(/[\t]/g, "[\\t]")
            .replace(/[^S\r\n]/g, "[^S\\r\\n]")}\\n`,
        ),
        "",
      )
      .trimEnd();
  } // Add description (complicated because of text wrap)
  else if (description) {
    let descriptionString = "";
    if (useTagTitle) tagString += gap + " ".repeat(descGapAdj);
    if (
      TAGS_PEV_FORMATE_DESCRIPTION.includes(tag) ||
      !TAGS_ORDER[tag as keyof typeof TAGS_ORDER]
    ) {
      // Avoid wrapping
      descriptionString = description;
    } else {
      const [, firstWord] = /^\s*(\S+)/.exec(description) || ["", ""];

      // Wrap tag description
      const beginningSpace =
        tag === DESCRIPTION ||
        ([EXAMPLE, REMARKS, PRIVATE_REMARKS].includes(tag) && tsdoc)
          ? ""
          : "  "; // google style guide space

      if (options.jsdocFormatDescriptions === false) {
        // Preserve author-authored description without reflow/capitalization/punctuation
        descriptionString = description;
      } else if (
        (tag !== DESCRIPTION &&
          tagString.length + firstWord.length > printWidth) ||
        // tsdoc tags
        [REMARKS, PRIVATE_REMARKS].includes(tag)
      ) {
        // the tag is already longer than we are allowed to, so let's start at a new line
        descriptionString =
          `\n${beginningSpace}` +
          (await formatDescription(tag, description, options, {
            beginningSpace,
          }));
      } else {
        // append the description to the tag
        descriptionString = await formatDescription(tag, description, options, {
          // 1 is `\n` which added to tagString
          tagStringLength: tagString.length - 1,
          beginningSpace,
        });
      }
    }

    if (jsdocSeparateTagGroups) {
      descriptionString = descriptionString.trimEnd();
    }

    // When enforcing separation, remove trailing blank lines from the
    // description so we end up with exactly one blank line before next tag.
    if (tag === DESCRIPTION && jsdocSeparateDescriptionFromTags) {
      descriptionString = descriptionString.replace(/\n[\t\x20]*$/g, "");
    }

    tagString += descriptionString.startsWith("\n")
      ? descriptionString.replace(/^\n[\s]+\n/g, "\n")
      : descriptionString.trimStart();
  }

  // Add empty line after some tags if there is something below
  const isEndTag = tagIndex === finalTagsArray.length - 1;

  // Handle spacing after @description here to allow configurability
  if (tag === DESCRIPTION && !isEndTag) {
    if (jsdocSeparateDescriptionFromTags) {
      tagString += "\n";
    }
  } else {
    tagString += descriptionEndLine({ tag, isEndTag });
  }

  return tagString;
};

export { stringify };
