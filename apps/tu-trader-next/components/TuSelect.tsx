import { ISelectItem } from "@/utils/interfaces";
import React, { useEffect, useRef, useState } from "react";

interface Props extends React.SelectHTMLAttributes<{}> {
    innerHint?: string;
    options?: ISelectItem[];
    placeholder?: string;
    searchable?: boolean;
    value: any;
    setValue: (v: any) => any;
    disabled?: boolean;
}
const TuSelect: React.FC<Props> = ({
    className,
    setValue,
    disabled,
    searchable,
    value,
    innerHint,
    ...props
}) => {
    const [created, setCreated] = useState(false);
    const [selectedItem, setSelectedItem] = useState<HTMLDivElement>();

    const formRef = useRef<HTMLFormElement>();
    const dropdownRef = useRef<HTMLSelectElement>();
    const [_options, setOptions] = useState<ISelectItem[]>();

    useEffect(() => {
        const opts = props.options;
        if (opts) {
            const newOptions = [
                {
                    label: props.placeholder ?? "Select",
                    value: undefined,
                },
                ...opts,
            ];
            if (_options != newOptions) setOptions(newOptions);
        }
    }, [props.options]);

    useEffect(() => {
        const form = formRef.current;
        // Check if Form Element Exist on Page
        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
            });
        }
    }, [disabled, value, props.placeholder, dropdownRef, formRef]);

    useEffect(() => {
        const { options: opts } = props;
        // console.log({pval: value, opts})
        const dd = dropdownRef.current;
        if (true) {
            if (dd) {
                //console.log("CREATE DD", {val});
                //console.log(opts)
                createCustomDropdown(dd);
            }
        }
    }, [_options, dropdownRef, disabled, value]);

    useEffect(() => {
        // console.log({selectedItem});
        selectedItem?.classList.add("is-select");
    }, [selectedItem]);

    // Create Custom Dropdown
    const createCustomDropdown = async (dropdown: HTMLSelectElement) => {
        // Get All Select Options
        // And Convert them from NodeList to Array
        const options = _options ?? [];
        const optionsArr: ISelectItem[] = [...options]; //Array.prototype.slice.call(options);

        const _par = dropdown.parentElement;
        const dd = _par?.querySelector("div.tu-dropdown");
        // console.log("CREATE DD", {dd});
        if (dd) {
            _par?.removeChild(dd);
        }
        // Create Custom Dropdown Element and Add Class Dropdown
        const customDropdown = document.createElement("div");
        customDropdown.classList.add("tu-dropdown");

        if (disabled) {
            customDropdown.classList.add("disabled");
        }
        dropdown.insertAdjacentElement("afterend", customDropdown);

        const selectedOpt =
            optionsArr.find(
                (el) =>
                    (typeof el.value == "string"
                        ? el.value
                        : JSON.stringify(el.value)) ==
                    (typeof value == "string" ? value : JSON.stringify(value))
            ) ?? optionsArr[0];

        // Create Element for Selected Option
        const selected = document.createElement("div");
        selected.classList.add("tu-dropdown-select");
        setContent(
            selected,
            selectedOpt || {
                label: props.placeholder ?? "Select",
                value: undefined,
            }
        );
        customDropdown.appendChild(selected);

        // Create Element for Dropdown Menu
        // Add Class and Append it to Custom Dropdown
        const menu = document.createElement("div");
        menu.classList.add("tu-dropdown-menu");
        customDropdown.appendChild(menu);
        selected.addEventListener("click", toggleDropdown.bind(menu));

        // Create Search Input Element
        const search = document.createElement("input");
        search.placeholder = "Search...";
        search.type = "text";
        search.classList.add("tu-dropdown-menu-search");
        menu.appendChild(search);

        // Create Wrapper Element for Menu Items
        // Add Class and Append to Menu Element
        const menuInnerWrapper = document.createElement("div");
        menuInnerWrapper.classList.add("tu-dropdown-menu-inner");
        menu.appendChild(menuInnerWrapper);

        // Loop All Options and Create Custom Option for Each Option
        // And Append it to Inner Wrapper Element

        optionsArr.forEach((option, i) => {
            const item = document.createElement("div");
            item.classList.add("tu-dropdown-menu-item");
            item.dataset.index = i.toString();

            const el = option;
            if (
                (typeof el.value == "string"
                    ? el.value
                    : JSON.stringify(el.value)) ==
                (typeof value == "string" ? value : JSON.stringify(value))
            ) {
                item.classList.add("is-select");
            }
            if (i == 0 || option.disabled) {
                item.classList.add(
                    i == 0 ? "select-placeholder" : "item-disabled"
                );
            }
            item.dataset.value = option.value;
            setContent(item, option);
            menuInnerWrapper.appendChild(item);

            item.addEventListener(
                "click",
                setSelected.bind(item, selected, dropdown, menu)
            );
        });

        // Add Selected Class to First Custom Select Option
        menuInnerWrapper.querySelector("div")?.classList.add("selected");
        //menuInnerWrapper.addEventListener("scroll", onItemScroll)

        // Add Input Event to Search Input Element to Filter Items
        // Add Click Event to Element to Close Custom Dropdown if Clicked Outside
        // Hide the Original Dropdown(Select)
        search.addEventListener(
            "input",
            filterItems.bind(search, optionsArr, menu)
        );
        document.addEventListener(
            "click",
            closeIfClickedOutside.bind(customDropdown, menu)
        );
        dropdown.style.display = "none";
        if (_options?.length) {
            setCreated(true);
        }
        // console.log({optionsArr: optionsArr.length})
    };

    const onItemScroll = (e) => {
        const parent = e.currentTarget;
        const parentRect = parent.getBoundingClientRect();
        const options = parent.querySelectorAll(".tu-dropdown-menu-item");
        options.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= parentRect.height;
            if (isVisible) console.log({ el: el.textContent, isVisible });

            if (isVisible && !el.classList.contains("v-hidden"))
                el.classList.add("v-hidden");
            else if (!isVisible) el.classList.remove("v-hidden");
        });
    };
    const setContent = (el: any, opt: ISelectItem, extrClass?: string) => {
        let html = `<div class="${opt.class ?? "opt"} ${extrClass}">${opt.html ?? opt.label}</div>`;
        el.innerHTML = html;
    };

    // Toggle for Display and Hide Dropdown
    function toggleDropdown(this: any) {
        if ((this as any).offsetParent) {
            (this as any).style.display = "none";
        } else {
            (this as any).style.display = "block";
            //(this as any).querySelector("input").focus();
            const selected: HTMLDivElement | null = this.querySelector(
                ".tu-dropdown-menu-item.is-select"
            );
            if (selected) {
                selected.scrollIntoView();
            }
        }
    }

    // Set Selected Option
    function setSelected(this, selected, dropdown, menu) {
        // Get Value and Label from Clicked Custom Option
        setSelectedItem(this);
        console.log({ _this: this });

        let value = (this as any).dataset.value;
        value = _options?.find((el) => el.value?.toString() == value)?.value;
        const label = (this as any).innerHTML;

        // Change the Text on Selected Element
        // Change the Value on Select Field
        selected.innerHTML = label;
        dropdown.value = value;
        menu.style.display = "none";
        menu.querySelector("input").value = "";

        const menutItems = menu.querySelectorAll(".tu-dropdown-menu-item");
        menutItems.forEach((el) => {
            el.classList.remove("is-select");
        });
        // console.log({selectedItem});
        // selectedItem?.classList.add("is-select");

        setValue(value);
    }

    const parseStr = (val?: string) =>
        !val
            ? undefined
            : val
                  .toLowerCase()
                  .replaceAll("/", "")
                  .replaceAll(",", "")
                  .replaceAll(" ", "")
                  .trim();
    // Filter the Items
    function filterItems(this, itemsArr: ISelectItem[], menu) {
        // Get All Custom Select Options
        // Get Value of Search Input
        // Get Filtered Items
        // Get the Indexes of Filtered Items
        const customOptions = menu.querySelectorAll(
            ".tu-dropdown-menu-inner div"
        );
        const value = (this as any).value.toLowerCase();
        //console.log({ value });
        const filteredItems = itemsArr.filter((item) =>
            parseStr(item.value?.toString())?.includes(parseStr(value)!)
        );
        const indexesArr = filteredItems.map((item) =>
            itemsArr.findIndex(
                (el) => el.value?.toString() == item.value?.toString()
            )
        );
        //console.log(indexesArr);

        // Check if Option is not Inside Indexes Array
        // And Hide it and if it is Inside Indexes Array and it is Hidden Show it
        for (let option of itemsArr) {
            const ind = itemsArr.findIndex(
                (el) => el.value?.toString() == option.value?.toString()
            );

            //customOptions[ind].style.display = "none";
            const opt = [...customOptions].find(
                (el) => el.dataset.index == `${ind}`
            );
            if (
                !indexesArr.includes(
                    itemsArr.findIndex(
                        (el) => el.value?.toString() == option.value
                    )
                ) &&
                value?.length &&
                ind != 0
            ) {
                //console.log(option.value, ind, opt);
                if (opt) opt.style.display = "none";
            } else {
                if (opt.offsetParent === null) {
                    opt.style.display = "block";
                }
            }
        }
    }

    // Close Dropdown if Clicked Outside Dropdown Element
    function closeIfClickedOutside(this, menu, e) {
        if (
            e.target.closest(".tu-dropdown") === null &&
            e.target !== this &&
            menu.offsetParent
        ) {
            menu.style.display = "none";
        }
    }
    return (
        <div className={"tu-select " + className} {...props}>
            <section className="section wrapper wrapper-section">
                <div className="container wrapper-column">
                    <div className="tu-select-form" ref={formRef as any}>
                        <div className="tu-select-form-group">
                            <span className="tu-select-form-arrow">
                                <i className="fi fi-br-angle-small-down"></i>
                            </span>
                            <select
                                className="tu-dropdown"
                                ref={dropdownRef as any}
                                value={value}
                                onChange={(v) => setValue(v)}
                            >
                                <option disabled>{props.placeholder}</option>
                                {_options?.map((opt, i) => (
                                    <option key={`opt-${i}`} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default TuSelect;
