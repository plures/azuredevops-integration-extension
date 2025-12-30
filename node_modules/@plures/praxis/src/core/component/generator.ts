/**
 * Praxis Component Generator
 *
 * Generates Svelte components from schema definitions.
 */

import type { ComponentDefinition, ModelDefinition } from '../schema/types.js';

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  /** Output directory */
  outputDir: string;
  /** Component framework */
  framework: 'svelte' | 'react' | 'vue';
  /** TypeScript support */
  typescript: boolean;
  /** Include tests */
  includeTests: boolean;
  /** Include documentation */
  includeDocs: boolean;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Success status */
  success: boolean;
  /** Generated files */
  files: GeneratedFile[];
  /** Generation errors */
  errors: GenerationError[];
}

/**
 * Generated file
 */
export interface GeneratedFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'component' | 'test' | 'docs' | 'types';
}

/**
 * Generation error
 */
export interface GenerationError {
  /** Error message */
  message: string;
  /** Component name */
  component?: string;
  /** Error code */
  code?: string;
}

/**
 * Component generator class
 */
export class ComponentGenerator {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate component from definition
   */
  generateComponent(component: ComponentDefinition, model?: ModelDefinition): GenerationResult {
    const files: GeneratedFile[] = [];
    const errors: GenerationError[] = [];

    try {
      // Generate main component file
      const componentFile = this.generateComponentFile(component, model);
      files.push(componentFile);

      // Generate TypeScript types if enabled
      if (this.config.typescript) {
        const typesFile = this.generateTypesFile(component, model);
        files.push(typesFile);
      }

      // Generate tests if enabled
      if (this.config.includeTests) {
        const testFile = this.generateTestFile(component);
        files.push(testFile);
      }

      // Generate docs if enabled
      if (this.config.includeDocs) {
        const docsFile = this.generateDocsFile(component);
        files.push(docsFile);
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        component: component.name,
      });
    }

    return {
      success: errors.length === 0,
      files,
      errors,
    };
  }

  /**
   * Generate component file
   */
  private generateComponentFile(
    component: ComponentDefinition,
    model?: ModelDefinition
  ): GeneratedFile {
    // Note: ext could be used for file naming in future versions
    // const ext = this.config.typescript ? 'ts' : 'js';
    const content = this.generateSvelteComponent(component, model);

    return {
      path: `${this.config.outputDir}/${component.name}.svelte`,
      content,
      type: 'component',
    };
  }

  /**
   * Generate Svelte component code
   */
  private generateSvelteComponent(component: ComponentDefinition, model?: ModelDefinition): string {
    const script = this.generateScript(component, model);
    const template = this.generateTemplate(component, model);
    const styles = this.generateStyles(component);

    return `<script${this.config.typescript ? ' lang="ts"' : ''}>
${script}
</script>

${template}

${styles ? `<style>\n${styles}\n</style>` : ''}`;
  }

  /**
   * Generate component script
   */
  private generateScript(
    component: ComponentDefinition,
    _model?: ModelDefinition // Prefix with _ to indicate intentionally unused
  ): string {
    const lines: string[] = [];

    // Import statements
    lines.push(`  import { createPraxisStore } from '@plures/praxis/svelte';`);
    lines.push('');

    // Props
    if (component.props && component.props.length > 0) {
      component.props.forEach((prop) => {
        const typeAnnotation = this.config.typescript ? `: ${prop.type}` : '';
        const defaultValue = prop.default !== undefined ? ` = ${JSON.stringify(prop.default)}` : '';
        lines.push(`  export let ${prop.name}${typeAnnotation}${defaultValue};`);
      });
      lines.push('');
    }

    // Component logic based on component type
    switch (component.type) {
      case 'form':
        lines.push('  // Form handling logic');
        lines.push('  import { createEventDispatcher } from "svelte";');
        lines.push('  const dispatch = createEventDispatcher();');
        lines.push('');
        lines.push('  function handleSubmit() {');
        lines.push('    dispatch("submit", data);');
        lines.push('  }');
        lines.push('');
        lines.push('  function handleReset() {');
        lines.push('    data = { ...initialData };');
        lines.push('  }');
        break;
      case 'list':
        lines.push('  // List handling logic');
        lines.push('  import { createEventDispatcher } from "svelte";');
        lines.push('  const dispatch = createEventDispatcher();');
        lines.push('');
        lines.push('  function handleSelect(item) {');
        lines.push('    dispatch("select", item);');
        lines.push('  }');
        lines.push('');
        lines.push('  function handleDelete(item) {');
        lines.push('    dispatch("delete", item);');
        lines.push('  }');
        break;
      case 'display':
        lines.push('  // Display component - reactive to data changes');
        lines.push('  $: formattedData = data ? JSON.stringify(data, null, 2) : "No data";');
        break;
      case 'navigation':
        lines.push('  // Navigation handling');
        lines.push('  import { createEventDispatcher } from "svelte";');
        lines.push('  const dispatch = createEventDispatcher();');
        lines.push('');
        lines.push('  function navigate(path) {');
        lines.push('    dispatch("navigate", { path });');
        lines.push('  }');
        break;
      default:
        lines.push('  // Component logic');
        lines.push('  $: console.log("Component data updated:", data);');
    }

    return lines.join('\n');
  }

  /**
   * Generate component template
   */
  private generateTemplate(component: ComponentDefinition, model?: ModelDefinition): string {
    switch (component.type) {
      case 'form':
        return this.generateFormTemplate(component, model);
      case 'display':
        return this.generateDisplayTemplate(component, model);
      case 'list':
        return this.generateListTemplate(component, model);
      case 'navigation':
        return this.generateNavigationTemplate(component);
      default:
        return `<div class="${component.name.toLowerCase()}">\n  <!-- ${component.description || component.name} -->\n  <p>Component: ${component.name}</p>\n</div>`;
    }
  }

  /**
   * Generate form template
   */
  private generateFormTemplate(component: ComponentDefinition, model?: ModelDefinition): string {
    const fields = model?.fields || [];
    const formFields = fields
      .map((field) => {
        return `  <label>\n    ${field.name}\n    <input type="text" bind:value={data.${field.name}} />\n  </label>`;
      })
      .join('\n');

    return `<form class="${component.name.toLowerCase()}">\n${formFields}\n  <button type="submit">Submit</button>\n</form>`;
  }

  /**
   * Generate display template
   */
  private generateDisplayTemplate(component: ComponentDefinition, model?: ModelDefinition): string {
    const fields = model?.fields || [];
    const displayFields = fields
      .map((field) => {
        return `  <div class="field">\n    <strong>${field.name}:</strong> {data.${field.name}}\n  </div>`;
      })
      .join('\n');

    return `<div class="${component.name.toLowerCase()}">\n${displayFields}\n</div>`;
  }

  /**
   * Generate list template
   */
  private generateListTemplate(
    component: ComponentDefinition,
    _model?: ModelDefinition // Prefix with _ to indicate intentionally unused
  ): string {
    return `<div class="${component.name.toLowerCase()}">\n  {#each items as item}\n    <div class="item">{item.name}</div>\n  {/each}\n</div>`;
  }

  /**
   * Generate navigation template
   */
  private generateNavigationTemplate(component: ComponentDefinition): string {
    return `<nav class="${component.name.toLowerCase()}">\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/about">About</a></li>\n  </ul>\n</nav>`;
  }

  /**
   * Generate component styles
   */
  private generateStyles(component: ComponentDefinition): string {
    if (!component.styling) {
      return '';
    }

    const lines: string[] = [];
    const styles = component.styling.styles || {};

    Object.entries(styles).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value};`);
    });

    return lines.length > 0 ? lines.join('\n') : '';
  }

  /**
   * Generate types file
   */
  private generateTypesFile(
    component: ComponentDefinition,
    model?: ModelDefinition
  ): GeneratedFile {
    const lines: string[] = [];

    // Component props type
    if (component.props && component.props.length > 0) {
      lines.push(`export interface ${component.name}Props {`);
      component.props.forEach((prop) => {
        const optional = prop.required ? '' : '?';
        lines.push(`  ${prop.name}${optional}: ${prop.type};`);
      });
      lines.push('}');
      lines.push('');
    }

    // Model type if available
    if (model) {
      lines.push(`export interface ${model.name} {`);
      model.fields.forEach((field) => {
        const optional = field.optional ? '?' : '';
        lines.push(`  ${field.name}${optional}: ${this.mapFieldType(field.type)};`);
      });
      lines.push('}');
    }

    return {
      path: `${this.config.outputDir}/${component.name}.types.ts`,
      content: lines.join('\n'),
      type: 'types',
    };
  }

  /**
   * Map field type to TypeScript type
   */
  private mapFieldType(type: any): string {
    if (typeof type === 'string') {
      switch (type) {
        case 'string':
          return 'string';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'date':
          return 'Date';
        case 'array':
          return 'unknown[]';
        case 'object':
          return 'Record<string, unknown>';
        default:
          return 'unknown';
      }
    }
    return 'unknown';
  }

  /**
   * Generate test file
   */
  private generateTestFile(component: ComponentDefinition): GeneratedFile {
    const content = `import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ${component.name} from './${component.name}.svelte';

describe('${component.name}', () => {
  it('renders correctly', () => {
    const { container } = render(${component.name});
    expect(container).toBeTruthy();
  });

  // TODO: Add more tests based on component behavior
});
`;

    return {
      path: `${this.config.outputDir}/${component.name}.test.ts`,
      content,
      type: 'test',
    };
  }

  /**
   * Generate documentation file
   */
  private generateDocsFile(component: ComponentDefinition): GeneratedFile {
    const lines: string[] = [];

    lines.push(`# ${component.name}`);
    lines.push('');
    if (component.description) {
      lines.push(component.description);
      lines.push('');
    }

    lines.push('## Props');
    lines.push('');
    if (component.props && component.props.length > 0) {
      component.props.forEach((prop) => {
        lines.push(
          `- \`${prop.name}\`: ${prop.type}${prop.required ? ' (required)' : ' (optional)'}`
        );
        if (prop.description) {
          lines.push(`  - ${prop.description}`);
        }
      });
    } else {
      lines.push('No props defined.');
    }

    lines.push('');
    lines.push('## Events');
    lines.push('');
    if (component.events && component.events.length > 0) {
      component.events.forEach((event) => {
        lines.push(`- \`${event.name}\`: ${event.payload || 'void'}`);
        if (event.description) {
          lines.push(`  - ${event.description}`);
        }
      });
    } else {
      lines.push('No events defined.');
    }

    return {
      path: `${this.config.outputDir}/${component.name}.md`,
      content: lines.join('\n'),
      type: 'docs',
    };
  }
}

/**
 * Create a component generator with default configuration
 */
export function createComponentGenerator(
  outputDir: string,
  options?: Partial<GeneratorConfig>
): ComponentGenerator {
  const config: GeneratorConfig = {
    outputDir,
    framework: 'svelte',
    typescript: true,
    includeTests: false,
    includeDocs: false,
    ...options,
  };

  return new ComponentGenerator(config);
}
