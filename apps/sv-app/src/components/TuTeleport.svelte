<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
  
    export let to = 'body';
  
    let element: HTMLDivElement;
  
    onMount(() => {
      const targetElement = document.querySelector(to);
      if (targetElement) {
        targetElement.appendChild(element);
        element.classList.remove('hidden')
      }
    });
  
    onDestroy(() => {
      element?.remove();
    });
  </script>
  
  <div bind:this={element} class="hidden">
    <slot></slot>
  </div>
  