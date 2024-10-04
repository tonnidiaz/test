<template>
    <!-- <select v-model="value" class="select select-bordered select-sm select-searchable"
    :searchable-placeholder="innerHint"
    option-attribute="label" value-attribute="value"
    :options="options"
    
 >
 <option selected disabled>{{ placeholder}}</option>
 <option v-for="opt in options" :value="opt.value">{{ opt.label }}</option>
 </select> -->
    <multiselect
    selectedLabel=""
    deselectLabel=""
    v-model="value" tagPlaceholder="" selectLabel=""  :options="options" track-by="label" label="label">

        <template #singleLabel="{option}"><span>{{ option.label }}</span></template>
    </multiselect>
</template>

<script setup lang="ts">
import "vue-multiselect/dist/vue-multiselect.css";
import Multiselect from "vue-multiselect";

import type { ISelectItem } from "~/utils/interfaces";

const props = defineProps<{
    innerHint?: string;
    options?: ISelectItem[];
    placeholder?: string;
    modelValue: any;
}>();

const emit = defineEmits(["update:model-value"]);
const value = computed({
    get: () => props.modelValue,
    set: (val) => {
        emit("update:model-value", val);
    },
});
</script>
<style lang="scss">
.multiselect__tags {
    min-height: 0px !important;
    display: block;
   // padding: 8px 0px 0 8px;
    border-radius: 5px;
    background: black;
    font-size: 14px;
}
.multiselect {
    
    * {
        background-color: var(--fallback-b1, oklch(var(--b1) / var(--tw-bg-opacity)));
        color: var(--fallback-bc, oklch(var(--bc) / 1));
        border-color: var(--fallback-bc, oklch(var(--bc) / 0.2));
        font-size: 14px;
    }
    ::placeholder{
        color: var(--fallback-bc, oklch(var(--bc) / 1));
    }
    //input{width: 100% !important;background-color: red !important;}
}
.multiselect__option{
 span{background: unset !important;}
}
.multiselect__option--selected.multiselect__option{
    background: var(--fallback-p, oklch(var(--p)/.4));
   
}

.multiselect__option--highlight{
    background: var(--fallback-p, oklch(var(--p)/.2)) !important;
}

</style>
