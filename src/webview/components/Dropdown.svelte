<script lang="ts">
  interface Props {
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    placeholder?: string;
    class?: string;
  }

  const { value, options, onChange, placeholder, class: className = '' }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | null = $state(null);
  let buttonRef: HTMLButtonElement | null = $state(null);

  const selectedOption = $derived(
    options.find((opt) => opt.value === value) || options[0] || { value: '', label: placeholder || 'Select...' }
  );

  function toggle() {
    isOpen = !isOpen;
  }

  function select(optionValue: string) {
    onChange(optionValue);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
      buttonRef?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      let nextIndex = currentIndex;
      
      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      }
      
      if (nextIndex >= 0 && nextIndex < options.length) {
        select(options[nextIndex].value);
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

<div class="custom-dropdown {className}" bind:this={dropdownRef} data-custom-dropdown="true">
  <button
    type="button"
    class="dropdown-button"
    bind:this={buttonRef}
    onclick={toggle}
    onkeydown={handleKeydown}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <span class="dropdown-label">{selectedOption.label}</span>
    <span class="dropdown-arrow" class:open={isOpen}>▼</span>
  </button>
  {#if isOpen}
    <div class="dropdown-menu" role="listbox">
      {#each options as option (option.value)}
        <button
          type="button"
          class="dropdown-option"
          class:selected={option.value === value}
          onclick={() => select(option.value)}
          role="option"
          aria-selected={option.value === value}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.4rem 0.6rem;
    background: var(--vscode-input-background) !important;
    color: var(--vscode-input-foreground) !important;
    border: 1px solid var(--vscode-input-border) !important;
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .dropdown-button:hover {
    border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-focusBorder));
  }

  .dropdown-button:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
  }

  .dropdown-label {
    flex: 1;
    text-align: left;
  }

  .dropdown-arrow {
    margin-left: 0.5rem;
    font-size: 0.7rem;
    transition: transform 0.15s ease;
    color: var(--vscode-descriptionForeground);
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    margin-top: 0.25rem;
    background: var(--vscode-dropdown-background, var(--vscode-input-background)) !important;
    border: 1px solid var(--vscode-dropdown-border, var(--vscode-input-border)) !important;
    border-radius: 3px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-height: 200px;
    overflow-y: auto;
    min-width: 100%;
  }

  .dropdown-option {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: var(--vscode-dropdown-background, var(--vscode-input-background)) !important;
    color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground)) !important;
    border: none;
    text-align: left;
    font-size: 0.85rem;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .dropdown-option:hover {
    background: var(--vscode-list-hoverBackground) !important;
    color: var(--vscode-list-hoverForeground) !important;
  }

  .dropdown-option.selected {
    background: var(--vscode-list-activeSelectionBackground) !important;
    color: var(--vscode-list-activeSelectionForeground) !important;
  }

  .dropdown-option:focus {
    outline: none;
    background: var(--vscode-list-focusBackground, var(--vscode-list-hoverBackground));
    color: var(--vscode-list-focusForeground, var(--vscode-list-hoverForeground));
  }
</style>

