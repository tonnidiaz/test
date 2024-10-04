<template>
    <div>
        <TMeta :title="`${username}'s bots - ${SITE}`" />
        <div class="sm:p-5 p-1">
            <h1 class="text-xl text-gray-200">My bots</h1>
            <div class="mt-5">
                <UFormGroup>
                     <UCheckbox label="Show all" v-model="_state.all"/> 
                </UFormGroup>
              
                <div
                    v-if="bots.length"
                    class="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3"
                >
                    <BotCard
                        v-for="bot in bots.filter(el => _state.all ? true : !el.is_child)"
                        :bot="bot"
                        :updateBot="updateBots"
                    />
                </div>
            </div>
        </div>
        <Teleport to="#floating-actions">
            <BotFormModal
                v-model="modalOpen"
                :onDone="(val) => userStore.setBots([val, ...bots])"
            >
                <template #toggler>
                    <div @click="()=> {modalOpen = true}"
                        class="btn btn-primary btn-sm justify-center items-center flex rounded rounded-full h-40px w-45px shadow shadow-lg fs-40"
                    >
                        <span class="fs-18"
                            ><i class="fi fi-br-plus"></i
                        ></span></div
                ></template>
            </BotFormModal>
        </Teleport>
    </div>
</template> 
<script setup lang="ts">
import { el } from "date-fns/locale";
import { useUserStore } from "~/src/stores/user";
import { useTuFetch } from "~/utils/api";

const _state = ref({all: false})
const userStore = useUserStore();
const { bots } = storeToRefs(userStore);

const route = useRoute();
const username = ref(route.params.username);
const modalOpen = ref(false);

const { data, error } = await useFetch<any>(
    BEND_URL + "/bots?user=" + username.value,
    {
        watch: [username],
    }
);
if (error.value) {
    const { statusCode } = error.value;
    console.log(error.value.statusCode);
    if (statusCode == 500) {
        console.log(error.value);
    } else {
        throw createError({
            statusCode: error.value?.statusCode,
            statusMessage: error.value.statusMessage,
        });
    }
}

const updateBots = (bot: IObj) => {
    const _bots = [...bots.value];
    const botIndex = _bots.findIndex((el) => {
        return (el._id ?? el.id) == (bot._id ?? bot.id);
    });
    _bots[botIndex] = bot;
    userStore.setBots(_bots);
};

onMounted(() => {
    userStore.setBots(data.value);
});
</script>
