    <div
        bind:this={modalRef}
        class={`tu-modal__cont ${!blank ? 'tu-modal-cont p-4 border-1 border-card br-10 params-area bg-base-100 shadow-lg' : ''} ${
            open ? 'open' : ''
        } ${_class}`}
        {...props}
    >
        {@render children?.()}
    </div>

<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import type {HTMLAttributes} from 'svelte/elements'

interface IProps extends HTMLAttributes<any> {open: boolean; blank?: boolean}

let {open = $bindable(false),children, blank = false, class: _class, ...props} : IProps = $props()
let modalRef: HTMLDivElement;

const _onDocClick = (ev) => {
    const modal = modalRef;
    const overlay = document.getElementById('ctx-overlay')
    if (!modal) return;
    const isChild = modal.contains(ev.target) || overlay?.contains(ev.target);
    if (!isChild) {
        open = false
        //$(modal!).removeClass("open");
        
    }
};
const _onOverlayClick = (ev: any)=>{
    const modals = document.querySelectorAll('.tu-modal__cont');
    const menus = document.querySelectorAll('.menu');
   
    const isChild = [...modals].some(el=> el.contains(ev.target)) || [...menus].some(el=> el.contains(ev.target))
    if (!isChild) open = false
}
onMount(() => {
    // document.removeEventListener("mouseup", _onDocClick);
    // document.addEventListener("mouseup", _onDocClick);
    const ctxOverlay = document.getElementById('ctx-overlay')
    ctxOverlay?.removeEventListener('mouseup', _onOverlayClick)
    ctxOverlay?.addEventListener('mouseup', _onOverlayClick)
});

onDestroy(()=>{
    const ctxOverlay = document.getElementById('ctx-overlay')
    ctxOverlay?.removeEventListener('mouseup', _onOverlayClick)
})
</script>
