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

test("normalize mode", async () => {
  const input = `
/**
 * Desc
 * @return {Object} - Flat map of selected nodes.
 * @returns {Object} Flat map of selected nodes.
 */`;
  const result = await subject(input, { jsdocAliasTagsMode: "normalize" });
  expect(result).toMatchSnapshot();
});

test("preserve mode", async () => {
  const input = `
/**
 * Desc
 * @return {Object} - Flat map of selected nodes.
 * @returns {Object} Flat map of selected nodes.
 */`;
  const result = await subject(input, { jsdocAliasTagsMode: "preserve" });
  expect(result).toMatchSnapshot();
});

test("prefer mode with returns -> return", async () => {
  const input = `
/**
 * Desc
 * @return {Object} - Flat map of selected nodes.
 * @returns {Object} Flat map of selected nodes.
 */`;
  const result = await subject(input, {
    jsdocAliasTagsMode: "prefer",
    jsdocPreferredAliases: JSON.stringify({ returns: "return" }),
  });
  expect(result).toMatchSnapshot();
});

test("strict mode merge", async () => {
  const input = `
/**
 * Desc
 * @return {Object} - Flat map of selected nodes.
 * @returns {Object} Flat map of selected nodes.
 */`;
  const result = await subject(input, {
    jsdocAliasTagsMode: "strict",
    jsdocPreferredAliases: JSON.stringify({ returns: "return" }),
    jsdocAliasConflictStrategy: "merge",
  });
  expect(result).toMatchSnapshot();
});

test("strict mode first", async () => {
  const input = `
/**
 * Desc
 * @returns {Object} Flat map of selected nodes.
 * @return {Object} Another.
 */`;
  const result = await subject(input, {
    jsdocAliasTagsMode: "strict",
    jsdocPreferredAliases: JSON.stringify({ returns: "return" }),
    jsdocAliasConflictStrategy: "first",
  });
  expect(result).toMatchSnapshot();
});

test("class strict constructor", async () => {
  const input = `
/**
 * @class CLASS
 * @constructor CONSTRUCTOR
 */`;
  const result = await subject(input, {
    jsdocAliasTagsMode: "strict",
    jsdocPreferredAliases: JSON.stringify({ class: "constructor" }),
  });
  expect(result).toMatchSnapshot();
});

test("emits prefer fires", async () => {
  const input = `
/**
 * @emits Something
 */`;
  const result = await subject(input, {
    jsdocAliasTagsMode: "prefer",
    jsdocPreferredAliases: JSON.stringify({ emits: "fires" }),
  });
  expect(result).toMatchSnapshot();
});


