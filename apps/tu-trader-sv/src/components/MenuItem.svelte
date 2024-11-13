<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";

    interface IProps extends HTMLAttributes<any> {
        to?: string;
        title?: string;
        innerClass?: string;
        icon?: string;
    }
    const {
        to,
        innerClass,
        children,
        title,
        icon,
        class: _class,
        ...props
    }: IProps = $props();
</script>

<li class={"tooltip tooltip-right " + _class} data-tip={title} {...props}>
    {#if to}
        <nuxt-link {to} class={`${innerClass}`}>
            {#if icon}
                <i class={icon}></i>
            {/if}
            {@render children?.()}
        </nuxt-link>
    {:else}
        <span class={`${innerClass}`}>
            {#if icon}
                <i class={icon}></i>
            {/if}
            {@render children?.()}
        </span>
    {/if}
</li>
