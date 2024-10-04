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
                    <th scope="col" class="px-6 py-3">Timestamp</th>
                    <th scope="col" class="px-6 py-3">STD</th>
                    <th scope="col" class="px-6 py-3">HA</th>
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
                        <div class="text-gray-300">{{ row.ts }}</div>
                    </td>
                    <td scope="col">
                        <div class="fw-6 wp-wrap py-3">
                            <p v-for="k in Object.keys(row.std)">
                                {{ `${k}: ${row.std[k]}` }}
                            </p>
                        </div>
                    </td>
                    <td scope="col">
                        <div class="fw-6 wp-wrap">
                            <p v-for="k in Object.keys(row.ha)">
                                {{ `${k}: ${row.ha[k]}` }}
                            </p>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { type IObj } from '@/src/common';

const q = ref(""),
    notes = ref(""),
    data = ref<IObj>();
const NOTES_KEY = "notes";
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

watch(props, (v) => {});
</script>
