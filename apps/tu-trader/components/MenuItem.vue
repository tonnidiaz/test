<template>
    <li class="tooltip tooltip-right" :data-tip="title">
        <nuxt-link v-if="to" :to="to" :class="`${innerClass}`"><i v-if="icon" :class="icon"/> <slot/></nuxt-link>
        <span v-else :class="`${innerClass}`"><i v-if="icon" :class="icon"/> <span><slot/></span></span>
    </li>
     
</template>

<script setup lang="ts">

defineProps({
    to: {type: String},
    title: {type: String, default: ''},
    innerClass: {type: String},
    icon: {type: String},
})
</script>