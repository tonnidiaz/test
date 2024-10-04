<template>
    <div>
        <t-meta :title="`App config - ${SITE}`" />
        <div class="sm:p-4 p-2">
            <tu-card
                class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <div class="flex gap-3 justify-center mb-3">
                    <h1 class="text-xl">App config</h1>
                </div>
                <UForm
                    :on-submit="handleSubmit"
                    class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center"
                >
                <div class="">
                     <UCheckbox
                        v-model="formState.fetch_orderbook_enabled"
                        label="Fetch orderbooks"
                    />
                    
                </div>
                   <UFormGroup label="Book fetch interval">
                        <TuSelect :options="selectIntervals" v-model="formState.book_fetch_interval"/>
                    </UFormGroup>
                    <div class="my-3 grid gap-3 grid-cols-2">
                        <UButton class="btn-primary w-full" type="submit"
                            >Save config</UButton
                        >
                        <UButton @click="delBooks" class="btn-error w-full" type="button"
                            >Delete orderbooks</UButton
                        >
                    </div>
                </UForm>
            </tu-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { selectIntervals, SITE} from '~/utils/constants';
import { api, } from '~/utils/api';
import { IObj } from '@/src/common';

const formState = ref<IObj>({});

async function delBooks (e: any){
    e.currentTarget.disabled = true
    try {
        const conf = confirm("You sure u wan delete all books??")
        if (!conf) return console.log("AYT")
        console.log("DELETING...")
        const r = await api(true).post("/books/del")
        console.log("BOOKS DELETED")
    } catch (err) {
        console.log(err)
    }finally{ e.currentTarget.disabled = false}
}
async function handleSubmit(e: any) {
    try {
        let fd = { ...formState.value };
        const r = await api(true).post("/app/config", fd);
        console.log(r.data);
        alert('Config saved!!')
    } catch (err) {
        console.log(err);
    }
}
onMounted(async () => {
    //GET APP CONFIG
    try {
        const r = await api().get("/app/config");
        formState.value = r.data;
    } catch (error) {
        console.log(error);
    }
});
</script>
