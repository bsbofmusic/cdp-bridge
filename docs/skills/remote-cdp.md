# ⚠️ Deprecated — Use @bsbofmusic/cdper-mcp

This skill has been superseded by `@bsbofmusic/cdper-mcp` v1.5+.

**Migration guide:**
- `cdp_fetch` → Use `cdp_open` + `cdp_snapshot`
- `cdp_interact` → Use `cdp_click` / `cdp_type` / `cdp_press`
- `cdp_batch_fetch` → Use multiple `cdp_open` + `cdp_snapshot` calls

See `skills/remote-cdp/SKILL.md` in the cdper repo for the updated skill.
