<script lang="ts">

    import { parseDate } from "@cmn/utils/functions";
    let ts = $state(parseDate())

    let name = $state()

    const sayHi = async (e: any)=>{
        try {
            const r = await fetch("/api/hello", {method: "post", body: JSON.stringify({name})})
            const res = (await r.json());
            alert(JSON.stringify(res))
        } catch (err) {
            console.log(err);
        }
    }
</script>
<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<p><b>Timestamp:</b>&nbsp;{ts}</p>
<div class="flex flex-col w-40">
    <button onclick={_=> ts = parseDate()} class="btn btn-primary button">Refresh timestamp</button>
<input placeholder="Your name..." bind:value={name} class="input input-bordered input-sm"/>
<button onclick={sayHi} class="btn btn-primary button btn-sm">Say hi</button>

</div>
