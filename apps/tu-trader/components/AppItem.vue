<template>
    <NuxtLink class="flex gap-10px items-center" :to="`/apps/${app._id ?? app.id}/vlts`">
                        <div class=" ">
                             <div class="rounded-full w-60px h-60px card-border flex items-center justify-center">
                                <span class="mt-2"><i class="fi fi-br-laptop-mobile fs-25"></i></span>
                        </div>
                        </div>
                       
                        <div>
                            <h3 class="fs-18 font-semibold" >{{ app.name }}</h3>
                            <div class="flex flex-row flex-wrap gap-5px my-2px">
                                <div
                                    class=""
                                    v-for="(platform, j) in app.platforms"
                                >
                                <div class="badge badge-neutral badge-lg flex justify-center items-center pdy-4">
                                    <NuxtLink :to="`/apps/platform/${platform.name.toLowerCase()}`" >
                                        <span>
                                                <i
                                                    :class="`${platform.icon}`"
                                                ></i>
                                            </span>
                                    </NuxtLink>
                                 
                                </div>
                                  
                                </div>
                            </div>
                        </div>
                    </NuxtLink>
</template>

<script setup lang="ts">

defineProps({
    app: {
        type: Object,
        required: true
    }
})
</script>