 const sleep = async (ms) => {
    await new Promise((res) => setTimeout(res, ms));
};
const ddNum = (e) => {
    e = `${e}`.trim();
    return e.length == 1 ? `0${e}` : e;
};
const toISOString = (date) => {
    let dateArr = date.split(",");
    let time = dateArr[1];
    time = time
        .split(":")
        .map((el) => ddNum(el))
        .join(":");
    dateArr = dateArr[0].split("/");
    date = `${dateArr[0]}-${ddNum(dateArr[1])}-${ddNum(dateArr[2])}`;
    return `${date} ${time}+02:00`;
}; const parseDate = (date) =>
    toISOString(
        new Date(date).toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
        })
    );
const timedLog = (...args)=>console.log(`[${parseDate(new Date())}]`, ...args)
module.exports = {sleep, timedLog, parseDate}