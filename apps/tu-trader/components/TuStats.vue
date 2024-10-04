<template>
    <!-- component -->
        <div class="flex overflow-x-scroll">
            <div v-for="stat in stats" @click="stat.click" 
                :class="`stat text-center m-auto ${stat.classes}`"
            >
            
                <span :class="`stat-title ${stat.titleClasses}`">
                    {{ stat.title}}
                </span><UPopover mode="hover":popper='{ arrow: true }' background='bg-primary'>
                <span :title="stat.hover" :class="`stat-value ${stat.valClasses} text-center` ">{{ stat.subtitle }}</span>
                <template v-if="stat.hover" #panel>
                    <div class="p-2 bg-gray-800 text-white">
                        <p class="fs-12">{{ stat.subtitle }}</p>
                         <span>{{ stat.hover }}</span>
                    </div>
                   
                </template>
            </UPopover>
                
            </div>
        </div>
</template>

<script setup lang="ts">

interface IStat {title: string, subtitle: any, click?: ()=> any, valClasses?: string, titleClasses?: string, classes?: string, hover?: string}
const testStats : IStat[] = [
    {title: "Trades", subtitle: 445},
    {title: "Profit", subtitle: `USDT ${formatter.format(127439943254).replace('$', '')}`},
    {title: "W", subtitle: '56%'},
    {title: "L", subtitle: '44%'},
]

    defineProps({
        stats: {type: Array<IStat>, default:  [
    {title: "Trades", subtitle: 445},
    {title: "Profit", subtitle: `USDT ${formatter.format(127439943254).replace('$', '')}`},
    {title: "W", subtitle: '56%'},
    {title: "L", subtitle: '44%'},
]}
    })
</script>
<style lang="scss"
>

</style>