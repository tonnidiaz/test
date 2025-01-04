
    <div class={`avatar ring rounded-full ring-neutral w-25px h-25px flex items-center justify-center ring-offset-base-100 ring-offset-2 ${online != undefined ? (online ? 'online' : 'offline') : ''} ${_class}`} {...props}>

      {@render children?.()}
    </div>


<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";


    interface IProps extends HTMLAttributes<any>{online?: boolean; innerclass?: string}
const {online, children, class: _class, ...props} : IProps = $props()
</script>