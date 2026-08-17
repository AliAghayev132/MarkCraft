// ── @lib ───────────────────────────────────────────────────────────────────
import { parseYaml, stringifyYaml } from '@lib/yaml'

// ── @shared ────────────────────────────────────────────────────────────────
import type { ToolOutcome } from '@shared'

/**
 * JSON and YAML, each way.
 *
 * Both directions go through a real parser rather than a translation of the
 * text: YAML's indentation rules and JSON's escaping do not survive being
 * rewritten by hand, and a converter that is right most of the time is worse
 * than none — it is trusted and then quietly wrong.
 */
export function jsonToYaml(text: string): ToolOutcome {
  try {
    return { ok: true, value: stringifyYaml(JSON.parse(text)) }
  } catch (error) {
    return { ok: false, reason: 'json', detail: error instanceof Error ? error.message : undefined }
  }
}

export function yamlToJson(text: string, indent = 2): ToolOutcome {
  try {
    return { ok: true, value: JSON.stringify(parseYaml(text), null, indent) }
  } catch (error) {
    return { ok: false, reason: 'yaml', detail: error instanceof Error ? error.message : undefined }
  }
}
