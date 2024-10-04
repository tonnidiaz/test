<template>
    <div>
        <div class="p-6">
            <fieldset class="fieldset card-border w-500px">
                <legend><h1>Form page</h1></legend>
                <p>{{ name }}</p>
                <form action="">
                    <Input
                        v-model="name"
                        placeholder="enter your first name"
                        label="First name"> 
                    <template #prefix>
                        <i class="material-icons">search</i>
                    </template>
                    <template #suffix>
                        <Button>
                                       <i class="material-icons">tune</i>
                        </Button>
             
                    </template>
                    </Input>

                   
<button class="btn  btn-outline btn-success btn-sm">Submit</button>
                </form>
            </fieldset>
        </div>
    </div>
</template>

<script setup lang="ts">
const name = ref("");
</script>
