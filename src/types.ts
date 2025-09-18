import { ParserOptions } from "prettier";

export interface JsdocOptions {
  jsdocSpaces: number;
  jsdocPrintWidth?: number;
  jsdocDescriptionWithDot: boolean;
  jsdocDescriptionTag: boolean;
  /**
   * When false, preserve author-authored description text as-is for both block and per-tag descriptions.
   * Disables capitalization, trailing dot insertion, wrapping, markdown tweaks, and default-note injection.
   * Example code blocks (@example) are unaffected.
   * @default true
   */
  jsdocFormatDescriptions: boolean;
  /**
   * When true, enforce exactly one blank line between description and first tag.
   * When false (default), preserve whether a blank line exists, but collapse 2+ to one.
   */
  jsdocSeparateDescriptionFromTags: boolean;
  jsdocVerticalAlignment: boolean;
  jsdocKeepUnParseAbleExampleIndent: boolean;
  /**
   * @deprecated use jsdocCommentLineStrategy instead
   * @default true
   */
  jsdocSingleLineComment: boolean;
  /** @default "singleLine" */
  jsdocCommentLineStrategy: "singleLine" | "multiline" | "keep";
  jsdocSeparateReturnsFromParam: boolean;
  jsdocSeparateTagGroups: boolean;
  jsdocAddDefaultToDescription: boolean;
  jsdocCapitalizeDescription: boolean;
  jsdocPreferCodeFences: boolean;
  tsdoc: boolean;
  jsdocLineWrappingStyle: "greedy";
  jsdocTagsOrder?: Record<string, number>;
  /** Controls alias tag transformation strategy */
  jsdocAliasTagsMode?: "normalize" | "preserve" | "prefer" | "strict";
  /** Preferred alias per alias group (JSON string accepted in config, parsed at runtime) */
  jsdocPreferredAliases?: Record<string, string> | string | undefined;
  /** Strategy when conflicting alias duplicates exist */
  jsdocAliasConflictStrategy?: "merge" | "first" | "last" | "error";
}

export interface AllOptions extends ParserOptions, JsdocOptions {}

type LocationDetails = { line: number; column: number };
type Location = { start: LocationDetails; end: LocationDetails };

export type PrettierComment = {
  type: "CommentBlock" | "Block";
  value: string;
  start: number;
  end: number;
  loc: Location;
};

export type Token = {
  type:
    | "CommentBlock"
    | "Block"
    | {
        label: string; // "function" | "name";
        keyword?: string;
        beforeExpr: boolean;
        startsExpr: boolean;
        rightAssociative: boolean;
        isLoop: boolean;
        isAssign: boolean;
        prefix: boolean;
        postfix: boolean;
        binop: null;
      };
  value: string;
  start: number;
  end: number;
  loc: Location;
};

export type AST = {
  start: number;
  end: number;
  loc: Location;
  errors: [];
  program: {
    type: "Program";
    start: number;
    end: number;
    loc: [];
    sourceType: "module";
    interpreter: null;
    body: [];
    directives: [];
  };
  comments: PrettierComment[];
  tokens: Token[];
};
