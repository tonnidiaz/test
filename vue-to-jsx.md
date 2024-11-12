Converting a Vue 3 application (using TypeScript, the Composition API, and Pinia for state management) to Svelte 5 requires transforming several aspects of the code: component structure, state management, reactive variables, and lifecycle methods. Below is a guide along with a script that provides a basic transformation, but it’s best to adjust it as needed, depending on your application’s complexity.

### 1. **Structure of Vue to Svelte Conversion**

In Vue:
- **Composition API** is used for reactive state and lifecycle hooks.
- **Pinia** is used for state management.
  
In Svelte:
- **Reactive variables** (using `$` prefix for reactivity).
- **Lifecycle functions** like `onMount`.
- **Context API** (using `setContext` and `getContext`) to handle global state, similar to Vue’s `provide/inject`.

### 2. **Convert Vue Single File Component to Svelte Component**

For example, the following is a Vue component:

```vue
<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useStore } from '@/store';

const store = useStore();
const count = ref(0);

function increment() {
  count.value++;
  store.incrementGlobalCount();
}

onMounted(() => {
  console.log('Mounted');
});
</script>

<template>
  <div>
    <p>{{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
p {
  color: blue;
}
</style>
```

#### Svelte Equivalent

This component in Svelte might look like this:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { globalCount, incrementGlobalCount } from '../store';
  import { writable } from 'svelte/store';

  const count = writable(0);

  function increment() {
    count.update(n => n + 1);
    incrementGlobalCount();
  }

  onMount(() => {
    console.log('Mounted');
  });
</script>

<div>
  <p>{$count}</p>
  <button on:click={increment}>Increment</button>
</div>

<style>
  p {
    color: blue;
  }
</style>
```

### 3. **Convert Pinia Store to Svelte Store**

Here’s an example script to help convert a Pinia store to a Svelte store.

### Pinia Store (Vue)

```typescript
// store/index.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGlobalStore = defineStore('global', () => {
  const globalCount = ref(0);

  function incrementGlobalCount() {
    globalCount.value++;
  }

  return { globalCount, incrementGlobalCount };
});
```

### Svelte Store

Svelte uses the `writable` function to create stores. Here’s how you could rewrite the Pinia store above for Svelte:

```typescript
// store/index.ts
import { writable } from 'svelte/store';

export const globalCount = writable(0);

export function incrementGlobalCount() {
  globalCount.update(n => n + 1);
}
```

### Script to Automate Basic Conversion

You can use the following Node.js script to automate basic conversions for small to medium-sized components.

```javascript
const fs = require('fs');
const path = require('path');

// Input and output directories
const vueDir = path.join(__dirname, 'vue-components');
const svelteDir = path.join(__dirname, 'svelte-components');

// Create output directory if not exists
if (!fs.existsSync(svelteDir)) fs.mkdirSync(svelteDir);

fs.readdirSync(vueDir).forEach(file => {
  if (path.extname(file) === '.vue') {
    const content = fs.readFileSync(path.join(vueDir, file), 'utf-8');

    // Basic transformations
    let svelteContent = content
      // Replace <template> section
      .replace(/<template>/g, '')
      .replace(/<\/template>/g, '')

      // Replace <script lang="ts" setup> section
      .replace(/<script lang="ts" setup>/g, '<script lang="ts">')
      .replace(/<\/script>/g, '')

      // Convert Vue reactivity
      .replace(/ref\(([^)]+)\)/g, 'writable($1)')
      .replace(/const ([^ ]+) = ref\(([^)]+)\)/g, 'const $1 = writable($2)')
      .replace(/onMounted\(/g, 'onMount(')

      // Replace `store` state management
      .replace(/store\.([^()]+)\(\)/g, '$1()')
      .replace(/store\.(\w+)/g, '$$$1')

      // Replace Vue's template expressions
      .replace(/@click/g, 'on:click');

    // Add reactive variable prefix
    svelteContent = svelteContent.replace(/\{\{\s*([^}]+)\s*\}\}/g, '{$$1}');

    // Write to new Svelte file
    const svelteFile = path.join(svelteDir, file.replace('.vue', '.svelte'));
    fs.writeFileSync(svelteFile, svelteContent, 'utf-8');

    console.log(`Converted ${file} to Svelte`);
  }
});
```

### Script Breakdown

1. **Directory Setup**: Adjust `vueDir` and `svelteDir` for your source and target directories.
2. **Template Conversion**: This script removes `<template>` tags and updates Vue-specific syntax.
3. **Reactive State Conversion**: Replaces `ref` and other Composition API state management patterns with Svelte’s `writable` store.
4. **Event Handler Conversion**: Converts `@click` to `on:click`, aligning with Svelte’s event syntax.
5. **Store and Context API**: Changes `store` calls to work with Svelte's `$` reactive syntax.

### Notes and Limitations

This script is meant for simple transformations. Manual adjustments will likely be required, especially for:
- Components with complex lifecycles.
- Pinia stores with intricate actions or getters.
- Template directives (`v-if`, `v-for`) and advanced Vue-specific syntax, which require specific handling in Svelte.

This should provide a solid starting point for automating parts of your Vue-to-Svelte migration. Let me know if you have specific cases you need help with!