<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<div class="p-5 flex flex-col gap-2">
<h2>I am a {me.age} year old {me.name}</h2>
<input placeholder="Username" bind:value={me.name} class="input input-bordered input-sm w-200px"/>
<UButton class="btn-primary w-150px" onclick={_=>cnt++}>Count: [{cnt}]</UButton>
</div>
<script lang="ts">
    import UButton from "@/components/UButton.svelte";
    import { untrack } from "svelte";

    let me: {name: string; age: number} = $state({name: "Thomas", age: 23});
    let cnt = $state(0)
    $effect(()=>{
        console.log("Name changed to", me.name);
        untrack(()=>{
            cnt += 1
        })
    })
</script>
