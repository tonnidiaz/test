import React, { ComponentProps, useState } from 'react';
import UAvatar from './UAvatar';
import UButton from './UButton';
import UBadge from './UBadge';
import CtxMenu from './CtxMenu';
import TuModal from './TuModal';
import { delBot, clearBotOrders, activateBot } from '~/utils/funcs';
import { useUserStore } from '@/src/stores/user';
import Link, { LinkProps } from 'next/link';
import { IObj } from '@cmn/utils/interfaces';

interface Props extends React.HTMLAttributes<LinkProps> {bot: IObj; updateBot?: (bot: IObj)=> any}

const BotCard: React.FC<Props> = ({ bot, updateBot }) => {
    const { setBots } = useUserStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [childrenModalOpen, setChildrenModalOpen] = useState(false);

    const onMenuItemClick = async (e, fn) => {
        const close = await fn(e);
        if (close) setMenuOpen(false);
    };

    return (
        <Link
            href={`/bots/${bot._id ?? bot.id}`}
            className="border-1 border-card bg-base-200 p-4 br-1 bot-card w-full"
        >
            <div className="flex flex-col justify-between gap-3 h-full">
                <div className="flex gap- justify-between">
                    <div className="flex gap-4 overflow-hidden">
                        <div>
                            <UAvatar
                                online={bot.active}
                                borderColor="neutral"
                                shape="circle"
                                innerclass="ring relative w-35px h-35px flex items-center justify-center"
                            >
                                <span>
                                    <i className="fi fi-br-user-robot"></i>
                                </span>
                            </UAvatar>
                        </div>
                        <div className="overflow-hidden w-full">
                            <h4 className="text-gray-200 fw-6 fs-14">{bot.name}</h4>
                            {(bot.type === 'arbitrage' || bot.is_child) && (
                                <>
                                    {bot.is_child && (
                                        <UBadge
                                            label="C"
                                            color="yellow"
                                            className="badge-sm badge-warning"
                                        />
                                    )}
                                    {bot.type === 'arbitrage' && (
                                        <UBadge
                                            label="P"
                                            color="green"
                                            className="badge-sm badge-success"
                                        />
                                    )}
                                </>
                            )}
                            <h6 className="fs-11 fw-6 text-gray-200">On {bot.platform}</h6>
                            <h6 className="fs-11 fw-6 text-gray-400">
                                <span>{bot.base}/{bot.ccy}</span>
                                <span className="">
                                    {bot.type === 'arbitrage' ? `${bot.C}/${bot.B}` : ''}
                                </span>
                            </h6>
                            <h6 className="fs-11 fw-6 text-gray-200">
                                {bot.orders || 0} orders
                            </h6>
                            <div className="mt-1 overflow-hidden">
                                <p
                                    className="fs-13"
                                    style={{
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {bot.desc}
                                </p>
                            </div>
                        </div>
                    </div>
                    {!bot.is_child && (
                        <CtxMenu open={menuOpen} onOpenChange={setMenuOpen}>
                            <CtxMenu.Trigger>
                                <UButton
                                    size="sm"
                                    ui={{ rounded: 'rounded-full' }}
                                    className="btn-ghost rounded-full btn-sm w-30px h-30px btn-neutral"
                                    variant="ghost"
                                    color="gray"
                                >
                                    <span className="fs-16 relative top-1">
                                        <i className="fi fi-br-menu-dots-vertical"></i>
                                    </span>
                                </UButton>
                            </CtxMenu.Trigger>
                            <CtxMenu.Content>
                                <li
                                    onClick={e => onMenuItemClick(e, () => activateBot((e.target as HTMLElement).parentElement, bot, updateBot))}
                                >
                                    <span>{bot.active ? "Deactivate" : "Activate"}</span>
                                </li>
                                <li
                                    className={!bot.orders ? 'disabled' : ''}
                                    onClick={e => onMenuItemClick(e, () => clearBotOrders((e.target as HTMLElement).parentElement, bot, updateBot))}
                                >
                                    <span>Clear orders</span>
                                </li>
                                <li
                                    onClick={e => onMenuItemClick(e, () => delBot((e.target as HTMLElement).parentElement, bot, (res) => { setBots(res); }))}
                                >
                                    <span className="text-red-500">Delete bot</span>
                                </li>
                            </CtxMenu.Content>
                        </CtxMenu>
                    )}
                </div>
                <TuModal open={childrenModalOpen} onOpenChange={setChildrenModalOpen}>
                    <TuModal.Trigger>
                        <UButton className="w-full btn-neutral btn-sm">Children</UButton>
                    </TuModal.Trigger>
                    <TuModal.Content>
                        <div className="min-w-200px">
                            <div className="flex flex-col gap-2">
                                {bot.children && bot.children.map((ch) => (
                                    <BotCard key={ch.id} bot={ch} className="p-0 br-10" />
                                ))}
                            </div>
                        </div>
                    </TuModal.Content>
                </TuModal>
            </div>
        </Link>
    );
};

export default BotCard;