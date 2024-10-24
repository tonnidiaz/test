import { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<{}>{online?: boolean}
const UAvatar: React.FC<Props> = ({online, children, ...props}) => {
    return ( <div className={`avatar ring rounded-full ring-neutral w-25px h-25px flex items-center justify-center ring-offset-base-100 ring-offset-2 ${online != undefined ? (online ? 'online' : 'offline') : ''}`} {...props}>{children}</div> );
}
 
export default UAvatar;