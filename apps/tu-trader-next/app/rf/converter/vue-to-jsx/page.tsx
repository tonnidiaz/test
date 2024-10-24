"use client";
import TMeta from "@/components/TMeta";
import UButton from "@/components/UButton";
import UForm from "@/components/UForm";
import UFormGroup from "@/components/UFormGroup";
import UTextarea from "@/components/UTextarea";
import { localApi } from "@/utils/api";
import { SITE } from "@/utils/constants";
import { sleep } from "@/utils/funcs";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const VueToJsxPage = () => {
    const [vueCode, setVueCode] = useState("");
    const [jsxCode, setJsxCode] = useState("");

    const sessionStorageKey = `${location.pathname}-code`;

    useEffect(() => {
        console.log({sessionStorageKey});
        const code = sessionStorage.getItem(sessionStorageKey);
        if (code) setVueCode(code);
    }, []);

    const handleSubmit = async (e) => {
        console.log("Submitting...");
        try {
            setJsxCode("");
            const res = await localApi().post("/convert/vue-to-jsx", {
                code: vueCode,
            });
            setJsxCode(res.data);
            console.log("DONE");
        } catch (err) {
            console.log(err);
        }
    };
        const copy = (_alert = false) => {
                try {
                    navigator.clipboard.writeText(jsxCode);
                    const msg = "COPIED TO CLIPBORAD";
                    if (_alert) {
                        alert(msg);
                    }
            
                    console.log(msg);
                } catch (e) {
                    console.log(e);
                }
            };
    return (
        <div className="p-3">
            <TMeta title={`Vue to jsx - ${SITE}`} />
            <div className="p-3 border-1 border-card br-4">
                <h2 className="my-4 fs-24 fw-6">Vue to JSX converter</h2>
                <UForm onSubmit={handleSubmit}>
                    <UFormGroup label="Vue code">
                        <UTextarea value={vueCode}
                            onChange={(val) => {
                                setVueCode(val);
                                sessionStorage.setItem(sessionStorageKey, val);
                            }}
                            placeholder="Enter vue code..."
                        />
                    </UFormGroup>
                    <UButton className="btn-primary" type="submit">
                        Convert
                    </UButton>
                    <div className="my-1"></div>
                    <UFormGroup label={
                        <div className="flex items-center gap-3">
                            <span>JSX code</span>
                            <span
                        onClick={() => {
                            copy(false);
                        }}
                        className="btn pointer rounded-full btn-md btn-ghost"
                        ><i className="fi fi-rr-copy"></i
                    ></span>
                        </div>
                    }>
                        <UTextarea readOnly value={jsxCode}
                            onChange={(val) => {
                                setVueCode(val);
                                sessionStorage.setItem(sessionStorageKey, val);
                            }}
                            placeholder="Result JSX code"
                        />
                    </UFormGroup>
                </UForm>
            </div>
        </div>
    );
};

export default VueToJsxPage;
