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

test("default: enforce one blank line between description and first tag", async () => {
  const input = `
/** Desc
 * @param {number} a A
 */
`;
  expect(await subject(input)).toMatchSnapshot();
});

test("disabled: no blank line between description and first tag", async () => {
  const input = `
/**
 * Desc
 * @param {number} a A
 */
`;
  expect(
    await subject(input, { jsdocSeparateDescriptionFromTags: false }),
  ).toMatchSnapshot();

  const input2 = `
  /**
   * 
   * @param {number} a A
   */
  `;
    expect(
      await subject(input2, { jsdocSeparateDescriptionFromTags: false }),
    ).toMatchSnapshot();
});

test("default: ensures one blank line even if input had none", async () => {
  const input = `
/**
 * Single line description
 * @returns {number} N
 */
`;
  expect(await subject(input)).toMatchSnapshot();
});
