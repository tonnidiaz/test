<script lang="ts">
    import { dev } from "$app/environment";
    import BotFormModal from "@/components/BotFormModal.svelte";
    import BotOrderItem from "@/components/BotOrderItem.svelte";
    import CtxMenu2 from "@/components/CtxMenu2.svelte";
    import TMeta from "@/components/TMeta.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import TuStats from "@/components/TuStats.svelte";
    import UAccordion from "@/components/UAccordion.svelte";
    import UBadge from "@/components/UBadge.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import UTextarea from "@/components/UTextarea.svelte";
    import { localApi } from "@/lib/api";
    import { SITE, arbitTypes, alphabets } from "@/lib/constants";
    import { activateBot, clearBotOrders, listToOpt } from "@/lib/funcs";
    import { appStore } from "@/stores/app.svelte";
    import { handleErrs, sleep } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount, untrack } from "svelte";

    let { data } = $props();
    let {platforms, strategies} = $derived(appStore)

    type EOrder = "win" | "lose" | "all";

    let _bot = $state<IObj>(),
        menuOpen = $state(false),
        modalOpen = $state(false),
        orders = $state<IObj[]>([]),
        allOrders = $state<IObj[]>([]),
        orderType = $state<EOrder>("all");

    const isSuperMega = $derived(_bot?.arbit_settings?.super_mega)

    const moreInfo = [{ label: "More info", content: "Lorem Ipsum" }];

    const getChildPair = (bot: IObj, i: number) => {
        return i == 0
            ? [bot.B, bot.A]
            : i == 1
              ? [bot.C, bot.B]
              : [bot.C, bot.A];
    };
    const filterOrders = (val: any[], oType?: EOrder) => {
        let _orders: IObj[] = [];
        const filter = oType == undefined;

        if (!_bot) return _orders;
        oType = oType ?? orderType;

        if (_bot.type == "normal") {
            _orders = val.filter((el: IObj) =>
                oType == "win"
                    ? el.profit >= 0
                    : oType == "lose"
                      ? el.profit < 0
                      : true
            );
        } else {
            _orders = val.filter((el) => {
                //console.log({ el });
                const ord = el.c;
                const profit = ord?.profit ?? 0;
                return oType == "win"
                    ? profit >= 0
                    : oType == "lose"
                      ? profit < 0
                      : true;
            });
        }
        if (filter) {
            orders = _orders;
            console.log(orders?.length);
        }
        return _orders;
    };

    onMount(() => {
        _bot = data.bot;
    });

    $effect(() => {
        // Watch [orderType, allOrders]
        const oType = orderType;
        const _orders = allOrders;
        
        oType;
        if (dev) console.log({_orders});
        untrack(() => {
            filterOrders(_orders);
        });
    });

    $effect(() => {
        // Watch _bot;
        const __bot = _bot;
        untrack(async () => {
            if (__bot.orders) {
                const limit = 100;
                const totalPages = Math.ceil(__bot.orders / limit);
                const { orders } = __bot;
                allOrders = []
                for (let page = 1; page <= totalPages; page++) {
                    await sleep(500);
                    try {
                        console.log('Getting orders...');
                        const res = await localApi().get("/orders", {
                            params: {
                                limit,
                                bot: __bot._id,
                                page,
                            },
                        });
                        if (dev) console.log(res.data);
                        allOrders = [...allOrders,...res.data];
                        // res.data.on("data", (chunk) => {
                        //     console.log(JSON.parse(chunk));
                        // });
                    } catch (e: any) {
                        handleErrs(e);
                        break;
                    }
                }
            }
        });
    });
</script>

<div>
    {#if !_bot}
        <div>
            <TMeta title={SITE} />
        </div>
    {:else}
        <div>
            <TMeta title={`${_bot.name} - ${SITE}`} />
            <fieldset
                class="fieldset w-full w-450px m-auto border-card border-1 p-2 md:p-4"
            >
                <legend>
                    <h1 class="text-gray-200">{_bot.name}</h1>
                </legend>
                <div class="flex justify-center mb-3">
                    <UBadge
                        label={!_bot.is_child ? "Parent bot" : "Child bot"}
                        class={`${
                            !_bot.is_child ? "badge-success" : "badge-warning"
                        }`}
                    />
                </div>

                <div class="flex gap-4 justify-center items-center">
                    <span class="fw-8">
                        {#if _bot.type == "normal"}
                        {_bot.base}/{_bot.ccy}
                        {/if}
                        {_bot.type == "arbitrage" ? (isSuperMega ? [ _bot.B, _bot.A]: [ _bot.C, _bot.B, _bot.A]) : ""}
                    </span>
                    <UBadge
                        label={(_bot.is_child &&
                            _bot.activated_at &&
                            !_bot.deactivated_at) ||
                        _bot.active
                            ? "Active"
                            : "Paused"}
                        class={`${
                            (_bot.is_child &&
                                _bot.activated_at &&
                                !_bot.deactivated_at) ||
                            _bot.active
                                ? "badge-success"
                                : "badge-warning"
                        }`}
                    />
                </div>

                <div class="flex gap-4 justify-center mt-3 items-center">
                    <UButton
                        onclick={async (e: any) =>
                            await activateBot(
                                e.currentTarget,
                                _bot!,
                                (val: any) => (_bot = val)
                            )}
                        class={`btn btn-neutral btn-sm ${
                            _bot.is_child ? "btn-disabled" : ""
                        }`}
                        color="gray"
                    >
                        {_bot.active ? "Deactivate" : "Activate"}
                    </UButton>
                    <BotFormModal
                        mode="Edit"
                        bot={{
                            platform: _bot.platform,
                            name: _bot.name,
                            desc: _bot.desc,
                            demo: _bot.demo,
                            id: _bot._id ?? _bot.id,
                            order_type: _bot.order_type,
                            symbol: [_bot.base, _bot.ccy].toString(),
                            interval: _bot.interval,
                            strategy: _bot.strategy,
                            type: _bot.type,
                            A: _bot.A,
                            B: _bot.B,
                            C: _bot.C,
                            child_pairs: _bot.child_pairs,
                            is_child: _bot.is_child,
                            children: _bot.children,
                            start_amt: _bot.start_amt,
                            balance: _bot.balance,
                            orders: allOrders,
                            arbit_settings: _bot.arbit_settings,
                        }}
                        bind:open={modalOpen}
                        onDone={(val) => {
                            _bot = val;
                        }}
                    >
                        {#snippet toggler()}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span
                                class={`btn btn-sm btn-rounded btn-neutral ${
                                    _bot.is_child ? "btn-disabled" : ""
                                }`}
                                title="Modify"
                                color="gray"
                                onclick={() => {
                                    modalOpen = true;
                                }}
                            >
                                <span>
                                    <i class="fi fi-br-pencil"></i>
                                </span>
                            </span>
                        {/snippet}
                    </BotFormModal>

                    <CtxMenu2 bind:open={menuOpen}>
                        {#snippet toggler()}
                            <UButton
                                class={`btn-neutral btn-sm btn-rounded ${
                                    _bot.is_child ? "btn-disabled" : ""
                                }`}
                                ><span class="fs-16 relative top-1">
                                    <i class="fi fi-br-menu-dots-vertical"></i>
                                </span></UButton
                            >
                        {/snippet}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <li
                            class={!_bot.orders ? "disabled" : ""}
                            onclick={async(e) =>
                               {const res = await clearBotOrders(
                                    (e.target as any).parentElement,
                                    _bot,
                                    (val) => {
                                        _bot = val;
                                    }
                                );
                                if (res) allOrders = []}
                                }
                        >
                            <span>Clear orders</span>
                        </li>
                    </CtxMenu2>
                </div>
                <div class="my-3 text-center mt-5">
                    <p class="fs-13">
                        <b>Activated at:</b>
                        {_bot.activated_at ?? "-- -- --"}
                    </p>
                    <p class="fs-13">
                        <b>Deactivated at:</b>
                        {_bot.deactivated_at ?? "-- -- --"}
                    </p>

                    <TuStats
                        class="items-center justify-center gap-2"
                        stats={[
                            {
                                title: "L:",
                                subtitle: filterOrders(allOrders, "lose")
                                    .length,
                                click: () => (orderType = "lose"),
                                classes:
                                    orderType == "lose" ? "text-primary" : "",
                            },
                            {
                                title: "Total orders:",
                                subtitle: _bot.orders || 0,
                                click: () => (orderType = "all"),
                                classes:
                                    orderType == "all" ? "text-primary" : "",
                            },
                            {
                                title: "W:",
                                subtitle: filterOrders(allOrders, "win").length,
                                click: () => (orderType = "win"),
                                classes:
                                    orderType == "win" ? "text-primary" : "",
                            },
                        ]}
                    ></TuStats>
                </div>
                <div class="mb-3 grid grid-cols-2 gap-3">
                    <TuSelect
                        disabled
                        bind:value={_bot.platform}
                        options={platforms.map((el) => ({
                            label: el.toUpperCase(),
                            value: el.toLowerCase(),
                        }))}
                    />
                    <TuSelect
                        disabled
                        bind:value={_bot.order_type}
                        options={["Market", "Limit"].map((el) => ({
                            label: el,
                            value: el,
                        }))}
                    />
                </div>

                <div class="flex flex-col gap-2">
                    <UAccordion class="" >
                        {#snippet label()}
                            More details
                        {/snippet}
                        {#snippet content()}
                            <div class="flex flex-col gap-2 items-center">
                                <UFormGroup>
                                    <UCheckbox
                                        label="Demo mode"
                                        disabled
                                        bind:value={_bot.demo}
                                    />
                                </UFormGroup>
                                <TuStats
                                    stats={[
                                        {
                                            title: "Start amount",
                                            subtitle:
                                                _bot.start_amt ??
                                                (0).toFixed(2),
                                        },
                                        {
                                            title: "Balance",
                                            subtitle: `${_bot.balCcy} ${
                                                _bot.balance ?? (0).toFixed(2)
                                            }`,
                                        },
                                    ]}
                                />
                                <TuStats
                                    stats={[
                                        {
                                            title: "Interval",
                                            subtitle: `${_bot.interval}m`,
                                        },
                                        {
                                            title: "Strategy",
                                            subtitle:
                                                strategies[_bot.strategy - 1]
                                                    ?.name ?? "null",
                                        },
                                    ]}
                                />

                                <UTextarea
                                    placeholder="Bot description"
                                    disabled
                                    style="
                                color: rgba(255, 255, 255, 0.8) !important;
                            "
                                    value={_bot.is_child
                                        ? `PARENT: ${_bot.parent}`
                                        : _bot.desc}
                                />
                            </div>
                        {/snippet}
                    </UAccordion>
                    {#if _bot.type == "arbitrage"}
                        <UAccordion class="">
                            {#snippet label()}
                                Arbitrage settings
                            {/snippet}
                            {#snippet content()}
                                <div
                                    class="grid sm:grid-cols-2 gap-3 items-end mt-4 mb-1"
                                >
                                        <TuSelect
                                            showLabel
                                            bind:value={_bot.arbit_settings
                                                ._type}
                                            class="w-full"
                                            searchable
                                            disabled
                                            innerHint="Search..."
                                            placeholder="Arbitrage type"
                                            required
                                            options={listToOpt(arbitTypes)}
                                        />
                                    <UFormGroup label="Min. arbit %">
                                        <UInput
                                            disabled
                                            required
                                            bind:value={_bot.arbit_settings
                                                .min_perc}
                                            placeholder="e.g .3"
                                            type="number"
                                            step="any"
                                        />
                                    </UFormGroup>
                                </div>
                                <div
                                    class="grid sm:grid-cols-3 gap-3 items-end mt-2"
                                >
                                    <UFormGroup label="Coin A" class="fs-14">
                                        <UInput
                                            required
                                            bind:value={_bot.A}
                                            placeholder="e.g USDT"
                                            title="The main QUOTE, e.g USDT"
                                            type="string"
                                            disabled
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Coin B" class="fs-14">
                                        <UInput
                                            required
                                            bind:value={_bot.B}
                                            placeholder="e.g USDC"
                                            title="The QUOTE for pair B, e.g USDC"
                                            type="string"
                                            disabled
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Coin C" class="fs-14">
                                        <UInput
                                            required
                                            bind:value={_bot.C}
                                            placeholder="e.g APEX"
                                            title="The BASE for pair C, e.g APEX"
                                            type="string"
                                            disabled
                                        />
                                    </UFormGroup>
                                </div>
                                <div class="my-2 grid grid-cols-3 items-center">
                                    <UCheckbox
                                        disabled
                                        label="Super mega"
                                        title="Is a super-mega bot"
                                        bind:value={_bot.arbit_settings.super_mega}
                                    ></UCheckbox>
                                    <UCheckbox
                                        disabled
                                        label="Flipped"
                                        title="Begin with pair C"
                                        bind:value={_bot.arbit_settings.flipped}
                                    ></UCheckbox>
                                    <UCheckbox
                                        disabled
                                        label="Use Ws"
                                        title="Uses websockets"
                                        bind:value={_bot.arbit_settings.use_ws}
                                    ></UCheckbox>
                                </div>
                            {/snippet}
                        </UAccordion>
                    {/if}

                    <UAccordion multiple class="multiple">
                        {#snippet label()}
                            Orders
                        {/snippet}
                        {#snippet content()}
                            <div class="flex flex-col gap-2 items-center">
                                {#if orders.length}
                                    <div class="">
                                        {#if _bot.type == "normal"}
                                            <BotOrderItem {orders} />
                                        {:else}
                                            {#each orders as arbitOrd, i}
                                                <UAccordion class="my-2">
                                                    {#snippet label()}
                                                        <div
                                                            class="flex items-center justify-between gap-4"
                                                        >
                                                            <div>
                                                                Order #{i + 1}
                                                            </div>

                                                            <div class="fs-13">
                                                                {(
                                                                    arbitOrd.c
                                                                        ?.est_profit ??
                                                                    0
                                                                ).toFixed(2)}%
                                                                &rarr;
                                                                {(
                                                                    arbitOrd.c
                                                                        ?.profit ??
                                                                    0
                                                                ).toFixed(2)}%
                                                            </div>
                                                        </div>
                                                    {/snippet}
                                                    {#snippet content()}
                                                        <BotOrderItem
                                                            orders={Object.values(
                                                                arbitOrd
                                                            )}
                                                            isChild
                                                        />
                                                    {/snippet}
                                                </UAccordion>
                                            {/each}
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="">
                                        <p>NO ORDERS</p>
                                    </div>
                                {/if}
                            </div>
                        {/snippet}
                    </UAccordion>
                    {#if _bot.children?.length && !isSuperMega}
                        <UAccordion multiple class="multiple">
                            {#snippet label()}
                                Children
                            {/snippet}
                            {#snippet content()}
                                <div class="flex flex-col gap-2 items- fs-14">
                                    {#each _bot.children || [] as child, i}
                                        <a
                                            target="_blank"
                                            class="text-left btn btn-neutral btn-sm justify-start gap-2"
                                            href={`/bots/${child}`}
                                        >
                                            Child
                                            {alphabets[i]}
                                            {getChildPair(_bot, i)}&nbsp;
                                            <span
                                                ><i class="fi fi-br-link-alt"
                                                ></i></span
                                            >
                                        </a>
                                    {/each}
                                </div>
                            {/snippet}
                        </UAccordion>
                    {/if}
                </div>
            </fieldset>
        </div>
    {/if}
</div>
