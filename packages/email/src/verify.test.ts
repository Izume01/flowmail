import { expect, test } from "bun:test";
import * as React from "react";
import { renderTemplate } from "./index";
import { BaseTemplate } from "./templates/BaseTemplate";

test("renders BaseTemplate to HTML", async () => {
  const html = await renderTemplate(
    React.createElement(BaseTemplate, {
      heading: "Test Heading",
      content: "Test Content",
    })
  );
  
  expect(html).toContain("<!DOCTYPE html");
  expect(html).toContain("Test Heading");
  expect(html).toContain("Test Content");
  expect(html).toContain("FlowMail");
});
