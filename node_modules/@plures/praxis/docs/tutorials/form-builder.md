# Form Builder Tutorial

This tutorial walks you through building a dynamic form builder application. You'll learn advanced schema composition, component generation, and complex logic flows.

**Time:** 40-50 minutes  
**Level:** Intermediate  
**Prerequisites:** Completed [Todo with PluresDB](./todo-pluresdb.md)

## What You'll Build

A form builder that allows users to:

- Create new forms with a name and description
- Add various field types (text, number, select, checkbox, etc.)
- Configure field properties (label, required, validation)
- Reorder fields via drag-and-drop
- Preview the form as end-users would see it
- Collect form submissions

## Step 1: Project Setup

```bash
mkdir praxis-form-builder
cd praxis-form-builder
npm init -y
npm install @plures/praxis
npm install -D typescript vitest
```

## Step 2: Understand the Schema

The form builder schema is available at `examples/form-builder/schema.psf.json`. Let's break down its key parts:

### Models

```json
{
  "models": [
    {
      "name": "Form",
      "fields": [
        { "name": "id", "type": "uuid" },
        { "name": "name", "type": "string" },
        { "name": "fields", "type": { "array": { "reference": "FormField" } } }
      ]
    },
    {
      "name": "FormField",
      "fields": [
        { "name": "id", "type": "string" },
        { "name": "type", "type": { "enum": ["text", "number", "email", "select", "checkbox"] } },
        { "name": "label", "type": "string" },
        { "name": "required", "type": "boolean" },
        { "name": "order", "type": "number" }
      ]
    }
  ]
}
```

### Events

```json
{
  "events": [
    { "tag": "CreateForm", "payload": { "name": "string" } },
    {
      "tag": "AddField",
      "payload": { "formId": "string", "fieldType": "string", "label": "string" }
    },
    {
      "tag": "UpdateField",
      "payload": { "fieldId": "string", "label": "string", "required": "boolean" }
    },
    { "tag": "ReorderFields", "payload": { "formId": "string", "fieldOrder": "string[]" } },
    { "tag": "SubmitForm", "payload": { "formId": "string", "data": "object" } }
  ]
}
```

## Step 3: Create the Engine

Create `src/engine.ts`:

```typescript
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
} from '@plures/praxis';

// Types
interface Form {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
}

interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: Date;
}

interface FormBuilderContext {
  forms: Form[];
  submissions: FormSubmission[];
  activeFormId: string | null;
  selectedFieldId: string | null;
}

// Facts
export const FormCreated = defineFact<'FormCreated', { formId: string; name: string }>(
  'FormCreated'
);
export const FieldAdded = defineFact<
  'FieldAdded',
  { formId: string; fieldId: string; fieldType: string }
>('FieldAdded');
export const FieldRemoved = defineFact<'FieldRemoved', { formId: string; fieldId: string }>(
  'FieldRemoved'
);
export const FieldUpdated = defineFact<'FieldUpdated', { fieldId: string }>('FieldUpdated');
export const FormSubmitted = defineFact<'FormSubmitted', { formId: string; submissionId: string }>(
  'FormSubmitted'
);
export const ValidationFailed = defineFact<
  'ValidationFailed',
  { formId: string; errors: Array<{ fieldId: string; message: string }> }
>('ValidationFailed');

// Events
export const CREATE_FORM = defineEvent<'CREATE_FORM', { name: string; description?: string }>(
  'CREATE_FORM'
);
export const ADD_FIELD = defineEvent<
  'ADD_FIELD',
  { formId: string; fieldType: string; label: string; required?: boolean }
>('ADD_FIELD');
export const REMOVE_FIELD = defineEvent<'REMOVE_FIELD', { formId: string; fieldId: string }>(
  'REMOVE_FIELD'
);
export const UPDATE_FIELD = defineEvent<
  'UPDATE_FIELD',
  { fieldId: string; updates: Partial<FormField> }
>('UPDATE_FIELD');
export const REORDER_FIELDS = defineEvent<
  'REORDER_FIELDS',
  { formId: string; fieldOrder: string[] }
>('REORDER_FIELDS');
export const SUBMIT_FORM = defineEvent<
  'SUBMIT_FORM',
  { formId: string; data: Record<string, any> }
>('SUBMIT_FORM');
export const SELECT_FORM = defineEvent<'SELECT_FORM', { formId: string }>('SELECT_FORM');
export const SELECT_FIELD = defineEvent<'SELECT_FIELD', { fieldId: string | null }>('SELECT_FIELD');

// Rules
const createFormRule = defineRule<FormBuilderContext>({
  id: 'form.create',
  description: 'Create a new form',
  impl: (state, events) => {
    const event = events.find(CREATE_FORM.is);
    if (!event) return [];

    const now = new Date();
    const formId = `form_${Date.now().toString(36)}`;

    const form: Form = {
      id: formId,
      name: event.payload.name,
      description: event.payload.description,
      fields: [],
      createdAt: now,
      updatedAt: now,
    };

    state.context.forms.push(form);
    state.context.activeFormId = formId;

    return [FormCreated.create({ formId, name: event.payload.name })];
  },
});

const addFieldRule = defineRule<FormBuilderContext>({
  id: 'form.addField',
  description: 'Add a field to a form',
  impl: (state, events) => {
    const event = events.find(ADD_FIELD.is);
    if (!event) return [];

    const form = state.context.forms.find((f) => f.id === event.payload.formId);
    if (!form) return [];

    const fieldId = `field_${Date.now().toString(36)}`;
    const field: FormField = {
      id: fieldId,
      type: event.payload.fieldType as FormField['type'],
      label: event.payload.label,
      required: event.payload.required ?? false,
      order: form.fields.length,
    };

    form.fields.push(field);
    form.updatedAt = new Date();
    state.context.selectedFieldId = fieldId;

    return [
      FieldAdded.create({
        formId: event.payload.formId,
        fieldId,
        fieldType: event.payload.fieldType,
      }),
    ];
  },
});

const removeFieldRule = defineRule<FormBuilderContext>({
  id: 'form.removeField',
  description: 'Remove a field from a form',
  impl: (state, events) => {
    const event = events.find(REMOVE_FIELD.is);
    if (!event) return [];

    const form = state.context.forms.find((f) => f.id === event.payload.formId);
    if (!form) return [];

    form.fields = form.fields.filter((f) => f.id !== event.payload.fieldId);
    form.updatedAt = new Date();

    // Reorder remaining fields
    form.fields.forEach((field, index) => {
      field.order = index;
    });

    if (state.context.selectedFieldId === event.payload.fieldId) {
      state.context.selectedFieldId = null;
    }

    return [FieldRemoved.create({ formId: event.payload.formId, fieldId: event.payload.fieldId })];
  },
});

const updateFieldRule = defineRule<FormBuilderContext>({
  id: 'form.updateField',
  description: 'Update field configuration',
  impl: (state, events) => {
    const event = events.find(UPDATE_FIELD.is);
    if (!event) return [];

    for (const form of state.context.forms) {
      const field = form.fields.find((f) => f.id === event.payload.fieldId);
      if (field) {
        Object.assign(field, event.payload.updates);
        form.updatedAt = new Date();
        return [FieldUpdated.create({ fieldId: event.payload.fieldId })];
      }
    }

    return [];
  },
});

const reorderFieldsRule = defineRule<FormBuilderContext>({
  id: 'form.reorderFields',
  description: 'Reorder fields in a form',
  impl: (state, events) => {
    const event = events.find(REORDER_FIELDS.is);
    if (!event) return [];

    const form = state.context.forms.find((f) => f.id === event.payload.formId);
    if (!form) return [];

    // Create a map of field id to field
    const fieldMap = new Map(form.fields.map((f) => [f.id, f]));

    // Reorder based on new order
    form.fields = event.payload.fieldOrder
      .map((id, index) => {
        const field = fieldMap.get(id);
        if (field) {
          field.order = index;
          return field;
        }
        return null;
      })
      .filter((f): f is FormField => f !== null);

    form.updatedAt = new Date();

    return [];
  },
});

const submitFormRule = defineRule<FormBuilderContext>({
  id: 'form.submit',
  description: 'Handle form submission with validation',
  impl: (state, events) => {
    const event = events.find(SUBMIT_FORM.is);
    if (!event) return [];

    const form = state.context.forms.find((f) => f.id === event.payload.formId);
    if (!form) return [];

    // Validate required fields
    const errors: Array<{ fieldId: string; message: string }> = [];

    for (const field of form.fields) {
      if (field.required) {
        const value = event.payload.data[field.id];
        if (value === undefined || value === null || value === '') {
          errors.push({ fieldId: field.id, message: `${field.label} is required` });
        }
      }

      // Type-specific validation
      if (field.type === 'email' && event.payload.data[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(event.payload.data[field.id])) {
          errors.push({ fieldId: field.id, message: 'Invalid email address' });
        }
      }

      if (field.type === 'number' && event.payload.data[field.id]) {
        if (isNaN(Number(event.payload.data[field.id]))) {
          errors.push({ fieldId: field.id, message: 'Must be a number' });
        }
      }
    }

    if (errors.length > 0) {
      return [ValidationFailed.create({ formId: event.payload.formId, errors })];
    }

    // Create submission
    const submissionId = `sub_${Date.now().toString(36)}`;
    const submission: FormSubmission = {
      id: submissionId,
      formId: event.payload.formId,
      data: event.payload.data,
      submittedAt: new Date(),
    };

    state.context.submissions.push(submission);

    return [FormSubmitted.create({ formId: event.payload.formId, submissionId })];
  },
});

const selectFormRule = defineRule<FormBuilderContext>({
  id: 'form.select',
  description: 'Select a form for editing',
  impl: (state, events) => {
    const event = events.find(SELECT_FORM.is);
    if (!event) return [];

    state.context.activeFormId = event.payload.formId;
    state.context.selectedFieldId = null;

    return [];
  },
});

const selectFieldRule = defineRule<FormBuilderContext>({
  id: 'field.select',
  description: 'Select a field for editing',
  impl: (state, events) => {
    const event = events.find(SELECT_FIELD.is);
    if (!event) return [];

    state.context.selectedFieldId = event.payload.fieldId;

    return [];
  },
});

// Constraints
const uniqueFieldIdsConstraint = defineConstraint<FormBuilderContext>({
  id: 'form.uniqueFieldIds',
  description: 'All field IDs must be unique within a form',
  check: (state) => {
    for (const form of state.context.forms) {
      const ids = form.fields.map((f) => f.id);
      if (ids.length !== new Set(ids).size) {
        return false;
      }
    }
    return true;
  },
  errorMessage: 'Duplicate field IDs detected',
  severity: 'error',
});

const maxFieldsConstraint = defineConstraint<FormBuilderContext>({
  id: 'form.maxFields',
  description: 'Form cannot have more than 50 fields',
  check: (state) => {
    return state.context.forms.every((form) => form.fields.length <= 50);
  },
  errorMessage: 'Form cannot have more than 50 fields',
  severity: 'error',
});

// Registry
const registry = new PraxisRegistry<FormBuilderContext>();
registry.registerRule(createFormRule);
registry.registerRule(addFieldRule);
registry.registerRule(removeFieldRule);
registry.registerRule(updateFieldRule);
registry.registerRule(reorderFieldsRule);
registry.registerRule(submitFormRule);
registry.registerRule(selectFormRule);
registry.registerRule(selectFieldRule);
registry.registerConstraint(uniqueFieldIdsConstraint);
registry.registerConstraint(maxFieldsConstraint);

// Engine factory
export function createFormBuilderEngine() {
  return createPraxisEngine({
    initialContext: {
      forms: [],
      submissions: [],
      activeFormId: null,
      selectedFieldId: null,
    },
    registry,
    enableHistory: true,
    maxHistorySize: 50,
  });
}

// Helper functions
export function getActiveForm(context: FormBuilderContext): Form | null {
  if (!context.activeFormId) return null;
  return context.forms.find((f) => f.id === context.activeFormId) || null;
}

export function getSelectedField(context: FormBuilderContext): FormField | null {
  if (!context.selectedFieldId) return null;
  for (const form of context.forms) {
    const field = form.fields.find((f) => f.id === context.selectedFieldId);
    if (field) return field;
  }
  return null;
}
```

## Step 4: Create the Main Application

Create `src/main.ts`:

```typescript
import {
  createFormBuilderEngine,
  CREATE_FORM,
  ADD_FIELD,
  UPDATE_FIELD,
  SUBMIT_FORM,
  getActiveForm,
} from './engine';

async function main() {
  console.log('🛠️  Form Builder Demo\n');

  const engine = createFormBuilderEngine();

  // Create a contact form
  console.log('Creating contact form...');
  engine.dispatch([
    CREATE_FORM.create({
      name: 'Contact Form',
      description: 'Get in touch with us',
    }),
  ]);

  const form = getActiveForm(engine.getContext());
  if (!form) throw new Error('Form not created');

  console.log(`✅ Created form: ${form.name}\n`);

  // Add fields
  console.log('Adding fields...');

  engine.dispatch([
    ADD_FIELD.create({
      formId: form.id,
      fieldType: 'text',
      label: 'Full Name',
      required: true,
    }),
  ]);

  engine.dispatch([
    ADD_FIELD.create({
      formId: form.id,
      fieldType: 'email',
      label: 'Email Address',
      required: true,
    }),
  ]);

  engine.dispatch([
    ADD_FIELD.create({
      formId: form.id,
      fieldType: 'select',
      label: 'Subject',
      required: true,
    }),
  ]);

  engine.dispatch([
    ADD_FIELD.create({
      formId: form.id,
      fieldType: 'textarea',
      label: 'Message',
      required: true,
    }),
  ]);

  // Update the select field with options
  const updatedForm = getActiveForm(engine.getContext())!;
  const subjectField = updatedForm.fields.find((f) => f.label === 'Subject');
  if (subjectField) {
    engine.dispatch([
      UPDATE_FIELD.create({
        fieldId: subjectField.id,
        updates: {
          options: ['General Inquiry', 'Support', 'Feedback', 'Other'],
          placeholder: 'Select a subject',
        },
      }),
    ]);
  }

  // Display form structure
  const finalForm = getActiveForm(engine.getContext())!;
  console.log('\n📋 Form Structure:');
  console.log('─'.repeat(50));
  console.log(`Name: ${finalForm.name}`);
  console.log(`Description: ${finalForm.description || 'N/A'}`);
  console.log(`Fields: ${finalForm.fields.length}`);
  console.log('');

  finalForm.fields.forEach((field, i) => {
    const required = field.required ? '*' : '';
    console.log(`  ${i + 1}. [${field.type}] ${field.label}${required}`);
    if (field.options) {
      console.log(`      Options: ${field.options.join(', ')}`);
    }
  });
  console.log('─'.repeat(50));

  // Test form submission - with validation error
  console.log('\n📝 Testing form submission (incomplete data)...');
  const result1 = engine.step([
    SUBMIT_FORM.create({
      formId: form.id,
      data: {
        [finalForm.fields[0].id]: 'John Doe',
        // Missing email, subject, message
      },
    }),
  ]);

  const validationFailed = result1.state.facts.find((f) => f.tag === 'ValidationFailed');
  if (validationFailed) {
    console.log('❌ Validation failed:');
    (validationFailed.payload as any).errors.forEach((err: any) => {
      console.log(`   - ${err.message}`);
    });
  }

  // Test form submission - successful
  console.log('\n📝 Testing form submission (complete data)...');
  const result2 = engine.step([
    SUBMIT_FORM.create({
      formId: form.id,
      data: {
        [finalForm.fields[0].id]: 'John Doe',
        [finalForm.fields[1].id]: 'john@example.com',
        [finalForm.fields[2].id]: 'Support',
        [finalForm.fields[3].id]: 'I need help with my account.',
      },
    }),
  ]);

  const submitted = result2.state.facts.find((f) => f.tag === 'FormSubmitted');
  if (submitted) {
    console.log('✅ Form submitted successfully!');
    console.log(`   Submission ID: ${(submitted.payload as any).submissionId}`);
  }

  // Show submissions
  console.log('\n📊 Submissions:');
  const ctx = engine.getContext();
  ctx.submissions.forEach((sub, i) => {
    console.log(`  ${i + 1}. Submitted at ${sub.submittedAt.toLocaleString()}`);
  });

  // Demonstrate undo
  console.log('\n⏪ Demonstrating undo...');
  console.log(`   Before undo: ${ctx.submissions.length} submissions`);
  engine.undo();
  console.log(`   After undo: ${engine.getContext().submissions.length} submissions`);

  console.log('\n🎉 Done!');
}

main().catch(console.error);
```

## Step 5: Understanding Key Patterns

### 1. Nested State Updates

When updating nested structures like fields within a form:

```typescript
const form = state.context.forms.find((f) => f.id === formId);
if (form) {
  form.fields.push(newField);
  form.updatedAt = new Date();
}
```

### 2. Validation in Rules

The submit rule validates data and returns different facts:

```typescript
if (errors.length > 0) {
  return [ValidationFailed.create({ formId, errors })];
}
return [FormSubmitted.create({ formId, submissionId })];
```

### 3. History with Complex State

Undo/redo works automatically with `enableHistory: true`:

```typescript
engine.undo(); // Reverts to previous state
engine.redo(); // Moves forward again
```

## Next Steps

- Complete the UI with Svelte components
- Add drag-and-drop field reordering
- Implement form templates
- Add export functionality

---

**Next Tutorial:** [E-commerce Cart](./ecommerce-cart.md)
