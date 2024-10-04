<template>
    <div class="p-4">
        <div>
            <!-- The button to open modal -->
            <label for="my_modal_7" class="btn">open modal</label>

            <!-- Put this part before </body> tag -->
            <input type="checkbox" id="my_modal_7" class="modal-toggle" />
            <div class="modal">
                <div class="modal-box">
                    <input
                        type="search"
                        placeholder="Search"
                        class="input input-bordered"
                    />
                </div>
                <label class="modal-backdrop" for="my_modal_7">Close</label>
            </div>
            <input class="checkbox" type="checkbox" />
        </div>
        <TuModal>
            <template class="btn" #toggler> HELLO </template>
            <template #content>WORD</template>
        </TuModal>

        <TuSelect
            class="flex-1"
            searchable
            innerHint="Search nets..."
            placeholder="Coins"
            :options="nets.map(el=> ({label: el.coin, value: el.coin}))"
            v-model="currCoin"
            required
            
        />
        <TuSelect
            class="flex-1 my-3"
            searchable
            innerHint="Search nets..."
            placeholder="Networks"
            :options="nets.find(el=> el.coin == currCoin)?.nets?.map(el=> ({label: el.chain, value: el}))"
            v-model="currNet"
            required
            
        />

        <span class="loading loading-dots loading-sm m-auto"></span>
        <div class="my-3">
           Netsss: {{nets.find(el=> el.coin == currCoin)?.nets?.map(el=> ({label: el.chain, value: el}))}}
        </div>
        <div class="m-4">
            <UCheckbox label="SELECT ENABLED" v-model="selectEnabled"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import { el } from "date-fns/locale";
import { useAppStore } from "@/src/stores/app";

const appStore = useAppStore();
const { strategies, platforms } = storeToRefs(appStore);
const currCoin = ref<string>()
const nets = ref<IObj[]>([])
const currNet = ref<IObj>({})

const selectEnabled = ref(true)
const formState = reactive<IObj>({
    strategy: 8,
});



onMounted(()=>{
    const d = JSON.parse(localStorage.getItem('dummyData')!)
    nets.value = d.slice(0,100)
})
</script>
<style lang="scss"></style>
