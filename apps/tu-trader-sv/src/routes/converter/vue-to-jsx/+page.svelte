<div class="p-3">
    <TMeta title={`Vue to jsx - ${SITE}`} />
    <div class="p-3 border-1 border-card br-4">
        <h2 class="my-4 fs-24 fw-6">Vue to JSX converter</h2>
        <UForm onsubmit={handleSubmit}>
            <UFormGroup>
                {#snippet label()}
                    Vue code
                {/snippet}

                <UTextarea value={vueCode}
                    onchange={(e) => {
                        const val = (e.target as any).value
                        vueCode = (val);
                        sessionStorage.setItem(sessionStorageKey, val);
                    }}
                    placeholder="Enter vue code..."
                />
            </UFormGroup>
            <UCheckbox label="Full code" bind:value={full}/>
            <UButton class="btn-primary" type="submit">
                Convert
            </UButton>
            <div class="my-1"></div>
            <UFormGroup>
                {#snippet label()}
                <div class="flex items-center gap-3">
                    <span>Svelte code</span>
                    <button aria-label="copy button" type="button"
                onclick={() => {
                    copy(false);
                }}
                class="btn pointer rounded-full btn-md btn-ghost"
                ><i class="fi fi-rr-copy"></i
            ></button>
                </div>
                {/snippet}
                <UTextarea readonly value={svCode}
                    placeholder="Result JSX code"
                />
            </UFormGroup>
        </UForm>
        
    </div>
</div>

<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import UButton from "@/components/UButton.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UTextarea from "@/components/UTextarea.svelte";
    import { SITE } from "@/lib/constants";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { dev } from "$app/environment";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import { localApi } from "@/lib/api";

    const sessionStorageKey = `${$page.url.pathname}-code`;
    let vueCode = $state(""), svCode = $state(""), full = $state(false);

    $inspect(vueCode).with((type, val)=>{
        if (type == 'update'){
            console.log({vueCode: val})
            sessionStorage.setItem(sessionStorageKey, val);
        }
    })

    const handleSubmit = async (e) => {
        console.log("Submitting...");
        try {
            svCode = ("");
            const res = await localApi().post("/convert/vue-to-sv", {
                code: vueCode,full
            });
            svCode = (res.data);
            console.log("DONE");
        } catch (err) {
            console.log(err);
        }
    };
        const copy = (_alert = false) => {
                try {
                    navigator.clipboard.writeText(svCode);
                    const msg = "COPIED TO CLIPBORAD";
                    if (_alert) {
                        alert(msg);
                    }
            
                    console.log(msg);
                } catch (e) {
                    console.log(e);
                }
            };

            const sayHi = () => { console.log("Fuuuuuuuck!!") }
    onMount(()=>{
        const code = sessionStorage.getItem(sessionStorageKey);
        if (code) vueCode = (code);
    })
</script>