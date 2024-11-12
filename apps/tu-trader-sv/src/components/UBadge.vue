<template>
    <div class="badge rounded-md fs-12 fw-7">{{ label }}</div>
</template>
<script setup lang="ts">

defineProps<{
    label?: string
}>()
</script>