<template>
    <UFormGroup class="text-center flex items-center fs-15 gap-1.5 justify-end " style="flex-direction: row-reverse" label-class="mb-0">
        <input
            v-model="value"
            :disabled="disabled"
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary border-card"
        />
    </UFormGroup>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: any, disabled?: boolean }>();

const emit = defineEmits(["update:model-value"]);
const value = computed({
    get: () => props.modelValue,
    set: (val) => {
        emit("update:model-value", val);
    },
});
</script>
