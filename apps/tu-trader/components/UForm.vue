<template>
    <form @submit="_onSubmit">
        <slot/>
    </form>
</template>
<script setup lang="ts">
//const emit = defineEmits(['submit'])
const props = defineProps({
    onSubmit: Function,
})

const _onSubmit = async (e: any)=>{
    e.preventDefault()
    const btns = [...e.target.querySelectorAll('button[type=submit]')]
    btns.forEach((btn: any)=>{
        btn.disabled = true})
        await props.onSubmit?.call(e)
    btns.forEach((btn: any)=>btn.disabled = false)
}
</script>