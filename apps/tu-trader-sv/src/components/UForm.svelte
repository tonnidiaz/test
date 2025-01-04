
    <form onsubmit={_onSubmit} {...props}>
        {@render children?.()}
    </form>

<script lang="ts">
import type {HTMLFormAttributes} from 'svelte/elements'

interface IProps extends HTMLFormAttributes {state?: any}

let {children, onsubmit,...props} : IProps = $props()
const _onSubmit = async (e: any)=>{
    e.preventDefault()
    const btns = [...e.target.querySelectorAll('button[type=submit]')]
    btns.forEach((btn: any)=>{
        btn.disabled = true})
        await onsubmit?.(e)
    btns.forEach((btn: any)=>btn.disabled = false)
}
</script>