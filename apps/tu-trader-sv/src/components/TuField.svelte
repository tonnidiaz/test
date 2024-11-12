<input class="input input-bordered" bind:value={value} {...props}>
<script lang="ts">
    let {value = $bindable(), ...props } = $props()
</script>