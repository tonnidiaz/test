<script lang="ts">
    import jq from "jquery";

    import type { HTMLAttributes } from "svelte/elements";
    let menu = $state<HTMLUListElement>();
    const set = $state(false);

    interface IProps extends HTMLAttributes<any> {
        size: { w: number; h: number };
        setMenu: (val: any) => any;
    }

    let {
        class: _class,
        size = $bindable(),
        setMenu,
        children,
        ...props
    }: IProps = $props();

    $effect(() => {
        const v = menu;
        if (v) {
            const w = jq(v).width() ?? 0;
            const h = jq(v).width() ?? 0;
            size = { w, h };
            setMenu(v);
        }
    });
</script>

<ul
    bind:this={menu}
    style="white-space: nowrap;"
    class={"dropdown-content menu divide-y divide-neutral  p-1  fixed z-[999] bg-base-100 shadow-md border-card border-1 br-6 " +
        _class}
    {...props}
>
    {@render children?.()}
</ul>

<style lang="scss">
    .menu {
        * {
            white-space: nowrap;
        }
    }
</style>
