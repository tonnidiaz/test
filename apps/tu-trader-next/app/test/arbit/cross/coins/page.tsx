import ArbitTable from "@/components/ArbitTable"
import TMeta from "@/components/TMeta"
import TuDatePicker from "@/components/TuDatePicker"
import TuModalContainer from "@/components/TuModalContainer"
import TuSelect from "@/components/TuSelect"
import TuStats from "@/components/TuStats"
import UButton from "@/components/UButton"
import UCheckbox from "@/components/UCheckbox"
import UDivider from "@/components/UDivider"
import UForm from "@/components/UForm"
import UFormGroup from "@/components/UFormGroup"
import UInput from "@/components/UInput"
import { selectPlatforms, SITE, socket } from "@/utils/constants"
import { formatter } from "@/utils/funcs"
import { parseDate } from "@cmn/utils/functions"
import { IObj } from "@cmn/utils/interfaces"
import { useState } from "react"
import { useDispatch } from "react-redux"

const defState = {
    interval: 0,
    platA: "",
    platB: "",
    pre: "",
    show_details: false,
};
const initRes = { data: {} };
const CrossArbitTestPage = () => {
    const [formState, setFormState] = useState<IObj>({
        interval: 60,
        bal: 50,
        offline: true,
        prefix: undefined,
        save: true,
        skip_existing: false,
        skip_saved: false,
        fix_invalid: false,
        useFile: false,
        platA: "okx",
        platB: "bybit",
        demo: false,
        show: false,
        from_last: false,
        save_klines: true,
        date: {
            start: "2024-01-01 00:00:00",
            end: "2024-10-28 23:59:00",
        },
    })

    const [summary, setSummary] = useState("")
    const [_state, setState] = useState(defState)
    const [msg, setMsg] = useState<IObj>({})
    const [paramsAreaOpen, setParamsAreaOpen] = useState(true)  
    const [clId, setClId] = useState(`${Date.now()}`)
    const [res, setRes] = useState<IObj>(initRes)

    const dispatch = useDispatch()

    const ep = "cross-arbit-cointest";

    const parseData = (data: IObj) => {
        return data.data;}

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
        
        const onCointest = (data: any) => {
            console.log("ON DATA");
            console.log({clId: clId})
            console.log(data)
        
            if (data.data && data.clId == clId) {
                const _data = data.data;
                setRes({
                    data: _data,
                    plat: data.plat,
                    orders: data.orders,
                    trades: _data[0].trades,
                    profit: _data[0].profit,
                    w: _data[0].w,
                    l: _data[0].l,
                });
                // console.log(_data);
                // const profit = formatter.format(_data.profit ?? 0);
                // const aside = formatter.format(_data.aside ?? 0);
        
                // const pair = `${_data.base}-${_data.ccy}`;
                // const txt = `[${_data.trades}] [${pair}] [${
                //     _data.str_name
                // }]: ${aside.replace("$", "")} | ${profit.replace("$", "")}`;
                // summary = txt;
                // copy();
                console.log(data);
               setMsg({})
            } else if (!data.data) {
                if (data.err) {
                    setMsg({ msg: data.err, err: true })
                } else if (typeof data == "string") {
                    setRes(initRes)
                    setMsg({ msg: data });
                }
            }
        };

        const handleSubmit = async (e: any) => {
            try {
                let fd: IObj = {
                    ...formState,
                    only: formState.cOnly ? formState.cOnly.split('/') : formState.only ? formState.only.split(','): undefined,
                    clId: clId,
                    ...formState.date,
                };
                delete fd["date"];
                fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
                console.log(fd);
                setState({
                    ..._state,
                    interval: fd.interval,
                    pre: fd.prefix,
                    platA: fd.platA,
                    platB: fd.platB,
                });
                //msg = {msg: "GETTING KLINES..."};
                socket?.emit(ep, fd);
                /* const ret = await api().post('/cointest', fd)
                
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
        <TMeta title={`CrossArbitrage Cointest - ${SITE}`} />
        <div className="w-100p h-100p relative md:p-5 p-2 flex flex-col">
            <div
                className="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <h2 className="font-bold fs-20">
                    CROSS-ARBIT-TEST RESULTS
                    <span
                        onClick={
                            () => {
                                copy(true);
                            }
                        }
                        className="btn pointer rounded-full btn-md btn-ghost"
                        ><i className="fi fi-rr-copy"></i></span>
                </h2>

                <div className="flex flex-col">
                    {_state.interval && <TuStats
                        className="justify-start items-start"
                        stats={[
                            {
                                title: 'Summary',
                                subtitle: `[${_state.platA} - ${_state.platB}] ${
                                    _state.interval
                                }m: ${_state.pre ?? ''}`,
                            },
                        ]}
                    />}
                    {_state.show_details && <div
                        className="my-2 flex gap-10 justify-center"
                    >
                        <TuStats stats={[
                                { title: 'Trades', subtitle: res.trades ?? 0 },
                                {
                                    title: 'Profit',
                                    subtitle: `${res.ccy ?? 'USDT'} ${formatter
                                        .format(res.profit ?? 0)
                                        .replace('$', '')}`,
                                    hover: `${formatter
                                        .format((res.profit ?? 0) * 18)
                                        .replace('$', 'R')}`,
                                    //hover: numToWords(Math.round(res.profit ?? 0)),
                                },
                                {
                                    title: 'W',
                                    subtitle: `${res.w ?? 0}`,
                                },
                                {
                                    title: 'L',
                                    subtitle: `${res.l ?? 0}`,
                                },
                            ]}/>
                    </div>}
                </div>

                <div className="mt-4 oy-">
                    {!_state.show_details ? <CointestTable rows={parseData(res)}
                    /> :
                    <ArbitTable rows={res.orders} />}
                </div>
            </div>
            <TuModalContainer value={paramsAreaOpen} setValue={v=> setParamsAreaOpen(v)}>
                <div className="">
                    <div className="h-100p oy-hidden relative">
                        <div
                            className="flex justify-between items-center w-100p p-2 gap-2"
                        >
                            <span>{ formState?.only ?? 'All' }</span>
                            <UButton
                                onClick={()=>setParamsAreaOpen(!paramsAreaOpen)}
                                className="ctrl-btn btn-primary mb-2"
                            >
                                <i className="fi fi-rr-angle-down"></i>
                            </UButton>
                        </div>

                        <div className="content">
                            <UDivider className="mb-7 mt-2" />
                            <UForm
                                id="form"
                                state={formState}
                                className="space-y-5 flex flex-col items-center"
                                onSubmit={handleSubmit}
                            >
                                <div
                                    className="w-full grid grid-cols-2 gap-2 items-center"
                                >
                                    <TuSelect
                                        placeholder="Platform A"
                                        options={selectPlatforms(platforms)}
                                        value={formState.platA} setValue={v=> setFormState({...formState, platA: v})}
                                        required
                                    />
                                    <TuSelect
                                        placeholder="Platform B"
                                        options={selectPlatforms(platforms)}
                                        value={formState.platB} setValue={v=> setFormState({...formState, platB: v})}
                                        required
                                    />
                                </div>

                                <div className="grid sm:grid-cols-3 gap-2">
                                    <UFormGroup>
                                        <UCheckbox
                                            color="primary"
                                            label="Offline"
                                            value={formState.offline} setValue={v=> setFormState({...formState, offline: v})}
                                        />
                                    </UFormGroup>
                                    <UCheckbox
                                        color="primary"
                                        label="Save"
                                        value={formState.save} setValue={v=> setFormState({...formState, save: v})}
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Save klines"
                                        value={formState.save_klines} setValue={v=> setFormState({...formState, save_klines: v})}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <UCheckbox
                                        color="primary"
                                        label="Demo"
                                        value={formState.demo} setValue={v=> setFormState({...formState, demo: v})}
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Skip Saved"
                                        value={formState.skip_saved} setValue={v=> setFormState({...formState, skip_saved: v})}
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Show Details"
                                        value={_state.show_details} setValue={v=> setState({..._state, show_details: v})}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <UCheckbox
                                        color="primary"
                                        label="Join"
                                        value={formState.from_last} setValue={v=> setFormState({...formState, from_last: v})}
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Flipped"
                                        variant="primary
                                "
                                        title="Buy at C, sell at A"
                                        v-model="formState.flipped"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Fix invalid"
                                        variant="primary
                                "
                                        v-model="formState.fix_invalid"
                                    />
                                   
                                </div>
                                <div className="grid grid-cols-2 gap-3"> <TuSelect
                                            className="flex-1"
                                            searchable
                                            innerHint="Search strategy..."
                                            placeholder="Strategy"
                                            :options="
                                                toSelectStrategies(strategies)
                                            "
                                            v-model="formState.strNum"
                                            required
                                            :click="() => console.log('click')"
                                            :pointer-down="
                                                () => console.log('click')
                                            "
                                        />
                                    <UCheckbox
                                        color="primary"
                                        label="Just show"
                                        variant="primary
                                "
                                        v-model="formState.show"
                                    /></div>
                                <div
                                    className="grid grid-cols-2 items-center gap-4 w-full"
                                >
                                    <UFormGroup label="Interval">
                                        <TuSelect
                                            placeholder="Interval"
                                            :options="selectIntervals"
                                            v-model="formState.interval"
                                            required
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Only">
                                        <TuSelect
                                            placeholder="Pair"
                                            :options="[{label: 'None', value: undefined}, ...selectSymbols]"
                                            v-model="formState.only"
                                            required
                                        />
                                    </UFormGroup>

                                   
                                </div>
                                <div
                                    className="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Start balance">
                                        <UInput
                                            type="text"
                                            placeholder="Enter start balance..."
                                            required
                                            v-model="formState.bal"
                                        />
                                    </UFormGroup>
                                     <UFormGroup label="Custom only"
                                        ><UInput
                                            placeholder="e.g SOL/USDT"
                                            v-model="formState.cOnly"
                                            name="base"
                                        ></UInput
                                    ></UFormGroup>
                                </div>
                                <div
                                    className="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Prefix"
                                        ><UInput
                                            placeholder="e.g def"
                                            v-model="formState.prefix"
                                            name="prefix"
                                        ></UInput
                                    ></UFormGroup>
                                    <UFormGroup label="Min %"
                                        ><UInput
                                            placeholder="e.g ,3"
                                            v-model="formState.perc"
                                            name="perc"
                                            type="number"
                                            step="any"
                                        ></UInput
                                    ></UFormGroup>
                                    
                                </div>

                                <div className="flex justify-center">
                                    <UFormGroup>
                                        <TuDatePicker
                                            v-model="formState.date"
                                        />
                                    </UFormGroup>
                                </div>
                                <div
                                    v-if="msg.msg"
                                    className="my-2 text-center p-2 bg-base-200 fs-14 border-card -1 br-5 w-full wp-wrap"
                                >
                                    <span>{{ msg.msg }}</span>
                                </div>
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
    </div>);
}
 
export default CrossArbitTestPage;