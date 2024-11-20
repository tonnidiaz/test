<div>
    <TMeta title={`App config - ${SITE}`} />
    <div class="sm:p-4 p-2">
        <TuCard
            class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <div class="flex gap-3 justify-center mb-3">
                <h1 class="text-xl">App config</h1>
            </div>
            <UForm
                onsubmit={handleSubmit}
                class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center"
            >
            <div class="">
                 <UCheckbox
                    bind:value={formState.fetch_orderbook_enabled}
                     label="Fetch orderbooks"
                />
                
            </div>
               <UFormGroup label="Book fetch interval">
                    <TuSelect options={selectIntervals} bind:value={formState.book_fetch_interval}/>
                </UFormGroup>
                <div class="my-3 grid gap-3 grid-cols-2">
                    <UButton class="btn-primary w-full" type="submit"
                        >Save config</UButton
                    >
                    <UButton onclick={delBooks} class="btn-error w-full" type="button"
                        >Delete orderbooks</UButton
                    >
                </div>
            </UForm>
        </TuCard>
    </div>
</div>

<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import TuCard from "@/components/TuCard.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import { api, localApi } from "@/lib/api";
    import { selectIntervals, SITE } from "@/lib/constants";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";


let formState = $state<IObj>({});

async function delBooks (e: any){
    e.currentTarget.disabled = true
    try {
        const conf = confirm("You sure u wan delete all books??")
        if (!conf) return console.log("AYT")
        console.log("DELETING...")
        const r = await localApi(true).post("/books/del")
        console.log("BOOKS DELETED")
    } catch (err) {
        console.log(err)
    }finally{ e.currentTarget.disabled = false}
}
async function handleSubmit(e: any) {
    try {
        let fd = { ...formState };
        const r = await api(true).post("/app/config", fd);
        console.log(r.data);
        alert('Config saved!!')
    } catch (err) {
        console.log(err);
    }
}
onMount(async () => {
    //GET APP CONFIG
    try {
        const r = await localApi().get("/app/config");
        formState = r.data;
    } catch (error) {
        console.log(error);
    }
});
    
</script>