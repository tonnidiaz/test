<template>
    <div>
        <t-meta :title="`Orderbooks - ${SITE}`" />
        <div class="sm:p-4 p-2">
            <tu-card
                class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <div class="flex gap-3 justify-center mb-3">
                    <h1 class="text-xl">Orderbooks</h1>
                </div>
                <TuStats :stats="[{ title: 'TOTAL', subtitle: booksCount }]" />
                <UForm
                    :on-submit="handleSubmit"
                    class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center gap-3"
                >
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <UFormGroup label="Platform">
                            <TuSelect
                                :options="
                                    plats
                                        .sort((a, b) =>
                                            a.name.localeCompare(b.name)
                                        )
                                        .map((el) => ({
                                            label: el.name.toUpperCase(),
                                            value: el.name.toLocaleLowerCase(),
                                        }))
                                "
                                v-model="formState.platform"
                            />
                        </UFormGroup>
                        <UFormGroup label="Pair">
                            <TuSelect
                                placeholder="Select pair"
                                :options="
                                    plats
                                        .find(
                                            (el) =>
                                                el.name == formState.platform
                                        )
                                        ?.pairs.sort()
                                        .map((el) => ({
                                            label: el.join('/'),
                                            value: el,
                                        }))
                                "
                                v-model="formState.pair"
                            />
                        </UFormGroup>
                    </div>
                    <div class="mb-1">
                        <UButton type="submit" class="btn-primary"
                            >Submit</UButton
                        >
                    </div>
                </UForm>
                <tu-card v-if="orderbook.pair"
                    class="border-card border-1 my-2 rounded-md p-1 md:p-4 flex flex-col items-center gap-3"
                >
                    <template #header>Orderbook data [ {{ orderbook.pair.join(',') }} ]</template>
                    <UAccordion v-for="book of [...orderbook.book].reverse()">
                        <template #label>{{ book.ts }}</template>
                        <template #content>
                            <div
                                class="grid grid-cols-1 gap-2 rounded-md border-1 border-card p-2"
                            ><div class="grid gap-3 grid-cols-2 mb-3">
                                <h4>Price ({{ orderbook.pair[1] }})</h4>
                                <h4>Size ({{ orderbook.pair[0] }})</h4>
                            </div>
                                <div
                                    v-for="ask of [...book.asks].reverse()"
                                    class="grid gap-3 grid-cols-2 text-error font-monospace"
                                >
                                    <p class="fs-13">{{ ask.px }}</p>
                                    <p class="fs-13">{{ ask.amt }}</p>
                                </div>
                                <div
                                    v-for="bid of book.bids"
                                    class="grid gap-3 grid-cols-2 text-success font-monospace"
                                >
                                    <p class="fs-13">{{ bid.px }}</p>
                                    <p class="fs-13">{{ bid.amt }}</p>
                                </div>
                            </div>
                        </template>
                    </UAccordion>
                </tu-card>
            </tu-card>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAppStore } from "@/src/stores/app";
import {
    selectIntervals,
    selectParents,
    selectPlatforms,
    SITE,
    symbols,
} from "~/utils/constants";
import { storeToRefs } from "pinia";
import { api, localApi } from "~/utils/api";
import { type IObj } from "@repo/common/src/utils/interfaces";
const appStore = useAppStore();

const initRes = { data: {} };

const res = ref<IObj>(initRes),
    orderbook = ref<IObj>({});
const { setStrategies } = appStore;
const { strategies, platforms, parents } = storeToRefs(appStore);
const booksCount = ref(0),
    formState = ref<IObj>({ platform: "okx" }),
    plats = ref<{ name: string; pairs: string[][] }[]>([]);

async function getBookCount() {
    const res = await localApi().get("/books?count=true");
    // plats.value = res.data.plats;
    booksCount.value = res.data.total;
}

const handleSubmit = async (e: any) => {
    try {
        const fd = formState.value;
        console.log({ fd });
        if (!fd.cpair && !fd.pair)
            return alert("ERR: Pair or custom pair not provided!!");
        const res = await localApi().get(`/books/${fd.platform}`, {
            params: {
                pair: fd.cpair
                    ? fd.cpair.split("/").join("-")
                    : fd.pair.join("-"),
            },
        });
        console.log(res.data);
        if (res.data.length) {
            orderbook.value = res.data[0];
        }
    } catch (err) {
        console.log(err);
    }
};
onMounted(() => {
    getBookCount();
});
</script>
