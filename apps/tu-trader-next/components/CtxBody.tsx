import React, { useEffect, useRef, useState } from 'react';
import $ from 'jquery';

interface Size {w: number, h: number}
interface Props extends React.HTMLAttributes<{}>{size: Size; setSize:(v: Size)=>any; setMenu?: (val: HTMLUListElement) => any;}

const CtxBody: React.FC<Props> = ({ size, setMenu, children, setSize, className, ...props }) => {
    const menuRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (menuRef.current) {
            const w = $(menuRef.current).width() || 0;
            const h = $(menuRef.current).height() || 0;
            setSize({ w, h });
            setMenu?.call(this,menuRef.current);
        }
    }, [menuRef, setMenu]);

    return (
        <ul ref={menuRef} style={{ whiteSpace: 'nowrap' }} className={"dropdown-content menu divide-y divide-neutral p-1 fixed z-[999] bg-base-100 shadow-md border-card border-1 br-6 " + className} {...props}>
            {children}
        </ul>
    );
};

export default CtxBody;