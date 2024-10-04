<template>
    <Html lang="en" class="dark" data-theme="tb">
         <TMeta/>
         
         <NuxtLayout>
 
             <NuxtPage></NuxtPage>
             <div id="ctx-overlay"/>
             <div id="floating-actions"/>
         </NuxtLayout> 
     </Html>
 </template>
 <script setup lang="ts"> 
 import "@/src/styles/globals.css";
 import "@/src/styles/styles2.scss";
  import "@/src/styles/page-progress.css";
 import "@/src/styles/select.scss";
 import "@/src/styles/styles.scss";
 import "@/src/styles/daisy.scss";
 import "@/src/styles/scrollbar.scss";

 //import "@/src/assets/pace-1.2.4/pace.js"
 const route = useRoute()
 const pth = ref(route.fullPath)
 watch(route, (old, val)=>{
   //console.log(old, val);
    //isOpen.value = false
}, {deep: true, immediate: true})
 useHead({
   //script: [{src: '/assets/pace-1.2.4/pace.min.js'}]
 })
 </script>
  