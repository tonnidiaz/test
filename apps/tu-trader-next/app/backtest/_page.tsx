"use client";

import BacktestTable from "@/components/BacktestTable";
import TMeta from "@/components/TMeta";
import TuDatePicker from "@/components/TuDatePicker";
import TuModalContainer from "@/components/TuModalContainer";
import TuSelect from "@/components/TuSelect";
import TuStats from "@/components/TuStats";
import UButton from "@/components/UButton";
import UCheckbox from "@/components/UCheckbox";
import UDivider from "@/components/UDivider";
import UForm from "@/components/UForm";
import UFormGroup from "@/components/UFormGroup";
import UInput from "@/components/UInput";
import UTextarea from "@/components/UTextarea";
import { RootState } from "@/redux/store";
import {
    selectIntervals,
    selectParents,
    selectPlatforms,
    selectSymbols,
    SITE,
    socket,
} from "@/utils/constants";
import { formatter, toSelectStrategies } from "@/utils/funcs";
import { parseDate } from "@cmn/utils/functions";
import { IObj } from "@cmn/utils/interfaces";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Page = () => {
    const [_state, setState] = useState({
        parent: "",
        interval: 0,
    });
    const [msg, setMsg] = useState<IObj | string>({});
    const [res, setRes] = useState<IObj>({});
    const [paramsAreaOpen, setParamsAreaOpen] = useState(true);
    const [clId, setClId] = useState(`${Date.now()}`);
    const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));
    const appStore = useSelector((s: RootState) => s.app);

    const [summary, setSummary] = useState("");
    const [formState, setFormState] = useState<IObj>(
        {
        strategy: 8,
        interval: 60,
        bal: 50,
        offline: true,
        lev: 1,
        save: true,
        skip_existing: true,
        useFile: false,
        platform: "binance",
        parent: "cloud5",
        demo: false,
        symbol: ["SOL", "USDT"].toString(),

        date: {
            start: "2024-01-01 00:00:00",
            end: "2024-10-28 23:59:00",
        },
    }
);

    useEffect(() => {
        console.log("MOUNTED");
        socket?.on("backtest", onBacktest);

        const state = sessionStorage.getItem(`${location.pathname}__state`)
    if (state){
        const s = JSON.parse(state)
       setFormState(s) 
       console.log({s})
    }
        socket?.on("disconnect", (r, d) => {
            console.log("IO DISCONNECTED");
            setMsg({ msg: "IO DISCONNECTED" });
        });
        socket?.on("connect", () => {
            console.log("IO CONNECTED");
            setMsg({ msg: "IO CONNECTED" });
        });
        return () => {
            socket?.off("backtest", onBacktest);
        };
    }, []);

    useEffect(()=>{
        console.log(formState);
        sessionStorage.setItem(`${location.pathname}__state`, JSON.stringify(formState))
    },[formState])
const setFormStateField = (key: string, v: any) => {

        const s = formState;
        s[key] = v;
        console.log(`{${key}: ${s[key]}}`)
        setFormState(s);
    };
    const initRes = { data: {} };

    const onBacktest = (data: any) => {
        console.log("ON BACKTEST");

        if (data.data && data.clId == clId) {
            const _data = data.data;
            setRes(_data);
            console.log(_data);
            const profit = formatter.format(_data.profit ?? 0);
            const aside = formatter.format(_data.aside ?? 0);

            const pair = `${_data.base}-${_data.ccy}`;
            const txt = `${_state.interval}m_[${_state.parent}] [${
                _data.trades
            }] [${pair}] [${_data.str_name}]: ${aside.replace(
                "$",
                ""
            )} | ${profit.replace("$", "")}`;
            setSummary(txt);
            copy();
            setMsg({});
        } else if (!data.data) {
            if (data.err) {
                setMsg({ msg: data.err, err: true });
            } else {
                setRes(initRes);
                console.log(data);
                setMsg({ msg: data });
            }
        }
    };
    const copy = (_alert = false) => {
        try {
            navigator.clipboard.writeText(summary);
            const msg = "COPIED TO CLIPBORAD";
            if (_alert) {
                alert(msg);
            }

            console.log(msg);
        } catch (e) {
            console.log(e);
        }
    };

    const getData = (ts: string) => res.data[ts];
    const parseData = (data: IObj) => {
        if (!data.data) return [];
        let dataKeys = Object.keys(data.data);
        const dataLength = dataKeys.length;
        const max = 2000;
        dataKeys =
            dataLength > max + 1
                ? [
                      ...dataKeys.slice(0, max),
                      ...dataKeys.slice(dataLength - 50, dataLength),
                  ]
                : dataKeys;
        let d = dataKeys.map((ts, i) => {
            let obj = data.data[ts];
            const _side = obj.side.toLowerCase();
            const isSell = _side.startsWith("sell");
            obj = {
                ...obj,
                i: `${dataKeys.indexOf(ts)}`,
                side: {
                    value: obj.side.toUpperCase(),
                    class: obj.balance
                        ? isSell
                            ? "!text-error"
                            : "!text-success"
                        : "!text-white",
                },
                balance: `${!isSell ? data.base : data.ccy} ${
                    obj.balance ?? "N/A"
                }\t${obj.profit ?? ""}`,
                class: `${isSell ? "bg-base-200" : ""} ${
                    !obj.balance ? "linethrough bg-red-500" : ""
                }`,
            };
            return obj;
        });
        return d;
    };
    

    const handleSubmit = async (e: any) => {
        try {
            const { csymbol } = formState;
            let fd: IObj = {
                ...formState,
                strategy: formState.strategy,
                lev: formState.lev,
                symbol:
                    csymbol && csymbol.length
                        ? csymbol.split("/")
                        : formState.symbol.split(","),
                interval: formState.interval,
                clId: clId,
                ...formState.date,
            };
            delete fd["date"];
            fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
            console.log(fd);
            setState({
                ..._state,
                parent: fd.parent.toUpperCase(),
                interval: fd.interval,
            });
            //msg = {msg: "GETTING KLINES..."};
            socket?.emit("backtest", fd);
            /* const ret = await api().post('/backtest', fd)
        
        if (ret.data.err){
            msg = { msg: ret.data.err, err: true };
            return
        }
        console.log(ret.data); */
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <div>
            <TMeta title={`Backtest - ${SITE}`} />
            <div className="w-100p h-100p relative md:p-5 p-2 flex flex-col">
                <div className="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh">
                    <h2 className="font-bold fs-20">
                        RESULTS
                        <span
                            onClick={() => {
                                copy(true);
                            }}
                            className="btn pointer rounded-full btn-md btn-ghost"
                        >
                            <i className="fi fi-rr-copy"></i>
                        </span>
                    </h2>
                    <p>{JSON.stringify(formState)}</p>

                    <div className="flex flex-col">
                        <TuStats
                            stats={[
                                {
                                    title: "Aside",
                                    subtitle: `${res.ccy ?? ""} ${formatter
                                        .format(res.aside ?? 0)
                                        .replace("$", "")}`,
                                    hover: `${formatter
                                        .format((res.aside ?? 0) * 18.5)
                                        .replace("$", "R")}`,
                                },
                            ]}
                        />
                        <div className="my-2 flex gap-10 justify-center">
                            <TuStats
                                stats={[
                                    {
                                        title: "Trades",
                                        subtitle: res.trades ?? 0,
                                    },
                                    {
                                        title: "Profit",
                                        subtitle: `${res.ccy ?? ""} ${formatter
                                            .format(res.profit ?? 0)
                                            .replace("$", "")}`,
                                        hover: `${formatter
                                            .format((res.profit ?? 0) * 18)
                                            .replace("$", "R")}`,
                                        //hover: numToWords(Math.round(res.profit ?? 0)),
                                    },
                                    {
                                        title: "W",
                                        subtitle: `${(res.gain ?? 0).toFixed(2)}%`,
                                    },
                                    {
                                        title: "L",
                                        subtitle: `${(res.loss ?? 0).toFixed(2)}%`,
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="mt-4 oy-">
                       
                        <BacktestTable rows={parseData(res)} />
                    </div>
                </div>
                <TuModalContainer
                    value={paramsAreaOpen}
                    setValue={setParamsAreaOpen}
                >
                    <div>
                        <div className="h-100p oy-hidden relative">
                            <div className="flex justify-between items-center w-100p p-2 gap-2">
                                <span>{formState?.symbol}</span>
                                <UButton
                                    onClick={(e) =>
                                        setParamsAreaOpen(!paramsAreaOpen)
                                    }
                                    className="ctrl-btn btn-primary mb-2"
                                >
                                    <i className="fi fi-rr-angle-down"></i>
                                </UButton>
                            </div>

                            <div className="content">
                                <UDivider className="mb-7 mt-2" />
                                <UForm
                                    state={formState}
                                    className="space-y-2 flex flex-col items-center"
                                    onSubmit={handleSubmit}
                                    id="form"
                                >
                                    <div className="w-full grid grid-cols-2 gap-4 items-center">
                                        <TuSelect
                                            placeholder="Platform"
                                            options={selectPlatforms(
                                                appStore.platforms
                                            )}
                                            value={formState.platform}
                                            setValue={(v) =>
                                                setFormStateField("platform", v)
                                            }
                                            required
                                        />

                                        <div className="flex items-center gap-2">
                                            <UFormGroup>
                                                <UCheckbox
                                                    color="primary"
                                                    label="Offline"
                                                    value={formState.offline}
                                                    setValue={(v) =>
                                                        {
                                                            console.log({v})
                                                            setFormStateField(
                                                            "offline",
                                                            v
                                                        )}
                                                    }
                                                />
                                            </UFormGroup>
                                            <UFormGroup>
                                                <UCheckbox
                                                    value={formState.useFile}
                                                    setValue={(v) =>
                                                        setFormStateField(
                                                            "useFile",
                                                            v
                                                        )
                                                    }
                                                    color="primary"
                                                    label="Use file"
                                                />
                                            </UFormGroup>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <UInput
                                            required={formState.useFile}
                                            type="file"
                                            className="file-input file-input-bordered file-input-sm"
                                            override="class"
                                            value={formState.file}
                                            onChange={(e) =>
                                                setFormStateField("file", e[0])
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 justify-center">
                                        <UCheckbox
                                            color="primary"
                                            label="Parsed"
                                            value={formState.isParsed}
                                            setValue={(v) =>
                                                setFormStateField("isParsed", v)
                                            }
                                        />
                                        <UCheckbox
                                            color="primary"
                                            label="Save"
                                            value={formState.save}
                                            setValue={(v) =>
                                                setFormStateField("save", v)
                                            }
                                        />

                                        <UCheckbox
                                            color="primary"
                                            label="Heikin-ashi"
                                            value={formState.isHa}
                                            setValue={(v) =>
                                                setFormStateField("isHa", v)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 justify-center">
                                        <UCheckbox
                                            color="primary"
                                            label="Demo"
                                            value={formState.demo}
                                            setValue={(v) =>
                                                setFormStateField("demo", v)
                                            }
                                        />
                                        <UCheckbox
                                            color="primary"
                                            label="Skip Existing"
                                            value={formState.skip_existing}
                                            setValue={(v) =>
                                                setFormStateField(
                                                    "skip_existing",
                                                    v
                                                )
                                            }
                                        />
                                        <UCheckbox
                                            color="primary"
                                            label="Use invalid"
                                            value={formState.useInvalid}
                                            setValue={(v) =>
                                                setFormStateField(
                                                    "useInvalid",
                                                    v
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 items-center gap-4 w-full">
                                        <div className="flex items-center gap-1">
                                            <TuSelect
                                                className="flex-1"
                                                searchable
                                                innerHint="Search strategy..."
                                                placeholder="Strategy"
                                                options={toSelectStrategies(
                                                    appStore.strategies
                                                )}
                                                value={formState.strategy}
                                                setValue={(v) =>
                                                    setFormStateField(
                                                        "strategy",
                                                        v
                                                    )
                                                }
                                                required
                                            />
                                            <div className="flex flex-col gap-0 items-center">
                                                <UButton
                                                    onClick={(_) =>
                                                        socket?.emit(
                                                            "strategies"
                                                        )
                                                    }
                                                    className="btn-xs btn-sm btn-ghost rounded-full"
                                                >
                                                    <span>
                                                        <i className="fi fi-rr-refresh"></i>
                                                    </span>
                                                </UButton>
                                                <a
                                                    target="_blank"
                                                    title="More info on strategies"
                                                    href="/utils/strategies"
                                                    className="btn btn-sm btn-ghost rounded-full"
                                                >
                                                    <span className="text-primary text-center">
                                                        <i className="fi fi-br-interrogation"></i>
                                                    </span>
                                                </a>
                                            </div>
                                        </div>

                                        <TuSelect
                                            placeholder="Interval"
                                            options={selectIntervals}
                                            value={formState.interval}
                                            setValue={(v) =>
                                                setFormStateField("interval", v)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="flex items-end justify-center gap-4">
                                        <UFormGroup label="Start balance">
                                            <UInput
                                                type="text"
                                                placeholder="Enter start balance..."
                                                required
                                                value={formState.bal}
                                                onChange={(v) =>
                                                    setFormStateField("bal", v)
                                                }
                                            />
                                        </UFormGroup>
                                        <div className="flex gap-4">
                                            <UFormGroup label="Margin">
                                                <TuSelect
                                                    placeholder="Margin"
                                                    options={margins}
                                                    value={formState.lev}
                                                    setValue={(v) =>
                                                        setFormStateField(
                                                            "lev",
                                                            v
                                                        )
                                                    }
                                                ></TuSelect>
                                            </UFormGroup>
                                            <UFormGroup label="Pair">
                                                <TuSelect
                                                    placeholder="Pair"
                                                    options={selectSymbols}
                                                    value={formState.symbol}
                                                    setValue={(v) =>
                                                        setFormStateField(
                                                            "symbol",
                                                            v
                                                        )
                                                    }
                                                    searchable
                                                    innerHint="Search pair..."
                                                ></TuSelect>
                                            </UFormGroup>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-end">
                                        <TuSelect
                                            placeholder="Parent"
                                            options={selectParents(
                                                appStore.parents
                                            )}
                                            value={formState.parent}
                                            setValue={(v) =>
                                                setFormState({
                                                    ...formState,
                                                    parent: v,
                                                })
                                            }
                                            required
                                        />
                                        <UFormGroup label="Custom Pair">
                                            <UInput
                                                placeholder="e.g SOL/USDT"
                                                value={formState.csymbol}
                                                onChange={(v) => {
                                                    console.log("onChanged");
                                                    setFormState({
                                                        ...formState,
                                                        csymbol: v,
                                                    });
                                                }}
                                                name="pair"
                                            />
                                        </UFormGroup>
                                    </div>

                                    <div className="flex justify-center">
                                        <UFormGroup>
                                            <TuDatePicker
                                                value={formState.date}
                                                setValue={(v) =>
                                                    setFormState({
                                                        ...formState,
                                                        date: v,
                                                    })
                                                }
                                            />
                                        </UFormGroup>
                                    </div>
                                    {(msg as IObj).msg && (
                                        <UTextarea
                                            readOnly
                                            value={(msg as IObj).msg}
                                            className="status-textarea my-2 text-center p-2 bg-base-200 fs-14 border-card -1 br-5 w-full wp-wrap"
                                        ></UTextarea>
                                    )}
                                </UForm>
                            </div>
                            <div className="p-3">
                                <UButton
                                    form="form"
                                    type="submit"
                                    className="w-full btn-primary"
                                >
                                    Start
                                </UButton>
                            </div>
                        </div>
                    </div>
                </TuModalContainer>
            </div>
        </div>
    );
}
 
export default Page;