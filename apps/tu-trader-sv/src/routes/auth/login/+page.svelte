<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import TuLink from "@/components/TuLink.svelte";
    import UButton from "@/components/UButton.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import { localApi } from "@/lib/api";
    import { STORAGE_KEYS, SITE } from "@/lib/constants";
    import { setUser } from "@/stores/user.svelte";
    import type { IObj } from "@cmn/utils/interfaces";
    import { page } from "$app/stores";
    import { handleErrs, isTuError } from "@cmn/utils/functions";

    let btnDisabled = $state(false),
        setBtnDisabled = (v: boolean) => (btnDisabled = v);
    let passType = $state<"password" | "text">("password"),
        err = $state(""),
        setPassType = (v: typeof passType) => (passType = v),
        setErr = (v: string) => (err = v);

    let formState = $state<IObj>({});

    const submitForm = async (e: any) => {
        try {
            setErr("");
            setBtnDisabled(true);

            const formData = formState;
            console.log(formData);
            const res = await localApi().post("/auth/login", formData);
            console.log(res.data);
            setUser(res.data.user);
            localStorage.setItem(STORAGE_KEYS.authTkn, res.data.token);
            setTimeout(() => {
                setBtnDisabled(false);
            }, 1500);

            const red = $page.url.searchParams.get("red");
            location.href = red || "/";
        } catch (e: any) {
            handleErrs(e);
            setBtnDisabled(false);
            const _err = isTuError(e) || "Something went wrong";
            setErr(_err);
        }
    };
</script>

<div>
    <TMeta title={`Login - ${SITE}`} />
    <div class="flex items-center justify-center w-100p h-80vh">
        <UForm state={formState} onsubmit={submitForm}>
            <fieldset class="formset m-auto border-card border-1 p-4 pb-4">
                <legend class="text-primary text-xl text-cente"
                    ><TuLink to="/">{SITE}</TuLink></legend
                >
                <h2 class="text-cente my-3 fw-6">Login</h2>
                <div class="mt-1 flex flex-col gap-2">
                    <UFormGroup label="Email/Username">
                        <UInput
                            placeholder="Enter email or username..."
                            required
                            bind:value={formState.username}
                        />
                    </UFormGroup>
                    <UFormGroup label="Password">
                        <UInput
                            placeholder="Enter password..."
                            type={passType}
                            required
                            bind:value={formState.password}
                        >
                            {#snippet trailing()}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <span
                                    class="pointer"
                                    onclick={() => {
                                        console.log("object");
                                        passType == "text"
                                            ? setPassType("password")
                                            : setPassType("text");
                                    }}
                                >
                                    {#if passType == "password"}
                                        <i class="fi fi-rr-eye"></i>
                                    {:else}
                                        <i class="fi fi-rr-eye-crossed"></i>
                                    {/if}
                                </span>
                            {/snippet}
                        </UInput>
                    </UFormGroup>
                    {#if err.length}
                        <div
                            class="ml-2 text-whit fs-12 text-center text-error"
                        >
                            <p>{err?.replace("tu:", "")}</p>
                        </div>
                    {/if}

                    <UFormGroup class="mt-1">
                        <UButton
                            disabled={!formState.username?.length ||
                                !formState.password?.length}
                            class="w-full btn-primary"
                            type="submit">Login</UButton
                        >
                    </UFormGroup>
                    <UFormGroup>
                        <p class="fs-14 text-center">
                            Or <TuLink class="text-primary" to="/auth/signup"
                                >Create account</TuLink
                            >
                        </p>
                    </UFormGroup>
                </div>
            </fieldset>
        </UForm>
    </div>
</div>
