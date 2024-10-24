"use client"

import React, { HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, useEffect, useState } from 'react';

interface Props extends TextareaHTMLAttributes<{}> {value?: any; override?: string; onChange?: (v: any)=>any}
const UTextarea: React.FC<Props> = ({ value, override = "", onChange, className, ...props }) => {
    const defClass = override.split(" ").includes("class") ? "" : "input input-bordered input-sm";
    const [_value, setValue] = useState(value);

    useEffect(() => {
        setValue(value);
    }, [value]);

    const handleChange = (event) => {
        setValue(event.target.value);
        onChange?.call(this, event.target.value)
        // Emit the change (in a parent component, you'd handle this)
        // For example: onChange(event.target.value);
    };

    return (
        <textarea style={{resize: 'both'}} onChange={e=>{
            handleChange(e)
        }} className={"textarea textarea-bordered " + className} {...props} value={_value}></textarea>
    );
};

export default UTextarea;