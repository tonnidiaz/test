<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLLabelAttributes } from "svelte/elements";

    interface IProps extends HTMLLabelAttributes {
        label?: Snippet | string;
        labelClass?: string;
        labelStyle?: string;
    }

    let {
        label,
        labelClass = "",
        children,
        class: _class,
        labelStyle,
        ...props
    }: IProps = $props();
</script>

<label class={"label block " + _class} {...props}>
    <div class={`mb-1 ml-1 ${labelClass}`} style={labelStyle}>
        {#if typeof label == "string"}
            {label}
        {:else}
            {@render label?.()}
        {/if}
    </div>
    {@render children?.()}
</label>
