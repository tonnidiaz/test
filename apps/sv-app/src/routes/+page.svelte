<script>
    import "@/styles/main.scss"
    import { sayHi } from "@ts/utils/consts";

</script>
<h1>Welcome to SvelteKit {1 / 5}</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<button onclick={_=> sayHi("Tonni")}>Say hi</button>
