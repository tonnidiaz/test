<template>
    <div class="wp-nowrap">
        <div class="flex px-3 pt-2 pb-3.5">
            <UTextarea
                class="w-50p font-monospace fw-6"
                autoresize
                v-model="notes"
                resize
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
                <tr
                    v-for="(row, i) of rows"
                    :class="`bg-base-100 even:bg-base-200 border-gray-200 font-monospace`"
                >
                    <td scope="col" class="">
                        <div class="text-gray-100 fw-6">Ind: {{ i }}</div>
                    </td>
                    <td scope="col" class="px-6 py-3 font-monospace">
                        <div class="text-gray-300">{{ row.pair }}</div>
                    </td>
                   
                    <td scope="col">
                        <span :title="`ZAR ${_format(toZAR(row.profit))}`" class="text-gray-300">USDT {{ _format(row.profit) }}</span>
                    </td>
                     <td scope="col">
                        <span>{{ row.trades }}</span>
                    </td>
                    <td scope="col">
                        <span>{{ row.w }}</span>
                    </td>
                    <td scope="col">
                        <span>{{ row.l }}</span>
                    </td>
                    <td scope="col">
                        <span :title="`ZAR ${_format(toZAR(row.aside))}`" class="text-gray-300">USDT {{ _format(row.aside) }}</span>
                    </td>
                   
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { type IObj } from '@repo/common/src/utils/interfaces';
import { formatter } from '~/utils/funcs';

const q = ref(""),
    notes = ref(""),
    data = ref<IObj>();
const NOTES_KEY = "notes";

const props = defineProps({
    rows: { type: Array<IObj>, default: [] },
});

const toZAR = (amt?: number) =>{
    return (amt ?? 0 )* 19
}

const _format = (num?: number) => formatter.format( (num  ?? 0)).replace('$', '')
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

watch(
    notes,
    (val) => {
        if (val.length && window != undefined) {
            sessionStorage.setItem(NOTES_KEY, val);
        }
    },
    { immediate: true, deep: true }
);

onMounted(() => {
    if (window != undefined) {
        const n = sessionStorage.getItem(NOTES_KEY);

        if (n) notes.value = n;
    }
});

watch(props, (v) => {
});
</script>
