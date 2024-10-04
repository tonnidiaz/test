<template>
    <div v-if="_bot">
        <TMeta :title="`${_bot.name} - ${SITE}`" />
        <fieldset
            class="fieldset w-full w-450px m-auto border-card border-1 p-2 md:p-4"
        >
            <legend>
                <h1 class="text-gray-200">{{ _bot.name }}</h1>
            </legend>
            <div class="flex justify-center mb-3">
                <UBadge
                    :label="!_bot.is_child ? 'Parent bot' : 'Child bot'"
                    :color="!_bot.is_child ? 'primary' : 'yellow'"
                    :class="`${
                        !_bot.is_child ? 'badge-success' : 'badge-warning'
                    }`"
                />
            </div>

            <div class="flex gap-4 justify-center items-center">
                <span class="fw-8">
                    {{ _bot.base }}/{{ _bot.ccy }}
                    {{ _bot.type == "arbitrage" ? `${_bot.C}/${_bot.B}` : "" }}
                </span>
                <UBadge
                    :label="
                        (_bot.is_child &&
                            _bot.activated_at &&
                            !_bot.deactivated_at) ||
                        _bot.active
                            ? 'Active'
                            : 'Paused'
                    "
                    :color="
                        (_bot.is_child &&
                            _bot.activated_at &&
                            !_bot.deactivated_at) ||
                        _bot.active
                            ? 'primary'
                            : 'yellow'
                    "
                    :class="`${
                        (_bot.is_child &&
                            _bot.activated_at &&
                            !_bot.deactivated_at) ||
                        _bot.active
                            ? 'badge-success'
                            : 'badge-warning'
                    }`"
                />
            </div>

            <div class="flex gap-4 justify-center mt-3 items-center">
                <UButton
                    @click="(e : any)=> activateBot(e.currentTarget, _bot!, (val: any)=> _bot = val)"
                    :class="`btn btn-neutral btn-sm ${
                        _bot.is_child ? 'btn-disabled' : ''
                    }`"
                    color="gray"
                >
                    {{ _bot.active ? "Deactivate" : "Activate" }}
                </UButton>
                <BotFormModal
                    mode="Edit"
                    :bot="{
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
                    }"
                    v-model="modalOpen"
                    :onDone="
                        (val) => {
                            _bot = val;
                        }
                    "
                >
                    <template #toggler>
                        <span
                            :class="`btn btn-sm btn-rounded btn-neutral ${
                                _bot.is_child ? 'btn-disabled' : ''
                            }`"
                            title="Modify"
                            color="gray"
                            @click="
                                () => {
                                    modalOpen = true;
                                }
                            "
                        >
                            <span>
                                <i class="fi fi-br-pencil"></i>
                            </span>
                        </span>
                    </template>
                </BotFormModal>

                <CtxMenu v-model="menuOpen">
                    <template v-slot:toggler>
                        <UButton
                            size="sm"
                            :ui="{ rounded: 'rounded-full' }"
                            variant="ghost"
                            color="gray"
                            :class="`btn-neutral btn-sm btn-rounded ${
                                _bot.is_child ? 'btn-disabled' : ''
                            }`"
                            ><span class="fs-16 relative top-1">
                                <i
                                    class="fi fi-br-menu-dots-vertical"
                                ></i> </span
                        ></UButton>
                    </template>
                    <template v-slot:children>
                        <li
                            :class="!_bot.orders ? 'disabled' : ''"
                            @click="
                                clearBotOrders(
                                    ($event.target as any).parentElement,
                                    _bot,
                                    (val) => {
                                        _bot = val;
                                    }
                                )
                            "
                        >
                            <span>Clear orders</span>
                        </li>
                    </template>
                </CtxMenu>
            </div>
            <div class="my-3 text-center mt-5">
                <p class="fs-13">
                    <b>Activated at:</b> {{ _bot.activated_at ?? "-- -- --" }}
                </p>
                <p class="fs-13">
                    <b>Deactivated at:</b>
                    {{ _bot.deactivated_at ?? "-- -- --" }}
                </p>

                <TuStats
                    class="items-center justify-center gap-2"
                    :stats="[
                        {
                            title: 'L:',
                            subtitle: filterOrders(allOrders, EOrder.lose)
                                .length,
                            click: () => (orderType = EOrder.lose),
                            classes:
                                orderType == EOrder.lose ? 'text-primary' : '',
                        },
                        {
                            title: 'Total orders:',
                            subtitle: _bot.orders || 0,
                            click: () => (orderType = EOrder.all),
                            classes:
                                orderType == EOrder.all ? 'text-primary' : '',
                        },
                        {
                            title: 'W:',
                            subtitle: filterOrders(allOrders, EOrder.win)
                                .length,
                            click: () => (orderType = EOrder.win),
                            classes:
                                orderType == EOrder.win ? 'text-primary' : '',
                        },
                    ]"
                >
                </TuStats>
            </div>
            <div class="mb-3 grid grid-cols-2 gap-3">
                <TuSelect
                    disabled
                    v-model="_bot.platform"
                    :options="
                        platforms.map((el) => ({
                            label: el.toUpperCase(),
                            value: el.toLowerCase(),
                        }))
                    "
                />
                <TuSelect
                    disabled
                    v-model="_bot.order_type"
                    :options="
                        ['Market', 'Limit'].map((el) => ({
                            label: el,
                            value: el,
                        }))
                    "
                />
            </div>

            <div class="flex flex-col gap-2">
                <UAccordion class="" :items="moreInfo">
                    <template #label>More details</template>
                    <template #content>
                        <div class="flex flex-col gap-2 items-center">
                            <UFormGroup>
                                <UCheckbox
                                    label="Demo mode"
                                    disabled
                                    :modelValue="_bot.demo"
                                />
                            </UFormGroup>
                            <TuStats
                                :stats="[
                                    {
                                        title: 'Start amount',
                                        subtitle:
                                            _bot.start_amt ?? (0).toFixed(2),
                                    },
                                    {
                                        title: 'Balance',
                                        subtitle: `${_bot.balCcy} ${
                                            _bot.balance ?? (0).toFixed(2)
                                        }`,
                                    },
                                ]"
                            />
                            <TuStats
                                :stats="[
                                    {
                                        title: 'Interval',
                                        subtitle: `${_bot.interval}m`,
                                    },
                                    {
                                        title: 'Strategy',
                                        subtitle:
                                            strategies[_bot.strategy - 1]
                                                ?.name ?? 'null',
                                    },
                                ]"
                            />

                            <UTextarea
                                placeholder="Bot description"
                                disabled
                                style="
                                    color: rgba(255, 255, 255, 0.8) !important;
                                "
                                :model-value="
                                    _bot.is_child
                                        ? `PARENT: ${_bot.parent}`
                                        : _bot.desc
                                "
                            />
                        </div>
                    </template>
                </UAccordion>
                <UAccordion class="" v-if="_bot.type == 'arbitrage'">
                    <template #label>Arbitrage settings</template>
                    <template #content>
                        <div
                            class="grid sm:grid-cols-2 gap-3 items-end mt-4 mb-1"
                        >
                            <UFormGroup label="Arbit type">
                                <TuSelect
                                    v-model="_bot.arbit_settings._type"
                                    class="w-full"
                                    searchable
                                    disabled
                                    innerHint="Search..."
                                    placeholder="Arbitrage type"
                                    required
                                    :options="listToOpt(arbitTypes)"
                                />
                            </UFormGroup>
                            <UFormGroup label="Min. arbit %">
                                <UInput
                                    disabled
                                    required
                                    v-model="_bot.arbit_settings.min_perc"
                                    placeholder="e.g .3"
                                    type="number"
                                    step="any"
                                />
                            </UFormGroup>
                        </div>
                        <div class="grid sm:grid-cols-3 gap-3 items-end mt-2">
                            <UFormGroup label="Coin A" class="fs-14">
                                <UInput
                                    required
                                    v-model="_bot.A"
                                    placeholder="e.g USDT"
                                    title="The main QUOTE, e.g USDT"
                                    type="string"
                                    disabled
                                />
                            </UFormGroup>
                            <UFormGroup label="Coin B" class="fs-14">
                                <UInput
                                    required
                                    v-model="_bot.B"
                                    placeholder="e.g USDC"
                                    title="The QUOTE for pair B, e.g USDC"
                                    type="string"
                                    disabled
                                />
                            </UFormGroup>
                            <UFormGroup label="Coin C" class="fs-14">
                                <UInput
                                    required
                                    v-model="_bot.C"
                                    placeholder="e.g APEX"
                                    title="The BASE for pair C, e.g APEX"
                                    type="string"
                                    disabled
                                />
                            </UFormGroup>
                        </div>
                        <div class="my-2 grid grid-cols-2 items-center">
                            <UCheckbox
                                disabled
                                label="Flipped"
                                title="Begin with pair C"
                                v-model="_bot.arbit_settings.flipped"
                            ></UCheckbox>
                            <UCheckbox
                                disabled
                                label="Use Ws"
                                title="Use websockets"
                                v-model="_bot.arbit_settings.use_ws"
                            ></UCheckbox>
                        </div>
                    </template>
                </UAccordion>
                <UAccordion multiple class="multiple">
                    <template #label>Orders</template>
                    <template #content>
                        <div class="flex flex-col gap-2 items-center">
                            <div class="" v-if="orders.length">
                                <BotOrderItem
                                    v-if="_bot.type == 'normal'"
                                    :orders="orders"
                                />
                                <!-- 
                                [{a: Order}, {}, {}]
                            -->
                                <UAccordion
                                    class="my-2"
                                    v-else
                                    v-for="(arbitOrd, i) of orders"
                                >
                                    <template #label>
                                        <div
                                            class="flex items-center justify-between gap-4"
                                        >
                                            <div>Order #{{ i + 1 }}</div>

                                            <div class="fs-13">
                                                {{
                                                    (
                                                        arbitOrd.c?.est_profit ??
                                                        0
                                                    ).toFixed(2)
                                                }}% &rarr;
                                                {{
                                                    (
                                                        arbitOrd.c?.profit ?? 0
                                                    ).toFixed(2)
                                                }}%
                                            </div>
                                        </div>
                                    </template>
                                    <template #content>
                                        <BotOrderItem
                                            class="my-2"
                                            :orders="Object.values(arbitOrd)"
                                            is-child
                                        />
                                    </template>
                                </UAccordion>
                            </div>
                            <div class="" v-else>
                                <p>NO ORDERS</p>
                            </div>
                        </div>
                    </template>
                </UAccordion>
                <UAccordion
                    v-if="_bot.children?.length"
                    multiple
                    class="multiple"
                >
                    <template #label>Children</template>
                    <template #content>
                        <div class="flex flex-col gap-2 items- fs-14">
                            <a
                                target="_blank"
                                class="text-left btn btn-neutral btn-sm justify-start gap-2"
                                :href="`/bots/${child}`"
                                v-for="(child, i) in _bot.children ?? []"
                            >
                                Child
                                {{ alphabets[i] }}
                                {{ getChildPair(_bot, i) }}&nbsp;
                                <span><i class="fi fi-br-link-alt"></i></span>
                            </a>
                        </div>
                    </template>
                </UAccordion>
            </div>
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import { useAppStore } from "@/src/stores/app";
import { sleep } from "@/src/common";
import { SITE, alphabets, arbitTypes } from "~/utils/constants";
import { IObj } from "@/src/common";
import { storeToRefs } from "pinia";
import { useTuFetch, api } from "~/utils/api";
import { clearBotOrders, listToOpt, activateBot } from "~/utils/funcs";
const { strategies, platforms } = storeToRefs(useAppStore());

enum EOrder {
    all,
    win,
    lose,
}
const _bot = ref<IObj>(),
    menuOpen = ref(false),
    modalOpen = ref(false),
    orders = ref<IObj[]>([]),
    orderType = ref<EOrder>(EOrder.all);

const route = useRoute();
const id = ref(route.params.id);
const sellOrders = ref<IObj[]>([]);

const moreInfo = [{ label: "More info", content: "Lorem Ipsum" }];

const { data, error } = await useTuFetch<any>("/bots/" + id.value, {
    watch: [id],
});
if (error.value) {
    console.log(error.value.data);
    const msg = error.value.data;
    throw showError({
        statusCode: error.value?.statusCode,
        statusMessage: msg?.includes("tuned:")
            ? msg.replace("tuned:", "")
            : error.value.statusMessage,
    });
}
const getChildPair = (bot: IObj, i: number) => {
    return i == 0 ? [bot.B, bot.A] : i == 1 ? [bot.C, bot.B] : [bot.C, bot.A];
};
const filterOrders = (val: any[], oType?: EOrder) => {
    let _orders: IObj[] = [];
    const filter = oType == undefined;

    if (!_bot.value) return _orders;
    oType = oType ?? orderType.value;

    if (_bot.value.type == "normal") {
        _orders = val.filter((el: IObj) =>
            oType == EOrder.win
                ? el.profit >= 0
                : oType == EOrder.lose
                ? el.profit < 0
                : true
        );
    } else {
        _orders = val.filter((el) => {
            //console.log({ el });
            const ord = el.c;
            const profit = ord?.profit ?? 0;
            return oType == EOrder.win
                ? profit >= 0
                : oType == EOrder.lose
                ? profit < 0
                : true;
        });
    }
    if (filter) {
        orders.value = _orders;
        console.log(orders.value?.length);
    }
    return _orders;
};

onMounted(() => {
    const bot = data.value;
    _bot.value = bot;
    //setOrders(bot.orders);
});

const allOrders = ref<IObj[]>([]);

watch(
    [orderType, allOrders],
    (val) => {
        filterOrders(allOrders.value);
    },
    { immediate: true, deep: true }
);
watch(_bot, async (val, oval) => {
    //console.log(val?.orders)
    if (!val?.orders){allOrders.value = []}
    if (val?.orders && !oval) {
        const limit = 100;
        const totalPages = Math.ceil(val.orders / limit);
        const { orders } = val;

        for (let page = 1; page <= totalPages; page++) {
            await sleep(500);
            try {
                const res = await api().get("/orders", {
                    params: {
                        limit,
                        bot: val._id,
                        page,
                    },
                });
                allOrders.value.push(...res.data)
                // res.data.on("data", (chunk) => {
                //     console.log(JSON.parse(chunk));
                // });
            } catch (e: any) {
                console.log(e);
                break;
            }
        }

       
    }
});
</script>
