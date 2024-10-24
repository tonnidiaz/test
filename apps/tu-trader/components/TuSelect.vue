<template>
    <div class="tu-select">
        <section class="section wrapper wrapper-section">
            <div class="container wrapper-column">
                <form name="countries" class="tu-select-form" ref="formRef">
                    <div class="tu-select-form-group">
                        <span class="tu-select-form-arrow"
                            ><i class="fi fi-br-angle-small-down"></i
                        ></span>
                        <select
                            class="tu-dropdown"
                            ref="dropdownRef"
                            v-model="value"
                        >
                            <option disabled>{{ placeholder }}</option>

                            <option v-for="opt of _options" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>
                </form>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { type ISelectItem } from "@repo/common/src/utils/interfaces";
import { computed, ref, watch } from "vue";
const formRef = ref<HTMLFormElement>();
const dropdownRef = ref<HTMLSelectElement>(),
    created = ref(false);
// Check if Dropdowns are Exist
// Loop Dropdowns and Create Custom Dropdown for each Select Element
const selectedItem = ref<HTMLDivElement>();
const _options = ref<ISelectItem[]>();

const props = defineProps<{
    innerHint?: string;
    options?: ISelectItem[];
    placeholder?: string;
    modelValue: any;
    disabled?: boolean;
}>();

const emit = defineEmits(["update:model-value"]);
const value = computed({
    get: () => props.modelValue,
    set: (val) => {
        emit("update:model-value", val);
    },
});

// Create Custom Dropdown
const createCustomDropdown = async (dropdown: HTMLSelectElement) => {
    //console.log("CREATE", _options.value?.length);
    // Get All Select Options
    // And Convert them from NodeList to Array
    const options = _options.value ?? [];
    const optionsArr: ISelectItem[] = [
        ...options,
    ]; //Array.prototype.slice.call(options);

    const _par = dropdown.parentElement;
    const dd = _par?.querySelector("div.tu-dropdown");
    if (dd) {
        _par?.removeChild(dd);
    }
    // Create Custom Dropdown Element and Add Class Dropdown
    const customDropdown = document.createElement("div");
    customDropdown.classList.add("tu-dropdown");

    if (props.disabled) {
        customDropdown.classList.add("disabled");
    }
    dropdown.insertAdjacentElement("afterend", customDropdown);

    const selectedOpt =
        optionsArr.find(
            (el) =>
                (typeof el.value == "string"
                    ? el.value
                    : JSON.stringify(el.value)) ==
                (typeof value.value == "string"
                    ? value.value
                    : JSON.stringify(value.value))
        ) ?? optionsArr[0];
    // Create Element for Selected Option
    const selected = document.createElement("div");
    selected.classList.add("tu-dropdown-select");
    setContent(
        selected,
        selectedOpt
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
            (typeof value.value == "string"
                ? value.value
                : JSON.stringify(value.value))
        ) {
            item.classList.add("is-select");
        }
        if (i == 0 || option.disabled) {
            item.classList.add(i == 0 ? "select-placeholder" : "item-disabled");
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
    if (_options.value?.length) {
        created.value = true;
    }
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
const setContent = (
    el: any,opt: ISelectItem,
    extrClass?: string
) => {
    let html = `<div class="${opt.class ?? 'opt'} ${extrClass}">${opt.html ?? opt.label}</div>`
    el.innerHTML = html;
};
watch(
    [props, dropdownRef, formRef],
    ([d, f], [od, of]) => {
        const form = formRef.value;
        // Check if Form Element Exist on Page
        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
            });
        }
    },
    { immediate: true, deep: true }
);

watch(
    [() => props.options, dropdownRef, () => props.disabled, ()=> props.modelValue],
    ([opts, dd, _disabled, val], [oldOpts, oldDd, oldDisabled, ov]) => {
        if (opts)
            _options.value = [
                {
                    label: props.placeholder ?? "Select",
                    value: undefined,
                },
                ...opts,
            ];
        if (
            !created.value ||
            !opts ||
            opts != oldOpts ||
            _disabled != oldDisabled ||
            val != ov
        ) {
            if (dd) {
                //console.log("CREATE DD", {val});
                //console.log(opts)
                createCustomDropdown(dd);
            }
        }else if (val == ov){
           // console.log('SAME AS OLD VAL', opts == oldOpts)
        }
    },
    { immediate: true, deep: true }
);
watch(
    props,
    (v) => {
        //console.log({v})
        // console.log(_options.value[0])
       // console.log({v})
    },
    { deep: true, immediate: true }
);
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
    selectedItem.value = this;
    let value = (this as any).dataset.value;
    value = _options.value?.find((el) => el.value?.toString() == value)?.value;
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
    selectedItem.value?.classList.add("is-select");

    emit("update:model-value", value);
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
    const customOptions = menu.querySelectorAll(".tu-dropdown-menu-inner div");
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
                itemsArr.findIndex((el) => el.value?.toString() == option.value)
            ) && value?.length && ind != 0
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
</script>

<style>
.v-hidden {
    visibility: hidden !important;
}
</style>
