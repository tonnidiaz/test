import { IObj } from "@cmn/utils/interfaces";
import UFormGroup from "./UFormGroup";
import UInput from "./UInput";
import React, { useEffect, useState } from "react";

interface Props {mode?: "Create" | "Edit";
    value: IObj;
    onChange: (v: IObj) => any;
    bot?: IObj;
    onDone?: (bot: IObj) => any;}

const TriArbitForm: React.FC<Props> = (props) => {
    const [formState, setFormState] = useState<IObj>({})

    useEffect(()=>{
        props.onChange(formState)
    },[formState])
    
    const setFormStateField = (key: string, v: any) =>{
        const s = formState
        s[key] = v
        setFormState(s)
    }

    return ( <div
        className="grid sm:grid-cols-3 gap-3 items-end my-1 mt-2"
    >
        <UFormGroup label="Coin A" className="fs-14">
            <UInput
                required
                value={formState.A}
                onChange={v=> setFormStateField("A", v)}
                placeholder="e.g USDT"
                title="The main QUOTE, e.g USDT"
                type="string"
                disabled={props.mode == 'Edit' &&
                    formState.orders?.length}
            />
        </UFormGroup>
        <UFormGroup label="Coin B" className="fs-14">
            <UInput
                required
                value={formState.B}
                onChange={v=> setFormStateField("B", v)}
                placeholder="e.g USDC"
                title="The QUOTE for pair B, e.g USDC"
                type="string"
                disabled={props.mode == 'Edit' &&
                    formState.orders?.length}
            />
        </UFormGroup>
        <UFormGroup label="Coin C" className="fs-14">
            <UInput
                required
                value={formState.C}
                onChange={v=> setFormStateField("C", v)}
                placeholder="e.g APEX"
                title="The BASE for pair C, e.g APEX"
                type="string"
                disabled={props.mode == 'Edit' &&
                    formState.orders?.length}
            />
        </UFormGroup>
    </div>
    );
}
 
export default TriArbitForm;
