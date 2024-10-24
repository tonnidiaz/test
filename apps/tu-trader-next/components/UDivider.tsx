const UDivider = ({className, ...props}) => {
    return ( <div {...props} className={"devider border-1 border-card w-100 " + className} ></div> );
}
 
export default UDivider;