import test from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../src/chunking.js";

test("chunkText returns empty for blank input", () => {
  const result = chunkText("   \n  ");
  assert.equal(result.length, 0);
});

test("chunkText creates overlapping chunks", () => {
  const source = "a".repeat(1000);
  const result = chunkText(source, 300, 50);
  assert.ok(result.length > 1);
  assert.ok(result[0].length <= 300);
});
