/**
 * Module: src/fsm/functions/connection/connectionLabel.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
import type { ProjectConnection } from '../../machines/applicationMachine.js';

/**
 * Derive a human-friendly label for a connection.
 * Order of preference:
 * 1. Explicit connection.label (trimmed)
 * 2. Project name if present
 * 3. Fallback: organization/project composite
 */
export function getConnectionLabel(connection: ProjectConnection): string {
  if (connection.label && connection.label.trim()) return connection.label.trim();
  if (connection.project && connection.project.trim()) return connection.project.trim();
  return `${connection.organization}/${connection.project}`;
}
