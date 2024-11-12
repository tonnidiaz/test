<template>
    <ul ref="menu" style="white-space: nowrap;"
        class="dropdown-content menu divide-y divide-neutral  p-1  fixed z-[999] bg-base-100 shadow-md border-card border-1 br-6"
    >
        <slot />
    </ul>
</template>
<script setup lang="ts">
import $ from 'jquery'
import { ref, computed, watch } from 'vue';
const menu = ref<HTMLUListElement>()
const set = ref(false)

const props = defineProps<{size: {w: number, h: number}, setMenu: (val: any) => any}>()

const emit = defineEmits(['update:size'])

const _size = computed({
    get: () => props.size,
    set: (v)=> emit('update:size', v)
})

defineExpose({
    name: "Squash", menu
})

watch(menu, v=>{
    if (v)
    {
        const w = $(v).width() ?? 0
        const h = $(v).width() ?? 0
        _size.value = {w, h}
        props.setMenu(v)
    }
})
</script>

<style lang="scss">
    .menu {
        *{
            white-space: nowrap;
        }
    }
</style>


