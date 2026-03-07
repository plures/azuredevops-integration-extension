# UI Component Mapping Matrix – Design-Dojo Migration

This document maps every extension UI surface to its design-dojo equivalent,
tracks the migration status, and lists remaining component gaps.

## Status Legend

| Symbol | Meaning               |
| ------ | --------------------- |
| ✅     | Migrated              |
| 🔄     | Partially migrated    |
| ❌     | Not yet migrated      |
| 🆕     | New component needed  |

---

## Extension Webview – Component Mapping

| Extension UI Surface                        | design-dojo Component       | Status |
| ------------------------------------------- | --------------------------- | ------ |
| Header action buttons (refresh, etc.)       | `IconButton`                | ✅     |
| Connection tab bar                          | `TabBar`                    | ✅     |
| Error/validation banners                    | `Alert`                     | ✅     |
| Empty work-item list state                  | `EmptyState`                | ✅     |
| Toast / status notifications                | `Toast`                     | ✅     |
| Work item state labels (New, Active…)       | `WorkItemStateBadge`        | ✅     |
| Work item priority labels (P1–P4)           | `PriorityBadge`             | ✅     |
| Auth reminder banner                        | design tokens (in-progress) | 🔄     |
| Work item list rows                         | raw HTML + design tokens    | 🔄     |
| Kanban board columns                        | raw HTML + design tokens    | 🔄     |
| Query / filter dropdowns                    | `Dropdown` (existing)       | ❌     |
| Settings form                               | raw HTML + design tokens    | ❌     |
| Stop-timer dialog                           | raw HTML + design tokens    | ❌     |
| Compose-comment dialog                      | raw HTML + design tokens    | ❌     |
| Debug / history timeline                    | raw HTML                    | ❌     |
| Performance dashboard                       | raw HTML                    | ❌     |

---

## Design-Dojo Component Status

### Core Components (`packages/ui-web/src/components/`)

| Component            | File                         | Status | Accessibility |
| -------------------- | ---------------------------- | ------ | ------------- |
| `Button`             | `Button.svelte`              | ✅     | ✅ focus-visible, aria-label, aria-pressed, aria-busy |
| `IconButton`         | `IconButton.svelte`          | ✅     | ✅ aria-label required, aria-pressed |
| `Badge`              | `Badge.svelte`               | ✅     | ✅ inline, no interaction |
| `Alert`              | `Alert.svelte`               | ✅     | ✅ role=alert, focus-visible |
| `EmptyState`         | `EmptyState.svelte`          | ✅     | ✅ role=status |
| `Toast`              | `Toast.svelte`               | ✅     | ✅ role=alert, aria-live=polite |
| `TabBar`             | `TabBar.svelte`              | ✅     | ✅ role=tablist/tab, keyboard nav (Arrow, Home, End) |

### ADO-Specific Components

| Component              | File                           | Status | Notes                                    |
| ---------------------- | ------------------------------ | ------ | ---------------------------------------- |
| `WorkItemStateBadge`   | `WorkItemStateBadge.svelte`    | ✅     | Maps ADO state names to semantic colours |
| `PriorityBadge`        | `PriorityBadge.svelte`         | ✅     | P1–P4, truncation-safe label             |

---

## Component Gaps – Identified Issues

The following components are needed for full ADO workflow coverage but are not yet
implemented. Each should be added to `packages/ui-web/src/components/` first.

| Component Gap          | Description                                               | Priority |
| ---------------------- | --------------------------------------------------------- | -------- |
| `WorkItemCard`         | Compact card for list and kanban; wraps badges + actions  | High     |
| `TimerButton`          | Start / stop / pause timer; animated indicator            | High     |
| `PRStatusCard`         | PR status (draft, review, approved, merged, abandoned)    | High     |
| `BranchWorkflowPanel`  | Linked branch + create-branch action panel                | Medium   |
| `TimelineWidget`       | Ordered event timeline for work item history              | Medium   |
| `Dropdown`             | Accessible single/multi-select dropdown                   | Medium   |
| `Dialog`               | Modal dialog with focus-trap and close-on-Escape          | Medium   |
| `FormField`            | Labelled form control wrapper with validation state       | Low      |
| `SkeletonLoader`       | Placeholder rows while data is loading                    | Low      |

---

## Design Tokens

Design tokens are defined in `packages/ui-web/src/tokens.css` and cover:

- **Colour** – surface, foreground, border, interactive, semantic (success/warning/danger/info)
- **ADO semantic** – work-item state colours, type colours, priority colours
- **Spacing** – `--space-1` … `--space-8` (0.25rem steps)
- **Border radius** – `--radius-sm/md/lg/xl/pill`
- **Typography** – `--text-font-family`, `--text-size-xs/sm/md/base`
- **Shadow** – `--shadow-sm/md/focus`
- **Motion** – `--motion-speed-fast/normal/slow`, `--motion-easing`

All tokens bridge to VS Code CSS variables so they automatically respect the active theme.

---

## Accessibility Checklist

- [x] All interactive elements have `aria-label` or visible label
- [x] `role=tablist/tab` with `aria-selected` on `TabBar`
- [x] `role=alert` on `Alert` and `Toast`
- [x] `role=status` on `EmptyState`
- [x] Keyboard navigation: Arrow keys, Home, End for `TabBar`
- [x] `focus-visible` outline using `--color-border-focus` on all interactive elements
- [x] Disabled state (`aria-disabled` / `disabled`) on `Button` and `IconButton`
- [ ] Focus-trap in dialog (pending `Dialog` component)
- [ ] Sufficient colour contrast verified against WCAG 2.1 AA (pending visual regression pass)

---

## Migration Guide

### Importing design-dojo components

```svelte
<script lang="ts">
  import Button from '@ado-ext/ui-web/components/Button.svelte';
  import Alert from '@ado-ext/ui-web/components/Alert.svelte';
  import TabBar from '@ado-ext/ui-web/components/TabBar.svelte';
</script>
```

### Importing design tokens (once per app entry)

```ts
import '@ado-ext/ui-web/tokens.css';
```

### Using design tokens in Svelte `<style>` blocks

```css
.my-element {
  background: var(--color-surface-raised);
  color: var(--color-text-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-size-sm);
  transition: background var(--motion-speed-normal) var(--motion-easing);
}
```

### Replacing bespoke VS Code CSS variables

| Old (bespoke)                                 | New (design token)                  |
| --------------------------------------------- | ----------------------------------- |
| `var(--vscode-foreground)`                    | `var(--color-text-default)`         |
| `var(--vscode-descriptionForeground)`         | `var(--color-text-subtle)`          |
| `var(--vscode-errorForeground)`               | `var(--color-danger-fg)`            |
| `var(--vscode-inputValidation-errorBackground)` | `var(--color-danger-bg)`          |
| `var(--vscode-inputValidation-errorBorder)`   | `var(--color-danger-border)`        |
| `var(--vscode-button-background)`             | `var(--color-action-primary-bg)`    |
| `var(--vscode-button-hoverBackground)`        | `var(--color-action-primary-hover-bg)` |
| `var(--vscode-toolbar-hoverBackground)`       | `var(--color-action-ghost-hover-bg)` |
| `var(--vscode-panel-border)`                  | `var(--color-border-strong)`        |
| `var(--vscode-widget-border)`                 | `var(--color-border-default)`       |
| `var(--vscode-tab-activeBackground)`          | `var(--color-tab-active-bg)`        |
| `var(--vscode-focusBorder)`                   | `var(--color-border-focus)`         |
| `var(--vscode-statusBar-background)`          | `var(--color-statusbar-bg)`         |
| `border-radius: 4px`                          | `var(--radius-md)`                  |
| `gap: 0.5rem`                                 | `var(--space-2)`                    |
| `font-size: 0.75rem`                          | `var(--text-size-sm)`               |
| `transition: ... 0.15s ease`                  | `var(--motion-speed-normal) var(--motion-easing)` |
