<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import TuTeleport from "./TuTeleport.svelte";

    interface IProps extends HTMLAttributes<any> {
        toggler?: Snippet;
        open?: boolean;
    }
    let {
        children,
        toggler: trigger,
        open = $bindable(false),
        class: _class,
        ...props
    }: IProps = $props();

    let menuRef: HTMLDivElement = $state();
    let togglerRef: HTMLDivElement;
    let pos = $state({ x: 0, y: 0 });

    const otherClasses = "menu menu-menu menu-sm text-left justify-start shadow"

    const toggleMenu = (e: any) => {
        e.preventDefault();
        updatePos({});
        open = true;
        updateListener();
    };

    const updateListener = () => {
        document.body.removeEventListener("mouseup", onDocClick);
        document.body.addEventListener("mouseup", onDocClick);
    };

    const onDocClick = (e: any) => {
        const _menu = menuRef;

        if (_menu && !_menu.contains(e.target)) {
            open = false;
        }
    };

    const updatePos = ({ xOut, yOut }: { xOut?: boolean; yOut?: boolean }) => {
        const winSz = { w: window.innerWidth, h: window.innerHeight };
        // Get position and size of toggler
        const togglerRect = togglerRef.getBoundingClientRect();
        let xInPerc = togglerRect.left + togglerRect.width / 2; // togglerRect.left / winSz.w * 100;
        xInPerc = (xInPerc / winSz.w) * 100;
        let yInPerc = togglerRect.top + togglerRect.height / 2;
        yInPerc = (yInPerc / winSz.h) * 100;

        // Update menu position
        pos = { x: xInPerc, y: yInPerc };
    };
    onMount(() => {});

    $effect(() => {
        if (menuRef) {
            const winSz = { w: window.innerWidth, h: window.innerHeight };
            const menuRect = menuRef.getBoundingClientRect();

            const menuRightInPerc = (menuRect.right / winSz.w) * 100;
            const menuBottomInPerc = (menuRect.bottom / winSz.h) * 100;
            const xOut = menuRightInPerc > 100;
            const yOut = menuBottomInPerc > 100;
            if (xOut || yOut) {
                menuRef.style.transform = `translate(${xOut ? -100 : 0}%, ${yOut ? -100 : 0}%)`;
            }
        }
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div>
    <div bind:this={togglerRef} class="menu-trigger w-fit" onclick={toggleMenu}>
        {@render trigger?.()}
    </div>
    <!-- <p>{JSON.stringify(pos)}</p> -->
    {#if open}
    <TuTeleport to="#ctx-overlay">
        <div
            style={`left: ${pos.x}%; top: ${pos.y}%`}
            bind:this={menuRef}
            class={`ctx-menu menu border-1 border-card rounded-md p-2 bg-base-200 z-[60] ${otherClasses} ` +
                _class}
            {...props}
        >
            {@render children?.()}
        </div>
    </TuTeleport>
        
    {/if}
</div>

<style lang="scss" scoped>
    .ctx-menu {
        position: fixed;
    }
</style>
