<template>
    <div>
        <h1>My vue code</h1>
        <button @click="sayHi">Greet us bitch!</button>
    </div>
</template>
<script setup lang="ts">
    const sayHi = ()=>{
        console.log("Hi Pilgrams!")
    }
</script>