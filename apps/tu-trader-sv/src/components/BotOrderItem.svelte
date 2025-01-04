
{#each orders || [] as order, i}
    <UAccordion class="my-2">
        {#snippet label()}
            { `${i + 1}. ${order.base}/${order.ccy} \t [${order.side}]` }
        {/snippet}
        {#snippet content()}
        <div class="flex flex-col gap-3 font-monospace all">
            <div class="">
                <p class="flex justify-between">
                    <span class="text-heading fw-6">Buy ID:</span>
                    <span>{ order.buy_order_id }</span>
                </p>
                <p class="flex justify-between">
                    <span class="text-heading fw-6">Sell ID:</span>
                     <span>{ order.order_id ?? "-- -- --" }</span>
                </p>
                <p class="flex justify-between mt-3">
                    <span class="fw-6 text-heading">ID:</span
                    ><span>{ order._id ?? order.id }</span>
                </p>
                <p class="flex justify-between mt-3">
                    <span class="fw-6 text-heading">Profit:</span
                    ><span> { order.profit }%</span>
                </p>
            </div>
            <div>
                <h6 class="fw-6">Entry time</h6>
                <div class="flex justify-between ml-3">
                    <span class="text-heading fw-6">In:</span
                    ><span>{
                        order.buy_timestamp?.i
                            ? order.buy_timestamp?.i
                            : "-- -- --"
                    }</span>
                </div>
                <div class="flex justify-between ml-3">
                    <span class="text-heading fw-6">Out:</span
                    ><span>{
                        order.buy_timestamp?.o
                            ? order.buy_timestamp?.o
                            : "-- -- --"
                    }</span>
                </div>
            </div>
            <div>
                <h6 class="fw-6">Exit time</h6>
                <div class="flex justify-between ml-3">
                    <span class="text-heading fw-6">In:</span
                    ><span>{
                        order.sell_timestamp?.i
                            ? order.sell_timestamp?.i
                            : "-- -- --"
                    }</span>
                </div>
                <div class="flex justify-between ml-3">
                    <span class="text-heading fw-6">Out:</span
                    ><span>{
                        order.sell_timestamp?.o
                            ? order.sell_timestamp.o
                            : "-- -- --"
                    }</span>
                </div>
            </div>
            <div class="">
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Entry amount:</span
                    ><span>{ order.ccy } { order.ccy_amt }</span>
                </p>
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Exit amount:</span
                    ><span>{ order.ccy } { order.new_ccy_amt }</span>
                </p>
            </div>
            <div class="my-1">
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Est. Entry Price:</span
                    ><span
                        >{ order.ccy }
                        { order._entry ?? "-- -- --" }</span
                    >
                </p>
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Est. Exit Price:</span
                    ><span
                        >{ order.ccy }
                        { order._exit ?? "-- -- --" }</span
                    >
                </p>
            </div>
            <div class="my-1">
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Entry price:</span
                    ><span
                        >{ order.ccy }
                        { order.buy_price ?? "-- -- --" }</span
                    >
                </p>
                <p class="flex justify-between">
                    <span class="fw-6 text-heading">Exit price:</span
                    ><span
                        >{ order.ccy }
                        { order.sell_price ?? "-- -- --" }</span
                    >
                </p>
            </div>
            <p class="flex justify-between">
                <span class="fw-6 text-heading">Base amount:</span
                ><span>{ order.base } { order.base_amt }</span>
            </p>
            <p class="flex justify-between">
                <span class="fw-6 text-heading">Buy fee:</span
                ><span>{ order.base } { order.buy_fee }</span>
            </p>
            <p class="flex justify-between">
                <span class="fw-6 text-heading">Sell fee:</span
                ><span>{ order.ccy } { order.sell_fee }</span>
            </p>
            <div class="my-2 hidden">
                <UFormGroup label="Highs" class="text-white">
                    <TuJson data={ order.all_highs?.map((el) => ({
                        ts: el.ts,
                        val: el.val,
                        tp: el.tp,
                        px: el.px,
                    }))}/>
                </UFormGroup>
            </div>
        </div>
        {/snippet}

    </UAccordion>
{/each}


<script lang="ts">
    import type { IObj } from "@cmn/utils/interfaces";
    import TuJson from "./TuJson.svelte";
    import UAccordion from "./UAccordion.svelte";
    import UFormGroup from "./UFormGroup.svelte";

const {orders,isChild} : {orders: IObj[]; isChild?: boolean} = $props()
</script>
