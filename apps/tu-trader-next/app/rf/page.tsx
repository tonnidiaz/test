"use client";
import TMeta from "@/components/TMeta";
import TuDatePicker from "@/components/TuDatePicker";
import TuSelect from "@/components/TuSelect";
import UButton from "@/components/UButton";
import UFormGroup from "@/components/UFormGroup";
import { SITE } from "@/utils/constants";
import { useBetterState } from "@/utils/hooks";
import React, { useEffect, useState } from "react";


const RFPage = () => {
    const [chick, setChick] = useState("Nkarhi");
    const [chicks, setChicks] = useState<string[]>([])
    const _chicks = ["Joey king", "Nkarhi", "Risima"];

    const name = useBetterState("Johny")
    const person = useBetterState({name: "Tonni", last: "Diaz", age: 29})
    useEffect(()=>{
        setTimeout(() => {
            setChicks(_chicks)
        }, 2000);
    }, [])

    useEffect(()=> {
    }, [chicks])
    return (
        <>
            <TMeta title={`Research Facility - ${SITE}`} />
            <div className="p-4 flex items-center justify-center w-100 h-100vh flex-col">
                <TuDatePicker value={{start: "2024-01-01 00:00:00", end: "2020-09-01 23:59:00"}}/>
                {/* <UFormGroup label="Chicks">
                    <TuSelect
                        options={chicks.map((e) => ({
                            label: e,
                            value: e,
                        }))}
                        value={chick}
                        setValue={setChick}
                        className="w-250px"
                    />
                </UFormGroup>
                <div className="mt-3">
                    <h4><b>Mine: </b>{chick}</h4>
                </div> */}
                <p>Name: {person.value.name}</p>
                <p>Last name: {person.value.last}</p>
                <p>Age: {person.value.age}</p>
                <UButton className="btn-primary" onClick={_=> {
                    person.value.age = 44
                }}>Change name</UButton>
            </div>
        </>
    );
};

export default RFPage;
