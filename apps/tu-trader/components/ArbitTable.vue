<template>
    <div class="wp-nowrap">
        <div
            class="flex px-3 pt-2 pb-3.5"
        >
            <UTextarea class="w-50p font-monospace fw-6" autoresize v-model="notes" resize  placeholder="Notes..." />
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
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                               <tr v-for="(row, i) of rows" :class="`bg-base-100 border-gray-200 font-monospace odd:bg-base-300 mb-3 ${row.class}`">
                                <th scope="col" class="px-6 py-3 text-gray-300 mb-3">
                                    Ind: {{ i }}
                                    </th>
                                <td scope="col" class="px-6 py-3 font-monospace fs-13">
                                    <!-- <div v-for="el in row.enterTs.split('\n')">{{ el }}</div> -->
                                    <div v-if="typeof row.ts =='string'" class="text-gray-300">{{ row.ts }}</div>
                                    <div v-else class="text-gray-300" v-for="ts of row.ts">{{ ts }}</div>
                                    <div v-if="typeof row.side != 'string' || row.side.toLowerCase().includes('sell')" class="text-white fw-6">PERC:{{ (row.est_perc ?? 0).toFixed(2) }}% {{ (row.perc ?? 0).toFixed(2) }}%</div>
                                    </td>
                                    <td scope="col fs-12 mb-2">
                                        <div v-if="typeof row.side == 'string'" :class="`${row.side.toLowerCase().includes('buy') ? 'text-success' : 'text-error'}`">{{row.side}}</div>
                                        <div v-else v-for="side of row.side" :class="`fs-12 mb-2 ${side.includes('BUY') ? 'text-success' : 'text-error'}`">{{side}}</div></td>
                                    <td scope="col"> 
                                        <div class="mb-2 text-gray-300 fs-12">
                                            
                                            <div v-if="typeof row.px == 'number'">{{ row.px }}</div>
                                            <div v-else v-for="px of row.px">{{ px }}</div>
                                        </div>
                                    </td>
                                    <td scope="col"> 
                                        <div class="mb-2 text-gray-300 fs-12" >
                                            
                                            <div v-if="typeof row.amt == 'number'"> <span class="fw-6 text-white" v-if="row.ccy">{{ row.ccy }}&nbsp;</span>{{ row.amt }}</div>
                                            <div v-else v-for="amt of row.amt">{{ amt }}</div>
                                        </div>
                                    </td>
                               </tr>
                            </tbody>
                        </table>

    </div>
</template>

<script setup lang="ts">
import { type IObj } from '@/src/common';

const q = ref(""), notes = ref(""), data = ref<IObj>();
const NOTES_KEY = "notes"
const tableCols: { key: any; label: string }[] = [
    { key: "i", label: "I" },
    { key: "ts", label: "Timestamp" },
    { key: "side", label: "Side" },
    { key: "c", label: "Close" },
    { key: "balance", label: "Balance" },
];

const props = defineProps({
    rows: { type: Array<IObj>, default: [] },
});

const filteredRows = computed<any[]>(() => {
    if (!q.value) {
        return props.rows;
    }

    return props.rows.filter((row: any) => {
        return Object.values(row).some((value) => {
            return String(value).toLowerCase().includes(q.value.toLowerCase());
        });
    });
});
/* watch(props, val=>{
    console.log(val.rows);
    filteredRows.value = val.rows
}, {deep: true, immediate: true}) */

watch(notes, val=>{
    if (val.length && window != undefined){
        sessionStorage.setItem(NOTES_KEY, val)
    }
}, {immediate: true, deep: true})

onMounted(()=>{
    if (window != undefined){
    const n =sessionStorage.getItem(NOTES_KEY)
    
    if (n) notes.value = n}
})

watch(props, v=>{
})
</script>

<style>
 tr td {
    padding: 10px;
 }
</style>