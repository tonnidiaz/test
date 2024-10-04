<template>
    <input autocomplete="all" v-model="value" :class="defClass" />
</template>
<script setup lang="ts">
const props = withDefaults(
    defineProps<{ modelValue?: any; override: string }>(),
    { override: "" }
);
const defClass = props.override.split(" ").find((el) => el == "class")
    ? ""
    : "input input-bordered input-sm";

const emit = defineEmits(["update:model-value"]);
const value = computed({
    get: () => props.modelValue,
    set: (val) => {
        emit("update:model-value", val);
    },
});
</script>
