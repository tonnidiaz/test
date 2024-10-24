import React, { FC, HTMLAttributes, useState } from "react";
import TuModal from "./TuModal";
import TuCard from "./TuCard";
import { IObj } from "@cmn/utils/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { localApi } from "@/utils/api";
import UForm from "./UForm";
import UFormGroup from "./UFormGroup";
import UInput from "./UInput";
import TuSelect from "./TuSelect";
import { listToOpt, toSelectStrategies } from "@/utils/funcs";
import { arbitTypes, botTypes, selectIntervals } from "@/utils/constants";
import UAccordion from "./UAccordion";
import UCheckbox from "./UCheckbox";
import TriArbitForm from "./TriArbitForm";
import UButton from "./UButton";
import UDivider from "./UDivider";
import { strategies } from "@cmn/strategies";
import UTextarea from "./UTextarea";
import { test_platforms } from "@cmn/utils/consts";

const BotFormModal: React.FC<
    HTMLAttributes<{}> & {
        mode: "Create" | "Edit";
        onDone?: (bot: IObj) => any;
        bot?: IObj;
    }
> & {
    Toggler: FC<React.HTMLAttributes<{}>>;
} = ({ mode, onDone, bot }) => {
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [btnLoading, setBtnLoading] = useState(false);

    const [err, setErr] = useState("");
    const [formState, setFormState] = useState<IObj>({
        demo: true,
        platform: "bybit",
        type: "normal",
        child_pairs: [],
        arbit_settings: {
            _type: "tri",
            min_perc: 1,
            flipped: false,
            use_ws: false,
        },
    });
    const userStore = useSelector((state: RootState) => state.user);
    const dispatch = useDispatch();

    const setFormStateField = (key: string, v: any) => {
        const s = formState;
        s[key] = v;
        setFormState(s);
    };

    const handleSubmit = async () => {
        try {
            setErr("");
            let data = { ...formState.value };
            delete data.id;
            delete data.orders;
            delete data.aside;
            delete data.total_base;
            delete data.total_quote;
            delete data.arbit_orders;
            console.log(data.symbol);
            data.symbol = data.symbol?.split(",");
            data =
                mode == "Create"
                    ? { ...data, user: userStore.user?.username }
                    : { key: "multi", val: { ...data } };
            //        console.log(data);
            setBtnLoading(true);
            const url =
                mode == "Create" ? "/bots/create" : `/bots/${bot!.id}/edit`;

            const res = await localApi(true).post(url, data);
            onDone?.(res.data);
            setBtnLoading(false);
            setModalOpen(false);
        } catch (e: any) {
            console.log(e);
            const _err =
                typeof e.response?.data == "string" &&
                e.response?.data?.startsWith("tuned:")
                    ? e.response.data.replace("tuned:", "")
                    : "Something went wrong";
            setErr(_err);
            setBtnLoading(false);
        }
    };

    return (
        <TuModal value={modalOpen} onUpdate={setModalOpen}>
            <TuModal.Toggler>
                <BotFormModal.Toggler />
            </TuModal.Toggler>
            <TuModal.Content>
                <TuCard header={<h3>{mode} bot</h3>}>
                    <UForm
                        className="flex flex-col gap-2"
                        onSubmit={handleSubmit}
                    >
                        <div className="grid sm:grid-cols-2 gap-3 items-end">
                            <UFormGroup label="Bot name">
                                <UInput
                                    value={formState.name}
                                    onChange={(v) =>
                                        setFormStateField("name", v)
                                    }
                                    required
                                    placeholder="Enter bot name..."
                                />
                            </UFormGroup>
                            <UFormGroup>
                                <TuSelect
                                    value={formState.type}
                                    setValue={(v) =>
                                        setFormStateField("type", v)
                                    }
                                    className="w-full"
                                    searchable
                                    innerHint="Search..."
                                    placeholder="Bot type"
                                    disabled={
                                        mode == "Edit" &&
                                        formState.orders?.length
                                    }
                                    required
                                    options={listToOpt(botTypes)}
                                />
                            </UFormGroup>
                        </div>
                        {formState.type == "arbitrage" && (
                            <UAccordion
                                className="my-1"
                                v-if="formState.type == 'arbitrage'"
                                label={"Arbitrage settings"}
                            >
                                <div className="grid sm:grid-cols-2 gap-3 items-end mt-4 mb-1">
                                    <UFormGroup label="Arbit type">
                                        <TuSelect
                                            value={
                                                formState.arbit_settings._type
                                            }
                                            setValue={(v) =>
                                                setFormStateField(
                                                    "arbit_settings",
                                                    {
                                                        ...formState.arbit_settings,
                                                        _type: v,
                                                    }
                                                )
                                            }
                                            className="w-full"
                                            searchable
                                            disabled={
                                                formState.type == "normal" ||
                                                (mode == "Edit" &&
                                                    formState.orders?.length)
                                            }
                                            innerHint="Search..."
                                            placeholder="Arbitrage type"
                                            required
                                            options={listToOpt(arbitTypes)}
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Min. arbit %">
                                        <UInput
                                            disabled={
                                                formState.type == "normal"
                                            }
                                            required
                                            value={
                                                formState.arbit_settings
                                                    .min_perc
                                            }
                                            onChange={(v) =>
                                                setFormStateField(
                                                    "arbit_settings",
                                                    {
                                                        ...formState.arbit_settings,
                                                        min_perc: v,
                                                    }
                                                )
                                            }
                                            placeholder="e.g .3"
                                            type="number"
                                            step="any"
                                        />
                                    </UFormGroup>
                                </div>
                                <div className="my-2 grid grid-cols-2 items-center">
                                    <UCheckbox
                                        label="MEGA BOT"
                                        title="A BOT WITH ARBITRAGE CHILDREN"
                                        value={formState.arbit_settings.mega}
                                        setValue={(v) =>
                                            setFormStateField(
                                                "arbit_settings",
                                                {
                                                    ...formState.arbit_settings,
                                                    mega: v,
                                                }
                                            )
                                        }
                                    ></UCheckbox>
                                    <UCheckbox
                                        label="Use Ws"
                                        title="Use websockets"
                                        value={formState.arbit_settings.use_ws}
                                        setValue={(v) =>
                                            setFormStateField(
                                                "arbit_settings",
                                                {
                                                    ...formState.arbit_settings,
                                                    use_ws: v,
                                                }
                                            )
                                        }
                                    ></UCheckbox>
                                </div>
                                {!formState.arbit_settings.mega ? (
                                    <TriArbitForm
                                        value={formState}
                                        onChange={(v) => setFormState(v)}
                                    />
                                ) : (
                                    <UAccordion label={"Child bots"}>
                                        <div>
                                            {formState.child_pairs.map(
                                                (pair, i) => (
                                                    <div className="my-3">
                                                        <div className="flex w-full items-center gap-3 justify-between">
                                                            <h5>
                                                                Bot #{i + 1}
                                                            </h5>
                                                            <UButton
                                                                onClick={() => {
                                                                    formState.child_pairs =
                                                                        formState.child_pairs.filter(
                                                                            (
                                                                                el,
                                                                                j
                                                                            ) =>
                                                                                j !=
                                                                                i
                                                                        );
                                                                    formState.child_pairsCnt += 1;
                                                                }}
                                                                className="btn-sm w-34px h-30px rounded-lg btn-neutral"
                                                            >
                                                                <i className="fi fi-br-trash fs-12"></i>
                                                            </UButton>
                                                        </div>
                                                        <TriArbitForm
                                                            value={
                                                                formState
                                                                    .child_pairs[
                                                                    i
                                                                ]
                                                            }
                                                            onChange={(v) => {
                                                                const s =
                                                                    formState.child_pairs;
                                                                s[i] = v;
                                                                setFormStateField(
                                                                    "child_pairs",
                                                                    s
                                                                );
                                                            }}
                                                        />
                                                        <UDivider className="my-4" />
                                                    </div>
                                                )
                                            )}

                                            <div>
                                                <div className="flex justify-ned">
                                                    <UButton
                                                        onClick={() => {
                                                            formState.child_pairs.push(
                                                                {}
                                                            ),
                                                                (formState.child_pairsCnt += 1);
                                                        }}
                                                        className="w-full btn-sm h-30px rounded-lg btn-neutral"
                                                    >
                                                        <i className="fi fi-br-plus fs-12"></i>
                                                    </UButton>
                                                </div>
                                            </div>
                                        </div>
                                    </UAccordion>
                                )}
                            </UAccordion>
                        )}

                        <div className="grid grid-cols-2 items-center justify-between gap-3 my-1">
                            <UFormGroup label="Start amount">
                                <UInput
                                    required
                                    value={formState.start_amt}
                                    onChange={(v) =>
                                        setFormStateField(
                                            "start_amt",
                                            Number(v)
                                        )
                                    }
                                    placeholder="Enter start amount..."
                                    type="number"
                                    step="any"
                                />
                            </UFormGroup>
                            {mode == "Edit" && (
                                <UFormGroup label="Balance">
                                    <UInput
                                        required
                                        value={formState.balance}
                                        onChange={(v) =>
                                            setFormStateField(
                                                "balance",
                                                Number(v)
                                            )
                                        }
                                        placeholder="Enter balance..."
                                        type="number"
                                        step="any"
                                        title="Increase/decrease the funds you're willing to trade with"
                                    />{" "}
                                </UFormGroup>
                            )}

                            <UFormGroup label="Platform">
                                <TuSelect
                                    required
                                    options={Object.keys(test_platforms).map(
                                        (el) => ({
                                            label: el.toUpperCase(),
                                            value: el.toLocaleLowerCase(),
                                        })
                                    )}
                                    placeholder="Platform"
                                    value={formState.platform}
                                    setValue={(v) =>
                                        setFormStateField("platform", v)
                                    }
                                />
                            </UFormGroup>
                        </div>

                        <div className="grid grid-cols-2 gap-3 my-1">
                            <TuSelect
                                required
                                options={selectIntervals}
                                value={formState.interval}
                                setValue={(v) =>
                                    setFormStateField("interval", v)
                                }
                                placeholder="Interval"
                            />
                            <TuSelect
                                required
                                options={["Market", "Limit"].map((el) => ({
                                    label: el,
                                    value: el,
                                }))}
                                placeholder="Order type"
                                value={formState.order_type}
                                setValue={(v) =>
                                    setFormStateField("order_type", v)
                                }
                            />
                        </div>
                        {formState.type == "normal" && (
                            <div className="grid grid-cols-1 gap-3 my-1">
                                <TuSelect
                                    required
                                    options={toSelectStrategies(strategies)}
                                    value={formState.strategy}
                                    setValue={(v) =>
                                        setFormStateField("strategy", v)
                                    }
                                    searchable
                                    placeholder="Strategy"
                                    innerHint="Search strategy..."
                                />
                            </div>
                        )}
                        <UFormGroup label="Description">
                            <UTextarea
                                value={formState.desc}
                                onChange={(v) => setFormStateField("desc", v)}
                                placeholder="Bot description..."
                            />
                        </UFormGroup>
                        {mode == "Edit" && (
                            <div className="flex items-center flex-row justify- gap-5">
                                <UCheckbox
                                    label="Demo"
                                    value={formState.demo}
                                    setValue={(v) =>
                                        setFormStateField("demo", v)
                                    }
                                />
                            </div>
                        )}
                        {err.length && (
                            <p className="text-center text-xs text-red-400">
                                {err?.replace("tuned:", "")}
                            </p>
                        )}

                        <UFormGroup className="mt-">
                            <UButton
                                loading={btnLoading}
                                type="submit"
                                label="Submit"
                                className="btn-primary w-full"
                            >
                                Submit
                            </UButton>
                        </UFormGroup>
                    </UForm>
                </TuCard>
            </TuModal.Content>
        </TuModal>
    );
};

BotFormModal.Toggler = ({ children }) => (
    <div className="toggler">{children}</div>
);

export default BotFormModal;
