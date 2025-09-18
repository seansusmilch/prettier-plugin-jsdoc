import { Spec } from "comment-parser";
import { AllOptions } from "./types.js";

const ABSTRACT = "abstract";
const ASYNC = "async";
const AUGMENTS = "augments";
const AUTHOR = "author";
const BORROWS = "borrows";
const CALLBACK = "callback";
const CATEGORY = "category";
const CLASS = "class";
const CONSTANT = "constant";
const DEFAULT = "default";
const DEFAULT_VALUE = "defaultValue";
const DEPRECATED = "deprecated";
const DESCRIPTION = "description";
const EXAMPLE = "example";
const EXTENDS = "extends";
const EXTERNAL = "external";
const FILE = "file";
const FIRES = "fires";
const FLOW = "flow";
const FUNCTION = "function";
const IGNORE = "ignore";
const LICENSE = "license";
const MEMBER = "member";
const MEMBEROF = "memberof";
const MODULE = "module";
const NAMESPACE = "namespace";
const OVERLOAD = "overload";
const OVERRIDE = "override";
const PARAM = "param";
const PRIVATE = "private";
const PRIVATE_REMARKS = "privateRemarks";
const PROPERTY = "property";
const PROVIDES_MODULE = "providesModule";
const REMARKS = "remarks";
const RETURNS = "returns";
const SEE = "see";
const SINCE = "since";
const TEMPLATE = "template";
const THROWS = "throws";
const TODO = "todo";
const TYPE = "type";
const TYPE_PARAM = "typeParam";
const TYPEDEF = "typedef";
const SATISFIES = "satisfies";
const VERSION = "version";
const YIELDS = "yields";

const SPACE_TAG_DATA: Spec = {
  tag: "this_is_for_space",
  name: "",
  optional: false,
  type: "",
  description: "",
  source: [],
  problems: [],
};

export {
  ABSTRACT,
  ASYNC,
  AUGMENTS,
  AUTHOR,
  BORROWS,
  CALLBACK,
  CATEGORY,
  CLASS,
  CONSTANT,
  DEFAULT,
  DEFAULT_VALUE,
  DEPRECATED,
  DESCRIPTION,
  EXAMPLE,
  EXTENDS,
  EXTERNAL,
  FILE,
  FIRES,
  FLOW,
  FUNCTION,
  IGNORE,
  LICENSE,
  MEMBER,
  MEMBEROF,
  MODULE,
  NAMESPACE,
  OVERLOAD,
  OVERRIDE,
  PARAM,
  PRIVATE_REMARKS,
  PRIVATE,
  PROPERTY,
  PROVIDES_MODULE,
  REMARKS,
  RETURNS,
  SEE,
  SINCE,
  TEMPLATE,
  THROWS,
  TODO,
  TYPE,
  TYPE_PARAM,
  TYPEDEF,
  SATISFIES,
  VERSION,
  YIELDS,
  SPACE_TAG_DATA,
};

// --- Alias groups and helpers ---

type AliasGroup = {
  canonical: string;
  aliases: string[];
};

// The alias groups reflect official JSDoc synonyms
const ALIAS_GROUPS: Record<string, AliasGroup> = {
  abstract: { canonical: ABSTRACT, aliases: ["virtual"] },
  // Plugin canonical prefers "extends" over "augments"
  augments: { canonical: EXTENDS, aliases: [AUGMENTS] },
  class: { canonical: CLASS, aliases: ["constructor"] },
  constant: { canonical: CONSTANT, aliases: ["const"] },
  default: { canonical: DEFAULT, aliases: [DEFAULT_VALUE] },
  description: { canonical: DESCRIPTION, aliases: ["desc"] },
  emits: { canonical: FIRES, aliases: ["emits"] },
  external: { canonical: EXTERNAL, aliases: ["host"] },
  file: { canonical: FILE, aliases: ["fileoverview", "overview"] },
  function: { canonical: FUNCTION, aliases: ["func", "method"] },
  member: { canonical: MEMBER, aliases: ["var"] },
  param: { canonical: PARAM, aliases: ["arg", "argument", "params"] },
  property: { canonical: PROPERTY, aliases: ["prop"] },
  returns: { canonical: RETURNS, aliases: ["return"] },
  throws: { canonical: THROWS, aliases: ["exception"] },
  yields: { canonical: YIELDS, aliases: ["yield"] },
};

function getAliasGroupId(tag: string): string | undefined {
  const lower = tag.toLowerCase();
  for (const [groupId, { canonical, aliases }] of Object.entries(
    ALIAS_GROUPS,
  )) {
    if (lower === canonical || aliases.includes(lower)) return groupId;
  }
  return undefined;
}

function getGroupCanonical(groupId: string): string | undefined {
  return ALIAS_GROUPS[groupId]?.canonical;
}

function resolvePreferredTagForGroup(
  groupId: string,
  options: AllOptions,
): string {
  const pref = options.jsdocPreferredAliases as
    | Record<string, string>
    | undefined;
  const preferred = pref?.[groupId];
  if (preferred) return preferred;
  return getGroupCanonical(groupId) ?? groupId;
}

export { ALIAS_GROUPS, getAliasGroupId, getGroupCanonical, resolvePreferredTagForGroup };
