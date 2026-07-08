# Quick Start — Add Claude Pipeline to a New Project

Follow these steps in order. ~15 minutes.

## 1. Copy the pipeline in

From your project root:

```bash
cp -r /path/to/claude-pipeline/.claude   ./.claude
cp -r /path/to/claude-pipeline/prompts   ./prompts
cp -r /path/to/claude-pipeline/templates ./templates
```

## 2. Make the hooks executable

```bash
chmod +x .claude/hooks/*.sh
```

## 3. Fill in your project facts

Open `.claude/CLAUDE.md` and complete the `PROJECT FACTS` block — this is the one file you **must** edit. At minimum set your commands:

```yaml
commands:
  install:   <e.g. npm install>
  build:     <e.g. npm run build>
  test:      <e.g. npm test>
  lint:      <e.g. npm run lint>
  format:    <e.g. npm run format>
  typecheck: <e.g. npm run typecheck>
```

## 4. Tell the hooks your commands

Copy the example and set your test/lint/format/typecheck commands so the hooks work:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

Then edit `.claude/settings.local.json` (this file is gitignored):

```json
{
  "env": {
    "CLAUDE_TEST_CMD": "npm test",
    "CLAUDE_LINT_CMD": "npm run lint",
    "CLAUDE_FORMAT_CMD": "npm run format",
    "CLAUDE_TYPECHECK_CMD": "npm run typecheck"
  }
}
```

## 5. (Optional) Turn off MCP servers you don't use

Edit `.claude/mcp/mcp.json` and remove any servers you don't need. Skip this if unsure — you can do it later.

## 6. Verify

```bash
python3 -m json.tool .claude/settings.json > /dev/null && echo "settings OK"
for h in .claude/hooks/*.sh; do bash -n "$h" && echo "ok: $h"; done
```

## 7. Start Claude Code

```bash
claude
```

Inside Claude Code, confirm everything loaded and try your first agent:

```
> /agents
> Use the code-reviewer agent to review the current diff.
```

That's it — you're running. To build a feature, just say:

```
> Use the product-manager agent to write a PRD for <your feature>.
```
