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

    const clauses: string[] = [];

    if (filter?.sprint && filter.sprint !== 'All') {
      if (filter.sprint === '@CurrentIteration') {
        clauses.push('[System.IterationPath] UNDER @CurrentIteration');
      } else {
        clauses.push(`[System.IterationPath] UNDER '${this._escapeWIQL(filter.sprint)}'`);
      }
    }

    if (filter?.includeState) {
      clauses.push(`[System.State] = '${this._escapeWIQL(filter.includeState)}'`);
    }

    if (filter?.type && filter.type !== 'All') {
      clauses.push(`[System.WorkItemType] = '${this._escapeWIQL(filter.type)}'`);
    }

    if (filter?.assignedTo === 'Me') clauses.push('[System.AssignedTo] = @Me');
    else if (filter?.assignedTo === 'Unassigned') clauses.push('[System.AssignedTo] = ""');

    if (clauses.length === 0) clauses.push('[System.State] <> "Removed"');

    return `${base} AND ${clauses.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;
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
