<template>
    <div :class="`avatar ring rounded-full ring-neutral w-25px h-25px flex items-center justify-center ring-offset-base-100 ring-offset-2 ${online != undefined ? (online ? 'online' : 'offline') : ''}`">

        <slot/>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    online?: boolean,
}>()
</script>