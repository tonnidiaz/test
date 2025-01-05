<script lang="ts">
    import { handleErrs } from "@cmn/utils/functions";
    import { onMount } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    interface IProps extends HTMLButtonAttributes {
        loading?: boolean;
        showLoader?: boolean;
    }
    let {
        children,
        class: _class,
        loading = $bindable(),
        type: _type = 'button',
        showLoader = true,
        onclick,
        ...props
    }: IProps = $props();
    let el = $state<HTMLButtonElement>();
    onMount(() => {
        el.addEventListener("click", handleClick);
        interceptFormSubmit(el);
        return () => el.removeEventListener("click", handleClick);
    });

    let submitHandler = $state<Function>();

    async function interceptFormSubmit(btn: HTMLButtonElement) {
        try {
            if (_type == "submit") {
                const form = btn.form;
                if (!form) {
                    console.log("No form");
                    return;
                }
                // console.log(btn);

                const listener = async (e) => {
                    e.preventDefault();
                    const formSubmit = btn.form.onsubmit;
                    if (formSubmit && !submitHandler) {
                        submitHandler = formSubmit;

                        btn.form.onsubmit = (e) => e.preventDefault();
                        btn.form.onsubmit = undefined;
                    } else if (submitHandler) {
                        console.log("Custom submit");
                    }
                    btn.form.removeEventListener("submit", listener);
                };
                btn.form.addEventListener("submit", listener);
                btn.form.addEventListener("submit", async (e) => {
                    console.log("Custom listener");
                    const event = new Event("submit", {
                        bubbles: true,
                        cancelable: true,
                    });
                    // Dispatch the event on the form element
                    const isDefaultPrevented =  true//!btn.form.dispatchEvent(event);
                    if (isDefaultPrevented)
                        // Invoke the onsubmit callback
                            await caller(
                                async () => await submitHandler.call(btn.form, event)
                            );
                });
              
            }
        } catch (err) {
            handleErrs(err);
        }
    }

    async function caller(cb: Function) {
        try {
            loading = true;
            el.disabled = true;
            await cb();
        } catch (err) {
            handleErrs(err);
        } finally {
            // console.log('Finally');
            if (!el) return
            el.disabled = false;
            loading = false;
        }
    }
    async function handleClick(this: HTMLButtonElement, ev: MouseEvent) {
        await caller(async () => await onclick?.(ev as any));
    }
</script>

<button bind:this={el} class={`btn btn-sm ` + _class} type={_type} {...props}
    >{@render children?.()}

    {#if (showLoader && (loading || _class?.includes("btn-loading")))}
        <span class="loading loading-spinner loading-sm"></span>
    {/if}
</button>
