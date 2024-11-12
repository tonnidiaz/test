<template>
    <div class="relative">
         <input
        type="text"
        :id="id"
        class="block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg appearance-none dark:text-white peer"
        v-bind="props"
        placeholder=" "
    />
    <label
        :for="id"
        class="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1"
        >{{ label }}</label
    >
    </div>
   
</template>

<script setup lang="ts">
defineProps({
    label: String,
    id: { type: String, required: true },
    props:  {
        type: Object,
        default: {}
    }
});
</script>
