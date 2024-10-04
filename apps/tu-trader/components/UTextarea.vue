<template>
    <textarea style="resize: both;" v-model="value" class="textarea textarea-bordered"></textarea>
</template>

<script setup lang="ts">

const props = defineProps<{modelValue: any}>()

const emit = defineEmits(["update:model-value"])
const value = computed({
    get: ()=> props.modelValue,
    set: (val)=>{
        emit("update:model-value", val)}
})
</script>