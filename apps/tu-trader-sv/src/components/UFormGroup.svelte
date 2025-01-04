    <label class={"label block " + _class} {...props}
        ><div class={`mb-1 ml-1 ${labelClass}`}>
            {#if typeof label == 'string'}
                {label}
            {:else}
            {@render label?.()}
            {/if}
        {@render children?.()}
    </label>

<script lang="ts">
    import type { Snippet } from "svelte";
    import type{ HTMLLabelAttributes} from 'svelte/elements'

interface IProps extends HTMLLabelAttributes {label?: Snippet | string; labelClass?: string;}

let {label, labelClass= "", children, class: _class, ...props}: IProps = $props()
</script>
