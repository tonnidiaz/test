<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import TuCard from "@/components/TuCard.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import TuStats from "@/components/TuStats.svelte";
    import UAccordion from "@/components/UAccordion.svelte";
    import UButton from "@/components/UButton.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import { localApi } from "@/lib/api";
    import { SITE } from "@/lib/constants";
    import { appStore } from "@/stores/app.svelte";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";




const initRes = { data: {} };

let res = $state<IObj>(initRes),
    orderbook = $state<IObj>({});
let { strategies, platforms, parents } = $derived(appStore);
let booksCount = $state(0),
    formState = $state<IObj>({ platform: "okx" }),
    plats = $state<{ name: string; pairs: string[][] }[]>([]);

async function getBookCount() {
    const res = await localApi().get("/books?count=true");
    // plats.value = res.data.plats;
    booksCount = res.data.total;
}

const handleSubmit = async (e: any) => {
    try {
        const fd = formState;
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
            orderbook = res.data[0];
        }
    } catch (err) {
        console.log(err);
    }
}

onMount(() => {
    getBookCount();
})


</script>

<div>
    <TMeta title={`Orderbooks - ${SITE}`} />
    <div class="sm:p-4 p-2">
        <TuCard
            class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <div class="flex gap-3 justify-center mb-3">
                <h1 class="text-xl">Orderbooks</h1>
            </div>
            <TuStats stats={[{ title: 'TOTAL', subtitle: booksCount }]} />
            <UForm
                onsubmit={handleSubmit}
                class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center gap-3"
            >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <UFormGroup label="Platform">
                        <TuSelect
                            options={
                                plats
                                    .sort((a, b) =>
                                        a.name.localeCompare(b.name)
                                    )
                                    .map((el) => ({
                                        label: el.name.toUpperCase(),
                                        value: el.name.toLocaleLowerCase(),
                                    }))
                            }
                            bind:value={formState.platform}
                        />
                    </UFormGroup>
                    <UFormGroup label="Pair">
                        <TuSelect
                            placeholder="Select pair"
                            options=
                                {plats
                                    .find(
                                        (el) =>
                                            el.name == formState.platform
                                    )
                                    ?.pairs.sort()
                                    .map((el) => ({
                                        label: el.join('/'),
                                        value: el,
                                    }))}
                            
                            bind:value={formState.pair}
                        />
                    </UFormGroup>
                </div>
                <div class="mb-1">
                    <UButton type="submit" class="btn-primary"
                        >Submit</UButton
                    >
                </div>
            </UForm>
            {#if orderbook.pair}
                <TuCard
                class="border-card border-1 my-2 rounded-md p-1 md:p-4 flex flex-col items-center gap-3"
            >
                {#snippet header()}
                    Orderbook data [ { orderbook.pair.join(',') } ]
                {/snippet}
                {#each [...orderbook.book].reverse() as book }
                    <UAccordion>
                        {#snippet label()}
                            { book.ts }
                        {/snippet}
                        {#snippet content()}
                             <div
                            class="grid grid-cols-1 gap-2 rounded-md border-1 border-card p-2"
                        ><div class="grid gap-3 grid-cols-2 mb-3">
                            <h4>Price ({ orderbook.pair[1] })</h4>
                            <h4>Size ({ orderbook.pair[0] })</h4>
                        </div>
                        {#each [...book.asks].reverse() as ask}
                            <div
                                class="grid gap-3 grid-cols-2 text-error font-monospace"
                            >
                                <p class="fs-13">{ ask.px }</p>
                                <p class="fs-13">{ ask.amt }</p>
                            </div>
                        {/each}
                            
                        {#each book.bids as bid}
                            <div
                                class="grid gap-3 grid-cols-2 text-success font-monospace"
                            >
                                <p class="fs-13">{ bid.px }</p>
                                <p class="fs-13">{ bid.amt }</p>
                            </div>
                        {/each}
                            
                        </div>
                        {/snippet}
                   
                </UAccordion>
                {/each}
                
            </TuCard>
            {/if}
            
        </TuCard>
    </div>
</div>