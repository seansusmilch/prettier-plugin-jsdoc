import { format } from "prettier";
import { AllOptions } from "../src/types";

function subject(code: string, options: Partial<AllOptions> = {}) {
  return format(code, {
    parser: "babel",
    plugins: ["prettier-plugin-jsdoc"],
    jsdocSpaces: 1,
    ...options,
  } as AllOptions);
}

describe("jsdocTypeSeparator option", () => {
  describe("default (semicolon) - convert to semicolons", () => {
    test("should keep semicolons in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value'; nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input);
      expect(result).toMatchSnapshot();
    });

    test("should convert commas to semicolons in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value', nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input);
      expect(result).toMatchSnapshot();
    });

    test("should convert mixed separators to semicolons", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {first:'a'; second:'b', third:'c'; fourth:{nested:'d', also:'e'}}
         */
      `;
      const result = await subject(input);
      expect(result).toMatchSnapshot();
    });
  });

  describe("comma mode - convert all to commas", () => {
    test("should convert semicolons to commas in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value'; nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "comma" });
      expect(result).toMatchSnapshot();
    });

    test("should keep commas in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value', nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "comma" });
      expect(result).toMatchSnapshot();
    });

    test("should convert mixed separators to commas", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {first:'a'; second:'b', third:'c'; fourth:{nested:'d', also:'e'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "comma" });
      expect(result).toMatchSnapshot();
    });
  });

  describe("semicolon mode - convert all to semicolons", () => {
    test("should keep semicolons in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value'; nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });

    test("should convert commas to semicolons in @default object", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {object:'value', nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });

    test("should convert mixed separators to semicolons", async () => {
      const input = `
        /**
         * The summary
         *
         * @default {first:'a'; second:'b', third:'c'; fourth:{nested:'d', also:'e'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });
  });

  describe("works with @defaultValue tag", () => {
    test("comma mode with @defaultValue", async () => {
      const input = `
        /**
         * The summary
         *
         * @defaultValue {object:'value'; nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "comma" });
      expect(result).toMatchSnapshot();
    });

    test("semicolon mode with @defaultValue", async () => {
      const input = `
        /**
         * The summary
         *
         * @defaultValue {object:'value', nestingTest:{obj:'nested'}}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });
  });

  describe("should not affect non-object types", () => {
    test("should not affect @param types", async () => {
      const input = `
        /**
         * Function description
         *
         * @param {string|number} param1 First param
         * @param {Array<string>} param2 Second param
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });

    test("should not affect empty objects or arrays", async () => {
      const input = `
        /**
         * The summary
         *
         * @default []
         * @defaultValue {}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });
  });

  describe("React component type definitions", () => {
    test("should convert to semicolons with default mode", async () => {
      const input = `
        /**
         * Badge component to display various badges with icons and text.
         * @type {React.FC<{badges?: string[], showInfobox?: boolean,  infobox?: React.ReactNode}>}
         */
      `;
      const result = await subject(input);
      expect(result).toMatchSnapshot();
    });

    test("should convert to commas with comma mode", async () => {
      const input = `
        /**
         * Badge component to display various badges with icons and text.
         * @type {React.FC<{badges?: string[], showInfobox?: boolean,  infobox?: React.ReactNode}>}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "comma" });
      expect(result).toMatchSnapshot();
    });

    test("should convert to semicolons with explicit semicolon mode", async () => {
      const input = `
        /**
         * Badge component to display various badges with icons and text.
         * @type {React.FC<{badges?: string[], showInfobox?: boolean,  infobox?: React.ReactNode}>}
         */
      `;
      const result = await subject(input, { jsdocTypeSeparator: "semicolon" });
      expect(result).toMatchSnapshot();
    });
  });
});
