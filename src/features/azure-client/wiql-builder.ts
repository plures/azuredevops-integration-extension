/**
 * Module: src/features/azure-client/wiql-builder.ts
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
import type { WorkItemFilter } from './types.js';

export class WIQLBuilder {
  /**
   * Builds WIQL queries for different query types
   */
  buildWIQL(queryNameOrText: string): string {
    // Use capability cache to decide whether to include [System.StateCategory]
    const useStateCategory = true; // This would be determined by capability cache

    switch (queryNameOrText) {
      case 'My Activity': {
        const activeFilter = this._buildActiveFilter(useStateCategory);
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
                        ${activeFilter}
                        ORDER BY [System.ChangedDate] DESC`;
      }

      case 'Following': {
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND [System.AssignedTo] = @Me
                        ${this._buildActiveFilter(useStateCategory)}
                        ORDER BY [System.ChangedDate] DESC`;
      }

      case 'Mentioned': {
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND [System.AssignedTo] = @Me
                        AND [System.State] <> "Removed"
                        ORDER BY [System.ChangedDate] DESC`;
      }

      default: {
        // Treat as custom WIQL query
        return queryNameOrText;
      }
    }
  }

  /**
   * Builds search WIQL with filters
   */
  buildSearchWIQL(term: string, filter?: WorkItemFilter): string {
    if (!term?.trim()) return '';

    const safe = this._escapeWIQL(term.trim());
    const base = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                  FROM WorkItems
                  WHERE [System.TeamProject] = @project
                  AND ([System.Title] CONTAINS '${safe}' OR [System.Description] CONTAINS '${safe}')`;

    const clauses = this._buildFilterClauses(filter);

    return `${base} AND ${clauses.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;
  }

  private _buildFilterClauses(filter?: WorkItemFilter): string[] {
    const clauses: string[] = [];

    if (filter?.sprint && filter.sprint !== 'All') {
      clauses.push(this._getSprintClause(filter.sprint));
    }

    if (filter?.includeState) {
      clauses.push(`[System.State] = '${this._escapeWIQL(filter.includeState)}'`);
    }

    if (filter?.type && filter.type !== 'All') {
      clauses.push(`[System.WorkItemType] = '${this._escapeWIQL(filter.type)}'`);
    }

    if (filter?.assignedTo) {
      const clause = this._getAssignedToClause(filter.assignedTo);
      if (clause) clauses.push(clause);
    }

    if (clauses.length === 0) clauses.push('[System.State] <> "Removed"');

    return clauses;
  }

  private _getSprintClause(sprint: string): string {
    if (sprint === '@CurrentIteration') {
      return '[System.IterationPath] UNDER @CurrentIteration';
    }
    return `[System.IterationPath] UNDER '${this._escapeWIQL(sprint)}'`;
  }

  private _getAssignedToClause(assignedTo: string): string | null {
    if (assignedTo === 'Me') return '[System.AssignedTo] = @Me';
    if (assignedTo === 'Unassigned') return '[System.AssignedTo] = ""';
    return null;
  }

  private _buildActiveFilter(useStateCategory: boolean): string {
    if (useStateCategory) {
      return 'AND [System.StateCategory] <> "Completed"';
    }
    return 'AND [System.State] NOT IN ("Done", "Closed", "Resolved")';
  }

  private _escapeWIQL(value: string): string {
    return value.replace(/'/g, "''");
  }
}
