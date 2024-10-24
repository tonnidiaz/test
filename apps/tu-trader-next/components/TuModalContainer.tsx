import React, { useRef, useEffect } from 'react';

interface Props extends React.HTMLAttributes<{}>{
    value: boolean; blank?: boolean; setValue?: (v: boolean)=> any
}
const TuModalContainer: React.FC<Props> = ({ value, blank = false, setValue: onValue, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    
    const open = value;

    const onDocClick = (ev) => {
        const modal = modalRef.current;
        const overlay = document.getElementById('ctx-overlay');
        const menus = document.querySelectorAll('.menu');
        if (!modal) return;
        const isChild = modal.contains(ev.target) || (overlay && overlay.contains(ev.target));
        if (!isChild && onValue && !([...menus].some(el => el.contains(ev.target)))) {
            onValue(false);
        }
    };

    const onOverlayClick = (ev) => {
        const modals = document.querySelectorAll('.tu-modal__cont');
        const menus = document.querySelectorAll('.menu');
        const isChild = [...modals].some(el => el.contains(ev.target)) || [...menus].some(el => el.contains(ev.target));
        if (!isChild && onValue) onValue(false);
    };

    useEffect(() => {
        const ctxOverlay = document.getElementById('ctx-overlay');
        ctxOverlay?.addEventListener('mouseup', onOverlayClick);

        document.addEventListener('mouseup', onDocClick);
        
        return () => {
            ctxOverlay?.removeEventListener('mouseup', onOverlayClick);
            document.removeEventListener('mouseup', onDocClick);
        };
    }, []);

    return (
        <div
            ref={modalRef}
            className={`tu-modal__cont ${!blank ? 'tu-modal-cont p-4 border-1 border-card br-10 params-area bg-base-100 shadow-lg' : ''} ${open ? 'open' : ''}`}
        >
            {children}
        </div>
    );
};

export default TuModalContainer;