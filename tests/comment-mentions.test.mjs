import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url); const text = (path) => readFile(new URL(path, root), "utf8");
test("comment mentions resolve only organization teammates and send content-free alerts", async () => {
  const [route, component] = await Promise.all([text("app/api/comments/route.ts"), text("components/comment-thread.tsx")]);
  assert.match(route, /organization_members\?select=user_id,member_email&organization_id=eq/);
  assert.match(route, /requestedHandles/); assert.match(route, /comment_mention:/); assert.match(route, /sendWorkspaceEmailAlert/);
  assert.match(route, /Open Foremention to read the comment/); assert.doesNotMatch(route, /text: comment/);
  assert.match(component, /Mention a teammate/); assert.match(component, /mentionHandles/);
});
