<div class="flex overflow-x-scroll">
    {#each stats as stat}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick="{stat.click}" 
    class="{`stat text-center m-auto ${stat.classes}`}"
>

    <span class="{`stat-title ${stat.titleClasses}`}">
        { stat.title}
    </span><UPopover mode="hover" background='bg-primary'>
    <span title="{stat.hover}" class="{`stat-value ${stat.valClasses} text-center`} ">{ stat.subtitle }</span>
        {#if stat.hover}
            {#snippet panel()}
            <div class="p-2 bg-gray-800 text-white">
                <p class="fs-12">{ stat.subtitle }</p>
                 <span>{ stat.hover }</span>
            </div>
            {/snippet}
        {/if}
        
       
</UPopover>
    
</div>
    {/each}
    
</div>

<script lang="ts">
    import { formatter } from '@/lib/funcs';
    import UPopover from './UPopover.svelte';


interface IStat {title: string, subtitle: any, click?: ()=> any, valClasses?: string, titleClasses?: string, classes?: string, hover?: string}
const testStats : IStat[] = [
    {title: "Trades", subtitle: 445},
    {title: "Profit", subtitle: `USDT ${formatter.format(127439943254).replace('$', '')}`},
    {title: "W", subtitle: '56%'},
    {title: "L", subtitle: '44%'},
]

interface IProps {stats?: IStat[]}
let {stats = [
    {title: "Trades", subtitle: 445},
    {title: "Profit", subtitle: `USDT ${formatter.format(127439943254).replace('$', '')}`},
    {title: "W", subtitle: '56%'},
    {title: "L", subtitle: '44%'},
]}: IProps = $props()

</script>
<style lang="scss"
>

</style>