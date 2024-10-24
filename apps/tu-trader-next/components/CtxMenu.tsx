import React, { useState, useRef, useEffect } from 'react';
import CtxBody from './CtxBody';
import ReactDOM from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import $ from 'jquery'
import { sleep } from '@cmn/utils/functions';
interface Props extends React.HTMLAttributes<{}> {open: boolean; setOpen: (v: boolean)=> any; toggler: React.ReactNode}

const CtxMenu: React.FC<Props> = ({ open, setOpen, children, toggler, ...props }) => {
    const [isOpen, setIsOpen] = useState(open);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)

    const menuRef = useRef<HTMLDivElement>();
    const [menu, setMenu] = useState<HTMLUListElement>();
    const togglerRef = useRef<HTMLDivElement>();

    const pathname = usePathname()

    useEffect(()=>{
        updateListener()
    }, [])
    useEffect(()=>{
        setMenuPos()
        
    }, [size])

    useEffect(()=>{
        setIsOpen(false)
    }, [pathname])
    
    const setMenuPos = async () => {
        // await sleep(1)
        let { x: _x, y: _y } = pos;
    
        let { w, h } = size;
        if (!menu) return
        const {clientHeight, clientWidth} = menu
        w = clientWidth ?? w
        h = clientHeight ?? h
        // console.log({w, h}, $(menu).height(), pos);
        const rightPos = _x + w;
        const bottomPos = _y + h;
    
        let deltaW = window.innerWidth - _x;
        let deltaH = window.innerHeight - _y;
    
        if (rightPos > window.innerWidth) {
            let newLeft = _x - w; //window.innerWidth - size.w - deltaW;
            _x = newLeft;
        }
    
        if (bottomPos > window.innerHeight) {
            let newTop = _y - h// window.innerHeight - h - deltaH;
            _y = newTop;
        }
    
        setX((_x / window.innerWidth) * 100);
        setY((_y / window.innerHeight) * 100);
    };
    const toggleMenu = async (e: any) => {
        setIsOpen(true)
    
        e.preventDefault();
        e.stopPropagation();
    
        const toggler: HTMLDivElement = togglerRef.current!;
        const togglerRect = toggler.getBoundingClientRect();
    
        const clientX = togglerRect.left; //winSize.w - (togglerSize.w ?? 0 / 2);
        const clientY = togglerRect.top; //winSize.h - (togglerSize.h ?? 0 / 2);//{ clientX, clientY } = e;
        let _pos = {
            x: clientX + togglerRect.width / 2,
            y: clientY + togglerRect.height / 2,
        };
        setPos(_pos);
    
        setMenuPos();
        updateListener()
    };
    const updateListener = () => {
        document.body.removeEventListener("mouseup", onDocClick);
        document.body.addEventListener("mouseup", onDocClick);
    };
    
    const onDocClick = (e: any) => {
        const _menu = menuRef.current;
        if (_menu && !_menu.contains(e.target)) {
           setIsOpen(false)
        }
    };

    return (
        <div {...props}>
            <div ref={togglerRef as any} className="toggler pointer" onClick={toggleMenu}>
                {toggler}
            </div>
            {!isOpen ? (
                <div ref={menuRef as any}>
                    <CtxBody size={size} setSize={(v) => setSize(v)} hidden className='hidden'>
                    {children}
                </CtxBody>
                </div>
                
            ) : ReactDOM.createPortal(<div style={{  top: `${y || 0}%`, left: `${x || 0}%`, position: 'fixed' }}>
                <div ref={menuRef as any}>
                    <CtxBody setMenu={setMenu}  size={size} setSize={v=> setSize(v)}>
                        {children}
                    </CtxBody>
                </div>
                    
                </div>, document.getElementById("ctx-overlay")!)
                
            }
        </div>
    );
};

export default CtxMenu;