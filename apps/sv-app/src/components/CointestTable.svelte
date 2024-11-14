    <div class={"wp-nowrap " + _class || ""}>
        <div class="flex px-3 pt-2 pb-3.5">
            <UTextarea
                class="w-50p font-monospace fw-6"
                
                bind:value={notes}
                placeholder="Notes..."
            />
        </div>

        <table
            class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
        >
            <thead class="text-xs uppercase bg-base-200 text-gray-400">
                <tr>
                    <th scope="col" class="px-6 py-3">Ind</th>
                    <th scope="col" class="px-6 py-3">Pair</th>
                    
                    <th scope="col" class="px-6 py-3">Profit</th>
                    <th scope="col" class="px-6 py-3">Trades</th>
                    <th scope="col" class="px-6 py-3">Wins</th>
                    <th scope="col" class="px-6 py-3">Losses</th>
                    <th scope="col" class="px-6 py-3">Aside</th>
                    
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i}
                    <tr
                    class={`bg-base-100 even:bg-base-200 border-gray-200 font-monospace`}
                >
                    <td class="">
                        <div class="text-gray-100 fw-6">Ind: { i }</div>
                    </td>
                    <td class="px-6 py-3 font-monospace">
                        <div class="text-gray-300">{ row.pair }</div>
                    </td>
                   
                    <td>
                        <span title={`ZAR ${_format(toZAR(row.profit))}`} class="text-gray-300">USDT { _format(row.profit)}</span>
                    </td>
                     <td>
                        <span>{ row.trades }</span>
                    </td>
                    <td>
                        <span>{ row.w }</span>
                    </td>
                    <td>
                        <span>{ row.l }</span>
                    </td>
                    <td>
                        <span title={`ZAR ${_format(toZAR(row.aside))}`} class="text-gray-300">USDT { _format(row.aside) }</span>
                    </td>
                   
                </tr>
                {/each}
                
            </tbody>
        </table>
    </div>

<script lang="ts">
    import { formatter } from "@/lib/funcs";
    import type { IObj } from "@cmn/utils/interfaces";
    import type { HTMLAttributes } from "svelte/elements";
    import UTextarea from "./UTextarea.svelte";
    import { onMount } from "svelte";

let q = $state(""),
    notes = $state(""),
    data = $state<IObj>();
const NOTES_KEY = "notes";

interface IProps extends HTMLAttributes<any>{rows?: IObj[]}
const {rows, class: _class,...props} : IProps = $props()
const toZAR = (amt?: number) =>{
    return (amt ?? 0 )* 19
}

const _format = (num?: number) => formatter.format( (num  ?? 0)).replace('$', '')
// const filteredRows = computed<any[]>(() => {
//     if (!q.value) {
//         return props.rows;
//     }

//     return props.rows.filter((row: any) => {
//         return Object.values(row).some((value) => {
//             return String(value).toLowerCase().includes(q.value.toLowerCase());
//         });
//     });
// });
/* watch(props, val=>{
    console.log(val.rows);
    filteredRows.value = val.rows
}, {deep: true, immediate: true}) */

$effect(()=>{
    const val = notes
    if (val.length && window != undefined) {
            sessionStorage.setItem(NOTES_KEY, val);
        }
})

onMount(() => {
    if (window != undefined) {
        const n = sessionStorage.getItem(NOTES_KEY);
        if (n) notes = n;
    }
});


</script>
