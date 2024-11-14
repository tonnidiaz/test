<div class="wp-nowrap">
    <div
        class="flex px-3 pt-2 pb-3.5"
    >
        <UTextarea class="w-50p font-monospace fw-6" bind:value={notes}  placeholder="Notes..." />
    </div>

    <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead class="text-xs uppercase bg-base-200 text-gray-400">
                            <tr>
                                <th scope="col" class="px-6 py-3">
                                    Ind
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Timestamp
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Side
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Close
                                </th>
                                <th scope="col" class="px-6 py-3">
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                           {#each rows as row}
                           <tr class={`bg-base-100 border-gray-200 font-monospace ${row.class}`}>
                            <th scope="col" class="px-6 py-3 text-gray-300">
                                Ind: { row.i }
                                </th>
                            <td class="px-6 py-3 font-monospace">
                                {#each row.enterTs.split('\n') as el}
                                <div>{ el }</div>
                                {/each}
                                <div class="text-gray-300">{ row.ts }</div>
                                </td>
                                <td > <span class={row.side.class}>{row.side.value}</span></td>
                                <td> <div>{ row.fill }</div>
                                    <div class="text-gray-300">{ row.c }</div></td>
                                <td >{ row.balance }</td>
                           </tr>
                           {/each}
                        </tbody>
                    </table>

 
</div>

<script lang="ts">
    import type { IObj } from "@cmn/utils/interfaces";
    import UTextarea from "./UTextarea.svelte";
    import { onMount } from "svelte";

let q = $state(""), notes = $state(""), data = $state<IObj>();
const NOTES_KEY = "notes"
const tableCols: { key: any; label: string }[] = [
    { key: "i", label: "I" },
    { key: "ts", label: "Timestamp" },
    { key: "side", label: "Side" },
    { key: "c", label: "Close" },
    { key: "balance", label: "Balance" },
];

let {rows}: {rows: IObj[]} = $props()
// const filteredRows = $derived<any[]>(() => {
//     if (!q.value) {
//         return props.rows;
//     }

//     return props.rows.filter((row: any) => {
//         return Object.values(row).some((value) => {
//             return String(value).toLowerCase().includes(q.value.toLowerCase());
//         });
//     });
// });
/* $inspect.with(props, val=>{
    console.log(val.rows);
    filteredRows.value = val.rows
}, {deep: true, immediate: true}) */

$inspect(notes).with((type, val)=>{
    if (val.length && window != undefined){
        sessionStorage.setItem(NOTES_KEY, val)
    }
})

onMount(()=>{
    if (window != undefined){
    const n =sessionStorage.getItem(NOTES_KEY)
    
    if (n) notes = n}
})


</script>
