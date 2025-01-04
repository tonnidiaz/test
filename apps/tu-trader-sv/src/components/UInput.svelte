
<input autocomplete="on" bind:value={value} class="{defClass}" {...props}/>

<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";


interface IProps extends HTMLInputAttributes{value?: any; override?: string;}

let {override = "", value = $bindable(),...props}: IProps = $props()
const defClass = override.split(" ").find((el) => el == "class")
    ? ""
    : "input input-bordered input-sm";


</script>
