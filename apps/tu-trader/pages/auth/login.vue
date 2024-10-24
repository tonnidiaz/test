<template>
    <div>
        <TMeta :title="`Login - ${SITE}`"/>
        <div class="flex items-center justify-center w-100p h-80vh" >
            <UForm :state="formState" @submit="submitForm">
                <fieldset class="formset m-auto border-card border-1 p-4 pb-4">
                    <legend class="text-primary text-xl text-cente"><NuxtLink to="/">{{SITE}}</NuxtLink></legend>
                    <h2 class="text-cente my-3 fw-6">Login</h2>
                    <div class="mt-1 flex flex-col gap-2">
                        <UFormGroup label="Email/Username">
                            <UInput placeholder="Enter email or username..." required v-model="formState.username"/>
                        </UFormGroup>
                        <UFormGroup label="Password">
                            <UInput :ui="{ icon: { trailing: { pointer: '' } } }" placeholder="Enter password..." :type="passType" required v-model="formState.password">
                            <template #trailing>
                                <span class="pointer" @click="()=>{
                                    console.log('object');
                                    passType == 'text' ? setPassType('password') : setPassType('text')}">
                                    <i v-if="passType == 'password'" class="fi fi-rr-eye"></i>
                                    <i v-else class="fi fi-rr-eye-crossed"></i>
                                </span>
                            </template>
                            </UInput>
                        </UFormGroup>
                        <div v-if="err.length" class="ml-2 text-whit fs-12 text-center text-error"><p >{{ err?.replace("tuned:", "")}}</p></div>
                        <UFormGroup class="mt-1">
                            <UButton :disabled="!formState.username?.length || !formState.password?.length" class="w-full btn-neutral" type="submit" >Login</UButton>
                        </UFormGroup>
                        <UFormGroup>
                            <p class="fs-14 text-center">Or <NuxtLink class="text-primary" to="/auth/signup">Create account</NuxtLink></p>
                        </UFormGroup>
                    </div>
                </fieldset>
            </UForm>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { type IObj } from '@repo/common/src/utils/interfaces';
import { useUserStore } from '@/src/stores/user';
import { localApi } from '~/utils/api';
import { STORAGE_KEYS, SITE } from '~/utils/constants';

    const btnDisabled = ref(false), setBtnDisabled = (v: boolean)=> btnDisabled.value = v;
    const passType = ref("password"), err = ref(""), setPassType = (v: string) => passType.value = v, setErr = (v: string) => err.value = v;
    const route = useRoute()
    const { setUser } = useUserStore()
    const formState  = reactive<IObj>({
        
    })

    const submitForm = async (e:any) => { 

        try{
            setErr("")
            setBtnDisabled(true)
            
            const formData = formState
            console.log(formData);
            const res = await localApi().post('/auth/login', formData)
            console.log(res.data);
            setUser(res.data.user)
            localStorage.setItem(STORAGE_KEYS.authTkn, res.data.token)
            setTimeout(()=>{setBtnDisabled(false)}, 1500)

            location.href = route.query.red as string ?? "/"

        }catch(e: any){
            console.log(e)
            setBtnDisabled(false)
            const _err = typeof e.response?.data == "string" && e.response?.data?.startsWith("tuned:") ? e.response.data.replace("tuned:", "") : "Something went wrong"
            setErr(_err)
            
        }
     }

    definePageMeta({layout: 'blank' as any})
</script>