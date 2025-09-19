# AI Workflow Template for Azure DevOps (MCP)

This document explains the embedded instruction template that helps AI assistants (like GitHub Copilot Chat via MCP) understand your Azure DevOps work items, ask minimal questions, suggest new items when needed, and log progress/time.

## How to generate your personalized prompt

- Command Palette: "Azure DevOps Integration: Generate AI Workflow Prompt"
- The extension will:
  - Collect your most recent assigned work items and their parent/child context
  - Produce a tailored instruction prompt
  - Copy it to your clipboard and open it in a new editor tab
- Paste the prompt into your AI tool of choice. With MCP wired up, the AI can call server methods directly.

## What the prompt includes

- Behaviour contract for minimal questions and hierarchy awareness (Epic → Feature → User Story → Task)
- Time tracking guidance using the addTimeEntry mutation
- Out-of-scope detection and creation of new linked work items
- Rolling summary guidance and comment suggestions
- MCP methods cheat sheet and patch examples

## MCP Methods exposed by this extension

- listWorkItems({ query? })
- getWorkItem({ id })
- getWorkItemRelations({ id })
- getWorkItemGraph({ id, depthUp?, depthDown? })
- search({ term })
- filter({ sprint?, type?, includeState?, excludeStates?, assignedTo? })
- createWorkItem({ type, title, description?, assignedTo? })
- createLinkedWorkItem({ parentId, type, title, description?, assignedTo? })
- updateWorkItem({ workItemId, patch })
- addComment({ workItemId, text })
- addTimeEntry({ workItemId, hours, note? })
- getWorkItemTypes()
- getWorkItemTypeStates({ type })

## Tips

- Configure your Team in settings so Current Sprint queries resolve correctly.
- Use the built-in timer as usual; the AI prompt is additive and can coordinate comments/time logging.
- If the MCP server environment variables are missing (AZDO_ORG, AZDO_PROJECT, AZDO_PAT), methods will fail; run the extension's Setup Connection first.

---

If you'd like this template expanded with company-specific conventions or custom fields, open an issue or PR with your requirements.
