<template>
    <ctx-menu v-model="modalOpen">
        <template #toggler>
            <div class="btn btn-primary btn-sm"
           
            icon="i-heroicons-calendar-days-20-solid"
        >
            {{ format(new Date(date.start), "d MMM, yyy, hh:mm") }} -
            {{ format(new Date(date.end), "d MMM, yyy, hh:mm") }}
        </div>
        </template>
        <template #children>
                <div class="card p-2">
                <div class="card-header p-2">
                    <h3>Select range</h3>
                </div>
                <div
                    class="rounded-m sm:flex-row flex flex-col items-center justify-center gap-3"
                >
                    <UInput type="datetime-local" v-model="date.start" />
                    <UInput type="datetime-local" v-model="date.end" />
                </div> 
            </div>
             
        </template>
        
           
        
    </ctx-menu>
</template>
<script setup lang="ts">
import { format, isDate } from "date-fns";
const modalOpen = ref(false);

import { isValidDate } from "~/utils/funcs";

const props = defineProps({
    modelValue: {
        type: Object,
        default: {
            start: new Date(Date.now() - 2 * 24 * 3600 * 1000)
                .toISOString()
                .slice(0, 16),
            end: new Date().toISOString().slice(0, 16),
        },
    },
});

const emit = defineEmits(["update:model-value", "close"]);
const date = computed({
    get: () => props.modelValue,
    set: (val) => {
        emit("update:model-value", val)},
});


watch(()=>date, (val)=>{
    const _date = val.value
    const {start, end} = _date
    const y1 = start.split('-')[0]
    const y2 = end.split('-')[0]
    const _end = end?.replaceAll(y2, y1)
    if (isValidDate(_end)) val.value.end = _end
}, {immediate: true, deep: true})

</script>
