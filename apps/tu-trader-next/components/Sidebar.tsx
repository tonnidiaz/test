import MenuItem from "./MenuItem";

const Sidebar = () => {
    return (
        <aside>
            <ul className="menu gap-0 sm:gap-5  sidebar">
                <MenuItem
                    title="Home"
                    inner-className="justify-center"
                    icon="fi fi-rr-house-window"
                    to="/"
                />

                <MenuItem
                    title="Backtest"
                    inner-className="justify-center"
                    icon="fi fi-rr-blood-test-tube-alt"
                    to="/backtest"
                ></MenuItem>

                <MenuItem
                    title="Coin test"
                    inner-className="justify-center"
                    icon="fi fi-rr-coins"
                    to="/test/coins"
                ></MenuItem>
                <MenuItem
                    title="Arbitrage Coin test"
                    inner-className="justify-center"
                    icon="fi fi-rr-money-transfer-coin-arrow"
                    to="/test/arbit/coins"
                ></MenuItem>
            </ul>
        </aside>
    );
};

export default Sidebar;
