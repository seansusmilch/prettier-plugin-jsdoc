import * as prettier from "prettier";
import { AllOptions } from "../src/types";

function subject(code: string, options: Partial<AllOptions> = {}) {
  return prettier.format(code, {
    parser: "babel",
    plugins: ["prettier-plugin-jsdoc"],
    jsdocSpaces: 1,
    ...options,
  } as AllOptions);
}

const duplicateAliasesBlock = `
/**
 * Desc
 * @return {number} first return.
 * @returns {number} second returns.
 * @class ClassTag
 * @constructor CtorTag
 * @emits EventA
 * @fires EventB
 * @augments Base1
 * @extends Base2
 * @yields {string} YieldA
 * @yield {string} YieldB
 */`;

const singleAliasesBlock = `
/**
 * Desc
 * @returns {number} Value.
 * @constructor CtorTag
 * @fires EventB
 * @extends Base2
 * @yields {string} YieldA
 */`;

describe("alias options matrix", () => {
  const modes: Array<NonNullable<AllOptions["jsdocAliasTagsMode"]>> = [
    "normalize",
    "preserve",
    "prefer",
    "strict",
  ];

  const conflictStrategies: Array<NonNullable<AllOptions["jsdocAliasConflictStrategy"]>> = [
    "merge",
    "first",
    "last",
    "error",
  ];

  const preferred = { returns: "return", class: "constructor", emits: "fires", augments: "extends", yields: "yield" } as const;
  const preferredJson = JSON.stringify(preferred);

  describe("modes without conflicts (single occurrences)", () => {
    test.each(modes)("mode %s with JSON preferredAliases", async (mode) => {
      const result = await subject(singleAliasesBlock, {
        jsdocAliasTagsMode: mode,
        jsdocPreferredAliases: preferredJson,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe("strict mode conflict strategies (duplicates present)", () => {
    test.each(conflictStrategies)("strategy %s with json preferredAliases", async (strategy) => {
      const result = await subject(duplicateAliasesBlock, {
        jsdocAliasTagsMode: "strict",
        jsdocPreferredAliases: preferredJson,
        jsdocAliasConflictStrategy: strategy,
      });
      expect(result).toMatchSnapshot();
    });

    test.each(conflictStrategies)("strategy %s without preferredAliases (fallback canonical)", async (strategy) => {
      const result = await subject(duplicateAliasesBlock, {
        jsdocAliasTagsMode: "strict",
        jsdocAliasConflictStrategy: strategy,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe("non-strict modes with duplicates should not resolve conflicts", () => {
    test.each(["normalize", "preserve", "prefer"] as const)("mode %s with duplicates", async (mode) => {
      const result = await subject(duplicateAliasesBlock, {
        jsdocAliasTagsMode: mode,
        jsdocPreferredAliases: preferredJson,
      });
      expect(result).toMatchSnapshot();
    });
  });
});


