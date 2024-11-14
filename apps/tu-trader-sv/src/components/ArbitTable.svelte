<script lang="ts">
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import UTextarea from "./UTextarea.svelte";

    let q = $state(""),
        notes = $state(""),
        data = $state<IObj>();
    const NOTES_KEY = "notes";
    const tableCols: { key: any; label: string }[] = [
        { key: "i", label: "I" },
        { key: "ts", label: "Timestamp" },
        { key: "side", label: "Side" },
        { key: "c", label: "Close" },
        { key: "balance", label: "Balance" },
    ];

    interface IProps extends HTMLAttributes<any> {
        rows?: IObj[];
    }
    let { rows, class: _class, ...props }: IProps = $props();

    $effect(() => {
        // watch notes
        const val = notes;
        if (val.length && window != undefined) {
            sessionStorage.setItem(NOTES_KEY, val);
        }
    });

    onMount(() => {
        if (window != undefined) {
            const n = sessionStorage.getItem(NOTES_KEY);

            if (n) notes = n;
        }
    });
</script>

<div class={"wp-nowrap " + _class || ""} {...props}>
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
                <th scope="col" class="px-6 py-3"> Ind </th>
                <th scope="col" class="px-6 py-3"> Timestamp </th>
                <th scope="col" class="px-6 py-3"> Side </th>
                <th scope="col" class="px-6 py-3"> Close </th>
                <th scope="col" class="px-6 py-3"> Amount </th>
            </tr>
        </thead>
        <tbody>
            {#each rows as row, i}
                <tr
                    class={`bg-base-100 border-gray-200 font-monospace odd:bg-base-300 mb-3 ${row.class}`}
                >
                    <th scope="col" class="px-6 py-3 text-gray-300 mb-3">
                        Ind: {i}
                    </th>
                    <td class="px-6 py-3 font-monospace fs-13">
                        <!-- <div v-for="el in row.enterTs.split('\n')">{{ el }}</div> -->
                        {#if typeof row.ts == "string"}
                            <div class="text-gray-300">{row.ts}</div>
                        {:else}
                            {#each row.ts as ts}
                                <div class="text-gray-300">{ts}</div>
                            {/each}
                        {/if}

                        {#if typeof row.side != "string" || row.side
                                .toLowerCase()
                                .includes("sell")}
                            <div class="text-white fw-6">
                                PERC:{(row.est_perc ?? 0).toFixed(2)}% {(
                                    row.perc ?? 0
                                ).toFixed(2)}%
                            </div>
                        {/if}
                    </td>

                    <td>
                        {#if typeof row.side == "string"}
                            <div
                                class={`${row.side.toLowerCase().includes("buy") ? "text-success" : "text-error"}`}
                            >
                                {row.side}
                            </div>
                        {:else}
                            {#each row.side as side}
                                <div
                                    class={`fs-12 mb-2 ${side.includes("BUY") ? "text-success" : "text-error"}`}
                                >
                                    {side}
                                </div>
                            {/each}
                        {/if}
                    </td>
                    <td>
                        <div class="mb-2 text-gray-300 fs-12">
                            {#if typeof row.px == "number"}
                                <div>{row.px}</div>
                            {:else}
                                {#each row.px as px}
                                    <div>{px}</div>
                                {/each}
                            {/if}
                        </div>
                    </td>
                    <td>
                        <div class="mb-2 text-gray-300 fs-12">
                            {#if typeof row.amt == "number"}
                                <div>
                                    {#if row.ccy}
                                        <span class="fw-6 text-white"
                                            >{row.ccy}&nbsp;</span
                                        >
                                    {/if}
                                    {row.amt}
                                </div>
                            {:else}
                                {#each row.amt as amt}
                                    <div>{amt}</div>
                                {/each}
                            {/if}
                        </div>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    tr td {
        padding: 10px;
    }
</style>
