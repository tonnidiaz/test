<template>
    <label class="label block"
        ><div :class="`mb-1 ml-1 ${labelClass}`">{{ label }}</div>

        <slot />
    </label>
</template>

<script setup lang="ts">
defineProps({
    label: { type: String, default: "" },
    labelClass: {type: String, default: ''}
});
</script>
